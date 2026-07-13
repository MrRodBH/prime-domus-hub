CREATE OR REPLACE FUNCTION public.mutate_tenant_membership(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _operation text,
  _target_user_id uuid,
  _target_role text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant_id uuid;
  v_is_super boolean;
  v_actor_is_owner boolean := false;
  v_prev_status public.membership_status;
  v_prev_role public.tenant_role;
  v_prev_is_owner boolean;
  v_row_found boolean := false;
  v_new_status public.membership_status;
  v_new_role public.tenant_role;
  v_changed boolean := true;
  v_target_role_enum public.tenant_role;
  v_seat_delta int := 0;
  v_decision jsonb;
BEGIN
  -- (A) Parameter validation
  IF _actor_user_id IS NULL THEN RAISE EXCEPTION 'Invalid actor' USING ERRCODE='22023'; END IF;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Invalid tenant' USING ERRCODE='22023'; END IF;
  IF _target_user_id IS NULL THEN RAISE EXCEPTION 'Invalid target' USING ERRCODE='22023'; END IF;
  IF _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'Invalid tenant origin' USING ERRCODE='22023';
  END IF;
  IF _operation NOT IN ('create_membership','change_role','suspend','reactivate','revoke') THEN
    RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023';
  END IF;

  -- (B) Canonical tenant lock — FIRST row locked in this function.
  SELECT id INTO v_locked_tenant_id
    FROM public.tenants
   WHERE id = _tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found' USING ERRCODE='22023';
  END IF;

  -- (C) Actor existence + Trusted Actor Context revalidation
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'Actor not found' USING ERRCODE='22023';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _actor_user_id AND role = 'super_admin')
    INTO v_is_super;

  IF v_is_super THEN
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'Super admin requires impersonation origin' USING ERRCODE='22023';
    END IF;
  ELSE
    IF _tenant_origin NOT IN ('selection','single-membership') THEN
      RAISE EXCEPTION 'Regular user cannot use impersonation origin' USING ERRCODE='22023';
    END IF;
    SELECT (tenant_role = 'owner' AND membership_status = 'active' AND is_owner = true)
      INTO v_actor_is_owner
      FROM public.tenant_members
     WHERE tenant_id = _tenant_id AND user_id = _actor_user_id
     LIMIT 1;
    IF NOT COALESCE(v_actor_is_owner, false) THEN
      RAISE EXCEPTION 'Actor not authorized' USING ERRCODE='42501';
    END IF;
  END IF;

  -- (D) Target user existence + targetRole validation
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'Target not found' USING ERRCODE='22023';
  END IF;

  IF _operation IN ('create_membership','change_role') THEN
    IF _target_role IS NULL THEN
      RAISE EXCEPTION 'Missing targetRole' USING ERRCODE='22023';
    END IF;
    IF _target_role = 'owner' THEN
      RAISE EXCEPTION 'targetRole owner not permitted' USING ERRCODE='22023';
    END IF;
    BEGIN
      v_target_role_enum := _target_role::public.tenant_role;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid targetRole' USING ERRCODE='22023';
    END;
  ELSE
    IF _target_role IS NOT NULL THEN
      RAISE EXCEPTION 'targetRole not allowed for this operation' USING ERRCODE='22023';
    END IF;
  END IF;

  -- (E) Load current membership state (target)
  SELECT membership_status, tenant_role, is_owner
    INTO v_prev_status, v_prev_role, v_prev_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   LIMIT 1;
  v_row_found := FOUND;

  -- (F) Owner protection
  IF v_row_found AND (v_prev_role = 'owner' OR v_prev_is_owner = true) THEN
    RAISE EXCEPTION 'Target is owner; owner mutation not permitted' USING ERRCODE='22023';
  END IF;

  -- (G) Plan mutation BEFORE any DML.
  IF _operation = 'create_membership' THEN
    IF v_row_found THEN
      RAISE EXCEPTION 'membership_already_exists' USING ERRCODE='23505';
    END IF;
    v_prev_status := NULL;
    v_prev_role := NULL;
    v_new_status := 'active';
    v_new_role := v_target_role_enum;
    v_changed := true;
    v_seat_delta := 1;

  ELSIF _operation = 'change_role' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'revoked' THEN
      RAISE EXCEPTION 'change_role_not_permitted_on_revoked' USING ERRCODE='22023';
    END IF;
    IF v_prev_role = v_target_role_enum THEN
      v_new_role := v_prev_role; v_new_status := v_prev_status;
      v_changed := false; v_seat_delta := 0;
    ELSE
      v_new_role := v_target_role_enum; v_new_status := v_prev_status;
      v_changed := true; v_seat_delta := 0;
    END IF;

  ELSIF _operation = 'suspend' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'suspended' THEN
      v_new_status := 'suspended'; v_new_role := v_prev_role;
      v_changed := false; v_seat_delta := 0;
    ELSIF v_prev_status = 'active' THEN
      v_new_status := 'suspended'; v_new_role := v_prev_role;
      v_changed := true; v_seat_delta := -1;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_suspended' USING ERRCODE='22023';
    END IF;

  ELSIF _operation = 'reactivate' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'active' THEN
      v_new_status := 'active'; v_new_role := v_prev_role;
      v_changed := false; v_seat_delta := 0;
    ELSIF v_prev_status = 'suspended' THEN
      v_new_status := 'active'; v_new_role := v_prev_role;
      v_changed := true; v_seat_delta := 1;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_active' USING ERRCODE='22023';
    END IF;

  ELSIF _operation = 'revoke' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'revoked' THEN
      v_new_status := 'revoked'; v_new_role := v_prev_role;
      v_changed := false; v_seat_delta := 0;
    ELSIF v_prev_status IN ('active','invited') THEN
      v_new_status := 'revoked'; v_new_role := v_prev_role;
      v_changed := true; v_seat_delta := -1;
    ELSIF v_prev_status = 'suspended' THEN
      v_new_status := 'revoked'; v_new_role := v_prev_role;
      v_changed := true; v_seat_delta := 0;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_revoked' USING ERRCODE='22023';
    END IF;
  END IF;

  -- (H+I) Enforcement — only positive delta calls the commercial resolver.
  IF v_seat_delta = 1 THEN
    v_decision := public.resolve_commercial_seat_decision(
      _actor_user_id,
      _tenant_id,
      _tenant_origin,
      1
    );
    IF v_decision IS NULL OR (v_decision->>'allowed') IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'commercial_seat_limit_denied'
        USING ERRCODE = 'P0001',
              DETAIL = v_decision::text;
    END IF;
  END IF;

  -- (K) Apply DML — only after enforcement.
  IF _operation = 'create_membership' THEN
    INSERT INTO public.tenant_members (
      tenant_id, user_id, tenant_role, membership_status,
      is_owner, is_default, joined_at, invited_at, accepted_at, updated_at
    ) VALUES (
      _tenant_id, _target_user_id, v_new_role, 'active',
      false, false, now(), NULL, now(), now()
    );
  ELSIF _operation = 'change_role' AND v_changed THEN
    UPDATE public.tenant_members
       SET tenant_role = v_new_role, updated_at = now()
     WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
  ELSIF _operation = 'suspend' AND v_changed THEN
    UPDATE public.tenant_members
       SET membership_status = 'suspended', suspended_at = now(), updated_at = now()
     WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
  ELSIF _operation = 'reactivate' AND v_changed THEN
    UPDATE public.tenant_members
       SET membership_status = 'active',
           suspended_at = NULL,
           accepted_at = COALESCE(accepted_at, now()),
           updated_at = now()
     WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
  ELSIF _operation = 'revoke' AND v_changed THEN
    UPDATE public.tenant_members
       SET membership_status = 'revoked', revoked_at = now(), updated_at = now()
     WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
  END IF;

  -- (L) DTO (unchanged whitelist)
  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'targetUserId', _target_user_id::text,
    'operation', _operation,
    'changed', v_changed,
    'previousStatus', CASE WHEN v_prev_status IS NULL THEN NULL ELSE v_prev_status::text END,
    'status', v_new_status::text,
    'previousRole', CASE WHEN v_prev_role IS NULL THEN NULL ELSE v_prev_role::text END,
    'role', v_new_role::text
  );
