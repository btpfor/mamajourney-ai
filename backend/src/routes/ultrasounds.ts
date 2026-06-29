import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

export async function list(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  return json({ items: await db.ultrasounds.listByUser(env, ctx.userId) });
}

export async function create(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ pregnancy_id?: string | null; performed_at?: string; week?: number | null; baby_weight_g?: number | null; baby_size_mm?: number | null; notes?: string | null; image_url?: string | null }>(req);
  if (!body.performed_at) throw new HttpError(400, "performed_at required");
  const id = uuid();
  await db.ultrasounds.create(env, {
    id, user_id: ctx.userId,
    pregnancy_id: body.pregnancy_id ?? null,
    performed_at: body.performed_at,
    week: body.week ?? null,
    baby_weight_g: body.baby_weight_g ?? null,
    baby_size_mm: body.baby_size_mm ?? null,
    notes: body.notes ?? null,
    image_url: body.image_url ?? null,
  });
  return json({ id }, { status: 201 });
}

export async function remove(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.ultrasounds.delete(env, id, ctx.userId);
  return json({ ok: true });
}