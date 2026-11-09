CREATE TABLE public.tenant_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9-]{2,120}$'),
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  publicada boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX tenant_landing_pages_imovel_idx ON public.tenant_landing_pages(imovel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_landing_pages TO authenticated;
GRANT ALL ON public.tenant_landing_pages TO service_role;
ALTER TABLE public.tenant_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_landing_pages tenant admin all" ON public.tenant_landing_pages
  FOR ALL TO authenticated
  USING (public.is_active_tenant_admin(tenant_id))
  WITH CHECK (public.is_active_tenant_admin(tenant_id));
CREATE OR REPLACE FUNCTION public.tenant_landing_pages_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.imoveis i WHERE i.id = NEW.imovel_id AND i.tenant_id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'landing page property belongs to another tenant' USING ERRCODE = '42501';
  END IF;
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_tenant_landing_pages_guard BEFORE INSERT OR UPDATE ON public.tenant_landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.tenant_landing_pages_guard();