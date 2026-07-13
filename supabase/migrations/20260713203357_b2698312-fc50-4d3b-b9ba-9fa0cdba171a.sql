-- SCP-012.0.2.2 §15 — Fail-closed ACL assertion for the commercial
-- seat-limit resolver.
--
-- 1. REVOKE EXECUTE from PUBLIC / anon / authenticated / sandbox_exec
--    (when the role exists) with NO WHEN OTHERS handler: any REVOKE
--    failure aborts the migration.
-- 2. Re-GRANT EXECUTE to service_role only.
-- 3. Assert that the resulting ACL contains no EXECUTE grantee other
--    than the function owner and service_role. Raise EXCEPTION on any
--    unexpected grantee — this migration is fail-closed by construction.

REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM authenticated;

DO $$
DECLARE
  v_has_sandbox boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') INTO v_has_sandbox;
  IF v_has_sandbox THEN
    -- No WHEN OTHERS handler: any failure aborts.
    EXECUTE 'REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM sandbox_exec';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) TO service_role;

-- Fail-closed assertion: after the REVOKE + GRANT, only the function
-- owner and service_role may hold EXECUTE. Any other explicit grantee
-- aborts the migration.
DO $$
DECLARE
  v_owner_name text;
  v_bad_grantee text;
BEGIN
  SELECT pg_get_userbyid(proowner) INTO v_owner_name
    FROM pg_proc
   WHERE proname = 'resolve_commercial_seat_decision'
     AND pronamespace = 'public'::regnamespace
   LIMIT 1;

  SELECT pg_get_userbyid(a.grantee) INTO v_bad_grantee
    FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
   WHERE p.proname = 'resolve_commercial_seat_decision'
     AND p.pronamespace = 'public'::regnamespace
     AND a.privilege_type = 'EXECUTE'
     AND pg_get_userbyid(a.grantee) NOT IN (v_owner_name, 'service_role')
   LIMIT 1;

  IF v_bad_grantee IS NOT NULL THEN
    RAISE EXCEPTION
      'SCP-012.0.2.2 fail-closed ACL assertion failed: unexpected EXECUTE grantee %',
      v_bad_grantee
      USING ERRCODE = '42501';
  END IF;
END $$;
