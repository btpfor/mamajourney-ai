import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { json, readJson, uuid } from "../http";

export async function list(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const items = await db.notifications.listByUser(env, ctx.userId, 100);
  const unread = await db.notifications.countUnread(env, ctx.userId);
  return json({ items, unread });
}

export async function create(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ type?: string; title?: string; body?: string | null; link?: string | null; scheduled_at?: string | null }>(req);
  const id = uuid();
  await db.notifications.create(env, {
    id, user_id: ctx.userId,
    type: body.type ?? "system",
    title: body.title ?? "",
    body: body.body ?? null,
    link: body.link ?? null,
    scheduled_at: body.scheduled_at ?? null,
  });
  return json({ id }, { status: 201 });
}

export async function markRead(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.notifications.markRead(env, id, ctx.userId);
  return json({ ok: true });
}

export async function markAllRead(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  await db.notifications.markAllRead(env, ctx.userId);
  return json({ ok: true });
}

export async function remove(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.notifications.delete(env, id, ctx.userId);
  return json({ ok: true });
}