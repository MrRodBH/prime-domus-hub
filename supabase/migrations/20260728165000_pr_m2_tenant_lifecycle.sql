-- PR-M2 — Tenant Lifecycle, Atomic Bootstrap, Invitations & Ownership
-- Specialized service_role-only primitives. Existing mutate_tenant_membership
-- remains the sole authority for change_role/suspend/reactivate/revoke.

CREATE OR REPLACE FUNCTION public.bootstrap_tenant_with_owner(
  _actor_user_id uuid,
  _slug text,
  _name text,
  _owner_user_id uuid,
  _initial_status text DEFAULT 'trial'
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_slug text := lower(trim(_slug));
  v_name text := trim(_name);
  v_tenant_id uuid;
  v_now timestamptz := now();
  v_owner_count integer;
BEGIN
  IF _actor_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_actor' USING ERRCODE = '22023';
  END IF;
  IF _owner_user_id IS NULL THEN
    RAISE EXCEPTION 'initial_owner_required' USING ERRCODE = '22023';
  END IF;
  IF v_slug IS NULL OR length(v_slug) < 2 OR length(v_slug) > 63
     OR v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'invalid_tenant_slug' USING ERRCODE = '22023';
  END IF;
  IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 160 THEN
    RAISE EXCEPTION 'invalid_tenant_name' USING ERRCODE = '22023';
  END IF;
  IF _initial_status NOT IN ('trial', 'ativo') THEN
    RAISE EXCEPTION 'invalid_initial_status' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = _actor_user_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'super_admin_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _owner_user_id) THEN
    RAISE EXCEPTION 'owner_auth_user_not_found' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'tenant_slug_already_exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.tenants (
    slug,
    nome,
    status,
    dominio_principal,
    owner_user_id,
    metadata
  ) VALUES (
    v_slug,
    v_name,
    _initial_status,
    NULL,
    _owner_user_id,
    jsonb_build_object(
      'onboarding', jsonb_build_object(
        'state', 'owner_initialized',
        'owner_initialized_at', v_now,
        'domain_activation', 'pending_dca_01',
        'membership_setup', 'ready'
      )
    )
  )
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_members (
    tenant_id,
    user_id,
    is_owner,
    is_default,
    joined_at,
    tenant_role,
    membership_status,
    invited_at,
    accepted_at,
    suspended_at,
    revoked_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    _owner_user_id,
    true,
    true,
    v_now,
    'owner',
    'active',
    NULL,
    v_now,
    NULL,
    NULL,
    v_now
  );

  SELECT count(*)::integer INTO v_owner_count
    FROM public.tenant_members
   WHERE tenant_id = v_tenant_id
     AND is_owner = true
     AND tenant_role = 'owner'
     AND membership_status = 'active';

  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION 'owner_initialization_invariant_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'tenantId', v_tenant_id::text,
    'slug', v_slug,
    'name', v_name,
    'status', _initial_status,
    'ownerUserId', _owner_user_id::text,
    'onboardingState', 'owner_initialized',
    'domainActivation', 'pending_dca_01'
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'tenant_slug_already_exists' USING ERRCODE = '23505';
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
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'super_admin_requires_impersonation' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF _tenant_origin NOT IN ('selection', 'single-membership') THEN
      RAISE EXCEPTION 'regular_user_cannot_impersonate' USING ERRCODE = '42501';
    END IF;
    SELECT (tenant_role = 'owner' AND membership_status = 'active' AND is_owner = true)
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

CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(
  _actor_user_id uuid,
  _tenant_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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
$fn$;

CREATE OR REPLACE FUNCTION public.transfer_tenant_ownership(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _target_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant_id uuid;
  v_tenant_owner_user_id uuid;
  v_is_super boolean;
  v_actor_is_owner boolean := false;
  v_owner_ids uuid[];
  v_owner_count integer;
  v_current_owner_id uuid;
  v_target_status public.membership_status;
  v_target_role public.tenant_role;
  v_target_is_owner boolean;
  v_now timestamptz := now();
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _target_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_ownership_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation', 'selection', 'single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;

  SELECT id, owner_user_id
    INTO v_locked_tenant_id, v_tenant_owner_user_id
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
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'super_admin_requires_impersonation' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF _tenant_origin NOT IN ('selection', 'single-membership') THEN
      RAISE EXCEPTION 'regular_user_cannot_impersonate' USING ERRCODE = '42501';
    END IF;
    SELECT (tenant_role = 'owner' AND membership_status = 'active' AND is_owner = true)
      INTO v_actor_is_owner
      FROM public.tenant_members
     WHERE tenant_id = _tenant_id AND user_id = _actor_user_id;
    IF NOT COALESCE(v_actor_is_owner, false) THEN
      RAISE EXCEPTION 'current_owner_required' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT array_agg(user_id ORDER BY user_id), count(*)::integer
    INTO v_owner_ids, v_owner_count
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id
     AND tenant_role = 'owner'
     AND is_owner = true
     AND membership_status = 'active';

  IF v_owner_count <> 1 OR cardinality(v_owner_ids) <> 1 THEN
    RAISE EXCEPTION 'owner_cardinality_invalid' USING ERRCODE = 'P0001';
  END IF;
  v_current_owner_id := v_owner_ids[1];

  IF v_tenant_owner_user_id IS NULL OR v_tenant_owner_user_id <> v_current_owner_id THEN
    RAISE EXCEPTION 'tenant_owner_reference_inconsistent' USING ERRCODE = 'P0001';
  END IF;
  IF _target_user_id = v_current_owner_id THEN
    RAISE EXCEPTION 'target_already_owner' USING ERRCODE = '22023';
  END IF;

  SELECT membership_status, tenant_role, is_owner
    INTO v_target_status, v_target_role, v_target_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   FOR UPDATE;

  IF NOT FOUND OR v_target_status <> 'active' OR v_target_is_owner = true OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'target_must_be_active_non_owner_member' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tenant_members
     SET tenant_role = 'admin',
         is_owner = false,
         is_default = false,
         updated_at = v_now
   WHERE tenant_id = _tenant_id AND user_id = v_current_owner_id;

  UPDATE public.tenant_members
     SET tenant_role = 'owner',
         is_owner = true,
         is_default = true,
         updated_at = v_now
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id;

  UPDATE public.tenants
     SET owner_user_id = _target_user_id,
         updated_at = v_now
   WHERE id = _tenant_id;

  SELECT count(*)::integer INTO v_owner_count
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id
     AND tenant_role = 'owner'
     AND is_owner = true
     AND membership_status = 'active';
  IF v_owner_count <> 1 THEN
    RAISE EXCEPTION 'owner_transfer_invariant_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'previousOwnerUserId', v_current_owner_id::text,
    'ownerUserId', _target_user_id::text,
    'previousOwnerRole', 'admin',
    'ownerRole', 'owner',
    'changed', true,
    'transferredAt', v_now
  );
END;
$fn$;

-- Application trust boundary: owner + service_role only.
REVOKE ALL ON FUNCTION public.bootstrap_tenant_with_owner(uuid,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_tenant_invitation(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_tenant_ownership(uuid,uuid,text,uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bootstrap_tenant_with_owner(uuid,text,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_tenant_ownership(uuid,uuid,text,uuid) TO service_role;

DO $acl$
DECLARE
  v_signature text;
  v_bad text;
  v_signatures text[] := ARRAY[
    'public.bootstrap_tenant_with_owner(uuid,text,text,uuid,text)',
    'public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean)',
    'public.accept_tenant_invitation(uuid,uuid)',
    'public.transfer_tenant_ownership(uuid,uuid,text,uuid)'
  ];
BEGIN
  FOREACH v_signature IN ARRAY v_signatures LOOP
    EXECUTE format(
      $sql$
      SELECT string_agg(COALESCE(r.rolname, 'PUBLIC'), ',')
        FROM pg_proc p
        CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        LEFT JOIN pg_roles r ON r.oid = a.grantee
       WHERE p.oid = %L::regprocedure
         AND a.privilege_type = 'EXECUTE'
         AND a.grantee NOT IN (p.proowner, (SELECT oid FROM pg_roles WHERE rolname = 'service_role'))
      $sql$,
      v_signature
    ) INTO v_bad;
    IF v_bad IS NOT NULL THEN
      RAISE EXCEPTION 'tenant lifecycle ACL breach on %: %', v_signature, v_bad;
    END IF;
  END LOOP;
END
$acl$;
