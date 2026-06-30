-- MamaCare AI — Migration 0002
-- Ajoute : profiles (étendu sur users), journal_entries, symptoms,
-- conversations, messages, et `last_weekly_notified_week` sur users.

PRAGMA foreign_keys = ON;

-- Champ rappel hebdo (suivi semaine signalée)
ALTER TABLE users ADD COLUMN last_weekly_notified_week INTEGER;
ALTER TABLE users ADD COLUMN lmp_date  TEXT;
ALTER TABLE users ADD COLUMN due_date  TEXT;

-- =============================================================
-- JOURNAL
-- =============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_date      TEXT NOT NULL,           -- YYYY-MM-DD
  mood            TEXT,                    -- great | ok | tired | love
  weight_kg       REAL,
  bp_systolic     INTEGER,
  bp_diastolic    INTEGER,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS symptoms (
  id          TEXT PRIMARY KEY,
  entry_id    TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  intensity   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_symptoms_entry ON symptoms(entry_id);

-- =============================================================
-- CONVERSATIONS / MESSAGES (assistant IA)
-- =============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,          -- user | assistant | system
  content         TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- =============================================================
-- PRÉFÉRENCES NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  channel_inapp        INTEGER NOT NULL DEFAULT 1,
  channel_push         INTEGER NOT NULL DEFAULT 1,
  channel_email        INTEGER NOT NULL DEFAULT 0,
  weekly_enabled       INTEGER NOT NULL DEFAULT 1,
  weekly_dow           INTEGER NOT NULL DEFAULT 1, -- 0=dim ... 6=sam
  weekly_hour_utc      INTEGER NOT NULL DEFAULT 9,
  appt_offset_d7       INTEGER NOT NULL DEFAULT 1,
  appt_offset_d1       INTEGER NOT NULL DEFAULT 1,
  appt_offset_h2       INTEGER NOT NULL DEFAULT 0,
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);