CREATE TABLE public.library_products (
  id text PRIMARY KEY,
  brand text NOT NULL DEFAULT '',
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  subcategory text NOT NULL DEFAULT '',
  directions text[] NOT NULL DEFAULT '{}',
  photo_url text,
  description text NOT NULL DEFAULT '',
  key_ingredients text NOT NULL DEFAULT '',
  inci text NOT NULL DEFAULT '',
  usage_rules text NOT NULL DEFAULT '',
  specialist_notes text NOT NULL DEFAULT '',
  has_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.library_products TO anon, authenticated;
GRANT ALL ON public.library_products TO service_role;
ALTER TABLE public.library_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo library read" ON public.library_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Demo library insert" ON public.library_products FOR INSERT TO anon, authenticated WITH CHECK (length(name) > 0);
CREATE POLICY "Demo library update" ON public.library_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (length(name) > 0);
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER library_products_touch BEFORE UPDATE ON public.library_products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX library_products_brand_name_idx ON public.library_products (lower(brand), lower(name));