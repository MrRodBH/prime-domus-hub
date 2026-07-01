DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read" ON public.site_settings
  FOR SELECT
  USING (key = ANY (ARRAY[
    'branding','branding_v2','empresa','footer','seo_global',
    'home_hero','home_secoes','home_diferenciais','home_depoimentos',
    'contato','pagina_lancamentos','pagina_sobre','pagina_contato','pagina_anuncie'
  ]));