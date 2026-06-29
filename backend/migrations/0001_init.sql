-- MamaCare AI — Schéma D1 (SQLite)
-- Toutes les FK sont actives et les index nécessaires sont créés.

PRAGMA foreign_keys = ON;

-- =============================================================
-- USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,           -- PBKDF2 ("iter:salt:hash" base64)
  full_name       TEXT,
  locale          TEXT NOT NULL DEFAULT 'fr',
  role            TEXT NOT NULL DEFAULT 'user',  -- user | admin
  onboarded       INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================================
-- SESSIONS (révocables — pour logout serveur)
-- =============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,             -- jti du JWT
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- =============================================================
-- PASSWORD RESETS
-- =============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================
-- PREGNANCIES
-- =============================================================
CREATE TABLE IF NOT EXISTS pregnancies (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lmp_date    TEXT,        -- date des dernières règles (YYYY-MM-DD)
  due_date    TEXT,        -- date prévue d'accouchement
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- active | ended
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pregnancies_user ON pregnancies(user_id);

-- =============================================================
-- APPOINTMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_type  TEXT NOT NULL,    -- consultation | ultrasound | vaccine | other
  title             TEXT NOT NULL,
  location          TEXT,
  notes             TEXT,
  appointment_date  TEXT NOT NULL,    -- ISO datetime
  status            TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | done | cancelled
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON appointments(user_id, appointment_date);

-- =============================================================
-- ULTRASOUNDS
-- =============================================================
CREATE TABLE IF NOT EXISTS ultrasounds (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pregnancy_id    TEXT REFERENCES pregnancies(id) ON DELETE SET NULL,
  performed_at    TEXT NOT NULL,
  week            INTEGER,
  baby_weight_g   INTEGER,
  baby_size_mm    INTEGER,
  notes           TEXT,
  image_url       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ultrasounds_user ON ultrasounds(user_id);

-- =============================================================
-- DOCUMENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS documents (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  kind        TEXT,            -- prescription | analysis | report | other
  url         TEXT NOT NULL,   -- URL stockage externe (R2, etc.)
  mime_type   TEXT,
  size_bytes  INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);

-- =============================================================
-- NOTIFICATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,     -- reminder | weekly | system
  title           TEXT NOT NULL,
  body            TEXT,
  link            TEXT,
  scheduled_at    TEXT,
  delivered_at    TEXT,
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_due ON notifications(scheduled_at, delivered_at);

-- =============================================================
-- PUSH SUBSCRIPTIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);