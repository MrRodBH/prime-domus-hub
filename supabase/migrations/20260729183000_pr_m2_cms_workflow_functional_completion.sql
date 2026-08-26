-- PR-M2 — CMS Workflow, Page Builder & Extensibility Functional Completion
--
-- Canonical model:
--   immutable content snapshots + explicit current draft/published pointers
--   + service-role-only transactional mutations
--   + legacy base tables retained only as read projections.
--
-- This migration is additive and is intentionally not applied to the managed
-- backend by the GitHub-native implementation run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Version ledgers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cms_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES public.cms_pages(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema_version integer NOT NULL CHECK (schema_version >= 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  based_on_revision bigint,
  source_version_id uuid REFERENCES public.cms_page_versions(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  UNIQUE (tenant_id, page_id, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_page_versions_one_draft
  ON public.cms_page_versions (tenant_id, page_id)
  WHERE status = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_page_versions_one_published
  ON public.cms_page_versions (tenant_id, page_id)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS ix_cms_page_versions_history
  ON public.cms_page_versions (tenant_id, page_id, revision DESC);

CREATE TABLE IF NOT EXISTS public.cms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  name text NOT NULL,
  page_type text NOT NULL,
  layout_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  current_version_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_key)
);

CREATE TABLE IF NOT EXISTS public.cms_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.cms_templates(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  schema_version integer NOT NULL CHECK (schema_version > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, template_id, revision)
);

ALTER TABLE public.cms_templates
  DROP CONSTRAINT IF EXISTS cms_templates_current_version_id_fkey;
ALTER TABLE public.cms_templates
  ADD CONSTRAINT cms_templates_current_version_id_fkey
  FOREIGN KEY (current_version_id) REFERENCES public.cms_template_versions(id);

CREATE INDEX IF NOT EXISTS ix_cms_template_versions_history
  ON public.cms_template_versions (tenant_id, template_id, revision DESC);

CREATE TABLE IF NOT EXISTS public.cms_form_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.cms_forms(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema_version integer NOT NULL CHECK (schema_version >= 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  based_on_revision bigint,
  source_version_id uuid REFERENCES public.cms_form_versions(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  UNIQUE (tenant_id, form_id, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_form_versions_one_draft
  ON public.cms_form_versions (tenant_id, form_id)
  WHERE status = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_form_versions_one_published
  ON public.cms_form_versions (tenant_id, form_id)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS ix_cms_form_versions_history
  ON public.cms_form_versions (tenant_id, form_id, revision DESC);

CREATE TABLE IF NOT EXISTS public.cms_campaign_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.cms_campaigns(id) ON DELETE CASCADE,
  revision bigint NOT NULL CHECK (revision > 0),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema_version integer NOT NULL CHECK (schema_version >= 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  based_on_revision bigint,
  source_version_id uuid REFERENCES public.cms_campaign_versions(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  archived_at timestamptz,
  UNIQUE (tenant_id, campaign_id, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_campaign_versions_one_draft
  ON public.cms_campaign_versions (tenant_id, campaign_id)
  WHERE status = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_campaign_versions_one_published
  ON public.cms_campaign_versions (tenant_id, campaign_id)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS ix_cms_campaign_versions_history
  ON public.cms_campaign_versions (tenant_id, campaign_id, revision DESC);

-- ---------------------------------------------------------------------------
-- 2. Current state pointers and optimistic revisions
-- ---------------------------------------------------------------------------

ALTER TABLE public.cms_pages
  ADD COLUMN IF NOT EXISTS page_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS layout_type text NOT NULL DEFAULT 'single_column',
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_version_id uuid,
  ADD COLUMN IF NOT EXISTS published_version_id uuid,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_page_type_contract;
ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_page_type_contract
  CHECK (page_type IN ('standard', 'landing', 'institutional'));
ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_layout_type_contract;
ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_layout_type_contract
  CHECK (layout_type IN ('single_column', 'sidebar_right', 'full_width'));
ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_revision_contract;
ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_revision_contract CHECK (revision >= 0);
ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_draft_version_id_fkey;
ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_draft_version_id_fkey
  FOREIGN KEY (draft_version_id) REFERENCES public.cms_page_versions(id);
ALTER TABLE public.cms_pages
  DROP CONSTRAINT IF EXISTS cms_pages_published_version_id_fkey;
ALTER TABLE public.cms_pages
  ADD CONSTRAINT cms_pages_published_version_id_fkey
  FOREIGN KEY (published_version_id) REFERENCES public.cms_page_versions(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_pages_tenant_slug
  ON public.cms_pages (tenant_id, slug);
CREATE INDEX IF NOT EXISTS ix_cms_pages_public_projection
  ON public.cms_pages (tenant_id, slug)
  WHERE published_version_id IS NOT NULL AND status = 'published';

ALTER TABLE public.cms_forms
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_version_id uuid,
  ADD COLUMN IF NOT EXISTS published_version_id uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

ALTER TABLE public.cms_forms
  DROP CONSTRAINT IF EXISTS cms_forms_revision_contract;
ALTER TABLE public.cms_forms
  ADD CONSTRAINT cms_forms_revision_contract CHECK (revision >= 0);
ALTER TABLE public.cms_forms
  DROP CONSTRAINT IF EXISTS cms_forms_draft_version_id_fkey;
ALTER TABLE public.cms_forms
  ADD CONSTRAINT cms_forms_draft_version_id_fkey
  FOREIGN KEY (draft_version_id) REFERENCES public.cms_form_versions(id);
ALTER TABLE public.cms_forms
  DROP CONSTRAINT IF EXISTS cms_forms_published_version_id_fkey;
ALTER TABLE public.cms_forms
  ADD CONSTRAINT cms_forms_published_version_id_fkey
  FOREIGN KEY (published_version_id) REFERENCES public.cms_form_versions(id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_forms_tenant_slug
  ON public.cms_forms (tenant_id, slug);
CREATE INDEX IF NOT EXISTS ix_cms_forms_public_projection
  ON public.cms_forms (tenant_id, slug)
  WHERE published_version_id IS NOT NULL AND status = 'published';

ALTER TABLE public.cms_campaigns
  ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draft_version_id uuid,
  ADD COLUMN IF NOT EXISTS published_version_id uuid,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS unpublished_at timestamptz;

ALTER TABLE public.cms_campaigns
  DROP CONSTRAINT IF EXISTS cms_campaigns_revision_contract;
ALTER TABLE public.cms_campaigns
  ADD CONSTRAINT cms_campaigns_revision_contract CHECK (revision >= 0);
ALTER TABLE public.cms_campaigns
  DROP CONSTRAINT IF EXISTS cms_campaigns_draft_version_id_fkey;
ALTER TABLE public.cms_campaigns
  ADD CONSTRAINT cms_campaigns_draft_version_id_fkey
  FOREIGN KEY (draft_version_id) REFERENCES public.cms_campaign_versions(id);
ALTER TABLE public.cms_campaigns
  DROP CONSTRAINT IF EXISTS cms_campaigns_published_version_id_fkey;
ALTER TABLE public.cms_campaigns
  ADD CONSTRAINT cms_campaigns_published_version_id_fkey
  FOREIGN KEY (published_version_id) REFERENCES public.cms_campaign_versions(id);

CREATE INDEX IF NOT EXISTS ix_cms_campaigns_public_projection
  ON public.cms_campaigns (tenant_id, prioridade DESC, id)
  WHERE published_version_id IS NOT NULL AND status = 'active';

-- ---------------------------------------------------------------------------
-- 3. Content immutability and common validation
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cms_protect_version_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.page_id IS DISTINCT FROM OLD.page_id
     OR NEW.revision IS DISTINCT FROM OLD.revision
     OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR NEW.based_on_revision IS DISTINCT FROM OLD.based_on_revision
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'cms_page_version_content_immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'draft' AND NEW.status IN ('published', 'archived'))
    OR (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'cms_page_version_transition_invalid' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cms_page_versions_protect_content ON public.cms_page_versions;
CREATE TRIGGER trg_cms_page_versions_protect_content
BEFORE UPDATE ON public.cms_page_versions
FOR EACH ROW EXECUTE FUNCTION public.cms_protect_version_content();

CREATE OR REPLACE FUNCTION public.cms_protect_form_version_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.form_id IS DISTINCT FROM OLD.form_id
     OR NEW.revision IS DISTINCT FROM OLD.revision
     OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR NEW.based_on_revision IS DISTINCT FROM OLD.based_on_revision
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'cms_form_version_content_immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'draft' AND NEW.status IN ('published', 'archived'))
    OR (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'cms_form_version_transition_invalid' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cms_form_versions_protect_content ON public.cms_form_versions;
CREATE TRIGGER trg_cms_form_versions_protect_content
BEFORE UPDATE ON public.cms_form_versions
FOR EACH ROW EXECUTE FUNCTION public.cms_protect_form_version_content();

CREATE OR REPLACE FUNCTION public.cms_protect_campaign_version_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
     OR NEW.revision IS DISTINCT FROM OLD.revision
     OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
     OR NEW.based_on_revision IS DISTINCT FROM OLD.based_on_revision
     OR NEW.source_version_id IS DISTINCT FROM OLD.source_version_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'cms_campaign_version_content_immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'draft' AND NEW.status IN ('published', 'archived'))
    OR (OLD.status = 'published' AND NEW.status = 'archived')
  ) THEN
    RAISE EXCEPTION 'cms_campaign_version_transition_invalid' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_cms_campaign_versions_protect_content ON public.cms_campaign_versions;
CREATE TRIGGER trg_cms_campaign_versions_protect_content
BEFORE UPDATE ON public.cms_campaign_versions
FOR EACH ROW EXECUTE FUNCTION public.cms_protect_campaign_version_content();

CREATE OR REPLACE FUNCTION public.validate_tenant_cms_snapshot(
  _tenant_id uuid,
  _content_type text,
  _snapshot jsonb
) RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_reference text;
BEGIN
  IF _tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023';
  END IF;
  IF _content_type NOT IN ('page', 'template', 'form', 'campaign') THEN
    RAISE EXCEPTION 'cms_content_type_not_cataloged' USING ERRCODE = '22023';
  END IF;
  IF _snapshot IS NULL OR jsonb_typeof(_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'cms_snapshot_invalid' USING ERRCODE = '22023';
  END IF;
  IF octet_length(_snapshot::text) > 2097152 THEN
    RAISE EXCEPTION 'cms_snapshot_too_large' USING ERRCODE = '22023';
  END IF;
  IF COALESCE((_snapshot->>'schema_version')::integer, -1) <> 1 THEN
    RAISE EXCEPTION 'cms_schema_version_not_supported' USING ERRCODE = '22023';
  END IF;
  IF _snapshot::text ~* '<script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]*=|onclick[[:space:]]*=|eval[[:space:]]*\(' THEN
    RAISE EXCEPTION 'cms_runtime_code_prohibited' USING ERRCODE = '22023';
  END IF;
  IF _snapshot::text ~* '"(client_secret|refresh_token|private_key|api_key|access_token|password|script|componentName|typescript|javascript|css)"[[:space:]]*:' THEN
    RAISE EXCEPTION 'cms_runtime_extension_or_secret_key_prohibited' USING ERRCODE = '22023';
  END IF;

  IF _snapshot ? 'media_references' THEN
    IF jsonb_typeof(_snapshot->'media_references') <> 'array' THEN
      RAISE EXCEPTION 'cms_media_references_array_required' USING ERRCODE = '22023';
    END IF;
    FOR v_reference IN SELECT jsonb_array_elements_text(_snapshot->'media_references')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.media_library
        WHERE id = v_reference::uuid AND tenant_id = _tenant_id
      ) THEN
        RAISE EXCEPTION 'cms_media_reference_invalid:%', v_reference USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;

  IF _snapshot ? 'form_references' THEN
    IF jsonb_typeof(_snapshot->'form_references') <> 'array' THEN
      RAISE EXCEPTION 'cms_form_references_array_required' USING ERRCODE = '22023';
    END IF;
    FOR v_reference IN SELECT jsonb_array_elements_text(_snapshot->'form_references')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.cms_forms
        WHERE id = v_reference::uuid AND tenant_id = _tenant_id
      ) THEN
        RAISE EXCEPTION 'cms_form_reference_invalid:%', v_reference USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;

  IF _snapshot ? 'campaign_references' THEN
    IF jsonb_typeof(_snapshot->'campaign_references') <> 'array' THEN
      RAISE EXCEPTION 'cms_campaign_references_array_required' USING ERRCODE = '22023';
    END IF;
    FOR v_reference IN SELECT jsonb_array_elements_text(_snapshot->'campaign_references')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.cms_campaigns
        WHERE id = v_reference::uuid AND tenant_id = _tenant_id
      ) THEN
        RAISE EXCEPTION 'cms_campaign_reference_invalid:%', v_reference USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;

  IF _snapshot ? 'target_page_ids' THEN
    IF jsonb_typeof(_snapshot->'target_page_ids') <> 'array' THEN
      RAISE EXCEPTION 'cms_target_pages_array_required' USING ERRCODE = '22023';
    END IF;
    FOR v_reference IN SELECT jsonb_array_elements_text(_snapshot->'target_page_ids')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.cms_pages
        WHERE id = v_reference::uuid AND tenant_id = _tenant_id
      ) THEN
        RAISE EXCEPTION 'cms_target_page_invalid:%', v_reference USING ERRCODE = '42501';
      END IF;
    END LOOP;
  END IF;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 4. Deterministic legacy backfill into the canonical ledgers
-- ---------------------------------------------------------------------------

INSERT INTO public.cms_page_versions (
  tenant_id, page_id, revision, status, schema_version, snapshot, content_hash,
  based_on_revision, created_by, created_at, published_at
)
SELECT
  p.tenant_id,
  p.id,
  1,
  CASE WHEN p.status = 'published' THEN 'published' ELSE 'draft' END,
  0,
  jsonb_build_object(
    'page_id', p.id,
    'page_type', 'standard',
    'schema_version', 0,
    'legacy_snapshot', true,
    'slug', p.slug,
    'title', p.titulo,
    'description', p.descricao,
    'seo', COALESCE(p.seo, '{}'::jsonb),
    'layout', jsonb_build_object(
      'type', 'single_column',
      'sections', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', COALESCE(block->>'id', gen_random_uuid()::text),
            'type', block->>'type',
            'region', 'main',
            'data', COALESCE(block->'data', '{}'::jsonb)
          )
        )
        FROM jsonb_array_elements(COALESCE(p.blocks, '[]'::jsonb)) block
      ), '[]'::jsonb)
    ),
    'navigation_references', '[]'::jsonb,
    'form_references', '[]'::jsonb,
    'campaign_references', '[]'::jsonb,
    'media_references', '[]'::jsonb,
    'configuration_references', '[]'::jsonb
  ),
  encode(digest(
    jsonb_build_object(
      'page_id', p.id,
      'schema_version', 0,
      'slug', p.slug,
      'title', p.titulo,
      'seo', COALESCE(p.seo, '{}'::jsonb),
      'blocks', COALESCE(p.blocks, '[]'::jsonb)
    )::text,
    'sha256'
  ), 'hex'),
  NULL,
  COALESCE(p.updated_by, p.created_by),
  COALESCE(p.updated_at, p.created_at, now()),
  CASE WHEN p.status = 'published' THEN COALESCE(p.published_at, p.updated_at, now()) ELSE NULL END
FROM public.cms_pages p
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_page_versions v
  WHERE v.tenant_id = p.tenant_id AND v.page_id = p.id
)
AND EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = p.tenant_id
);

UPDATE public.cms_pages p
SET
  revision = v.revision,
  schema_version = v.schema_version,
  draft_version_id = CASE WHEN v.status = 'draft' THEN v.id ELSE NULL END,
  published_version_id = CASE WHEN v.status = 'published' THEN v.id ELSE NULL END
FROM public.cms_page_versions v
WHERE v.tenant_id = p.tenant_id
  AND v.page_id = p.id
  AND v.revision = 1
  AND p.revision = 0
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = p.tenant_id
  );

INSERT INTO public.cms_form_versions (
  tenant_id, form_id, revision, status, schema_version, snapshot, content_hash,
  created_by, created_at, published_at
)
SELECT
  f.tenant_id,
  f.id,
  1,
  CASE WHEN f.status = 'published' THEN 'published' ELSE 'draft' END,
  0,
  jsonb_build_object(
    'form_id', f.id,
    'schema_version', 0,
    'legacy_snapshot', true,
    'nome', f.nome,
    'slug', f.slug,
    'descricao', f.descricao,
    'config', COALESCE(f.config, '{}'::jsonb),
    'fields', COALESCE((
      SELECT jsonb_agg(to_jsonb(ff) - 'tenant_id' ORDER BY ff.ordem, ff.id)
      FROM public.cms_form_fields ff
      WHERE ff.tenant_id = f.tenant_id AND ff.form_id = f.id
    ), '[]'::jsonb)
  ),
  encode(digest(
    jsonb_build_object(
      'form_id', f.id,
      'schema_version', 0,
      'nome', f.nome,
      'slug', f.slug,
      'config', COALESCE(f.config, '{}'::jsonb)
    )::text,
    'sha256'
  ), 'hex'),
  f.created_by,
  COALESCE(f.updated_at, f.created_at, now()),
  CASE WHEN f.status = 'published' THEN COALESCE(f.updated_at, now()) ELSE NULL END
FROM public.cms_forms f
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_form_versions v
  WHERE v.tenant_id = f.tenant_id AND v.form_id = f.id
)
AND EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = f.tenant_id
);

