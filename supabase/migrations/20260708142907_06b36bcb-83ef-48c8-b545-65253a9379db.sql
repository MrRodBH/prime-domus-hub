CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(_tenant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = _tenant
      AND tm.membership_status = 'active'
  );
$$;

COMMENT ON FUNCTION public.user_belongs_to_tenant(uuid)
IS 'DEPRECATED for new policies. Legacy compatibility wrapper — now enforces membership_status = active (F3.3.2). New tenant-scoped RLS should prefer public.get_current_tenant_id() = tenant_id or explicit active-membership checks where appropriate.';