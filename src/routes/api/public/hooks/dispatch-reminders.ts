import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/dispatch-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const webpush = (await import("web-push")).default;
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || "mailto:contact@mamacare.app",
          process.env.VAPID_PUBLIC_KEY!,
          process.env.VAPID_PRIVATE_KEY!,
        );

        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("notifications")
          .select("id,user_id,title,body,link,scheduled_at")
          .lte("scheduled_at", nowIso)
          .is("delivered_at", null)
          .limit(200);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        let pushSent = 0;
        for (const n of due ?? []) {
          const { data: pref } = await supabaseAdmin
            .from("notification_preferences")
            .select("channel_push,channel_inapp")
            .eq("user_id", n.user_id)
            .maybeSingle();
          const wantsPush = pref ? pref.channel_push : true;

          if (wantsPush) {
            const { data: subs } = await supabaseAdmin
              .from("push_subscriptions")
              .select("id,endpoint,p256dh,auth")
              .eq("user_id", n.user_id);
            for (const s of subs ?? []) {
              try {
                await webpush.sendNotification(
                  { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                  JSON.stringify({ title: n.title, body: n.body, url: n.link || "/dashboard", tag: n.id }),
                );
                pushSent++;
              } catch (e: unknown) {
                const err = e as { statusCode?: number };
                if (err.statusCode === 404 || err.statusCode === 410) {
                  await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
                }
              }
            }
          }

          await supabaseAdmin
            .from("notifications")
            .update({ delivered_at: nowIso, push_sent_at: wantsPush ? nowIso : null })
            .eq("id", n.id);
        }

        return Response.json({ ok: true, processed: due?.length ?? 0, pushSent });
      },
    },
  },
});