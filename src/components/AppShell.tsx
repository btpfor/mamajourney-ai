import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookHeart, CalendarDays, Sparkles, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

const NAV = [
  { to: "/dashboard", labelKey: "nav.home", icon: Home },
  { to: "/journal", labelKey: "nav.journal", icon: BookHeart },
  { to: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/assistant", labelKey: "nav.assistant", icon: Sparkles },
  { to: "/profile", labelKey: "nav.profile", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-2xl px-4 pb-8 pt-6 md:pt-10">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center justify-around px-2 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          {NAV.map(({ to, labelKey, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-w-[60px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-2xl transition ${active ? "bg-primary/15" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {t(labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
