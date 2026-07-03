const jwt = require('jsonwebtoken');
const db = require('../lib/db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET || 'dev-secret');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unknown user' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function issueToken(user) {
  return jwt.sign({ sub: user.id, phone: user.phone }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '30d',
  });
}

module.exports = { requireAuth, issueToken };
