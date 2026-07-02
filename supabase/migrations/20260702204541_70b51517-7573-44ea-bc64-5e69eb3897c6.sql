
-- Ciclo 2: Rate-limit universal + Portal Connector DLQ

-- 1) Buckets de rate-limit universais (por escopo + chave)
CREATE TABLE public.rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,           -- e.g. 'feed', 'portal-leads', 'ai', 'api'
  key text NOT NULL,             -- token, ip, tenant_id::portal, etc.
  window_start timestamptz NOT NULL DEFAULT date_trunc('minute', now()),
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, key, window_start)
);
CREATE INDEX ix_rlb_lookup ON public.rate_limit_buckets (scope, key, window_start DESC);
CREATE INDEX ix_rlb_gc ON public.rate_limit_buckets (window_start);

GRANT SELECT ON public.rate_limit_buckets TO authenticated;
GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin lê rate_limit_buckets"
  ON public.rate_limit_buckets FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- RPC atômico para incrementar bucket e retornar contagem atual
CREATE OR REPLACE FUNCTION public.rate_limit_hit(_scope text, _key text, _limit int, _window_seconds int DEFAULT 60)
RETURNS TABLE(allowed boolean, current_count int, retry_after_seconds int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket timestamptz := date_trunc('second', now()) - make_interval(secs => extract(epoch from now())::int % _window_seconds);
  v_count int;
BEGIN
  INSERT INTO public.rate_limit_buckets (scope, key, window_start, count, updated_at)
  VALUES (_scope, _key, v_bucket, 1, now())
  ON CONFLICT (scope, key, window_start)
  DO UPDATE SET count = public.rate_limit_buckets.count + 1, updated_at = now()
  RETURNING count INTO v_count;

  RETURN QUERY SELECT
    (v_count <= _limit),
    v_count,
    GREATEST(1, _window_seconds - (extract(epoch from (now() - v_bucket))::int));
END;
$$;

-- 2) DLQ de sincronização de portais (falhas de ingest ou push)
CREATE TABLE public.portal_sync_dlq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  portal_slug text NOT NULL,
  acao text NOT NULL,                 -- 'lead_ingest' | 'feed_read' | 'push_imovel'
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  erro text,
  tentativas int NOT NULL DEFAULT 0,
  proxima_tentativa_at timestamptz NOT NULL DEFAULT now(),
  ultimo_erro_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',  -- 'pendente' | 'em_retry' | 'resolvido' | 'abandonado'
  resolvido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_psdlq_tenant ON public.portal_sync_dlq (tenant_id, created_at DESC);
CREATE INDEX ix_psdlq_status ON public.portal_sync_dlq (status, proxima_tentativa_at);
CREATE INDEX ix_psdlq_portal ON public.portal_sync_dlq (portal_slug, status);

GRANT SELECT, UPDATE ON public.portal_sync_dlq TO authenticated;
GRANT ALL ON public.portal_sync_dlq TO service_role;
ALTER TABLE public.portal_sync_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant lê seu DLQ"
  ON public.portal_sync_dlq FOR SELECT TO authenticated
  USING (public.user_belongs_to_tenant(tenant_id) OR public.is_super_admin());

CREATE POLICY "admin/super marca DLQ como resolvido"
  ON public.portal_sync_dlq FOR UPDATE TO authenticated
  USING (
    public.is_super_admin() OR
    (public.user_belongs_to_tenant(tenant_id) AND public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_super_admin() OR
    (public.user_belongs_to_tenant(tenant_id) AND public.has_role(auth.uid(), 'admin'))
  );

CREATE TRIGGER trg_psdlq_updated_at
  BEFORE UPDATE ON public.portal_sync_dlq
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Bloquear DELETE (auditoria)
CREATE TRIGGER trg_psdlq_block_delete
  BEFORE DELETE ON public.portal_sync_dlq
  FOR EACH ROW EXECUTE FUNCTION public.tg_block_delete();

-- RPC para enfileirar na DLQ
CREATE OR REPLACE FUNCTION public.portal_dlq_enqueue(
  _tenant uuid, _portal text, _acao text, _payload jsonb, _erro text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.portal_sync_dlq (
    tenant_id, portal_slug, acao, payload, erro, tentativas, ultimo_erro_at,
    proxima_tentativa_at, status
  ) VALUES (
    _tenant, lower(_portal), _acao, COALESCE(_payload, '{}'::jsonb), _erro, 1, now(),
    now() + interval '2 minutes', 'pendente'
  ) RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- RPC para marcar retry (backoff exponencial)
CREATE OR REPLACE FUNCTION public.portal_dlq_mark_retry(_id uuid, _erro text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_tent int;
BEGIN
  UPDATE public.portal_sync_dlq
     SET tentativas = tentativas + 1,
         ultimo_erro_at = now(),
         erro = _erro,
         status = CASE WHEN tentativas + 1 >= 6 THEN 'abandonado' ELSE 'em_retry' END,
         proxima_tentativa_at = now() + (LEAST(60, power(2, LEAST(tentativas, 6)))::text || ' minutes')::interval
   WHERE id = _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_dlq_mark_resolved(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.portal_sync_dlq
     SET status = 'resolvido', resolvido_at = now()
   WHERE id = _id;
END;
$$;
