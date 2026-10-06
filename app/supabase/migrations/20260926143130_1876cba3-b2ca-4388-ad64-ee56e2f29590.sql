ALTER TABLE public.library_products ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
GRANT DELETE ON public.library_products TO authenticated;
CREATE POLICY "Specialists delete library products" ON public.library_products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'specialist'));