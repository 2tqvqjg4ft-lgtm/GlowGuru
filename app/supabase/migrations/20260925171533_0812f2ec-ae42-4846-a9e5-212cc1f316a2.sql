CREATE TABLE public.care_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','in_review','done')),
  general_comment text NOT NULL DEFAULT '',
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.care_reviews TO authenticated;
GRANT ALL ON public.care_reviews TO service_role;
ALTER TABLE public.care_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care reviews read" ON public.care_reviews FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Client creates own review" ON public.care_reviews FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND status = 'draft');
CREATE POLICY "Care reviews update" ON public.care_reviews FOR UPDATE TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'))
  WITH CHECK (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE INDEX care_reviews_client_idx ON public.care_reviews(client_id);

CREATE TABLE public.care_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.care_reviews(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_path text NOT NULL,
  name text NOT NULL DEFAULT '',
  client_comment text NOT NULL DEFAULT '',
  decision text CHECK (decision IN ('keep','remove','replace','finish')),
  specialist_comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_items TO authenticated;
GRANT ALL ON public.care_items TO service_role;
ALTER TABLE public.care_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care items read" ON public.care_items FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR public.has_role(auth.uid(), 'specialist'));
CREATE POLICY "Client adds own items" ON public.care_items FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND decision IS NULL AND specialist_comment = ''
    AND split_part(photo_path, '/', 1) = auth.uid()::text
    AND EXISTS (SELECT 1 FROM public.care_reviews r WHERE r.id = review_id AND r.client_id = auth.uid() AND r.status IN ('draft','submitted')));
CREATE POLICY "Client deletes own open items" ON public.care_items FOR DELETE TO authenticated
  USING (client_id = auth.uid() AND EXISTS (SELECT 1 FROM public.care_reviews r WHERE r.id = review_id AND r.status IN ('draft','submitted')));
CREATE POLICY "Specialist updates items" ON public.care_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'specialist')) WITH CHECK (public.has_role(auth.uid(), 'specialist'));
CREATE INDEX care_items_review_idx ON public.care_items(review_id);

-- Клиентка может только перевести черновик в «отправлено»
CREATE OR REPLACE FUNCTION public.guard_care_review_update() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF public.has_role(auth.uid(), 'specialist') THEN
    IF NEW.status = 'done' AND OLD.status <> 'done' THEN NEW.completed_at := now(); END IF;
    RETURN NEW;
  END IF;
  IF NEW.client_id <> OLD.client_id OR NEW.general_comment <> OLD.general_comment OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NOT (OLD.status = 'draft' AND NEW.status = 'submitted') THEN
    RAISE EXCEPTION 'Недостаточно прав';
  END IF;
  NEW.submitted_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER care_reviews_guard BEFORE UPDATE ON public.care_reviews FOR EACH ROW EXECUTE FUNCTION public.guard_care_review_update();
CREATE TRIGGER care_items_touch BEFORE UPDATE ON public.care_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.on_care_review_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    SELECT count(*) INTO n FROM public.care_items WHERE review_id = NEW.id;
    PERFORM public.notify_specialists('care', public.client_name(NEW.client_id) || ' добавила ' || n || ' ' ||
      CASE WHEN n % 10 = 1 AND n % 100 <> 11 THEN 'средство' WHEN n % 10 BETWEEN 2 AND 4 AND n % 100 NOT BETWEEN 12 AND 14 THEN 'средства' ELSE 'средств' END || ' на разбор',
      '', 'care', NEW.id::text, NEW.client_id, NULL);
  ELSIF NEW.status = 'done' AND OLD.status <> 'done' THEN
    PERFORM public.notify_user(NEW.client_id, 'care', 'Разбор вашего домашнего ухода готов', left(NEW.general_comment, 200), 'care', NEW.id::text, NEW.client_id, 'recommendations', '/client');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER care_reviews_notify AFTER UPDATE ON public.care_reviews FOR EACH ROW EXECUTE FUNCTION public.on_care_review_notify();
REVOKE ALL ON FUNCTION public.on_care_review_notify() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Client deletes own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-photos' AND (storage.foldername(name))[1] = auth.uid()::text);