
-- =========================================================================
-- PR-M1 corrective migration — lead_stage_history hardening + RPC rework
-- Additive/restrictive only. No data deletion, no RLS relaxation.
-- =========================================================================

-- (1) Drop the overreaching FOR ALL RESTRICTIVE (false/false) policy that
--     also blocks SELECT and neutralizes the permissive read policies.
DROP POLICY IF EXISTS lsh_no_direct_write ON public.lead_stage_history;

-- (2) Reset table privileges to a minimum, deterministic surface.
REVOKE ALL ON public.lead_stage_history FROM PUBLIC;
REVOKE ALL ON public.lead_stage_history FROM anon;
REVOKE ALL ON public.lead_stage_history FROM authenticated;
REVOKE ALL ON public.lead_stage_history FROM service_role;

-- authenticated: read only (write goes through SECURITY DEFINER RPC).
GRANT SELECT ON public.lead_stage_history TO authenticated;

-- service_role: read + insert only. No update/delete/truncate/references/trigger.
GRANT SELECT, INSERT ON public.lead_stage_history TO service_role;

-- (3) Preserve audit trail — change lead FK from CASCADE to RESTRICT.
ALTER TABLE public.lead_stage_history
  DROP CONSTRAINT IF EXISTS lead_stage_history_lead_id_fkey;

ALTER TABLE public.lead_stage_history
  ADD CONSTRAINT lead_stage_history_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE RESTRICT;

-- (4) Rebuild transition_lead_status.
--
--     Drop old signature (with _reason_type) so the corrective signature
--     without a client-controlled reason_type replaces it cleanly.
DROP FUNCTION IF EXISTS public.transition_lead_status(uuid, text, integer, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.transition_lead_status(uuid, text, integer, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.transition_lead_status(
  _lead_id           uuid,
  _to_status         text,
  _expected_version  integer,
  _reason_id         uuid  DEFAULT NULL,
  _metadata          jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_uid              uuid := auth.uid();
  v_current_tenant   uuid;
  v_is_super         boolean;
  v_lead             public.leads%ROWTYPE;
  v_from             text;
  v_reason_type      text;
  v_authz            boolean;
  v_new_version      integer;
  v_valid_transition boolean;
  v_metadata_safe    jsonb;
BEGIN
  -- Authentication gate.
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- Canonical tenant resolution — same authority used by RLS.
  v_current_tenant := public.get_current_tenant_id();
  IF v_current_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_unresolved' USING ERRCODE = '42501';
  END IF;

  -- Domain validation.
  IF _to_status NOT IN ('novo','conversando','visita','proposta','ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'invalid_to_status' USING ERRCODE = '22023';
  END IF;

  -- Lock lead + ensure existence.
  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE = '22023';
  END IF;

  -- Tenant boundary — lead must belong to the resolved current tenant.
  IF v_lead.tenant_id <> v_current_tenant THEN
    RAISE EXCEPTION 'tenant_boundary_violation' USING ERRCODE = '42501';
  END IF;

  -- Super admin: only with impersonation. get_current_tenant_id() enforces
  -- that a super_admin only resolves a tenant via x-tenant-id header, so
  -- reaching this point already implies impersonation is active. We forbid
  -- a super_admin that has no explicit impersonation context.
  SELECT public.is_super_admin() INTO v_is_super;

  -- Membership required for every actor (including admins). Super admin
  -- under impersonation is exempt because impersonation IS the audited
  -- alternative pathway, but must still be flagged by is_super_admin.
  IF NOT v_is_super THEN
    IF NOT public.user_has_active_membership(v_uid, v_current_tenant) THEN
      RAISE EXCEPTION 'no_active_membership' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Functional authorization: admin tenant-wide OR corretor own/assigned.
  v_authz := v_is_super
          OR public.has_role(v_uid, 'admin')
          OR (public.has_role(v_uid, 'corretor') AND v_lead.assigned_to = v_uid);

  IF NOT v_authz THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Optimistic concurrency control.
  IF _expected_version IS NULL OR v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object('current_version', v_lead.version)::text;
  END IF;

  v_from := v_lead.status;

  -- Canonical transition graph.
  v_valid_transition :=
       (v_from = _to_status)  -- no-op tolerated; still records history event? we reject to keep audit clean
    OR (v_from = 'novo'         AND _to_status IN ('conversando','descartado'))
    OR (v_from = 'conversando'  AND _to_status IN ('visita','descartado'))
    OR (v_from = 'visita'       AND _to_status IN ('proposta','descartado'))
    OR (v_from = 'proposta'     AND _to_status IN ('ganho','perdido','descartado'))
    OR (v_from = 'descartado'   AND _to_status = 'novo')      -- reopen
    OR (v_from = 'perdido'      AND _to_status = 'novo');     -- authorized reopen from lost

  -- Reject no-op explicitly; every RPC call must express a real transition.
  IF v_from = _to_status THEN
    RAISE EXCEPTION 'noop_transition' USING ERRCODE = '22023';
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = '22023',
      DETAIL = jsonb_build_object('from', v_from, 'to', _to_status)::text;
  END IF;

  -- Server-derived reason_type. Client cannot choose it.
  v_reason_type :=
    CASE
      WHEN _to_status = 'descartado'                                    THEN 'discard'
      WHEN _to_status = 'perdido'                                       THEN 'lost'
      WHEN _to_status = 'novo' AND v_from IN ('descartado','perdido')   THEN 'reopen'
      ELSE 'advance'
    END;

  -- Reason validation gates.
  IF v_reason_type = 'discard' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'discard_reason_required' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.lead_discard_reasons
       WHERE id = _reason_id AND ativo = true AND tenant_id = v_current_tenant
    ) THEN
      RAISE EXCEPTION 'invalid_discard_reason' USING ERRCODE = '22023';
    END IF;
  ELSIF v_reason_type = 'lost' THEN
    IF _reason_id IS NULL THEN
      RAISE EXCEPTION 'lost_reason_required' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.deal_lost_reasons
       WHERE id = _reason_id AND ativo = true AND tenant_id = v_current_tenant
    ) THEN
      RAISE EXCEPTION 'invalid_lost_reason' USING ERRCODE = '22023';
    END IF;
  ELSE
    -- advance / reopen must not carry a reason_id.
    IF _reason_id IS NOT NULL THEN
      RAISE EXCEPTION 'reason_id_not_allowed_for_transition' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Sanitize metadata: only a bounded whitelist of primitive keys.
  v_metadata_safe := jsonb_build_object(
    'note',   COALESCE(_metadata->>'note',    NULL),
    'source', COALESCE(_metadata->>'source',  NULL)
  );

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
    v_current_tenant, _lead_id, v_from, _to_status,
    v_uid, v_reason_type, _reason_id, v_metadata_safe
  );

  RETURN jsonb_build_object(
    'lead_id',      _lead_id,
    'from_status',  v_from,
    'to_status',    _to_status,
    'reason_type',  v_reason_type,
    'version',      v_new_version
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_lead_status(uuid, text, integer, uuid, jsonb) TO service_role;
