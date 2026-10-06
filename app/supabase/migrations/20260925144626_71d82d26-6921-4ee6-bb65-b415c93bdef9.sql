CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity_type text,
  entity_id text,
  client_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own notifications mark read" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_notification_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Only read status can be changed';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notifications_guard_update BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_notification_update();

ALTER TABLE public.scheduled_pushes ADD COLUMN IF NOT EXISTS path text;

-- Создаёт уведомление и (если не отключено в настройках) ставит push в очередь
CREATE OR REPLACE FUNCTION public.notify_user(_user uuid, _type text, _title text, _body text, _etype text, _eid text, _client uuid, _setting text, _path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid uuid; s jsonb;
BEGIN
  IF _user IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, client_id)
  VALUES (_user, _type, _title, left(coalesce(_body,''), 300), _etype, _eid, _client) RETURNING id INTO nid;
  SELECT settings INTO s FROM public.notification_settings WHERE user_id = _user;
  IF _setting IS NULL OR coalesce(s->>_setting, 'true') <> 'false' THEN
    INSERT INTO public.scheduled_pushes (user_id, key, kind, send_at, title, body, path)
    VALUES (_user, 'n:' || nid, 'event', now(), _title, left(coalesce(_body,''), 180), _path)
    ON CONFLICT DO NOTHING;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.notify_user(uuid,text,text,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.client_name(_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(nullif(full_name,''), 'Клиентка') FROM public.profiles WHERE id = _id
$$;
REVOKE ALL ON FUNCTION public.client_name(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_specialists(_type text, _title text, _body text, _etype text, _eid text, _client uuid, _setting text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'specialist' LOOP
    PERFORM public.notify_user(r.user_id, _type, _title, _body, _etype, _eid, _client, _setting, '/specialist');
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.notify_specialists(text,text,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;

-- Сообщения
CREATE OR REPLACE FUNCTION public.on_message_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  IF NEW.sender_id = NEW.client_id THEN
    nm := public.client_name(NEW.client_id);
    PERFORM public.notify_specialists(CASE WHEN NEW.photo_path IS NOT NULL THEN 'chat_photo' ELSE 'message' END,
      nm || CASE WHEN NEW.photo_path IS NOT NULL THEN ' отправила фото в чат' ELSE ' отправила сообщение' END,
      NEW.body, 'chat', NEW.id::text, NEW.client_id, 'msgs');
  ELSE
    PERFORM public.notify_user(NEW.client_id, 'message', 'Анна отправила вам сообщение', NEW.body, 'chat', NEW.id::text, NEW.client_id, 'recommendations', '/client');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.on_message_notify();

-- Дневник и фото динамики
CREATE OR REPLACE FUNCTION public.on_journal_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text; e jsonb; old_ids text[]; old_photo text[];
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
  RETURN NEW;
END; $$;
CREATE TRIGGER client_journal_notify AFTER INSERT OR UPDATE ON public.client_journal FOR EACH ROW EXECUTE FUNCTION public.on_journal_notify();

-- Анкета
CREATE OR REPLACE FUNCTION public.on_questionnaire_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nm text;
BEGIN
  nm := public.client_name(NEW.client_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_specialists('questionnaire', nm || ' заполнила анкету', '', 'questionnaire', NEW.client_id::text, NEW.client_id, 'forms');
  ELSIF NEW.data IS DISTINCT FROM OLD.data THEN
    PERFORM public.notify_specialists('questionnaire', nm || ' обновила анкету', '', 'questionnaire', NEW.client_id::text, NEW.client_id, 'forms');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER questionnaires_notify AFTER INSERT OR UPDATE ON public.questionnaires FOR EACH ROW EXECUTE FUNCTION public.on_questionnaire_notify();

REVOKE ALL ON FUNCTION public.on_message_notify(), public.on_journal_notify(), public.on_questionnaire_notify() FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname = 'glowguru-push-dispatch'), schedule := '* * * * *');