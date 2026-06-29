import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson } from "../http";

export async function getMe(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const u = await db.users.findById(env, ctx.userId);
  if (!u) throw new HttpError(404, "User not found");
  return json({
    id: u.id, email: u.email, full_name: u.full_name, locale: u.locale,
    role: u.role, onboarded: !!u.onboarded, created_at: u.created_at,
  });
}

export async function updateMe(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ full_name?: string | null; locale?: string; onboarded?: boolean }>(req);
  await db.users.updateProfile(env, ctx.userId, {
    full_name: body.full_name ?? undefined,
    locale: body.locale,
    onboarded: typeof body.onboarded === "boolean" ? (body.onboarded ? 1 : 0) : undefined,
  });
  return json({ ok: true });
}