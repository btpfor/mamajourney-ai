import type { Env, AuthContext } from "./env";
import { db } from "./database";
import { HttpError } from "./http";

// ---------- Password hashing (PBKDF2 — Web Crypto, sans dépendance) ----------

const PBKDF2_ITER = 100_000;
const PBKDF2_KEYLEN = 32;

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64d(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    key,
    PBKDF2_KEYLEN * 8,
  );
  return `${PBKDF2_ITER}:${b64(salt)}:${b64(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [iterStr, saltB64, hashB64] = stored.split(":");
  if (!iterStr || !saltB64 || !hashB64) return false;
  const iter = parseInt(iterStr, 10);
  const salt = b64d(saltB64);
  const expected = b64d(hashB64);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
      key,
      expected.length * 8,
    ),
  );
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

// ---------- JWT HS256 ----------

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  return b64d(b);
}

export interface JwtPayload {
  sub: string;        // user id
  role: "user" | "admin";
  jti: string;        // session id
  iat: number;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const key = await hmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(s),
    new TextEncoder().encode(`${h}.${p}`),
  );
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ---------- Request authentication ----------

export async function requireAuth(req: Request, env: Env): Promise<AuthContext> {
  const header = req.headers.get("Authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new HttpError(401, "Missing bearer token");
  const payload = await verifyJwt(m[1], env.JWT_SECRET);
  if (!payload) throw new HttpError(401, "Invalid or expired token");
  const session = await db.sessions.findActive(env, payload.jti);
  if (!session) throw new HttpError(401, "Session revoked");
  return { userId: payload.sub, role: payload.role, sessionId: payload.jti };
}

export function requireAdmin(ctx: AuthContext): void {
  if (ctx.role !== "admin") throw new HttpError(403, "Admin only");
}