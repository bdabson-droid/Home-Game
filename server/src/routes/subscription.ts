import { Router } from 'express';
import { prisma } from '../db';
import { config, stripeEnabled } from '../config';
import { ApiError, asyncHandler } from '../middleware/error';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { getStripe } from '../services/stripe';

export const subscriptionRouter = Router();

subscriptionRouter.use(requireAuth);

subscriptionRouter.get(
  '/',
  asyncHandler(async (req: AuthedRequest, res) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.userId } });
    res.json({
      subscription: sub
        ? {
            status: sub.status,
            plan: sub.plan,
            currentPeriodEnd: sub.currentPeriodEnd,
          }
        : { status: 'none' },
      billingMode: stripeEnabled ? 'stripe' : 'mock',
    });
  })
);

/**
 * Start a host subscription.
 * - With Stripe configured: returns a Checkout Session URL.
 * - Without Stripe (local/dev): activates a mock subscription immediately.
 */
subscriptionRouter.post(
  '/checkout',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, 'User not found', 'not_found');

    if (!stripeEnabled) {
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const sub = await prisma.subscription.upsert({
        where: { userId },
        update: { status: 'active', currentPeriodEnd: periodEnd },
        create: { userId, status: 'active', currentPeriodEnd: periodEnd },
      });
      res.json({
        billingMode: 'mock',
        subscription: { status: sub.status, currentPeriodEnd: sub.currentPeriodEnd },
      });
      return;
    }

    const stripe = getStripe();
    let sub = await prisma.subscription.findUnique({ where: { userId } });

    let customerId = sub?.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        phone: user.phone,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: config.stripe.priceId as string, quantity: 1 }],
      success_url: config.stripe.successUrl,
      cancel_url: config.stripe.cancelUrl,
      metadata: { userId },
    });

    sub = await prisma.subscription.upsert({
      where: { userId },
      update: { stripeCustomerId: customerId, status: sub?.status ?? 'incomplete' },
      create: { userId, stripeCustomerId: customerId, status: 'incomplete' },
    });

    res.json({ billingMode: 'stripe', checkoutUrl: session.url });
  })
);

subscriptionRouter.post(
  '/cancel',
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId as string;
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new ApiError(404, 'No subscription found', 'not_found');

    if (stripeEnabled && sub.stripeSubscriptionId) {
      const stripe = getStripe();
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    const updated = await prisma.subscription.update({
      where: { userId },
      data: { status: 'canceled' },
    });
    res.json({ subscription: { status: updated.status } });
  })
);
