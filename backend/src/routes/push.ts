import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

export async function vapidPublicKey(_req: Request, env: Env): Promise<Response> {
  return json({ publicKey: env.VAPID_PUBLIC_KEY ?? null });
}

interface SubBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function subscribe(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<SubBody>(req);
  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    throw new HttpError(400, "Invalid subscription payload");
  }
  const id = uuid();
  await db.pushSubscriptions.upsert(env, {
    id,
    user_id: ctx.userId,
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_agent: req.headers.get("User-Agent"),
  });
  return json({ ok: true });
}

export async function unsubscribe(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ endpoint?: string }>(req);
  if (!body.endpoint) throw new HttpError(400, "endpoint required");
  await db.pushSubscriptions.deleteByEndpoint(env, ctx.userId, body.endpoint);
  return json({ ok: true });
}