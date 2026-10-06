ALTER TABLE public.published_plans ADD COLUMN viewed_at timestamptz;
CREATE POLICY "Client marks plan viewed" ON public.published_plans FOR UPDATE TO authenticated USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE OR REPLACE FUNCTION public.guard_published_plan_update()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'specialist') THEN
    IF NEW.data IS DISTINCT FROM OLD.data OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.published_at IS DISTINCT FROM OLD.published_at OR NEW.published_by IS DISTINCT FROM OLD.published_by THEN
      RAISE EXCEPTION 'Only viewed status can be changed';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER published_plans_guard_update BEFORE UPDATE ON public.published_plans FOR EACH ROW EXECUTE FUNCTION public.guard_published_plan_update();