UPDATE public.cms_forms f
SET
  revision = v.revision,
  schema_version = v.schema_version,
  draft_version_id = CASE WHEN v.status = 'draft' THEN v.id ELSE NULL END,
  published_version_id = CASE WHEN v.status = 'published' THEN v.id ELSE NULL END,
  published_at = CASE WHEN v.status = 'published' THEN v.published_at ELSE NULL END
FROM public.cms_form_versions v
WHERE v.tenant_id = f.tenant_id
  AND v.form_id = f.id
  AND v.revision = 1
  AND f.revision = 0
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = f.tenant_id
  );

INSERT INTO public.cms_campaign_versions (
  tenant_id, campaign_id, revision, status, schema_version, snapshot, content_hash,
  created_by, created_at, published_at
)
SELECT
  c.tenant_id,
  c.id,
  1,
  CASE WHEN c.status = 'active' THEN 'published' ELSE 'draft' END,
  0,
  jsonb_build_object(
    'campaign_id', c.id,
    'schema_version', 0,
    'legacy_snapshot', true,
    'nome', c.nome,
    'tipo', c.tipo,
    'prioridade', c.prioridade,
    'conteudo', COALESCE(c.conteudo, '{}'::jsonb),
    'segmentacao', COALESCE(c.segmentacao, '{}'::jsonb),
    'frequencia', COALESCE(c.frequencia, '{}'::jsonb),
    'start_at', c.start_at,
    'end_at', c.end_at,
    'target_page_ids', '[]'::jsonb
  ),
  encode(digest(
    jsonb_build_object(
      'campaign_id', c.id,
      'schema_version', 0,
      'nome', c.nome,
      'tipo', c.tipo,
      'conteudo', COALESCE(c.conteudo, '{}'::jsonb)
    )::text,
    'sha256'
  ), 'hex'),
  c.created_by,
  COALESCE(c.updated_at, c.created_at, now()),
  CASE WHEN c.status = 'active' THEN COALESCE(c.start_at, c.updated_at, now()) ELSE NULL END
