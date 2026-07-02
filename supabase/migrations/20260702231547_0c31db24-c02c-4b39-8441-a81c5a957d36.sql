REVOKE EXECUTE ON FUNCTION public.get_current_tenant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) FROM PUBLIC, anon;