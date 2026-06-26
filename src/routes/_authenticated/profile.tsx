import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Heart, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getPregnancyState } from "@/lib/pregnancy";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profil — MamaCare AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return { ...data, email: u.user.email };
    },
  });

  const state = profile?.lmp_date ? getPregnancyState(new Date(profile.lmp_date)) : null;

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnectée");
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold">Profil</h1>

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
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informations</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Dernières règles" v={profile?.lmp_date ? format(new Date(profile.lmp_date), "d MMM yyyy", { locale: fr }) : "—"} />
          <Row k="Date prévue" v={profile?.due_date ? format(new Date(profile.due_date), "d MMM yyyy", { locale: fr }) : "—"} />
          <Row k="Langue" v={(profile?.locale ?? "fr").toUpperCase()} />
        </dl>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">Préférences</h3>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span>Français · English · Wolof <span className="text-xs text-muted-foreground">(bientôt)</span></span>
        </div>
      </section>

      <Button onClick={signOut} variant="outline" className="mt-6 w-full rounded-full">
        <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
      </Button>
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
