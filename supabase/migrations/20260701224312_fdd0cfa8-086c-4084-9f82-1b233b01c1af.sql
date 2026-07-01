
CREATE TABLE public.cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  slug TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE INDEX cms_pages_tenant_status_idx ON public.cms_pages(tenant_id, status);
CREATE INDEX cms_pages_tenant_slug_idx ON public.cms_pages(tenant_id, slug);

GRANT SELECT ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO authenticated;
GRANT ALL ON public.cms_pages TO service_role;

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- RESTRICTIVE: isolamento estrito por tenant
CREATE POLICY "cms_pages_tenant_isolation" ON public.cms_pages
  AS RESTRICTIVE FOR ALL TO public
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- Público lê apenas páginas publicadas
CREATE POLICY "cms_pages_public_read_published" ON public.cms_pages
  FOR SELECT TO anon
  USING (status = 'published');

-- Autenticados do tenant leem tudo
CREATE POLICY "cms_pages_auth_read_all" ON public.cms_pages
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

-- Editores/admins escrevem
CREATE POLICY "cms_pages_editor_write" ON public.cms_pages
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_any_permission(auth.uid(), 'site'))
    AND public.user_belongs_to_tenant(tenant_id)
  );

CREATE POLICY "cms_pages_editor_update" ON public.cms_pages
  FOR UPDATE TO authenticated
  USING (
    (public.has_role(auth.uid(), 'admin') OR public.has_any_permission(auth.uid(), 'site'))
    AND public.user_belongs_to_tenant(tenant_id)
  );

CREATE POLICY "cms_pages_admin_delete" ON public.cms_pages
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND public.user_belongs_to_tenant(tenant_id)
  );

CREATE TRIGGER cms_pages_updated_at
  BEFORE UPDATE ON public.cms_pages
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
