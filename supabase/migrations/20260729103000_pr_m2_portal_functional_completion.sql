-- PR-M2 — Portal Connector Registry, Publication Jobs & Hybrid Delivery
-- Additive, fail-closed and service-role-only. Not applied by this repository execution.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

-- ---------------------------------------------------------------------------
-- 1. Existing connector instances become the single persisted connector model.
-- ---------------------------------------------------------------------------

ALTER TABLE public.portal_connectors
  ADD COLUMN IF NOT EXISTS credential_reference text,
  ADD COLUMN IF NOT EXISTS credential_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credential_state text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS last_rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS rotation_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS row_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.portal_connectors
  ALTER COLUMN feed_token DROP NOT NULL,
  ALTER COLUMN webhook_secret DROP NOT NULL;

ALTER TABLE public.portal_connectors
  DROP CONSTRAINT IF EXISTS portal_connectors_credential_state_check;
ALTER TABLE public.portal_connectors
  ADD CONSTRAINT portal_connectors_credential_state_check CHECK (
    credential_state IN (
      'not_required',
      'credential_provisioning_required',
      'ready',
      'rotation_required'
    )
  );

ALTER TABLE public.portal_connectors
  DROP CONSTRAINT IF EXISTS portal_connectors_no_plaintext_credentials_check;

CREATE TABLE IF NOT EXISTS public.portal_connector_credential_verifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.portal_connectors(id) ON DELETE CASCADE,
  credential_kind text NOT NULL CHECK (credential_kind IN ('legacy_feed_token', 'legacy_webhook_secret')),
  verifier_hash text NOT NULL CHECK (verifier_hash ~ '^[0-9a-f]{64}$'),
  migrated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, connector_id, credential_kind)
);

-- High-entropy legacy values are retained only as one-way verifiers and then removed.
INSERT INTO public.portal_connector_credential_verifiers (
  tenant_id,
  connector_id,
  credential_kind,
  verifier_hash
)
SELECT
  tenant_id,
  id,
  'legacy_feed_token',
  encode(digest(feed_token, 'sha256'), 'hex')
FROM public.portal_connectors
WHERE NULLIF(feed_token, '') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = portal_connectors.tenant_id
  )
ON CONFLICT (tenant_id, connector_id, credential_kind) DO NOTHING;

INSERT INTO public.portal_connector_credential_verifiers (
  tenant_id,
  connector_id,
  credential_kind,
  verifier_hash
)
SELECT
  tenant_id,
  id,
  'legacy_webhook_secret',
  encode(digest(webhook_secret, 'sha256'), 'hex')
FROM public.portal_connectors
WHERE NULLIF(webhook_secret, '') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = portal_connectors.tenant_id
  )
ON CONFLICT (tenant_id, connector_id, credential_kind) DO NOTHING;

-- Retain every legacy secret until a separately authorized provider-reference
-- cutover proves rotation and rollback. Only exact-manifest rows are marked.
UPDATE public.portal_connectors
SET
  credential_state = 'rotation_required',
  rotation_required = rotation_required
    OR NULLIF(feed_token, '') IS NOT NULL
    OR NULLIF(webhook_secret, '') IS NOT NULL,
  updated_at = now()
WHERE (NULLIF(feed_token, '') IS NOT NULL OR NULLIF(webhook_secret, '') IS NOT NULL)
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = portal_connectors.tenant_id
  );

