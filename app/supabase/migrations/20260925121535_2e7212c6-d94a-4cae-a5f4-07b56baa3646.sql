DROP POLICY "Library readable by signed-in users" ON public.library_products;

CREATE POLICY "Library readable by app users"
ON public.library_products
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'client') OR public.has_role(auth.uid(), 'specialist'));