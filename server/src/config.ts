import dotenv from 'dotenv';

dotenv.config();

function optional(key: string): string | undefined {
  const value = process.env[key];
  return value && value.length > 0 ? value : undefined;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),

  // Twilio (optional). When not set, OTP codes are logged to the console.
  twilio: {
    accountSid: optional('TWILIO_ACCOUNT_SID'),
    authToken: optional('TWILIO_AUTH_TOKEN'),
    fromNumber: optional('TWILIO_FROM_NUMBER'),
  },

  // Stripe (optional). When not set, subscriptions run in a local mock mode.
  stripe: {
    secretKey: optional('STRIPE_SECRET_KEY'),
    priceId: optional('STRIPE_PRICE_ID'),
    webhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
    successUrl: process.env.STRIPE_SUCCESS_URL ?? 'homegame://subscription/success',
    cancelUrl: process.env.STRIPE_CANCEL_URL ?? 'homegame://subscription/cancel',
  },
};

export const stripeEnabled = Boolean(config.stripe.secretKey && config.stripe.priceId);
export const twilioEnabled = Boolean(
  config.twilio.accountSid && config.twilio.authToken && config.twilio.fromNumber
);
