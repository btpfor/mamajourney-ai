import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

export async function list(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  return json({ items: await db.documents.listByUser(env, ctx.userId) });
}

export async function create(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ title?: string; kind?: string | null; url?: string; mime_type?: string | null; size_bytes?: number | null }>(req);
  if (!body.title || !body.url) throw new HttpError(400, "title and url required");
  const id = uuid();
  await db.documents.create(env, {
    id, user_id: ctx.userId,
    title: body.title,
    kind: body.kind ?? null,
    url: body.url,
    mime_type: body.mime_type ?? null,
    size_bytes: body.size_bytes ?? null,
  });
  return json({ id }, { status: 201 });
}

export async function remove(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.documents.delete(env, id, ctx.userId);
  return json({ ok: true });
}