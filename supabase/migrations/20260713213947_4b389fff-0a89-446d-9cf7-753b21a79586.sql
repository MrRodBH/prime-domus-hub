-- SCP-012.0.3.correction — Table ACL closure on public.tenant_members
-- Locks down all non-SELECT privileges from PUBLIC/anon/authenticated,
-- preserves service_role administrative privileges, and fails closed if
-- the final ACL does not match the invariant.

REVOKE ALL ON TABLE public.tenant_members FROM PUBLIC;
REVOKE ALL ON TABLE public.tenant_members FROM anon;
REVOKE ALL ON TABLE public.tenant_members FROM authenticated;

GRANT SELECT ON TABLE public.tenant_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenant_members TO service_role;

DO $$
DECLARE
  v_public_privs int;
  v_anon_privs int;
  v_authenticated_non_select int;
  v_authenticated_select int;
  v_service_role_select int;
  v_service_role_insert int;
  v_service_role_update int;
  v_service_role_delete int;
BEGIN
  SELECT COUNT(*) INTO v_public_privs
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND a.grantee = 0; -- 0 => PUBLIC

  SELECT COUNT(*) INTO v_anon_privs
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'anon';

  SELECT COUNT(*) INTO v_authenticated_non_select
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'authenticated'
     AND a.privilege_type <> 'SELECT';

  SELECT COUNT(*) INTO v_authenticated_select
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'authenticated'
     AND a.privilege_type = 'SELECT';

  SELECT COUNT(*) INTO v_service_role_select
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'service_role'
     AND a.privilege_type = 'SELECT';

  SELECT COUNT(*) INTO v_service_role_insert
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'service_role'
     AND a.privilege_type = 'INSERT';

  SELECT COUNT(*) INTO v_service_role_update
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'service_role'
     AND a.privilege_type = 'UPDATE';

  SELECT COUNT(*) INTO v_service_role_delete
    FROM pg_class c
    CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
   WHERE c.oid = 'public.tenant_members'::regclass
     AND pg_get_userbyid(a.grantee) = 'service_role'
     AND a.privilege_type = 'DELETE';

  IF v_public_privs <> 0 THEN
    RAISE EXCEPTION 'ACL invariant violated: PUBLIC has % explicit privilege(s) on public.tenant_members', v_public_privs;
  END IF;
  IF v_anon_privs <> 0 THEN
    RAISE EXCEPTION 'ACL invariant violated: anon has % privilege(s) on public.tenant_members', v_anon_privs;
  END IF;
  IF v_authenticated_non_select <> 0 THEN
    RAISE EXCEPTION 'ACL invariant violated: authenticated has % non-SELECT privilege(s) on public.tenant_members', v_authenticated_non_select;
  END IF;
  IF v_authenticated_select <> 1 THEN
    RAISE EXCEPTION 'ACL invariant violated: authenticated must have SELECT on public.tenant_members (found %)', v_authenticated_select;
  END IF;
  IF v_service_role_select <> 1 OR v_service_role_insert <> 1
     OR v_service_role_update <> 1 OR v_service_role_delete <> 1 THEN
    RAISE EXCEPTION 'ACL invariant violated: service_role missing SELECT/INSERT/UPDATE/DELETE on public.tenant_members';
  END IF;
END
$$ LANGUAGE plpgsql;