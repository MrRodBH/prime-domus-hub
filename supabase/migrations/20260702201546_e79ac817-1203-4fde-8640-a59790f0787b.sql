DROP POLICY IF EXISTS events_public_insert ON public.cms_campaign_events;
CREATE POLICY events_public_insert
  ON public.cms_campaign_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tipo IS NOT NULL
    AND length(tipo) BETWEEN 1 AND 60
  );

REVOKE EXECUTE ON FUNCTION public.tg_tenants_seed_defaults() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_user_roles_sync_profiles() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_leads_enforce_status_flow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_block_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_lead_atividades_lock_audit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_user_roles_enforce_hierarchy() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.seed_default_lead_reasons(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_default_portal_connectors(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;