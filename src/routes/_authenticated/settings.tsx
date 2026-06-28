import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Bell, Smartphone, Mail, MonitorSmartphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { subscribePush, unsubscribePush, currentPushStatus, isPushSupported } from "@/lib/push";

type Prefs = {
  user_id: string;
  channel_inapp: boolean;
  channel_push: boolean;
  weekly_enabled: boolean;
  weekly_day: number;
  weekly_hour_utc: number;
  reminder_offsets_minutes: number[];
};

const DEFAULT_PREFS: Omit<Prefs, "user_id"> = {
  channel_inapp: true,
  channel_push: true,
  weekly_enabled: true,
  weekly_day: 1,
  weekly_hour_utc: 9,
  reminder_offsets_minutes: [10080, 1440, 120],
};

const OFFSET_OPTIONS = [
  { value: 60, key: "h1" },
  { value: 120, key: "h2" },
  { value: 360, key: "h6" },
  { value: 1440, key: "d1" },
  { value: 2880, key: "d2" },
  { value: 10080, key: "d7" },
] as const;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Réglages — MamaCare AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [pushStatus, setPushStatus] = useState<string>("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    currentPushStatus().then(setPushStatus);
  }, []);

  const prefs = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: async (): Promise<Prefs> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("not signed in");
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return (data as Prefs) ?? { user_id: u.user.id, ...DEFAULT_PREFS };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      const current = prefs.data ?? ({ ...DEFAULT_PREFS } as Prefs);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("not signed in");
      const payload: Prefs = { ...current, ...patch, user_id: u.user.id };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.save"));
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePushToggle = async (on: boolean) => {
    setPushBusy(true);
    if (on) {
      const r = await subscribePush();
      if (!r.ok) toast.error(r.reason ?? "error");
      else toast.success(t("settings.pushEnabled"));
      setPushStatus(await currentPushStatus());
      save.mutate({ channel_push: r.ok });
    } else {
      await unsubscribePush();
      save.mutate({ channel_push: false });
      setPushStatus(await currentPushStatus());
    }
    setPushBusy(false);
  };

  const toggleOffset = (val: number) => {
    const current = prefs.data?.reminder_offsets_minutes ?? [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val].sort((a, b) => b - a);
    save.mutate({ reminder_offsets_minutes: next });
  };

  const p = prefs.data ?? ({ ...DEFAULT_PREFS } as Prefs);
  const selectedOffsets = new Set(p.reminder_offsets_minutes);

  return (
    <AppShell>
      <div className="mb-4 flex items-center gap-3">
        <Link
          to="/profile"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-card shadow-card"
          aria-label="back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-2xl font-semibold">{t("settings.title")}</h1>
      </div>

      <section className="rounded-3xl bg-card p-5 shadow-card">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("settings.channels")}
        </h2>
        <div className="mt-3 space-y-3">
          <ChannelRow
            icon={<MonitorSmartphone className="h-4 w-4" />}
            label={t("settings.channelInApp")}
            desc={t("settings.channelInAppDesc")}
            checked={p.channel_inapp}
            onChange={(v) => save.mutate({ channel_inapp: v })}
          />
          <ChannelRow
            icon={<Smartphone className="h-4 w-4" />}
            label={t("settings.channelPush")}
            desc={
              !isPushSupported()
                ? t("settings.pushUnsupported")
                : pushStatus === "denied"
                ? t("settings.pushDenied")
                : t("settings.channelPushDesc")
            }
            checked={p.channel_push && pushStatus === "granted"}
            disabled={!isPushSupported() || pushStatus === "denied" || pushBusy}
            onChange={handlePushToggle}
            extra={pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          />
          <ChannelRow
            icon={<Mail className="h-4 w-4" />}
            label={t("settings.channelEmail")}
            desc={t("settings.channelEmailSoon")}
            checked={false}
            disabled
            onChange={() => {}}
          />
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("settings.appointmentReminders")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("settings.offsetsHelp")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {OFFSET_OPTIONS.map((o) => {
            const active = selectedOffsets.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleOffset(o.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:bg-accent"
                }`}
              >
                {t(`settings.offsets.${o.key}`)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-3xl bg-card p-5 shadow-card">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("settings.weekly")}
        </h2>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <Label className="text-sm font-medium">{t("settings.weeklyEnabled")}</Label>
            <p className="text-xs text-muted-foreground">{t("settings.weeklyHelp")}</p>
          </div>
          <Switch checked={p.weekly_enabled} onCheckedChange={(v) => save.mutate({ weekly_enabled: v })} />
        </div>
        {p.weekly_enabled && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{t("settings.weeklyDay")}</Label>
              <Select
                value={String(p.weekly_day)}
                onValueChange={(v) => save.mutate({ weekly_day: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <SelectItem key={d} value={String(d)}>{t(`settings.days.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("settings.weeklyHour")}</Label>
              <Select
                value={String(p.weekly_hour_utc)}
                onValueChange={(v) => save.mutate({ weekly_hour_utc: Number(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}h UTC</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Bell className="h-3 w-3" /> {t("settings.footnote")}
      </p>
    </AppShell>
  );
}

function ChannelRow({
  icon,
  label,
  desc,
  checked,
  onChange,
  disabled,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background/50 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-card">{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {extra}
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}