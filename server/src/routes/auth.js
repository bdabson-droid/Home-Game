import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { config, isDev } from '../config.js';
import { newId, newOtp } from '../utils/ids.js';
import { normalizePhone } from '../utils/phone.js';
import { sendSms } from '../utils/sms.js';
import { signToken, authRequired } from '../utils/auth.js';
import { getSubscription, publicSubscription } from '../services/subscription.js';

const router = Router();

const OTP_TTL_MINUTES = 10;

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.display_name,
    createdAt: user.created_at,
  };
}

// Auto-accept any pending invitations that were addressed to this phone number.
function acceptInvitationsForPhone(user) {
  const invites = db
    .prepare(`SELECT * FROM invitations WHERE phone = ? AND status = 'pending'`)
    .all(user.phone);
  const insert = db.prepare(
    `INSERT OR IGNORE INTO memberships (id, home_game_id, user_id, role, status)
     VALUES (?, ?, ?, 'player', 'active')`,
  );
  const markAccepted = db.prepare(`UPDATE invitations SET status = 'accepted' WHERE id = ?`);
  const tx = db.transaction(() => {
    for (const inv of invites) {
      insert.run(newId(), inv.home_game_id, user.id);
      markAccepted.run(inv.id);
    }
  });
  tx();
}

router.post('/request-otp', async (req, res) => {
  const schema = z.object({ phone: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'phone is required' });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const code = newOtp();
  const expires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO otp_codes (id, phone, code, expires_at) VALUES (?, ?, ?, ?)',
  ).run(newId(), phone, code, expires);

  try {
    await sendSms(phone, `Your Poker Home Game verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`);
  } catch (err) {
    console.error('Failed to send OTP SMS:', err.message);
  }

  const response = { ok: true, phone };
  // In dev mode we return the code so the app can be tested without real SMS.
  if (isDev && !config.twilio.enabled) {
    response.devCode = code;
  }
  res.json(response);
});

router.post('/verify-otp', (req, res) => {
  const schema = z.object({
    phone: z.string(),
    code: z.string(),
    displayName: z.string().trim().min(1).max(60).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'phone and code are required' });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }

  const record = db
    .prepare(
      `SELECT * FROM otp_codes
       WHERE phone = ? AND code = ? AND consumed = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(phone, parsed.data.code);

  if (!record) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(record.id);

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  let isNew = false;
  if (!user) {
    isNew = true;
    const id = newId();
    db.prepare('INSERT INTO users (id, phone, display_name) VALUES (?, ?, ?)').run(
      id,
      phone,
      parsed.data.displayName || null,
    );
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  } else if (parsed.data.displayName && !user.display_name) {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(
      parsed.data.displayName,
      user.id,
    );
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  getSubscription(user.id);
  acceptInvitationsForPhone(user);

  const token = signToken(user);
  res.json({
    token,
    isNew,
    user: publicUser(user),
    subscription: publicSubscription(user.id),
  });
});

router.get('/me', authRequired, (req, res) => {
  res.json({
    user: publicUser(req.user),
    subscription: publicSubscription(req.user.id),
  });
});

router.patch('/me', authRequired, (req, res) => {
  const schema = z.object({ displayName: z.string().trim().min(1).max(60) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'displayName is required' });
  }
  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(
    parsed.data.displayName,
    req.user.id,
  );
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

export default router;
export { publicUser };
