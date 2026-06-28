import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LogOut, Heart, Globe, Bell, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { getPregnancyState } from "@/lib/pregnancy";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — MamaCare AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { ...data, email: u.user.email };
    },
  });

  const setLang = useMutation({
    mutationFn: async (lng: Lang) => {
      await i18n.changeLanguage(lng);
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        await supabase.from("profiles").update({ locale: lng }).eq("id", u.user.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  const state = profile?.lmp_date ? getPregnancyState(new Date(profile.lmp_date)) : null;

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success(t("profile.signedOut"));
    navigate({ to: "/" });
  };

  const currentLang = (profile?.locale ?? i18n.language ?? "fr") as Lang;

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold">{t("profile.title")}</h1>

      <section className="mt-6 rounded-3xl gradient-hero p-6 text-center shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-white/70 backdrop-blur">
          <Heart className="h-7 w-7 fill-primary text-primary" />
        </div>
        <h2 className="mt-3 font-display text-xl font-semibold">{profile?.full_name ?? "Future maman"}</h2>
        <p className="text-xs text-foreground/70">{profile?.email}</p>
        {state && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-xs font-semibold">
            {state.saLabel} · prévue le {format(state.dueDate, "d MMM yyyy", { locale: fr })}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profile.info")}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k={t("profile.lmp")} v={profile?.lmp_date ? format(new Date(profile.lmp_date), "d MMM yyyy", { locale: fr }) : "—"} />
          <Row k={t("profile.dueDate")} v={profile?.due_date ? format(new Date(profile.due_date), "d MMM yyyy", { locale: fr }) : "—"} />
        </dl>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("profile.preferences")}</h3>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">{t("profile.language")}</span>
          <Select value={currentLang} onValueChange={(v) => setLang.mutate(v as Lang)}>
            <SelectTrigger className="w-36 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGS.map((l) => (
                <SelectItem key={l} value={l}>{t(`langs.${l}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <Button onClick={signOut} variant="outline" className="mt-6 w-full rounded-full">
        <LogOut className="mr-2 h-4 w-4" /> {t("profile.signOut")}
      </Button>

      <Link
        to="/settings"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card transition hover:bg-accent"
      >
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <span className="flex-1 text-sm font-medium">{t("profile.openSettings")}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
