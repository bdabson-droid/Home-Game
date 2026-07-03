import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { authRequired } from '../utils/auth.js';
import { newId } from '../utils/ids.js';

const router = Router();

// Join a game using its shared numeric code.
router.post('/join', authRequired, (req, res) => {
  const schema = z.object({ code: z.string().trim().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A join code is required' });

  const code = parsed.data.code.replace(/\D/g, '');
  const game = db.prepare('SELECT * FROM home_games WHERE join_code = ?').get(code);
  if (!game) return res.status(404).json({ error: 'No game found for that code' });

  const existing = db
    .prepare('SELECT * FROM memberships WHERE home_game_id = ? AND user_id = ?')
    .get(game.id, req.user.id);
  if (existing && existing.status === 'active') {
    return res.json({ ok: true, alreadyMember: true, gameId: game.id });
  }

  db.prepare(
    `INSERT INTO memberships (id, home_game_id, user_id, role, status)
     VALUES (?, ?, ?, 'player', 'active')
     ON CONFLICT(home_game_id, user_id) DO UPDATE SET status = 'active'`,
  ).run(newId(), game.id, req.user.id);

  // Mark any pending invitation for this phone as accepted.
  db.prepare(
    `UPDATE invitations SET status = 'accepted' WHERE home_game_id = ? AND phone = ?`,
  ).run(game.id, req.user.phone);

  res.status(201).json({ ok: true, gameId: game.id, gameName: game.name });
});

// Invitations addressed to the current user's phone number.
router.get('/invitations/mine', authRequired, (req, res) => {
  const invites = db
    .prepare(
      `SELECT i.id, i.status, i.created_at, g.id AS game_id, g.name AS game_name,
              g.stakes, g.location
       FROM invitations i JOIN home_games g ON g.id = i.home_game_id
       WHERE i.phone = ? AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
    )
    .all(req.user.phone);
  res.json({
    invitations: invites.map((i) => ({
      id: i.id,
      status: i.status,
      createdAt: i.created_at,
      game: { id: i.game_id, name: i.game_name, stakes: i.stakes, location: i.location },
    })),
  });
});

// Accept a specific invitation.
router.post('/invitations/:invId/accept', authRequired, (req, res) => {
  const inv = db.prepare('SELECT * FROM invitations WHERE id = ?').get(req.params.invId);
  if (!inv) return res.status(404).json({ error: 'Invitation not found' });
  if (inv.phone !== req.user.phone) {
    return res.status(403).json({ error: 'This invitation is for a different phone number' });
  }
  db.prepare(
    `INSERT INTO memberships (id, home_game_id, user_id, role, status)
     VALUES (?, ?, ?, 'player', 'active')
     ON CONFLICT(home_game_id, user_id) DO UPDATE SET status = 'active'`,
  ).run(newId(), inv.home_game_id, req.user.id);
  db.prepare(`UPDATE invitations SET status = 'accepted' WHERE id = ?`).run(inv.id);
  res.json({ ok: true, gameId: inv.home_game_id });
});

// RSVP to a scheduled game night.
router.post('/sessions/:id/rsvp', authRequired, (req, res) => {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const membership = db
    .prepare(
      `SELECT * FROM memberships WHERE home_game_id = ? AND user_id = ? AND status = 'active'`,
    )
    .get(session.home_game_id, req.user.id);
  if (!membership) return res.status(403).json({ error: 'You are not a member of this game' });

  const schema = z.object({ status: z.enum(['yes', 'no', 'maybe']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'status must be yes, no, or maybe' });

  db.prepare(
    `INSERT INTO session_rsvps (id, session_id, user_id, status)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id, user_id) DO UPDATE SET status = excluded.status`,
  ).run(newId(), session.id, req.user.id, parsed.data.status);

  res.json({ ok: true, status: parsed.data.status });
});

export default router;
