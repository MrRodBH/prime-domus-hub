
-- F3.3 — RLS Membership Selection Patch
-- Mirrors the F3.2 server-side selection logic in SQL.

-- Helper: user_has_active_membership
CREATE OR REPLACE FUNCTION public.user_has_active_membership(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenant_members
     WHERE user_id = _user_id
       AND tenant_id = _tenant_id
       AND membership_status = 'active'
  )
$$;

-- Main: get_current_tenant_id — F3.3 patch
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_header text;
  v_header_uuid uuid;
  v_count int;
  v_tenant uuid;
BEGIN
  -- Read x-tenant-id header safely. Malformed / absent header -> NULL uuid.
  BEGIN
    v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
    IF v_header IS NOT NULL AND v_header <> '' THEN
      BEGIN
        v_header_uuid := v_header::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_header_uuid := NULL;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_header_uuid := NULL;
  END;

  -- Anonymous path: only respect x-tenant-id header (public form endpoints, feeds).
  -- Header is transport-only; authorization remains with RLS policies of the
  -- specific tables (which further restrict what anonymous callers can read/write).
  IF v_uid IS NULL THEN
    RETURN v_header_uuid;
  END IF;

  -- Super Admin path (IA-003 §12.3 Opção A + F3.2 mirror):
  -- resolves tenant ONLY if header points to an existing tenant. No fallback.
  IF public.is_super_admin() THEN
    IF v_header_uuid IS NULL THEN
      RETURN NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = v_header_uuid) THEN
      RETURN v_header_uuid;
    END IF;
    RETURN NULL;
  END IF;

  -- Regular authenticated user + header (F3.3): resolve tenant only if the
  -- caller has an ACTIVE membership on that tenant. No is_default, is_owner,
  -- tenant_role, ORDER BY or LIMIT 1 as selection mechanism.
  IF v_header_uuid IS NOT NULL THEN
    IF public.user_has_active_membership(v_uid, v_header_uuid) THEN
      RETURN v_header_uuid;
    END IF;
    RETURN NULL;
  END IF;

  -- Regular authenticated user without header — strict cardinality on ACTIVE
  -- memberships only (mirrors F3.2 resolveTenantContext):
  --   0 -> NULL, 1 -> tenant_id, N -> NULL.
  SELECT COUNT(*), MIN(tenant_id)
    INTO v_count, v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid
     AND membership_status = 'active';

  IF v_count = 1 THEN
    RETURN v_tenant;
  END IF;

  RETURN NULL;
END;
$function$;

-- Grants (helper is used from SECURITY DEFINER contexts; expose to authenticated
-- so it can be called from RLS-authored code if desired).
GRANT EXECUTE ON FUNCTION public.user_has_active_membership(uuid, uuid) TO authenticated, service_role;
