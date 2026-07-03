import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { authRequired } from '../utils/auth.js';
import { newId, newJoinCode } from '../utils/ids.js';
import { normalizePhone } from '../utils/phone.js';
import { sendSms } from '../utils/sms.js';
import { isActive } from '../services/subscription.js';

const router = Router();

function generateUniqueCode() {
  for (let i = 0; i < 20; i += 1) {
    const code = newJoinCode();
    const exists = db.prepare('SELECT 1 FROM home_games WHERE join_code = ?').get(code);
    if (!exists) return code;
  }
  throw new Error('Could not generate a unique join code');
}

function membershipFor(gameId, userId) {
  return db
    .prepare(
      `SELECT * FROM memberships WHERE home_game_id = ? AND user_id = ? AND status = 'active'`,
    )
    .get(gameId, userId);
}

function memberCount(gameId) {
  return db
    .prepare(`SELECT COUNT(*) AS c FROM memberships WHERE home_game_id = ? AND status = 'active'`)
    .get(gameId).c;
}

function serializeGame(game, viewerId) {
  const membership = membershipFor(game.id, viewerId);
  const isHost = game.host_user_id === viewerId;
  return {
    id: game.id,
    name: game.name,
    description: game.description,
    stakes: game.stakes,
    location: game.location,
    hostUserId: game.host_user_id,
    isHost,
    role: membership ? membership.role : isHost ? 'host' : null,
    memberCount: memberCount(game.id),
    createdAt: game.created_at,
    // Only the host sees the shareable numeric join code.
    joinCode: isHost ? game.join_code : undefined,
  };
}

// --- List games the current user belongs to ---
router.get('/', authRequired, (req, res) => {
  const games = db
    .prepare(
      `SELECT g.* FROM home_games g
       JOIN memberships m ON m.home_game_id = g.id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY g.created_at DESC`,
    )
    .all(req.user.id);
  res.json({ games: games.map((g) => serializeGame(g, req.user.id)) });
});

// --- Create a game (requires an active host subscription) ---
router.post('/', authRequired, (req, res) => {
  if (!isActive(req.user.id)) {
    return res.status(402).json({
      error: 'An active host subscription is required to create a home game.',
      code: 'subscription_required',
    });
  }

  const schema = z.object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional(),
    stakes: z.string().trim().max(80).optional(),
    location: z.string().trim().max(200).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'A game name is required' });
  }

  const id = newId();
  const code = generateUniqueCode();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO home_games (id, name, description, stakes, location, host_user_id, join_code)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      parsed.data.name,
      parsed.data.description || null,
      parsed.data.stakes || null,
      parsed.data.location || null,
      req.user.id,
      code,
    );
    db.prepare(
      `INSERT INTO memberships (id, home_game_id, user_id, role, status)
       VALUES (?, ?, ?, 'host', 'active')`,
    ).run(newId(), id, req.user.id);
  });
  tx();

  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(id);
  res.status(201).json({ game: serializeGame(game, req.user.id) });
});

// --- Game details ---
router.get('/:id', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (!membershipFor(game.id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this game' });
  }
  res.json({ game: serializeGame(game, req.user.id) });
});

// --- Update a game (host only) ---
router.patch('/:id', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can edit this game' });
  }
  const schema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    stakes: z.string().trim().max(80).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid game update' });
  const d = parsed.data;
  db.prepare(
    `UPDATE home_games
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           stakes = COALESCE(?, stakes),
           location = COALESCE(?, location)
     WHERE id = ?`,
  ).run(d.name ?? null, d.description ?? null, d.stakes ?? null, d.location ?? null, game.id);
  const updated = db.prepare('SELECT * FROM home_games WHERE id = ?').get(game.id);
  res.json({ game: serializeGame(updated, req.user.id) });
});

// --- Delete a game (host only) ---
router.delete('/:id', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can delete this game' });
  }
  db.prepare('DELETE FROM home_games WHERE id = ?').run(game.id);
  res.json({ ok: true });
});

// --- Regenerate the join code (host only) ---
router.post('/:id/regenerate-code', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can regenerate the code' });
  }
  const code = generateUniqueCode();
  db.prepare('UPDATE home_games SET join_code = ? WHERE id = ?').run(code, game.id);
  res.json({ joinCode: code });
});

// --- List members ---
router.get('/:id/members', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (!membershipFor(game.id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this game' });
  }
  const members = db
    .prepare(
      `SELECT m.role, m.created_at AS joined_at, u.id, u.display_name, u.phone
       FROM memberships m JOIN users u ON u.id = m.user_id
       WHERE m.home_game_id = ? AND m.status = 'active'
       ORDER BY (m.role = 'host') DESC, m.created_at ASC`,
    )
    .all(game.id);
  const isHost = game.host_user_id === req.user.id;
  res.json({
    members: members.map((m) => ({
      id: m.id,
      displayName: m.display_name,
      role: m.role,
      joinedAt: m.joined_at,
      // Only the host sees member phone numbers.
      phone: isHost ? m.phone : undefined,
    })),
  });
});

