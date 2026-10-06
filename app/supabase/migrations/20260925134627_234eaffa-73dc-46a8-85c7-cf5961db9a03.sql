
CREATE TABLE public.published_plans (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.published_plans TO authenticated;
GRANT ALL ON public.published_plans TO service_role;
ALTER TABLE public.published_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published plan readable by owner or specialist" ON public.published_plans FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Specialist publishes plans" ON public.published_plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Specialist updates published plans" ON public.published_plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'specialist')) WITH CHECK (public.has_role(auth.uid(), 'specialist'));

-- Черновик схемы теперь видит только специалист
DROP POLICY IF EXISTS "Plan readable by owner or specialist" ON public.client_plans;
CREATE POLICY "Draft plan readable by specialist" ON public.client_plans FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'specialist'));

-- Уже существующие схемы, которые клиент видел раньше, считаем опубликованными
INSERT INTO public.published_plans (client_id, data, published_at)
SELECT client_id, data, updated_at FROM public.client_plans
WHERE jsonb_array_length(coalesce(data->'routine'->'am','[]'::jsonb)) + jsonb_array_length(coalesce(data->'routine'->'pm','[]'::jsonb)) > 0
ON CONFLICT DO NOTHING;

CREATE TABLE public.questionnaires (
  client_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.questionnaires TO authenticated;
GRANT ALL ON public.questionnaires TO service_role;
ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questionnaire readable by owner or specialist" ON public.questionnaires FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Client creates own questionnaire" ON public.questionnaires FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());
CREATE POLICY "Client updates own questionnaire" ON public.questionnaires FOR UPDATE TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE TRIGGER questionnaires_touch BEFORE UPDATE ON public.questionnaires FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Фото кожи: приватное хранилище, папка = ID клиента
CREATE POLICY "Client uploads own photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Owner or specialist reads photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'specialist')));
