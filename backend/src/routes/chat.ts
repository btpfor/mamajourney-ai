import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { HttpError, json, readJson, uuid } from "../http";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `Tu es l'assistante IA bienveillante de MamaCare AI, une application pour femmes enceintes.
Tu n'es PAS un professionnel de santé : invite toujours à consulter un médecin/sage-femme pour les décisions médicales.
Réponds avec empathie, en français par défaut, en t'adaptant à la langue de l'utilisatrice. Reste concise (≤ 250 mots).`;

export async function listConversations(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const items = await db.conversations.listByUser(env, ctx.userId);
  return json({ items });
}

export async function createConversation(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const body = await readJson<{ title?: string }>(req).catch(() => ({} as { title?: string }));
  const id = uuid();
  await db.conversations.create(env, { id, user_id: ctx.userId, title: body.title || "Nouvelle conversation" });
  return json({ id }, { status: 201 });
}

export async function deleteConversation(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  await db.conversations.delete(env, id, ctx.userId);
  return json({ ok: true });
}

export async function listMessages(_req: Request, env: Env, ctx: AuthContext, id: string): Promise<Response> {
  const conv = await db.conversations.findById(env, id, ctx.userId);
  if (!conv) throw new HttpError(404, "Conversation not found");
  const items = await db.messages.listByConversation(env, id);
  return json({ conversation: conv, items });
}

interface ChatBody {
  conversation_id?: string;
  message: string;
  context?: { week?: number | null; full_name?: string | null };
}

export async function postMessage(req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new HttpError(500, "OPENAI_API_KEY not configured");
  const body = await readJson<ChatBody>(req);
  if (!body.message || typeof body.message !== "string") throw new HttpError(400, "message required");

  // Ensure conversation
  let convId = body.conversation_id;
  if (!convId) {
    convId = uuid();
    await db.conversations.create(env, {
      id: convId,
      user_id: ctx.userId,
      title: body.message.slice(0, 60),
    });
  } else {
    const c = await db.conversations.findById(env, convId, ctx.userId);
    if (!c) throw new HttpError(404, "Conversation not found");
  }

  // Persist user message
  const userMsgId = uuid();
  await db.messages.create(env, {
    id: userMsgId,
    conversation_id: convId,
    role: "user",
    content: body.message,
  });

  // Build context
  const history = await db.messages.listByConversation(env, convId);
  const contextLine = body.context
    ? `Contexte : prénom=${body.context.full_name ?? "?"}, semaine de grossesse=${body.context.week ?? "?"}.`
    : "";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + (contextLine ? `\n${contextLine}` : "") },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const upstream = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, messages, temperature: 0.7 }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    throw new HttpError(502, `OpenAI error: ${upstream.status} ${text.slice(0, 200)}`);
  }

  const data = await upstream.json<{ choices?: { message?: { content?: string } }[] }>();
  const reply = data.choices?.[0]?.message?.content?.trim() || "Désolée, je n'ai pas pu répondre.";

  const assistantId = uuid();
  await db.messages.create(env, {
    id: assistantId,
    conversation_id: convId,
    role: "assistant",
    content: reply,
  });
  await db.conversations.touch(env, convId);

  return json({
    conversation_id: convId,
    user_message: { id: userMsgId, role: "user", content: body.message },
    reply: { id: assistantId, role: "assistant", content: reply },
  });
}