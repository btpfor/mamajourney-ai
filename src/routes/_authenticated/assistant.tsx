import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPregnancyState } from "@/lib/pregnancy";

const SUGGESTIONS = [
  "Puis-je manger des sushis ?",
  "Est-ce normal d'avoir mal au dos ?",
  "Pourquoi mon bébé bouge moins ?",
  "Quels aliments éviter au 2e trimestre ?",
];

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "Assistant IA — MamaCare AI" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const ctx = useMemo(() => {
    if (!profile.data?.lmp_date) return {};
    const s = getPregnancyState(new Date(profile.data.lmp_date));
    return { week: s.week, name: profile.data.full_name ?? undefined };
  }, [profile.data]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", body: { context: ctx } }),
  });
  const [input, setInput] = useState("");
  const isLoading = status === "submitted" || status === "streaming";

  const send = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold">Assistant IA</h1>
          <p className="text-xs text-muted-foreground">Bienveillant — ne remplace pas un avis médical.</p>
        </div>
      </header>

      <section className="space-y-3">
        {messages.length === 0 && (
          <div className="rounded-3xl gradient-hero p-5 shadow-card">
            <p className="font-display text-base font-semibold">Bonjour ❤️ comment puis-je vous aider ?</p>
            <p className="mt-1 text-sm text-foreground/70">Posez votre question ou choisissez une suggestion.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
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
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-card ${
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
            }`}>
              {m.parts.map((p, i) => p.type === "text" ? <span key={i}>{p.text}</span> : null)}
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
      </section>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="fixed inset-x-0 bottom-[72px] z-20 mx-auto max-w-2xl px-4 pb-2"
      >
        <div className="flex items-center gap-2 rounded-full bg-card p-1.5 shadow-card">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="border-0 bg-transparent focus-visible:ring-0"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-9 w-9 rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
