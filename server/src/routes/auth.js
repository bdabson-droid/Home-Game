const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const {
  hashPassword,
  verifyPassword,
  signToken,
  generateOtp,
  normalizePhone,
} = require('../utils/auth');

function createAuthRoutes(db) {
  const router = Router();

  router.post('/send-otp', (req, res) => {
    const phone = normalizePhone(req.body.phone || '');
    if (phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at`
    ).run(phone, code, expiresAt);

    // In production, send via Twilio/SMS. For demo, return code in dev mode.
    const response = { message: 'Verification code sent' };
    if (process.env.NODE_ENV !== 'production') {
      response.devCode = code;
    }
    res.json(response);
  });

  router.post('/register', (req, res) => {
    const phone = normalizePhone(req.body.phone || '');
    const { name, nickname, password, otp, isHost } = req.body;
    const publicName = (nickname || name || '').trim();

    if (!phone || !publicName || !password || !otp) {
      return res.status(400).json({ error: 'Phone, nickname, password, and OTP are required' });
    }

    if (publicName.length < 2 || publicName.length > 24) {
      return res.status(400).json({ error: 'Nickname must be 2–24 characters' });
    }

    const otpRow = db.prepare('SELECT * FROM otp_codes WHERE phone = ?').get(phone);
    if (!otpRow || otpRow.code !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    if (new Date(otpRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO users (id, phone, name, nickname, password_hash, is_host) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, phone, publicName, publicName, hashPassword(password), isHost ? 1 : 0);

    db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({
      token: signToken(user),
      user: formatUser(user),
    });
  });

  router.post('/login', (req, res) => {
    const phone = normalizePhone(req.body.phone || '');
    const { password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    res.json({
      token: signToken(user),
      user: formatUser(user),
    });
  });

  router.get('/me', require('../middleware/auth').requireAuth, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: formatUser(user) });
  });

  router.patch('/profile', require('../middleware/auth').requireAuth, (req, res) => {
    const nickname = String(req.body.nickname || '').trim();
    if (!nickname || nickname.length < 2 || nickname.length > 24) {
      return res.status(400).json({ error: 'Nickname must be 2–24 characters' });
    }

    db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(nickname, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: formatUser(user) });
  });

  return router;
}

function formatUser(user) {
  const nickname = user.nickname || user.name;
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    nickname,
    displayName: nickname,
    isHost: !!user.is_host,
    subscriptionStatus: user.subscription_status,
    subscriptionExpiresAt: user.subscription_expires_at,
  };
}

module.exports = { createAuthRoutes };
