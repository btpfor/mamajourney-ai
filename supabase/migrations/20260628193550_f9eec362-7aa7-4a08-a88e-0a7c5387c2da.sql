
-- 1. Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own push subs" ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Notification preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_inapp boolean NOT NULL DEFAULT true,
  channel_push boolean NOT NULL DEFAULT true,
  weekly_enabled boolean NOT NULL DEFAULT true,
  weekly_day smallint NOT NULL DEFAULT 1, -- 0=Sun..6=Sat (1=Mon)
  weekly_hour_utc smallint NOT NULL DEFAULT 9,
  reminder_offsets_minutes int[] NOT NULL DEFAULT ARRAY[10080, 1440, 120], -- 7d, 1d, 2h
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs" ON public.notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_notif_prefs BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Add scheduled_at / delivered_at to notifications
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_scheduled_idx
  ON public.notifications (scheduled_at) WHERE scheduled_at IS NOT NULL AND delivered_at IS NULL;

-- 4. Replace appointment reminder trigger with multi-offset version
CREATE OR REPLACE FUNCTION public.create_appointment_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offs int[];
  off int;
  reminder_at timestamptz;
BEGIN
  -- Clean existing future reminders for this appointment (UPDATE case)
  DELETE FROM public.notifications
   WHERE appointment_id = NEW.id AND delivered_at IS NULL;

  SELECT reminder_offsets_minutes INTO offs
    FROM public.notification_preferences WHERE user_id = NEW.user_id;
  IF offs IS NULL THEN
    offs := ARRAY[10080, 1440, 120];
  END IF;

  FOREACH off IN ARRAY offs LOOP
    reminder_at := NEW.appointment_date - make_interval(mins => off);
    IF reminder_at > now() THEN
      INSERT INTO public.notifications (user_id, type, title, body, link, scheduled_at, appointment_id)
      VALUES (
        NEW.user_id,
        'appointment',
        'Rendez-vous : ' || NEW.title,
        'Prévu le ' || to_char(NEW.appointment_date AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI'),
        '/calendar',
        reminder_at,
        NEW.id
      );
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS appointments_create_reminder ON public.appointments;
CREATE TRIGGER appointments_create_reminder
  AFTER INSERT OR UPDATE OF appointment_date ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.create_appointment_reminder();

REVOKE EXECUTE ON FUNCTION public.create_appointment_reminder() FROM PUBLIC, anon, authenticated;
