import { prisma } from '../db';

/**
 * When a user logs in / signs up, convert any pending phone invites for their
 * number into real memberships so they immediately see those home games.
 */
export async function acceptPendingInvitesForUser(userId: string, phone: string): Promise<number> {
  const invites = await prisma.invite.findMany({
    where: { phone, status: 'pending' },
  });

  let accepted = 0;
  for (const invite of invites) {
    await prisma.$transaction([
      prisma.membership.upsert({
        where: { gameId_userId: { gameId: invite.gameId, userId } },
        update: {},
        create: { gameId: invite.gameId, userId, role: 'player' },
      }),
      prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      }),
    ]);
    accepted += 1;
  }
  return accepted;
}
