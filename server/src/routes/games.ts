import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { ApiError, asyncHandler } from '../middleware/error';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { generateJoinCode } from '../utils/code';
import { isValidPhone, normalizePhone } from '../utils/phone';
import { sendSms } from '../services/sms';
import { hasActiveSubscription } from '../services/subscription';

export const gamesRouter = Router();

gamesRouter.use(requireAuth);

async function getMembershipOrThrow(gameId: string, userId: string) {
  const membership = await prisma.membership.findUnique({
    where: { gameId_userId: { gameId, userId } },
  });
  if (!membership) {
    throw new ApiError(403, 'You are not a member of this game', 'forbidden');
  }
  return membership;
}

async function requireHost(gameId: string, userId: string) {
  const membership = await getMembershipOrThrow(gameId, userId);
  if (membership.role !== 'host') {
    throw new ApiError(403, 'Only the host can perform this action', 'forbidden');
  }
  return membership;
}

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = generateJoinCode(6);
    const existing = await prisma.homeGame.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new ApiError(500, 'Could not allocate join code', 'internal');
}

// ---- Create a home game (host, requires active subscription) ----
const createGameSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  location: z.string().max(200).optional(),
  defaultBuyIn: z.number().int().min(0).max(1_000_000).optional(),
});

gamesRouter.post(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const active = await hasActiveSubscription(userId);
    if (!active) {
      throw new ApiError(402, 'An active host subscription is required to create a game', 'subscription_required');
    }
    const data = createGameSchema.parse(req.body);
    const joinCode = await uniqueJoinCode();

    const game = await prisma.homeGame.create({
      data: {
        name: data.name,
        description: data.description,
        location: data.location,
        defaultBuyIn: data.defaultBuyIn ?? 100,
        joinCode,
        hostId: userId,
        memberships: { create: { userId, role: 'host' } },
      },
    });
    res.status(201).json({ game });
  })
);

// ---- List games I belong to ----
gamesRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: {
        game: {
          include: {
            host: { select: { id: true, name: true, phone: true } },
            _count: { select: { memberships: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const games = await Promise.all(
      memberships.map(async (m) => {
        const nextSession = await prisma.gameSession.findFirst({
          where: { gameId: m.gameId, status: { in: ['scheduled', 'live'] } },
          orderBy: { scheduledAt: 'asc' },
        });
        return {
          id: m.game.id,
          name: m.game.name,
          description: m.game.description,
          location: m.game.location,
          role: m.role,
          memberCount: m.game._count.memberships,
          host: m.game.host,
          // Only surface the join code to the host.
          joinCode: m.role === 'host' ? m.game.joinCode : undefined,
          nextSession,
        };
      })
    );
    res.json({ games });
  })
);

// ---- Join a game by numeric code ----
const joinSchema = z.object({ code: z.string().min(4).max(10) });

gamesRouter.post(
  '/join',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const { code } = joinSchema.parse(req.body);
    const game = await prisma.homeGame.findUnique({ where: { joinCode: code.trim() } });
    if (!game) {
      throw new ApiError(404, 'No game found for that code', 'not_found');
    }
    const membership = await prisma.membership.upsert({
      where: { gameId_userId: { gameId: game.id, userId } },
      update: {},
      create: { gameId: game.id, userId, role: 'player' },
    });
    // Mark any pending invite for this user's phone as accepted.
    await prisma.invite.updateMany({
      where: { gameId: game.id, phone: req.userPhone, status: 'pending' },
      data: { status: 'accepted', acceptedAt: new Date() },
    });
    res.json({ game: { id: game.id, name: game.name }, role: membership.role });
  })
);

// ---- Game detail ----
gamesRouter.get(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const membership = await getMembershipOrThrow(req.params.id, userId);
    const game = await prisma.homeGame.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true, phone: true } },
        memberships: {
          include: { user: { select: { id: true, name: true, phone: true } } },
          orderBy: { createdAt: 'asc' },
        },
        invites: membership.role === 'host' ? { where: { status: 'pending' } } : false,
        sessions: { orderBy: { scheduledAt: 'desc' }, include: { seats: true } },
      },
    });
    if (!game) throw new ApiError(404, 'Game not found', 'not_found');

    res.json({
      game: {
        id: game.id,
        name: game.name,
        description: game.description,
        location: game.location,
        defaultBuyIn: game.defaultBuyIn,
        host: game.host,
        role: membership.role,
        joinCode: membership.role === 'host' ? game.joinCode : undefined,
        members: game.memberships.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          phone: membership.role === 'host' ? m.user.phone : undefined,
        })),
        pendingInvites:
          membership.role === 'host'
            ? game.invites.map((i) => ({ id: i.id, phone: i.phone, status: i.status }))
            : undefined,
        sessions: game.sessions,
      },
    });
  })
);

// ---- Update game (host) ----
const updateGameSchema = createGameSchema.partial();
gamesRouter.patch(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    const data = updateGameSchema.parse(req.body);
    const game = await prisma.homeGame.update({ where: { id: req.params.id }, data });
    res.json({ game });
  })
);

