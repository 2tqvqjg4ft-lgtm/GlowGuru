
-- Personal care reminders only for clients, never for specialists
CREATE OR REPLACE FUNCTION public.guard_scheduled_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.kind <> 'event' AND public.has_role(NEW.user_id, 'specialist') THEN
    RETURN NULL; -- silently skip
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS scheduled_pushes_guard ON public.scheduled_pushes;
CREATE TRIGGER scheduled_pushes_guard BEFORE INSERT ON public.scheduled_pushes FOR EACH ROW EXECUTE FUNCTION public.guard_scheduled_push();

CREATE OR REPLACE FUNCTION public.guard_reminder_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.type IN ('reminder','photo_reminder') AND public.has_role(NEW.user_id, 'specialist') THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS notifications_guard_reminder ON public.notifications;
CREATE TRIGGER notifications_guard_reminder BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_reminder_notification();

-- Specialist events: client opened plan
CREATE OR REPLACE FUNCTION public.on_plan_viewed_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.viewed_at IS NOT NULL AND OLD.viewed_at IS NULL THEN
    PERFORM public.notify_specialists('plan_viewed', public.client_name(NEW.client_id) || ' открыла новую схему ухода', '', 'plan', NEW.client_id::text, NEW.client_id, NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS published_plans_viewed_notify ON public.published_plans;
CREATE TRIGGER published_plans_viewed_notify AFTER UPDATE ON public.published_plans FOR EACH ROW EXECUTE FUNCTION public.on_plan_viewed_notify();

-- Specialist events: new client registered
CREATE OR REPLACE FUNCTION public.on_client_registered_notify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.role = 'client' THEN
    PERFORM public.notify_specialists('registered', 'Новая клиентка зарегистрировалась', '', 'client', NEW.user_id::text, NEW.user_id, NULL);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS user_roles_registered_notify ON public.user_roles;
CREATE TRIGGER user_roles_registered_notify AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.on_client_registered_notify();

-- Cleanup misrouted history for specialists only
DELETE FROM public.notifications n WHERE n.type IN ('reminder','photo_reminder')
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = n.user_id AND r.role = 'specialist');
DELETE FROM public.scheduled_pushes p WHERE p.kind <> 'event' AND p.sent_at IS NULL
  AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.user_id AND r.role = 'specialist');
DELETE FROM public.notification_settings s
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = s.user_id AND r.role = 'specialist')
  AND false;
