import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { requireAdmin } from "../auth";
import { json } from "../http";

export async function listUsers(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  requireAdmin(ctx);
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;
  const items = await db.users.listAll(env, limit, offset);
  return json({
    items: items.map(u => ({
      id: u.id, email: u.email, full_name: u.full_name, role: u.role,
      locale: u.locale, onboarded: !!u.onboarded, created_at: u.created_at,
    })),
  });
}

export async function deleteUser(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  requireAdmin(ctx);
  await db.users.deleteById(env, id);
  return json({ ok: true });
}