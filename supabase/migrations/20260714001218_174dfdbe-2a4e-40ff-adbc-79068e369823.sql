-- F4-CF-01 Canonical Commercial RPC ACL Reclosure
-- Restaura o contrato canônico da SCP-012: EXECUTE apenas para o owner
-- da função e service_role; remove qualquer privilégio de sandbox_exec
-- sobre as duas RPCs comerciais e as escritas sobre tenant_members.

REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM authenticated;

REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM authenticated;

DO $mig$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) FROM sandbox_exec';
    EXECUTE 'REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) FROM sandbox_exec';
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.tenant_members FROM sandbox_exec';
  END IF;
END
$mig$;

GRANT EXECUTE ON FUNCTION public.resolve_commercial_seat_decision(uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text) TO service_role;

-- Fail-closed assertions: aborta a migration se o contrato canônico não
-- for observado pelo catálogo pós-reclosure.
DO $assert$
DECLARE
  offending RECORD;
BEGIN
  FOR offending IN
    SELECT p.proname, pr.rolname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(p.proacl) a
      JOIN pg_roles pr ON pr.oid = a.grantee
     WHERE n.nspname = 'public'
       AND p.proname IN ('resolve_commercial_seat_decision', 'mutate_tenant_membership')
       AND a.privilege_type = 'EXECUTE'
       AND pr.rolname NOT IN ('postgres', 'service_role')
  LOOP
    RAISE EXCEPTION 'ACL drift: role % retains EXECUTE on %', offending.rolname, offending.proname;
  END LOOP;

  IF has_function_privilege('anon', 'public.resolve_commercial_seat_decision(uuid, uuid, text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon retains EXECUTE on resolve_commercial_seat_decision';
  END IF;
  IF has_function_privilege('authenticated', 'public.resolve_commercial_seat_decision(uuid, uuid, text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated retains EXECUTE on resolve_commercial_seat_decision';
  END IF;
  IF has_function_privilege('anon', 'public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon retains EXECUTE on mutate_tenant_membership';
  END IF;
  IF has_function_privilege('authenticated', 'public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated retains EXECUTE on mutate_tenant_membership';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.resolve_commercial_seat_decision(uuid, uuid, text, integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role missing EXECUTE on resolve_commercial_seat_decision';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role missing EXECUTE on mutate_tenant_membership';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    IF has_function_privilege('sandbox_exec', 'public.resolve_commercial_seat_decision(uuid, uuid, text, integer)', 'EXECUTE') THEN
      RAISE EXCEPTION 'sandbox_exec retains EXECUTE on resolve_commercial_seat_decision';
    END IF;
    IF has_function_privilege('sandbox_exec', 'public.mutate_tenant_membership(uuid, uuid, text, text, uuid, text)', 'EXECUTE') THEN
      RAISE EXCEPTION 'sandbox_exec retains EXECUTE on mutate_tenant_membership';
    END IF;
    IF has_table_privilege('sandbox_exec', 'public.tenant_members', 'INSERT') THEN
      RAISE EXCEPTION 'sandbox_exec retains INSERT on public.tenant_members';
    END IF;
    IF has_table_privilege('sandbox_exec', 'public.tenant_members', 'UPDATE') THEN
      RAISE EXCEPTION 'sandbox_exec retains UPDATE on public.tenant_members';
    END IF;
    IF has_table_privilege('sandbox_exec', 'public.tenant_members', 'DELETE') THEN
      RAISE EXCEPTION 'sandbox_exec retains DELETE on public.tenant_members';
    END IF;
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.tenant_members', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated missing SELECT on public.tenant_members';
  END IF;
  IF has_table_privilege('authenticated', 'public.tenant_members', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated retains INSERT on public.tenant_members';
  END IF;
  IF has_table_privilege('authenticated', 'public.tenant_members', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated retains UPDATE on public.tenant_members';
  END IF;
  IF has_table_privilege('authenticated', 'public.tenant_members', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated retains DELETE on public.tenant_members';
  END IF;
END
$assert$;