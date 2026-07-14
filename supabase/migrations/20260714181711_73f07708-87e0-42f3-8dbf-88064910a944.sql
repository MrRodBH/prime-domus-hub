-- =========================================================================
-- PR-M1 — Additive: lead_stage_history + OCC (leads.version) + transition RPC
-- Baseline: 40e5bd5e45ae63edafebae07a6e76c0536b3b982
-- Non-destructive. No RLS relaxation. No public grants. No column removal.
-- =========================================================================

-- 1) OCC column on leads (additive, default 1, backfilled)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 2) lead_stage_history — atomic history of status transitions
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status     text,
  to_status       text NOT NULL,
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason_type     text,
  reason_id       uuid,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_stage_history_to_status_chk
    CHECK (to_status IN ('novo','conversando','visita','proposta','ganho','perdido','descartado')),
  CONSTRAINT lead_stage_history_reason_type_chk
    CHECK (reason_type IS NULL OR reason_type IN ('discard','lost','manual','reopen','advance'))
);

CREATE INDEX IF NOT EXISTS lead_stage_history_tenant_idx    ON public.lead_stage_history (tenant_id);
CREATE INDEX IF NOT EXISTS lead_stage_history_lead_idx      ON public.lead_stage_history (lead_id);
CREATE INDEX IF NOT EXISTS lead_stage_history_created_idx   ON public.lead_stage_history (created_at DESC);
CREATE INDEX IF NOT EXISTS lead_stage_history_tenant_lead_created_idx
  ON public.lead_stage_history (tenant_id, lead_id, created_at DESC);

-- 3) Grants (audit table: INSERT via RPC only; SELECT limited to authenticated)
REVOKE ALL ON public.lead_stage_history FROM PUBLIC;
GRANT SELECT ON public.lead_stage_history TO authenticated;
GRANT ALL    ON public.lead_stage_history TO service_role;

-- 4) RLS — RESTRICTIVE tenant isolation + permissive SELECT gated by lead authorization
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lsh_tenant_isolation"    ON public.lead_stage_history;
DROP POLICY IF EXISTS "lsh_admin_select"        ON public.lead_stage_history;
DROP POLICY IF EXISTS "lsh_corretor_select_own" ON public.lead_stage_history;
DROP POLICY IF EXISTS "lsh_no_direct_write"     ON public.lead_stage_history;

CREATE POLICY "lsh_tenant_isolation"
  ON public.lead_stage_history
  AS RESTRICTIVE
  TO authenticated
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "lsh_admin_select"
  ON public.lead_stage_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "lsh_corretor_select_own"
  ON public.lead_stage_history
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'corretor')
    AND EXISTS (
      SELECT 1 FROM public.leads l
       WHERE l.id = lead_stage_history.lead_id
         AND l.assigned_to = auth.uid()
    )
  );

-- Direct writes are forbidden; only the SECURITY DEFINER RPC below inserts.
CREATE POLICY "lsh_no_direct_write"
  ON public.lead_stage_history
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- 5) Atomic transition RPC with OCC + history write.
--    Server derives tenant/actor. Client only supplies expected version.
CREATE OR REPLACE FUNCTION public.transition_lead_status(
  _lead_id           uuid,
  _to_status         text,
  _expected_version  integer,
  _reason_type       text DEFAULT NULL,
  _reason_id         uuid DEFAULT NULL,
  _metadata          jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_uid         uuid := auth.uid();
  v_lead        public.leads%ROWTYPE;
  v_authz       boolean;
  v_new_version integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  IF _to_status NOT IN ('novo','conversando','visita','proposta','ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'invalid_to_status' USING ERRCODE = '22023';
  END IF;

  IF _reason_type IS NOT NULL
     AND _reason_type NOT IN ('discard','lost','manual','reopen','advance') THEN
    RAISE EXCEPTION 'invalid_reason_type' USING ERRCODE = '22023';
  END IF;

  -- Lock lead row; also implicitly enforces existence.
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE = '22023';
  END IF;

  -- Authorization: admin tenant-wide OR corretor own-scope.
  v_authz := public.has_role(v_uid, 'admin')
          OR (public.has_role(v_uid, 'corretor') AND v_lead.assigned_to = v_uid);

  IF NOT v_authz THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Tenant boundary revalidation server-side.
  IF NOT public.user_has_active_membership(v_uid, v_lead.tenant_id)
     AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'tenant_boundary_violation' USING ERRCODE = '42501';
  END IF;

  -- Optimistic concurrency control.
  IF _expected_version IS NULL OR v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object('current_version', v_lead.version)::text;
  END IF;

  -- Reason validation gates.
  IF _to_status = 'descartado' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'discard_reason_required' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.lead_discard_reasons
       WHERE id = _reason_id AND ativo = true AND tenant_id = v_lead.tenant_id
    ) THEN
      RAISE EXCEPTION 'invalid_discard_reason' USING ERRCODE = '22023';
    END IF;
  ELSIF _to_status = 'perdido' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'lost_reason_required' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_lost_reasons
       WHERE id = _reason_id AND ativo = true AND tenant_id = v_lead.tenant_id
    ) THEN
      RAISE EXCEPTION 'invalid_lost_reason' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_new_version := v_lead.version + 1;

  UPDATE public.leads
     SET status            = _to_status,
         version           = v_new_version,
         discard_reason_id = CASE WHEN _to_status = 'descartado' THEN _reason_id
                                  WHEN _to_status = 'novo'       THEN NULL
                                  ELSE discard_reason_id END,
         lost_reason_id    = CASE WHEN _to_status = 'perdido'    THEN _reason_id
                                  WHEN _to_status = 'novo'       THEN NULL
                                  ELSE lost_reason_id END,
         descartado_at     = CASE WHEN _to_status = 'novo' THEN NULL ELSE descartado_at END,
         updated_at        = now()
   WHERE id = _lead_id
     AND version = _expected_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.lead_stage_history (
    tenant_id, lead_id, from_status, to_status,
    actor_user_id, reason_type, reason_id, metadata
  ) VALUES (
    v_lead.tenant_id, _lead_id, v_lead.status, _to_status,
    v_uid, _reason_type, _reason_id, COALESCE(_metadata, '{}'::jsonb)
  );

  RETURN jsonb_build_object(
    'lead_id',      _lead_id,
    'from_status',  v_lead.status,
    'to_status',    _to_status,
    'version',      v_new_version
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.transition_lead_status(uuid, text, integer, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, text, uuid, jsonb) TO service_role;