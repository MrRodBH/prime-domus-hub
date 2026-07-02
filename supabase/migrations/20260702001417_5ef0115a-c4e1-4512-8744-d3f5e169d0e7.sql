
-- ============ portal_connectors ============
CREATE TABLE public.portal_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  portal_slug text NOT NULL,
  portal_nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT false,
  feed_url text,
  feed_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  webhook_url text,
  webhook_secret text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status text NOT NULL DEFAULT 'nao_configurado',
  ultimo_sync_at timestamptz,
  ultimo_erro text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, portal_slug),
  UNIQUE (feed_token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_connectors TO authenticated;
GRANT ALL ON public.portal_connectors TO service_role;

ALTER TABLE public.portal_connectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_connectors_tenant_read" ON public.portal_connectors
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "portal_connectors_admin_write" ON public.portal_connectors
  FOR ALL TO authenticated
  USING (
    (public.user_belongs_to_tenant(tenant_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (public.user_belongs_to_tenant(tenant_id) AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente')))
    OR public.is_super_admin()
  );

CREATE TRIGGER portal_connectors_updated_at
  BEFORE UPDATE ON public.portal_connectors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_portal_connectors_tenant ON public.portal_connectors(tenant_id);
CREATE INDEX idx_portal_connectors_token ON public.portal_connectors(feed_token);

-- ============ imovel_portais ============
CREATE TABLE public.imovel_portais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  portal_slug text NOT NULL,
  status text NOT NULL DEFAULT 'aguardando',
  portal_reference text,
  publicado boolean NOT NULL DEFAULT false,
  ultimo_envio timestamptz,
  ultima_leitura timestamptz,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (imovel_id, portal_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.imovel_portais TO authenticated;
GRANT ALL ON public.imovel_portais TO service_role;

ALTER TABLE public.imovel_portais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "imovel_portais_tenant_read" ON public.imovel_portais
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "imovel_portais_tenant_write" ON public.imovel_portais
  FOR ALL TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin())
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE TRIGGER imovel_portais_updated_at
  BEFORE UPDATE ON public.imovel_portais
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_imovel_portais_tenant ON public.imovel_portais(tenant_id);
CREATE INDEX idx_imovel_portais_imovel ON public.imovel_portais(imovel_id);
CREATE INDEX idx_imovel_portais_portal ON public.imovel_portais(portal_slug);

-- ============ portal_sync_logs ============
CREATE TABLE public.portal_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  portal_slug text NOT NULL,
  acao text NOT NULL,
  status text NOT NULL,
  imovel_id uuid,
  lead_id uuid,
  payload jsonb,
  erro text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.portal_sync_logs TO authenticated;
GRANT ALL ON public.portal_sync_logs TO service_role;

ALTER TABLE public.portal_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_sync_logs_tenant_read" ON public.portal_sync_logs
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "portal_sync_logs_service_insert" ON public.portal_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE TRIGGER portal_sync_logs_no_delete
  BEFORE DELETE ON public.portal_sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();

CREATE INDEX idx_portal_sync_logs_tenant ON public.portal_sync_logs(tenant_id, created_at DESC);
CREATE INDEX idx_portal_sync_logs_portal ON public.portal_sync_logs(portal_slug, created_at DESC);

-- ============ Seed default portals ============
CREATE OR REPLACE FUNCTION public.seed_default_portal_connectors(_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.portal_connectors (tenant_id, portal_slug, portal_nome) VALUES
    (_tenant, 'zap',          'Zap Imóveis'),
    (_tenant, 'vivareal',     'Viva Real'),
    (_tenant, 'chavesnamao',  'Chaves na Mão'),
    (_tenant, 'imovelweb',    'Imovelweb'),
    (_tenant, 'olx',          'OLX'),
    (_tenant, 'mercadolivre', 'Mercado Livre')
  ON CONFLICT (tenant_id, portal_slug) DO NOTHING;
END;
$$;

-- estende o trigger existente de seed em tenants
CREATE OR REPLACE FUNCTION public.tg_tenants_seed_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_lead_reasons(NEW.id);
  PERFORM public.seed_default_portal_connectors(NEW.id);
  RETURN NEW;
END;
$$;

-- backfill: seed nos tenants já existentes
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_portal_connectors(t.id);
  END LOOP;
END $$;
