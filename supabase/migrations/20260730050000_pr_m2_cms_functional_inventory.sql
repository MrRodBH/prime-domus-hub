-- PR-M2 consolidated corrective — CMS functional inventory persistence.
BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_pages_tenant_id_id
  ON public.cms_pages (tenant_id, id);

CREATE TABLE IF NOT EXISTS public.cms_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 200),
  author_role text,
  content text NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
  media_id uuid,
  rating integer CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, media_id) REFERENCES public.media_library(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.cms_reusable_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  block_key text NOT NULL CHECK (block_key ~ '^[a-z][a-z0-9_-]{1,80}$'),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  schema_version integer NOT NULL DEFAULT 2 CHECK (schema_version = 2),
  revision bigint NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('draft','published','archived')),
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, block_key, revision)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_reusable_blocks_published
  ON public.cms_reusable_blocks (tenant_id, block_key)
  WHERE status = 'published';
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_reusable_blocks_draft
  ON public.cms_reusable_blocks (tenant_id, block_key)
  WHERE status = 'draft';

CREATE TABLE IF NOT EXISTS public.cms_publication_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  page_id uuid NOT NULL,
  version_id uuid NOT NULL,
  revision bigint NOT NULL CHECK (revision > 0),
  publish_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo' CHECK (timezone = 'America/Sao_Paulo'),
  state text NOT NULL DEFAULT 'scheduled' CHECK (state IN ('scheduled','claimed','published','cancelled','failed')),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, page_id) REFERENCES public.cms_pages(tenant_id, id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_publication_schedules_active_page
  ON public.cms_publication_schedules (tenant_id, page_id)
  WHERE state IN ('scheduled','claimed');
CREATE INDEX IF NOT EXISTS ix_cms_publication_schedules_due
  ON public.cms_publication_schedules (publish_at, tenant_id)
  WHERE state = 'scheduled';

DO $rls$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['cms_testimonials','cms_reusable_blocks','cms_publication_schedules'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
  END LOOP;
END;
$rls$;

CREATE OR REPLACE FUNCTION public.schedule_tenant_cms_publication(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _page_id uuid,
  _version_id uuid,
  _revision bigint,
  _publish_at timestamptz,
  _timezone text,
  _idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_schedule_id uuid;
  v_existing public.cms_publication_schedules%ROWTYPE;
BEGIN
  IF _publish_at <= now() OR _publish_at > now() + interval '2 years' THEN
    RAISE EXCEPTION 'cms_schedule_invalid_time' USING ERRCODE = '22023';
  END IF;
  IF _timezone <> 'America/Sao_Paulo' THEN
    RAISE EXCEPTION 'cms_schedule_invalid_timezone' USING ERRCODE = '22023';
  END IF;
  IF _revision IS NULL OR _revision < 1 OR length(_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'cms_schedule_invalid_input' USING ERRCODE = '22023';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'cms.paginas',
    'publicar'::public.rbac_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'cms_schedule_permission_denied' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cms_pages
    WHERE tenant_id = _tenant_id AND id = _page_id AND current_version_id = _version_id
  ) THEN
    RAISE EXCEPTION 'cms_schedule_page_version_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.cms_publication_schedules
  WHERE tenant_id = _tenant_id AND idempotency_key = _idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.page_id <> _page_id
       OR v_existing.version_id <> _version_id
       OR v_existing.revision <> _revision
       OR v_existing.publish_at <> _publish_at THEN
      RAISE EXCEPTION 'cms_schedule_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'scheduleId', v_existing.id::text,
      'state', v_existing.state,
      'publishAt', v_existing.publish_at,
      'idempotentReplay', true
    );
  END IF;

  INSERT INTO public.cms_publication_schedules (
    tenant_id, page_id, version_id, revision, publish_at, timezone,
    idempotency_key, created_by
  ) VALUES (
    _tenant_id, _page_id, _version_id, _revision, _publish_at, _timezone,
    _idempotency_key, _actor_user_id
  ) RETURNING id INTO v_schedule_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id, _actor_user_id, 'cms.publication.scheduled',
    'cms_publication_schedules', v_schedule_id::text,
    jsonb_build_object('pageId', _page_id::text, 'versionId', _version_id::text, 'revision', _revision, 'publishAt', _publish_at)
  );

  RETURN jsonb_build_object(
    'scheduleId', v_schedule_id::text,
    'state', 'scheduled',
    'publishAt', _publish_at,
    'idempotentReplay', false
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.cancel_tenant_cms_publication_schedule(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _schedule_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_decision jsonb;
BEGIN
  v_decision := public.resolve_tenant_permission(
    _actor_user_id, _tenant_id, _tenant_origin,
    'cms.paginas', 'publicar'::public.rbac_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'cms_schedule_permission_denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cms_publication_schedules
     SET state = 'cancelled', completed_at = now(), updated_at = now()
   WHERE tenant_id = _tenant_id AND id = _schedule_id AND state = 'scheduled';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'cms_schedule_not_found_or_not_cancellable' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id)
  VALUES (_tenant_id, _actor_user_id, 'cms.publication.schedule_cancelled', 'cms_publication_schedules', _schedule_id::text);

  RETURN jsonb_build_object('scheduleId', _schedule_id::text, 'state', 'cancelled');
END;
$fn$;

REVOKE ALL ON FUNCTION public.schedule_tenant_cms_publication(uuid,uuid,text,uuid,uuid,bigint,timestamptz,text,text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_tenant_cms_publication_schedule(uuid,uuid,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_tenant_cms_publication(uuid,uuid,text,uuid,uuid,bigint,timestamptz,text,text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_tenant_cms_publication_schedule(uuid,uuid,text,uuid)
  TO service_role;

COMMIT;
