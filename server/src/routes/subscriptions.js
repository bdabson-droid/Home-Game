const { Router } = require('express');
const Stripe = require('stripe');
const { requireAuth } = require('../middleware/auth');

function createSubscriptionRoutes(db) {
  const router = Router();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = stripeKey && !stripeKey.includes('your_key') ? new Stripe(stripeKey) : null;

  router.use(requireAuth);

  router.get('/status', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const isActive = user.subscription_status === 'active' &&
      (!user.subscription_expires_at || new Date(user.subscription_expires_at) > new Date());

    res.json({
      isHost: !!user.is_host,
      subscriptionStatus: user.subscription_status,
      subscriptionExpiresAt: user.subscription_expires_at,
      isActive,
    });
  });

  router.post('/checkout', async (req, res) => {
    if (!stripe) {
      return activateDemoSubscription(db, req.user.id, res);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        phone: user.phone,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.id);
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId || priceId.includes('your_')) {
      return activateDemoSubscription(db, req.user.id, res);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL || 'http://localhost:3001'}/api/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3001'}/api/subscriptions/cancel`,
      metadata: { userId: user.id },
    });

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  });

  router.post('/demo-activate', (req, res) => {
    activateDemoSubscription(db, req.user.id, res);
  });

  router.get('/success', async (req, res) => {
    if (!stripe || !req.query.session_id) {
      return res.send('<h1>Subscription activated!</h1><p>You can close this window.</p>');
    }

    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    if (session.metadata?.userId) {
      activateUser(db, session.metadata.userId);
    }
    res.send('<h1>Subscription activated!</h1><p>You can close this window and return to the app.</p>');
  });

  router.get('/cancel', (_req, res) => {
    res.send('<h1>Checkout cancelled</h1><p>You can close this window.</p>');
  });

  return router;
}

function activateDemoSubscription(db, userId, res) {
  activateUser(db, userId);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json({
    message: 'Host subscription activated (demo mode)',
    user: {
      id: user.id,
      isHost: true,
      subscriptionStatus: user.subscription_status,
      subscriptionExpiresAt: user.subscription_expires_at,
    },
  });
}

function activateUser(db, userId) {
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  db.prepare(`
    UPDATE users SET is_host = 1, subscription_status = 'active',
    subscription_expires_at = ? WHERE id = ?
  `).run(expiresAt.toISOString(), userId);
}

module.exports = { createSubscriptionRoutes };
