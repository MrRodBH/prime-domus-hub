BEGIN;
-- Preserve global diagnostic events while excluding technical tenant events.
CREATE OR REPLACE FUNCTION public.super_observabilidade(_hours integer DEFAULT 24)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz := now() - make_interval(hours => COALESCE(_hours, 24));
  v_result jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: super_admin only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'window_hours', _hours,
    'since', v_since,
    'totals', (
      SELECT jsonb_object_agg(category, cnt) FROM (
        SELECT category, COUNT(*)::int AS cnt
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since
         GROUP BY category
      ) t
    ),
    'errors_by_source', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT source, COUNT(*)::int AS erros
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since AND severity IN ('error','critical')
         GROUP BY source
         ORDER BY erros DESC
         LIMIT 20
      ) x
    ),
    'slowest_endpoints', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT source,
               ROUND(AVG(latency_ms))::int AS avg_ms,
               MAX(latency_ms)::int        AS max_ms,
               COUNT(*)::int               AS chamadas
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since
           AND category = 'api'
           AND latency_ms IS NOT NULL
         GROUP BY source
         ORDER BY avg_ms DESC
         LIMIT 20
      ) x
    ),
    'ai_usage', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT source,
               COUNT(*)::int AS chamadas,
               ROUND(AVG(latency_ms))::int AS avg_ms,
               SUM((meta->>'tokens')::int) FILTER (WHERE meta ? 'tokens') AS tokens
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since AND category = 'ai'
         GROUP BY source
         ORDER BY chamadas DESC
      ) x
    ),
    'portal_health', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT COALESCE(meta->>'portal', source) AS portal,
               SUM(CASE WHEN event = 'success' THEN 1 ELSE 0 END)::int AS ok,
               SUM(CASE WHEN severity IN ('error','critical') THEN 1 ELSE 0 END)::int AS erros,
               COUNT(*)::int AS total
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since AND category IN ('portal','feed')
         GROUP BY 1
         ORDER BY erros DESC
      ) x
    ),
    'timeline', (
      SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY (row_to_json(x)->>'bucket')), '[]'::jsonb) FROM (
        SELECT date_trunc('hour', created_at) AS bucket,
               COUNT(*) FILTER (WHERE severity = 'info')::int AS info,
               COUNT(*) FILTER (WHERE severity = 'warn')::int AS warn,
               COUNT(*) FILTER (WHERE severity IN ('error','critical'))::int AS error
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since
         GROUP BY bucket
         ORDER BY bucket
      ) x
    ),
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT id, created_at, category, source, event, status_code,
               tenant_id, error_message, meta
          FROM public.system_events
         WHERE (tenant_id IS NULL OR tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer')) AND created_at >= v_since AND severity IN ('error','critical')
         ORDER BY created_at DESC
         LIMIT 50
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
-- Browser clients must not invoke the old unrestricted privileged DLQ mutation.
REVOKE EXECUTE ON FUNCTION public.portal_dlq_mark_resolved(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_dlq_mark_resolved(uuid) TO service_role;
COMMIT;
