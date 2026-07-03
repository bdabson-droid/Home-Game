import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import db from '../db/database';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16',
});

// POST /api/subscription/create-checkout - create Stripe checkout session
router.post('/create-checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.subscription_status === 'active') {
      res.status(400).json({ error: 'You already have an active subscription' });
      return;
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        phone: user.phone,
        name: user.name,
        email: user.email || undefined,
        metadata: { userId: String(req.userId) },
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.userId);
    }

    const priceId = process.env.STRIPE_PRICE_ID || 'price_placeholder';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription`,
      metadata: { userId: String(req.userId) },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/subscription/webhook - Stripe webhook handler
router.post('/webhook', (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status === 'active' ? 'active' : 'inactive';

      db.prepare('UPDATE users SET subscription_status = ?, subscription_id = ? WHERE stripe_customer_id = ?').run(
        status,
        subscription.id,
        customerId
      );
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      db.prepare('UPDATE users SET subscription_status = ?, subscription_id = NULL WHERE stripe_customer_id = ?').run(
        'cancelled',
        customerId
      );
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const userId = session.metadata?.userId;
        if (userId) {
          db.prepare('UPDATE users SET subscription_status = ?, subscription_id = ? WHERE id = ?').run(
            'active',
            session.subscription,
            parseInt(userId)
          );
        }
      }
      break;
    }
  }

  res.json({ received: true });
});

// POST /api/subscription/cancel - cancel subscription
router.post('/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId) as any;

    if (!user?.subscription_id) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    await stripe.subscriptions.update(user.subscription_id, { cancel_at_period_end: true });

    res.json({ message: 'Subscription will be cancelled at the end of the billing period' });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /api/subscription/status
router.get('/status', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = db.prepare('SELECT subscription_status, subscription_id, stripe_customer_id FROM users WHERE id = ?').get(req.userId) as any;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      status: user.subscription_status,
      hasSubscription: user.subscription_status === 'active',
      subscriptionId: user.subscription_id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// POST /api/subscription/activate-dev - activate subscription (DEV ONLY)
router.post('/activate-dev', authenticateToken, (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  db.prepare("UPDATE users SET subscription_status = 'active' WHERE id = ?").run(req.userId);
  res.json({ message: 'Subscription activated (dev mode)' });
});

export default router;
