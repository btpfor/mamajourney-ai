export interface Env {
  BD: D1Database;
  JWT_SECRET: string;
  APP_ENV?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  OPENAI_API_KEY?: string;
}

export interface AuthContext {
  userId: string;
  role: "user" | "admin";
  sessionId: string;
}