// ---- Invite by phone (host) ----
const inviteSchema = z.object({ phone: z.string().min(5) });
gamesRouter.post(
  '/:id/invites',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    const { phone: rawPhone } = inviteSchema.parse(req.body);
    if (!isValidPhone(rawPhone)) {
      throw new ApiError(400, 'Invalid phone number', 'invalid_phone');
    }
    const phone = normalizePhone(rawPhone);
    const game = await prisma.homeGame.findUnique({ where: { id: req.params.id } });
    if (!game) throw new ApiError(404, 'Game not found', 'not_found');

    // If the invitee already has an account, add them directly as a member.
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      await prisma.membership.upsert({
        where: { gameId_userId: { gameId: game.id, userId: existingUser.id } },
        update: {},
        create: { gameId: game.id, userId: existingUser.id, role: 'player' },
      });
    }

    const invite = await prisma.invite.upsert({
      where: { gameId_phone: { gameId: game.id, phone } },
      update: { status: existingUser ? 'accepted' : 'pending', invitedById: req.userId as string },
      create: {
        gameId: game.id,
        phone,
        invitedById: req.userId as string,
        status: existingUser ? 'accepted' : 'pending',
        acceptedAt: existingUser ? new Date() : null,
      },
    });

    await sendSms(
      phone,
      `You've been invited to the "${game.name}" poker home game. Download Home Game and join with code ${game.joinCode}.`
    );

    res.status(201).json({ invite: { id: invite.id, phone: invite.phone, status: invite.status } });
  })
);

// ---- Revoke invite (host) ----
gamesRouter.delete(
  '/:id/invites/:inviteId',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    await prisma.invite.update({
      where: { id: req.params.inviteId },
      data: { status: 'revoked' },
    });
    res.json({ ok: true });
  })
);

// ---- Remove a member (host) ----
gamesRouter.delete(
  '/:id/members/:userId',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    if (req.params.userId === req.userId) {
      throw new ApiError(400, 'The host cannot remove themselves', 'invalid');
    }
    await prisma.membership.deleteMany({
      where: { gameId: req.params.id, userId: req.params.userId, role: 'player' },
    });
    res.json({ ok: true });
  })
);

// ---- Leave a game (non-host) ----
gamesRouter.post(
  '/:id/leave',
  asyncHandler(async (req: AuthedRequest, res) => {
    const membership = await getMembershipOrThrow(req.params.id, req.userId as string);
    if (membership.role === 'host') {
      throw new ApiError(400, 'The host cannot leave their own game. Delete it instead.', 'invalid');
    }
    await prisma.membership.delete({ where: { id: membership.id } });
    res.json({ ok: true });
  })
);

// ---- Delete a game (host) ----
gamesRouter.delete(
  '/:id',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    await prisma.homeGame.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

// ===================== Sessions =====================

const createSessionSchema = z.object({
  scheduledAt: z.string().datetime(),
  location: z.string().max(200).optional(),
});

gamesRouter.post(
  '/:id/sessions',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    const data = createSessionSchema.parse(req.body);
    const session = await prisma.gameSession.create({
      data: {
        gameId: req.params.id,
        scheduledAt: new Date(data.scheduledAt),
        location: data.location,
      },
    });
    res.status(201).json({ session });
  })
);

const updateSessionSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  status: z.enum(['scheduled', 'live', 'completed', 'canceled']).optional(),
});

gamesRouter.patch(
  '/:id/sessions/:sessionId',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    const data = updateSessionSchema.parse(req.body);
    const session = await prisma.gameSession.update({
      where: { id: req.params.sessionId },
      data: {
        ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });
    res.json({ session });
  })
);

// ---- RSVP / take a seat (any member) ----
const rsvpSchema = z.object({
  rsvp: z.enum(['yes', 'no', 'maybe']).optional(),
  buyIn: z.number().int().min(0).optional(),
});

gamesRouter.post(
  '/:id/sessions/:sessionId/rsvp',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    await getMembershipOrThrow(req.params.id, userId);
    const data = rsvpSchema.parse(req.body);
    const seat = await prisma.sessionSeat.upsert({
      where: { sessionId_userId: { sessionId: req.params.sessionId, userId } },
      update: {
        ...(data.rsvp ? { rsvp: data.rsvp } : {}),
        ...(data.buyIn !== undefined ? { buyIn: data.buyIn } : {}),
      },
      create: {
        sessionId: req.params.sessionId,
        userId,
        rsvp: data.rsvp ?? 'yes',
        buyIn: data.buyIn ?? 0,
      },
    });
    res.json({ seat });
  })
);

// ---- Record results for a seat (host) ----
const resultSchema = z.object({
  userId: z.string(),
  buyIn: z.number().int().min(0).optional(),
  cashOut: z.number().int().min(0).optional(),
});

gamesRouter.post(
  '/:id/sessions/:sessionId/results',
  asyncHandler(async (req: AuthedRequest, res) => {
    await requireHost(req.params.id, req.userId as string);
    const data = resultSchema.parse(req.body);
    const seat = await prisma.sessionSeat.upsert({
      where: { sessionId_userId: { sessionId: req.params.sessionId, userId: data.userId } },
      update: {
        ...(data.buyIn !== undefined ? { buyIn: data.buyIn } : {}),
        ...(data.cashOut !== undefined ? { cashOut: data.cashOut } : {}),
      },
      create: {
        sessionId: req.params.sessionId,
        userId: data.userId,
        buyIn: data.buyIn ?? 0,
        cashOut: data.cashOut ?? null,
      },
    });
    res.json({ seat });
  })
);
