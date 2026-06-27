import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, CalendarDays, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — MamaCare AI" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const notifs = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  // Auto-mark as read on visit (after small delay so user sees the badge)
  useEffect(() => {
    const id = setTimeout(() => {
      if (notifs.data?.some((n) => !n.read_at)) markAll.mutate();
    }, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs.data]);

  return (
    <AppShell>
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blush">
            <Bell className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold">{t("notifications.title")}</h1>
        </div>
        {(notifs.data?.length ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="mr-1 h-4 w-4" /> {t("notifications.markAllRead")}
          </Button>
        )}
      </header>

      <div className="space-y-2">
        {notifs.data?.length === 0 && (
          <div className="rounded-3xl bg-card p-8 text-center shadow-card">
            <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
          </div>
        )}
        {notifs.data?.map((n) => {
          const Icon = n.type === "appointment" ? CalendarDays : Sparkles;
          return (
            <a
              key={n.id}
              href={n.link ?? "/dashboard"}
              className={`flex items-start gap-3 rounded-2xl p-4 shadow-card transition ${
                n.read_at ? "bg-card" : "bg-blush/50"
              }`}
            >
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/70">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {format(new Date(n.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-primary" />}
            </a>
          );
        })}
      </div>
    </AppShell>
  );
}