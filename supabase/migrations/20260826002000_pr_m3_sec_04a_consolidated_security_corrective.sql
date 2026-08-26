-- PR-M3-SEC-04A — consolidated security corrective
-- Repository-first only. This migration is not applied by SEC-04A.
--
-- Corrective scope:
--   1) remove inherited client privileges from nine SCP-001/SCP-002
--      relations that are intentionally RLS deny-by-default;
--   2) remove authenticated execution from five SECURITY DEFINER RPCs whose
--      canonical callers use supabaseAdmin/service_role;
--   3) harden postgres default privileges for future public tables/functions.
--
-- Preserved:
--   * all rows and business data;
--   * RLS state and policy inventory;
--   * service_role/postgres access;
--   * public hostname resolvers;
--   * authenticated business RPCs and RLS helpers;
--   * Auth, Storage, tenant, membership, domain and impersonation boundaries.

BEGIN;

DO $preflight$
DECLARE
  v_table text;
  v_signature text;
  v_oid oid;
  v_policy_count integer;
  v_failures text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.billing_event_transitions',
    'public.billing_events',
    'public.billing_provider_definitions',
    'public.commercial_entitlement_definitions',
    'public.commercial_plan_entitlements',
    'public.commercial_plans',
    'public.tenant_billing_provider_mappings',
    'public.tenant_entitlements',
    'public.tenant_subscriptions'
  ]
  LOOP
    IF to_regclass(v_table) IS NULL THEN
      v_failures := array_append(v_failures, format('missing relation: %s', v_table));
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      WHERE c.oid = to_regclass(v_table)
        AND c.relkind IN ('r', 'p')
        AND c.relrowsecurity
    ) THEN
      v_failures := array_append(v_failures, format('RLS not enabled: %s', v_table));
    END IF;

    SELECT count(*)::integer
      INTO v_policy_count
      FROM pg_policy
     WHERE polrelid = to_regclass(v_table);

    IF v_policy_count <> 0 THEN
      v_failures := array_append(
        v_failures,
        format('expected deny-by-default relation without policies: %s', v_table)
      );
    END IF;

    IF NOT has_table_privilege('service_role', to_regclass(v_table), 'SELECT')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'INSERT')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'UPDATE')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'DELETE') THEN
      v_failures := array_append(
        v_failures,
        format('service_role baseline privilege drift: %s', v_table)
      );
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)',
    'public.portal_dlq_enqueue(uuid,text,text,jsonb,text)',
    'public.portal_dlq_mark_resolved(uuid)',
    'public.portal_dlq_mark_retry(uuid,text)',
    'public.rate_limit_hit(text,text,integer,integer)'
  ]
  LOOP
    v_oid := to_regprocedure(v_signature);

    IF v_oid IS NULL THEN
      v_failures := array_append(v_failures, format('missing function: %s', v_signature));
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_roles owner_role ON owner_role.oid = p.proowner
      WHERE p.oid = v_oid
        AND p.prosecdef
        AND owner_role.rolname = 'postgres'
        AND p.proconfig IS NOT NULL
        AND array_to_string(p.proconfig, ',') LIKE '%search_path=%'
    ) THEN
      v_failures := array_append(
        v_failures,
        format('SECURITY DEFINER baseline drift: %s', v_signature)
      );
    END IF;

    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      v_failures := array_append(
        v_failures,
        format('service_role EXECUTE baseline drift: %s', v_signature)
      );
    END IF;
  END LOOP;

  IF cardinality(v_failures) > 0 THEN
    RAISE EXCEPTION 'PR-M3-SEC-04A preflight failed: %', array_to_string(v_failures, '; ');
  END IF;
END
$preflight$;

