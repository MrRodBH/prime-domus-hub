-- PCA-07R2 — forensic forward-only W1 ledger reconciliation.
-- Repository artifact only until a separate Owner-authorized Lovable execution gate.
-- One top-level DO statement: no W1 DDL/DML replay and no blind migration repair.
DO $pca07r2$
DECLARE
  v_lifecycle_source text := $pca07r2_lifecycle$
-- PR-M2 — Tenant Lifecycle, Atomic Bootstrap, Invitations & Ownership
-- Specialized service_role-only primitives. Existing mutate_tenant_membership
-- remains the sole authority for change_role/suspend/reactivate/revoke.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS prm2_rebaseline;
REVOKE ALL ON SCHEMA prm2_rebaseline FROM PUBLIC, anon, authenticated, service_role;

-- PCA-04: repository migrations are structural by default. Historical tenant
-- data is selected only when the migration session carries an exact UUID list,
-- its deterministic SHA-256 and the Owner authorization reference. No setting
-- means an empty set; names, prefixes and broad tenant queries are never used.
CREATE OR REPLACE FUNCTION prm2_rebaseline.authorized_tenant_ids()
RETURNS TABLE (tenant_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $manifest$
DECLARE
  v_raw text := current_setting('app.pr_m2_authorized_tenant_ids', true);
  v_expected_hash text := lower(current_setting('app.pr_m2_authorized_tenant_manifest_sha256', true));
  v_authorization text := current_setting('app.pr_m2_owner_authorization', true);
  v_manifest jsonb;
  v_actual_hash text;
BEGIN
  IF v_raw IS NULL OR btrim(v_raw) IN ('', '[]') THEN
    RETURN;
  END IF;

  IF v_authorization IS NULL OR v_authorization !~ '^PCA-[0-9A-Z_-]{3,120}$' THEN
    RAISE EXCEPTION 'pr_m2_owner_authorization_required' USING ERRCODE = '42501';
  END IF;
  IF v_expected_hash IS NULL OR v_expected_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'pr_m2_manifest_sha256_required' USING ERRCODE = '22023';
  END IF;

  BEGIN
    v_manifest := v_raw::jsonb;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'pr_m2_manifest_invalid_json' USING ERRCODE = '22023';
  END;
  IF jsonb_typeof(v_manifest) <> 'array' OR jsonb_array_length(v_manifest) = 0 THEN
    RAISE EXCEPTION 'pr_m2_manifest_nonempty_array_required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(v_manifest) entry
     WHERE jsonb_typeof(entry) <> 'string'
        OR trim(both '"' from entry::text) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'pr_m2_manifest_uuid_only' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*) <> count(DISTINCT value::uuid)
      FROM jsonb_array_elements_text(v_manifest) AS entry(value)
  ) THEN
    RAISE EXCEPTION 'pr_m2_manifest_duplicate_tenant_id' USING ERRCODE = '22023';
  END IF;

  SELECT encode(
           digest(string_agg(value::uuid::text, ',' ORDER BY value::uuid::text), 'sha256'),
           'hex'
         )
    INTO v_actual_hash
    FROM jsonb_array_elements_text(v_manifest) AS entry(value);
  IF v_actual_hash IS DISTINCT FROM v_expected_hash THEN
    RAISE EXCEPTION 'pr_m2_manifest_sha256_mismatch' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT value::uuid
    FROM jsonb_array_elements_text(v_manifest) AS entry(value)
   ORDER BY value;
END;
$manifest$;

REVOKE ALL ON FUNCTION prm2_rebaseline.authorized_tenant_ids()
  FROM PUBLIC, anon, authenticated, service_role;

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

COMMIT;
$pca07r2_lifecycle$;
  v_access_source text := $pca07r2_access$
-- PR-M2 — Tenant-scoped RBAC, profile assignment and team authority
-- Existing tenant_members remains the sole authority for membership role/status.
-- user_roles remains global-only and is not consulted as tenant authority.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.rbac_profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- The legacy association did not carry tenant context. Backfill is intentionally
-- fail-closed: a profile assignment is migrated only when the user has exactly
-- one non-revoked tenant membership. Ambiguous or orphan assignments require an
-- explicit data correction before this migration can be applied.
DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.user_profiles up
      LEFT JOIN public.tenant_members tm
        ON tm.user_id = up.user_id
       AND tm.membership_status <> 'revoked'
     WHERE up.tenant_id IS NULL
       AND EXISTS (
         SELECT 1
           FROM public.tenant_members authorized_membership
           JOIN prm2_rebaseline.authorized_tenant_ids() authorized
             ON authorized.tenant_id = authorized_membership.tenant_id
          WHERE authorized_membership.user_id = up.user_id
            AND authorized_membership.membership_status <> 'revoked'
       )
     GROUP BY up.id
    HAVING count(tm.tenant_id) <> 1
  ) THEN
    RAISE EXCEPTION 'tenant_access_backfill_ambiguous_or_orphan_user_profile';
  END IF;
END;
$block$;

UPDATE public.user_profiles up
   SET tenant_id = tm.tenant_id
  FROM public.tenant_members tm
 WHERE up.tenant_id IS NULL
   AND tm.user_id = up.user_id
   AND tm.membership_status <> 'revoked'
   AND EXISTS (
     SELECT 1
       FROM prm2_rebaseline.authorized_tenant_ids() authorized
      WHERE authorized.tenant_id = tm.tenant_id
   );

