-- SCP-012.0.3 — Membership Mutation Boundary Primitive
-- Fail-closed service_role-only RPC for canonical membership mutations.
-- No lock. No commercial enforcement. No physical delete. No owner mutation.

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
BEGIN
  -- (1) Parameter validation
  IF _actor_user_id IS NULL THEN RAISE EXCEPTION 'Invalid actor' USING ERRCODE='22023'; END IF;
  IF _tenant_id IS NULL THEN RAISE EXCEPTION 'Invalid tenant' USING ERRCODE='22023'; END IF;
  IF _target_user_id IS NULL THEN RAISE EXCEPTION 'Invalid target' USING ERRCODE='22023'; END IF;
  IF _tenant_origin NOT IN ('impersonation','selection','single-membership') THEN
    RAISE EXCEPTION 'Invalid tenant origin' USING ERRCODE='22023';
  END IF;
  IF _operation NOT IN ('create_membership','change_role','suspend','reactivate','revoke') THEN
    RAISE EXCEPTION 'Invalid operation' USING ERRCODE='22023';
  END IF;

  -- (2) Actor & tenant existence
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'Actor not found' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found' USING ERRCODE='22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'Target not found' USING ERRCODE='22023';
  END IF;

  -- (3) Trusted Actor Context revalidation
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
    -- must be owner of this tenant, active
    SELECT (tenant_role = 'owner' AND membership_status = 'active' AND is_owner = true)
      INTO v_actor_is_owner
      FROM public.tenant_members
     WHERE tenant_id = _tenant_id AND user_id = _actor_user_id
     LIMIT 1;
    IF NOT COALESCE(v_actor_is_owner, false) THEN
      RAISE EXCEPTION 'Actor not authorized' USING ERRCODE='42501';
    END IF;
  END IF;

  -- (4) Validate targetRole when applicable
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

  -- (5) Load existing membership row (if any)
  SELECT membership_status, tenant_role, is_owner
    INTO v_prev_status, v_prev_role, v_prev_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _target_user_id
   LIMIT 1;
  v_row_found := FOUND;

  -- (6) Owner protection: any existing owner row is untouchable in this boundary
  IF v_row_found AND (v_prev_role = 'owner' OR v_prev_is_owner = true) THEN
    RAISE EXCEPTION 'Target is owner; owner mutation not permitted' USING ERRCODE='22023';
  END IF;

  -- (7) Operation dispatch
  IF _operation = 'create_membership' THEN
    IF v_row_found THEN
      RAISE EXCEPTION 'membership_already_exists' USING ERRCODE='23505';
    END IF;
    INSERT INTO public.tenant_members (
      tenant_id, user_id, tenant_role, membership_status,
      is_owner, is_default, joined_at, invited_at, accepted_at, updated_at
    ) VALUES (
      _tenant_id, _target_user_id, v_target_role_enum, 'active',
      false, false, now(), NULL, now(), now()
    );
    v_new_status := 'active';
    v_new_role := v_target_role_enum;
    v_changed := true;
    v_prev_status := NULL;
    v_prev_role := NULL;

  ELSIF _operation = 'change_role' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'revoked' THEN
      RAISE EXCEPTION 'change_role_not_permitted_on_revoked' USING ERRCODE='22023';
    END IF;
    IF v_prev_role = v_target_role_enum THEN
      v_new_role := v_prev_role;
      v_new_status := v_prev_status;
      v_changed := false;
    ELSE
      UPDATE public.tenant_members
         SET tenant_role = v_target_role_enum, updated_at = now()
       WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
      v_new_role := v_target_role_enum;
      v_new_status := v_prev_status;
      v_changed := true;
    END IF;

  ELSIF _operation = 'suspend' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'suspended' THEN
      v_new_status := 'suspended';
      v_new_role := v_prev_role;
      v_changed := false;
    ELSIF v_prev_status = 'active' THEN
      UPDATE public.tenant_members
         SET membership_status = 'suspended', suspended_at = now(), updated_at = now()
       WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
      v_new_status := 'suspended';
      v_new_role := v_prev_role;
      v_changed := true;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_suspended' USING ERRCODE='22023';
    END IF;

  ELSIF _operation = 'reactivate' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'active' THEN
      v_new_status := 'active';
      v_new_role := v_prev_role;
      v_changed := false;
    ELSIF v_prev_status = 'suspended' THEN
      UPDATE public.tenant_members
         SET membership_status = 'active',
             suspended_at = NULL,
             accepted_at = COALESCE(accepted_at, now()),
             updated_at = now()
       WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
      v_new_status := 'active';
      v_new_role := v_prev_role;
      v_changed := true;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_active' USING ERRCODE='22023';
    END IF;

  ELSIF _operation = 'revoke' THEN
    IF NOT v_row_found THEN
      RAISE EXCEPTION 'membership_not_found' USING ERRCODE='22023';
    END IF;
    IF v_prev_status = 'revoked' THEN
      v_new_status := 'revoked';
      v_new_role := v_prev_role;
      v_changed := false;
    ELSIF v_prev_status IN ('active','invited','suspended') THEN
      UPDATE public.tenant_members
         SET membership_status = 'revoked', revoked_at = now(), updated_at = now()
       WHERE tenant_id = _tenant_id AND user_id = _target_user_id;
      v_new_status := 'revoked';
      v_new_role := v_prev_role;
      v_changed := true;
    ELSE
      RAISE EXCEPTION 'invalid_transition_to_revoked' USING ERRCODE='22023';
    END IF;
  END IF;

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

-- (ACL) fail-closed: only service_role executes
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) TO service_role;

-- Revoke from sandbox_exec if it exists (must not silently swallow)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM sandbox_exec';
  END IF;
END $$;

-- (Invariant enforcement) — align real grants on tenant_members with the
-- SCP-012.0.3 stated invariant: authenticated may only SELECT. RLS already
-- restricts writes to super_admin, but table-level grants were broader.
REVOKE INSERT, UPDATE, DELETE ON public.tenant_members FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.tenant_members FROM anon;
GRANT SELECT ON public.tenant_members TO authenticated;
GRANT ALL ON public.tenant_members TO service_role;

-- (Assertion) — verify no unexpected grantee retains EXECUTE
DO $assert$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(grantee, ',') INTO v_bad
  FROM information_schema.routine_privileges
  WHERE routine_schema = 'public'
    AND routine_name = 'mutate_tenant_membership'
    AND privilege_type = 'EXECUTE'
    AND grantee NOT IN ('service_role', 'postgres', 'supabase_admin');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'ACL breach: unexpected EXECUTE grantee(s): %', v_bad;
  END IF;
END
$assert$;