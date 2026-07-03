import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './routes/auth';
import { gamesRouter } from './routes/games';
import { subscriptionRouter } from './routes/subscription';
import { webhookRouter } from './routes/webhook';
import { errorHandler } from './middleware/error';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Stripe webhook needs the raw body, so mount it before the JSON parser.
  app.use('/webhooks', webhookRouter);

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'home-game-api' });
  });

  app.use('/auth', authRouter);
  app.use('/games', gamesRouter);
  app.use('/subscription', subscriptionRouter);

  app.use(errorHandler);

  return app;
}
