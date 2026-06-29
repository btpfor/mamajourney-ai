import type { Env, AuthContext } from "../env";
import { db } from "../database";
import { json } from "../http";

function weeksSince(dateIso: string): number {
  const start = new Date(dateIso).getTime();
  const diff = Date.now() - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
}

export async function get(_req: Request, env: Env, ctx: AuthContext): Promise<Response> {
  const [user, pregnancy, upcoming, unread] = await Promise.all([
    db.users.findById(env, ctx.userId),
    db.pregnancies.findActive(env, ctx.userId),
    db.appointments.countUpcoming(env, ctx.userId),
    db.notifications.countUnread(env, ctx.userId),
  ]);

  let week: number | null = null;
  if (pregnancy?.lmp_date) week = weeksSince(pregnancy.lmp_date);

  return json({
    user: user ? { id: user.id, full_name: user.full_name, locale: user.locale } : null,
    pregnancy,
    currentWeek: week,
    upcomingAppointments: upcoming,
    unreadNotifications: unread,
  });
}