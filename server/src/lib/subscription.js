const db = require('./db');

/**
 * Returns true when the user is currently allowed to act as a host.
 *
 * In dev mode (or when Stripe is not configured) we treat every user as
 * subscribed so the app remains testable end to end. In production, the
 * `subscription_status` column is authoritative and driven by Stripe webhooks.
 */
function isHostSubscribed(user) {
  if (!user) return false;
  const devMode = String(process.env.DEV_MODE || 'true').toLowerCase() === 'true';
  const stripeConfigured = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID,
  );
  if (!stripeConfigured || devMode) return true;

  if (user.subscription_status !== 'active' && user.subscription_status !== 'trialing') {
    return false;
  }
  if (user.subscription_expires_at && user.subscription_expires_at < Date.now()) {
    return false;
  }
  return true;
}

function refreshUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

module.exports = { isHostSubscribed, refreshUser };
