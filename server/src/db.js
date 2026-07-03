import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

const dir = path.dirname(config.databasePath);
fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  phone         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          TEXT PRIMARY KEY,
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  consumed    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'host_monthly',
  status                 TEXT NOT NULL DEFAULT 'inactive',
  current_period_end     TEXT,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS home_games (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  stakes        TEXT,
  location      TEXT,
  host_user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_code     TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_games_host ON home_games(host_user_id);

CREATE TABLE IF NOT EXISTS memberships (
  id            TEXT PRIMARY KEY,
  home_game_id  TEXT NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'player',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(home_game_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_game ON memberships(home_game_id);

CREATE TABLE IF NOT EXISTS invitations (
  id                TEXT PRIMARY KEY,
  home_game_id      TEXT NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
  phone             TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'pending',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(home_game_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_invitations_phone ON invitations(phone);

CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  home_game_id  TEXT NOT NULL REFERENCES home_games(id) ON DELETE CASCADE,
  scheduled_at  TEXT NOT NULL,
  location      TEXT,
  buy_in        TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_game ON sessions(home_game_id);

CREATE TABLE IF NOT EXISTS session_rsvps (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'yes',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, user_id)
);
`);

export default db;
