import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { prisma } from '../db';
import { config, stripeEnabled } from '../config';
import { getStripe } from '../services/stripe';

export const webhookRouter = Router();

// Stripe requires the raw request body to verify the signature.
webhookRouter.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  if (!stripeEnabled) {
    res.status(400).json({ error: 'Stripe not configured' });
    return;
  }
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature as string,
      config.stripe.webhookSecret as string
    );
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  async function syncFromStripeSubscription(sub: Stripe.Subscription): Promise<void> {
    const userId = (sub.metadata?.userId as string | undefined) ?? undefined;
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    // current_period_end has moved between top-level and item level across
    // Stripe API versions, so read defensively from either location.
    const subAny = sub as unknown as { current_period_end?: number };
    const itemAny = sub.items.data[0] as unknown as { current_period_end?: number } | undefined;
    const periodEnd = subAny.current_period_end ?? itemAny?.current_period_end ?? null;

    const statusMap: Record<string, 'incomplete' | 'active' | 'past_due' | 'canceled'> = {
      active: 'active',
      trialing: 'active',
      past_due: 'past_due',
      canceled: 'canceled',
      unpaid: 'past_due',
      incomplete: 'incomplete',
      incomplete_expired: 'canceled',
    };
    const status = statusMap[sub.status] ?? 'incomplete';

    const existing = userId
      ? await prisma.subscription.findUnique({ where: { userId } })
      : await prisma.subscription.findFirst({ where: { stripeCustomerId: customerId } });

    if (!existing) return;

    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        status,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: customerId,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      },
    });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncFromStripeSubscription(sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncFromStripeSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }

  res.json({ received: true });
});