// --- Remove a member (host only) ---
router.delete('/:id/members/:userId', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can remove members' });
  }
  if (req.params.userId === game.host_user_id) {
    return res.status(400).json({ error: 'The host cannot be removed' });
  }
  db.prepare(
    `UPDATE memberships SET status = 'removed' WHERE home_game_id = ? AND user_id = ?`,
  ).run(game.id, req.params.userId);
  res.json({ ok: true });
});

// --- Invite a player by phone number (host only) ---
router.post('/:id/invitations', authRequired, async (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can invite players' });
  }
  const schema = z.object({ phone: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'phone is required' });
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) return res.status(400).json({ error: 'Invalid phone number' });

  // If the invitee already has an account, add them directly.
  const existingUser = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (existingUser) {
    if (membershipFor(game.id, existingUser.id)) {
      return res.status(409).json({ error: 'That person is already a member' });
    }
    db.prepare(
      `INSERT INTO memberships (id, home_game_id, user_id, role, status)
       VALUES (?, ?, ?, 'player', 'active')
       ON CONFLICT(home_game_id, user_id)
       DO UPDATE SET status = 'active'`,
    ).run(newId(), game.id, existingUser.id);
  }

  db.prepare(
    `INSERT INTO invitations (id, home_game_id, phone, invited_by_user_id, status)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(home_game_id, phone)
     DO UPDATE SET status = excluded.status, invited_by_user_id = excluded.invited_by_user_id`,
  ).run(
    newId(),
    game.id,
    phone,
    req.user.id,
    existingUser ? 'accepted' : 'pending',
  );

  const link = `${config.publicAppUrl}join?code=${game.join_code}`;
  try {
    await sendSms(
      phone,
      `You're invited to "${game.name}" poker home game! Join with code ${game.join_code} in the Poker Home Game app, or open ${link}`,
    );
  } catch (err) {
    console.error('Failed to send invite SMS:', err.message);
  }

  res.status(201).json({
    ok: true,
    invited: phone,
    autoAdded: Boolean(existingUser),
    joinCode: game.join_code,
  });
});

// --- List invitations for a game (host only) ---
router.get('/:id/invitations', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can view invitations' });
  }
  const invites = db
    .prepare('SELECT * FROM invitations WHERE home_game_id = ? ORDER BY created_at DESC')
    .all(game.id);
  res.json({
    invitations: invites.map((i) => ({
      id: i.id,
      phone: i.phone,
      status: i.status,
      createdAt: i.created_at,
    })),
  });
});

// --- Revoke an invitation (host only) ---
router.delete('/:id/invitations/:invId', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can revoke invitations' });
  }
  db.prepare(
    `UPDATE invitations SET status = 'revoked' WHERE id = ? AND home_game_id = ?`,
  ).run(req.params.invId, game.id);
  res.json({ ok: true });
});

// --- Sessions (game nights) ---
router.get('/:id/sessions', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (!membershipFor(game.id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this game' });
  }
  const sessions = db
    .prepare('SELECT * FROM sessions WHERE home_game_id = ? ORDER BY scheduled_at ASC')
    .all(game.id);
  res.json({
    sessions: sessions.map((s) => {
      const rsvps = db
        .prepare(
          `SELECT r.status, u.id, u.display_name FROM session_rsvps r
           JOIN users u ON u.id = r.user_id WHERE r.session_id = ?`,
        )
        .all(s.id);
      const mine = rsvps.find((r) => r.id === req.user.id);
      return {
        id: s.id,
        scheduledAt: s.scheduled_at,
        location: s.location,
        buyIn: s.buy_in,
        notes: s.notes,
        status: s.status,
        myRsvp: mine ? mine.status : null,
        going: rsvps.filter((r) => r.status === 'yes').length,
        rsvps: rsvps.map((r) => ({
          userId: r.id,
          displayName: r.display_name,
          status: r.status,
        })),
      };
    }),
  });
});

router.post('/:id/sessions', authRequired, (req, res) => {
  const game = db.prepare('SELECT * FROM home_games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the host can schedule game nights' });
  }
  const schema = z.object({
    scheduledAt: z.string().min(1),
    location: z.string().trim().max(200).optional(),
    buyIn: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'scheduledAt is required' });
  const id = newId();
  db.prepare(
    `INSERT INTO sessions (id, home_game_id, scheduled_at, location, buy_in, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    game.id,
    parsed.data.scheduledAt,
    parsed.data.location || null,
    parsed.data.buyIn || null,
    parsed.data.notes || null,
  );
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.status(201).json({ session });
});

export default router;
