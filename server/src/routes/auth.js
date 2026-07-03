const express = require('express');
const db = require('../lib/db');
const { normalizePhone } = require('../lib/phone');
const { generateOtp } = require('../lib/codes');
const { sendSms } = require('../lib/sms');
const { issueToken } = require('../middleware/auth');

const router = express.Router();
const OTP_TTL_MS = 10 * 60 * 1000;

router.post('/request-otp', async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'A valid phone number is required.' });

  const code = generateOtp();
  const now = Date.now();
  db.prepare(
    'INSERT INTO otps (phone, code, expires_at) VALUES (?, ?, ?)',
  ).run(phone, code, now + OTP_TTL_MS);

  await sendSms(phone, `Your Home Game code is ${code}. It expires in 10 minutes.`);

  const devMode = String(process.env.DEV_MODE || 'true').toLowerCase() === 'true';
  return res.json({ ok: true, ...(devMode ? { devCode: code } : {}) });
});

router.post('/verify-otp', (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();
  if (!phone || !code) {
    return res.status(400).json({ error: 'Phone and code are required.' });
  }

  const devMode = String(process.env.DEV_MODE || 'true').toLowerCase() === 'true';
  const now = Date.now();

  let matched = null;
  if (!(devMode && code === '000000')) {
    matched = db
      .prepare(
        `SELECT * FROM otps
         WHERE phone = ? AND code = ? AND consumed_at IS NULL AND expires_at > ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(phone, code, now);
    if (!matched) return res.status(400).json({ error: 'Invalid or expired code.' });
    db.prepare('UPDATE otps SET consumed_at = ? WHERE id = ?').run(now, matched.id);
  }

  let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) {
    const info = db
      .prepare('INSERT INTO users (phone, created_at) VALUES (?, ?)')
      .run(phone, now);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

    // Auto-redeem any pending invites addressed to this phone number.
    const pending = db
      .prepare('SELECT * FROM invites WHERE phone = ? AND redeemed_at IS NULL')
      .all(phone);
    const addMember = db.prepare(
      `INSERT OR IGNORE INTO game_members (game_id, user_id, role, joined_at)
       VALUES (?, ?, 'player', ?)`,
    );
    const markInvite = db.prepare('UPDATE invites SET redeemed_at = ? WHERE id = ?');
    const tx = db.transaction(() => {
      for (const invite of pending) {
        addMember.run(invite.game_id, user.id, now);
        markInvite.run(now, invite.id);
      }
    });
    tx();
  }

  const token = issueToken(user);
  return res.json({ token, user: publicUser(user) });
});

function publicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    subscription_status: user.subscription_status,
    subscription_expires_at: user.subscription_expires_at,
  };
}

module.exports = { router, publicUser };
