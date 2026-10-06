CREATE OR REPLACE FUNCTION public.on_journal_notify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nm text; e jsonb; old_ids text[]; old_photo text[]; k text; v text; pn text;
BEGIN
  nm := public.client_name(NEW.client_id);
  old_ids := CASE WHEN TG_OP = 'UPDATE' THEN ARRAY(SELECT x->>'id' FROM jsonb_array_elements(coalesce(OLD.data->'diary','[]')) x) ELSE '{}' END;
  old_photo := CASE WHEN TG_OP = 'UPDATE' THEN ARRAY(SELECT x->>'id' FROM jsonb_array_elements(coalesce(OLD.data->'photos','[]')) x) ELSE '{}' END;
  FOR e IN SELECT x FROM jsonb_array_elements(coalesce(NEW.data->'diary','[]')) x LOOP
    IF NOT (e->>'id' = ANY(old_ids)) THEN
      PERFORM public.notify_specialists('diary', nm || CASE WHEN e->>'path' IS NOT NULL THEN ' добавила запись в дневник с фото' ELSE ' добавила запись в дневник' END,
        coalesce(e->>'text',''), 'diary', e->>'id', NEW.client_id, 'diary');
    END IF;
  END LOOP;
  FOR e IN SELECT x FROM jsonb_array_elements(coalesce(NEW.data->'photos','[]')) x LOOP
    IF NOT (e->>'id' = ANY(old_photo)) THEN
      PERFORM public.notify_specialists('photo', nm || ' загрузила новое фото', coalesce(e->>'note', e->>'label', ''), 'photo', e->>'id', NEW.client_id, 'photos');
    END IF;
  END LOOP;
  FOR k, v IN SELECT key, value #>> '{}' FROM jsonb_each(coalesce(NEW.data->'choices','{}'::jsonb)) LOOP
    IF TG_OP = 'INSERT' OR (OLD.data->'choices'->>k) IS DISTINCT FROM v THEN
      SELECT trim(brand || ' ' || name) INTO pn FROM public.library_products WHERE id = v;
      PERFORM public.notify_specialists('plan', nm || ' выбрала альтернативное средство', coalesce(pn, 'Средство из разрешённых альтернатив'), 'plan', k, NEW.client_id, 'diary');
    END IF;
  END LOOP;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.on_journal_notify() FROM PUBLIC, anon, authenticated;