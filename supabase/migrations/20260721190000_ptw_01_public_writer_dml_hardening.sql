-- PTW-01 — Public Tenant-Bound Writers
-- Close the legacy anonymous Data API campaign-event writer after the
-- application writer has moved to Host-resolved server authority.
--
-- Same-backend read-only evidence captured on 2026-07-21:
-- EXACT_LEGACY_POLICY_NAME: events_public_insert
-- DIRECT_PUBLIC_TABLE_GRANTS: none
-- ANON_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- AUTHENTICATED_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- SERVICE_ROLE_DIRECT_GRANTS: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
-- SANDBOX_EXEC_DIRECT_GRANTS: INSERT, SELECT
--
-- The migration intentionally preserves authenticated, service_role, postgres,
-- sandbox_exec, events_admin_read and tenant_isolation exactly as audited.

DO $ptw_01$
DECLARE
  v_unexpected_policy_names text[];
BEGIN
  SELECT array_agg(policyname ORDER BY policyname)
    INTO v_unexpected_policy_names
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'cms_campaign_events'
    AND cmd = 'INSERT'
    AND policyname <> 'events_public_insert'
    AND (
      roles @> ARRAY['anon']::name[]
      OR roles @> ARRAY['public']::name[]
    );

  IF COALESCE(cardinality(v_unexpected_policy_names), 0) > 0 THEN
    RAISE EXCEPTION
      'ptw_01_unexpected_anonymous_campaign_event_insert_policies:%',
      array_to_string(v_unexpected_policy_names, ',');
  END IF;
END
$ptw_01$;

DROP POLICY IF EXISTS "events_public_insert"
  ON public.cms_campaign_events;

-- Direct anonymous Data API mutation is no longer part of the architecture.
-- There was no direct PUBLIC table grant in the audited ACL, so PUBLIC is not
-- a revoke target. Authenticated and service-role privileges remain untouched.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.cms_campaign_events
  FROM anon;

-- No unrelated table, function, membership, impersonation or Lead boundary is touched.
