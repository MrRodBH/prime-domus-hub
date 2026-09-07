-- Round 42: repository-only migration. Never applied to a remote backend in this round.
BEGIN;

CREATE FUNCTION public.link_tenant_broker_identity(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _broker_id uuid,
  _target_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $fn$
DECLARE
  v_current_user_id uuid;
  v_membership_status text;
  v_actor_kind text;
BEGIN
  -- Only the canonical server's privileged channel may supply trusted actor context.
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'broker_identity_server_channel_required' USING ERRCODE = '42501';
  END IF;
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _broker_id IS NULL
     OR _target_user_id IS NULL OR _tenant_origin IS NULL
     OR _tenant_origin NOT IN ('impersonation', 'selection', 'single-membership') THEN
    RAISE EXCEPTION 'broker_identity_invalid_context' USING ERRCODE = '22023';
  END IF;

  -- Same first lock as canonical membership and access-control writers.
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'broker_identity_unavailable' USING ERRCODE = '22023';
  END IF;
  v_actor_kind := public.assert_tenant_access_manager(_actor_user_id, _tenant_id, _tenant_origin);
  IF v_actor_kind <> 'super_admin' AND _tenant_origin = 'impersonation' THEN
    RAISE EXCEPTION 'broker_identity_invalid_context' USING ERRCODE = '42501';
  END IF;

  SELECT membership_status::text INTO v_membership_status
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   FOR UPDATE;
  IF NOT FOUND OR v_membership_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'broker_identity_unavailable' USING ERRCODE = '22023';
  END IF;
  -- Existing tenant_members and corretores foreign keys enforce Auth existence.
  -- The UPDATE below takes the FK key-share lock without granting Auth-table access.

  SELECT user_id INTO v_current_user_id FROM public.corretores
   WHERE tenant_id = _tenant_id AND id = _broker_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'broker_identity_unavailable' USING ERRCODE = '22023';
  END IF;
  IF v_current_user_id = _target_user_id THEN
    RETURN jsonb_build_object('corretorId', _broker_id, 'userId', _target_user_id, 'status', 'already_linked');
  END IF;
  IF v_current_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'broker_identity_conflict' USING ERRCODE = '23505';
  END IF;

  BEGIN
    UPDATE public.corretores SET user_id = _target_user_id
     WHERE tenant_id = _tenant_id AND id = _broker_id;
  EXCEPTION WHEN unique_violation THEN
    -- Preserve the global index without returning its tenant or conflicting row.
    RAISE EXCEPTION 'broker_identity_conflict' USING ERRCODE = '23505';
  END;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (_tenant_id, _actor_user_id, 'broker_identity_linked', 'corretores', _broker_id,
          jsonb_build_object('user_id', NULL), jsonb_build_object('user_id', _target_user_id));
  -- An audit failure propagates: the link and audit commit or roll back together.
  RETURN jsonb_build_object('corretorId', _broker_id, 'userId', _target_user_id, 'status', 'linked');
END;
$fn$;

REVOKE ALL ON FUNCTION public.link_tenant_broker_identity(uuid,uuid,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_tenant_broker_identity(uuid,uuid,text,uuid,uuid) TO service_role;

COMMIT;
