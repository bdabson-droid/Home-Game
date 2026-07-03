import { config } from '../config.js';
import { db } from '../db.js';
import { newId } from '../utils/ids.js';

export function getSubscription(userId) {
  let sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  if (!sub) {
    const id = newId();
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan, status) VALUES (?, ?, 'host_monthly', 'inactive')`,
    ).run(id, userId);
    sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  }
  return sub;
}

export function isActive(userId) {
  const sub = getSubscription(userId);
  if (sub.status !== 'active') return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
    return false;
  }
  return true;
}

function activateLocally(userId, extra = {}) {
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  db.prepare(
    `UPDATE subscriptions
       SET status = 'active',
           current_period_end = ?,
           stripe_customer_id = COALESCE(?, stripe_customer_id),
           stripe_subscription_id = COALESCE(?, stripe_subscription_id),
           updated_at = datetime('now')
     WHERE user_id = ?`,
  ).run(
    periodEnd.toISOString(),
    extra.stripeCustomerId || null,
    extra.stripeSubscriptionId || null,
    userId,
  );
  return getSubscription(userId);
}

// Starts a subscription. With Stripe configured it creates a Checkout Session and
// returns its URL. In dev mode it activates the subscription immediately so the
// host flow can be exercised end-to-end.
export async function startSubscription(user, successUrl, cancelUrl) {
  getSubscription(user.id);

  if (!config.stripe.enabled) {
    const sub = activateLocally(user.id);
    return { mode: 'dev', activated: true, subscription: sub };
  }

  const params = new URLSearchParams();
  params.append('mode', 'subscription');
  params.append('line_items[0][price]', config.stripe.priceId);
  params.append('line_items[0][quantity]', '1');
  params.append('client_reference_id', user.id);
  params.append('success_url', successUrl || `${config.publicAppUrl}subscription/success`);
  params.append('cancel_url', cancelUrl || `${config.publicAppUrl}subscription/cancel`);
  if (user.phone) params.append('metadata[user_id]', user.id);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.stripe.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe error ${res.status}: ${text}`);
  }
  const session = await res.json();
  return { mode: 'stripe', activated: false, checkoutUrl: session.url, sessionId: session.id };
}

export function cancelSubscription(userId) {
  db.prepare(
    `UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE user_id = ?`,
  ).run(userId);
  return getSubscription(userId);
}

// Applies a Stripe webhook event (checkout.session.completed / subscription.* )
// to keep local status in sync when Stripe is enabled.
export function applyStripeEvent(event) {
  const type = event?.type;
  const obj = event?.data?.object || {};

  if (type === 'checkout.session.completed') {
    const userId = obj.client_reference_id || obj.metadata?.user_id;
    if (userId) {
      activateLocally(userId, {
        stripeCustomerId: obj.customer,
        stripeSubscriptionId: obj.subscription,
      });
    }
    return;
  }

  if (type === 'customer.subscription.deleted' || type === 'customer.subscription.canceled') {
    const sub = db
      .prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?')
      .get(obj.id);
    if (sub) {
      db.prepare(
        `UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE id = ?`,
      ).run(sub.id);
    }
  }
}

export function publicSubscription(userId) {
  const sub = getSubscription(userId);
  return {
    plan: sub.plan,
    status: sub.status,
    active: isActive(userId),
    currentPeriodEnd: sub.current_period_end,
    priceLabel: config.stripe.priceLabel,
    billingMode: config.stripe.enabled ? 'stripe' : 'dev',
  };
}
