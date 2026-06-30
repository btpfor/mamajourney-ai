/**
 * MamaCare AI — Cloudflare Worker (compatible Pages Functions)
 * Aucune dépendance Supabase / Firebase / Postgres.
 * Toutes les requêtes SQL passent par src/database.ts (D1 binding "BD").
 */
import type { Env, AuthContext } from "./env";
import { HttpError, error, json, preflight } from "./http";
import { requireAuth } from "./auth";

import * as Auth from "./routes/auth";
import * as Users from "./routes/users";
import * as Pregnancies from "./routes/pregnancies";
import * as Appointments from "./routes/appointments";
import * as Ultrasounds from "./routes/ultrasounds";
import * as Documents from "./routes/documents";
import * as Notifications from "./routes/notifications";
import * as Dashboard from "./routes/dashboard";
import * as Admin from "./routes/admin";

type Handler = (req: Request, env: Env) => Promise<Response>;
type AuthedHandler = (req: Request, env: Env, ctx: AuthContext, ...params: string[]) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  auth: boolean;
  handler: Handler | AuthedHandler;
}

const r = (method: string, pattern: string, handler: Handler | AuthedHandler, auth = true): Route => ({
  method,
  pattern: new RegExp("^" + pattern.replace(/:[a-zA-Z]+/g, "([^/]+)") + "$"),
  auth,
  handler,
});

const routes: Route[] = [
  // ---- Public ----
  r("POST",   "/api/auth/signup",          Auth.signup,                  false),
  r("POST",   "/api/auth/register",        Auth.signup,                  false),
  r("POST",   "/api/auth/signin",          Auth.signin,                  false),
  r("POST",   "/api/auth/login",           Auth.signin,                  false),
  r("POST",   "/api/auth/password/reset",  Auth.requestPasswordReset,    false),
  r("POST",   "/api/auth/password/confirm",Auth.confirmPasswordReset,    false),
  r("GET",    "/api/health",               async () => json({ ok: true }), false),

  // ---- Authed ----
  r("POST",   "/api/auth/signout",         Auth.signout),
  r("POST",   "/api/auth/logout",          Auth.signout),

  r("GET",    "/api/users/me",             Users.getMe),
  r("PATCH",  "/api/users/me",             Users.updateMe),
  r("PUT",    "/api/users/me",             Users.updateMe),

  r("GET",    "/api/pregnancies",          Pregnancies.list),
  r("POST",   "/api/pregnancies",          Pregnancies.create),
  r("GET",    "/api/pregnancies/active",   Pregnancies.active),
  r("PATCH",  "/api/pregnancies/:id",      Pregnancies.update),
  r("PUT",    "/api/pregnancies/:id",      Pregnancies.update),
  r("DELETE", "/api/pregnancies/:id",      Pregnancies.remove),

  r("GET",    "/api/appointments",         Appointments.list),
  r("POST",   "/api/appointments",         Appointments.create),
  r("GET",    "/api/appointments/:id",     Appointments.get),
  r("PATCH",  "/api/appointments/:id",     Appointments.update),
  r("DELETE", "/api/appointments/:id",     Appointments.remove),

  r("GET",    "/api/ultrasounds",          Ultrasounds.list),
  r("POST",   "/api/ultrasounds",          Ultrasounds.create),
  r("DELETE", "/api/ultrasounds/:id",      Ultrasounds.remove),

  r("GET",    "/api/documents",            Documents.list),
  r("POST",   "/api/documents",            Documents.create),
  r("DELETE", "/api/documents/:id",        Documents.remove),

  r("GET",    "/api/notifications",        Notifications.list),
  r("POST",   "/api/notifications",        Notifications.create),
  r("POST",   "/api/notifications/read-all", Notifications.markAllRead),
  r("POST",   "/api/notifications/:id/read", Notifications.markRead),
  r("DELETE", "/api/notifications/:id",    Notifications.remove),

  r("GET",    "/api/dashboard",            Dashboard.get),

  r("GET",    "/api/admin/users",          Admin.listUsers),
  r("DELETE", "/api/admin/users/:id",      Admin.deleteUser),
];

async function dispatch(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return preflight();
  const url = new URL(req.url);

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const match = url.pathname.match(route.pattern);
    if (!match) continue;
    const params = match.slice(1);
    try {
      if (route.auth) {
        const ctx = await requireAuth(req, env);
        return await (route.handler as AuthedHandler)(req, env, ctx, ...params);
      }
      return await (route.handler as Handler)(req, env);
    } catch (e) {
      if (e instanceof HttpError) return error(e.status, e.message);
      console.error("Unhandled error:", e);
      return error(500, "Internal server error");
    }
  }
  return error(404, "Not found");
}

// --------- Cloudflare Worker entry ---------
export default {
  fetch: dispatch,
};

// --------- Cloudflare Pages Functions adapter ---------
// Permet l'usage via `functions/[[path]].ts` :
//   import { onRequest } from "../../backend/src";
export const onRequest = async (context: { request: Request; env: Env }) =>
  dispatch(context.request, context.env);