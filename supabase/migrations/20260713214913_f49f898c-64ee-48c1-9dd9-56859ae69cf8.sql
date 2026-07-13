-- SCP-012.0.3 — Final RPC ACL reclosure for mutate_tenant_membership.
-- Removes sandbox_exec and any residual grantee; enforces owner + service_role only via assertion.

REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) FROM sandbox_exec';
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text) TO service_role;

-- Fail-closed assertion: dynamically resolve owner + service_role OIDs and verify
-- EXECUTE ACL contains EXACTLY those two grantees. Anything else aborts the migration.
DO $$
DECLARE
  v_owner_oid oid;
  v_service_oid oid;
  v_grantee oid;
  v_priv text;
  v_owner_has_execute boolean := false;
  v_service_has_execute boolean := false;
BEGIN
  SELECT proowner INTO v_owner_oid
    FROM pg_proc
   WHERE oid = 'public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text)'::regprocedure;

  SELECT oid INTO v_service_oid FROM pg_roles WHERE rolname = 'service_role';
  IF v_service_oid IS NULL THEN
    RAISE EXCEPTION 'ACL assertion failed: service_role role not found';
  END IF;

  FOR v_grantee, v_priv IN
    SELECT (a).grantee, (a).privilege_type
      FROM (
        SELECT aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS a
          FROM pg_proc p
         WHERE p.oid = 'public.mutate_tenant_membership(uuid,uuid,text,text,uuid,text)'::regprocedure
      ) sub
  LOOP
    IF v_priv <> 'EXECUTE' THEN
      RAISE EXCEPTION 'ACL assertion failed: unexpected privilege % for grantee oid %', v_priv, v_grantee;
    END IF;
    IF v_grantee = 0 THEN
      RAISE EXCEPTION 'ACL assertion failed: PUBLIC has EXECUTE';
    ELSIF v_grantee = v_owner_oid THEN
      v_owner_has_execute := true;
    ELSIF v_grantee = v_service_oid THEN
      v_service_has_execute := true;
    ELSE
      RAISE EXCEPTION 'ACL assertion failed: unexpected grantee oid % (rolname=%) has EXECUTE',
        v_grantee, (SELECT rolname FROM pg_roles WHERE oid = v_grantee);
    END IF;
  END LOOP;

  IF NOT v_owner_has_execute THEN
    RAISE EXCEPTION 'ACL assertion failed: function owner does not have EXECUTE';
  END IF;
  IF NOT v_service_has_execute THEN
    RAISE EXCEPTION 'ACL assertion failed: service_role does not have EXECUTE';
  END IF;
END
$$;