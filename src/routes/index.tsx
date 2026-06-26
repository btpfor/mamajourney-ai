import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, Sparkles, Calendar as CalIcon, MessageCircle } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MamaCare AI — Suivi de grossesse bienveillant" },
      { name: "description", content: "Suivez chaque semaine de votre grossesse avec MamaCare AI : développement du bébé, journal, calendrier, et assistant IA." },
      { property: "og:title", content: "MamaCare AI" },
      { property: "og:description", content: "Votre compagnon de grossesse, semaine après semaine." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 backdrop-blur shadow-soft">
              <Heart className="h-5 w-5 fill-primary text-primary" />
            </div>
            <span className="font-display text-xl font-semibold">MamaCare</span>
          </div>
          <Link
            to="/auth"
            className="rounded-full bg-white/80 px-5 py-2 text-sm font-semibold backdrop-blur shadow-soft hover:bg-white transition"
          >
            Connexion
          </Link>
        </header>

        <main className="mt-12 grid items-center gap-12 md:mt-20 md:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Nouveau · Assistant IA intégré
            </span>
            <h1 className="text-5xl font-semibold leading-tight md:text-6xl">
              Votre grossesse,<br />
              <span className="text-primary">accompagnée chaque jour</span>
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Suivez l'évolution de votre bébé semaine après semaine, tenez votre journal,
              gérez vos rendez-vous et posez vos questions à l'IA. Tout en un seul endroit.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/auth" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 transition">
                Commencer gratuitement
              </Link>
              <Link to="/auth" className="rounded-full border border-foreground/10 bg-white/60 px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-white transition">
                J'ai déjà un compte
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Heart, label: "Suivi 1 → 40 SA", color: "bg-blush" },
              { icon: Sparkles, label: "Assistant IA", color: "bg-lavender" },
              { icon: CalIcon, label: "Rendez-vous", color: "bg-sky" },
              { icon: MessageCircle, label: "Journal & symptômes", color: "bg-mint" },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`rounded-3xl ${color} p-6 shadow-card animate-fade-in`}>
                <Icon className="h-7 w-7 text-foreground/70" />
                <p className="mt-4 font-display text-lg font-semibold leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </main>

        <footer className="mt-16 pb-8 text-center text-xs text-muted-foreground">
          MamaCare AI ne remplace pas l'avis d'un professionnel de santé.
        </footer>
      </div>
    </div>
  );
}
