-- Round57 release packet. Apply only after isolated SQL and final-head verification.
BEGIN;
ALTER TABLE public.tenants ADD COLUMN operational_kind text CHECK (operational_kind IN ('customer','technical','unclassified'));
UPDATE public.tenants SET operational_kind = 'unclassified';
UPDATE public.tenants SET operational_kind = 'technical' WHERE id IN ('0246468a-ee84-402e-8fae-08f554daf0e1','02ab03da-ddec-4be5-ab70-c39d790e7b6f','0764c563-7698-420c-acb8-dca6d9fe1e31','07fcde96-7fc3-4a70-b24f-bf6aa589f8f7','0f079667-fd75-4a40-81dd-85b37286b5c1','10e15aa2-b8b7-4974-95cf-78a8b088d52d','1a179b48-ed1d-4b13-8b49-132f34f50b14','1b9dcf29-1b55-4621-885e-4a1a06209780','1ef51553-f0c8-4c96-93c6-e0288faba4f9','1facefed-a5bd-42aa-b4b9-f989f2c03092','21c03e6c-a5f0-4afa-9cec-9fd289856806','22273f7b-d3f3-4e47-83db-278d6b0e4dcd','2fb24ce7-655d-4b0c-9e79-1fdfa738ee14','43dc8351-843d-4697-aed5-31b98da35f8d','49998677-6ab2-4d15-ba97-88071a7fa8d9','4bd39148-2b1d-4d1b-82e1-bb88366e9b93','4ec53420-2660-4490-90ee-c7c223b327e8','51ad3443-4f5f-4cb1-9601-d682a1cb357a','52ca022d-38c6-462d-8a88-41f08dd48741','57829b32-13bb-40b6-8b5a-7e6e7010417e','5efb89f2-5307-4b9b-9cf1-22d0275bc433','668c2794-0843-45c3-9923-2a552b022329','68680e23-4542-422f-9abf-6dc6ad60c7bf','6a314360-e3b7-499d-bb2d-a49f8c25576c','6d33f1f9-ce37-4160-a757-f3820270cc45','6e2501ee-92a2-492a-807a-1273c3e4fa76','70a0d882-057d-49ef-a56c-c9a8bbc71338','730bff5d-876a-4959-b6f0-07e4a4962326','734d0cdb-f45a-453a-9ddf-c017a2e7848a','79d6d781-2a62-445f-a25a-24a8d7f734db','7b0cd7db-ab5d-44ef-b8f8-6ae3a22935e5','7ba04891-26b6-432b-a482-d87f4d82d04a','856afa59-844a-4eaa-9820-7d78d58a8850','8b4fe962-586a-48ec-988e-7cf760856009','8c9f696d-47a4-4098-a723-e281803e17ab','8cadb386-8996-42f8-a77a-54b44cb88b3e','8cef4241-f8d2-49ad-88ea-eea8a2aeeb23','8ef3197c-6e95-41d8-88da-e272a89bc639','90696589-902f-47db-a9cb-6b26faf803aa','95fa3039-95cf-4e65-b8af-5b8eba97a1da','969459d6-29bf-4af9-97cc-5b4f5cb4aeee','9b105f17-3a3a-4f2c-aea4-1a5c94816066','9f975ef1-f8d8-4d93-a22d-5331c2538545','a212f9de-0364-427e-8473-2b0742a2d897','a2731563-bce4-4651-9c4e-14dacbb8cd2f','adcf389f-d178-4079-a1ae-8816c4d7fa0f','b20e4388-7bea-4d2c-ae93-386ce8d357cb','b6114598-d7bc-4638-b5e1-eb4aaaf20f02','be28cc3d-209e-43c4-a8c5-1778c263ea8c','bfc8c690-eafa-41d5-ae7b-428f14ae0037','c0c5c269-9028-4f51-a40a-615896fce54a','c1bfcdb3-ce28-46a4-9c8e-3f4ab9cba2fa','c2096573-1d22-4e17-ab5d-9154bb23400a','c66c52da-1fbb-4f29-ae15-170fb58ab5dd','c76dae8e-50af-4fc8-9dab-521de9f938a7','cda9b3c7-a7d7-4ff9-af77-d55cef613f96','d1b33f28-3c2d-47d1-b426-6c69cda871f4','d245720c-a6dd-4429-bc36-ace0fbfed1fe','d6d994cb-f0e6-44a5-9493-df177507cef2','d9ab118e-8fac-4432-abb5-3fb4a379a4c0','dfc46b46-fe9c-4ccc-b5de-39be6fa02b12','e07c33e4-d4ca-4975-9fb6-ee371243a11a','e20b2a95-df13-4f25-a76b-5ef0a31876de','e238a8a6-a45a-4c94-a624-0999355ca263','e293f1be-75be-4380-b42b-982f0f2dd3bf','e57c1d79-709c-46b4-bb90-9b02287cd193','e75f1ade-0893-48d1-b88d-0b697951f806','e7fa01c8-12be-4e5c-9228-1b2505387910','f118dfbd-da57-4143-bfad-25d1294306e4','f20ce995-8ca2-46a6-80a9-22c2a9ac66fe','f31e12c4-0cfc-4612-8482-2d115b53be74','f47cb1e4-c3b9-492a-ae15-7d1085417806','f9905e0e-e96c-49c5-bb40-3bc303c4ceb9','fbd9c79b-3819-46bb-bb78-62c6695525f4','fe954184-c963-4f70-b294-fdd1c3d4faa3');
UPDATE public.tenants SET operational_kind = 'customer' WHERE id = '9664d189-4a12-4caa-8243-dc73383447e6';
ALTER TABLE public.tenants ALTER COLUMN operational_kind SET DEFAULT 'customer';
ALTER TABLE public.tenants ALTER COLUMN operational_kind SET NOT NULL;
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
  -- F3.3.3 Null-Auth Guard: anonymous requests NEVER resolve a tenant,
  -- even with a valid x-tenant-id header. The header is transport, not
  -- authority; only an authenticated session can resolve a tenant.
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Read x-tenant-id header. A present-but-malformed header is a distinct
  -- state from "no header at all" and MUST NOT silently fall through to the
  -- no-header cardinality branch.
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

  -- Owner decision: a platform administrator never resolves a tenant.
  IF public.is_super_admin() THEN RETURN NULL; END IF;

  -- Regular user WITH header: validate active membership server-side.
  IF v_header_present THEN
    IF v_header_uuid IS NULL THEN
      RETURN NULL;
    END IF;
    IF public.user_has_active_membership(v_uid, v_header_uuid) THEN
      RETURN v_header_uuid;
    END IF;
    RETURN NULL;
  END IF;

  -- Regular user WITHOUT header: strict cardinality on active memberships.
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
$function$

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
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since
         GROUP BY category
      ) t
    ),
    'errors_by_source', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT source, COUNT(*)::int AS erros
          FROM public.system_events
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since AND severity IN ('error','critical')
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
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since
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
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since AND category = 'ai'
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
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since AND category IN ('portal','feed')
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
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since
         GROUP BY bucket
         ORDER BY bucket
      ) x
    ),
    'recent_errors', (
      SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT id, created_at, category, source, event, status_code,
               tenant_id, error_message, meta
          FROM public.system_events
         WHERE tenant_id IN (SELECT id FROM public.tenants WHERE operational_kind = 'customer') AND created_at >= v_since AND severity IN ('error','critical')
         ORDER BY created_at DESC
         LIMIT 50
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$

-- Restrictive policies complement all existing permissive policies; service_role remains server-only.
DO $guard$
DECLARE t record;
BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='tenant_id' AND NOT a.attisdropped)
 LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
  EXECUTE format('CREATE POLICY round57_no_super_operation ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_super_admin()) WITH CHECK (NOT public.is_super_admin())',t.relname);
 END LOOP;
END
$guard$;
CREATE POLICY round57_no_super_storage ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_super_admin()) WITH CHECK (NOT public.is_super_admin());
-- Company administration is performed through authenticated audited server functions.
CREATE POLICY round57_no_direct_company_write ON public.tenants AS RESTRICTIVE FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY round57_no_direct_company_insert ON public.tenants AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY round57_no_direct_company_delete ON public.tenants AS RESTRICTIVE FOR DELETE TO authenticated USING (false);
COMMIT;