ALTER TABLE public.portal_connectors
  ADD CONSTRAINT portal_connectors_no_plaintext_credentials_check CHECK (
    feed_token IS NULL AND webhook_secret IS NULL
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_connectors_id_tenant
  ON public.portal_connectors (id, tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_portal_connectors_tenant_slug
  ON public.portal_connectors (tenant_id, portal_slug);

-- ---------------------------------------------------------------------------
-- 2. Closed, versioned mappings. One current version per connector.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_portal_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.portal_connectors(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 1),
  mapping jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CHECK (jsonb_typeof(mapping) = 'object'),
  CHECK (NOT is_current OR archived_at IS NULL),
  UNIQUE (tenant_id, connector_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_portal_mappings_current
  ON public.tenant_portal_mappings (tenant_id, connector_id)
  WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_portal_mappings_id_tenant_connector
  ON public.tenant_portal_mappings (id, tenant_id, connector_id);

-- ---------------------------------------------------------------------------
-- 3. Canonical immutable operation ledger and attempts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_portal_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.portal_connectors(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE RESTRICT,
  mapping_id uuid NOT NULL REFERENCES public.tenant_portal_mappings(id) ON DELETE RESTRICT,
  operation text NOT NULL CHECK (operation IN ('publish', 'unpublish', 'reconcile')),
  desired_state text NOT NULL CHECK (desired_state IN ('published', 'unpublished')),
  current_state text NOT NULL CHECK (current_state IN (
    'not_selected',
    'queued',
    'processing',
    'published',
    'unpublish_queued',
    'unpublishing',
    'unpublished',
    'retry_scheduled',
    'failed_retryable',
    'failed_terminal',
    'reconciliation_required',
    'cancelled'
  )),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 200),
  payload_hash text CHECK (payload_hash IS NULL OR payload_hash ~ '^[0-9a-f]{64}$'),
  mapping_version integer NOT NULL CHECK (mapping_version >= 1),
  connector_schema_version integer NOT NULL DEFAULT 1 CHECK (connector_schema_version = 1),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL CHECK (max_attempts BETWEEN 1 AND 20),
  next_attempt_at timestamptz,
  last_attempt_at timestamptz,
  last_error_code text,
  external_reference text,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  UNIQUE (tenant_id, idempotency_key),
  CHECK (
    (current_state IN ('failed_terminal', 'published', 'unpublished', 'cancelled') AND next_attempt_at IS NULL)
    OR current_state NOT IN ('failed_terminal', 'published', 'unpublished', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS ix_tenant_portal_jobs_tenant_state_next
  ON public.tenant_portal_jobs (tenant_id, current_state, next_attempt_at, created_at);
CREATE INDEX IF NOT EXISTS ix_tenant_portal_jobs_property
  ON public.tenant_portal_jobs (tenant_id, connector_id, property_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_portal_jobs_id_tenant
  ON public.tenant_portal_jobs (id, tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_portal_job_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.tenant_portal_jobs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  outcome text NOT NULL DEFAULT 'started' CHECK (outcome IN (
    'started',
    'success',
    'failed_retryable',
    'failed_terminal',
    'adapter_not_implemented',
    'timeout'
  )),
  error_code text,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  response_code text,
  response_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  worker_id text NOT NULL,
  CHECK (jsonb_typeof(response_metadata) = 'object'),
  UNIQUE (tenant_id, job_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS ix_tenant_portal_attempts_job
  ON public.tenant_portal_job_attempts (tenant_id, job_id, attempt_number DESC);

-- ---------------------------------------------------------------------------
-- 4. Existing publication projection receives explicit canonical linkage.
-- ---------------------------------------------------------------------------

ALTER TABLE public.imovel_portais
  ADD COLUMN IF NOT EXISTS connector_id uuid REFERENCES public.portal_connectors(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS desired_state text,
  ADD COLUMN IF NOT EXISTS current_state text,
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_job_id uuid REFERENCES public.tenant_portal_jobs(id) ON DELETE SET NULL;

DO $block$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.imovel_portais ip
    JOIN prm2_rebaseline.authorized_tenant_ids() authorized
      ON authorized.tenant_id = ip.tenant_id
    WHERE (
      SELECT count(*)
      FROM public.portal_connectors pc
      WHERE pc.tenant_id = ip.tenant_id
        AND pc.portal_slug = ip.portal_slug
    ) <> 1
  ) THEN
    RAISE EXCEPTION 'tenant_portal_legacy_projection_connector_ambiguous';
  END IF;
END;
$block$;

UPDATE public.imovel_portais ip
SET
  connector_id = pc.id,
  desired_state = CASE WHEN ip.publicado THEN 'published' ELSE 'unpublished' END,
  current_state = CASE
    WHEN ip.publicado THEN 'published'
    WHEN ip.status = 'erro' THEN 'reconciliation_required'
    ELSE 'unpublished'
  END
FROM public.portal_connectors pc
WHERE pc.tenant_id = ip.tenant_id
  AND pc.portal_slug = ip.portal_slug
  AND ip.connector_id IS NULL
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = ip.tenant_id
  );

ALTER TABLE public.imovel_portais
  DROP CONSTRAINT IF EXISTS imovel_portais_connector_required,
  DROP CONSTRAINT IF EXISTS imovel_portais_desired_state_required,
  DROP CONSTRAINT IF EXISTS imovel_portais_current_state_required;
ALTER TABLE public.imovel_portais
  ADD CONSTRAINT imovel_portais_connector_required CHECK (connector_id IS NOT NULL) NOT VALID,
  ADD CONSTRAINT imovel_portais_desired_state_required CHECK (desired_state IS NOT NULL) NOT VALID,
  ADD CONSTRAINT imovel_portais_current_state_required CHECK (current_state IS NOT NULL) NOT VALID;

ALTER TABLE public.imovel_portais
  DROP CONSTRAINT IF EXISTS imovel_portais_desired_state_check,
  DROP CONSTRAINT IF EXISTS imovel_portais_current_state_check;
ALTER TABLE public.imovel_portais
  ADD CONSTRAINT imovel_portais_desired_state_check CHECK (
    desired_state IN ('published', 'unpublished')
  ),
  ADD CONSTRAINT imovel_portais_current_state_check CHECK (
    current_state IN (
      'not_selected', 'queued', 'processing', 'published', 'unpublish_queued',
      'unpublishing', 'unpublished', 'retry_scheduled', 'failed_retryable',
      'failed_terminal', 'reconciliation_required', 'cancelled'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS ux_imovel_portais_tenant_connector_property
  ON public.imovel_portais (tenant_id, connector_id, imovel_id);

-- ---------------------------------------------------------------------------
-- 5. Sanitized logs and deterministic export evidence.
-- ---------------------------------------------------------------------------

ALTER TABLE public.portal_sync_logs
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.tenant_portal_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt_id uuid REFERENCES public.tenant_portal_job_attempts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.tenant_portal_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL REFERENCES public.portal_connectors(id) ON DELETE RESTRICT,
  mapping_id uuid NOT NULL REFERENCES public.tenant_portal_mappings(id) ON DELETE RESTRICT,
  format text NOT NULL CHECK (format IN ('CSV', 'XLSX', 'MANUAL_EXPORT')),
  object_path text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  row_count integer NOT NULL CHECK (row_count >= 0),
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  expires_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (object_path !~ '(^|/)\.\.(/|$)')
);

CREATE INDEX IF NOT EXISTS ix_tenant_portal_exports_tenant_created
  ON public.tenant_portal_exports (tenant_id, created_at DESC);

COMMENT ON TABLE public.portal_sync_dlq IS
  'Legacy dead-letter archive. Active authority is tenant_portal_jobs.current_state=failed_terminal.';

-- ---------------------------------------------------------------------------
-- 6. Shared authority, closed config and transition validation.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_tenant_portal_authority(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_decision jsonb;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_portal_authority_required';
  END IF;
  IF _action NOT IN ('visualizar', 'gerenciar', 'publicar', 'exportar') THEN
    RAISE EXCEPTION 'tenant_portal_action_invalid';
  END IF;

  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found'; END IF;

  SELECT public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'portals',
    _action
  ) INTO v_decision;

  IF COALESCE((v_decision->>'allowed')::boolean, false) IS NOT TRUE
    OR v_decision->>'scope' <> 'global'
  THEN
    RAISE EXCEPTION 'tenant_portal_%_denied', _action;
  END IF;

  RETURN v_decision;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_tenant_portal_config(_config jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_allowed text[] := ARRAY[
    'operation_mode',
    'automated_method',
    'manual_method',
    'configuration_schema_version',
    'credential_reference',
    'mapping_profile',
    'mapping_version',
    'publication_rules',
    'retry_policy'
  ];
  v_key text;
BEGIN
  IF jsonb_typeof(_config) <> 'object' THEN
    RAISE EXCEPTION 'tenant_portal_config_invalid';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(_config)
  LOOP
    IF NOT (v_key = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'tenant_portal_config_key_not_cataloged:%', v_key;
    END IF;
    IF lower(v_key) ~ '(secret|token|password|api[_-]?key|authorization|private[_-]?key|refresh[_-]?token|client[_-]?secret)'
    THEN
      RAISE EXCEPTION 'tenant_portal_inline_secret_prohibited';
    END IF;
  END LOOP;

  IF _config->>'operation_mode' <> 'HYBRID'
    OR _config->>'automated_method' NOT IN ('JSON_API', 'XML_FEED', 'WEBHOOK', 'CUSTOM_ADAPTER')
    OR _config->>'manual_method' NOT IN ('XLSX', 'CSV', 'MANUAL_EXPORT')
    OR COALESCE((_config->>'configuration_schema_version')::integer, 0) <> 1
  THEN
    RAISE EXCEPTION 'tenant_portal_config_invalid';
  END IF;

  IF _config ? 'credential_reference'
    AND _config->>'credential_reference' IS NOT NULL
    AND _config->>'credential_reference' !~ '^credential://[A-Za-z0-9][A-Za-z0-9/_-]{2,199}$'
  THEN
    RAISE EXCEPTION 'tenant_portal_credential_reference_invalid';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.assert_tenant_portal_transition(
  _from text,
  _to text
) RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NOT (
    (_from = 'not_selected' AND _to IN ('queued', 'unpublish_queued', 'cancelled')) OR
    (_from = 'queued' AND _to IN ('processing', 'cancelled')) OR
    (_from = 'processing' AND _to IN ('published', 'failed_retryable', 'failed_terminal', 'reconciliation_required')) OR
    (_from = 'published' AND _to IN ('unpublish_queued', 'reconciliation_required')) OR
    (_from = 'unpublish_queued' AND _to IN ('unpublishing', 'cancelled')) OR
    (_from = 'unpublishing' AND _to IN ('unpublished', 'failed_retryable', 'failed_terminal', 'reconciliation_required')) OR
    (_from = 'unpublished' AND _to IN ('queued', 'reconciliation_required')) OR
    (_from = 'retry_scheduled' AND _to IN ('queued', 'unpublish_queued', 'cancelled')) OR
    (_from = 'failed_retryable' AND _to IN ('retry_scheduled', 'failed_terminal', 'cancelled')) OR
    (_from = 'failed_terminal' AND _to = 'reconciliation_required') OR
    (_from = 'reconciliation_required' AND _to IN ('published', 'unpublished', 'failed_terminal'))
  ) THEN
    RAISE EXCEPTION 'tenant_portal_job_transition_invalid:%:%', _from, _to;
  END IF;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Specialized service-role mutations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_portal_connector(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _config jsonb,
  _feed_url text,
  _webhook_url text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_connector public.portal_connectors%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'gerenciar');
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  PERFORM public.validate_tenant_portal_config(_config);

  SELECT * INTO STRICT v_connector
  FROM public.portal_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;

  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'tenant_portal_revision_conflict';
  END IF;
  IF _feed_url IS NOT NULL AND _feed_url !~ '^https://'
    OR _webhook_url IS NOT NULL AND _webhook_url !~ '^https://'
  THEN
    RAISE EXCEPTION 'tenant_portal_endpoint_https_required';
  END IF;

  UPDATE public.portal_connectors
  SET
    config = _config,
    feed_url = _feed_url,
    webhook_url = _webhook_url,
    credential_reference = NULLIF(_config->>'credential_reference', ''),
    credential_state = CASE
      WHEN NULLIF(_config->>'credential_reference', '') IS NULL THEN 'not_required'
      ELSE 'credential_provisioning_required'
    END,
    ativo = false,
    status = 'inativo',
    row_version = row_version + 1,
    updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, before, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.connector.save',
    'portal_connector',
    _connector_id,
    jsonb_build_object('row_version', v_connector.row_version),
    jsonb_build_object('row_version', v_connector.row_version + 1, 'operation_mode', 'HYBRID')
  );

  RETURN jsonb_build_object(
    'id', _connector_id,
    'row_version', v_connector.row_version + 1,
    'active', false,
    'credential_state', CASE
      WHEN NULLIF(_config->>'credential_reference', '') IS NULL THEN 'not_required'
      ELSE 'credential_provisioning_required'
    END
  );
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_connector_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_tenant_portal_connector_state(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _active boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_connector public.portal_connectors%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'gerenciar');
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_connector
  FROM public.portal_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;

  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'tenant_portal_revision_conflict';
  END IF;
  PERFORM public.validate_tenant_portal_config(v_connector.config);
  IF _active AND v_connector.credential_state IN ('credential_provisioning_required', 'rotation_required') THEN
    RAISE EXCEPTION 'tenant_portal_credential_provisioning_required';
  END IF;

  UPDATE public.portal_connectors
  SET
    ativo = _active,
    status = CASE WHEN _active THEN 'ativo' ELSE 'inativo' END,
    row_version = row_version + 1,
    updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.connector.state',
    'portal_connector',
    _connector_id,
    jsonb_build_object('active', _active, 'row_version', v_connector.row_version + 1)
  );

  RETURN jsonb_build_object('id', _connector_id, 'active', _active, 'row_version', v_connector.row_version + 1);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_connector_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_tenant_portal_credential_reference(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _credential_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_connector public.portal_connectors%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'gerenciar');
  IF _credential_reference !~ '^credential://[A-Za-z0-9][A-Za-z0-9/_-]{2,199}$' THEN
    RAISE EXCEPTION 'tenant_portal_credential_reference_invalid';
  END IF;
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_connector
  FROM public.portal_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'tenant_portal_revision_conflict';
  END IF;

  UPDATE public.portal_connectors
  SET
    credential_reference = _credential_reference,
    credential_version = credential_version + 1,
    credential_state = 'credential_provisioning_required',
    last_rotated_at = now(),
    rotation_required = false,
    ativo = false,
    status = 'inativo',
    row_version = row_version + 1,
    updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.credential_reference.rotate',
    'portal_connector',
    _connector_id,
    jsonb_build_object(
      'credential_version', v_connector.credential_version + 1,
      'credential_state', 'credential_provisioning_required'
    )
  );

  RETURN jsonb_build_object(
    'id', _connector_id,
    'credential_version', v_connector.credential_version + 1,
    'credential_state', 'credential_provisioning_required',
    'row_version', v_connector.row_version + 1
  );
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_connector_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_tenant_portal_mapping(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_version integer,
  _mapping jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current public.tenant_portal_mappings%ROWTYPE;
  v_next integer;
  v_id uuid;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'gerenciar');
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  PERFORM id FROM public.portal_connectors WHERE id = _connector_id AND tenant_id = _tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_portal_connector_not_found'; END IF;
  IF jsonb_typeof(_mapping) <> 'object' THEN RAISE EXCEPTION 'tenant_portal_mapping_invalid'; END IF;

  SELECT * INTO v_current
  FROM public.tenant_portal_mappings
  WHERE tenant_id = _tenant_id AND connector_id = _connector_id AND is_current
  FOR UPDATE;

  IF FOUND AND v_current.version <> _expected_version THEN
    RAISE EXCEPTION 'tenant_portal_revision_conflict';
  ELSIF NOT FOUND AND _expected_version <> 0 THEN
    RAISE EXCEPTION 'tenant_portal_revision_conflict';
  END IF;

  v_next := COALESCE(v_current.version, 0) + 1;
  IF v_current.id IS NOT NULL THEN
    UPDATE public.tenant_portal_mappings
    SET is_current = false, archived_at = now()
    WHERE id = v_current.id;
  END IF;

  INSERT INTO public.tenant_portal_mappings (
    tenant_id, connector_id, version, mapping, is_current, created_by
  ) VALUES (
    _tenant_id, _connector_id, v_next, _mapping, true, _actor_user_id
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.mapping.save',
    'tenant_portal_mapping',
    v_id,
    jsonb_build_object('connector_id', _connector_id, 'version', v_next)
  );

  RETURN jsonb_build_object('id', v_id, 'version', v_next, 'is_current', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_tenant_portal_publication(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _property_id uuid,
  _operation text,
  _idempotency_key text,
  _payload_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_connector public.portal_connectors%ROWTYPE;
  v_property public.imoveis%ROWTYPE;
  v_mapping public.tenant_portal_mappings%ROWTYPE;
  v_existing public.tenant_portal_jobs%ROWTYPE;
  v_job_id uuid;
  v_state text;
  v_desired text;
  v_max_attempts integer;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publicar');
  IF _operation NOT IN ('publish', 'unpublish') THEN RAISE EXCEPTION 'tenant_portal_operation_invalid'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 16 THEN RAISE EXCEPTION 'tenant_portal_idempotency_invalid'; END IF;
  IF _payload_hash IS NOT NULL AND _payload_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'tenant_portal_payload_hash_invalid'; END IF;

  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_connector
  FROM public.portal_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR SHARE;
  PERFORM public.validate_tenant_portal_config(v_connector.config);
  IF NOT v_connector.ativo THEN RAISE EXCEPTION 'tenant_portal_connector_disabled'; END IF;
  IF v_connector.credential_state IN ('credential_provisioning_required', 'rotation_required') THEN
    RAISE EXCEPTION 'tenant_portal_credential_provisioning_required';
  END IF;

  SELECT * INTO STRICT v_property
  FROM public.imoveis
  WHERE id = _property_id AND tenant_id = _tenant_id
  FOR SHARE;
  IF _operation = 'publish' AND (v_property.status::text <> 'publicado' OR v_property.publicado_em IS NULL) THEN
    RAISE EXCEPTION 'tenant_portal_property_ineligible';
  END IF;

  SELECT * INTO STRICT v_mapping
  FROM public.tenant_portal_mappings
  WHERE tenant_id = _tenant_id AND connector_id = _connector_id AND is_current
  FOR SHARE;

  SELECT * INTO v_existing
  FROM public.tenant_portal_jobs
  WHERE tenant_id = _tenant_id AND idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF v_existing.connector_id <> _connector_id
      OR v_existing.property_id <> _property_id
      OR v_existing.operation <> _operation
    THEN
      RAISE EXCEPTION 'tenant_portal_idempotency_conflict';
    END IF;
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'current_state', v_existing.current_state,
      'idempotent_replay', true,
      'revision', v_existing.revision
    );
  END IF;

  v_state := CASE WHEN _operation = 'publish' THEN 'queued' ELSE 'unpublish_queued' END;
  v_desired := CASE WHEN _operation = 'publish' THEN 'published' ELSE 'unpublished' END;
  v_max_attempts := LEAST(20, GREATEST(1, COALESCE((v_connector.config#>>'{retry_policy,max_attempts}')::integer, 5)));

  INSERT INTO public.tenant_portal_jobs (
    tenant_id, connector_id, property_id, mapping_id, operation, desired_state,
    current_state, idempotency_key, payload_hash, mapping_version,
    connector_schema_version, max_attempts, created_by
  ) VALUES (
    _tenant_id, _connector_id, _property_id, v_mapping.id, _operation, v_desired,
    v_state, _idempotency_key, _payload_hash, v_mapping.version, 1,
    v_max_attempts, _actor_user_id
  ) RETURNING id INTO v_job_id;

  INSERT INTO public.imovel_portais (
    tenant_id, imovel_id, portal_slug, connector_id, publicado, status,
    desired_state, current_state, revision, last_job_id
  ) VALUES (
    _tenant_id, _property_id, v_connector.portal_slug, _connector_id,
    false, v_state, v_desired, v_state, 1, v_job_id
  )
  ON CONFLICT (tenant_id, connector_id, imovel_id) DO UPDATE SET
    desired_state = EXCLUDED.desired_state,
    current_state = EXCLUDED.current_state,
    status = EXCLUDED.status,
    last_job_id = EXCLUDED.last_job_id,
    revision = public.imovel_portais.revision + 1,
    updated_at = now();

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.job.enqueue',
    'tenant_portal_job',
    v_job_id,
    jsonb_build_object('operation', _operation, 'state', v_state, 'connector_id', _connector_id, 'property_id', _property_id)
  );

  RETURN jsonb_build_object('id', v_job_id, 'current_state', v_state, 'idempotent_replay', false, 'revision', 1);
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RAISE EXCEPTION 'tenant_portal_cross_tenant_or_missing_resource';
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_tenant_portal_job(
  _tenant_id uuid,
  _job_id uuid,
  _expected_revision bigint,
  _worker_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.tenant_portal_jobs%ROWTYPE;
  v_next text;
BEGIN
  IF _worker_id IS NULL OR length(_worker_id) < 3 THEN RAISE EXCEPTION 'tenant_portal_worker_invalid'; END IF;
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_job
  FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id
  FOR UPDATE SKIP LOCKED;
  IF v_job.revision <> _expected_revision THEN RAISE EXCEPTION 'tenant_portal_revision_conflict'; END IF;
  IF v_job.current_state NOT IN ('queued', 'unpublish_queued', 'retry_scheduled') THEN
    RAISE EXCEPTION 'tenant_portal_job_transition_invalid';
  END IF;
  IF v_job.next_attempt_at IS NOT NULL AND v_job.next_attempt_at > now() THEN
    RAISE EXCEPTION 'tenant_portal_job_not_due';
  END IF;

  v_next := CASE WHEN v_job.desired_state = 'published' THEN 'processing' ELSE 'unpublishing' END;
  PERFORM public.assert_tenant_portal_transition(v_job.current_state, v_next);
  UPDATE public.tenant_portal_jobs
  SET
    current_state = v_next,
    attempt_count = attempt_count + 1,
    last_attempt_at = now(),
    next_attempt_at = NULL,
    revision = revision + 1,
    updated_at = now()
  WHERE id = _job_id AND tenant_id = _tenant_id;

  RETURN jsonb_build_object(
    'id', _job_id,
    'current_state', v_next,
    'attempt_number', v_job.attempt_count + 1,
    'revision', v_job.revision + 1,
    'worker_id', _worker_id
  );
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_job_not_found_or_claimed';
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_tenant_portal_attempt(
  _tenant_id uuid,
  _job_id uuid,
  _attempt_number integer,
  _worker_id text,
  _outcome text,
  _error_code text,
  _duration_ms integer,
  _response_code text,
  _response_metadata jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_attempt_id uuid;
BEGIN
  PERFORM id FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_portal_job_not_found'; END IF;
  IF _outcome NOT IN ('started', 'success', 'failed_retryable', 'failed_terminal', 'adapter_not_implemented', 'timeout') THEN
    RAISE EXCEPTION 'tenant_portal_attempt_outcome_invalid';
  END IF;
  IF jsonb_typeof(COALESCE(_response_metadata, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'tenant_portal_attempt_metadata_invalid';
  END IF;
  IF COALESCE(_response_metadata, '{}'::jsonb)::text ~* '(secret|token|password|authorization|api[_-]?key)' THEN
    RAISE EXCEPTION 'tenant_portal_attempt_secret_prohibited';
  END IF;

  INSERT INTO public.tenant_portal_job_attempts (
    tenant_id, job_id, attempt_number, outcome, error_code, duration_ms,
    response_code, response_metadata, worker_id,
    completed_at
  ) VALUES (
    _tenant_id, _job_id, _attempt_number, _outcome, _error_code, _duration_ms,
    _response_code, COALESCE(_response_metadata, '{}'::jsonb), _worker_id,
    CASE WHEN _outcome = 'started' THEN NULL ELSE now() END
  ) RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('id', v_attempt_id, 'attempt_number', _attempt_number, 'outcome', _outcome);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_tenant_portal_job(
  _tenant_id uuid,
  _job_id uuid,
  _expected_revision bigint,
  _success boolean,
  _retryable boolean,
  _error_code text,
  _external_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.tenant_portal_jobs%ROWTYPE;
  v_next text;
BEGIN
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_job
  FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF v_job.revision <> _expected_revision THEN RAISE EXCEPTION 'tenant_portal_revision_conflict'; END IF;
  IF v_job.current_state NOT IN ('processing', 'unpublishing') THEN RAISE EXCEPTION 'tenant_portal_job_transition_invalid'; END IF;

  -- No automated adapter is approved in this increment. Automated success is fail-closed.
  IF _success THEN RAISE EXCEPTION 'adapter_not_implemented'; END IF;

  v_next := CASE
    WHEN _retryable AND v_job.attempt_count < v_job.max_attempts THEN 'failed_retryable'
    ELSE 'failed_terminal'
  END;
  PERFORM public.assert_tenant_portal_transition(v_job.current_state, v_next);

  UPDATE public.tenant_portal_jobs
  SET
    current_state = v_next,
    last_error_code = COALESCE(_error_code, 'adapter_not_implemented'),
    external_reference = _external_reference,
    completed_at = CASE WHEN v_next = 'failed_terminal' THEN now() ELSE NULL END,
    revision = revision + 1,
    updated_at = now()
  WHERE id = _job_id AND tenant_id = _tenant_id;

  UPDATE public.imovel_portais
  SET
    current_state = v_next,
    status = v_next,
    ultimo_erro = COALESCE(_error_code, 'adapter_not_implemented'),
    revision = revision + 1,
    updated_at = now()
  WHERE tenant_id = _tenant_id
    AND connector_id = v_job.connector_id
    AND imovel_id = v_job.property_id;

  RETURN jsonb_build_object('id', _job_id, 'current_state', v_next, 'revision', v_job.revision + 1);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_job_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_tenant_portal_retry(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _job_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.tenant_portal_jobs%ROWTYPE;
  v_connector public.portal_connectors%ROWTYPE;
  v_initial integer;
  v_max integer;
  v_delay bigint;
  v_next_at timestamptz;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publicar');
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_job FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id FOR UPDATE;
  IF v_job.revision <> _expected_revision THEN RAISE EXCEPTION 'tenant_portal_revision_conflict'; END IF;
  IF v_job.current_state <> 'failed_retryable' THEN RAISE EXCEPTION 'tenant_portal_job_transition_invalid'; END IF;
  IF v_job.attempt_count >= v_job.max_attempts THEN RAISE EXCEPTION 'tenant_portal_retry_exhausted'; END IF;
  SELECT * INTO STRICT v_connector FROM public.portal_connectors
  WHERE id = v_job.connector_id AND tenant_id = _tenant_id FOR SHARE;

  v_initial := LEAST(86400, GREATEST(1, COALESCE((v_connector.config#>>'{retry_policy,initial_delay_seconds}')::integer, 30)));
  v_max := LEAST(604800, GREATEST(v_initial, COALESCE((v_connector.config#>>'{retry_policy,max_delay_seconds}')::integer, 3600)));
  v_delay := LEAST(v_max::bigint, v_initial::bigint * power(2::numeric, GREATEST(0, v_job.attempt_count - 1))::bigint);
  v_next_at := now() + make_interval(secs => v_delay::integer);

  PERFORM public.assert_tenant_portal_transition(v_job.current_state, 'retry_scheduled');
  UPDATE public.tenant_portal_jobs
  SET current_state = 'retry_scheduled', next_attempt_at = v_next_at, revision = revision + 1, updated_at = now()
  WHERE id = _job_id AND tenant_id = _tenant_id;

  RETURN jsonb_build_object('id', _job_id, 'current_state', 'retry_scheduled', 'next_attempt_at', v_next_at, 'revision', v_job.revision + 1);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_job_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_tenant_portal_job(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _job_id uuid,
  _expected_revision bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.tenant_portal_jobs%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publicar');
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_job FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id FOR UPDATE;
  IF v_job.revision <> _expected_revision THEN RAISE EXCEPTION 'tenant_portal_revision_conflict'; END IF;
  PERFORM public.assert_tenant_portal_transition(v_job.current_state, 'cancelled');

  UPDATE public.tenant_portal_jobs
  SET current_state = 'cancelled', cancelled_at = now(), next_attempt_at = NULL, revision = revision + 1, updated_at = now()
  WHERE id = _job_id AND tenant_id = _tenant_id;

  RETURN jsonb_build_object('id', _job_id, 'current_state', 'cancelled', 'revision', v_job.revision + 1);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_job_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconcile_tenant_portal_state(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _job_id uuid,
  _expected_revision bigint,
  _resolved_state text,
  _external_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_job public.tenant_portal_jobs%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'publicar');
  IF _resolved_state NOT IN ('published', 'unpublished', 'failed_terminal') THEN
    RAISE EXCEPTION 'tenant_portal_reconciliation_state_invalid';
  END IF;
  PERFORM id FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  SELECT * INTO STRICT v_job FROM public.tenant_portal_jobs
  WHERE id = _job_id AND tenant_id = _tenant_id FOR UPDATE;
  IF v_job.revision <> _expected_revision THEN RAISE EXCEPTION 'tenant_portal_revision_conflict'; END IF;
  IF v_job.current_state <> 'reconciliation_required' THEN RAISE EXCEPTION 'tenant_portal_job_transition_invalid'; END IF;
  PERFORM public.assert_tenant_portal_transition(v_job.current_state, _resolved_state);

  UPDATE public.tenant_portal_jobs
  SET
    current_state = _resolved_state,
    external_reference = _external_reference,
    completed_at = now(),
    next_attempt_at = NULL,
    revision = revision + 1,
    updated_at = now()
  WHERE id = _job_id AND tenant_id = _tenant_id;

  UPDATE public.imovel_portais
  SET
    current_state = _resolved_state,
    desired_state = CASE WHEN _resolved_state = 'published' THEN 'published' ELSE 'unpublished' END,
    publicado = _resolved_state = 'published',
    status = _resolved_state,
    portal_reference = _external_reference,
    revision = revision + 1,
    updated_at = now()
  WHERE tenant_id = _tenant_id
    AND connector_id = v_job.connector_id
    AND imovel_id = v_job.property_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.job.reconcile',
    'tenant_portal_job',
    _job_id,
    jsonb_build_object('resolved_state', _resolved_state)
  );

  RETURN jsonb_build_object('id', _job_id, 'current_state', _resolved_state, 'revision', v_job.revision + 1);
EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE EXCEPTION 'tenant_portal_job_not_found';
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_tenant_portal_export(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _mapping_id uuid,
  _format text,
  _object_path text,
  _content_hash text,
  _row_count integer,
  _size_bytes bigint,
  _expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.assert_tenant_portal_authority(_actor_user_id, _tenant_id, _tenant_origin, 'exportar');
  IF _format NOT IN ('CSV', 'XLSX', 'MANUAL_EXPORT') THEN RAISE EXCEPTION 'tenant_portal_export_format_invalid'; END IF;
  IF _object_path !~ ('^' || _tenant_id::text || '/portal-exports/') OR _object_path ~ '(^|/)\.\.(/|$)' THEN
    RAISE EXCEPTION 'tenant_portal_export_path_invalid';
  END IF;
  IF _content_hash !~ '^[0-9a-f]{64}$' OR _row_count < 0 OR _size_bytes < 0 OR _expires_at <= now() THEN
    RAISE EXCEPTION 'tenant_portal_export_metadata_invalid';
  END IF;
  PERFORM id FROM public.portal_connectors WHERE id = _connector_id AND tenant_id = _tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_portal_connector_not_found'; END IF;
  PERFORM id FROM public.tenant_portal_mappings
  WHERE id = _mapping_id AND connector_id = _connector_id AND tenant_id = _tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_portal_mapping_not_found'; END IF;

  INSERT INTO public.tenant_portal_exports (
    tenant_id, connector_id, mapping_id, format, object_path, content_hash,
    row_count, size_bytes, expires_at, created_by
  ) VALUES (
    _tenant_id, _connector_id, _mapping_id, _format, _object_path, _content_hash,
    _row_count, _size_bytes, _expires_at, _actor_user_id
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'tenant_portal.export.create',
    'tenant_portal_export',
    v_id,
    jsonb_build_object('format', _format, 'row_count', _row_count, 'content_hash', _content_hash)
  );

  RETURN jsonb_build_object('id', v_id, 'format', _format, 'row_count', _row_count, 'expires_at', _expires_at);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 8. RLS and least privilege. All application access is through server wrappers.
-- ---------------------------------------------------------------------------

ALTER TABLE public.portal_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imovel_portais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sync_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_connector_credential_verifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_portal_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_portal_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_portal_job_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_portal_exports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.portal_connectors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.imovel_portais FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.portal_sync_logs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.portal_sync_dlq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.portal_connector_credential_verifiers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tenant_portal_mappings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tenant_portal_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tenant_portal_job_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.tenant_portal_exports FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.portal_connectors TO service_role;
GRANT ALL ON TABLE public.imovel_portais TO service_role;
GRANT ALL ON TABLE public.portal_sync_logs TO service_role;
GRANT ALL ON TABLE public.portal_sync_dlq TO service_role;
GRANT ALL ON TABLE public.portal_connector_credential_verifiers TO service_role;
GRANT ALL ON TABLE public.tenant_portal_mappings TO service_role;
GRANT ALL ON TABLE public.tenant_portal_jobs TO service_role;
GRANT ALL ON TABLE public.tenant_portal_job_attempts TO service_role;
GRANT ALL ON TABLE public.tenant_portal_exports TO service_role;

DO $acl$
DECLARE
  v_signature text;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.assert_tenant_portal_authority(uuid,uuid,text,text)',
    'public.validate_tenant_portal_config(jsonb)',
    'public.assert_tenant_portal_transition(text,text)',
    'public.save_tenant_portal_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text)',
    'public.set_tenant_portal_connector_state(uuid,uuid,text,uuid,bigint,boolean)',
    'public.rotate_tenant_portal_credential_reference(uuid,uuid,text,uuid,bigint,text)',
    'public.save_tenant_portal_mapping(uuid,uuid,text,uuid,integer,jsonb)',
    'public.enqueue_tenant_portal_publication(uuid,uuid,text,uuid,uuid,text,text,text)',
    'public.claim_tenant_portal_job(uuid,uuid,bigint,text)',
    'public.record_tenant_portal_attempt(uuid,uuid,integer,text,text,text,integer,text,jsonb)',
    'public.complete_tenant_portal_job(uuid,uuid,bigint,boolean,boolean,text,text)',
    'public.schedule_tenant_portal_retry(uuid,uuid,text,uuid,bigint)',
    'public.cancel_tenant_portal_job(uuid,uuid,text,uuid,bigint)',
    'public.reconcile_tenant_portal_state(uuid,uuid,text,uuid,bigint,text,text)',
    'public.record_tenant_portal_export(uuid,uuid,text,uuid,uuid,text,text,text,integer,bigint,timestamptz)'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', v_signature);
  END LOOP;
END;
$acl$;

COMMIT;

-- Rollback operational note:
-- revert application consumers first; preserve ledgers and audit rows; revoke new RPCs;
-- only then drop new tables/columns in reverse dependency order after exporting evidence.
