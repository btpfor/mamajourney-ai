import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPregnancyState } from "@/lib/pregnancy";

export const Route = createFileRoute("/_authenticated/assistant/$threadId")({
  head: () => ({ meta: [{ title: "Conversation — MamaCare AI" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { t } = useTranslation();

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const initial = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async (): Promise<UIMessage[]> => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", threadId)
        .order("created_at", { ascending: true });
      return (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: (m.parts as UIMessage["parts"]) ?? [],
      }));
    },
  });

  const ctx = useMemo(() => {
    if (!profile.data?.lmp_date) return {};
    const s = getPregnancyState(new Date(profile.data.lmp_date));
    return { week: s.week, name: profile.data.full_name ?? undefined };
  }, [profile.data]);

  if (initial.isLoading) {
    return <AppShell><div className="h-40 animate-pulse rounded-3xl bg-muted" /></AppShell>;
  }

  return (
    <AppShell>
      <Chat threadId={threadId} initialMessages={initial.data ?? []} ctx={ctx} t={t} />
    </AppShell>
  );
}

function Chat({
  threadId,
  initialMessages,
  ctx,
  t,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  ctx: { week?: number; name?: string };
  t: (k: string) => string;
}) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { context: ctx } }),
    [ctx],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: async ({ message }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("messages").insert({
        conversation_id: threadId,
        user_id: u.user.id,
        role: "assistant",
        parts: message.parts as unknown as object,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId);
    },
  });

  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, status]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const userParts = [{ type: "text" as const, text }];
      await supabase.from("messages").insert({
        conversation_id: threadId,
        user_id: u.user.id,
        role: "user",
        parts: userParts as unknown as object,
      });
      // Auto-rename first user message → conversation title
      if (messages.length === 0) {
        await supabase
          .from("conversations")
          .update({ title: text.slice(0, 60) })
          .eq("id", threadId);
      }
    }
    sendMessage({ text });
    setInput("");
  };

  const SUGGESTIONS = [
    "Puis-je manger des sushis ?",
    "Est-ce normal d'avoir mal au dos ?",
    "Pourquoi mon bébé bouge moins ?",
    "Quels aliments éviter au 2e trimestre ?",
  ];

  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <Link
          to="/assistant"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-card shadow-card"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-lg font-semibold">{t("assistant.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("assistant.subtitle")}</p>
        </div>
      </header>

      <section className="space-y-3 pb-24">
        {messages.length === 0 && (
          <div className="rounded-3xl gradient-hero p-5 shadow-card">
            <p className="font-display text-base font-semibold">{t("assistant.greeting")}</p>
            <p className="mt-1 text-sm text-foreground/70">{t("assistant.pickPrompt")}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-card ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
              }`}
            >
              {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-3xl bg-card px-4 py-3 shadow-card">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="fixed inset-x-0 bottom-[72px] z-20 mx-auto max-w-2xl px-4 pb-2"
      >
        <div className="flex items-center gap-2 rounded-full bg-card p-1.5 shadow-card">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("assistant.placeholder")}
            className="border-0 bg-transparent focus-visible:ring-0"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-9 w-9 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}