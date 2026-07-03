import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simulate SMS sending (log to console in dev, real SMS service in prod)
function sendSMS(phone: string, message: string): void {
  console.log(`[SMS to ${phone}]: ${message}`);
}

// Normalize phone number
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone, name, email, password } = req.body;

    if (!phone || !name || !password) {
      res.status(400).json({ error: 'Phone, name, and password are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone.length < 10) {
      res.status(400).json({ error: 'Invalid phone number' });
      return;
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE phone = ?').get(normalizedPhone);
    if (existingUser) {
      res.status(409).json({ error: 'Phone number already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    const result = db.prepare(`
      INSERT INTO users (phone, name, email, password_hash, otp_code, otp_expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(normalizedPhone, name.trim(), email || null, passwordHash, otp, otpExpiresAt);

    sendSMS(normalizedPhone, `Your PokerNight verification code is: ${otp}. Valid for 10 minutes.`);

    res.status(201).json({
      message: 'Registration successful. Please verify your phone number.',
      userId: result.lastInsertRowid,
      // In development, return the OTP for testing
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/verify
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone and OTP are required' });
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.is_verified) {
      res.status(400).json({ error: 'Phone already verified' });
      return;
    }

    if (user.otp_code !== otp) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    if (new Date(user.otp_expires_at) < new Date()) {
      res.status(400).json({ error: 'Verification code expired' });
      return;
    }

    db.prepare('UPDATE users SET is_verified = 1, otp_code = NULL, otp_expires_at = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      message: 'Phone verified successfully',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, email: user.email, subscriptionStatus: user.subscription_status },
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.is_verified) {
      res.status(400).json({ error: 'Phone already verified' });
      return;
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?').run(otp, otpExpiresAt, user.id);

    sendSMS(normalizedPhone, `Your PokerNight verification code is: ${otp}. Valid for 10 minutes.`);

    res.json({
      message: 'OTP resent',
      ...(process.env.NODE_ENV !== 'production' && { devOtp: otp }),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: 'Phone and password are required' });
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(normalizedPhone) as any;

    if (!user) {
      res.status(401).json({ error: 'Invalid phone number or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid phone number or password' });
      return;
    }

    if (!user.is_verified) {
      res.status(403).json({ error: 'Please verify your phone number first', needsVerification: true });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        subscriptionStatus: user.subscription_status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT id, name, phone, email, subscription_status, created_at FROM users WHERE id = ?').get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      subscriptionStatus: user.subscription_status,
      createdAt: user.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    let passwordHash = user.password_hash;
    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password required to change password' });
        return;
      }
      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }
      passwordHash = await bcrypt.hash(newPassword, 12);
    }

    db.prepare('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?').run(
      name || user.name,
      email !== undefined ? email : user.email,
      passwordHash,
      req.userId
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
