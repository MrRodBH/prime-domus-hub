
DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY[
    'branding','branding_v2','empresa','footer','seo_global',
    'home_hero','home_secoes','contato','pagina_lancamentos'
  ]));

DROP POLICY IF EXISTS "site_settings admin write" ON public.site_settings;
CREATE POLICY "site_settings admin write"
  ON public.site_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente'));
