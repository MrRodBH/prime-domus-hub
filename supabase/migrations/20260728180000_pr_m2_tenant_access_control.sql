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
           SELECT array_agg(a.attname ORDER BY x.ord)
             FROM unnest(c.conkey) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = c.conrelid
              AND a.attnum = x.attnum
         ) = ARRAY['profile_id','user_id']::text[]
         OR
         (
           SELECT array_agg(a.attname ORDER BY x.ord)
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
           SELECT array_agg(a.attname ORDER BY x.ord)
             FROM unnest(idx.indkey::smallint[]) WITH ORDINALITY AS x(attnum, ord)
             JOIN pg_attribute a
               ON a.attrelid = idx.indrelid
              AND a.attnum = x.attnum
            WHERE x.attnum > 0
         ) = ARRAY['profile_id','user_id']::text[]
         OR
         (
           SELECT array_agg(a.attname ORDER BY x.ord)
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
