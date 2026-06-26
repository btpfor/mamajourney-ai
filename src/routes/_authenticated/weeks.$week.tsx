import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Heart, AlertTriangle, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { weekInfo, formatSize, formatWeight } from "@/lib/pregnancy";

export const Route = createFileRoute("/_authenticated/weeks/$week")({
  component: WeekDetail,
});

function WeekDetail() {
  const { week } = useParams({ from: "/_authenticated/weeks/$week" });
  const n = Math.max(1, Math.min(40, Number(week) || 1));
  const w = weekInfo(n);
  const prev = n > 1 ? n - 1 : null;
  const next = n < 40 ? n + 1 : null;

  return (
    <AppShell>
      <Link to="/weeks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Toutes les semaines
      </Link>

      <section className="mt-4 rounded-3xl gradient-baby p-6 shadow-card text-center">
        <div className="text-7xl">{w.fruitEmoji}</div>
        <p className="mt-2 text-xs uppercase tracking-wider text-foreground/60">Semaine {n}</p>
        <h1 className="font-display text-3xl font-semibold capitalize">Bébé est un(e) {w.fruit}</h1>
        <div className="mt-3 flex justify-center gap-4 text-sm text-foreground/80">
          <span>📏 {formatSize(w.sizeMm)}</span>
          <span>⚖️ {formatWeight(w.weightG)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-primary">
          <Heart className="h-4 w-4 fill-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Développement</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {w.highlights.map((h, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/85">
              <span className="text-primary">•</span> {h}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-mint p-5 shadow-card">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <h2 className="font-display text-lg font-semibold">Conseils</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {w.tips.map((t, i) => <li key={i} className="text-sm text-foreground/85">✨ {t}</li>)}
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-blush p-5 shadow-card">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <h2 className="font-display text-lg font-semibold">À éviter</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {w.avoid.map((a, i) => <li key={i} className="text-sm text-foreground/85">⚠️ {a}</li>)}
        </ul>
      </section>

      <nav className="mt-6 flex items-center justify-between">
        {prev ? (
          <Link to="/weeks/$week" params={{ week: String(prev) }} className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-card">
            <ChevronLeft className="h-4 w-4" /> S{prev}
          </Link>
        ) : <span />}
        {next ? (
          <Link to="/weeks/$week" params={{ week: String(next) }} className="inline-flex items-center gap-1 rounded-full bg-card px-4 py-2 text-sm font-semibold shadow-card">
            S{next} <ChevronRight className="h-4 w-4" />
          </Link>
        ) : <span />}
      </nav>
    </AppShell>
  );
}
