CREATE TABLE public.dispatch_tokens (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.dispatch_tokens TO service_role;
ALTER TABLE public.dispatch_tokens ENABLE ROW LEVEL SECURITY;
INSERT INTO public.dispatch_tokens (id) VALUES (1);