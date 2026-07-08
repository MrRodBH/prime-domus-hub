
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_header text;
  v_header_present boolean := false;
  v_header_uuid uuid;
  v_count int;
  v_tenant uuid;
BEGIN
  -- Read x-tenant-id header. A present-but-malformed header is a distinct
  -- state from "no header at all" and MUST NOT silently fall through to the
  -- no-header cardinality branch (would leak a resolved tenant to a caller
  -- that actually asked for a different one).
  BEGIN
    v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
    IF v_header IS NOT NULL AND v_header <> '' THEN
      v_header_present := true;
      BEGIN
        v_header_uuid := v_header::uuid;
      EXCEPTION WHEN OTHERS THEN
        v_header_uuid := NULL;
      END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_header_present := false;
    v_header_uuid := NULL;
  END;

  IF v_uid IS NULL THEN
    RETURN v_header_uuid;
  END IF;

  IF public.is_super_admin() THEN
    IF NOT v_header_present OR v_header_uuid IS NULL THEN
      RETURN NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM public.tenants WHERE id = v_header_uuid) THEN
      RETURN v_header_uuid;
    END IF;
    RETURN NULL;
  END IF;

  IF v_header_present THEN
    IF v_header_uuid IS NULL THEN
      RETURN NULL;
    END IF;
    IF public.user_has_active_membership(v_uid, v_header_uuid) THEN
      RETURN v_header_uuid;
    END IF;
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.tenant_members
   WHERE user_id = v_uid
     AND membership_status = 'active';

  IF v_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT tenant_id INTO v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid
     AND membership_status = 'active';

  RETURN v_tenant;
END;
$function$;
