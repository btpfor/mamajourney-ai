/**
 * Couche unique d'accès à Cloudflare D1.
 * Règles :
 *   - TOUTE requête SQL passe par ce fichier.
 *   - Aucune concaténation de SQL avec des valeurs utilisateur.
 *   - Toujours `env.BD.prepare(sql).bind(...args)`.
 */
import type { Env } from "./env";

// ----------------------------- Types -----------------------------

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  locale: string;
  role: "user" | "admin";
  onboarded: number;
  created_at: string;
  updated_at: string;
}
export interface PregnancyRow {
  id: string; user_id: string; lmp_date: string | null; due_date: string | null;
  notes: string | null; status: string; created_at: string; updated_at: string;
}
export interface AppointmentRow {
  id: string; user_id: string; appointment_type: string; title: string;
  location: string | null; notes: string | null; appointment_date: string;
  status: string; created_at: string; updated_at: string;
}
export interface UltrasoundRow {
  id: string; user_id: string; pregnancy_id: string | null; performed_at: string;
  week: number | null; baby_weight_g: number | null; baby_size_mm: number | null;
  notes: string | null; image_url: string | null; created_at: string;
}
export interface DocumentRow {
  id: string; user_id: string; title: string; kind: string | null;
  url: string; mime_type: string | null; size_bytes: number | null; created_at: string;
}
export interface NotificationRow {
  id: string; user_id: string; type: string; title: string; body: string | null;
  link: string | null; scheduled_at: string | null; delivered_at: string | null;
  read_at: string | null; created_at: string;
}
export interface SessionRow {
  id: string; user_id: string; user_agent: string | null;
  created_at: string; expires_at: string; revoked_at: string | null;
}

// ----------------------------- DB API -----------------------------

