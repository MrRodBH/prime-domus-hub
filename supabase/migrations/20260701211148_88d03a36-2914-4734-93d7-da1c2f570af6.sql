GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_tenant_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) TO anon, authenticated;