const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { isHostSubscribed } = require('../lib/subscription');
const { publicUser } = require('./auth');

const router = express.Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  // Lazy require so the server can run without the stripe module configured.
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

router.get('/status', requireAuth, (req, res) => {
  res.json({
    status: req.user.subscription_status,
    expires_at: req.user.subscription_expires_at,
    active: isHostSubscribed(req.user),
    stripe_configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
  });
});

router.post('/checkout', requireAuth, async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({
      error: 'Stripe is not configured on the server. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID.',
    });
  }

  let customerId = req.user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      phone: req.user.phone,
      name: req.user.name || undefined,
      metadata: { user_id: String(req.user.id) },
    });
    customerId = customer.id;
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, req.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: process.env.STRIPE_SUCCESS_URL || 'homegame://subscription/success',
    cancel_url: process.env.STRIPE_CANCEL_URL || 'homegame://subscription/cancel',
    metadata: { user_id: String(req.user.id) },
  });

  res.json({ url: session.url, id: session.id });
});

// Stripe requires the raw body to verify webhook signatures. It's mounted with
// express.raw() in src/index.js.
async function webhookHandler(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('Webhook secret not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  const applyToUser = (customerId, patch) => {
    db.prepare(
      `UPDATE users
         SET subscription_status = COALESCE(?, subscription_status),
             subscription_expires_at = COALESCE(?, subscription_expires_at)
         WHERE stripe_customer_id = ?`,
    ).run(patch.status ?? null, patch.expires_at ?? null, customerId);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.customer && session.metadata?.user_id) {
        db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(
          session.customer,
          Number(session.metadata.user_id),
        );
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      applyToUser(sub.customer, {
        status: sub.status,
        expires_at: sub.current_period_end ? sub.current_period_end * 1000 : null,
      });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      applyToUser(sub.customer, { status: 'canceled', expires_at: Date.now() });
      break;
    }
    default:
      break;
  }
  res.json({ received: true });
}

module.exports = { router, webhookHandler, publicUser };
