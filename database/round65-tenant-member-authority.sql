-- P0: active tenant Admin manages non-owner memberships. Existing ACL unchanged.
BEGIN;
-- Fail closed on absent or drifted predecessors; never recreate default PUBLIC grants.
DO $guard$ BEGIN
  IF (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = 'public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text)'::regprocedure) IS DISTINCT FROM 'baf4ab5086e44974f34be76951e7a438' THEN RAISE EXCEPTION 'P0 known routine changed: mutate_tenant_membership(uuid,uuid,text,text,uuid,text)'; END IF;
  IF (SELECT md5(prosrc) FROM pg_catalog.pg_proc WHERE oid = 'public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean)'::regprocedure) IS DISTINCT FROM '9bcf96059f20c2c10f4aad113bfab2a9' THEN RAISE EXCEPTION 'P0 known routine changed: invite_tenant_member(uuid,uuid,text,uuid,text,boolean)'; END IF;
END $guard$;
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
    RAISE EXCEPTION 'super_admin_tenant_operation_forbidden' USING ERRCODE = '42501';
  ELSE
    IF _tenant_origin IS NULL OR _tenant_origin NOT IN ('selection','single-membership') THEN
      RAISE EXCEPTION 'Regular user cannot use impersonation origin' USING ERRCODE='22023';
    END IF;
    SELECT (membership_status = 'active' AND ((tenant_role = 'owner' AND is_owner = true) OR (tenant_role = 'admin' AND is_owner = false)))
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
CREATE OR REPLACE FUNCTION public.invite_tenant_member(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _target_user_id uuid,
  _target_role text,
  _resend boolean DEFAULT false
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
  v_target_role public.tenant_role;
  v_previous_status public.membership_status;
  v_previous_role public.tenant_role;
  v_previous_is_owner boolean;
  v_row_found boolean := false;
  v_decision jsonb;
  v_now timestamptz := now();
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _target_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation', 'selection', 'single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;
  IF _target_role IS NULL OR _target_role = 'owner' THEN
    RAISE EXCEPTION 'invalid_invitation_role' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_target_role := _target_role::public.tenant_role;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'invalid_invitation_role' USING ERRCODE = '22023';
  END;

  SELECT id INTO v_locked_tenant_id
    FROM public.tenants
   WHERE id = _tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'actor_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'target_auth_user_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) INTO v_is_super;

  IF v_is_super THEN
    RAISE EXCEPTION 'super_admin_tenant_operation_forbidden' USING ERRCODE = '42501';
  ELSE
    IF _tenant_origin IS NULL OR _tenant_origin NOT IN ('selection', 'single-membership') THEN
      RAISE EXCEPTION 'regular_user_cannot_impersonate' USING ERRCODE = '42501';
    END IF;
    SELECT (membership_status = 'active' AND ((tenant_role = 'owner' AND is_owner = true) OR (tenant_role = 'admin' AND is_owner = false)))
      INTO v_actor_is_owner
      FROM public.tenant_members
     WHERE tenant_id = _tenant_id AND user_id = _actor_user_id;
    IF NOT COALESCE(v_actor_is_owner, false) THEN
      RAISE EXCEPTION 'membership_manager_required' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT membership_status, tenant_role, is_owner
    INTO v_previous_status, v_previous_role, v_previous_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   FOR UPDATE;
  v_row_found := FOUND;

  IF v_row_found AND (v_previous_role = 'owner' OR v_previous_is_owner = true) THEN
    RAISE EXCEPTION 'target_is_owner' USING ERRCODE = '22023';
  END IF;

  IF v_row_found THEN
    IF v_previous_status = 'invited' AND _resend = true THEN
      IF v_previous_role <> v_target_role THEN
        RAISE EXCEPTION 'invitation_role_mismatch' USING ERRCODE = '22023';
      END IF;
      UPDATE public.tenant_members
         SET invited_at = v_now,
             updated_at = v_now
       WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
      RETURN jsonb_build_object(
        'tenantId', _tenant_id::text,
        'targetUserId', _target_user_id::text,
        'operation', 'resend_invitation',
        'changed', true,
        'previousStatus', 'invited',
        'status', 'invited',
        'previousRole', v_previous_role::text,
        'role', v_previous_role::text,
        'invitedAt', v_now
      );
    END IF;
    IF v_previous_status = 'invited' THEN
      RAISE EXCEPTION 'membership_invitation_already_exists' USING ERRCODE = '23505';
    ELSIF v_previous_status = 'revoked' THEN
      RAISE EXCEPTION 'revoked_membership_requires_explicit_recovery' USING ERRCODE = '22023';
    ELSE
      RAISE EXCEPTION 'membership_already_exists' USING ERRCODE = '23505';
    END IF;
  END IF;

  v_decision := public.resolve_commercial_seat_decision(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    1
  );
  IF v_decision IS NULL OR (v_decision->>'allowed') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'commercial_seat_limit_denied'
      USING ERRCODE = 'P0001', DETAIL = v_decision::text;
  END IF;

  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    tenant_role,
    membership_status,
    is_owner,
    is_default,
    joined_at,
    invited_at,
    accepted_at,
    suspended_at,
    revoked_at,
    updated_at
  ) VALUES (
    _tenant_id,
    _target_user_id,
    v_target_role,
    'invited',
    false,
    false,
    v_now,
    v_now,
    NULL,
    NULL,
    NULL,
    v_now
  );

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'targetUserId', _target_user_id::text,
    'operation', 'invite',
    'changed', true,
    'previousStatus', NULL,
    'status', 'invited',
    'previousRole', NULL,
    'role', v_target_role::text,
    'invitedAt', v_now
  );
END;
$fn$;
COMMIT;
