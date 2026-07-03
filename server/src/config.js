import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

const resolvePath = (p, fallback) => {
  const value = p || fallback;
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
};

export const config = {
  port: Number(process.env.PORT) || 4000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  databasePath: resolvePath(process.env.DATABASE_PATH, './data/home-game.db'),

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    get enabled() {
      return Boolean(this.accountSid && this.authToken && this.fromNumber);
    },
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    priceId: process.env.STRIPE_PRICE_ID || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceLabel: process.env.SUBSCRIPTION_PRICE_LABEL || '$9.99 / month',
    get enabled() {
      return Boolean(this.secretKey && this.priceId);
    },
  },

  publicAppUrl: process.env.PUBLIC_APP_URL || 'homegame://',
};

export const isDev = config.env !== 'production';
