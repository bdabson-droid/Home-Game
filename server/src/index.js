require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDb } = require('./db/schema');
const { createAuthRoutes } = require('./routes/auth');
const { createGameRoutes } = require('./routes/games');
const { createSubscriptionRoutes } = require('./routes/subscriptions');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = initDb();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'poker-home-game-api' });
});

app.use('/api/auth', createAuthRoutes(db));
app.use('/api/games', createGameRoutes(db));
app.use('/api/subscriptions', createSubscriptionRoutes(db));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Poker Home Game API running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
