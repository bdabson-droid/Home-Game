import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscription.js';
import gamesRoutes from './routes/games.js';
import joinRoutes from './routes/join.js';
import { applyStripeEvent } from './services/subscription.js';

export function createApp() {
  const app = express();
  app.use(cors());

  // Stripe webhook needs the raw body for signature verification, so register it
  // before the JSON body parser.
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    (req, res) => {
      let event;
      try {
        event = JSON.parse(req.body.toString('utf8'));
      } catch (err) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      try {
        applyStripeEvent(event);
      } catch (err) {
        console.error('Webhook handling error:', err.message);
      }
      res.json({ received: true });
    },
  );

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({
      ok: true,
      env: config.env,
      sms: config.twilio.enabled ? 'twilio' : 'dev',
      billing: config.stripe.enabled ? 'stripe' : 'dev',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api', joinRoutes);

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
