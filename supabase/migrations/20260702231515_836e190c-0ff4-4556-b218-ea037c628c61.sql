-- Revoke EXECUTE from anon (and PUBLIC) on sensitive SECURITY DEFINER functions
-- that must not be callable by unauthenticated clients. RLS helper functions
-- (get_current_tenant_id, is_super_admin, user_belongs_to_tenant) retain anon
-- EXECUTE because RLS policies evaluate them under the caller's role.

REVOKE EXECUTE ON FUNCTION public.log_system_event(text, text, text, text, integer, integer, uuid, uuid, text, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_dlq_enqueue(uuid, text, text, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_dlq_mark_resolved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_dlq_mark_retry(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.super_observabilidade(integer) FROM PUBLIC, anon;