-- Remove legacy uniqueness rules on (user_id, profile_id). The new canonical
-- cardinality includes tenant_id. Both constraints and standalone indexes are
-- discovered structurally; no historical object name is assumed.
DO $block$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.user_profiles'::regclass
       AND c.contype = 'u'
       AND (
         (
           SELECT array_agg(a.attname::text ORDER BY x.ord)
             FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = c.conrelid
              AND a.attnum = x.attnum
         ) = ARRAY['profile_id','user_id']::text[]
         OR
         (
           SELECT array_agg(a.attname::text ORDER BY x.ord)
             FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = c.conrelid
              AND a.attnum = x.attnum
         ) = ARRAY['user_id','profile_id']::text[]
       )
  LOOP
    EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT index_class.relname AS index_name
      FROM pg_index idx
      JOIN pg_class index_class ON index_class.oid = idx.indexrelid
     WHERE idx.indrelid = 'public.user_profiles'::regclass
       AND idx.indisunique
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint c WHERE c.conindid = idx.indexrelid
       )
       AND (
         (
           SELECT array_agg(a.attname::text ORDER BY x.ord)
             FROM unnest(idx.indkey::smallint[]) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = idx.indrelid
              AND a.attnum = x.attnum
            WHERE x.attnum > 0
         ) = ARRAY['profile_id','user_id']::text[]
         OR
         (
           SELECT array_agg(a.attname::text ORDER BY x.ord)
             FROM unnest(idx.indkey::smallint[]) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = idx.indrelid
              AND a.attnum = x.attnum
            WHERE x.attnum > 0
         ) = ARRAY['user_id','profile_id']::text[]
       )
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.index_name);
  END LOOP;
END;
$block$;

-- The historical user_roles trigger synchronized a global app role into a
-- global user_profiles assignment. That behavior is incompatible with tenant
-- authority. Drop only triggers whose function body actually writes/reads the
-- profile tables; user_roles remains available for global roles such as
-- super_admin.
DO $block$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE t.tgrelid = 'public.user_roles'::regclass
       AND NOT t.tgisinternal
       AND (
         pg_get_functiondef(p.oid) ILIKE '%user_profiles%'
         OR pg_get_functiondef(p.oid) ILIKE '%rbac_profiles%'
       )
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.user_roles', r.tgname);
  END LOOP;
END;
$block$;

-- Clone every custom profile per tenant before removing the global source row.
-- This avoids selecting an arbitrary tenant when a profile was reused by more
-- than one tenant.
CREATE TEMP TABLE pr_m2_profile_tenant_map (
  old_profile_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  new_profile_id uuid NOT NULL DEFAULT gen_random_uuid(),
  PRIMARY KEY (old_profile_id, tenant_id)
) ON COMMIT DROP;

INSERT INTO pr_m2_profile_tenant_map (old_profile_id, tenant_id)
SELECT DISTINCT p.id, up.tenant_id
  FROM public.rbac_profiles p
  JOIN public.user_profiles up ON up.profile_id = p.id
  JOIN prm2_rebaseline.authorized_tenant_ids() authorized
    ON authorized.tenant_id = up.tenant_id
 WHERE p.sistema = false;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.user_profiles up
      JOIN prm2_rebaseline.authorized_tenant_ids() authorized
        ON authorized.tenant_id = up.tenant_id
      JOIN public.rbac_profiles p ON p.id = up.profile_id
     WHERE p.sistema = false
       AND NOT EXISTS (
         SELECT 1
           FROM pr_m2_profile_tenant_map m
          WHERE m.old_profile_id = p.id AND m.tenant_id = up.tenant_id
       )
  ) THEN
    RAISE EXCEPTION 'tenant_access_backfill_unassigned_custom_profile';
  END IF;
END;
$block$;

INSERT INTO public.rbac_profiles (
  id, tenant_id, nome, descricao, codigo, sistema, created_at, updated_at
)
SELECT
  m.new_profile_id,
  m.tenant_id,
  p.nome,
  p.descricao,
  NULL,
  false,
  p.created_at,
  p.updated_at
FROM pr_m2_profile_tenant_map m
JOIN public.rbac_profiles p ON p.id = m.old_profile_id;

INSERT INTO public.rbac_permissions (
  profile_id, module_id, action, scope, created_at
)
SELECT
  m.new_profile_id,
  rp.module_id,
  rp.action,
  rp.scope,
  rp.created_at
FROM pr_m2_profile_tenant_map m
JOIN public.rbac_permissions rp ON rp.profile_id = m.old_profile_id;

UPDATE public.user_profiles up
   SET profile_id = m.new_profile_id
  FROM pr_m2_profile_tenant_map m
 WHERE up.profile_id = m.old_profile_id
   AND up.tenant_id = m.tenant_id;

-- Legacy global profiles and permissions remain recoverable until every
-- referencing tenant has been migrated under an exact Owner manifest.

-- Remove exact duplicate assignments deterministically before installing the
-- tenant-aware uniqueness rule.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY tenant_id, user_id, profile_id
           ORDER BY created_at, id
         ) AS rn
    FROM public.user_profiles up
   WHERE EXISTS (
     SELECT 1
       FROM prm2_rebaseline.authorized_tenant_ids() authorized
      WHERE authorized.tenant_id = up.tenant_id
   )
)
DELETE FROM public.user_profiles up
 USING ranked r
 WHERE up.id = r.id
   AND r.rn > 1;

-- Existing unselected assignments remain nullable until their independently
-- authorized exact-manifest reconciliation. New canonical writes are guarded
-- by the tenant contract and service-role functions below.
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_tenant_required;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_tenant_required CHECK (tenant_id IS NOT NULL) NOT VALID;

ALTER TABLE public.rbac_profiles
  DROP CONSTRAINT IF EXISTS rbac_profiles_tenant_contract;
