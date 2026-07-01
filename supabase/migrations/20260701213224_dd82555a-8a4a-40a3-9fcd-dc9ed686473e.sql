
CREATE TABLE IF NOT EXISTS public.website_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  location text NOT NULL DEFAULT 'header',
  label text NOT NULL,
  url text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  visivel boolean NOT NULL DEFAULT true,
  target text NOT NULL DEFAULT '_self',
  tipo text NOT NULL DEFAULT 'internal',
  parent_id uuid REFERENCES public.website_menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.website_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_menu_items TO authenticated;
GRANT ALL ON public.website_menu_items TO service_role;

ALTER TABLE public.website_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_public_read"
  ON public.website_menu_items FOR SELECT
  TO anon, authenticated
  USING (visivel = true AND tenant_id = public.get_current_tenant_id());

CREATE POLICY "menu_items_admin_all"
  ON public.website_menu_items FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
  );

CREATE POLICY "menu_items_tenant_isolation"
  ON public.website_menu_items AS RESTRICTIVE FOR ALL
  TO anon, authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE INDEX IF NOT EXISTS website_menu_items_tenant_loc_ordem_idx
  ON public.website_menu_items (tenant_id, location, ordem);

CREATE TRIGGER trg_website_menu_items_updated_at
  BEFORE UPDATE ON public.website_menu_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.website_menu_items (tenant_id, location, label, url, ordem, tipo)
SELECT '9664d189-4a12-4caa-8243-dc73383447e6'::uuid, 'header', v.label, v.url, v.ordem, 'internal'
FROM (VALUES
  ('Imóveis',      '/imoveis',      10),
  ('Lançamentos',  '/lancamentos',  20),
  ('Blog',         '/blog',         30),
  ('Anuncie',      '/anuncie',      40),
  ('Sobre',        '/sobre',        50),
  ('Contato',      '/contato',      60)
) AS v(label, url, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.website_menu_items
  WHERE tenant_id = '9664d189-4a12-4caa-8243-dc73383447e6'::uuid AND location = 'header'
);
