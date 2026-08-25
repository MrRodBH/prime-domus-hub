-- PR-M3-SEC-02 — forward-only public-surface security reconciliation.
--
-- Repository-first only. This migration MUST NOT be applied before the
-- separately authorized PR-M3-SEC-03 Same-Backend application packet.
-- It changes policy/grant metadata only; no domain row DML is permitted.

BEGIN;

DO $preflight$
DECLARE
  v_table text;
  v_policy record;
  v_privilege text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'cms_campaign_events',
    'corretores',
    'lead_origens'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NULL THEN
      RAISE EXCEPTION 'pr_m3_sec_02_required_table_absent:%', v_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = v_table
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'pr_m3_sec_02_rls_not_enabled:%', v_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'tenant_isolation'
        AND permissive = 'RESTRICTIVE'
        AND cmd = 'ALL'
        AND roles @> ARRAY['anon', 'authenticated']::name[]
        AND qual = '(tenant_id = get_current_tenant_id())'
        AND with_check = '(tenant_id = get_current_tenant_id())'
    ) THEN
      RAISE EXCEPTION 'pr_m3_sec_02_tenant_isolation_diverged:%', v_table;
    END IF;
  END LOOP;

  SELECT * INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'cms_campaign_events'
    AND policyname = 'events_public_insert';
  IF FOUND AND NOT (
    v_policy.cmd = 'INSERT'
    AND v_policy.permissive = 'PERMISSIVE'
    AND v_policy.roles @> ARRAY['anon', 'authenticated']::name[]
    AND v_policy.with_check = '((tenant_id IS NOT NULL) AND (tipo IS NOT NULL) AND ((length(tipo) >= 1) AND (length(tipo) <= 60)))'
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_events_public_insert_diverged';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_campaign_events'
      AND policyname = 'events_admin_read'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_events_admin_read_absent_or_diverged';
  END IF;

  SELECT * INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'corretores'
    AND policyname = 'corretores self update';
  IF FOUND AND NOT (
    v_policy.cmd = 'UPDATE'
    AND v_policy.permissive = 'PERMISSIVE'
    AND v_policy.roles @> ARRAY['authenticated']::name[]
    AND v_policy.qual = '(user_id = auth.uid())'
    AND v_policy.with_check = '(user_id = auth.uid())'
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_broker_self_update_diverged';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'corretores'
      AND policyname = 'corretores admin all'
      AND cmd = 'ALL'
      AND roles @> ARRAY['authenticated']::name[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'corretores'
      AND policyname = 'corretores secretaria read'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_broker_authorized_policies_absent';
  END IF;

  SELECT * INTO v_policy
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'lead_origens'
    AND policyname = 'lead_origens public read ativo';
  IF FOUND AND NOT (
    v_policy.cmd = 'SELECT'
    AND v_policy.permissive = 'PERMISSIVE'
    AND v_policy.roles @> ARRAY['anon']::name[]
    AND v_policy.qual = '(ativo = true)'
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_lead_source_public_read_diverged';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_origens'
      AND policyname = 'lead_origens read auth'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated']::name[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_origens'
      AND policyname = 'lead_origens write auth'
      AND cmd = 'ALL'
      AND roles @> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_lead_source_authenticated_policies_absent';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'cms_campaign_events',
    'corretores',
    'lead_origens'
  ]
  LOOP
    FOREACH v_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]
    LOOP
      IF NOT has_table_privilege('service_role', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'pr_m3_sec_02_service_role_privilege_absent:%.%', v_table, v_privilege;
      END IF;
      IF NOT has_table_privilege('postgres', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'pr_m3_sec_02_postgres_privilege_absent:%.%', v_table, v_privilege;
      END IF;
    END LOOP;
  END LOOP;

  IF to_regprocedure('public.user_belongs_to_tenant(uuid)') IS NULL
     OR to_regprocedure('public.resolve_public_tenant_by_host(text)') IS NULL
     OR to_regprocedure('public.get_canonical_redirect_for_active_alias(text)') IS NULL
     OR to_regprocedure('public.get_current_tenant_id()') IS NULL
     OR to_regprocedure('public.is_super_admin()') IS NULL THEN
    RAISE EXCEPTION 'pr_m3_sec_02_required_security_definer_function_absent';
  END IF;

  IF NOT has_function_privilege('anon', 'public.resolve_public_tenant_by_host(text)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_canonical_redirect_for_active_alias(text)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_current_tenant_id()', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.is_super_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'pr_m3_sec_02_required_public_resolver_grant_absent';
  END IF;
END;
$preflight$;

DROP POLICY IF EXISTS "events_public_insert"
  ON public.cms_campaign_events;
REVOKE ALL PRIVILEGES ON TABLE public.cms_campaign_events FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.cms_campaign_events FROM authenticated;
GRANT SELECT ON TABLE public.cms_campaign_events TO authenticated;

DROP POLICY IF EXISTS "corretores self update"
  ON public.corretores;
REVOKE ALL PRIVILEGES ON TABLE public.corretores FROM authenticated;
GRANT SELECT ON TABLE public.corretores TO authenticated;

DROP POLICY IF EXISTS "lead_origens public read ativo"
  ON public.lead_origens;
REVOKE ALL PRIVILEGES ON TABLE public.lead_origens FROM anon;

REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) FROM anon;

DO $postcondition$
DECLARE
  v_table text;
  v_privilege text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_campaign_events'
      AND policyname = 'events_public_insert'
  ) OR EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'corretores'
      AND policyname = 'corretores self update'
  ) OR EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_origens'
      AND policyname = 'lead_origens public read ativo'
  ) THEN
    RAISE EXCEPTION 'pr_m3_sec_02_retired_policy_still_present';
  END IF;

  FOREACH v_table IN ARRAY ARRAY['cms_campaign_events', 'lead_origens']
  LOOP
    FOREACH v_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]
    LOOP
      IF has_table_privilege('anon', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'pr_m3_sec_02_anon_privilege_remains:%.%', v_table, v_privilege;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v_table IN ARRAY ARRAY['cms_campaign_events', 'corretores']
  LOOP
    IF NOT has_table_privilege('authenticated', format('public.%I', v_table), 'SELECT') THEN
      RAISE EXCEPTION 'pr_m3_sec_02_authenticated_select_absent:%', v_table;
    END IF;
    FOREACH v_privilege IN ARRAY ARRAY[
      'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]
    LOOP
      IF has_table_privilege('authenticated', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'pr_m3_sec_02_authenticated_mutation_privilege_remains:%.%', v_table, v_privilege;
      END IF;
    END LOOP;
  END LOOP;

  IF has_function_privilege('anon', 'public.user_belongs_to_tenant(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'pr_m3_sec_02_anon_internal_helper_execute_remains';
  END IF;

  IF NOT has_function_privilege('anon', 'public.resolve_public_tenant_by_host(text)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_canonical_redirect_for_active_alias(text)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.get_current_tenant_id()', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.is_super_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'pr_m3_sec_02_required_public_resolver_grant_regressed';
  END IF;

  FOREACH v_table IN ARRAY ARRAY[
    'cms_campaign_events',
    'corretores',
    'lead_origens'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
        AND policyname = 'tenant_isolation'
        AND permissive = 'RESTRICTIVE'
    ) THEN
      RAISE EXCEPTION 'pr_m3_sec_02_tenant_isolation_not_preserved:%', v_table;
    END IF;

    FOREACH v_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ]
    LOOP
      IF NOT has_table_privilege('service_role', format('public.%I', v_table), v_privilege)
         OR NOT has_table_privilege('postgres', format('public.%I', v_table), v_privilege) THEN
        RAISE EXCEPTION 'pr_m3_sec_02_privileged_role_regression:%.%', v_table, v_privilege;
      END IF;
    END LOOP;
  END LOOP;
END;
$postcondition$;

COMMIT;
