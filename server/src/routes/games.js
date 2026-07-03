const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireHost } = require('../middleware/auth');
const { generateJoinCode, normalizePhone } = require('../utils/auth');

function createGameRoutes(db) {
  const router = Router();

  router.use(requireAuth);

  router.get('/', (req, res) => {
    const games = db.prepare(`
      SELECT hg.*, u.name as host_name,
        (SELECT COUNT(*) FROM game_members gm WHERE gm.game_id = hg.id AND gm.status = 'active') as member_count
      FROM home_games hg
      JOIN users u ON u.id = hg.host_id
      WHERE hg.id IN (
        SELECT game_id FROM game_members WHERE user_id = ? AND status = 'active'
      ) OR hg.host_id = ?
      ORDER BY hg.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json({ games: games.map(formatGame) });
  });

  router.post('/', requireHost, (req, res) => {
    const { name, description, location, scheduledAt } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Game name is required' });
    }

    let joinCode;
    let attempts = 0;
    do {
      joinCode = generateJoinCode();
      attempts++;
    } while (db.prepare('SELECT id FROM home_games WHERE join_code = ?').get(joinCode) && attempts < 10);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO home_games (id, host_id, name, join_code, description, location, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name.trim(), joinCode, description || null, location || null, scheduledAt || null);

    db.prepare(`
      INSERT INTO game_members (id, game_id, user_id, role, status)
      VALUES (?, ?, ?, 'host', 'active')
    `).run(uuidv4(), id, req.user.id);

    const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(id);
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

    const existing = db.prepare(
      `SELECT * FROM game_members WHERE game_id = ? AND user_id = ?`
    ).get(game.id, req.user.id);

    if (existing?.status === 'active') {
      return res.json({ game: formatGame(game), message: 'Already a member' });
    }

    if (existing) {
      db.prepare(`UPDATE game_members SET status = 'active' WHERE id = ?`).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO game_members (id, game_id, user_id, role, status)
        VALUES (?, ?, ?, 'player', 'active')
      `).run(uuidv4(), game.id, req.user.id);
    }

    db.prepare(
      `UPDATE game_invites SET status = 'accepted' WHERE game_id = ? AND phone = ?`
    ).run(game.id, req.user.phone);

    res.json({ game: formatGame(game), message: 'Joined successfully' });
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

    const existing = db.prepare(
      `SELECT * FROM game_members WHERE game_id = ? AND user_id = ?`
    ).get(invite.game_id, req.user.id);

    if (existing?.status === 'active') {
      db.prepare(`UPDATE game_invites SET status = 'accepted' WHERE id = ?`).run(invite.id);
      return res.json({ game: formatGame(invite), message: 'Already a member' });
    }

    if (existing) {
      db.prepare(`UPDATE game_members SET status = 'active' WHERE id = ?`).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO game_members (id, game_id, user_id, role, status)
        VALUES (?, ?, ?, 'player', 'active')
      `).run(uuidv4(), invite.game_id, req.user.id);
    }

    db.prepare(`UPDATE game_invites SET status = 'accepted' WHERE id = ?`).run(invite.id);
    res.json({ game: formatGame(invite), message: 'Invite accepted' });
  });

  router.get('/:id', (req, res) => {
    const game = getGameWithAccess(db, req.params.id, req.user.id);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const members = db.prepare(`
      SELECT gm.*, u.name, u.phone
      FROM game_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.game_id = ? AND gm.status = 'active'
      ORDER BY gm.joined_at
    `).all(req.params.id);

    const invites = db.prepare(`
      SELECT gi.*, u.name as invited_by_name
      FROM game_invites gi
      JOIN users u ON u.id = gi.invited_by
      WHERE gi.game_id = ? AND gi.status = 'pending'
    `).all(req.params.id);

    res.json({
      game: formatGame(game),
      members: members.map((m) => ({
        id: m.user_id,
        name: m.name,
        phone: m.phone,
        role: m.role,
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
        `SELECT * FROM game_members WHERE game_id = ? AND user_id = ? AND status = 'active'`
      ).get(req.params.id, existingUser.id);
      if (member) {
        return res.status(409).json({ error: 'User is already in this game' });
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

    // In production, send SMS invite with join code
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

    db.prepare(`
      UPDATE game_members SET status = 'removed'
      WHERE game_id = ? AND user_id = ?
    `).run(req.params.id, req.params.userId);

    res.json({ message: 'Member removed' });
  });

  return router;
}

function getGameWithAccess(db, gameId, userId, hostOnly = false) {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(gameId);
  if (!game) return null;

  if (hostOnly && game.host_id !== userId) return null;

  const member = db.prepare(
    `SELECT * FROM game_members WHERE game_id = ? AND user_id = ? AND status = 'active'`
  ).get(gameId, userId);

  if (!member && game.host_id !== userId) return null;
  return game;
}

function formatGame(game) {
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
    memberCount: game.member_count,
  };
}

module.exports = { createGameRoutes };
