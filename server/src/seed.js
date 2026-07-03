require('dotenv').config();
const { initDb } = require('./db/schema');
const { hashPassword } = require('./utils/auth');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = initDb();

const existingHost = db.prepare("SELECT id FROM users WHERE phone = '5551234567'").get();
if (!existingHost) {
  const hostId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, phone, name, password_hash, is_host, subscription_status, subscription_expires_at)
    VALUES (?, '5551234567', 'Demo Host', ?, 1, 'active', datetime('now', '+1 month'))
  `).run(hostId, hashPassword('demo1234'));

  const playerId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, phone, name, password_hash)
    VALUES (?, '5559876543', 'Demo Player', ?)
  `).run(playerId, hashPassword('demo1234'));

  const gameId = uuidv4();
  db.prepare(`
    INSERT INTO home_games (id, host_id, name, join_code, description, location)
    VALUES (?, ?, 'Friday Night Poker', '123456', 'Weekly home game', 'Mike''s basement')
  `).run(gameId, hostId);

  db.prepare(`
    INSERT INTO game_members (id, game_id, user_id, role) VALUES (?, ?, ?, 'host')
  `).run(uuidv4(), gameId, hostId);

  db.prepare(`
    INSERT INTO game_members (id, game_id, user_id, role) VALUES (?, ?, ?, 'player')
  `).run(uuidv4(), gameId, playerId);
}

console.log('Seed complete!');
console.log('Demo Host: 5551234567 / demo1234 (active subscription)');
console.log('Demo Player: 5559876543 / demo1234');
console.log('Join code for Friday Night Poker: 123456');
