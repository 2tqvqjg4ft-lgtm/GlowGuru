CREATE TABLE public.client_plans (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.client_plans TO authenticated;
GRANT ALL ON public.client_plans TO service_role;
ALTER TABLE public.client_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan readable by owner or specialist" ON public.client_plans FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Specialist creates plans" ON public.client_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Specialist updates plans" ON public.client_plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'specialist')) WITH CHECK (public.has_role(auth.uid(), 'specialist'));
CREATE TRIGGER client_plans_touch BEFORE UPDATE ON public.client_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.client_journal (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.client_journal TO authenticated;
GRANT ALL ON public.client_journal TO service_role;
ALTER TABLE public.client_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Journal readable by owner or specialist" ON public.client_journal FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Client creates own journal" ON public.client_journal FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "Client updates own journal" ON public.client_journal FOR UPDATE TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE TRIGGER client_journal_touch BEFORE UPDATE ON public.client_journal FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();