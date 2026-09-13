-- Exact canonical functions inspected before this corrective. No commercial records changed.
BEGIN;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS activation_delivery_status text
  CHECK (activation_delivery_status IN ('pending','sent','failed'));
ALTER TABLE public.rbac_profiles ADD COLUMN IF NOT EXISTS template_source_id uuid REFERENCES public.rbac_profiles(id);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_custom_template_once ON public.rbac_profiles(tenant_id,template_source_id)
  WHERE template_source_id IS NOT NULL;
CREATE SCHEMA IF NOT EXISTS tenant_directory_private;
REVOKE ALL ON SCHEMA tenant_directory_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA tenant_directory_private TO authenticated,service_role;
CREATE OR REPLACE FUNCTION tenant_directory_private.is_platform_identity(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user AND role='super_admin')
$$;
REVOKE ALL ON FUNCTION tenant_directory_private.is_platform_identity(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION tenant_directory_private.is_platform_identity(uuid) TO authenticated,service_role;
CREATE POLICY operational_directory_only ON public.tenant_members AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT tenant_directory_private.is_platform_identity(user_id))
  WITH CHECK (NOT tenant_directory_private.is_platform_identity(user_id));
CREATE POLICY operational_directory_only ON public.user_profiles AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT tenant_directory_private.is_platform_identity(user_id))
  WITH CHECK (NOT tenant_directory_private.is_platform_identity(user_id));
CREATE POLICY operational_directory_only ON public.team_members AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT tenant_directory_private.is_platform_identity(user_id))
  WITH CHECK (NOT tenant_directory_private.is_platform_identity(user_id));

CREATE OR REPLACE FUNCTION public.assert_tenant_access_manager(_actor_user_id uuid, _tenant_id uuid, _tenant_origin text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_super boolean;
  v_role public.tenant_role;
  v_status public.membership_status;
  v_is_owner boolean;
  v_decision jsonb;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) INTO v_is_super;
  IF v_is_super OR _tenant_origin IS NULL OR _tenant_origin NOT IN ('selection','single-membership') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
  END IF;

  SELECT tenant_role, membership_status, is_owner
    INTO v_role, v_status, v_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _actor_user_id;

  IF FOUND AND v_status = 'active' AND v_role = 'owner' AND v_is_owner = true THEN
    RETURN 'owner';
  END IF;

  IF FOUND AND v_status = 'active' AND v_role = 'admin' AND v_is_owner = false THEN
    RETURN 'admin';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin, 'access_control', 'gerenciar'
  );
  IF (v_decision->>'allowed') = 'true' AND (v_decision->>'scope') = 'global' THEN
    RETURN 'delegated';
  END IF;

  RAISE EXCEPTION 'tenant_access_manager_required' USING ERRCODE = '42501';
END;
$function$;

CREATE OR REPLACE FUNCTION public.invite_tenant_member(_actor_user_id uuid, _tenant_id uuid, _tenant_origin text, _target_user_id uuid, _target_role text, _resend boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF v_is_super OR _tenant_origin IS NULL OR _tenant_origin NOT IN ('selection','single-membership') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
  END IF;
  SELECT membership_status='active' AND ((tenant_role='owner' AND is_owner) OR (tenant_role='admin' AND NOT is_owner))
    INTO v_actor_is_owner FROM public.tenant_members
    WHERE tenant_id=_tenant_id AND user_id=_actor_user_id;
  IF NOT COALESCE(v_actor_is_owner,false) THEN
    RAISE EXCEPTION 'membership_manager_required' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='super_admin') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
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
      IF EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id=_tenant_id AND user_id=_target_user_id
          AND invited_at > now()-interval '60 seconds') THEN
        RAISE EXCEPTION 'registration_retry_later' USING ERRCODE='22023';
      END IF;
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
$function$;

