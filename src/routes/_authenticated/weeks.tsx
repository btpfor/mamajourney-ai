import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { WEEKS } from "@/lib/pregnancy";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/weeks")({
  head: () => ({ meta: [{ title: "Semaine par semaine — MamaCare AI" }] }),
  component: WeeksLayout,
});

function WeeksLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/weeks") return <Outlet />;
  return (
    <AppShell>
      <h1 className="font-display text-2xl font-semibold">Semaine par semaine</h1>
      <p className="mt-1 text-sm text-muted-foreground">Explorez l'évolution du bébé de la semaine 1 à 40.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {WEEKS.map((w) => (
          <Link
            key={w.week}
            to="/weeks/$week"
            params={{ week: String(w.week) }}
            className="rounded-3xl bg-card p-4 shadow-card transition hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{w.fruitEmoji}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                S{w.week}
              </span>
            </div>
            <p className="mt-3 font-display text-sm font-semibold capitalize leading-tight">{w.fruit}</p>
            <p className="text-[11px] text-muted-foreground">
              {w.sizeMm < 100 ? `${w.sizeMm} mm` : `${(w.sizeMm / 10).toFixed(1)} cm`}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
