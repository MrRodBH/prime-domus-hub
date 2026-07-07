CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_header text;
  v_count int;
  v_tenant uuid;
BEGIN
  -- Anonymous path: only respect x-tenant-id header (public form endpoints, feeds).
  -- Header is transport-only; authorization remains with RLS policies.
  IF v_uid IS NULL THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Super Admin path (IA-003 §12.3 Opção A): only the impersonation header
  -- resolves a tenant. No default fallback.
  IF public.is_super_admin() THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Regular authenticated user (M2b.1 — strict cardinality, mirrors IA-001 requireTenant):
  --   0 memberships  → NULL
  --   1 membership   → tenant_id
  --   N memberships  → NULL  (no automatic selection, no default, no fallback,
  --                           no LIMIT 1, no ORDER BY, no is_default/is_owner priority)
  -- Header from a non-super, non-anon caller is IGNORED — never used to switch tenant.
  SELECT COUNT(*), MIN(tenant_id)
    INTO v_count, v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid;

  IF v_count = 1 THEN
    RETURN v_tenant;
  END IF;

  RETURN NULL;
END;
$function$;