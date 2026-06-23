
-- Extend public read policy on site_settings to include meta_integracao (pixel id is public)
DROP POLICY IF EXISTS "site_settings public read" ON public.site_settings;
CREATE POLICY "site_settings public read"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY['branding'::text, 'home_hero'::text, 'contato'::text, 'meta_integracao'::text]));

-- Seed rows (idempotent)
INSERT INTO public.site_settings (key, value)
VALUES ('meta_integracao', '{"pixel_id": "985976432441241"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES ('meta_credenciais', '{"conversions_api_token": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
