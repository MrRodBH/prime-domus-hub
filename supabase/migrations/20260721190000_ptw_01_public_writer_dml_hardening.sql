-- PTW-01 — Public Tenant-Bound Writers
-- Close the legacy anonymous Data API campaign-event writer after the
-- application writer has moved to Host-resolved server authority.
--
-- Fail-closed rule: the migration does not guess a historical policy name.
-- It inspects pg_policies and proceeds only when exactly one INSERT policy
-- exposes public.cms_campaign_events to anon/PUBLIC.

DO $ptw_01$
DECLARE
  v_policy_count integer;
  v_policy_name text;
BEGIN
  SELECT count(*), min(policyname)
    INTO v_policy_count, v_policy_name
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'cms_campaign_events'
    AND cmd = 'INSERT'
    AND (
      roles @> ARRAY['anon']::name[]
      OR roles @> ARRAY['public']::name[]
    );

  IF v_policy_count <> 1 THEN
    RAISE EXCEPTION
      'ptw_01_campaign_event_anon_insert_policy_cardinality_conflict:%',
      v_policy_count;
  END IF;

  RAISE NOTICE
    'PTW-01 removing proven anonymous campaign-event INSERT policy: %',
    v_policy_name;

  EXECUTE format(
    'DROP POLICY %I ON public.cms_campaign_events',
    v_policy_name
  );
END
$ptw_01$;

-- Direct public Data API mutation is no longer part of the architecture.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON TABLE public.cms_campaign_events
  FROM PUBLIC, anon;

-- authenticated privileges and policies are intentionally preserved.
-- service_role privileges are intentionally preserved for the server writer.
-- No unrelated table, function, membership, impersonation or Lead boundary is touched.
