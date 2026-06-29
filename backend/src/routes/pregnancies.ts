import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

export async function list(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  return json({ items: await db.pregnancies.listByUser(env, ctx.userId) });
}

export async function create(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ lmp_date?: string | null; due_date?: string | null; notes?: string | null }>(req);
  const id = uuid();
  await db.pregnancies.create(env, {
    id, user_id: ctx.userId,
    lmp_date: body.lmp_date ?? null,
    due_date: body.due_date ?? null,
    notes: body.notes ?? null,
  });
  return json({ id }, { status: 201 });
}

export async function update(req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  const body = await readJson<{ lmp_date?: string | null; due_date?: string | null; notes?: string | null; status?: string }>(req);
  await db.pregnancies.update(env, id, ctx.userId, body);
  return json({ ok: true });
}

export async function remove(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.pregnancies.delete(env, id, ctx.userId);
  return json({ ok: true });
}

export async function active(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const p = await db.pregnancies.findActive(env, ctx.userId);
  if (!p) throw new HttpError(404, "No active pregnancy");
  return json(p);
}