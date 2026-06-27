import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Sparkles, Plus, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/assistant/")({
  head: () => ({ meta: [{ title: "Assistant IA — MamaCare AI" }] }),
  component: AssistantListPage,
});

function AssistantListPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const nav = useNavigate();

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("auth");
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: u.user.id, title: t("assistant.untitled") })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      nav({ to: "/assistant/$threadId", params: { threadId: c.id } });
    },
    onError: () => toast.error("Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  return (
    <AppShell>
      <header className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold">{t("assistant.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("assistant.subtitle")}</p>
        </div>
      </header>

      <Button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="w-full rounded-full"
      >
        <Plus className="mr-1 h-4 w-4" /> {t("assistant.newConversation")}
      </Button>

      <section className="mt-6">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("assistant.yourConversations")}
        </h2>
        <div className="mt-3 space-y-2">
          {conversations.data?.length === 0 && (
            <div className="rounded-3xl bg-card p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">{t("assistant.noConversations")}</p>
            </div>
          )}
          {conversations.data?.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-card p-3 shadow-card">
              <Link
                to="/assistant/$threadId"
                params={{ threadId: c.id }}
                className="flex flex-1 items-center gap-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-lavender/60">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.updated_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={t("assistant.deleteConversation")}
                onClick={() => {
                  if (confirm(t("assistant.confirmDelete"))) remove.mutate(c.id);
                }}
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}