REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.user_has_active_membership(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_active_membership(uuid, uuid) TO service_role;