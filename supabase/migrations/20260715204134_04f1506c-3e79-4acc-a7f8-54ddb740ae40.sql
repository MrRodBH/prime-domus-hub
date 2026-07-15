-- PR-M1 Runtime Safety Restoration
-- 3.1 Restrict lead_stage_history: RPC is the sole writer.
REVOKE ALL ON public.lead_stage_history FROM service_role;
REVOKE ALL ON public.lead_stage_history FROM PUBLIC;
REVOKE ALL ON public.lead_stage_history FROM anon;
GRANT SELECT ON public.lead_stage_history TO authenticated;

-- 3.3 Drop duplicate timestamp trigger (restored guard trigger will stamp them).
DROP TRIGGER IF EXISTS trg_leads_stamp_status_timestamps ON public.leads;
DROP FUNCTION IF EXISTS public.tg_leads_stamp_status_timestamps();

-- 3.2 Restore legacy status-flow guard trigger (verbatim from historical baseline
-- migration 20260701234123). Temporary defense against legacy direct-status writers
-- until DIRECT_STATUS_WRITES_REMAINING = 0.
CREATE OR REPLACE FUNCTION public.tg_leads_enforce_status_flow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'proposta' AND NEW.proposta_at IS NULL THEN
      NEW.proposta_at := now();
    END IF;
    IF NEW.status = 'ganho' AND NEW.ganho_at IS NULL THEN
      NEW.ganho_at := now();
    END IF;

    IF NEW.status = 'perdido' AND COALESCE(OLD.status,'') <> 'proposta' THEN
      RAISE EXCEPTION 'Só é permitido marcar como Perdido leads que passaram pela etapa Proposta. Use Descartar.' USING ERRCODE = '22023';
    END IF;

    IF OLD.status IN ('ganho') AND NEW.status <> 'ganho' THEN
      RAISE EXCEPTION 'Leads Ganhos não podem ter o status alterado.' USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'perdido' THEN NEW.perdido_at := now(); END IF;
    IF NEW.status = 'descartado' THEN NEW.descartado_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_leads_enforce_status_flow() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_leads_enforce_status_flow ON public.leads;
CREATE TRIGGER trg_leads_enforce_status_flow
  BEFORE UPDATE OF status ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.tg_leads_enforce_status_flow();

-- RPC gates: no PUBLIC/anon execute; authenticated retains execute (RPC is SECURITY DEFINER).
REVOKE EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) TO authenticated;