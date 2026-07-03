require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth').router;
const meRoutes = require('./routes/me');
const gameRoutes = require('./routes/games');
const { router: subscriptionRoutes, webhookHandler } = require('./routes/subscription');

const app = express();
app.use(cors());

// Stripe webhook needs the raw body, so mount it before express.json().
app.post(
  '/subscription/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler,
);

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/me', meRoutes);
app.use('/games', gameRoutes);
app.use('/subscription', subscriptionRoutes);

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Home Game API listening on http://localhost:${port}`);
});