ALTER TABLE public.rbac_profiles
  ADD CONSTRAINT rbac_profiles_tenant_contract CHECK (
    (sistema = true AND tenant_id IS NULL)
    OR
    (sistema = false AND tenant_id IS NOT NULL)
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rbac_profiles_tenant_name
  ON public.rbac_profiles (tenant_id, lower(nome))
  WHERE sistema = false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_profiles_tenant_user_profile
  ON public.user_profiles (tenant_id, user_id, profile_id);

CREATE INDEX IF NOT EXISTS ix_user_profiles_tenant_user
  ON public.user_profiles (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS ix_rbac_profiles_tenant
  ON public.rbac_profiles (tenant_id)
  WHERE sistema = false;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rbac_permissions_profile_module_action
  ON public.rbac_permissions (profile_id, module_id, action);

-- Direct application access is removed. All reads and mutations are performed
-- through service-role server functions after a trusted tenant resolution.
ALTER TABLE public.rbac_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rbac_modules FROM anon, authenticated;
REVOKE ALL ON TABLE public.rbac_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.rbac_permissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.user_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.teams FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_members FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_log FROM anon, authenticated;

GRANT ALL ON TABLE public.rbac_modules TO service_role;
GRANT ALL ON TABLE public.rbac_profiles TO service_role;
GRANT ALL ON TABLE public.rbac_permissions TO service_role;
GRANT ALL ON TABLE public.user_profiles TO service_role;
GRANT ALL ON TABLE public.teams TO service_role;
GRANT ALL ON TABLE public.team_members TO service_role;
GRANT ALL ON TABLE public.audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_tenant_permission(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _module_code text,
  _action public.rbac_action
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_is_super boolean := false;
  v_role public.tenant_role;
  v_status public.membership_status;
  v_is_owner boolean := false;
  v_rank integer := 0;
  v_scope text := NULL;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _module_code IS NULL OR _action IS NULL THEN
    RAISE EXCEPTION 'invalid_tenant_permission_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation', 'selection', 'single-membership') THEN
    RAISE EXCEPTION 'invalid_tenant_origin' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) INTO v_is_super;

  IF v_is_super THEN
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'super_admin_requires_impersonation' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object(
      'allowed', true,
      'scope', 'global',
      'source', 'super_admin_impersonation'
    );
  END IF;

  SELECT tenant_role, membership_status, is_owner
    INTO v_role, v_status, v_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _actor_user_id;

  IF NOT FOUND OR v_status <> 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'scope', NULL, 'source', 'membership_denied');
  END IF;

  IF v_role = 'owner' AND v_is_owner = true THEN
    RETURN jsonb_build_object('allowed', true, 'scope', 'global', 'source', 'tenant_owner');
  END IF;

  SELECT COALESCE(max(
    CASE rp.scope
      WHEN 'global' THEN 3
      WHEN 'equipe' THEN 2
      WHEN 'proprio' THEN 1
      ELSE 0
    END
  ), 0)
    INTO v_rank
    FROM public.user_profiles up
    JOIN public.rbac_profiles p
      ON p.id = up.profile_id
     AND (p.sistema = true OR p.tenant_id = _tenant_id)
    JOIN public.rbac_permissions rp ON rp.profile_id = p.id
    JOIN public.rbac_modules rm ON rm.id = rp.module_id
   WHERE up.tenant_id = _tenant_id
     AND up.user_id = _actor_user_id
     AND rm.codigo = _module_code
     AND rp.action = _action;

  v_scope := CASE v_rank WHEN 3 THEN 'global' WHEN 2 THEN 'equipe' WHEN 1 THEN 'proprio' ELSE NULL END;
  RETURN jsonb_build_object(
    'allowed', v_rank > 0,
    'scope', v_scope,
    'source', CASE WHEN v_rank > 0 THEN 'assigned_profiles' ELSE 'permission_absent' END
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.assert_tenant_access_manager(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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
  IF v_is_super THEN
    IF _tenant_origin <> 'impersonation' THEN
      RAISE EXCEPTION 'super_admin_requires_impersonation' USING ERRCODE = '42501';
    END IF;
    RETURN 'super_admin';
  END IF;

  SELECT tenant_role, membership_status, is_owner
    INTO v_role, v_status, v_is_owner
    FROM public.tenant_members
   WHERE tenant_id = _tenant_id AND user_id = _actor_user_id;

  IF FOUND AND v_status = 'active' AND v_role = 'owner' AND v_is_owner = true THEN
    RETURN 'owner';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin, 'access_control', 'gerenciar'
  );
  IF (v_decision->>'allowed') = 'true' AND (v_decision->>'scope') = 'global' THEN
    RETURN 'delegated';
  END IF;

  RAISE EXCEPTION 'tenant_access_manager_required' USING ERRCODE = '42501';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mutate_tenant_access_profile(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _operation text,
  _profile_id uuid DEFAULT NULL,
  _name text DEFAULT NULL,
  _description text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_actor_kind text;
  v_profile_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_name text := NULLIF(trim(_name), '');
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  v_actor_kind := public.assert_tenant_access_manager(_actor_user_id, _tenant_id, _tenant_origin);

  IF _operation = 'create' THEN
    IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 120 THEN
      RAISE EXCEPTION 'invalid_profile_name' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.rbac_profiles (tenant_id, nome, descricao, codigo, sistema)
    VALUES (_tenant_id, v_name, NULLIF(trim(_description), ''), NULL, false)
    RETURNING id INTO v_profile_id;
  ELSIF _operation IN ('update', 'delete') THEN
    SELECT id, to_jsonb(p) INTO v_profile_id, v_before
      FROM public.rbac_profiles p
     WHERE p.id = _profile_id
       AND p.tenant_id = _tenant_id
       AND p.sistema = false
     FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'tenant_profile_not_found' USING ERRCODE = '22023'; END IF;

    IF v_actor_kind = 'delegated' AND EXISTS (
      SELECT 1 FROM public.user_profiles
       WHERE tenant_id = _tenant_id
         AND user_id = _actor_user_id
         AND profile_id = v_profile_id
    ) THEN
      RAISE EXCEPTION 'delegated_manager_cannot_change_own_profile' USING ERRCODE = '42501';
    END IF;

    IF _operation = 'update' THEN
      IF v_name IS NULL OR length(v_name) < 2 OR length(v_name) > 120 THEN
        RAISE EXCEPTION 'invalid_profile_name' USING ERRCODE = '22023';
      END IF;
      UPDATE public.rbac_profiles
         SET nome = v_name,
             descricao = NULLIF(trim(_description), ''),
             updated_at = now()
       WHERE id = v_profile_id;
    ELSE
      IF EXISTS (SELECT 1 FROM public.user_profiles WHERE profile_id = v_profile_id) THEN
        RAISE EXCEPTION 'tenant_profile_in_use' USING ERRCODE = '23503';
      END IF;
      DELETE FROM public.rbac_permissions WHERE profile_id = v_profile_id;
      DELETE FROM public.rbac_profiles WHERE id = v_profile_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid_profile_operation' USING ERRCODE = '22023';
  END IF;

  IF _operation <> 'delete' THEN
    SELECT to_jsonb(p) INTO v_after FROM public.rbac_profiles p WHERE p.id = v_profile_id;
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_access.profile.' || _operation,
    'rbac_profiles',
    v_profile_id::text,
    v_before,
    v_after
  );

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'profileId', v_profile_id::text,
    'operation', _operation,
    'changed', true,
    'actorKind', v_actor_kind
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_tenant_profile_permission(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _profile_id uuid,
  _module_id uuid,
  _action public.rbac_action,
  _scope public.rbac_scope,
  _enabled boolean
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_actor_kind text;
  v_module_code text;
  v_actor_decision jsonb;
  v_requested_rank integer;
  v_actor_rank integer;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  v_actor_kind := public.assert_tenant_access_manager(_actor_user_id, _tenant_id, _tenant_origin);

  IF NOT EXISTS (
    SELECT 1 FROM public.rbac_profiles
     WHERE id = _profile_id AND tenant_id = _tenant_id AND sistema = false
  ) THEN
    RAISE EXCEPTION 'tenant_profile_not_found' USING ERRCODE = '22023';
  END IF;

  SELECT codigo INTO v_module_code FROM public.rbac_modules WHERE id = _module_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'rbac_module_not_found' USING ERRCODE = '22023'; END IF;

  IF v_actor_kind = 'delegated' THEN
    IF EXISTS (
      SELECT 1 FROM public.user_profiles
       WHERE tenant_id = _tenant_id AND user_id = _actor_user_id AND profile_id = _profile_id
    ) THEN
      RAISE EXCEPTION 'delegated_manager_cannot_change_own_profile' USING ERRCODE = '42501';
    END IF;
    IF v_module_code = 'access_control' AND _action = 'gerenciar' THEN
      RAISE EXCEPTION 'owner_required_for_access_control_grant' USING ERRCODE = '42501';
    END IF;
    v_actor_decision := public.resolve_tenant_permission(
      _actor_user_id, _tenant_id, _tenant_origin, v_module_code, _action
    );
    IF (v_actor_decision->>'allowed') IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'permission_escalation_denied' USING ERRCODE = '42501';
    END IF;
    v_requested_rank := CASE _scope WHEN 'global' THEN 3 WHEN 'equipe' THEN 2 ELSE 1 END;
    v_actor_rank := CASE v_actor_decision->>'scope' WHEN 'global' THEN 3 WHEN 'equipe' THEN 2 WHEN 'proprio' THEN 1 ELSE 0 END;
    IF v_requested_rank > v_actor_rank THEN
      RAISE EXCEPTION 'permission_scope_escalation_denied' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF _enabled THEN
    INSERT INTO public.rbac_permissions (profile_id, module_id, action, scope)
    VALUES (_profile_id, _module_id, _action, _scope)
    ON CONFLICT (profile_id, module_id, action)
    DO UPDATE SET scope = EXCLUDED.scope;
  ELSE
    DELETE FROM public.rbac_permissions
     WHERE profile_id = _profile_id AND module_id = _module_id AND action = _action;
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_access.permission.set',
    'rbac_permissions',
    _profile_id::text || ':' || _module_id::text || ':' || _action::text,
    jsonb_build_object('enabled', _enabled, 'scope', _scope::text, 'moduleCode', v_module_code)
  );

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'profileId', _profile_id::text,
    'moduleId', _module_id::text,
    'action', _action::text,
    'scope', _scope::text,
    'enabled', _enabled,
    'changed', true
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_tenant_member_profiles(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _target_user_id uuid,
  _profile_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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
     AND (p.sistema = true OR p.tenant_id = _tenant_id);
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
$fn$;

CREATE OR REPLACE FUNCTION public.mutate_tenant_team(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _operation text,
  _team_id uuid DEFAULT NULL,
  _name text DEFAULT NULL,
  _description text DEFAULT NULL,
  _leader_user_id uuid DEFAULT NULL,
  _active boolean DEFAULT true,
  _member_ids uuid[] DEFAULT ARRAY[]::uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_locked_tenant uuid;
  v_actor_kind text;
  v_team_id uuid;
  v_member_ids uuid[];
  v_expected integer;
  v_valid integer;
BEGIN
  SELECT id INTO v_locked_tenant FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  v_actor_kind := public.assert_tenant_access_manager(_actor_user_id, _tenant_id, _tenant_origin);

  IF _operation = 'delete' THEN
    SELECT id INTO v_team_id FROM public.teams
     WHERE id = _team_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'tenant_team_not_found' USING ERRCODE = '22023'; END IF;
    DELETE FROM public.team_members WHERE tenant_id = _tenant_id AND team_id = v_team_id;
    DELETE FROM public.teams WHERE id = v_team_id AND tenant_id = _tenant_id;
  ELSIF _operation IN ('create', 'update') THEN
    IF NULLIF(trim(_name), '') IS NULL OR length(trim(_name)) > 120 THEN
      RAISE EXCEPTION 'invalid_team_name' USING ERRCODE = '22023';
    END IF;

    v_member_ids := ARRAY(
      SELECT DISTINCT x
        FROM unnest(COALESCE(_member_ids, ARRAY[]::uuid[]) ||
                    CASE WHEN _leader_user_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[_leader_user_id] END) x
       ORDER BY x
    );

    SELECT count(*) INTO v_expected FROM unnest(v_member_ids) x;
    SELECT count(*) INTO v_valid
      FROM public.tenant_members tm
     WHERE tm.tenant_id = _tenant_id
       AND tm.user_id = ANY(v_member_ids)
       AND tm.membership_status = 'active';
    IF v_expected <> v_valid THEN
      RAISE EXCEPTION 'cross_tenant_or_inactive_team_member' USING ERRCODE = '42501';
    END IF;

    IF _operation = 'create' THEN
      INSERT INTO public.teams (tenant_id, nome, descricao, lider_user_id, ativo)
      VALUES (_tenant_id, trim(_name), NULLIF(trim(_description), ''), _leader_user_id, COALESCE(_active, true))
      RETURNING id INTO v_team_id;
    ELSE
      SELECT id INTO v_team_id FROM public.teams
       WHERE id = _team_id AND tenant_id = _tenant_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'tenant_team_not_found' USING ERRCODE = '22023'; END IF;
      UPDATE public.teams
         SET nome = trim(_name),
             descricao = NULLIF(trim(_description), ''),
             lider_user_id = _leader_user_id,
             ativo = COALESCE(_active, true),
             updated_at = now()
       WHERE id = v_team_id AND tenant_id = _tenant_id;
    END IF;

    DELETE FROM public.team_members WHERE tenant_id = _tenant_id AND team_id = v_team_id;
    INSERT INTO public.team_members (tenant_id, team_id, user_id)
    SELECT _tenant_id, v_team_id, x FROM unnest(v_member_ids) x;
  ELSE
    RAISE EXCEPTION 'invalid_team_operation' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_access.team.' || _operation,
    'teams',
    v_team_id::text,
    jsonb_build_object(
      'name', _name,
      'leaderUserId', _leader_user_id,
      'active', _active,
      'memberIds', COALESCE(to_jsonb(_member_ids), '[]'::jsonb)
    )
  );

  RETURN jsonb_build_object(
    'tenantId', _tenant_id::text,
    'teamId', v_team_id::text,
    'operation', _operation,
    'changed', true,
    'actorKind', v_actor_kind
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_tenant_access_profile(uuid,uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_profile_permission(uuid,uuid,text,uuid,uuid,public.rbac_action,public.rbac_scope,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_tenant_team(uuid,uuid,text,text,uuid,text,text,uuid,boolean,uuid[]) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action) TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_tenant_access_manager(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_tenant_access_profile(uuid,uuid,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_profile_permission(uuid,uuid,text,uuid,uuid,public.rbac_action,public.rbac_scope,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_tenant_team(uuid,uuid,text,text,uuid,text,text,uuid,boolean,uuid[]) TO service_role;

COMMIT;
$pca07r2_access$;
  v_current_query text := current_query();
  v_expected_functions jsonb := $pca07r2_json$
[
  {
    "signature": "prm2_rebaseline.authorized_tenant_ids()",
    "prosrcSha256": "1fe4d3d450780af3da1426896a405be4c98c4335f5005fbba7d952eb0fc6afb6",
    "securityDefiner": false,
    "volatility": "s",
    "searchPath": "search_path=public, extensions, pg_temp",
    "serviceExecute": false
  },
  {
    "signature": "public.bootstrap_tenant_with_owner(uuid,text,text,uuid,text)",
    "prosrcSha256": "3967b368d77aed2be40fecddc4d030411f20aa63cb51bf3a798e217eb548ccfa",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean)",
    "prosrcSha256": "707b295c67f01f5fbbb5ed3b30e82119afdb9910dfe17383e27f63066170f10a",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.accept_tenant_invitation(uuid,uuid)",
    "prosrcSha256": "2c2f220c7d5fd66ea626c984cfe0f2b23c9f1f874c01c2c951a7bce929a9e270",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.transfer_tenant_ownership(uuid,uuid,text,uuid)",
    "prosrcSha256": "edf2acbc763f820526fcbb0c44e26c5471f1d223b32d308575b65c6d7c25b686",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action)",
    "prosrcSha256": "e604cf8ad1db1a0819cbd5429c4d2b25f95a5100cc83c70f18d2e49eb2ecd68f",
    "securityDefiner": true,
    "volatility": "s",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.assert_tenant_access_manager(uuid,uuid,text)",
    "prosrcSha256": "e976e2bd82911f0dc3fc7e7c70d825c65c70da66126f00d4698290f39d95a16c",
    "securityDefiner": true,
    "volatility": "s",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.mutate_tenant_access_profile(uuid,uuid,text,text,uuid,text,text)",
    "prosrcSha256": "c205582ae86b98f0fc6ebce1e853aab31516114eb4f6ad9a08ac0f19de6a474d",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.set_tenant_profile_permission(uuid,uuid,text,uuid,uuid,public.rbac_action,public.rbac_scope,boolean)",
    "prosrcSha256": "5e1953ce8de04536c2180d36fba13b42fd4ced454a300a720f7d88bfd75a80f4",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[])",
    "prosrcSha256": "d3cf9cbbddef4f670071cb4d54896b01b6565c5089addd358df5a29e591c1715",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  },
  {
    "signature": "public.mutate_tenant_team(uuid,uuid,text,text,uuid,text,text,uuid,boolean,uuid[])",
    "prosrcSha256": "b8920ad9690d3eba85734c2a0a63f6d3eeb2485d0dba865d05b99a41e05cc3e8",
    "securityDefiner": true,
    "volatility": "v",
    "searchPath": "search_path=public, pg_temp",
    "serviceExecute": true
  }
]
$pca07r2_json$::jsonb;
  v_product_versions text[] := ARRAY['20260728165000', '20260728180000', '20260728233000', '20260729103000', '20260729183000', '20260729211500', '20260729233000', '20260730010000', '20260730043000', '20260730050000', '20260730051500', '20260730053000', '20260730060000', '20260730100000', '20260730101000', '20260803183000', '20260826185014']::text[];
  v_product_tables text[] := ARRAY['cms_campaign_versions', 'cms_form_versions', 'cms_page_versions', 'cms_publication_schedules', 'cms_reusable_blocks', 'cms_template_versions', 'cms_templates', 'cms_testimonials', 'crm_alerts', 'crm_attachments', 'crm_automation_rules', 'crm_calendar_events', 'crm_communication_jobs', 'crm_contacts', 'crm_idempotency', 'crm_lead_assignments', 'crm_lead_events', 'crm_lead_tags', 'crm_lead_tasks', 'crm_pipeline_stages', 'crm_pipelines', 'crm_proposals', 'crm_sla_policies', 'crm_tags', 'crm_visits', 'platform_incidents', 'platform_support_cases', 'portal_connector_credential_verifiers', 'tenant_marketing_connector_versions', 'tenant_marketing_connectors', 'tenant_marketing_field_mappings', 'tenant_marketing_ingestion_attempts', 'tenant_marketing_ingestion_events', 'tenant_marketing_manual_import_rows', 'tenant_marketing_manual_imports', 'tenant_portal_exports', 'tenant_portal_job_attempts', 'tenant_portal_jobs', 'tenant_portal_mappings', 'tenant_tracking_connector_versions', 'tenant_tracking_connectors', 'tenant_tracking_consent_configuration', 'tenant_tracking_diagnostics', 'tenant_tracking_event_bindings', 'tenant_upload_targets']::text[];
  v_remaining_columns text[] := ARRAY['cms_campaigns.draft_version_id', 'cms_campaigns.published_at', 'cms_campaigns.published_version_id', 'cms_campaigns.revision', 'cms_campaigns.schema_version', 'cms_campaigns.unpublished_at', 'cms_forms.draft_version_id', 'cms_forms.published_at', 'cms_forms.published_version_id', 'cms_forms.revision', 'cms_forms.schema_version', 'cms_forms.unpublished_at', 'cms_pages.draft_version_id', 'cms_pages.layout_type', 'cms_pages.page_type', 'cms_pages.published_version_id', 'cms_pages.revision', 'cms_pages.schema_version', 'cms_pages.unpublished_at', 'imovel_portais.connector_id', 'imovel_portais.current_state', 'imovel_portais.desired_state', 'imovel_portais.last_job_id', 'imovel_portais.revision', 'leads.archived_at', 'leads.assigned_team_id', 'leads.latest_attribution', 'leads.merge_state', 'leads.merged_into_lead_id', 'leads.normalized_email', 'leads.normalized_phone', 'leads.original_attribution', 'leads.pipeline_id', 'leads.qualification_key', 'leads.stage_id', 'portal_connectors.credential_reference', 'portal_connectors.credential_state', 'portal_connectors.credential_version', 'portal_connectors.last_rotated_at', 'portal_connectors.rotation_required', 'portal_connectors.row_version', 'portal_sync_logs.attempt_id', 'portal_sync_logs.error_code', 'portal_sync_logs.job_id', 'portal_sync_logs.metadata', 'site_settings_versions.based_on_revision', 'site_settings_versions.content_hash', 'site_settings_versions.revision', 'site_settings_versions.updated_at', 'tenant_marketing_connectors.adapter_version', 'tenant_marketing_connectors.ingestion_actor_origin', 'tenant_marketing_connectors.ingestion_actor_user_id', 'tenant_marketing_connectors.last_fixture_verified_at', 'tenant_marketing_connectors.provider_contract_version', 'tenant_upload_targets.tenant_origin']::text[];
  v_w1_rls_tables text[] := ARRAY['rbac_modules', 'rbac_profiles', 'rbac_permissions', 'user_profiles', 'teams', 'team_members', 'audit_log']::text[];
  v_authorized_tenant uuid := '9664d189-4a12-4caa-8243-dc73383447e6'::uuid;
  v_expected jsonb;
  v_oid oid;
  v_owner text;
  v_security_definer boolean;
  v_volatility "char";
  v_config text;
  v_prosrc_sha256 text;
  v_item text;
  v_table text;
  v_column text;
  v_count bigint;
  v_target_ledger_count bigint;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PCA-07R2 database authority mismatch' USING ERRCODE = '42501';
  END IF;
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'PCA-07R2 requires PostgreSQL 17+' USING ERRCODE = '0A000';
  END IF;

  IF octet_length(v_lifecycle_source) <> 20253
     OR encode(extensions.digest(v_lifecycle_source, 'sha256'), 'hex') <> '8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8' THEN
    RAISE EXCEPTION 'PCA-07R2 lifecycle source identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF octet_length(v_access_source) <> 30313
     OR encode(extensions.digest(v_access_source, 'sha256'), 'hex') <> '3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e' THEN
    RAISE EXCEPTION 'PCA-07R2 access source identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL
     OR (SELECT count(*)
           FROM pg_attribute
          WHERE attrelid = 'supabase_migrations.schema_migrations'::regclass
            AND attnum > 0 AND NOT attisdropped
            AND ((attname = 'version' AND atttypid = 'text'::regtype AND attnotnull)
              OR (attname = 'name' AND atttypid = 'text'::regtype)
              OR (attname = 'statements' AND atttypid = 'text[]'::regtype)
              OR (attname = 'created_by' AND atttypid = 'text'::regtype)
              OR (attname = 'idempotency_key' AND atttypid = 'text'::regtype)
              OR (attname = 'rollback' AND atttypid = 'text[]'::regtype))) <> 6 THEN
    RAISE EXCEPTION 'PCA-07R2 Lovable-managed ledger schema mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF v_current_query IS NULL OR v_current_query NOT LIKE '%PCA-07R2 — forensic forward-only W1 ledger reconciliation%' THEN
    RAISE EXCEPTION 'PCA-07R2 current query attestation unavailable' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_count
    FROM supabase_migrations.schema_migrations
   WHERE version = ANY(v_product_versions)
     AND version NOT IN ('20260728165000', '20260728180000');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected W2-W6 product ledger rows, found %', v_count USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_target_ledger_count
    FROM supabase_migrations.schema_migrations
   WHERE version IN ('20260728165000', '20260728180000', '20260828160617');
  IF v_target_ledger_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'PCA-07R2 partial target ledger state: %/3', v_target_ledger_count USING ERRCODE = 'P0001';
  END IF;
  IF v_target_ledger_count = 3 AND (
    SELECT count(*)
      FROM supabase_migrations.schema_migrations
     WHERE (version = '20260728165000' AND name = 'pr_m2_tenant_lifecycle'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = 'pca-07r2:20260728165000:8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8'
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = '8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8')
        OR (version = '20260728180000' AND name = 'pr_m2_tenant_access_control'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = 'pca-07r2:20260728180000:3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e'
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = '3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e')
        OR (version = '20260828160617'
            AND name = 'pca_07r2_w1_forensic_forward_only_ledger_reconciliation'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = ('pca-07r2:20260828160617:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
  ) <> 3 THEN
    RAISE EXCEPTION 'PCA-07R2 existing target ledger identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
              WHERE version > '20260826002000' AND version <> '20260828160617') THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected ledger entry after accepted security corrective' USING ERRCODE = 'P0001';
  END IF;

  IF to_regnamespace('prm2_rebaseline') IS NULL
     OR has_schema_privilege('anon', 'prm2_rebaseline', 'USAGE')
     OR has_schema_privilege('authenticated', 'prm2_rebaseline', 'USAGE')
     OR has_schema_privilege('service_role', 'prm2_rebaseline', 'USAGE') THEN
    RAISE EXCEPTION 'PCA-07R2 manifest schema boundary mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOR v_expected IN SELECT value FROM jsonb_array_elements(v_expected_functions)
  LOOP
    v_oid := to_regprocedure(v_expected->>'signature');
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'PCA-07R2 missing W1 function %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    SELECT owner_role.rolname, p.prosecdef, p.provolatile,
           array_to_string(p.proconfig, ','),
           encode(extensions.digest(p.prosrc, 'sha256'), 'hex')
      INTO v_owner, v_security_definer, v_volatility, v_config, v_prosrc_sha256
      FROM pg_proc p
      JOIN pg_roles owner_role ON owner_role.oid = p.proowner
     WHERE p.oid = v_oid;
    IF v_owner <> 'postgres'
       OR v_security_definer <> (v_expected->>'securityDefiner')::boolean
       OR v_volatility <> (v_expected->>'volatility')::"char"
       OR v_config IS DISTINCT FROM v_expected->>'searchPath'
       OR v_prosrc_sha256 <> v_expected->>'prosrcSha256' THEN
      RAISE EXCEPTION 'PCA-07R2 W1 function definition mismatch: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      WHERE p.oid = v_oid AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) OR has_function_privilege('anon', v_oid, 'EXECUTE')
      OR has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'PCA-07R2 W1 client function exposure: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    IF has_function_privilege('service_role', v_oid, 'EXECUTE')
       <> (v_expected->>'serviceExecute')::boolean THEN
      RAISE EXCEPTION 'PCA-07R2 W1 service function ACL mismatch: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rbac_profiles'
       AND column_name = 'tenant_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_profiles'
       AND column_name = 'tenant_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 W1 tenant column mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
       WHERE conname IN ('rbac_profiles_tenant_contract', 'user_profiles_tenant_required')
         AND NOT convalidated) <> 2 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 NOT VALID constraint mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid IN ('public.rbac_profiles'::regclass, 'public.user_profiles'::regclass)
         AND contype = 'f' AND pg_get_constraintdef(oid, true) LIKE 'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE') <> 2 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 tenant foreign key mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_index idx JOIN pg_class i ON i.oid = idx.indexrelid
       WHERE i.relnamespace = 'public'::regnamespace
         AND i.relname IN ('ux_rbac_profiles_tenant_name', 'ux_user_profiles_tenant_user_profile',
                           'ix_user_profiles_tenant_user', 'ix_rbac_profiles_tenant',
                           'ux_rbac_permissions_profile_module_action')
         AND idx.indisvalid AND idx.indisready) <> 5 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 index mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_index idx
     WHERE idx.indrelid = 'public.user_profiles'::regclass AND idx.indisunique
       AND (SELECT array_agg(a.attname::text ORDER BY x.ord)
              FROM unnest(idx.indkey::smallint[]) WITH ORDINALITY x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = x.attnum
             WHERE x.attnum > 0)
           IN (ARRAY['profile_id','user_id']::text[], ARRAY['user_id','profile_id']::text[])
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 legacy two-column profile uniqueness remains' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE t.tgrelid = 'public.user_roles'::regclass AND NOT t.tgisinternal
       AND (pg_get_functiondef(p.oid) ILIKE '%user_profiles%'
         OR pg_get_functiondef(p.oid) ILIKE '%rbac_profiles%')
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 incompatible user_roles trigger remains' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_item IN ARRAY v_w1_rls_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
       WHERE c.oid = to_regclass(format('public.%I', v_item)) AND c.relrowsecurity
    ) OR has_table_privilege('anon', format('public.%I', v_item), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', v_item), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', v_item), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', v_item), 'DELETE')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'SELECT')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'INSERT')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'UPDATE')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'DELETE')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'SELECT')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'INSERT')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'UPDATE')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'DELETE') THEN
      RAISE EXCEPTION 'PCA-07R2 W1 RLS/ACL mismatch: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.rbac_profiles WHERE tenant_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.user_profiles WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected W1 tenant assignment' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_authorized_tenant)
     OR (SELECT count(*) FROM public.tenants) <> 74
     OR (SELECT count(*) FROM public.tenants WHERE id <> v_authorized_tenant) <> 73
     OR (SELECT md5(string_agg(id::text, ',' ORDER BY id::text)) FROM public.tenants WHERE id <> v_authorized_tenant)
          <> '3ece053ddbdfce5161380ec38824ea91'
     OR (SELECT encode(extensions.digest(string_agg(id::text, ',' ORDER BY id::text), 'sha256'), 'hex')
           FROM public.tenants WHERE id <> v_authorized_tenant)
          <> 'a9c8f3fbcd4feff88dbc06330b121f00a08c7796a3b163dfda23a91450755e95'
     OR (SELECT count(*) FROM public.portal_connectors) <> 444
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id <> v_authorized_tenant) <> 438
     OR (SELECT count(*) FILTER (WHERE feed_token IS NOT NULL)
              + count(*) FILTER (WHERE webhook_secret IS NOT NULL) FROM public.portal_connectors) <> 888
     OR (SELECT count(*) FROM public.tenant_subscriptions) <> 0 THEN
    RAISE EXCEPTION 'PCA-07R2 protected tenant/portal baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF (SELECT count(*) FROM public.tenant_members WHERE tenant_id = v_authorized_tenant) <> 4
     OR (SELECT count(*) FROM public.leads WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.imoveis WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.form_submissions WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.corretores WHERE tenant_id = v_authorized_tenant) <> 4
     OR (SELECT count(*) FROM public.lead_origens WHERE tenant_id = v_authorized_tenant) <> 8
     OR (SELECT count(*) FROM public.cms_campaign_events WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id = v_authorized_tenant) <> 6
     OR (SELECT count(*) FROM storage.objects) <> 22
     OR (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects) <> 15826788 THEN
    RAISE EXCEPTION 'PCA-07R2 protected RM Prime baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF (SELECT count(*) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 1386
     OR (SELECT count(DISTINCT r.tenant_id) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 198
     OR (SELECT md5(string_agg(r.id::text, ',' ORDER BY r.id::text)) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL)
          <> '862e725f8891430bb864021d3c3afe29'
     OR (SELECT count(*) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 1386
     OR (SELECT count(DISTINCT r.tenant_id) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 198
     OR (SELECT md5(string_agg(r.id::text, ',' ORDER BY r.id::text)) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL)
          <> 'dc43bd9b59a63b20bc37b1fa127b4131' THEN
    RAISE EXCEPTION 'PCA-07R2 orphan baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_item IN ARRAY v_product_tables
  LOOP
    IF to_regclass(format('public.%I', v_item)) IS NOT NULL THEN
      RAISE EXCEPTION 'PCA-07R2 W2-W6 product table unexpectedly present: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  FOREACH v_item IN ARRAY v_remaining_columns
  LOOP
    v_table := split_part(v_item, '.', 1);
    v_column := split_part(v_item, '.', 2);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = v_table AND column_name = v_column
    ) THEN
      RAISE EXCEPTION 'PCA-07R2 W2-W6 product column unexpectedly present: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('provision_tenant_product_baseline',
                         'provision_authorized_tenant_product_baselines',
                         'provision_new_tenant_product_baseline')
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 W6 orchestrator unexpectedly present' USING ERRCODE = 'P0001';
  END IF;

  IF v_target_ledger_count = 0 THEN
    INSERT INTO supabase_migrations.schema_migrations
      (version, statements, name, created_by, idempotency_key, rollback)
    VALUES
      ('20260728165000', ARRAY[v_lifecycle_source], 'pr_m2_tenant_lifecycle',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:20260728165000:8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8', ARRAY[]::text[]),
      ('20260728180000', ARRAY[v_access_source], 'pr_m2_tenant_access_control',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:20260728180000:3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e', ARRAY[]::text[]),
      ('20260828160617', ARRAY[v_current_query],
       'pca_07r2_w1_forensic_forward_only_ledger_reconciliation',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:20260828160617:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'),
       ARRAY[]::text[]);
  END IF;

  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
       WHERE version IN ('20260728165000', '20260728180000', '20260828160617')
         AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
         AND idempotency_key IS NOT NULL
         AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]) <> 3
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '20260728165000') IS DISTINCT FROM 'pr_m2_tenant_lifecycle'
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '20260728180000') IS DISTINCT FROM 'pr_m2_tenant_access_control'
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '20260828160617')
          IS DISTINCT FROM 'pca_07r2_w1_forensic_forward_only_ledger_reconciliation'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '20260728165000')
          IS DISTINCT FROM 'pca-07r2:20260728165000:8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '20260728180000')
          IS DISTINCT FROM 'pca-07r2:20260728180000:3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '20260828160617')
          IS DISTINCT FROM ('pca-07r2:20260828160617:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '20260728165000') IS DISTINCT FROM '8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8'
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '20260728180000') IS DISTINCT FROM '3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e'
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '20260828160617')
          IS DISTINCT FROM encode(extensions.digest(v_current_query, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PCA-07R2 atomic ledger postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;
END;
$pca07r2$;
