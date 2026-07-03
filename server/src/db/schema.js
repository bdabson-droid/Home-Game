const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/poker.db');

function initDb() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_host INTEGER DEFAULT 0,
      stripe_customer_id TEXT,
      subscription_status TEXT DEFAULT 'none',
      subscription_expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      phone TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS home_games (
      id TEXT PRIMARY KEY,
      host_id TEXT NOT NULL,
      name TEXT NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      description TEXT,
      location TEXT,
      scheduled_at TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (host_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_members (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'player',
      status TEXT DEFAULT 'active',
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(game_id, user_id),
      FOREIGN KEY (game_id) REFERENCES home_games(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_invites (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      phone TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(game_id, phone),
      FOREIGN KEY (game_id) REFERENCES home_games(id),
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      notes TEXT,
      FOREIGN KEY (game_id) REFERENCES home_games(id)
    );

    CREATE TABLE IF NOT EXISTS session_players (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      buy_in REAL DEFAULT 0,
      cash_out REAL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES game_sessions(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}

module.exports = { initDb, dbPath };
