import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './poker.db';
const db = new Database(path.resolve(dbPath));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      otp_code TEXT,
      otp_expires_at TEXT,
      subscription_status TEXT DEFAULT 'inactive',
      subscription_id TEXT,
      stripe_customer_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'upcoming',
      max_players INTEGER DEFAULT 10,
      buy_in_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      location TEXT,
      scheduled_at TEXT,
      started_at TEXT,
      ended_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (host_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      user_id INTEGER,
      phone TEXT,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'invited',
      buy_in_total REAL DEFAULT 0,
      cash_out_amount REAL,
      chip_count INTEGER DEFAULT 0,
      rebuy_count INTEGER DEFAULT 0,
      invited_at TEXT DEFAULT (datetime('now')),
      joined_at TEXT,
      cashed_out_at TEXT,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      chips INTEGER DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (player_id) REFERENCES game_players(id)
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      invited_phone TEXT NOT NULL,
      invited_by INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );
  `);

  console.log('Database initialized successfully');
}

export default db;