CREATE OR REPLACE FUNCTION public.mutate_tenant_membership(_actor_user_id uuid, _tenant_id uuid, _tenant_origin text, _operation text, _target_user_id uuid, _target_role text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  IF v_is_super OR _tenant_origin IS NULL OR _tenant_origin NOT IN ('selection','single-membership') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
  END IF;
  SELECT membership_status='active' AND ((tenant_role='owner' AND is_owner) OR (tenant_role='admin' AND NOT is_owner))
    INTO v_actor_is_owner FROM public.tenant_members
    WHERE tenant_id=_tenant_id AND user_id=_actor_user_id;
  IF NOT COALESCE(v_actor_is_owner,false) THEN
    RAISE EXCEPTION 'membership_manager_required' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='super_admin') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
  END IF;

  IF _actor_user_id = _target_user_id OR _operation='create_membership' THEN
    RAISE EXCEPTION 'use_configured_registration_or_another_manager' USING ERRCODE='42501';
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
$function$;

CREATE OR REPLACE FUNCTION public.set_tenant_member_profiles(_actor_user_id uuid, _tenant_id uuid, _tenant_origin text, _target_user_id uuid, _profile_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_locked_tenant uuid;
  v_actor_kind text;
  v_target_role public.tenant_role;
  v_target_status public.membership_status;
  v_target_is_owner boolean;
  v_expected integer;
  v_valid integer;
  r record;
  v_decision jsonb;
  v_actor_rank integer;
  v_required_rank integer;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  v_actor_kind := public.assert_tenant_access_manager(_actor_user_id, _tenant_id, _tenant_origin);

  IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_target_user_id AND role='super_admin') THEN
    RAISE EXCEPTION 'platform_identity_not_operational' USING ERRCODE='42501';
  END IF;
  SELECT tenant_role, membership_status, is_owner
    INTO v_target_role, v_target_status, v_target_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   FOR UPDATE;
  IF NOT FOUND OR v_target_status = 'revoked' THEN
    RAISE EXCEPTION 'target_membership_invalid' USING ERRCODE = '22023';
  END IF;
  IF v_target_role = 'owner' OR v_target_is_owner = true THEN
    RAISE EXCEPTION 'owner_profiles_are_not_mutable' USING ERRCODE = '42501';
  END IF;
  IF v_actor_kind = 'delegated' AND _target_user_id = _actor_user_id THEN
    RAISE EXCEPTION 'delegated_manager_cannot_change_own_profiles' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_expected FROM (SELECT DISTINCT unnest(COALESCE(_profile_ids, ARRAY[]::uuid[]))) x;
  SELECT count(*) INTO v_valid
    FROM public.rbac_profiles p
   WHERE p.id = ANY(COALESCE(_profile_ids, ARRAY[]::uuid[]))
     AND ((p.sistema = true AND p.tenant_id IS NULL) OR p.tenant_id = _tenant_id);
  IF v_expected <> v_valid THEN
    RAISE EXCEPTION 'cross_tenant_or_unknown_profile' USING ERRCODE = '42501';
  END IF;

  IF v_actor_kind = 'delegated' THEN
    FOR r IN
      SELECT rm.codigo AS module_code, rp.action, rp.scope
        FROM public.rbac_permissions rp
        JOIN public.rbac_modules rm ON rm.id = rp.module_id
       WHERE rp.profile_id = ANY(COALESCE(_profile_ids, ARRAY[]::uuid[]))
    LOOP
      IF r.module_code = 'access_control' AND r.action = 'gerenciar' THEN
        RAISE EXCEPTION 'owner_required_for_access_control_grant' USING ERRCODE = '42501';
      END IF;
      v_decision := public.resolve_tenant_permission(
        _actor_user_id, _tenant_id, _tenant_origin, r.module_code, r.action
      );
      v_actor_rank := CASE v_decision->>'scope' WHEN 'global' THEN 3 WHEN 'equipe' THEN 2 WHEN 'proprio' THEN 1 ELSE 0 END;
      v_required_rank := CASE r.scope WHEN 'global' THEN 3 WHEN 'equipe' THEN 2 ELSE 1 END;
      IF (v_decision->>'allowed') IS DISTINCT FROM 'true' OR v_required_rank > v_actor_rank THEN
        RAISE EXCEPTION 'profile_assignment_escalation_denied' USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;

  DELETE FROM public.user_profiles
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id;

  INSERT INTO public.user_profiles (tenant_id, user_id, profile_id)
  SELECT _tenant_id, _target_user_id, profile_id
    FROM (SELECT DISTINCT unnest(COALESCE(_profile_ids, ARRAY[]::uuid[])) AS profile_id) x;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_access.member_profiles.set',
    'user_profiles',
    _target_user_id::text,
    jsonb_build_object('profileIds', COALESCE(to_jsonb(_profile_ids), '[]'::jsonb))
  );

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'targetUserId', _target_user_id::text,
    'profileIds', COALESCE(to_jsonb(_profile_ids), '[]'::jsonb),
    'changed', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(_actor_user_id uuid, _tenant_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_locked_tenant_id uuid;
  v_role public.tenant_role;
  v_status public.membership_status;
  v_is_owner boolean;
  v_invited_at timestamptz;
  v_now timestamptz := now();
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invitation_acceptance_context' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'actor_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=_actor_user_id AND email_confirmed_at IS NOT NULL)
      OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_actor_user_id AND role='super_admin') THEN
    RAISE EXCEPTION 'verified_operational_identity_required' USING ERRCODE='42501';
  END IF;

  SELECT id INTO v_locked_tenant_id
    FROM public.tenants
   WHERE id = _tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found_or_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT tenant_role, membership_status, is_owner, invited_at
    INTO v_role, v_status, v_is_owner, v_invited_at
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _actor_user_id
   FOR UPDATE;

  IF NOT FOUND OR v_status <> 'invited' OR v_is_owner = true OR v_role = 'owner' THEN
    RAISE EXCEPTION 'invitation_not_found_or_invalid' USING ERRCODE = '22023';
  END IF;

  IF v_invited_at IS NULL OR v_invited_at < now()-interval '7 days' THEN
    RAISE EXCEPTION 'registration_expired' USING ERRCODE='22023';
  END IF;
  UPDATE public.tenant_members
     SET membership_status = 'active',
         accepted_at = v_now,
         joined_at = v_now,
         suspended_at = NULL,
         revoked_at = NULL,
         updated_at = v_now
   WHERE tenant_id = _tenant_id
     AND user_id = _actor_user_id
     AND membership_status = 'invited';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invitation_not_found_or_invalid' USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'userId', _actor_user_id::text,
    'status', 'active',
    'role', v_role::text,
    'invitedAt', v_invited_at,
    'acceptedAt', v_now,
    'joinedAt', v_now
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.preflight_tenant_member_registration(
 _actor uuid,_tenant uuid,_origin text,_profiles uuid[],_resend boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_kind text; v_decision jsonb; v_count integer;
BEGIN
 v_kind:=public.assert_tenant_access_manager(_actor,_tenant,_origin);
 IF v_kind NOT IN ('owner','admin') THEN RAISE EXCEPTION 'membership_manager_required' USING ERRCODE='42501'; END IF;
 IF NOT _resend THEN
   IF cardinality(_profiles) IS NULL OR cardinality(_profiles)<1 OR cardinality(_profiles)>20 THEN
     RAISE EXCEPTION 'registration_profiles_required' USING ERRCODE='22023'; END IF;
   SELECT count(DISTINCT p.id) INTO v_count FROM public.rbac_profiles p WHERE p.id=ANY(_profiles)
     AND ((p.sistema AND p.tenant_id IS NULL) OR p.tenant_id=_tenant);
   IF v_count<>(SELECT count(DISTINCT id) FROM unnest(_profiles) id) THEN
     RAISE EXCEPTION 'cross_tenant_or_unknown_profile' USING ERRCODE='42501'; END IF;
   v_decision:=public.resolve_commercial_seat_decision(_actor,_tenant,_origin,1);
   IF (v_decision->>'allowed') IS DISTINCT FROM 'true' THEN
     RAISE EXCEPTION 'commercial_seat_limit_denied' USING ERRCODE='P0001',DETAIL=v_decision::text; END IF;
 END IF;
 RETURN jsonb_build_object('allowed',true);
END $$;

CREATE OR REPLACE FUNCTION public.configure_tenant_member_registration(
 _actor uuid,_tenant uuid,_origin text,_target uuid,_role text,_name text,_profiles uuid[],_resend boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_result jsonb;
BEGIN
 PERFORM 1 FROM public.tenants WHERE id=_tenant FOR UPDATE;
 PERFORM public.preflight_tenant_member_registration(_actor,_tenant,_origin,_profiles,_resend);
 IF NOT _resend AND (NULLIF(trim(_name),'') IS NULL OR length(trim(_name))<2 OR length(trim(_name))>160) THEN
   RAISE EXCEPTION 'registration_name_required' USING ERRCODE='22023'; END IF;
 v_result:=public.invite_tenant_member(_actor,_tenant,_origin,_target,_role,_resend);
 IF NOT _resend THEN
   PERFORM public.set_tenant_member_profiles(_actor,_tenant,_origin,_target,_profiles);
   UPDATE public.tenant_members SET display_name=trim(_name) WHERE tenant_id=_tenant AND user_id=_target;
 END IF;
 UPDATE public.tenant_members SET activation_delivery_status='pending' WHERE tenant_id=_tenant AND user_id=_target;
 INSERT INTO public.audit_log(tenant_id,user_id,action,entity,entity_id,after)
 VALUES(_tenant,_actor,'tenant_user.registration.configure','tenant_members',_target::text,
   jsonb_build_object('resend',_resend,'profileIds',CASE WHEN _resend THEN NULL ELSE to_jsonb(_profiles) END));
 RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.customize_tenant_access_profile(
 _actor uuid,_tenant uuid,_origin text,_source uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_source public.rbac_profiles%ROWTYPE; v_id uuid; r record; v_created jsonb;
BEGIN
 PERFORM 1 FROM public.tenants WHERE id=_tenant FOR UPDATE;
 PERFORM public.assert_tenant_access_manager(_actor,_tenant,_origin);
 SELECT * INTO v_source FROM public.rbac_profiles
   WHERE id=_source AND ((sistema AND tenant_id IS NULL) OR tenant_id=_tenant);
 IF NOT FOUND THEN RAISE EXCEPTION 'tenant_profile_not_found' USING ERRCODE='42501'; END IF;
 IF NOT v_source.sistema THEN RETURN jsonb_build_object('profileId',v_source.id); END IF;
 SELECT id INTO v_id FROM public.rbac_profiles WHERE tenant_id=_tenant AND template_source_id=_source AND NOT sistema;
 IF FOUND THEN RETURN jsonb_build_object('profileId',v_id); END IF;
 v_created:=public.mutate_tenant_access_profile(_actor,_tenant,_origin,'create',NULL,left(v_source.nome||' — personalizado',120),v_source.descricao);
 v_id:=(v_created->>'profileId')::uuid;
 UPDATE public.rbac_profiles SET template_source_id=_source WHERE id=v_id AND tenant_id=_tenant;
 FOR r IN SELECT module_id,action,scope FROM public.rbac_permissions WHERE profile_id=_source LOOP
   PERFORM public.set_tenant_profile_permission(_actor,_tenant,_origin,v_id,r.module_id,r.action,r.scope,true);
 END LOOP;
 RETURN jsonb_build_object('profileId',v_id);
END $$;

REVOKE ALL ON FUNCTION public.preflight_tenant_member_registration(uuid,uuid,text,uuid[],boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.configure_tenant_member_registration(uuid,uuid,text,uuid,text,text,uuid[],boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.customize_tenant_access_profile(uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.preflight_tenant_member_registration(uuid,uuid,text,uuid[],boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.configure_tenant_member_registration(uuid,uuid,text,uuid,text,text,uuid[],boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.customize_tenant_access_profile(uuid,uuid,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text), public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean), public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text), public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[]), public.accept_tenant_invitation(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text), public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean), public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text), public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[]), public.accept_tenant_invitation(uuid,uuid) TO service_role;
COMMIT;
