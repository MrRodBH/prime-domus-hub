-- 1) Corretores: remover leitura pública
DROP POLICY IF EXISTS "corretores public read anon" ON public.corretores;
REVOKE ALL ON public.corretores FROM anon;

-- 2) site_settings: remover meta_integracao da whitelist pública
DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY['branding'::text, 'home_hero'::text, 'contato'::text]));
