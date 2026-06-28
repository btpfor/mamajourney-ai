import { createFileRoute } from "@tanstack/react-router";

const WEEKLY_TEXT: Record<string, { title: (w: number) => string; body: string }> = {
  fr: { title: (w) => `Semaine ${w} commence`, body: "Découvrez l'évolution de votre bébé cette semaine." },
  en: { title: (w) => `Week ${w} starts`, body: "Discover how your baby is growing this week." },
  wo: { title: (w) => `Ayubés ${w} tàmbalee na`, body: "Xool nu sa liir di màgg ci ayubés bii." },
};

export const Route = createFileRoute("/api/public/hooks/weekly-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();

        // Profiles that have a LMP date
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id,lmp_date,locale,last_weekly_notified_week")
          .not("lmp_date", "is", null);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let scheduled = 0;
        for (const p of profiles ?? []) {
          // Check user prefs
          const { data: pref } = await supabaseAdmin
            .from("notification_preferences")
            .select("weekly_enabled")
            .eq("user_id", p.id)
            .maybeSingle();
          if (pref && pref.weekly_enabled === false) continue;

          const lmp = new Date(p.lmp_date as string);
          const days = Math.floor((now.getTime() - lmp.getTime()) / 86_400_000);
          const week = Math.max(1, Math.min(40, Math.floor(days / 7) + 1));
          if (p.last_weekly_notified_week === week) continue;

          const lang = (p.locale as string) || "fr";
          const tr = WEEKLY_TEXT[lang] ?? WEEKLY_TEXT.fr;

          await supabaseAdmin.from("notifications").insert({
            user_id: p.id,
            type: "weekly",
            title: tr.title(week),
            body: tr.body,
            link: `/weeks/${week}`,
            scheduled_at: now.toISOString(),
          });
          await supabaseAdmin
            .from("profiles")
            .update({ last_weekly_notified_week: week })
            .eq("id", p.id);
          scheduled++;
        }

        return Response.json({ ok: true, scheduled });
      },
    },
  },
});