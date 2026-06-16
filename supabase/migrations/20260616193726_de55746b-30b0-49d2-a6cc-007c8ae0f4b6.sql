
-- Site settings (textos da home, logo, etc.)
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings public read" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site_settings admin write" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Defaults
INSERT INTO public.site_settings (key, value) VALUES
  ('branding', '{"logo_path": null, "site_name": "RM Prime Imóveis"}'::jsonb),
  ('home_hero', '{"eyebrow": "Imóveis de alto padrão em Belo Horizonte", "title_lines": ["Excelência em", "imóveis premium"], "subtitle": "Curadoria de imóveis exclusivos nos bairros mais valorizados de BH e região.", "cta_primary": "Ver imóveis", "cta_secondary": "Falar com consultor"}'::jsonb),
  ('contato', '{"telefone": "(31) 99999-0000", "whatsapp": "5531999990000", "email": "contato@rmprimeimoveis.com.br", "endereco": "Belo Horizonte, MG", "instagram": "@rmprimeimoveis"}'::jsonb);

-- Storage RLS: bucket "imoveis" e "site"
-- Leitura pública (signed URLs funcionam para anon)
CREATE POLICY "imoveis storage public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'imoveis');

CREATE POLICY "imoveis storage admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imoveis' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "imoveis storage admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'imoveis' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "imoveis storage admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'imoveis' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site storage public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'site');

CREATE POLICY "site storage admin write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site storage admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site storage admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));