FROM public.cms_campaigns c
WHERE NOT EXISTS (
  SELECT 1 FROM public.cms_campaign_versions v
  WHERE v.tenant_id = c.tenant_id AND v.campaign_id = c.id
)
AND EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = c.tenant_id
);

UPDATE public.cms_campaigns c
SET
  revision = v.revision,
  schema_version = v.schema_version,
  draft_version_id = CASE WHEN v.status = 'draft' THEN v.id ELSE NULL END,
  published_version_id = CASE WHEN v.status = 'published' THEN v.id ELSE NULL END,
  published_at = CASE WHEN v.status = 'published' THEN v.published_at ELSE NULL END
FROM public.cms_campaign_versions v
WHERE v.tenant_id = c.tenant_id
  AND v.campaign_id = c.id
  AND v.revision = 1
  AND c.revision = 0
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = c.tenant_id
  );

-- ---------------------------------------------------------------------------
-- 5. Transactional page primitives
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_page_draft(
  _tenant_id uuid,
  _actor_user_id uuid,
  _page_id uuid,
  _expected_revision bigint,
  _snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_page public.cms_pages%ROWTYPE;
  v_page_id uuid;
  v_revision bigint;
  v_version_id uuid;
  v_hash text;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'page', _snapshot);
  v_hash := encode(digest(_snapshot::text, 'sha256'), 'hex');

  IF _page_id IS NULL THEN
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'cms_page_revision_conflict' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.cms_pages (
      tenant_id, slug, titulo, descricao, status, seo, blocks,
      page_type, layout_type, schema_version, revision, created_by, updated_by
    ) VALUES (
      _tenant_id,
      _snapshot->>'slug',
      _snapshot->>'title',
      NULLIF(_snapshot->>'description', ''),
      'draft',
      COALESCE(_snapshot->'seo', '{}'::jsonb),
      COALESCE(_snapshot#>'{layout,sections}', '[]'::jsonb),
      _snapshot->>'page_type',
      _snapshot#>>'{layout,type}',
      (_snapshot->>'schema_version')::integer,
      1,
      _actor_user_id,
      _actor_user_id
    ) RETURNING id INTO v_page_id;
    v_revision := 1;
  ELSE
    SELECT * INTO v_page
    FROM public.cms_pages
    WHERE id = _page_id AND tenant_id = _tenant_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_not_found' USING ERRCODE = 'P0002'; END IF;
    IF v_page.revision <> _expected_revision THEN
      RAISE EXCEPTION 'cms_page_revision_conflict' USING ERRCODE = '40001';
    END IF;
    v_page_id := v_page.id;
    v_revision := v_page.revision + 1;
    UPDATE public.cms_page_versions
    SET status = 'archived', archived_at = now()
    WHERE tenant_id = _tenant_id AND page_id = v_page_id AND status = 'draft';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.cms_pages
    WHERE tenant_id = _tenant_id
      AND slug = _snapshot->>'slug'
      AND id <> v_page_id
  ) THEN
    RAISE EXCEPTION 'cms_page_slug_conflict' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.cms_page_versions (
    tenant_id, page_id, revision, status, schema_version, snapshot,
    content_hash, based_on_revision, created_by
  ) VALUES (
    _tenant_id, v_page_id, v_revision, 'draft',
    (_snapshot->>'schema_version')::integer, _snapshot,
    v_hash, NULLIF(_expected_revision, 0), _actor_user_id
  ) RETURNING id INTO v_version_id;

  UPDATE public.cms_pages
  SET
    slug = _snapshot->>'slug',
    titulo = _snapshot->>'title',
    descricao = NULLIF(_snapshot->>'description', ''),
    seo = COALESCE(_snapshot->'seo', '{}'::jsonb),
    blocks = COALESCE(_snapshot#>'{layout,sections}', '[]'::jsonb),
    page_type = _snapshot->>'page_type',
    layout_type = _snapshot#>>'{layout,type}',
    schema_version = (_snapshot->>'schema_version')::integer,
    revision = v_revision,
    draft_version_id = v_version_id,
    status = CASE WHEN published_version_id IS NULL THEN 'draft' ELSE status END,
    updated_by = _actor_user_id,
    updated_at = now()
  WHERE id = v_page_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.page.draft.saved', 'cms_pages', v_page_id,
    CASE WHEN _page_id IS NULL THEN NULL ELSE to_jsonb(v_page) END,
    jsonb_build_object('page_id', v_page_id, 'version_id', v_version_id, 'revision', v_revision, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'pageId', v_page_id,
    'versionId', v_version_id,
    'revision', v_revision,
    'status', 'draft',
    'contentHash', v_hash
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'cms_page_slug_conflict' USING ERRCODE = '23505';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.publish_tenant_page(
  _tenant_id uuid,
  _actor_user_id uuid,
  _page_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_page public.cms_pages%ROWTYPE;
  v_draft public.cms_page_versions%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO v_page FROM public.cms_pages
  WHERE id = _page_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_page.revision <> _expected_revision THEN
    RAISE EXCEPTION 'cms_page_revision_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_draft FROM public.cms_page_versions
  WHERE id = v_page.draft_version_id
    AND tenant_id = _tenant_id
    AND page_id = _page_id
    AND status = 'draft'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_draft_not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'page', v_draft.snapshot);

  UPDATE public.cms_page_versions
  SET status = 'archived', archived_at = now()
  WHERE tenant_id = _tenant_id AND page_id = _page_id AND status = 'published';

  UPDATE public.cms_page_versions
  SET status = 'published', published_at = now()
  WHERE id = v_draft.id;

  UPDATE public.cms_pages
  SET
    status = 'published',
    published_version_id = v_draft.id,
    draft_version_id = NULL,
    published_at = now(),
    unpublished_at = NULL,
    updated_by = _actor_user_id,
    updated_at = now()
  WHERE id = _page_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.page.published', 'cms_pages', _page_id,
    jsonb_build_object('published_version_id', v_page.published_version_id, 'draft_version_id', v_page.draft_version_id),
    jsonb_build_object('published_version_id', v_draft.id, 'revision', v_draft.revision, 'content_hash', v_draft.content_hash)
  );

  RETURN jsonb_build_object(
    'pageId', _page_id,
    'versionId', v_draft.id,
    'revision', v_draft.revision,
    'status', 'published',
    'publishedAt', now()
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.unpublish_tenant_page(
  _tenant_id uuid,
  _actor_user_id uuid,
  _page_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_page public.cms_pages%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO v_page FROM public.cms_pages
  WHERE id = _page_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_page.revision <> _expected_revision THEN
    RAISE EXCEPTION 'cms_page_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF v_page.published_version_id IS NULL THEN
    RAISE EXCEPTION 'cms_page_not_published' USING ERRCODE = '22023';
  END IF;

  UPDATE public.cms_page_versions
  SET status = 'archived', archived_at = now()
  WHERE id = v_page.published_version_id
    AND tenant_id = _tenant_id
    AND page_id = _page_id
    AND status = 'published';

  UPDATE public.cms_pages
  SET
    status = CASE WHEN draft_version_id IS NULL THEN 'archived' ELSE 'draft' END,
    published_version_id = NULL,
    published_at = NULL,
    unpublished_at = now(),
    updated_by = _actor_user_id,
    updated_at = now()
  WHERE id = _page_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.page.unpublished', 'cms_pages', _page_id,
    jsonb_build_object('published_version_id', v_page.published_version_id),
    jsonb_build_object('published_version_id', NULL, 'unpublished_at', now())
  );

  RETURN jsonb_build_object('pageId', _page_id, 'revision', v_page.revision, 'status', 'unpublished');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.rollback_tenant_page(
  _tenant_id uuid,
  _actor_user_id uuid,
  _page_id uuid,
  _source_version_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_page public.cms_pages%ROWTYPE;
  v_source public.cms_page_versions%ROWTYPE;
  v_revision bigint;
  v_version_id uuid;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO v_page FROM public.cms_pages
  WHERE id = _page_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_page.revision <> _expected_revision THEN
    RAISE EXCEPTION 'cms_page_revision_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_source FROM public.cms_page_versions
  WHERE id = _source_version_id AND tenant_id = _tenant_id AND page_id = _page_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_page_version_not_found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.cms_page_versions
  SET status = 'archived', archived_at = now()
  WHERE tenant_id = _tenant_id AND page_id = _page_id AND status = 'draft';

  v_revision := v_page.revision + 1;
  INSERT INTO public.cms_page_versions (
    tenant_id, page_id, revision, status, schema_version, snapshot,
    content_hash, based_on_revision, source_version_id, created_by
  ) VALUES (
    _tenant_id, _page_id, v_revision, 'draft', v_source.schema_version,
    v_source.snapshot, v_source.content_hash, v_page.revision,
    v_source.id, _actor_user_id
  ) RETURNING id INTO v_version_id;

  UPDATE public.cms_pages
  SET
    revision = v_revision,
    draft_version_id = v_version_id,
    slug = v_source.snapshot->>'slug',
    titulo = v_source.snapshot->>'title',
    descricao = NULLIF(v_source.snapshot->>'description', ''),
    seo = COALESCE(v_source.snapshot->'seo', '{}'::jsonb),
    blocks = COALESCE(v_source.snapshot#>'{layout,sections}', '[]'::jsonb),
    page_type = COALESCE(v_source.snapshot->>'page_type', page_type),
    layout_type = COALESCE(v_source.snapshot#>>'{layout,type}', layout_type),
    schema_version = v_source.schema_version,
    updated_by = _actor_user_id,
    updated_at = now()
  WHERE id = _page_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.page.rollback.draft.created', 'cms_pages', _page_id,
    jsonb_build_object('source_version_id', v_source.id, 'current_revision', v_page.revision),
    jsonb_build_object('draft_version_id', v_version_id, 'revision', v_revision)
  );

  RETURN jsonb_build_object(
    'pageId', _page_id,
    'versionId', v_version_id,
    'revision', v_revision,
    'status', 'draft',
    'sourceVersionId', v_source.id
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Tenant template primitives
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_template_version(
  _tenant_id uuid,
  _actor_user_id uuid,
  _template_id uuid,
  _template_key text,
  _name text,
  _expected_revision bigint,
  _snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_template public.cms_templates%ROWTYPE;
  v_template_id uuid;
  v_revision bigint;
  v_version_id uuid;
  v_hash text;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'template', _snapshot);
  IF _template_key IS NULL OR _template_key !~ '^[a-z0-9-]{1,120}$' THEN
    RAISE EXCEPTION 'cms_template_key_invalid' USING ERRCODE = '22023';
  END IF;
  v_hash := encode(digest(_snapshot::text, 'sha256'), 'hex');

  IF _template_id IS NULL THEN
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'cms_template_revision_conflict' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.cms_templates (
      tenant_id, template_key, name, page_type, layout_type,
      schema_version, revision, created_by
    ) VALUES (
      _tenant_id, _template_key, _name,
      _snapshot->>'page_type', _snapshot#>>'{layout,type}',
      (_snapshot->>'schema_version')::integer, 1, _actor_user_id
    ) RETURNING id INTO v_template_id;
    v_revision := 1;
  ELSE
    SELECT * INTO v_template FROM public.cms_templates
    WHERE id = _template_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'cms_template_not_found' USING ERRCODE = 'P0002'; END IF;
    IF v_template.revision <> _expected_revision THEN
      RAISE EXCEPTION 'cms_template_revision_conflict' USING ERRCODE = '40001';
    END IF;
    v_template_id := v_template.id;
    v_revision := v_template.revision + 1;
  END IF;

  INSERT INTO public.cms_template_versions (
    tenant_id, template_id, revision, schema_version, snapshot,
    content_hash, created_by
  ) VALUES (
    _tenant_id, v_template_id, v_revision,
    (_snapshot->>'schema_version')::integer, _snapshot, v_hash, _actor_user_id
  ) RETURNING id INTO v_version_id;

  UPDATE public.cms_templates
  SET
    template_key = _template_key,
    name = _name,
    page_type = _snapshot->>'page_type',
    layout_type = _snapshot#>>'{layout,type}',
    schema_version = (_snapshot->>'schema_version')::integer,
    revision = v_revision,
    current_version_id = v_version_id,
    updated_at = now()
  WHERE id = v_template_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.template.version.saved', 'cms_templates', v_template_id,
    CASE WHEN _template_id IS NULL THEN NULL ELSE to_jsonb(v_template) END,
    jsonb_build_object('version_id', v_version_id, 'revision', v_revision, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'templateId', v_template_id,
    'versionId', v_version_id,
    'revision', v_revision,
    'contentHash', v_hash
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.instantiate_tenant_template(
  _tenant_id uuid,
  _actor_user_id uuid,
  _template_id uuid,
  _template_version_id uuid,
  _slug text,
  _title text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_version public.cms_template_versions%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT tv.* INTO v_version
  FROM public.cms_template_versions tv
  JOIN public.cms_templates t
    ON t.id = tv.template_id
   AND t.tenant_id = tv.tenant_id
  WHERE tv.id = _template_version_id
    AND tv.template_id = _template_id
    AND tv.tenant_id = _tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_template_not_found' USING ERRCODE = 'P0002'; END IF;
  v_snapshot := jsonb_set(
    jsonb_set(v_version.snapshot, '{slug}', to_jsonb(_slug), true),
    '{title}', to_jsonb(_title), true
  );
  RETURN public.save_tenant_page_draft(
    _tenant_id, _actor_user_id, NULL, 0, v_snapshot
  ) || jsonb_build_object('templateId', _template_id, 'templateVersionId', _template_version_id);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Form primitives
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_form_definition(
  _tenant_id uuid,
  _actor_user_id uuid,
  _form_id uuid,
  _expected_revision bigint,
  _snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_form public.cms_forms%ROWTYPE;
  v_form_id uuid;
  v_revision bigint;
  v_version_id uuid;
  v_hash text;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'form', _snapshot);
  v_hash := encode(digest(_snapshot::text, 'sha256'), 'hex');

  IF _form_id IS NULL THEN
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'cms_form_revision_conflict' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.cms_forms (
      tenant_id, nome, slug, status, descricao, config,
      schema_version, revision, created_by
    ) VALUES (
      _tenant_id, _snapshot->>'nome', _snapshot->>'slug', 'draft',
      NULLIF(_snapshot->>'descricao', ''), COALESCE(_snapshot->'config', '{}'::jsonb),
      (_snapshot->>'schema_version')::integer, 1, _actor_user_id
    ) RETURNING id INTO v_form_id;
    v_revision := 1;
  ELSE
    SELECT * INTO v_form FROM public.cms_forms
    WHERE id = _form_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'cms_form_not_found' USING ERRCODE = 'P0002'; END IF;
    IF v_form.revision <> _expected_revision THEN
      RAISE EXCEPTION 'cms_form_revision_conflict' USING ERRCODE = '40001';
    END IF;
    v_form_id := v_form.id;
    v_revision := v_form.revision + 1;
    UPDATE public.cms_form_versions
    SET status = 'archived', archived_at = now()
    WHERE tenant_id = _tenant_id AND form_id = v_form_id AND status = 'draft';
  END IF;

  INSERT INTO public.cms_form_versions (
    tenant_id, form_id, revision, status, schema_version, snapshot,
    content_hash, based_on_revision, created_by
  ) VALUES (
    _tenant_id, v_form_id, v_revision, 'draft',
    (_snapshot->>'schema_version')::integer, _snapshot,
    v_hash, NULLIF(_expected_revision, 0), _actor_user_id
  ) RETURNING id INTO v_version_id;

  UPDATE public.cms_forms
  SET
    nome = _snapshot->>'nome',
    slug = _snapshot->>'slug',
    descricao = NULLIF(_snapshot->>'descricao', ''),
    schema_version = (_snapshot->>'schema_version')::integer,
    revision = v_revision,
    draft_version_id = v_version_id,
    status = CASE WHEN published_version_id IS NULL THEN 'draft' ELSE status END,
    updated_at = now()
  WHERE id = v_form_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.form.draft.saved', 'cms_forms', v_form_id,
    CASE WHEN _form_id IS NULL THEN NULL ELSE to_jsonb(v_form) END,
    jsonb_build_object('version_id', v_version_id, 'revision', v_revision, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'formId', v_form_id,
    'versionId', v_version_id,
    'revision', v_revision,
    'status', 'draft',
    'contentHash', v_hash
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'cms_form_slug_conflict' USING ERRCODE = '23505';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.publish_tenant_form(
  _tenant_id uuid,
  _actor_user_id uuid,
  _form_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_form public.cms_forms%ROWTYPE;
  v_draft public.cms_form_versions%ROWTYPE;
  v_field jsonb;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO v_form FROM public.cms_forms
  WHERE id = _form_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_form_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_form.revision <> _expected_revision THEN
    RAISE EXCEPTION 'cms_form_revision_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_draft FROM public.cms_form_versions
  WHERE id = v_form.draft_version_id
    AND tenant_id = _tenant_id
    AND form_id = _form_id
    AND status = 'draft'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_form_draft_not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'form', v_draft.snapshot);

  UPDATE public.cms_form_versions
  SET status = 'archived', archived_at = now()
  WHERE tenant_id = _tenant_id AND form_id = _form_id AND status = 'published';
  UPDATE public.cms_form_versions
  SET status = 'published', published_at = now()
  WHERE id = v_draft.id;

  DELETE FROM public.cms_form_fields
  WHERE tenant_id = _tenant_id AND form_id = _form_id;

  FOR v_field IN SELECT value FROM jsonb_array_elements(COALESCE(v_draft.snapshot->'fields', '[]'::jsonb))
  LOOP
    INSERT INTO public.cms_form_fields (
      tenant_id, form_id, ordem, tipo, nome, label, placeholder, ajuda,
      obrigatorio, opcoes, validacao, valor_padrao, largura
    ) VALUES (
      _tenant_id,
      _form_id,
      COALESCE((v_field->>'ordem')::integer, 0),
      v_field->>'tipo',
      v_field->>'nome',
      v_field->>'label',
      NULLIF(v_field->>'placeholder', ''),
      NULLIF(v_field->>'ajuda', ''),
      COALESCE((v_field->>'obrigatorio')::boolean, false),
      COALESCE(v_field->'opcoes', '[]'::jsonb),
      COALESCE(v_field->'validacao', '{}'::jsonb),
      NULLIF(v_field->>'valor_padrao', ''),
      COALESCE(v_field->>'largura', 'full')
    );
  END LOOP;

  UPDATE public.cms_forms
  SET
    nome = v_draft.snapshot->>'nome',
    slug = v_draft.snapshot->>'slug',
    descricao = NULLIF(v_draft.snapshot->>'descricao', ''),
    config = COALESCE(v_draft.snapshot->'config', '{}'::jsonb),
    status = 'published',
    published_version_id = v_draft.id,
    draft_version_id = NULL,
    published_at = now(),
    unpublished_at = NULL,
    updated_at = now()
  WHERE id = _form_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.form.published', 'cms_forms', _form_id,
    jsonb_build_object('published_version_id', v_form.published_version_id),
    jsonb_build_object('published_version_id', v_draft.id, 'revision', v_draft.revision, 'content_hash', v_draft.content_hash)
  );

  RETURN jsonb_build_object(
    'formId', _form_id,
    'versionId', v_draft.id,
    'revision', v_draft.revision,
    'status', 'published'
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 8. Campaign primitives
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_campaign_definition(
  _tenant_id uuid,
  _actor_user_id uuid,
  _campaign_id uuid,
  _expected_revision bigint,
  _snapshot jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_campaign public.cms_campaigns%ROWTYPE;
  v_campaign_id uuid;
  v_revision bigint;
  v_version_id uuid;
  v_hash text;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found' USING ERRCODE = '22023'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'campaign', _snapshot);
  v_hash := encode(digest(_snapshot::text, 'sha256'), 'hex');

  IF _campaign_id IS NULL THEN
    IF COALESCE(_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION 'cms_campaign_revision_conflict' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.cms_campaigns (
      tenant_id, nome, tipo, status, prioridade, conteudo, segmentacao,
      frequencia, start_at, end_at, schema_version, revision, created_by
    ) VALUES (
      _tenant_id, _snapshot->>'nome', _snapshot->>'tipo', 'draft',
      COALESCE((_snapshot->>'prioridade')::integer, 0),
      COALESCE(_snapshot->'conteudo', '{}'::jsonb),
      COALESCE(_snapshot->'segmentacao', '{}'::jsonb),
      COALESCE(_snapshot->'frequencia', '{}'::jsonb),
      NULLIF(_snapshot->>'start_at', '')::timestamptz,
      NULLIF(_snapshot->>'end_at', '')::timestamptz,
      (_snapshot->>'schema_version')::integer,
      1,
      _actor_user_id
    ) RETURNING id INTO v_campaign_id;
    v_revision := 1;
  ELSE
    SELECT * INTO v_campaign FROM public.cms_campaigns
    WHERE id = _campaign_id AND tenant_id = _tenant_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'cms_campaign_not_found' USING ERRCODE = 'P0002'; END IF;
    IF v_campaign.revision <> _expected_revision THEN
      RAISE EXCEPTION 'cms_campaign_revision_conflict' USING ERRCODE = '40001';
    END IF;
    v_campaign_id := v_campaign.id;
    v_revision := v_campaign.revision + 1;
    UPDATE public.cms_campaign_versions
    SET status = 'archived', archived_at = now()
    WHERE tenant_id = _tenant_id AND campaign_id = v_campaign_id AND status = 'draft';
  END IF;

  INSERT INTO public.cms_campaign_versions (
    tenant_id, campaign_id, revision, status, schema_version, snapshot,
    content_hash, based_on_revision, created_by
  ) VALUES (
    _tenant_id, v_campaign_id, v_revision, 'draft',
    (_snapshot->>'schema_version')::integer, _snapshot,
    v_hash, NULLIF(_expected_revision, 0), _actor_user_id
  ) RETURNING id INTO v_version_id;

  UPDATE public.cms_campaigns
  SET
    nome = _snapshot->>'nome',
    tipo = _snapshot->>'tipo',
    schema_version = (_snapshot->>'schema_version')::integer,
    revision = v_revision,
    draft_version_id = v_version_id,
    status = CASE WHEN published_version_id IS NULL THEN 'draft' ELSE status END,
    updated_at = now()
  WHERE id = v_campaign_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.campaign.draft.saved', 'cms_campaigns', v_campaign_id,
    CASE WHEN _campaign_id IS NULL THEN NULL ELSE to_jsonb(v_campaign) END,
    jsonb_build_object('version_id', v_version_id, 'revision', v_revision, 'content_hash', v_hash)
  );

  RETURN jsonb_build_object(
    'campaignId', v_campaign_id,
    'versionId', v_version_id,
    'revision', v_revision,
    'status', 'draft',
    'contentHash', v_hash
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.publish_tenant_campaign(
  _tenant_id uuid,
  _actor_user_id uuid,
  _campaign_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_campaign public.cms_campaigns%ROWTYPE;
  v_draft public.cms_campaign_versions%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO v_campaign FROM public.cms_campaigns
  WHERE id = _campaign_id AND tenant_id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_campaign_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_campaign.revision <> _expected_revision THEN
    RAISE EXCEPTION 'cms_campaign_revision_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT * INTO v_draft FROM public.cms_campaign_versions
  WHERE id = v_campaign.draft_version_id
    AND tenant_id = _tenant_id
    AND campaign_id = _campaign_id
    AND status = 'draft'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'cms_campaign_draft_not_found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.validate_tenant_cms_snapshot(_tenant_id, 'campaign', v_draft.snapshot);

  UPDATE public.cms_campaign_versions
  SET status = 'archived', archived_at = now()
  WHERE tenant_id = _tenant_id AND campaign_id = _campaign_id AND status = 'published';
  UPDATE public.cms_campaign_versions
  SET status = 'published', published_at = now()
  WHERE id = v_draft.id;

  UPDATE public.cms_campaigns
  SET
    nome = v_draft.snapshot->>'nome',
    tipo = v_draft.snapshot->>'tipo',
    prioridade = COALESCE((v_draft.snapshot->>'prioridade')::integer, 0),
    conteudo = COALESCE(v_draft.snapshot->'conteudo', '{}'::jsonb),
    segmentacao = COALESCE(v_draft.snapshot->'segmentacao', '{}'::jsonb),
    frequencia = COALESCE(v_draft.snapshot->'frequencia', '{}'::jsonb),
    start_at = NULLIF(v_draft.snapshot->>'start_at', '')::timestamptz,
    end_at = NULLIF(v_draft.snapshot->>'end_at', '')::timestamptz,
    status = 'active',
    published_version_id = v_draft.id,
    draft_version_id = NULL,
    published_at = now(),
    unpublished_at = NULL,
    updated_at = now()
  WHERE id = _campaign_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (
    tenant_id, user_id, action, entity, entity_id, before, after
  ) VALUES (
    _tenant_id, _actor_user_id, 'cms.campaign.published', 'cms_campaigns', _campaign_id,
    jsonb_build_object('published_version_id', v_campaign.published_version_id),
    jsonb_build_object('published_version_id', v_draft.id, 'revision', v_draft.revision, 'content_hash', v_draft.content_hash)
  );

  RETURN jsonb_build_object(
    'campaignId', _campaign_id,
    'versionId', v_draft.id,
    'revision', v_draft.revision,
    'status', 'active'
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 9. RLS, grants and service-role-only RPC ACL
-- ---------------------------------------------------------------------------

ALTER TABLE public.cms_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_campaign_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.cms_pages FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_page_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_template_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_forms FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_form_fields FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_form_versions FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_campaigns FROM anon, authenticated;
REVOKE ALL ON TABLE public.cms_campaign_versions FROM anon, authenticated;

GRANT ALL ON TABLE public.cms_pages TO service_role;
GRANT ALL ON TABLE public.cms_page_versions TO service_role;
GRANT ALL ON TABLE public.cms_templates TO service_role;
GRANT ALL ON TABLE public.cms_template_versions TO service_role;
GRANT ALL ON TABLE public.cms_forms TO service_role;
GRANT ALL ON TABLE public.cms_form_fields TO service_role;
GRANT ALL ON TABLE public.cms_form_versions TO service_role;
GRANT ALL ON TABLE public.cms_campaigns TO service_role;
GRANT ALL ON TABLE public.cms_campaign_versions TO service_role;

REVOKE ALL ON FUNCTION public.validate_tenant_cms_snapshot(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_page_draft(uuid, uuid, uuid, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tenant_page(uuid, uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unpublish_tenant_page(uuid, uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rollback_tenant_page(uuid, uuid, uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_template_version(uuid, uuid, uuid, text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.instantiate_tenant_template(uuid, uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_form_definition(uuid, uuid, uuid, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tenant_form(uuid, uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_campaign_definition(uuid, uuid, uuid, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tenant_campaign(uuid, uuid, uuid, bigint) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.validate_tenant_cms_snapshot(uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_page_draft(uuid, uuid, uuid, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tenant_page(uuid, uuid, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.unpublish_tenant_page(uuid, uuid, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.rollback_tenant_page(uuid, uuid, uuid, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_template_version(uuid, uuid, uuid, text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.instantiate_tenant_template(uuid, uuid, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_form_definition(uuid, uuid, uuid, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tenant_form(uuid, uuid, uuid, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_campaign_definition(uuid, uuid, uuid, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tenant_campaign(uuid, uuid, uuid, bigint) TO service_role;

COMMIT;
