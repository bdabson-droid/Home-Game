const { verifyToken } = require('../utils/auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireHost(req, res, next) {
  if (!req.user?.isHost) {
    return res.status(403).json({ error: 'Host subscription required' });
  }
  next();
}

module.exports = { requireAuth, requireHost };
