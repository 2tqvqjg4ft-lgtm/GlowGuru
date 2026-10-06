CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own tokens read" ON public.push_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own tokens insert" ON public.push_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own tokens delete" ON public.push_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own settings read" ON public.notification_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own settings insert" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own settings update" ON public.notification_settings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.scheduled_pushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  kind text NOT NULL,
  send_at timestamptz NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz,
  UNIQUE (user_id, key)
);
CREATE INDEX scheduled_pushes_due ON public.scheduled_pushes (send_at) WHERE sent_at IS NULL;
GRANT SELECT, INSERT, DELETE ON public.scheduled_pushes TO authenticated;
GRANT ALL ON public.scheduled_pushes TO service_role;
ALTER TABLE public.scheduled_pushes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own pushes read" ON public.scheduled_pushes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own pushes insert" ON public.scheduled_pushes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND sent_at IS NULL);
CREATE POLICY "Own pending pushes delete" ON public.scheduled_pushes FOR DELETE TO authenticated USING (user_id = auth.uid() AND sent_at IS NULL);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages read" ON public.messages FOR SELECT TO authenticated USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Specialist sends" ON public.messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'specialist') AND sender_id = auth.uid());
CREATE POLICY "Client marks read" ON public.messages FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;