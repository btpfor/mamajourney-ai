/**
 * Middleware HTTP — auth bearer, CORS, parsing JSON.
 * Réexpose les helpers d'auth et HTTP pour un import unique.
 */
export { requireAuth, requireAdmin } from "./auth";
export { json, error, preflight, readJson, HttpError, uuid } from "./http";

import type { Env, AuthContext } from "./env";
import { requireAuth } from "./auth";

export type Handler = (req: Request, env: Env) => Promise<Response>;
export type AuthedHandler = (
  req: Request,
  env: Env,
  ctx: AuthContext,
  ...params: string[]
) => Promise<Response>;

/** Enveloppe un handler en exigeant un utilisateur authentifié. */
export function withAuth(handler: AuthedHandler): Handler {
  return async (req, env) => {
    const ctx = await requireAuth(req, env);
    return handler(req, env, ctx);
  };
}