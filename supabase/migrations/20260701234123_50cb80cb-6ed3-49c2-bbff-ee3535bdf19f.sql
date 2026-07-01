
-- =========================================================
-- 1) LEADS: novo status 'descartado' + colunas de auditoria
-- =========================================================
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo','conversando','visita','proposta','ganho','perdido','descartado'));

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS discard_reason_id uuid,
  ADD COLUMN IF NOT EXISTS lost_reason_id uuid,
  ADD COLUMN IF NOT EXISTS descartado_at timestamptz,
  ADD COLUMN IF NOT EXISTS perdido_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposta_at timestamptz,
  ADD COLUMN IF NOT EXISTS ganho_at timestamptz;

-- =========================================================
-- 2) Tabelas de motivos configuráveis por tenant
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lead_discard_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant_id(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_discard_reasons TO authenticated;
GRANT ALL ON public.lead_discard_reasons TO service_role;
ALTER TABLE public.lead_discard_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read discard reasons" ON public.lead_discard_reasons
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY "admin manage discard reasons" ON public.lead_discard_reasons
  FOR ALL TO authenticated
  USING ((tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin())
  WITH CHECK ((tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin());

CREATE TRIGGER trg_lead_discard_reasons_updated
  BEFORE UPDATE ON public.lead_discard_reasons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.deal_lost_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant_id(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 0,
  padrao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_lost_reasons TO authenticated;
GRANT ALL ON public.deal_lost_reasons TO service_role;
ALTER TABLE public.deal_lost_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read lost reasons" ON public.deal_lost_reasons
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY "admin manage lost reasons" ON public.deal_lost_reasons
  FOR ALL TO authenticated
  USING ((tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin())
  WITH CHECK ((tenant_id = public.get_current_tenant_id() AND public.has_role(auth.uid(),'admin')) OR public.is_super_admin());

CREATE TRIGGER trg_deal_lost_reasons_updated
  BEFORE UPDATE ON public.deal_lost_reasons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =========================================================
-- 3) Log de perdas comerciais (espelha lead_descartes)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lead_perdas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid,
  user_nome text NOT NULL,
  user_perfil text NOT NULL,
  reason_id uuid REFERENCES public.deal_lost_reasons(id) ON DELETE SET NULL,
  motivo_nome text NOT NULL,
  detalhes text NOT NULL DEFAULT '',
  valor_estimado numeric,
  imovel_id uuid,
  launch_project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant_id()
);

GRANT SELECT, INSERT ON public.lead_perdas TO authenticated;
GRANT ALL ON public.lead_perdas TO service_role;
ALTER TABLE public.lead_perdas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant read perdas" ON public.lead_perdas
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY "tenant insert perdas" ON public.lead_perdas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE TRIGGER trg_lead_perdas_no_delete
  BEFORE DELETE ON public.lead_perdas
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();

-- =========================================================
-- 4) Ampliar lead_descartes com reason_id (motivo configurável)
-- =========================================================
ALTER TABLE public.lead_descartes
  ADD COLUMN IF NOT EXISTS reason_id uuid REFERENCES public.lead_discard_reasons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_nome text;

-- =========================================================
-- 5) Trigger: bloqueia transições ilegais
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_leads_enforce_status_flow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Marca timestamps de etapa
    IF NEW.status = 'proposta' AND NEW.proposta_at IS NULL THEN
      NEW.proposta_at := now();
    END IF;
    IF NEW.status = 'ganho' AND NEW.ganho_at IS NULL THEN
      NEW.ganho_at := now();
    END IF;

    -- Só pode ir para 'perdido' vindo de 'proposta'
    IF NEW.status = 'perdido' AND COALESCE(OLD.status,'') <> 'proposta' THEN
      RAISE EXCEPTION 'Só é permitido marcar como Perdido leads que passaram pela etapa Proposta. Use Descartar.' USING ERRCODE = '22023';
    END IF;

    -- Não pode "desganhar" ou reabrir perdido/descartado sem passar por 'novo' explicitamente
    IF OLD.status IN ('ganho') AND NEW.status <> 'ganho' THEN
      RAISE EXCEPTION 'Leads Ganhos não podem ter o status alterado.' USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'perdido' THEN NEW.perdido_at := now(); END IF;
    IF NEW.status = 'descartado' THEN NEW.descartado_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_enforce_status_flow ON public.leads;
CREATE TRIGGER trg_leads_enforce_status_flow
  BEFORE UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_leads_enforce_status_flow();

-- =========================================================
-- 6) Seed de motivos padrão em novos tenants
-- =========================================================
CREATE OR REPLACE FUNCTION public.seed_default_lead_reasons(_tenant uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lead_discard_reasons (tenant_id, nome, ordem, padrao) VALUES
    (_tenant, 'Contato inválido', 10, true),
    (_tenant, 'Sem interesse', 20, true),
    (_tenant, 'Sem retorno', 30, true),
    (_tenant, 'Lead duplicado', 40, true),
    (_tenant, 'Perfil incompatível', 50, true),
    (_tenant, 'Sem capacidade financeira', 60, true),
    (_tenant, 'Outro', 999, true)
  ON CONFLICT (tenant_id, nome) DO NOTHING;

  INSERT INTO public.deal_lost_reasons (tenant_id, nome, ordem, padrao) VALUES
    (_tenant, 'Comprou com concorrente', 10, true),
    (_tenant, 'Financiamento negado', 20, true),
    (_tenant, 'Desistiu da compra', 30, true),
    (_tenant, 'Preço incompatível', 40, true),
    (_tenant, 'Proprietário desistiu', 50, true),
    (_tenant, 'Sem aprovação interna', 60, true),
    (_tenant, 'Outro', 999, true)
  ON CONFLICT (tenant_id, nome) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_tenants_seed_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_lead_reasons(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_seed_defaults ON public.tenants;
CREATE TRIGGER trg_tenants_seed_defaults
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tg_tenants_seed_defaults();

-- Seed para tenants existentes
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_lead_reasons(t.id);
  END LOOP;
END $$;

-- =========================================================
-- 7) Backfill: leads em 'perdido' sem histórico de proposta viram 'descartado'
-- =========================================================
UPDATE public.leads
SET status = 'descartado',
    descartado_at = COALESCE(descartado_at, now())
WHERE status = 'perdido'
  AND proposta_at IS NULL;
