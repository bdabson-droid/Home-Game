const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireHost } = require('../middleware/auth');
const { generateJoinCode, normalizePhone } = require('../utils/auth');
const {
  joinOrWaitlist,
  promoteFromWaitlist,
} = require('../utils/seats');

function createGameRoutes(db) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    const games = db.prepare(`
      SELECT hg.*, u.name as host_name,
        (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'active') as member_count,
        (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'waiting') as waiting_count,
        (SELECT gm.status FROM game_members gm WHERE gm.game_id = hg.id AND gm.user_id = ? LIMIT 1) as user_status,
        (SELECT COUNT(*) + 1 FROM game_members gm2
          WHERE gm2.game_id = hg.id AND gm2.status = 'waiting'
          AND gm2.joined_at < (SELECT joined_at FROM game_members WHERE game_id = hg.id AND user_id = ? AND status = 'waiting')
        ) as waiting_position
      FROM home_games hg
      JOIN users u ON u.id = hg.host_id
      WHERE hg.id IN (
        SELECT game_id FROM game_members WHERE user_id = ? AND status IN ('active', 'waiting')
      ) OR hg.host_id = ?
      ORDER BY hg.created_at DESC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id);

    res.json({ games: games.map(formatGame) });
  });

  router.post('/', requireHost, (req, res) => {
    const { name, description, location, scheduledAt, maxSeats } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    const seats = parseInt(maxSeats, 10);
    if (!seats || seats < 2 || seats > 20) {
      return res.status(400).json({ error: 'Seats must be between 2 and 20' });
    }

    let joinCode;
    let attempts = 0;
    do {
      joinCode = generateJoinCode();
      attempts++;
    } while (db.prepare('SELECT id FROM home_games WHERE join_code = ?').get(joinCode) && attempts < 10);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO home_games (id, host_id, name, join_code, description, location, scheduled_at, max_seats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.user.id,
      name.trim(),
      joinCode,
      description || null,
      location || null,
      scheduledAt || null,
      seats
    );

    db.prepare(`
      INSERT INTO game_members (id, game_id, user_id, role, status)
      VALUES (?, ?, ?, 'host', 'active')
    `).run(uuidv4(), id, req.user.id);

    const game = db.prepare(`
      SELECT hg.*,
        (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'active') as member_count,
        (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'waiting') as waiting_count
      FROM home_games hg WHERE hg.id = ?
    `).get(id);
    res.status(201).json({ game: formatGame(game) });
  });

  router.post('/join', (req, res) => {
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter a valid 6-digit join code' });
    }

    const game = db.prepare(`SELECT * FROM home_games WHERE join_code = ? AND status = 'active'`).get(code);
    if (!game) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    const result = joinOrWaitlist(db, game, req.user.id);

    db.prepare(
      `UPDATE game_invites SET status = 'accepted' WHERE game_id = ? AND phone = ?`
    ).run(game.id, req.user.phone);

    const enriched = enrichGame(db, game.id);
    res.json({
      game: formatGame(enriched),
      status: result.status,
      waitingPosition: result.waitingPosition,
      message: result.message,
    });
  });

  router.get('/invites/pending', (req, res) => {
    const invites = db.prepare(`
      SELECT gi.*, hg.name as game_name, hg.join_code, u.name as host_name
      FROM game_invites gi
      JOIN home_games hg ON hg.id = gi.game_id
      JOIN users u ON u.id = gi.invited_by
      WHERE gi.phone = ? AND gi.status = 'pending' AND hg.status = 'active'
    `).all(req.user.phone);

    res.json({
      invites: invites.map((i) => ({
        id: i.id,
        gameId: i.game_id,
        gameName: i.game_name,
        joinCode: i.join_code,
        hostName: i.host_name,
        createdAt: i.created_at,
      })),
    });
  });

  router.post('/invites/:inviteId/accept', (req, res) => {
    const invite = db.prepare(`
      SELECT gi.*, hg.* FROM game_invites gi
      JOIN home_games hg ON hg.id = gi.game_id
      WHERE gi.id = ? AND gi.phone = ? AND gi.status = 'pending'
    `).get(req.params.inviteId, req.user.phone);

    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    const result = joinOrWaitlist(db, invite, req.user.id);
    db.prepare(`UPDATE game_invites SET status = 'accepted' WHERE id = ?`).run(invite.id);

    const enriched = enrichGame(db, invite.game_id);
    res.json({
      game: formatGame(enriched),
      status: result.status,
      waitingPosition: result.waitingPosition,
      message: result.message,
    });
  });

  router.get('/:id', (req, res) => {
    const game = getGameWithAccess(db, req.params.id, req.user.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const enriched = enrichGame(db, req.params.id);

    const members = db.prepare(`
      SELECT gm.*, u.name, u.phone
      FROM game_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.game_id = ? AND gm.status = 'active'
      ORDER BY gm.joined_at
    `).all(req.params.id);

    const waitingList = db.prepare(`
      SELECT gm.*, u.name, u.phone,
        (SELECT COUNT(*) + 1 FROM game_members gm2
          WHERE gm2.game_id = gm.game_id AND gm2.status = 'waiting' AND gm2.joined_at < gm.joined_at
        ) as position
      FROM game_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.game_id = ? AND gm.status = 'waiting'
      ORDER BY gm.joined_at ASC
    `).all(req.params.id);

    const invites = db.prepare(`
      SELECT gi.*, u.name as invited_by_name
      FROM game_invites gi
      JOIN users u ON u.id = gi.invited_by
      WHERE gi.game_id = ? AND gi.status = 'pending'
    `).all(req.params.id);

    res.json({
      game: formatGame(enriched),
      members: members.map((m) => ({
        id: m.user_id,
        name: m.name,
        phone: m.phone,
        role: m.role,
        joinedAt: m.joined_at,
      })),
      waitingList: waitingList.map((m) => ({
        id: m.user_id,
        name: m.name,
        phone: m.phone,
        position: m.position,
        joinedAt: m.joined_at,
      })),
      pendingInvites: invites.map((i) => ({
        id: i.id,
        phone: i.phone,
        invitedBy: i.invited_by_name,
        createdAt: i.created_at,
      })),
    });
  });

  router.post('/:id/invite', (req, res) => {
    const game = getGameWithAccess(db, req.params.id, req.user.id, true);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const phone = normalizePhone(req.body.phone || '');
    if (phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingUser) {
      const member = db.prepare(
        `SELECT * FROM game_members WHERE game_id = ? AND user_id = ? AND status IN ('active', 'waiting')`
      ).get(req.params.id, existingUser.id);
      if (member) {
        const msg = member.status === 'waiting'
          ? 'User is already on the waiting list'
          : 'User is already in this game';
        return res.status(409).json({ error: msg });
      }
    }

    const inviteId = uuidv4();
    try {
      db.prepare(`
        INSERT INTO game_invites (id, game_id, phone, invited_by, status)
        VALUES (?, ?, ?, ?, 'pending')
      `).run(inviteId, req.params.id, phone, req.user.id);
    } catch {
      return res.status(409).json({ error: 'Invite already sent to this number' });
    }

    res.status(201).json({
      invite: { id: inviteId, phone, gameId: req.params.id },
      joinCode: game.join_code,
      message: `Invite sent to ${phone}. Share join code ${game.join_code} if they already have the app.`,
    });
  });

  router.delete('/:id/members/:userId', (req, res) => {
    const game = getGameWithAccess(db, req.params.id, req.user.id, true);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'Host cannot remove themselves' });
    }

    const member = db.prepare(
      `SELECT * FROM game_members WHERE game_id = ? AND user_id = ? AND status = 'active'`
    ).get(req.params.id, req.params.userId);

    if (!member) {
      return res.status(404).json({ error: 'Active member not found' });
    }

    db.prepare(`
      UPDATE game_members SET status = 'removed'
      WHERE game_id = ? AND user_id = ?
    `).run(req.params.id, req.params.userId);

    const promoted = promoteFromWaitlist(db, req.params.id);
    let message = 'Member removed';
    if (promoted) {
      const user = db.prepare('SELECT name FROM users WHERE id = ?').get(promoted.user_id);
      message = `Member removed. ${user.name} promoted from the waiting list.`;
    }

    res.json({ message, promotedUserId: promoted?.user_id || null });
  });

  router.delete('/:id/waiting/:userId', (req, res) => {
    const game = getGameWithAccess(db, req.params.id, req.user.id, true);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const result = db.prepare(`
      UPDATE game_members SET status = 'removed'
      WHERE game_id = ? AND user_id = ? AND status = 'waiting'
    `).run(req.params.id, req.params.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Waiting list entry not found' });
    }

    res.json({ message: 'Removed from waiting list' });
  });

  return router;
}

function enrichGame(db, gameId) {
  return db.prepare(`
    SELECT hg.*,
      (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'active') as member_count,
      (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'waiting') as waiting_count
    FROM home_games hg WHERE hg.id = ?
  `).get(gameId);
}

function getGameWithAccess(db, gameId, userId, hostOnly = false) {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(gameId);
  if (!game) return null;

  if (hostOnly && game.host_id !== userId) return null;

  const member = db.prepare(
    `SELECT * FROM game_members WHERE game_id = ? AND user_id = ? AND status IN ('active', 'waiting')`
  ).get(gameId, userId);

  if (!member && game.host_id !== userId) return null;
  return game;
}

function formatGame(game) {
  const maxSeats = game.max_seats ?? 9;
  const activeCount = game.member_count ?? 0;
  const waitingCount = game.waiting_count ?? 0;

  return {
    id: game.id,
    hostId: game.host_id,
    name: game.name,
    joinCode: game.join_code,
    description: game.description,
    location: game.location,
    scheduledAt: game.scheduled_at,
    status: game.status,
    createdAt: game.created_at,
    hostName: game.host_name,
    maxSeats,
    memberCount: activeCount,
    waitingCount,
    seatsAvailable: Math.max(0, maxSeats - activeCount),
    isFull: activeCount >= maxSeats,
    userStatus: game.user_status || null,
    waitingPosition: game.user_status === 'waiting' ? game.waiting_position : null,
  };
}

module.exports = { createGameRoutes };
