-- PR-M1 · corrective migration: restore lead_stage_history read grants (empty
-- grants were a defect from the previous cycle: authenticated could not read
-- audit history even though a policy granted them SELECT) and drop the
-- dual-authority legacy trigger so transition_lead_status becomes the sole
-- server authority for lead status transitions.

-- 1) Grants: authenticated reads under RLS; service_role bypasses RLS.
--    No direct INSERT/UPDATE/DELETE for anyone — writes go through the
--    SECURITY DEFINER RPC only, which runs as function owner.
GRANT SELECT ON public.lead_stage_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_stage_history TO service_role;

-- 2) Drop the legacy dual-authority trigger. Its rules (forbid ganho→*,
--    proposta-only path into perdido, timestamp maintenance) are superseded
--    by transition_lead_status which enforces the canonical graph server-side
--    and is the sole write path. Timestamp maintenance for terminal states
--    is folded into a lightweight replacement trigger below.
DROP TRIGGER IF EXISTS trg_leads_enforce_status_flow ON public.leads;
DROP FUNCTION IF EXISTS public.tg_leads_enforce_status_flow();

-- 3) Preserve terminal-timestamp maintenance (proposta_at / ganho_at /
--    perdido_at / descartado_at) as a passive trigger with NO gating logic —
--    gating lives exclusively in transition_lead_status. This keeps historical
--    reporting columns populated when the RPC updates status.
CREATE OR REPLACE FUNCTION public.tg_leads_stamp_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'proposta'   AND NEW.proposta_at   IS NULL THEN NEW.proposta_at   := now(); END IF;
    IF NEW.status = 'ganho'      AND NEW.ganho_at      IS NULL THEN NEW.ganho_at      := now(); END IF;
    IF NEW.status = 'perdido'                                    THEN NEW.perdido_at    := now(); END IF;
    IF NEW.status = 'descartado'                                 THEN NEW.descartado_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_leads_stamp_status_timestamps
BEFORE UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_leads_stamp_status_timestamps();