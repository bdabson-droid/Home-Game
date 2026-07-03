import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db';
import { config } from '../config';
import { ApiError, asyncHandler } from '../middleware/error';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { generateOtp } from '../utils/code';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { sendSms } from '../services/sms';
import { signAuthToken } from '../utils/jwt';
import { acceptPendingInvitesForUser } from '../services/memberships';

export const authRouter = Router();

const requestOtpSchema = z.object({ phone: z.string().min(5) });

authRouter.post(
  '/request-otp',
  asyncHandler(async (req, res) => {
    const { phone: rawPhone } = requestOtpSchema.parse(req.body);
    if (!isValidPhone(rawPhone)) {
      throw new ApiError(400, 'Invalid phone number', 'invalid_phone');
    }
    const phone = normalizePhone(rawPhone);

    const code = generateOtp(6);
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + config.otpTtlMinutes * 60 * 1000);

    // Invalidate previous unconsumed codes for this phone.
    await prisma.otpCode.updateMany({
      where: { phone, consumed: false },
      data: { consumed: true },
    });
    await prisma.otpCode.create({ data: { phone, codeHash, expiresAt } });

    await sendSms(phone, `Your Home Game verification code is ${code}. It expires in ${config.otpTtlMinutes} minutes.`);

    const body: Record<string, unknown> = { ok: true, phone };
    // Convenience for local/dev + tests only.
    if (config.env !== 'production') {
      body.devCode = code;
    }
    res.json(body);
  })
);

const verifyOtpSchema = z.object({
  phone: z.string().min(5),
  code: z.string().min(4).max(8),
  name: z.string().min(1).max(80).optional(),
});

authRouter.post(
  '/verify-otp',
  asyncHandler(async (req, res) => {
    const { phone: rawPhone, code, name } = verifyOtpSchema.parse(req.body);
    const phone = normalizePhone(rawPhone);

    const otp = await prisma.otpCode.findFirst({
      where: { phone, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new ApiError(400, 'No active verification code. Request a new one.', 'otp_missing');
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new ApiError(400, 'Verification code expired. Request a new one.', 'otp_expired');
    }
    if (otp.attempts >= config.otpMaxAttempts) {
      throw new ApiError(429, 'Too many attempts. Request a new code.', 'otp_locked');
    }

    const matches = await bcrypt.compare(code, otp.codeHash);
    if (!matches) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new ApiError(400, 'Incorrect verification code.', 'otp_invalid');
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNew = !user;
    if (!user) {
      user = await prisma.user.create({ data: { phone, name: name ?? null } });
    } else if (name && !user.name) {
      user = await prisma.user.update({ where: { id: user.id }, data: { name } });
    }

    const acceptedInvites = await acceptPendingInvitesForUser(user.id, phone);

    const token = signAuthToken({ userId: user.id, phone: user.phone });
    res.json({
      token,
      isNewUser: isNew,
      acceptedInvites,
      user: { id: user.id, phone: user.phone, name: user.name },
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { subscription: true },
    });
    if (!user) {
      throw new ApiError(404, 'User not found', 'not_found');
    }
    const membershipCount = await prisma.membership.count({ where: { userId: user.id } });
    res.json({
      user: { id: user.id, phone: user.phone, name: user.name },
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            plan: user.subscription.plan,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          }
        : { status: 'none' },
      membershipCount,
    });
  })
);

const updateProfileSchema = z.object({ name: z.string().min(1).max(80) });

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const { name } = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.userId }, data: { name } });
    res.json({ user: { id: user.id, phone: user.phone, name: user.name } });
  })
);
