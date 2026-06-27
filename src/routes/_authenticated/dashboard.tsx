import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Baby, Calendar as CalIcon, BookHeart, Sparkles, Apple, Activity, ChevronRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { NotificationsBell } from "@/components/NotificationsBell";
import { getPregnancyState, weekInfo, formatSize, formatWeight } from "@/lib/pregnancy";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — MamaCare AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [isLoading, profile, navigate]);

  // Sync locale from profile
  useEffect(() => {
    if (profile?.locale && profile.locale !== i18n.language) {
      i18n.changeLanguage(profile.locale);
    }
  }, [profile?.locale, i18n]);

  // Generate weekly notification if the week advanced
  useEffect(() => {
    (async () => {
      if (!profile?.lmp_date) return;
      const s = getPregnancyState(new Date(profile.lmp_date));
      const lastNotified = (profile as { last_weekly_notified_week?: number | null })
        .last_weekly_notified_week;
      if (lastNotified === s.week) return;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("notifications").insert({
        user_id: u.user.id,
        type: "weekly",
        title: t("notifications.weeklyTitle", { week: s.week }),
        body: t("notifications.weeklyBody"),
        link: `/weeks/${s.week}`,
      });
      await supabase
        .from("profiles")
        .update({ last_weekly_notified_week: s.week })
        .eq("id", u.user.id);
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    })();
  }, [profile?.lmp_date, profile, t, qc]);

  if (isLoading || !profile) {
    return <AppShell><div className="h-40 animate-pulse rounded-3xl bg-muted" /></AppShell>;
  }
  if (!profile.lmp_date) return <AppShell><div /></AppShell>;

  const state = getPregnancyState(new Date(profile.lmp_date));
  const wk = weekInfo(state.week);
  const pct = Math.round(state.progress * 100);
  const circ = 2 * Math.PI * 56;
  const offset = circ * (1 - state.progress);

  return (
    <AppShell>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("dashboard.hello")} {profile.full_name ?? ""}</p>
          <h1 className="font-display text-2xl font-semibold">{t("dashboard.welcome")} ❤️</h1>
        </div>
        <NotificationsBell />
      </header>

      {/* Hero progress */}
      <section className="relative overflow-hidden rounded-3xl gradient-hero p-6 shadow-card">
        <div className="flex items-center gap-5">
          <div className="relative">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
              <circle cx="70" cy="70" r="56" stroke="white" strokeOpacity="0.45" strokeWidth="10" fill="none" />
              <circle
                cx="70" cy="70" r="56"
                stroke="var(--color-primary)" strokeWidth="10" fill="none" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: "stroke-dashoffset 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-3xl font-semibold">{pct}%</span>
              <span className="text-xs text-foreground/70">{state.week} sem</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-foreground/60">{state.saLabel}</p>
            <p className="mt-1 font-display text-xl font-semibold leading-tight">
              {state.daysRemaining} {t("dashboard.daysBeforeBaby")}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/65 px-3 py-1 text-xs font-semibold backdrop-blur">
              <CalIcon className="h-3 w-3" /> {state.formattedDue}
            </p>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat label={t("dashboard.weeks")} value={`${state.week}/40`} />
        <Stat label={t("dashboard.months")} value={`${state.month}/9`} />
        <Stat label={t("dashboard.trimester")} value={`${state.trimester}/3`} />
      </section>

      {/* Baby card */}
      <Link to="/weeks/$week" params={{ week: String(state.week) }} className="mt-4 block">
        <section className="rounded-3xl gradient-baby p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Baby className="h-3 w-3" /> {t("dashboard.babyThisWeek")}
            </span>
            <ChevronRight className="h-4 w-4 text-foreground/60" />
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-6xl">{wk.fruitEmoji}</div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t("dashboard.babyIsSizeOf")}</p>
              <p className="font-display text-xl font-semibold capitalize">{wk.fruit}</p>
              <div className="mt-2 flex gap-3 text-xs text-foreground/70">
                <span>📏 {formatSize(wk.sizeMm)}</span>
                <span>⚖️ {formatWeight(wk.weightG)}</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-foreground/80">{wk.highlights[0]}</p>
        </section>
      </Link>

      {/* Feature tiles */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <Tile to="/journal" label={t("nav.journal")} icon={BookHeart} color="bg-blush" desc={t("dashboard.journalDesc")} />
        <Tile to="/calendar" label={t("nav.calendar")} icon={CalIcon} color="bg-sky" desc={t("dashboard.calendarDesc")} />
        <Tile to="/assistant" label={t("assistant.title")} icon={Sparkles} color="bg-lavender" desc={t("dashboard.assistantDesc")} />
        <Tile to="/weeks" label={t("dashboard.weekByWeek")} icon={Activity} color="bg-mint" desc={t("dashboard.weekByWeekDesc")} />
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-mint">
            <Apple className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold">{t("dashboard.tipOfDay")}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{wk.tips[0]}</p>
          </div>
        </div>
      </section>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Clock className="h-3 w-3" /> Calcul basé sur la date des dernières règles
      </p>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card p-3 text-center shadow-card">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}

function Tile({ to, label, icon: Icon, color, desc }: { to: any; label: string; icon: any; color: string; desc: string }) {
  return (
    <Link to={to} className={`rounded-3xl ${color} p-4 shadow-card transition hover:scale-[1.02]`}>
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 backdrop-blur">
        <Icon className="h-5 w-5 text-foreground/80" />
      </div>
      <p className="mt-3 font-display text-base font-semibold">{label}</p>
      <p className="text-xs text-foreground/70">{desc}</p>
    </Link>
  );
}
