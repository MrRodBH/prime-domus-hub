
-- =========================================================
-- Wave 4 — CMS Campaigns (Banners / Popups)
-- =========================================================

CREATE TABLE public.cms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('banner_top','banner_bottom','popup_center','modal','floating')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  prioridade INT NOT NULL DEFAULT 0,
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  segmentacao JSONB NOT NULL DEFAULT '{"rotas_incluir":[],"rotas_excluir":[],"dispositivo":"all"}'::jsonb,
  agendamento JSONB NOT NULL DEFAULT '{}'::jsonb,
  frequencia JSONB NOT NULL DEFAULT '{"max_por_sessao":1,"cooldown_horas":24}'::jsonb,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_campaigns_tenant_status_idx ON public.cms_campaigns(tenant_id, status);
CREATE INDEX cms_campaigns_schedule_idx ON public.cms_campaigns(start_at, end_at);

GRANT SELECT ON public.cms_campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_campaigns TO authenticated;
GRANT ALL ON public.cms_campaigns TO service_role;

ALTER TABLE public.cms_campaigns ENABLE ROW LEVEL SECURITY;

-- Isolamento por tenant (RESTRICTIVE)
CREATE POLICY tenant_isolation ON public.cms_campaigns
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

-- Público lê apenas campanhas ativas dentro do agendamento
CREATE POLICY campaigns_public_read ON public.cms_campaigns
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    AND (start_at IS NULL OR start_at <= now())
    AND (end_at IS NULL OR end_at >= now())
  );

-- Admin/gerente gerenciam
CREATE POLICY campaigns_admin_manage ON public.cms_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin());

CREATE TRIGGER cms_campaigns_updated_at
  BEFORE UPDATE ON public.cms_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- cms_campaign_events — métricas
-- =========================================================
CREATE TABLE public.cms_campaign_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant_id(),
  campaign_id UUID NOT NULL REFERENCES public.cms_campaigns(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('impression','click','dismiss')),
  rota TEXT,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cms_campaign_events_campaign_idx ON public.cms_campaign_events(campaign_id, tipo, created_at DESC);
CREATE INDEX cms_campaign_events_tenant_idx ON public.cms_campaign_events(tenant_id, created_at DESC);

GRANT INSERT ON public.cms_campaign_events TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.cms_campaign_events_id_seq TO anon, authenticated;
GRANT SELECT ON public.cms_campaign_events TO authenticated;
GRANT ALL ON public.cms_campaign_events TO service_role;

ALTER TABLE public.cms_campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.cms_campaign_events
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY events_public_insert ON public.cms_campaign_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY events_admin_read ON public.cms_campaign_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin());
