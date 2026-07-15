
-- 1. Update transition_lead_status: stamp stage timestamps + set boundary marker.
CREATE OR REPLACE FUNCTION public.transition_lead_status(
  _lead_id uuid,
  _to_status text,
  _expected_version integer,
  _reason_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
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
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  v_current_tenant := public.get_current_tenant_id();
  IF v_current_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_unresolved' USING ERRCODE = '42501';
  END IF;

  IF _to_status NOT IN ('novo','conversando','visita','proposta','ganho','perdido','descartado') THEN
    RAISE EXCEPTION 'invalid_to_status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE = '22023';
  END IF;

  IF v_lead.tenant_id <> v_current_tenant THEN
    RAISE EXCEPTION 'tenant_boundary_violation' USING ERRCODE = '42501';
  END IF;

  SELECT public.is_super_admin() INTO v_is_super;

  IF NOT v_is_super THEN
    IF NOT public.user_has_active_membership(v_uid, v_current_tenant) THEN
      RAISE EXCEPTION 'no_active_membership' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_authz := v_is_super
          OR public.has_role(v_uid, 'admin')
          OR (public.has_role(v_uid, 'corretor') AND v_lead.assigned_to = v_uid);

  IF NOT v_authz THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _expected_version IS NULL OR v_lead.version <> _expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001',
      DETAIL = jsonb_build_object('current_version', v_lead.version)::text;
  END IF;

  v_from := v_lead.status;

  v_valid_transition :=
       (v_from = 'novo'         AND _to_status IN ('conversando','descartado'))
    OR (v_from = 'conversando'  AND _to_status IN ('visita','descartado'))
    OR (v_from = 'visita'       AND _to_status IN ('proposta','descartado'))
    OR (v_from = 'proposta'     AND _to_status IN ('ganho','perdido','descartado'))
    OR (v_from = 'descartado'   AND _to_status = 'novo')
    OR (v_from = 'perdido'      AND _to_status = 'novo');

  IF v_from = _to_status THEN
    RAISE EXCEPTION 'noop_transition' USING ERRCODE = '22023';
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = '22023',
      DETAIL = jsonb_build_object('from', v_from, 'to', _to_status)::text;
  END IF;

  v_reason_type :=
    CASE
      WHEN _to_status = 'descartado'                                    THEN 'discard'
      WHEN _to_status = 'perdido'                                       THEN 'lost'
      WHEN _to_status = 'novo' AND v_from IN ('descartado','perdido')   THEN 'reopen'
      ELSE 'advance'
    END;

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
    IF _reason_id IS NOT NULL THEN
      RAISE EXCEPTION 'reason_id_not_allowed_for_transition' USING ERRCODE = '22023';
    END IF;
  END IF;

  v_metadata_safe := jsonb_build_object(
    'note',   COALESCE(_metadata->>'note',    NULL),
    'source', COALESCE(_metadata->>'source',  NULL)
  );

  v_new_version := v_lead.version + 1;

  -- Boundary marker: authorises the protected-columns trigger for THIS txn.
  PERFORM set_config('app.transition_lead_rpc', 'on', true);

  UPDATE public.leads
     SET status            = _to_status,
         version           = v_new_version,
         discard_reason_id = CASE WHEN _to_status = 'descartado' THEN _reason_id
                                  WHEN _to_status = 'novo'       THEN NULL
                                  ELSE discard_reason_id END,
         lost_reason_id    = CASE WHEN _to_status = 'perdido'    THEN _reason_id
                                  WHEN _to_status = 'novo'       THEN NULL
                                  ELSE lost_reason_id END,
         proposta_at       = CASE WHEN _to_status = 'proposta' AND proposta_at IS NULL THEN now()
                                  WHEN _to_status = 'novo'   THEN NULL
                                  ELSE proposta_at END,
         ganho_at          = CASE WHEN _to_status = 'ganho' AND ganho_at IS NULL THEN now()
                                  WHEN _to_status = 'novo'  THEN NULL
                                  ELSE ganho_at END,
         perdido_at        = CASE WHEN _to_status = 'perdido' THEN now()
                                  WHEN _to_status = 'novo'   THEN NULL
                                  ELSE perdido_at END,
         descartado_at     = CASE WHEN _to_status = 'descartado' THEN now()
                                  WHEN _to_status = 'novo' THEN NULL
                                  ELSE descartado_at END,
         updated_at        = now()
   WHERE id = _lead_id
     AND version = _expected_version;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001';
  END IF;

  -- Immediately clear the marker so no unrelated UPDATE in this txn can slip through.
  PERFORM set_config('app.transition_lead_rpc', 'off', true);

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

-- 2. Retire the legacy status-flow trigger (grafo + timestamps duplicavam a RPC).
DROP TRIGGER IF EXISTS trg_leads_enforce_status_flow ON public.leads;

-- 3. Boundary trigger: reject direct writes to protected columns unless
-- transition_lead_status marked this transaction. Reads only session GUC set
-- by SECURITY DEFINER RPC — client cannot forge it via headers.
CREATE OR REPLACE FUNCTION public.tg_leads_protected_columns_boundary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_marker text;
BEGIN
  v_marker := current_setting('app.transition_lead_rpc', true);
  IF v_marker = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status            IS DISTINCT FROM OLD.status
  OR NEW.version           IS DISTINCT FROM OLD.version
  OR NEW.discard_reason_id IS DISTINCT FROM OLD.discard_reason_id
  OR NEW.lost_reason_id    IS DISTINCT FROM OLD.lost_reason_id
  OR NEW.proposta_at       IS DISTINCT FROM OLD.proposta_at
  OR NEW.ganho_at          IS DISTINCT FROM OLD.ganho_at
  OR NEW.perdido_at        IS DISTINCT FROM OLD.perdido_at
  OR NEW.descartado_at     IS DISTINCT FROM OLD.descartado_at THEN
    RAISE EXCEPTION 'direct write to protected lead columns is forbidden; use transition_lead_status'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_leads_protected_columns_boundary ON public.leads;
CREATE TRIGGER trg_leads_protected_columns_boundary
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_leads_protected_columns_boundary();
