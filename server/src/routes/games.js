const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { normalizePhone } = require('../lib/phone');
const { generateJoinCode } = require('../lib/codes');
const { isHostSubscribed } = require('../lib/subscription');
const { sendSms } = require('../lib/sms');

const router = express.Router();

function serializeGame(game, viewer) {
  return {
    id: game.id,
    name: game.name,
    description: game.description,
    stakes: game.stakes,
    location: game.location,
    next_session_at: game.next_session_at,
    created_at: game.created_at,
    host_id: game.host_id,
    is_host: viewer ? viewer.id === game.host_id : false,
    // Join code is only surfaced to the host or existing members.
    join_code: game.join_code,
  };
}

router.get('/', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT g.*
       FROM games g
       LEFT JOIN game_members m ON m.game_id = g.id AND m.user_id = ?
       WHERE g.host_id = ? OR m.user_id = ?
       GROUP BY g.id
       ORDER BY COALESCE(g.next_session_at, g.created_at) DESC`,
    )
    .all(req.user.id, req.user.id, req.user.id);
  res.json({ games: rows.map((g) => serializeGame(g, req.user)) });
});

router.post('/', requireAuth, (req, res) => {
  if (!isHostSubscribed(req.user)) {
    return res.status(402).json({
      error: 'Subscription required to host games.',
      code: 'subscription_required',
    });
  }
  const name = String(req.body?.name || '').trim().slice(0, 80);
  if (!name) return res.status(400).json({ error: 'Game name is required.' });

  const description = String(req.body?.description || '').trim().slice(0, 500) || null;
  const stakes = String(req.body?.stakes || '').trim().slice(0, 60) || null;
  const location = String(req.body?.location || '').trim().slice(0, 200) || null;
  const nextSessionAt = Number(req.body?.next_session_at) || null;

  const joinCode = generateJoinCode();
  const now = Date.now();

  const info = db
    .prepare(
      `INSERT INTO games
         (host_id, name, description, stakes, location, next_session_at, join_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(req.user.id, name, description, stakes, location, nextSessionAt, joinCode, now);

  db.prepare(
    `INSERT INTO game_members (game_id, user_id, role, joined_at) VALUES (?, ?, 'host', ?)`,
  ).run(info.lastInsertRowid, req.user.id, now);

  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ game: serializeGame(game, req.user) });
});

function loadGameForViewer(gameId, viewer) {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return { error: { status: 404, message: 'Game not found.' } };
  const membership = db
    .prepare('SELECT * FROM game_members WHERE game_id = ? AND user_id = ?')
    .get(gameId, viewer.id);
  if (game.host_id !== viewer.id && !membership) {
    return { error: { status: 403, message: 'You are not a member of this game.' } };
  }
  return { game, membership, isHost: game.host_id === viewer.id };
}

router.get('/:id', requireAuth, (req, res) => {
  const { game, error, isHost } = loadGameForViewer(Number(req.params.id), req.user);
  if (error) return res.status(error.status).json({ error: error.message });

  const players = db
    .prepare(
      `SELECT u.id, u.name, u.phone, m.role, m.joined_at
       FROM game_members m JOIN users u ON u.id = m.user_id
       WHERE m.game_id = ?
       ORDER BY m.role = 'host' DESC, m.joined_at ASC`,
    )
    .all(game.id);

  const pendingInvites = isHost
    ? db
        .prepare(
          `SELECT id, phone, created_at
           FROM invites
           WHERE game_id = ? AND redeemed_at IS NULL
           ORDER BY created_at DESC`,
        )
        .all(game.id)
    : [];

  res.json({
    game: serializeGame(game, req.user),
    players,
    pending_invites: pendingInvites,
  });
});

router.delete('/:id', requireAuth, (req, res) => {
  const { game, error, isHost } = loadGameForViewer(Number(req.params.id), req.user);
  if (error) return res.status(error.status).json({ error: error.message });
  if (!isHost) return res.status(403).json({ error: 'Only the host can delete this game.' });
  db.prepare('DELETE FROM games WHERE id = ?').run(game.id);
  res.json({ ok: true });
});

router.post('/:id/invite', requireAuth, async (req, res) => {
  const { game, error, isHost } = loadGameForViewer(Number(req.params.id), req.user);
  if (error) return res.status(error.status).json({ error: error.message });
  if (!isHost) return res.status(403).json({ error: 'Only the host can invite players.' });

  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'A valid phone number is required.' });

  const now = Date.now();
  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);

  if (existingUser) {
    // Already a user: add straight to the roster.
    db.prepare(
      `INSERT OR IGNORE INTO game_members (game_id, user_id, role, joined_at)
       VALUES (?, ?, 'player', ?)`,
    ).run(game.id, existingUser.id, now);
    await sendSms(
      phone,
      `You've been added to the poker game "${game.name}". Open Home Game to see the details.`,
    );
    return res.json({ ok: true, status: 'added', user_id: existingUser.id });
  }

  db.prepare(
    `INSERT OR IGNORE INTO invites (game_id, phone, invited_by, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(game.id, phone, req.user.id, now);
  await sendSms(
    phone,
    `You're invited to the poker game "${game.name}". Download Home Game and sign up with this number — or use join code ${game.join_code}.`,
  );
  res.json({ ok: true, status: 'invited', join_code: game.join_code });
});

router.delete('/:id/invite/:inviteId', requireAuth, (req, res) => {
  const { error, isHost, game } = loadGameForViewer(Number(req.params.id), req.user);
  if (error) return res.status(error.status).json({ error: error.message });
  if (!isHost) return res.status(403).json({ error: 'Only the host can manage invites.' });
  db.prepare('DELETE FROM invites WHERE id = ? AND game_id = ?').run(
    Number(req.params.inviteId),
    game.id,
  );
  res.json({ ok: true });
});

router.delete('/:id/members/:userId', requireAuth, (req, res) => {
  const { error, isHost, game } = loadGameForViewer(Number(req.params.id), req.user);
  if (error) return res.status(error.status).json({ error: error.message });
  if (!isHost) return res.status(403).json({ error: 'Only the host can remove players.' });
  const targetId = Number(req.params.userId);
  if (targetId === game.host_id) {
    return res.status(400).json({ error: 'The host cannot be removed.' });
  }
  db.prepare('DELETE FROM game_members WHERE game_id = ? AND user_id = ?').run(game.id, targetId);
  res.json({ ok: true });
});

router.post('/join', requireAuth, (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!/^\d{4,10}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the numeric join code.' });
  }
  const game = db.prepare('SELECT * FROM games WHERE join_code = ?').get(code);
  if (!game) return res.status(404).json({ error: 'No game found for that code.' });

  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO game_members (game_id, user_id, role, joined_at)
     VALUES (?, ?, 'player', ?)`,
  ).run(game.id, req.user.id, now);

  db.prepare(
    'UPDATE invites SET redeemed_at = ? WHERE game_id = ? AND phone = ? AND redeemed_at IS NULL',
  ).run(now, game.id, req.user.phone);

  res.json({ game: serializeGame(game, req.user) });
});

router.post('/:id/leave', requireAuth, (req, res) => {
  const gameId = Number(req.params.id);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  if (game.host_id === req.user.id) {
    return res.status(400).json({ error: 'The host cannot leave. Delete the game instead.' });
  }
  db.prepare('DELETE FROM game_members WHERE game_id = ? AND user_id = ?').run(gameId, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
