import type { Env } from "../env";
import { db } from "../database";
import { hashPassword, verifyPassword, signJwt } from "../auth";
import { HttpError, json, readJson, uuid } from "../http";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function isEmail(s: unknown): s is string {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function issueSession(env: Env, user: { id: string; role: "user" | "admin" }, userAgent: string | null) {
  const sessionId = uuid();
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_TTL_SECONDS;
  await db.sessions.create(env, {
    id: sessionId,
    user_id: user.id,
    user_agent: userAgent,
    created_at: new Date().toISOString(),
    expires_at: new Date(exp * 1000).toISOString(),
    revoked_at: null,
  });
  const token = await signJwt(
    { sub: user.id, role: user.role, jti: sessionId, iat: now, exp },
    env.JWT_SECRET,
  );
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function signup(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string; full_name?: string; locale?: string }>(req);
  if (!isEmail(body.email)) throw new HttpError(400, "Invalid email");
  if (!body.password || body.password.length < 8) throw new HttpError(400, "Password must be >= 8 chars");

  const existing = await db.users.findByEmail(env, body.email);
  if (existing) throw new HttpError(409, "Email already registered");

  const id = uuid();
  const hash = await hashPassword(body.password);
  await db.users.create(env, {
    id,
    email: body.email,
    password_hash: hash,
    full_name: body.full_name ?? null,
    locale: body.locale ?? "fr",
    role: "user",
  });
  const session = await issueSession(env, { id, role: "user" }, req.headers.get("User-Agent"));
  return json({ user: { id, email: body.email, role: "user" }, ...session }, { status: 201 });
}

export async function signin(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string; password?: string }>(req);
  if (!isEmail(body.email) || !body.password) throw new HttpError(400, "Invalid credentials");
  const user = await db.users.findByEmail(env, body.email);
  if (!user) throw new HttpError(401, "Invalid credentials");
  const ok = await verifyPassword(body.password, user.password_hash);
  if (!ok) throw new HttpError(401, "Invalid credentials");
  const session = await issueSession(env, { id: user.id, role: user.role }, req.headers.get("User-Agent"));
  return json({
    user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, locale: user.locale, onboarded: !!user.onboarded },
    ...session,
  });
}

export async function signout(_req: Request, env: Env, ctx: { sessionId: string }): Promise<Response> {
  await db.sessions.revoke(env, ctx.sessionId);
  return json({ ok: true });
}

export async function requestPasswordReset(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{ email?: string }>(req);
  if (!isEmail(body.email)) throw new HttpError(400, "Invalid email");
  const user = await db.users.findByEmail(env, body.email);
  // Toujours répondre OK pour ne pas leaker l'existence d'un compte.
  if (!user) return json({ ok: true });
  const token = uuid().replace(/-/g, "") + uuid().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1h
  await db.passwordResets.create(env, token, user.id, expiresAt);
  // L'envoi e-mail réel se fera côté intégration (Resend, etc.).
  return json({ ok: true, token });
}

export async function confirmPasswordReset(req: Request, env: Env): Promise<Response> {
  const body = await readJson<{ token?: string; password?: string }>(req);
  if (!body.token || !body.password || body.password.length < 8) {
    throw new HttpError(400, "Invalid payload");
  }
  const row = await db.passwordResets.consume(env, body.token);
  if (!row) throw new HttpError(400, "Invalid or expired token");
  const hash = await hashPassword(body.password);
  await db.users.updatePassword(env, row.user_id, hash);
  await db.sessions.revokeAllForUser(env, row.user_id);
  return json({ ok: true });
}