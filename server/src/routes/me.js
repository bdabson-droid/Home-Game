const express = require('express');
const db = require('../lib/db');
const { requireAuth } = require('../middleware/auth');
const { isHostSubscribed } = require('../lib/subscription');
const { publicUser } = require('./auth');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  res.json({
    user: publicUser(req.user),
    canHost: isHostSubscribed(req.user),
  });
});

router.patch('/', requireAuth, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : null;
  if (!name) return res.status(400).json({ error: 'name is required' });
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user), canHost: isHostSubscribed(user) });
});

module.exports = router;