END;
$fn$;

-- ACL reclosure for mutate_tenant_membership.
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM sandbox_exec';
  END IF;
END
$$;
GRANT EXECUTE ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) TO service_role;

-- Reassert ACL for resolve_commercial_seat_decision (paranoid).
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid,uuid,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid,uuid,text,integer) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid,uuid,text,integer) FROM authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid,uuid,text,integer) FROM sandbox_exec';
  END IF;
END
$$;
GRANT EXECUTE ON FUNCTION public.resolve_commercial_seat_decision(uuid,uuid,text,integer) TO service_role;

-- Fail-closed ACL assertion for BOTH functions.
DO $$
DECLARE
  v_service_oid oid;
  v_fn_signature text;
  v_owner_oid oid;
  v_grantee oid;
  v_priv text;
  v_owner_has_execute boolean;
  v_service_has_execute boolean;
  v_signatures text[] := ARRAY[
    'public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text)',
    'public.resolve_commercial_seat_decision(uuid,uuid,text,integer)'
  ];
BEGIN
  SELECT oid INTO v_service_oid FROM pg_roles WHERE rolname = 'service_role';
  IF v_service_oid IS NULL THEN
    RAISE EXCEPTION 'ACL assertion failed: service_role not found';
  END IF;

  FOREACH v_fn_signature IN ARRAY v_signatures LOOP
    v_owner_has_execute := false;
    v_service_has_execute := false;

    EXECUTE format('SELECT proowner FROM pg_proc WHERE oid = %L::regprocedure', v_fn_signature)
      INTO v_owner_oid;

    FOR v_grantee, v_priv IN
      EXECUTE format(
        $q$SELECT (a).grantee, (a).privilege_type
             FROM (SELECT aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS a
                     FROM pg_proc p WHERE p.oid = %L::regprocedure) sub$q$,
        v_fn_signature
      )
    LOOP
      IF v_priv <> 'EXECUTE' THEN
        RAISE EXCEPTION 'ACL assertion failed on %: unexpected privilege %', v_fn_signature, v_priv;
      END IF;
      IF v_grantee = 0 THEN
        RAISE EXCEPTION 'ACL assertion failed on %: PUBLIC has EXECUTE', v_fn_signature;
      ELSIF v_grantee = v_owner_oid THEN
        v_owner_has_execute := true;
      ELSIF v_grantee = v_service_oid THEN
        v_service_has_execute := true;
      ELSE
        RAISE EXCEPTION 'ACL assertion failed on %: unexpected grantee % (%)', v_fn_signature, v_grantee,
          (SELECT rolname FROM pg_roles WHERE oid = v_grantee);
      END IF;
    END LOOP;

    IF NOT v_owner_has_execute THEN
      RAISE EXCEPTION 'ACL assertion failed on %: owner missing EXECUTE', v_fn_signature;
    END IF;
    IF NOT v_service_has_execute THEN
      RAISE EXCEPTION 'ACL assertion failed on %: service_role missing EXECUTE', v_fn_signature;
    END IF;
  END LOOP;
END
$$;