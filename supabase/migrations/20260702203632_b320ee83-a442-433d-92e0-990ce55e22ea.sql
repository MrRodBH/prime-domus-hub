-- ========== system_events (observabilidade técnica) ==========
CREATE TABLE public.system_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  category      text NOT NULL,          -- 'api' | 'ai' | 'portal' | 'feed' | 'auth' | 'rls' | 'job' | 'storage'
  severity      text NOT NULL DEFAULT 'info', -- 'info' | 'warn' | 'error' | 'critical'
  source        text NOT NULL,          -- ex: '/api/public/portal-leads', 'ia.gerarDescricaoImovel'
  event         text NOT NULL,          -- ex: 'request', 'success', 'rate_limited', 'invalid_token'
  status_code   int,
  latency_ms    int,
  tenant_id     uuid,
  user_id       uuid,
  ip            text,
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text
);

GRANT SELECT ON public.system_events TO authenticated;
GRANT ALL    ON public.system_events TO service_role;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Apenas super_admin lê
CREATE POLICY "system_events super_admin read"
  ON public.system_events FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Bloquear UPDATE/DELETE (imutável) — nenhum policy = negado por padrão sob RLS
-- service_role bypassa RLS e pode inserir via RPC

-- Bloqueio explícito de DELETE via trigger (defesa em profundidade)
CREATE TRIGGER tg_system_events_no_delete
  BEFORE DELETE ON public.system_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();

-- Índices para painel
CREATE INDEX idx_system_events_created ON public.system_events (created_at DESC);
CREATE INDEX idx_system_events_cat_sev ON public.system_events (category, severity, created_at DESC);
CREATE INDEX idx_system_events_source  ON public.system_events (source, created_at DESC);
CREATE INDEX idx_system_events_tenant  ON public.system_events (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

-- RPC para gravação (SECURITY DEFINER, aceita anon via /api/public/*)
CREATE OR REPLACE FUNCTION public.log_system_event(
  _category text,
  _source   text,
  _event    text,
  _severity text DEFAULT 'info',
  _status_code int DEFAULT NULL,
  _latency_ms  int DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL,
  _user_id   uuid DEFAULT NULL,
  _ip        text DEFAULT NULL,
  _meta      jsonb DEFAULT '{}'::jsonb,
  _error_message text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.system_events (
    category, source, event, severity, status_code, latency_ms,
    tenant_id, user_id, ip, meta, error_message
  ) VALUES (
    _category, _source, _event,
    COALESCE(_severity, 'info'),
    _status_code, _latency_ms, _tenant_id, _user_id, _ip,
    COALESCE(_meta, '{}'::jsonb),
    _error_message
  ) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebrar o caller por falha de logging
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_system_event(text,text,text,text,int,int,uuid,uuid,text,jsonb,text) TO anon, authenticated, service_role;

-- ========== Agregação para painel Super Admin ==========
CREATE OR REPLACE FUNCTION public.super_observabilidade(_hours int DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
         WHERE created_at >= v_since
         GROUP BY category
      ) t
    ),
    'errors_by_source', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT source, COUNT(*)::int AS erros
          FROM public.system_events
         WHERE created_at >= v_since AND severity IN ('error','critical')
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
         WHERE created_at >= v_since
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
         WHERE created_at >= v_since AND category = 'ai'
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
         WHERE created_at >= v_since AND category IN ('portal','feed')
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
         WHERE created_at >= v_since
         GROUP BY bucket
         ORDER BY bucket
      ) x
    ),
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT id, created_at, category, source, event, status_code,
               tenant_id, error_message, meta
          FROM public.system_events
         WHERE created_at >= v_since AND severity IN ('error','critical')
         ORDER BY created_at DESC
         LIMIT 50
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_observabilidade(int) TO authenticated;