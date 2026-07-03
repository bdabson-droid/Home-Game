const crypto = require('crypto');
const db = require('./db');

function randomDigits(length) {
  let out = '';
  while (out.length < length) {
    const buf = crypto.randomBytes(length);
    for (let i = 0; i < buf.length && out.length < length; i++) {
      out += (buf[i] % 10).toString();
    }
  }
  return out;
}

function generateOtp() {
  return randomDigits(6);
}

function generateJoinCode() {
  const stmt = db.prepare('SELECT 1 FROM games WHERE join_code = ?');
  // Retry until unique; the collision space (1M) is huge relative to expected
  // active games in a home-game app.
  for (let attempt = 0; attempt < 25; attempt++) {
    const code = randomDigits(6);
    if (!stmt.get(code)) return code;
  }
  throw new Error('Could not allocate a unique join code');
}

module.exports = { generateOtp, generateJoinCode };
