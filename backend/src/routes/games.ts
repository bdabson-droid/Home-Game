import { Router, Response } from 'express';
import db from '../db/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Generate a unique 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function sendSMS(phone: string, message: string): void {
  console.log(`[SMS to ${phone}]: ${message}`);
}

// GET /api/games - list all games for authenticated user
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const games = db.prepare(`
      SELECT
        g.*,
        u.name as host_name,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id AND status != 'invited') as confirmed_players,
        (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as total_invited,
        gp.status as my_status,
        gp.buy_in_total as my_buy_in
      FROM games g
      JOIN users u ON g.host_id = u.id
      LEFT JOIN game_players gp ON gp.game_id = g.id AND gp.user_id = ?
      WHERE g.host_id = ? OR gp.user_id = ?
      ORDER BY g.created_at DESC
    `).all(req.userId, req.userId, req.userId) as any[];

    res.json(games.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      inviteCode: g.invite_code,
      status: g.status,
      maxPlayers: g.max_players,
      buyInAmount: g.buy_in_amount,
      currency: g.currency,
      location: g.location,
      scheduledAt: g.scheduled_at,
      startedAt: g.started_at,
      endedAt: g.ended_at,
      createdAt: g.created_at,
      hostId: g.host_id,
      hostName: g.host_name,
      confirmedPlayers: g.confirmed_players,
      totalInvited: g.total_invited,
      isHost: g.host_id === req.userId,
      myStatus: g.my_status || (g.host_id === req.userId ? 'host' : null),
      myBuyIn: g.my_buy_in,
    })));
  } catch (err) {
    console.error('Get games error:', err);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// POST /api/games - create a new game
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.subscription_status !== 'active') {
      res.status(403).json({
        error: 'Active subscription required to host games',
        needsSubscription: true,
      });
      return;
    }

    const { name, description, maxPlayers, buyInAmount, location, scheduledAt } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Game name is required' });
      return;
    }

    // Generate unique invite code
    let inviteCode = generateInviteCode();
    while (db.prepare('SELECT id FROM games WHERE invite_code = ?').get(inviteCode)) {
      inviteCode = generateInviteCode();
    }

    const result = db.prepare(`
      INSERT INTO games (host_id, name, description, invite_code, max_players, buy_in_amount, location, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      name.trim(),
      description || null,
      inviteCode,
      maxPlayers || 10,
      buyInAmount || 0,
      location || null,
      scheduledAt || null
    );

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(result.lastInsertRowid) as any;

    res.status(201).json({
      id: game.id,
      name: game.name,
      description: game.description,
      inviteCode: game.invite_code,
      status: game.status,
      maxPlayers: game.max_players,
      buyInAmount: game.buy_in_amount,
      location: game.location,
      scheduledAt: game.scheduled_at,
      createdAt: game.created_at,
    });
  } catch (err) {
    console.error('Create game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// GET /api/games/:id - get game details
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare(`
      SELECT g.*, u.name as host_name, u.phone as host_phone
      FROM games g
      JOIN users u ON g.host_id = u.id
      WHERE g.id = ?
    `).get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    // Check access: host or player
    const playerRecord = db.prepare('SELECT * FROM game_players WHERE game_id = ? AND user_id = ?').get(game.id, req.userId) as any;
    const isHost = game.host_id === req.userId;

    if (!isHost && !playerRecord) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const players = db.prepare(`
      SELECT gp.*, u.phone as user_phone
      FROM game_players gp
      LEFT JOIN users u ON gp.user_id = u.id
      WHERE gp.game_id = ?
      ORDER BY gp.invited_at ASC
    `).all(game.id) as any[];

    const transactions = db.prepare(`
      SELECT t.*, gp.name as player_name
      FROM transactions t
      JOIN game_players gp ON t.player_id = gp.id
      WHERE t.game_id = ?
      ORDER BY t.created_at DESC
    `).all(game.id) as any[];

    const totalPot = players.reduce((sum: number, p: any) => sum + (p.buy_in_total || 0), 0);
    const totalCashedOut = players
      .filter((p: any) => p.cash_out_amount !== null)
      .reduce((sum: number, p: any) => sum + (p.cash_out_amount || 0), 0);

    res.json({
      id: game.id,
      name: game.name,
      description: game.description,
      inviteCode: game.invite_code,
      status: game.status,
      maxPlayers: game.max_players,
      buyInAmount: game.buy_in_amount,
      currency: game.currency,
      location: game.location,
      scheduledAt: game.scheduled_at,
      startedAt: game.started_at,
      endedAt: game.ended_at,
      createdAt: game.created_at,
      hostId: game.host_id,
      hostName: game.host_name,
      isHost,
      totalPot,
      totalCashedOut,
      players: players.map(p => ({
        id: p.id,
        userId: p.user_id,
        phone: p.phone || p.user_phone,
        name: p.name,
        status: p.status,
        buyInTotal: p.buy_in_total,
        cashOutAmount: p.cash_out_amount,
        chipCount: p.chip_count,
        rebuyCount: p.rebuy_count,
        invitedAt: p.invited_at,
        joinedAt: p.joined_at,
        cashedOutAt: p.cashed_out_at,
        profit: p.cash_out_amount !== null ? p.cash_out_amount - p.buy_in_total : null,
      })),
      transactions: transactions.map(t => ({
        id: t.id,
        playerName: t.player_name,
        type: t.type,
        amount: t.amount,
        chips: t.chips,
        note: t.note,
        createdAt: t.created_at,
      })),
    });
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// PUT /api/games/:id - update game
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.host_id !== req.userId) {
      res.status(403).json({ error: 'Only the host can update the game' });
      return;
    }

    const { name, description, maxPlayers, buyInAmount, location, scheduledAt, status } = req.body;

    const validStatuses = ['upcoming', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    let startedAt = game.started_at;
    let endedAt = game.ended_at;
    if (status === 'active' && game.status !== 'active') {
      startedAt = new Date().toISOString();
    }
    if (status === 'completed' && game.status !== 'completed') {
      endedAt = new Date().toISOString();
    }

    db.prepare(`
      UPDATE games
      SET name = ?, description = ?, max_players = ?, buy_in_amount = ?,
          location = ?, scheduled_at = ?, status = ?, started_at = ?, ended_at = ?
      WHERE id = ?
    `).run(
      name || game.name,
      description !== undefined ? description : game.description,
      maxPlayers || game.max_players,
      buyInAmount !== undefined ? buyInAmount : game.buy_in_amount,
      location !== undefined ? location : game.location,
      scheduledAt !== undefined ? scheduledAt : game.scheduled_at,
      status || game.status,
      startedAt,
      endedAt,
      game.id
    );

    res.json({ message: 'Game updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// POST /api/games/:id/invite - invite players by phone
router.post('/:id/invite', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.host_id !== req.userId) {
      res.status(403).json({ error: 'Only the host can invite players' });
      return;
    }

    const { phones } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      res.status(400).json({ error: 'At least one phone number is required' });
      return;
    }

    const results: any[] = [];

    for (const rawPhone of phones) {
      const phone = normalizePhone(rawPhone);
      if (phone.length < 10) {
        results.push({ phone: rawPhone, status: 'invalid', error: 'Invalid phone number' });
        continue;
      }

      // Check if already invited
      const existingInvite = db.prepare(`
        SELECT gp.id FROM game_players gp
        LEFT JOIN users u ON gp.user_id = u.id
        WHERE gp.game_id = ? AND (gp.phone = ? OR u.phone = ?)
      `).get(game.id, phone, phone) as any;

      if (existingInvite) {
        results.push({ phone, status: 'already_invited' });
        continue;
      }

      // Find user by phone
      const invitedUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;

      // Add to game_players
      db.prepare(`
        INSERT INTO game_players (game_id, user_id, phone, name, status)
        VALUES (?, ?, ?, ?, 'invited')
      `).run(game.id, invitedUser?.id || null, phone, invitedUser?.name || phone);

      // Record invite
      db.prepare(`
        INSERT INTO invites (game_id, invited_phone, invited_by, message)
        VALUES (?, ?, ?, ?)
      `).run(game.id, phone, req.userId, `You've been invited to ${game.name}! Use code: ${game.invite_code}`);

      // Send SMS
      const smsMessage = invitedUser
        ? `Hey ${invitedUser.name}! You've been invited to poker game "${game.name}". Join with code: ${game.invite_code} on PokerNight app.`
        : `You've been invited to a poker game "${game.name}" on PokerNight! Download the app and use code: ${game.invite_code} to join.`;

      sendSMS(phone, smsMessage);

      results.push({ phone, status: 'invited', userId: invitedUser?.id || null });
    }

    res.json({ message: 'Invitations processed', results });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
});

