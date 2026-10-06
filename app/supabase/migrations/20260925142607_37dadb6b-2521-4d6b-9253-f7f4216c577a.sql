ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS receiver_id uuid, ADD COLUMN IF NOT EXISTS photo_path text;

CREATE OR REPLACE FUNCTION public.fill_message_receiver()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receiver_id IS NULL THEN
    IF NEW.sender_id = NEW.client_id THEN
      SELECT user_id INTO NEW.receiver_id FROM public.user_roles WHERE role = 'specialist' ORDER BY created_at LIMIT 1;
    ELSE
      NEW.receiver_id := NEW.client_id;
    END IF;
  END IF;
  IF NEW.photo_path IS NOT NULL AND split_part(NEW.photo_path, '/', 1) <> NEW.client_id::text THEN
    RAISE EXCEPTION 'Invalid photo path';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.fill_message_receiver() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER messages_fill_receiver BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.fill_message_receiver();

CREATE POLICY "Client sends own messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid() AND sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_message_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'specialist') THEN
    IF NEW.body IS DISTINCT FROM OLD.body OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR NEW.photo_path IS DISTINCT FROM OLD.photo_path THEN
      RAISE EXCEPTION 'Only read status can be changed';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;