export const db = {
  // -------- USERS --------
  users: {
    async findByEmail(env: Env, email: string): Promise<UserRow | null> {
      const stmt = env.BD.prepare("SELECT * FROM users WHERE email = ?");
      return (await stmt.bind(email).first<UserRow>()) ?? null;
    },
    async findById(env: Env, id: string): Promise<UserRow | null> {
      const stmt = env.BD.prepare("SELECT * FROM users WHERE id = ?");
      return (await stmt.bind(id).first<UserRow>()) ?? null;
    },
    async create(env: Env, row: {
      id: string; email: string; password_hash: string;
      full_name: string | null; locale: string; role: "user" | "admin";
    }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO users (id, email, password_hash, full_name, locale, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.email, row.password_hash, row.full_name, row.locale, row.role).run();
    },
    async updateProfile(env: Env, id: string, p: { full_name?: string | null; locale?: string; onboarded?: number }): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE users
         SET full_name = COALESCE(?, full_name),
             locale    = COALESCE(?, locale),
             onboarded = COALESCE(?, onboarded),
             updated_at = datetime('now')
         WHERE id = ?`,
      );
      await stmt.bind(p.full_name ?? null, p.locale ?? null, p.onboarded ?? null, id).run();
    },
    async updatePassword(env: Env, id: string, password_hash: string): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
      );
      await stmt.bind(password_hash, id).run();
    },
    async listAll(env: Env, limit: number, offset: number): Promise<UserRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      );
      const res = await stmt.bind(limit, offset).all<UserRow>();
      return res.results ?? [];
    },
    async deleteById(env: Env, id: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM users WHERE id = ?`);
      await stmt.bind(id).run();
    },
  },

  // -------- SESSIONS --------
  sessions: {
    async create(env: Env, row: SessionRow): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO sessions (id, user_id, user_agent, expires_at) VALUES (?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.user_agent, row.expires_at).run();
    },
    async findActive(env: Env, id: string): Promise<SessionRow | null> {
      const stmt = env.BD.prepare(
        `SELECT * FROM sessions
         WHERE id = ? AND revoked_at IS NULL AND expires_at > datetime('now')`,
      );
      return (await stmt.bind(id).first<SessionRow>()) ?? null;
    },
    async revoke(env: Env, id: string): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?`,
      );
      await stmt.bind(id).run();
    },
    async revokeAllForUser(env: Env, userId: string): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE sessions SET revoked_at = datetime('now')
         WHERE user_id = ? AND revoked_at IS NULL`,
      );
      await stmt.bind(userId).run();
    },
  },

  // -------- PASSWORD RESETS --------
  passwordResets: {
    async create(env: Env, token: string, userId: string, expiresAt: string): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)`,
      );
      await stmt.bind(token, userId, expiresAt).run();
    },
    async consume(env: Env, token: string): Promise<{ user_id: string } | null> {
      const find = env.BD.prepare(
        `SELECT user_id FROM password_resets
         WHERE token = ? AND used_at IS NULL AND expires_at > datetime('now')`,
      );
      const row = await find.bind(token).first<{ user_id: string }>();
      if (!row) return null;
      const mark = env.BD.prepare(
        `UPDATE password_resets SET used_at = datetime('now') WHERE token = ?`,
      );
      await mark.bind(token).run();
      return row;
    },
  },

  // -------- PREGNANCIES --------
  pregnancies: {
    async listByUser(env: Env, userId: string): Promise<PregnancyRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM pregnancies WHERE user_id = ? ORDER BY created_at DESC`,
      );
      const res = await stmt.bind(userId).all<PregnancyRow>();
      return res.results ?? [];
    },
    async findActive(env: Env, userId: string): Promise<PregnancyRow | null> {
      const stmt = env.BD.prepare(
        `SELECT * FROM pregnancies WHERE user_id = ? AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
      );
      return (await stmt.bind(userId).first<PregnancyRow>()) ?? null;
    },
    async create(env: Env, row: { id: string; user_id: string; lmp_date: string | null; due_date: string | null; notes: string | null }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO pregnancies (id, user_id, lmp_date, due_date, notes)
         VALUES (?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.lmp_date, row.due_date, row.notes).run();
    },
    async update(env: Env, id: string, userId: string, p: { lmp_date?: string | null; due_date?: string | null; notes?: string | null; status?: string }): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE pregnancies SET
           lmp_date = COALESCE(?, lmp_date),
           due_date = COALESCE(?, due_date),
           notes    = COALESCE(?, notes),
           status   = COALESCE(?, status),
           updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
      );
      await stmt.bind(p.lmp_date ?? null, p.due_date ?? null, p.notes ?? null, p.status ?? null, id, userId).run();
    },
    async delete(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM pregnancies WHERE id = ? AND user_id = ?`);
      await stmt.bind(id, userId).run();
    },
  },

  // -------- APPOINTMENTS --------
  appointments: {
    async listByUser(env: Env, userId: string): Promise<AppointmentRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date DESC`,
      );
      const res = await stmt.bind(userId).all<AppointmentRow>();
      return res.results ?? [];
    },
    async findById(env: Env, id: string, userId: string): Promise<AppointmentRow | null> {
      const stmt = env.BD.prepare(`SELECT * FROM appointments WHERE id = ? AND user_id = ?`);
      return (await stmt.bind(id, userId).first<AppointmentRow>()) ?? null;
    },
    async create(env: Env, row: { id: string; user_id: string; appointment_type: string; title: string; location: string | null; notes: string | null; appointment_date: string }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO appointments (id, user_id, appointment_type, title, location, notes, appointment_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.appointment_type, row.title, row.location, row.notes, row.appointment_date).run();
    },
    async update(env: Env, id: string, userId: string, p: { appointment_type?: string; title?: string; location?: string | null; notes?: string | null; appointment_date?: string; status?: string }): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE appointments SET
           appointment_type = COALESCE(?, appointment_type),
           title            = COALESCE(?, title),
           location         = COALESCE(?, location),
           notes            = COALESCE(?, notes),
           appointment_date = COALESCE(?, appointment_date),
           status           = COALESCE(?, status),
           updated_at = datetime('now')
         WHERE id = ? AND user_id = ?`,
      );
      await stmt.bind(
        p.appointment_type ?? null, p.title ?? null, p.location ?? null,
        p.notes ?? null, p.appointment_date ?? null, p.status ?? null,
        id, userId,
      ).run();
    },
    async delete(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM appointments WHERE id = ? AND user_id = ?`);
      await stmt.bind(id, userId).run();
    },
    async countUpcoming(env: Env, userId: string): Promise<number> {
      const stmt = env.BD.prepare(
        `SELECT COUNT(*) AS n FROM appointments
         WHERE user_id = ? AND appointment_date > datetime('now') AND status = 'scheduled'`,
      );
      const row = await stmt.bind(userId).first<{ n: number }>();
      return row?.n ?? 0;
    },
  },

  // -------- ULTRASOUNDS --------
  ultrasounds: {
    async listByUser(env: Env, userId: string): Promise<UltrasoundRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM ultrasounds WHERE user_id = ? ORDER BY performed_at DESC`,
      );
      const res = await stmt.bind(userId).all<UltrasoundRow>();
      return res.results ?? [];
    },
    async create(env: Env, row: { id: string; user_id: string; pregnancy_id: string | null; performed_at: string; week: number | null; baby_weight_g: number | null; baby_size_mm: number | null; notes: string | null; image_url: string | null }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO ultrasounds (id, user_id, pregnancy_id, performed_at, week, baby_weight_g, baby_size_mm, notes, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.pregnancy_id, row.performed_at, row.week, row.baby_weight_g, row.baby_size_mm, row.notes, row.image_url).run();
    },
    async delete(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM ultrasounds WHERE id = ? AND user_id = ?`);
      await stmt.bind(id, userId).run();
    },
  },

  // -------- DOCUMENTS --------
  documents: {
    async listByUser(env: Env, userId: string): Promise<DocumentRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
      );
      const res = await stmt.bind(userId).all<DocumentRow>();
      return res.results ?? [];
    },
    async create(env: Env, row: { id: string; user_id: string; title: string; kind: string | null; url: string; mime_type: string | null; size_bytes: number | null }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO documents (id, user_id, title, kind, url, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.title, row.kind, row.url, row.mime_type, row.size_bytes).run();
    },
    async delete(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM documents WHERE id = ? AND user_id = ?`);
      await stmt.bind(id, userId).run();
    },
  },

  // -------- NOTIFICATIONS --------
  notifications: {
    async listByUser(env: Env, userId: string, limit: number): Promise<NotificationRow[]> {
      const stmt = env.BD.prepare(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      );
      const res = await stmt.bind(userId, limit).all<NotificationRow>();
      return res.results ?? [];
    },
    async countUnread(env: Env, userId: string): Promise<number> {
      const stmt = env.BD.prepare(
        `SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`,
      );
      const row = await stmt.bind(userId).first<{ n: number }>();
      return row?.n ?? 0;
    },
    async create(env: Env, row: { id: string; user_id: string; type: string; title: string; body: string | null; link: string | null; scheduled_at: string | null }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO notifications (id, user_id, type, title, body, link, scheduled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      await stmt.bind(row.id, row.user_id, row.type, row.title, row.body, row.link, row.scheduled_at).run();
    },
    async markRead(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE notifications SET read_at = datetime('now')
         WHERE id = ? AND user_id = ? AND read_at IS NULL`,
      );
      await stmt.bind(id, userId).run();
    },
    async markAllRead(env: Env, userId: string): Promise<void> {
      const stmt = env.BD.prepare(
        `UPDATE notifications SET read_at = datetime('now')
         WHERE user_id = ? AND read_at IS NULL`,
      );
      await stmt.bind(userId).run();
    },
    async delete(env: Env, id: string, userId: string): Promise<void> {
      const stmt = env.BD.prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`);
      await stmt.bind(id, userId).run();
    },
  },

  // -------- PUSH SUBSCRIPTIONS --------
  pushSubscriptions: {
    async upsert(env: Env, row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; user_agent: string | null }): Promise<void> {
      const stmt = env.BD.prepare(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           user_id = excluded.user_id,
           p256dh  = excluded.p256dh,
           auth    = excluded.auth,
           user_agent = excluded.user_agent`,
      );
      await stmt.bind(row.id, row.user_id, row.endpoint, row.p256dh, row.auth, row.user_agent).run();
    },
    async deleteByEndpoint(env: Env, userId: string, endpoint: string): Promise<void> {
      const stmt = env.BD.prepare(
        `DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?`,
      );
      await stmt.bind(userId, endpoint).run();
    },
  },
};