// POST /api/games/join - join with invite code
router.post('/join', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const game = db.prepare('SELECT * FROM games WHERE invite_code = ?').get(inviteCode.toUpperCase()) as any;

    if (!game) {
      res.status(404).json({ error: 'Invalid invite code' });
      return;
    }

    if (game.status === 'completed' || game.status === 'cancelled') {
      res.status(400).json({ error: 'This game has already ended' });
      return;
    }

    if (game.host_id === req.userId) {
      res.status(400).json({ error: "You are the host of this game" });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

    // Check if already in game
    const existingPlayer = db.prepare(`
      SELECT gp.id FROM game_players gp
      WHERE gp.game_id = ? AND (gp.user_id = ? OR gp.phone = ?)
    `).get(game.id, req.userId, user.phone) as any;

    if (existingPlayer) {
      // Update existing player record with user_id
      db.prepare('UPDATE game_players SET user_id = ?, name = ?, status = ?, joined_at = ? WHERE id = ?').run(
        req.userId,
        user.name,
        'confirmed',
        new Date().toISOString(),
        existingPlayer.id
      );
      res.json({ message: 'Joined game successfully', gameId: game.id, alreadyInGame: true });
      return;
    }

    // Check max players
    const playerCount = (db.prepare('SELECT COUNT(*) as count FROM game_players WHERE game_id = ?').get(game.id) as any).count;
    if (playerCount >= game.max_players) {
      res.status(400).json({ error: 'Game is full' });
      return;
    }

    db.prepare(`
      INSERT INTO game_players (game_id, user_id, phone, name, status, joined_at)
      VALUES (?, ?, ?, ?, 'confirmed', datetime('now'))
    `).run(game.id, req.userId, user.phone, user.name);

    res.json({
      message: 'Joined game successfully',
      gameId: game.id,
      gameName: game.name,
    });
  } catch (err) {
    console.error('Join game error:', err);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// POST /api/games/:id/players/:playerId/buyin - record a buy-in
router.post('/:id/players/:playerId/buyin', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.host_id !== req.userId) {
      res.status(403).json({ error: 'Only the host can record buy-ins' });
      return;
    }

    const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(req.params.playerId, req.params.id) as any;

    if (!player) {
      res.status(404).json({ error: 'Player not found in this game' });
      return;
    }

    const { amount, chips, note } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid buy-in amount' });
      return;
    }

    const isRebuy = player.buy_in_total > 0;
    const transactionType = isRebuy ? 'rebuy' : 'buy_in';

    db.prepare(`
      INSERT INTO transactions (game_id, player_id, type, amount, chips, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(game.id, player.id, transactionType, amount, chips || 0, note || null);

    db.prepare(`
      UPDATE game_players
      SET buy_in_total = buy_in_total + ?,
          chip_count = chip_count + ?,
          rebuy_count = rebuy_count + ?,
          status = CASE WHEN status = 'invited' OR status = 'confirmed' THEN 'playing' ELSE status END
      WHERE id = ?
    `).run(amount, chips || 0, isRebuy ? 1 : 0, player.id);

    const updatedPlayer = db.prepare('SELECT * FROM game_players WHERE id = ?').get(player.id) as any;

    res.json({
      message: `${isRebuy ? 'Rebuy' : 'Buy-in'} recorded successfully`,
      player: {
        id: updatedPlayer.id,
        name: updatedPlayer.name,
        buyInTotal: updatedPlayer.buy_in_total,
        chipCount: updatedPlayer.chip_count,
        rebuyCount: updatedPlayer.rebuy_count,
        status: updatedPlayer.status,
      },
    });
  } catch (err) {
    console.error('Buy-in error:', err);
    res.status(500).json({ error: 'Failed to record buy-in' });
  }
});

// POST /api/games/:id/players/:playerId/cashout - record cash out
router.post('/:id/players/:playerId/cashout', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.host_id !== req.userId) {
      res.status(403).json({ error: 'Only the host can record cash outs' });
      return;
    }

    const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(req.params.playerId, req.params.id) as any;

    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }

    if (player.status === 'cashed_out') {
      res.status(400).json({ error: 'Player has already cashed out' });
      return;
    }

    const { amount, note } = req.body;

    if (amount === undefined || amount < 0) {
      res.status(400).json({ error: 'Invalid cash out amount' });
      return;
    }

    db.prepare(`
      INSERT INTO transactions (game_id, player_id, type, amount, note)
      VALUES (?, ?, 'cash_out', ?, ?)
    `).run(game.id, player.id, amount, note || null);

    db.prepare(`
      UPDATE game_players
      SET cash_out_amount = ?, status = 'cashed_out', cashed_out_at = datetime('now'), chip_count = 0
      WHERE id = ?
    `).run(amount, player.id);

    const profit = amount - player.buy_in_total;

    res.json({
      message: 'Cash out recorded',
      profit,
      cashOutAmount: amount,
      buyInTotal: player.buy_in_total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record cash out' });
  }
});

// DELETE /api/games/:id - delete/cancel a game
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id) as any;

    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }

    if (game.host_id !== req.userId) {
      res.status(403).json({ error: 'Only the host can delete the game' });
      return;
    }

    db.prepare("UPDATE games SET status = 'cancelled' WHERE id = ?").run(game.id);

    res.json({ message: 'Game cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel game' });
  }
});

export default router;
