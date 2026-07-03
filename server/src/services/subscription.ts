import { prisma } from '../db';

/** A subscription counts as usable for hosting when active (and not expired). */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < Date.now()) return false;
  return true;
}