REVOKE ALL PRIVILEGES ON TABLE public.billing_event_transitions
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.billing_events
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.billing_provider_definitions
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.commercial_entitlement_definitions
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.commercial_plan_entitlements
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.commercial_plans
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tenant_billing_provider_mappings
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tenant_entitlements
  FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.tenant_subscriptions
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.portal_dlq_enqueue(uuid,text,text,jsonb,text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.portal_dlq_mark_resolved(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.portal_dlq_mark_retry(uuid,text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION
  public.rate_limit_hit(text,text,integer,integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.portal_dlq_enqueue(uuid,text,text,jsonb,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.portal_dlq_mark_resolved(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.portal_dlq_mark_retry(uuid,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  public.rate_limit_hit(text,text,integer,integer)
  TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $postcondition$
DECLARE
  v_table text;
  v_signature text;
  v_oid oid;
  v_failures text[] := ARRAY[]::text[];
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'public.billing_event_transitions',
    'public.billing_events',
    'public.billing_provider_definitions',
    'public.commercial_entitlement_definitions',
    'public.commercial_plan_entitlements',
    'public.commercial_plans',
    'public.tenant_billing_provider_mappings',
    'public.tenant_entitlements',
    'public.tenant_subscriptions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public'
        AND g.table_name = split_part(v_table, '.', 2)
        AND g.grantee IN ('anon', 'authenticated')
    ) THEN
      v_failures := array_append(
        v_failures,
        format('client table privilege remains: %s', v_table)
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      WHERE c.oid = to_regclass(v_table)
        AND c.relrowsecurity
    ) THEN
      v_failures := array_append(v_failures, format('RLS regressed: %s', v_table));
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_policy p
      WHERE p.polrelid = to_regclass(v_table)
    ) THEN
      v_failures := array_append(
        v_failures,
        format('unexpected policy materialized: %s', v_table)
      );
    END IF;

    IF NOT has_table_privilege('service_role', to_regclass(v_table), 'SELECT')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'INSERT')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'UPDATE')
       OR NOT has_table_privilege('service_role', to_regclass(v_table), 'DELETE') THEN
      v_failures := array_append(
        v_failures,
        format('service_role table privilege regressed: %s', v_table)
      );
    END IF;
  END LOOP;

  FOREACH v_signature IN ARRAY ARRAY[
    'public.log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)',
    'public.portal_dlq_enqueue(uuid,text,text,jsonb,text)',
    'public.portal_dlq_mark_resolved(uuid)',
    'public.portal_dlq_mark_retry(uuid,text)',
    'public.rate_limit_hit(text,text,integer,integer)'
  ]
  LOOP
    v_oid := to_regprocedure(v_signature);

    IF has_function_privilege('anon', v_oid, 'EXECUTE')
       OR has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      v_failures := array_append(
        v_failures,
        format('client EXECUTE remains: %s', v_signature)
      );
    END IF;

    IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE') THEN
      v_failures := array_append(
        v_failures,
        format('service_role EXECUTE regressed: %s', v_signature)
      );
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    JOIN pg_roles owner_role ON owner_role.oid = d.defaclrole
    JOIN pg_namespace n ON n.oid = d.defaclnamespace
    JOIN pg_roles grantee_role ON grantee_role.oid = a.grantee
    WHERE owner_role.rolname = 'postgres'
      AND n.nspname = 'public'
      AND d.defaclobjtype IN ('r', 'f')
      AND grantee_role.rolname IN ('anon', 'authenticated')
  ) THEN
    v_failures := array_append(
      v_failures,
      'postgres public default privileges still grant client access'
    );
  END IF;

  IF NOT has_function_privilege(
      'anon',
      to_regprocedure('public.resolve_public_tenant_by_host(text)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'anon',
      to_regprocedure('public.get_canonical_redirect_for_active_alias(text)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'anon',
      to_regprocedure('public.get_current_tenant_id()'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'anon',
      to_regprocedure('public.is_super_admin()'),
      'EXECUTE'
    ) THEN
    v_failures := array_append(v_failures, 'intentional anon resolver/helper grant regressed');
  END IF;

  IF has_function_privilege(
      'anon',
      to_regprocedure('public.user_belongs_to_tenant(uuid)'),
      'EXECUTE'
    ) THEN
    v_failures := array_append(
      v_failures,
      'user_belongs_to_tenant unexpectedly executable by anon'
    );
  END IF;

  IF NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.create_manual_lead(text,text,text,uuid,text,uuid)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.transition_lead_status(uuid,text,integer,uuid,jsonb)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.super_observabilidade(integer)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.has_role(uuid,app_role)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.has_permission(uuid,text,rbac_action)'),
      'EXECUTE'
    )
    OR NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.user_team_ids(uuid)'),
      'EXECUTE'
    ) THEN
    v_failures := array_append(
      v_failures,
      'intentional authenticated RPC/helper grant regressed'
    );
  END IF;

  IF cardinality(v_failures) > 0 THEN
    RAISE EXCEPTION 'PR-M3-SEC-04A postcondition failed: %', array_to_string(v_failures, '; ');
  END IF;
END
$postcondition$;

COMMIT;
