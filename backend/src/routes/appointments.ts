import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

export async function list(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  return json({ items: await db.appointments.listByUser(env, ctx.userId) });
}

export async function get(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  const row = await db.appointments.findById(env, id, ctx.userId);
  if (!row) throw new HttpError(404, "Not found");
  return json(row);
}

export async function create(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ appointment_type?: string; title?: string; location?: string | null; notes?: string | null; appointment_date?: string }>(req);
  if (!body.appointment_type || !body.title || !body.appointment_date) {
    throw new HttpError(400, "Missing required fields");
  }
  const id = uuid();
  await db.appointments.create(env, {
    id, user_id: ctx.userId,
    appointment_type: body.appointment_type,
    title: body.title,
    location: body.location ?? null,
    notes: body.notes ?? null,
    appointment_date: body.appointment_date,
  });
  return json({ id }, { status: 201 });
}

export async function update(req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  const body = await readJson(req);
  await db.appointments.update(env, id, ctx.userId, body as Record<string, never>);
  return json({ ok: true });
}

export async function remove(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.appointments.delete(env, id, ctx.userId);
  return json({ ok: true });
}