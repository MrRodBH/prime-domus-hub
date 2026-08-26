-- PR-M2 — Marketing Channels, Campaign Attribution & Automatic Lead Ingestion
-- Additive, fail-closed and service-role-only. Not applied to the managed backend here.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

-- Composite tenant references are enforced even when the service role writes.
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_id_tenant
  ON public.leads (id, tenant_id);

-- ---------------------------------------------------------------------------
-- 1. Tenant-owned connector catalog. Channel keys are closed in application code.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_marketing_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_key text NOT NULL CHECK (channel_key IN ('META_ADS','GOOGLE_ADS','MANUAL_IMPORT','WEBSITE_FORM')),
  provider_account_reference text,
  provider_form_reference text,
  credential_reference text,
  credential_version integer NOT NULL DEFAULT 0 CHECK (credential_version >= 0),
  credential_state text NOT NULL DEFAULT 'not_required' CHECK (credential_state IN (
    'not_required','credential_required','verification_pending','verified','rotation_required'
  )),
  configuration_version integer NOT NULL DEFAULT 1 CHECK (configuration_version >= 1),
  mapping_version integer NOT NULL DEFAULT 1 CHECK (mapping_version >= 1),
  verification_state text NOT NULL DEFAULT 'not_required' CHECK (verification_state IN (
    'not_required','verification_pending','verified','verification_failed','adapter_not_implemented'
  )),
  availability_state text NOT NULL CHECK (availability_state IN (
    'configured','credential_required','verification_pending','mapping_required','mapping_invalid',
    'manual_ready','automated_ready','adapter_not_implemented','temporarily_unavailable','failed'
  )),
  active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config) = 'object'),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  last_rotated_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel_key),
  CHECK (credential_reference IS NULL OR credential_reference ~ '^credential://[A-Za-z0-9][A-Za-z0-9/_-]{2,199}$'),
  CHECK (channel_key NOT IN ('MANUAL_IMPORT','WEBSITE_FORM') OR credential_reference IS NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_marketing_connectors_id_tenant
  ON public.tenant_marketing_connectors (id, tenant_id);
CREATE INDEX IF NOT EXISTS ix_tenant_marketing_connectors_tenant_state
  ON public.tenant_marketing_connectors (tenant_id, availability_state, active);

INSERT INTO public.tenant_marketing_connectors (
  tenant_id, channel_key, credential_state, verification_state, availability_state, active, config
)
SELECT
  t.id,
  channel.channel_key,
  CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'credential_required' ELSE 'not_required' END,
  CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'adapter_not_implemented' ELSE 'not_required' END,
  CASE
    WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'adapter_not_implemented'
    WHEN channel.channel_key = 'MANUAL_IMPORT' THEN 'manual_ready'
    ELSE 'automated_ready'
  END,
  channel.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM'),
  CASE
    WHEN channel.channel_key = 'MANUAL_IMPORT' THEN jsonb_build_object(
      'channelKey','MANUAL_IMPORT','operationMode','HYBRID','configurationVersion',1,
      'providerAccountReference',NULL,'providerFormReference',NULL,'credentialReference',NULL,'mappingVersion',1
    )
    WHEN channel.channel_key = 'WEBSITE_FORM' THEN jsonb_build_object(
      'channelKey','WEBSITE_FORM','operationMode','HYBRID','configurationVersion',1,
      'providerAccountReference',NULL,'providerFormReference',NULL,'credentialReference',NULL,'mappingVersion',1
    )
    ELSE '{}'::jsonb
  END
FROM public.tenants t
JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = t.id
CROSS JOIN (VALUES ('META_ADS'),('GOOGLE_ADS'),('MANUAL_IMPORT'),('WEBSITE_FORM')) AS channel(channel_key)
ON CONFLICT (tenant_id, channel_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_marketing_connector_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  config jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'),
  provider_account_reference text,
  provider_form_reference text,
  availability_state text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, connector_id, version),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_marketing_connectors(id, tenant_id) ON DELETE CASCADE
);

INSERT INTO public.tenant_marketing_connector_versions (
  tenant_id, connector_id, version, config, provider_account_reference,
  provider_form_reference, availability_state, created_by
)
SELECT tenant_id, id, configuration_version, config, provider_account_reference,
       provider_form_reference, availability_state, NULL
FROM public.tenant_marketing_connectors
WHERE EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = tenant_marketing_connectors.tenant_id
)
ON CONFLICT (tenant_id, connector_id, version) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Versioned closed field mappings. One current mapping per connector.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_marketing_field_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  mapping jsonb NOT NULL CHECK (jsonb_typeof(mapping) = 'object'),
  is_current boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CHECK (NOT is_current OR archived_at IS NULL),
  UNIQUE (tenant_id, connector_id, version),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_marketing_connectors(id, tenant_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_marketing_mapping_current
  ON public.tenant_marketing_field_mappings (tenant_id, connector_id)
  WHERE is_current;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_marketing_mapping_id_tenant_connector
  ON public.tenant_marketing_field_mappings (id, tenant_id, connector_id);

INSERT INTO public.tenant_marketing_field_mappings (
  tenant_id, connector_id, version, mapping, is_current, created_by
)
SELECT
  connector.tenant_id,
  connector.id,
  1,
  jsonb_build_object(
    'name','name','email','email','phone','phone','message','message',
    'property_reference','property_reference','source','source',
    'campaign_id','campaign_id','campaign_name','campaign_name',
    'adset_id','adset_id','adset_name','adset_name','ad_id','ad_id','ad_name','ad_name',
    'utm_source','utm_source','utm_medium','utm_medium','utm_campaign','utm_campaign',
    'utm_content','utm_content','utm_term','utm_term','gclid','gclid','fbclid','fbclid',
    'landing_url','landing_url','referrer','referrer','provider_payload_id','provider_payload_id'
  ),
  true,
  NULL
FROM public.tenant_marketing_connectors connector
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_marketing_field_mappings mapping
  WHERE mapping.tenant_id = connector.tenant_id
    AND mapping.connector_id = connector.id
    AND mapping.is_current
)
AND EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = connector.tenant_id
);

-- ---------------------------------------------------------------------------
-- 3. Sanitized provenance/idempotency ledger and append-only attempts.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_marketing_ingestion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  channel_key text NOT NULL CHECK (channel_key IN ('META_ADS','GOOGLE_ADS','MANUAL_IMPORT','WEBSITE_FORM')),
  provider_payload_id text NOT NULL CHECK (length(provider_payload_id) BETWEEN 1 AND 300),
  provider_account_reference text,
  provider_form_reference text,
  campaign_id text,
  campaign_name text,
  adset_id text,
  adset_name text,
  ad_id text,
  ad_name text,
  payload_schema_version integer NOT NULL DEFAULT 1 CHECK (payload_schema_version = 1),
  mapping_version integer NOT NULL CHECK (mapping_version >= 1),
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  payload_sanitized jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload_sanitized) = 'object'),
  received_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  ingestion_state text NOT NULL CHECK (ingestion_state IN (
    'received','verification_failed','verified','mapping_failed','normalized','duplicate_detected',
    'lead_created','lead_linked','rejected','retryable_failed','terminal_failed'
  )),
  lead_id uuid,
  duplicate_candidate_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  error_code text,
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  retry_state text NOT NULL DEFAULT 'not_required' CHECK (retry_state IN (
    'not_required','retry_available','retrying','retry_exhausted'
  )),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (connector_id, provider_payload_id),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_marketing_connectors(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (lead_id, tenant_id)
    REFERENCES public.leads(id, tenant_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_tenant_marketing_ingestion_tenant_state
  ON public.tenant_marketing_ingestion_events (tenant_id, ingestion_state, received_at DESC);
CREATE INDEX IF NOT EXISTS ix_tenant_marketing_ingestion_lead
  ON public.tenant_marketing_ingestion_events (tenant_id, lead_id, received_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_marketing_ingestion_id_tenant
  ON public.tenant_marketing_ingestion_events (id, tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_marketing_ingestion_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ingestion_event_id uuid NOT NULL,
  attempt_number integer NOT NULL CHECK (attempt_number >= 1),
  attempt_kind text NOT NULL CHECK (attempt_kind IN ('verification','mapping','ingestion','retry')),
  outcome text NOT NULL CHECK (outcome IN (
    'started','success','verification_failed','mapping_failed','duplicate_detected',
    'adapter_not_implemented','retryable_failed','terminal_failed'
  )),
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ingestion_event_id, attempt_number),
  FOREIGN KEY (ingestion_event_id, tenant_id)
    REFERENCES public.tenant_marketing_ingestion_events(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_tenant_marketing_attempts_event
  ON public.tenant_marketing_ingestion_attempts (tenant_id, ingestion_event_id, attempt_number DESC);

CREATE OR REPLACE FUNCTION public.prevent_marketing_attempt_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RAISE EXCEPTION 'marketing_attempt_append_only' USING ERRCODE = '55000';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_marketing_attempt_append_only ON public.tenant_marketing_ingestion_attempts;
CREATE TRIGGER trg_marketing_attempt_append_only
BEFORE UPDATE OR DELETE ON public.tenant_marketing_ingestion_attempts
FOR EACH ROW EXECUTE FUNCTION public.prevent_marketing_attempt_mutation();

-- ---------------------------------------------------------------------------
-- 4. Manual import jobs and row-level explicit outcomes.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_marketing_manual_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  mapping_id uuid NOT NULL,
  format text NOT NULL CHECK (format IN ('CSV','XLSX','MANUAL_ROW')),
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 1 AND 255),
  source_hash text NOT NULL CHECK (source_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 200),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN (
    'draft','preview_ready','processing','partial_success','completed','failed'
  )),
  total_rows integer NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows integer NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  invalid_rows integer NOT NULL DEFAULT 0 CHECK (invalid_rows >= 0),
  duplicate_rows integer NOT NULL DEFAULT 0 CHECK (duplicate_rows >= 0),
  created_leads integer NOT NULL DEFAULT 0 CHECK (created_leads >= 0),
  failed_rows integer NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, connector_id, source_hash),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_marketing_connectors(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (mapping_id, tenant_id, connector_id)
    REFERENCES public.tenant_marketing_field_mappings(id, tenant_id, connector_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_tenant_marketing_imports_tenant_state
  ON public.tenant_marketing_manual_imports (tenant_id, state, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_marketing_imports_id_tenant
  ON public.tenant_marketing_manual_imports (id, tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_marketing_manual_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  import_id uuid NOT NULL,
  row_number integer NOT NULL CHECK (row_number >= 1),
  source_row_hash text NOT NULL CHECK (source_row_hash ~ '^[0-9a-f]{64}$'),
  payload_sanitized jsonb NOT NULL CHECK (jsonb_typeof(payload_sanitized) = 'object'),
  state text NOT NULL DEFAULT 'received' CHECK (state IN (
    'received','valid','invalid','duplicate_detected','lead_created','failed'
  )),
  lead_id uuid,
  ingestion_event_id uuid,
  duplicate_candidate_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, import_id, row_number),
  UNIQUE (tenant_id, import_id, source_row_hash),
  FOREIGN KEY (import_id, tenant_id)
    REFERENCES public.tenant_marketing_manual_imports(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (lead_id, tenant_id)
    REFERENCES public.leads(id, tenant_id) ON DELETE SET NULL,
  FOREIGN KEY (ingestion_event_id, tenant_id)
    REFERENCES public.tenant_marketing_ingestion_events(id, tenant_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_tenant_marketing_import_rows_import_state
  ON public.tenant_marketing_manual_import_rows (tenant_id, import_id, state, row_number);

-- ---------------------------------------------------------------------------
-- 5. Shared tenant authority. CRM is the accepted commercial-lead domain.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_tenant_marketing_authority(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _action text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_decision jsonb;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_marketing_authority_required' USING ERRCODE = '22023';
  END IF;
  IF _action NOT IN ('visualizar','gerenciar','criar') THEN
    RAISE EXCEPTION 'tenant_marketing_action_invalid' USING ERRCODE = '22023';
  END IF;
  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'crm',
    _action::public.rbac_action
  );
  IF COALESCE((v_decision->>'allowed')::boolean, false) IS NOT TRUE
     OR v_decision->>'scope' <> 'global' THEN
    RAISE EXCEPTION 'tenant_marketing_permission_denied' USING ERRCODE = '42501';
  END IF;
  RETURN v_decision;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.marketing_config_contains_secret(_config jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT lower(COALESCE(_config::text,'')) ~
    '"(access_token|client_secret|app_secret|refresh_token|authorization|password|api_key|apikey)"[[:space:]]*:';
$fn$;

-- ---------------------------------------------------------------------------
-- 6. Connector, credential and mapping mutations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.save_tenant_marketing_connector(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _config jsonb,
  _provider_account_reference text,
  _provider_form_reference text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_channel text;
  v_next_configuration integer;
  v_availability text;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'gerenciar');
  IF jsonb_typeof(_config) <> 'object' THEN RAISE EXCEPTION 'marketing_config_invalid'; END IF;
  IF public.marketing_config_contains_secret(_config) THEN RAISE EXCEPTION 'marketing_inline_secret_prohibited'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(_config) key
    WHERE key NOT IN (
      'channelKey','operationMode','configurationVersion','providerAccountReference',
      'providerFormReference','credentialReference','mappingVersion'
    )
  ) THEN RAISE EXCEPTION 'marketing_config_unknown_field'; END IF;

  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  IF v_connector.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;

  v_channel := _config->>'channelKey';
  IF v_channel IS DISTINCT FROM v_connector.channel_key THEN
    RAISE EXCEPTION 'marketing_connector_channel_immutable';
  END IF;
  IF _config->>'operationMode' <> 'HYBRID'
     OR COALESCE((_config->>'configurationVersion')::integer,0) <> 1
     OR COALESCE((_config->>'mappingVersion')::integer,0) <> v_connector.mapping_version THEN
    RAISE EXCEPTION 'marketing_config_invalid';
  END IF;
  IF NULLIF(btrim(COALESCE(_config->>'providerAccountReference','')),'')
       IS DISTINCT FROM NULLIF(btrim(COALESCE(_provider_account_reference,'')),'')
     OR NULLIF(btrim(COALESCE(_config->>'providerFormReference','')),'')
       IS DISTINCT FROM NULLIF(btrim(COALESCE(_provider_form_reference,'')),'') THEN
    RAISE EXCEPTION 'marketing_config_reference_mismatch';
  END IF;
  IF (_config->>'credentialReference') IS DISTINCT FROM v_connector.credential_reference THEN
    RAISE EXCEPTION 'marketing_credential_reference_requires_versioned_operation';
  END IF;
  IF v_connector.channel_key IN ('META_ADS','GOOGLE_ADS')
     AND NULLIF(btrim(COALESCE(_provider_account_reference,'')),'') IS NULL THEN
    RAISE EXCEPTION 'marketing_provider_account_required';
  END IF;
  IF v_connector.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM')
     AND (_config->>'credentialReference') IS NOT NULL THEN
    RAISE EXCEPTION 'marketing_credential_not_allowed';
  END IF;

  v_next_configuration := v_connector.configuration_version + 1;
  v_availability := CASE
    WHEN v_connector.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'adapter_not_implemented'
    WHEN v_connector.channel_key = 'MANUAL_IMPORT' THEN 'manual_ready'
    ELSE 'automated_ready'
  END;

  UPDATE public.tenant_marketing_connectors
  SET config = _config,
      provider_account_reference = NULLIF(btrim(_provider_account_reference),''),
      provider_form_reference = NULLIF(btrim(_provider_form_reference),''),
      configuration_version = v_next_configuration,
      availability_state = v_availability,
      verification_state = CASE
        WHEN channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'adapter_not_implemented'
        ELSE 'not_required'
      END,
      row_version = row_version + 1,
      updated_at = now(),
      last_error_code = NULL
  WHERE id = _connector_id AND tenant_id = _tenant_id
  RETURNING * INTO v_connector;

  INSERT INTO public.tenant_marketing_connector_versions (
    tenant_id, connector_id, version, config, provider_account_reference,
    provider_form_reference, availability_state, created_by
  ) VALUES (
    _tenant_id, _connector_id, v_next_configuration, _config,
    v_connector.provider_account_reference, v_connector.provider_form_reference,
    v_connector.availability_state, _actor_user_id
  );

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.connector_saved','tenant_marketing_connector',_connector_id,
    jsonb_build_object(
      'channel_key',v_connector.channel_key,
      'configuration_version',v_connector.configuration_version,
      'mapping_version',v_connector.mapping_version,
      'availability_state',v_connector.availability_state,
      'credential_reference_configured',v_connector.credential_reference IS NOT NULL,
      'row_version',v_connector.row_version
    ));

  RETURN jsonb_build_object(
    'id',v_connector.id,'channelKey',v_connector.channel_key,
    'configurationVersion',v_connector.configuration_version,
    'availabilityState',v_connector.availability_state,
    'rowVersion',v_connector.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.publish_tenant_marketing_connector(
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
AS $fn$
DECLARE v_connector public.tenant_marketing_connectors%ROWTYPE; v_mapping_count integer;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'gerenciar');
  SELECT * INTO v_connector FROM public.tenant_marketing_connectors
   WHERE id=_connector_id AND tenant_id=_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  IF v_connector.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
  SELECT count(*) INTO v_mapping_count FROM public.tenant_marketing_field_mappings
   WHERE tenant_id=_tenant_id AND connector_id=_connector_id AND is_current;
  IF v_mapping_count <> 1 THEN RAISE EXCEPTION 'marketing_mapping_required'; END IF;
  IF _active AND v_connector.channel_key IN ('META_ADS','GOOGLE_ADS') THEN
    RAISE EXCEPTION 'marketing_adapter_not_implemented';
  END IF;
  IF _active AND v_connector.channel_key NOT IN ('MANUAL_IMPORT','WEBSITE_FORM') THEN
    RAISE EXCEPTION 'marketing_channel_not_activatable';
  END IF;
  UPDATE public.tenant_marketing_connectors
  SET active=_active,row_version=row_version+1,updated_at=now()
  WHERE id=_connector_id AND tenant_id=_tenant_id RETURNING * INTO v_connector;
  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.connector_state','tenant_marketing_connector',_connector_id,
    jsonb_build_object('active',v_connector.active,'channel_key',v_connector.channel_key,'row_version',v_connector.row_version));
  RETURN jsonb_build_object('id',v_connector.id,'active',v_connector.active,'rowVersion',v_connector.row_version);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_tenant_marketing_credential_reference(
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
AS $fn$
DECLARE v_connector public.tenant_marketing_connectors%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'gerenciar');
  IF _credential_reference !~ '^credential://[A-Za-z0-9][A-Za-z0-9/_-]{2,199}$' THEN
    RAISE EXCEPTION 'marketing_credential_reference_invalid';
  END IF;
  SELECT * INTO v_connector FROM public.tenant_marketing_connectors
   WHERE id=_connector_id AND tenant_id=_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  IF v_connector.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
  IF v_connector.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM') THEN RAISE EXCEPTION 'marketing_credential_not_allowed'; END IF;
  UPDATE public.tenant_marketing_connectors
  SET credential_reference=_credential_reference,
      config=config || jsonb_build_object('credentialReference',_credential_reference),
      credential_version=credential_version+1,
      credential_state='verification_pending',
      verification_state='adapter_not_implemented',
      availability_state='adapter_not_implemented',
      last_rotated_at=now(),
      last_verified_at=NULL,
      row_version=row_version+1,
      updated_at=now()
  WHERE id=_connector_id AND tenant_id=_tenant_id RETURNING * INTO v_connector;
  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.credential_reference_rotated','tenant_marketing_connector',_connector_id,
    jsonb_build_object('credential_version',v_connector.credential_version,'credential_reference_configured',true,'row_version',v_connector.row_version));
  RETURN jsonb_build_object(
    'id',v_connector.id,'credentialVersion',v_connector.credential_version,
    'credentialState',v_connector.credential_state,'verificationState',v_connector.verification_state,
    'rowVersion',v_connector.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_tenant_marketing_mapping(
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
AS $fn$
DECLARE v_current public.tenant_marketing_field_mappings%ROWTYPE; v_next integer;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'gerenciar');
  IF jsonb_typeof(_mapping) <> 'object' OR NULLIF(btrim(_mapping->>'name'),'') IS NULL THEN
    RAISE EXCEPTION 'marketing_mapping_invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(_mapping) key
    WHERE key NOT IN (
      'name','email','phone','message','property_reference','source',
      'campaign_id','campaign_name','adset_id','adset_name','ad_id','ad_name',
      'utm_source','utm_medium','utm_campaign','utm_content','utm_term',
      'gclid','fbclid','landing_url','referrer','provider_payload_id'
    )
  ) THEN RAISE EXCEPTION 'marketing_mapping_unknown_field'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(_mapping) item
    WHERE item.value <> 'null'::jsonb
      AND (
        jsonb_typeof(item.value) <> 'string'
        OR length(item.value #>> '{}') NOT BETWEEN 1 AND 120
        OR (item.value #>> '{}') !~ '^[A-Za-z0-9_.-]+$'
      )
  ) THEN RAISE EXCEPTION 'marketing_mapping_path_invalid'; END IF;
  IF _mapping ?| ARRAY['tenant_id','tenantId','actor_user_id','actorUserId','assigned_to','pipeline_id','stage_id'] THEN
    RAISE EXCEPTION 'marketing_mapping_authority_field_prohibited';
  END IF;
  PERFORM 1 FROM public.tenant_marketing_connectors
   WHERE id=_connector_id AND tenant_id=_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  SELECT * INTO v_current FROM public.tenant_marketing_field_mappings
   WHERE tenant_id=_tenant_id AND connector_id=_connector_id AND is_current FOR UPDATE;
  IF NOT FOUND THEN
    IF _expected_version <> 0 THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
    v_next := 1;
  ELSE
    IF v_current.version <> _expected_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
    v_next := v_current.version + 1;
    UPDATE public.tenant_marketing_field_mappings
       SET is_current=false,archived_at=now()
     WHERE id=v_current.id;
  END IF;
  INSERT INTO public.tenant_marketing_field_mappings (
    tenant_id,connector_id,version,mapping,is_current,created_by
  ) VALUES (_tenant_id,_connector_id,v_next,_mapping,true,_actor_user_id)
  RETURNING * INTO v_current;
  UPDATE public.tenant_marketing_connectors
     SET mapping_version=v_next,row_version=row_version+1,updated_at=now()
   WHERE id=_connector_id AND tenant_id=_tenant_id;
  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.mapping_saved','tenant_marketing_mapping',v_current.id,
    jsonb_build_object('connector_id',_connector_id,'version',v_next));
  RETURN jsonb_build_object('id',v_current.id,'connectorId',_connector_id,'version',v_next,'current',true);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 7. Trusted automatic payload reservation. Tenant derives from connector ID.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_marketing_ingestion_payload(
  _connector_id uuid,
  _provider_payload_id text,
  _payload_hash text,
  _payload_sanitized jsonb,
  _payload_schema_version integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_event public.tenant_marketing_ingestion_events%ROWTYPE;
  v_mapping_count integer;
BEGIN
  IF NULLIF(btrim(_provider_payload_id),'') IS NULL OR length(_provider_payload_id) > 300 THEN
    RAISE EXCEPTION 'marketing_provider_payload_id_invalid';
  END IF;
  IF _payload_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'marketing_payload_hash_invalid'; END IF;
  IF jsonb_typeof(_payload_sanitized) <> 'object' THEN RAISE EXCEPTION 'marketing_payload_invalid'; END IF;
  IF public.marketing_config_contains_secret(_payload_sanitized) THEN RAISE EXCEPTION 'marketing_payload_secret_prohibited'; END IF;
  IF _payload_schema_version <> 1 THEN RAISE EXCEPTION 'marketing_payload_schema_unknown'; END IF;

  SELECT * INTO v_connector FROM public.tenant_marketing_connectors
   WHERE id=_connector_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  IF v_connector.channel_key = 'WEBSITE_FORM' THEN
    RAISE EXCEPTION 'marketing_parallel_public_writer_prohibited';
  END IF;
  IF v_connector.channel_key = 'MANUAL_IMPORT' THEN
    RAISE EXCEPTION 'marketing_provider_endpoint_not_applicable';
  END IF;
  IF v_connector.active IS NOT TRUE OR v_connector.availability_state <> 'automated_ready' THEN
    RAISE EXCEPTION 'marketing_adapter_not_implemented';
  END IF;
  SELECT count(*) INTO v_mapping_count FROM public.tenant_marketing_field_mappings
   WHERE tenant_id=v_connector.tenant_id AND connector_id=v_connector.id
     AND is_current AND version=v_connector.mapping_version;
  IF v_mapping_count <> 1 THEN RAISE EXCEPTION 'marketing_mapping_required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_connector_id::text || ':' || _provider_payload_id, 0));
  SELECT * INTO v_event FROM public.tenant_marketing_ingestion_events
   WHERE connector_id=_connector_id AND provider_payload_id=_provider_payload_id FOR UPDATE;
  IF FOUND THEN
    IF v_event.payload_hash <> _payload_hash THEN RAISE EXCEPTION 'marketing_payload_idempotency_conflict'; END IF;
    RETURN jsonb_build_object('eventId',v_event.id,'tenantId',v_event.tenant_id,'state',v_event.ingestion_state,'idempotentReplay',true);
  END IF;

  INSERT INTO public.tenant_marketing_ingestion_events (
    tenant_id,connector_id,channel_key,provider_payload_id,provider_account_reference,
    provider_form_reference,payload_schema_version,mapping_version,payload_hash,payload_sanitized,
    ingestion_state,retry_state
  ) VALUES (
    v_connector.tenant_id,v_connector.id,v_connector.channel_key,_provider_payload_id,
    v_connector.provider_account_reference,v_connector.provider_form_reference,
    _payload_schema_version,v_connector.mapping_version,_payload_hash,_payload_sanitized,
    'received','not_required'
  ) RETURNING * INTO v_event;

  INSERT INTO public.tenant_marketing_ingestion_attempts (
    tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
  ) VALUES (v_event.tenant_id,v_event.id,1,'verification','started',jsonb_build_object('channel_key',v_event.channel_key));
  RETURN jsonb_build_object('eventId',v_event.id,'tenantId',v_event.tenant_id,'state',v_event.ingestion_state,'idempotentReplay',false);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.complete_marketing_ingestion_payload(
  _event_id uuid,
  _expected_row_version bigint,
  _to_state text,
  _lead_id uuid,
  _duplicate_candidate_ids uuid[],
  _error_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_event public.tenant_marketing_ingestion_events%ROWTYPE; v_attempt integer;
BEGIN
  IF _to_state NOT IN ('verification_failed','verified','mapping_failed','normalized','duplicate_detected','lead_created','lead_linked','rejected','retryable_failed','terminal_failed') THEN
    RAISE EXCEPTION 'marketing_ingestion_state_invalid';
  END IF;
  SELECT * INTO v_event FROM public.tenant_marketing_ingestion_events WHERE id=_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing_ingestion_event_not_found'; END IF;
  IF v_event.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
  IF NOT (
    (v_event.ingestion_state='received' AND _to_state IN ('verification_failed','verified','rejected','retryable_failed','terminal_failed')) OR
    (v_event.ingestion_state='verified' AND _to_state IN ('mapping_failed','normalized','rejected','retryable_failed','terminal_failed')) OR
    (v_event.ingestion_state='normalized' AND _to_state IN ('duplicate_detected','lead_created','lead_linked','retryable_failed','terminal_failed')) OR
    (v_event.ingestion_state='retryable_failed' AND _to_state IN ('received','terminal_failed')) OR
    (v_event.ingestion_state='lead_created' AND _to_state='lead_linked')
  ) THEN RAISE EXCEPTION 'marketing_ingestion_transition_invalid'; END IF;
  IF _lead_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.leads WHERE id=_lead_id AND tenant_id=v_event.tenant_id
  ) THEN RAISE EXCEPTION 'marketing_cross_tenant_lead'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(_duplicate_candidate_ids,ARRAY[]::uuid[])) candidate_id
    WHERE NOT EXISTS (SELECT 1 FROM public.leads WHERE id=candidate_id AND tenant_id=v_event.tenant_id)
  ) THEN RAISE EXCEPTION 'marketing_cross_tenant_duplicate_candidate'; END IF;
  UPDATE public.tenant_marketing_ingestion_events
     SET ingestion_state=_to_state,
         lead_id=_lead_id,
         duplicate_candidate_ids=COALESCE(_duplicate_candidate_ids,ARRAY[]::uuid[]),
         error_code=NULLIF(_error_code,''),
         verified_at=CASE WHEN _to_state IN ('verified','normalized','duplicate_detected','lead_created','lead_linked') THEN COALESCE(verified_at,now()) ELSE verified_at END,
         retry_state=CASE WHEN _to_state='retryable_failed' THEN 'retry_available' ELSE 'not_required' END,
         row_version=row_version+1,
         updated_at=now()
   WHERE id=_event_id RETURNING * INTO v_event;
  SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
    FROM public.tenant_marketing_ingestion_attempts WHERE ingestion_event_id=_event_id;
  INSERT INTO public.tenant_marketing_ingestion_attempts (
    tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,error_code,metadata
  ) VALUES (
    v_event.tenant_id,v_event.id,v_attempt,'ingestion',
    CASE
      WHEN _to_state='verification_failed' THEN 'verification_failed'
      WHEN _to_state='mapping_failed' THEN 'mapping_failed'
      WHEN _to_state='duplicate_detected' THEN 'duplicate_detected'
      WHEN _to_state='retryable_failed' THEN 'retryable_failed'
      WHEN _to_state='terminal_failed' THEN 'terminal_failed'
      ELSE 'success'
    END,
    NULLIF(_error_code,''),
    jsonb_build_object('state',_to_state,'lead_id',_lead_id)
  );
  RETURN jsonb_build_object('eventId',v_event.id,'state',v_event.ingestion_state,'leadId',v_event.lead_id,'rowVersion',v_event.row_version);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 8. Manual import persistence and canonical CRM ingestion.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_tenant_marketing_manual_import(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _format text,
  _file_name text,
  _source_hash text,
  _idempotency_key text,
  _prepared_rows jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_mapping public.tenant_marketing_field_mappings%ROWTYPE;
  v_import public.tenant_marketing_manual_imports%ROWTYPE;
  v_count integer; v_index integer; v_row jsonb; v_hash text;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'criar');
  IF _format NOT IN ('CSV','XLSX','MANUAL_ROW') THEN RAISE EXCEPTION 'marketing_import_format_invalid'; END IF;
  IF length(btrim(COALESCE(_file_name,''))) NOT BETWEEN 1 AND 255 THEN RAISE EXCEPTION 'marketing_import_file_name_invalid'; END IF;
  IF _source_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'marketing_import_hash_invalid'; END IF;
  IF length(_idempotency_key) NOT BETWEEN 16 AND 200 THEN RAISE EXCEPTION 'marketing_import_idempotency_key_invalid'; END IF;
  IF jsonb_typeof(_prepared_rows) <> 'array' THEN RAISE EXCEPTION 'marketing_import_rows_invalid'; END IF;
  v_count := jsonb_array_length(_prepared_rows);
  IF v_count NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'marketing_import_row_limit_exceeded'; END IF;

  SELECT * INTO v_connector FROM public.tenant_marketing_connectors
   WHERE id=_connector_id AND tenant_id=_tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;
  IF v_connector.channel_key='WEBSITE_FORM' THEN RAISE EXCEPTION 'marketing_manual_import_channel_invalid'; END IF;
  SELECT * INTO v_mapping FROM public.tenant_marketing_field_mappings
   WHERE tenant_id=_tenant_id AND connector_id=_connector_id
     AND is_current AND version=v_connector.mapping_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing_mapping_required'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_tenant_id::text || ':' || _idempotency_key,0));
  SELECT * INTO v_import FROM public.tenant_marketing_manual_imports
   WHERE tenant_id=_tenant_id AND idempotency_key=_idempotency_key FOR UPDATE;
  IF FOUND THEN
    IF v_import.source_hash <> _source_hash OR v_import.connector_id <> _connector_id THEN
      RAISE EXCEPTION 'marketing_payload_idempotency_conflict';
    END IF;
    RETURN jsonb_build_object('importId',v_import.id,'state',v_import.state,'totalRows',v_import.total_rows,'idempotentReplay',true,'rowVersion',v_import.row_version);
  END IF;
  SELECT * INTO v_import FROM public.tenant_marketing_manual_imports
   WHERE tenant_id=_tenant_id AND connector_id=_connector_id AND source_hash=_source_hash FOR UPDATE;
  IF FOUND THEN
    RETURN jsonb_build_object('importId',v_import.id,'state',v_import.state,'totalRows',v_import.total_rows,'idempotentReplay',true,'rowVersion',v_import.row_version);
  END IF;

  INSERT INTO public.tenant_marketing_manual_imports (
    tenant_id,connector_id,mapping_id,format,file_name,source_hash,idempotency_key,
    state,total_rows,valid_rows,created_by
  ) VALUES (
    _tenant_id,_connector_id,v_mapping.id,_format,btrim(_file_name),_source_hash,_idempotency_key,
    'preview_ready',v_count,v_count,_actor_user_id
  ) RETURNING * INTO v_import;

  FOR v_index IN 0..v_count-1 LOOP
    v_row := _prepared_rows->v_index;
    IF jsonb_typeof(v_row) <> 'object'
       OR public.marketing_config_contains_secret(v_row)
       OR jsonb_typeof(v_row->'attribution') <> 'object'
       OR NULLIF(btrim(v_row->>'name'),'') IS NULL
       OR v_row ?| ARRAY['tenantId','tenant_id','actorUserId','actor_user_id','assignedTo','assigned_to','pipelineId','pipeline_id','stageId','stage_id']
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(v_row) key
         WHERE key NOT IN (
           'name','email','phone','message','propertyReference','source','attribution',
           'normalizedEmail','normalizedPhone'
         )
       ) THEN
      RAISE EXCEPTION 'marketing_import_row_payload_invalid:%',v_index+1;
    END IF;
    v_hash := encode(extensions.digest(convert_to(v_row::text,'UTF8'),'sha256'),'hex');
    INSERT INTO public.tenant_marketing_manual_import_rows (
      tenant_id,import_id,row_number,source_row_hash,payload_sanitized,state
    ) VALUES (_tenant_id,v_import.id,v_index+1,v_hash,v_row,'valid');
  END LOOP;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.manual_import_created','tenant_marketing_manual_import',v_import.id,
    jsonb_build_object('connector_id',_connector_id,'format',_format,'total_rows',v_count,'source_hash',_source_hash));
  RETURN jsonb_build_object('importId',v_import.id,'state',v_import.state,'totalRows',v_import.total_rows,'idempotentReplay',false,'rowVersion',v_import.row_version);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.execute_tenant_marketing_manual_import(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _import_id uuid,
  _expected_row_version bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_import public.tenant_marketing_manual_imports%ROWTYPE;
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_row public.tenant_marketing_manual_import_rows%ROWTYPE;
  v_payload jsonb; v_attribution jsonb; v_candidates uuid[]; v_candidate_count integer;
  v_property_ids uuid[]; v_property_id uuid; v_property_count integer;
  v_created jsonb; v_lead_id uuid; v_lead_version bigint;
  v_event_id uuid; v_provider_payload_id text; v_attempt integer;
  v_created_count integer := 0; v_duplicate_count integer := 0;
  v_failed_count integer := 0; v_final_state text;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'criar');
  SELECT * INTO v_import FROM public.tenant_marketing_manual_imports
   WHERE id=_import_id AND tenant_id=_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing_import_not_found'; END IF;
  IF v_import.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
  IF v_import.state IN ('completed','partial_success') THEN
    RETURN jsonb_build_object(
      'importId',v_import.id,'state',v_import.state,'totalRows',v_import.total_rows,
      'createdLeads',v_import.created_leads,'duplicateRows',v_import.duplicate_rows,
      'failedRows',v_import.failed_rows,'idempotentReplay',true,'rowVersion',v_import.row_version
    );
  END IF;
  IF v_import.state NOT IN ('preview_ready','failed') THEN RAISE EXCEPTION 'marketing_import_state_invalid'; END IF;
  SELECT * INTO v_connector FROM public.tenant_marketing_connectors
   WHERE id=v_import.connector_id AND tenant_id=_tenant_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_marketing_connector_not_found'; END IF;

  UPDATE public.tenant_marketing_manual_imports
     SET state='processing',started_at=COALESCE(started_at,now()),row_version=row_version+1,updated_at=now()
   WHERE id=v_import.id RETURNING * INTO v_import;

  FOR v_row IN
    SELECT * FROM public.tenant_marketing_manual_import_rows
     WHERE tenant_id=_tenant_id AND import_id=v_import.id
       AND state IN ('valid','failed')
     ORDER BY row_number
     FOR UPDATE
  LOOP
    BEGIN
      v_event_id := NULL;
      v_payload := v_row.payload_sanitized;
      v_attribution := v_payload->'attribution';
      IF jsonb_typeof(v_attribution) <> 'object' THEN RAISE EXCEPTION 'marketing_attribution_invalid'; END IF;
      v_provider_payload_id := COALESCE(NULLIF(v_attribution->>'providerPayloadId',''),'sha256:' || v_row.source_row_hash);

      SELECT COALESCE(array_agg(id ORDER BY id),ARRAY[]::uuid[]),count(*)
        INTO v_candidates,v_candidate_count
      FROM public.leads
      WHERE tenant_id=_tenant_id
        AND merge_state='active'
        AND (
          (NULLIF(v_payload->>'normalizedEmail','') IS NOT NULL AND normalized_email=v_payload->>'normalizedEmail')
          OR
          (NULLIF(v_payload->>'normalizedPhone','') IS NOT NULL AND normalized_phone=v_payload->>'normalizedPhone')
        );

      IF v_candidate_count > 0 THEN
        INSERT INTO public.tenant_marketing_ingestion_events (
          tenant_id,connector_id,channel_key,provider_payload_id,provider_account_reference,
          provider_form_reference,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,
          mapping_version,payload_hash,payload_sanitized,verified_at,ingestion_state,
          duplicate_candidate_ids,retry_state
        ) VALUES (
          _tenant_id,v_connector.id,v_connector.channel_key,v_provider_payload_id,
          v_connector.provider_account_reference,v_connector.provider_form_reference,
          v_attribution->>'campaignId',v_attribution->>'campaignName',
          v_attribution->>'adsetId',v_attribution->>'adsetName',v_attribution->>'adId',v_attribution->>'adName',
          v_connector.mapping_version,v_row.source_row_hash,v_payload,now(),'duplicate_detected',v_candidates,'not_required'
        )
        ON CONFLICT (connector_id,provider_payload_id) DO UPDATE
          SET duplicate_candidate_ids=EXCLUDED.duplicate_candidate_ids,
              ingestion_state='duplicate_detected',updated_at=now(),row_version=tenant_marketing_ingestion_events.row_version+1
          WHERE tenant_marketing_ingestion_events.payload_hash=EXCLUDED.payload_hash
        RETURNING id INTO v_event_id;
        IF v_event_id IS NULL THEN RAISE EXCEPTION 'marketing_payload_idempotency_conflict'; END IF;
        SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
          FROM public.tenant_marketing_ingestion_attempts WHERE ingestion_event_id=v_event_id;
        INSERT INTO public.tenant_marketing_ingestion_attempts (
          tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
        ) VALUES (_tenant_id,v_event_id,v_attempt,'ingestion','duplicate_detected',
          jsonb_build_object('import_id',v_import.id,'row_number',v_row.row_number));
        UPDATE public.tenant_marketing_manual_import_rows
           SET state='duplicate_detected',duplicate_candidate_ids=v_candidates,
               ingestion_event_id=v_event_id,error_code='marketing_duplicate_detected',updated_at=now()
         WHERE id=v_row.id;
        CONTINUE;
      END IF;

      v_property_id := NULL;
      IF NULLIF(v_payload->>'propertyReference','') IS NOT NULL THEN
        IF v_payload->>'propertyReference' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
          SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]),count(*) INTO v_property_ids,v_property_count
          FROM public.imoveis WHERE tenant_id=_tenant_id AND id=(v_payload->>'propertyReference')::uuid;
        ELSE
          SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]),count(*) INTO v_property_ids,v_property_count
          FROM public.imoveis WHERE tenant_id=_tenant_id AND codigo=v_payload->>'propertyReference';
        END IF;
        IF v_property_count <> 1 THEN RAISE EXCEPTION 'marketing_property_reference_ambiguous_or_missing'; END IF;
        v_property_id := v_property_ids[1];
      END IF;

      v_created := public.create_tenant_crm_lead(
        _actor_user_id,_tenant_id,_tenant_origin,
        v_payload->>'name',NULLIF(v_payload->>'email',''),NULLIF(v_payload->>'phone',''),
        v_property_id,NULLIF(v_payload->>'message',''),NULL,
        'marketing:' || v_import.id::text || ':' || v_row.row_number::text
      );
      v_lead_id := (v_created->>'id')::uuid;

      UPDATE public.leads
         SET origem=COALESCE(NULLIF(v_payload->>'source',''),lower(v_connector.channel_key)),
             original_attribution=v_attribution,
             latest_attribution=v_attribution,
             utm_source=NULLIF(v_attribution->>'utmSource',''),
             utm_medium=NULLIF(v_attribution->>'utmMedium',''),
             utm_campaign=NULLIF(v_attribution->>'utmCampaign',''),
             utm_content=NULLIF(v_attribution->>'utmContent',''),
             utm_term=NULLIF(v_attribution->>'utmTerm',''),
             gclid=NULLIF(v_attribution->>'gclid',''),
             fbclid=NULLIF(v_attribution->>'fbclid',''),
             landing_url=NULLIF(v_attribution->>'landingUrl',''),
             referrer=NULLIF(v_attribution->>'referrer',''),
             version=version+1,
             updated_at=now()
       WHERE id=v_lead_id AND tenant_id=_tenant_id
       RETURNING version INTO v_lead_version;
      IF v_lead_version IS NULL THEN RAISE EXCEPTION 'marketing_lead_attribution_update_failed'; END IF;

      INSERT INTO public.crm_lead_events (
        tenant_id,lead_id,actor_user_id,event_type,payload
      ) VALUES (
        _tenant_id,v_lead_id,_actor_user_id,'source_corrected',
        jsonb_build_object(
          'source','marketing_ingestion','connector_id',v_connector.id,
          'channel_key',v_connector.channel_key,'import_id',v_import.id,
          'row_number',v_row.row_number,'attribution',v_attribution,
          'version',v_lead_version
        )
      );

      INSERT INTO public.tenant_marketing_ingestion_events (
        tenant_id,connector_id,channel_key,provider_payload_id,provider_account_reference,
        provider_form_reference,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,
        mapping_version,payload_hash,payload_sanitized,verified_at,ingestion_state,lead_id,retry_state
      ) VALUES (
        _tenant_id,v_connector.id,v_connector.channel_key,v_provider_payload_id,
        v_connector.provider_account_reference,v_connector.provider_form_reference,
        v_attribution->>'campaignId',v_attribution->>'campaignName',
        v_attribution->>'adsetId',v_attribution->>'adsetName',v_attribution->>'adId',v_attribution->>'adName',
        v_connector.mapping_version,v_row.source_row_hash,v_payload,now(),'lead_created',v_lead_id,'not_required'
      )
      ON CONFLICT (connector_id,provider_payload_id) DO UPDATE
        SET lead_id=EXCLUDED.lead_id,ingestion_state='lead_linked',updated_at=now(),row_version=tenant_marketing_ingestion_events.row_version+1
        WHERE tenant_marketing_ingestion_events.payload_hash=EXCLUDED.payload_hash
      RETURNING id INTO v_event_id;
      IF v_event_id IS NULL THEN RAISE EXCEPTION 'marketing_payload_idempotency_conflict'; END IF;

      SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
        FROM public.tenant_marketing_ingestion_attempts WHERE ingestion_event_id=v_event_id;
      INSERT INTO public.tenant_marketing_ingestion_attempts (
        tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
      ) VALUES (_tenant_id,v_event_id,v_attempt,'ingestion','success',
        jsonb_build_object('lead_id',v_lead_id,'import_id',v_import.id,'row_number',v_row.row_number));

      UPDATE public.tenant_marketing_manual_import_rows
         SET state='lead_created',lead_id=v_lead_id,ingestion_event_id=v_event_id,error_code=NULL,updated_at=now()
       WHERE id=v_row.id;
      INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
      VALUES (_tenant_id,_actor_user_id,'marketing.lead_ingested','lead',v_lead_id,
        jsonb_build_object(
          'connector_id',v_connector.id,'channel_key',v_connector.channel_key,
          'import_id',v_import.id,'row_number',v_row.row_number,
          'ingestion_event_id',v_event_id,'lead_version',v_lead_version
        ));
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.tenant_marketing_manual_import_rows
         SET state='failed',error_code=left(SQLSTATE || ':' || SQLERRM,200),updated_at=now()
       WHERE id=v_row.id;
    END;
  END LOOP;

  SELECT count(*) FILTER (WHERE state='lead_created'),
         count(*) FILTER (WHERE state='duplicate_detected'),
         count(*) FILTER (WHERE state IN ('failed','invalid'))
    INTO v_created_count,v_duplicate_count,v_failed_count
  FROM public.tenant_marketing_manual_import_rows
  WHERE tenant_id=_tenant_id AND import_id=v_import.id;

  v_final_state := CASE
    WHEN v_created_count = v_import.total_rows THEN 'completed'
    WHEN v_created_count > 0 OR v_duplicate_count > 0 THEN 'partial_success'
    ELSE 'failed'
  END;
  UPDATE public.tenant_marketing_manual_imports
     SET state=v_final_state,
         created_leads=v_created_count,
         duplicate_rows=v_duplicate_count,
         failed_rows=v_failed_count,
         completed_at=now(),
         row_version=row_version+1,
         updated_at=now()
   WHERE id=v_import.id RETURNING * INTO v_import;
  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'marketing.manual_import_completed','tenant_marketing_manual_import',v_import.id,
    jsonb_build_object('state',v_import.state,'created_leads',v_created_count,'duplicate_rows',v_duplicate_count,'failed_rows',v_failed_count));
  RETURN jsonb_build_object(
    'importId',v_import.id,'state',v_import.state,'totalRows',v_import.total_rows,
    'createdLeads',v_created_count,'duplicateRows',v_duplicate_count,'failedRows',v_failed_count,
    'idempotentReplay',false,'rowVersion',v_import.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.retry_tenant_marketing_ingestion(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _event_id uuid,
  _expected_row_version bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_event public.tenant_marketing_ingestion_events%ROWTYPE; v_attempt integer;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(_actor_user_id,_tenant_id,_tenant_origin,'gerenciar');
  SELECT * INTO v_event FROM public.tenant_marketing_ingestion_events
   WHERE id=_event_id AND tenant_id=_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing_ingestion_event_not_found'; END IF;
  IF v_event.row_version <> _expected_row_version THEN RAISE EXCEPTION 'marketing_revision_conflict'; END IF;
  IF v_event.ingestion_state <> 'retryable_failed' OR v_event.retry_state <> 'retry_available' THEN
    RAISE EXCEPTION 'marketing_retry_not_available';
  END IF;
  IF v_event.channel_key IN ('META_ADS','GOOGLE_ADS') THEN RAISE EXCEPTION 'marketing_adapter_not_implemented'; END IF;
  UPDATE public.tenant_marketing_ingestion_events
     SET retry_count=retry_count+1,retry_state='retrying',ingestion_state='received',
         error_code=NULL,row_version=row_version+1,updated_at=now()
   WHERE id=_event_id RETURNING * INTO v_event;
  SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
  FROM public.tenant_marketing_ingestion_attempts WHERE ingestion_event_id=_event_id;
  INSERT INTO public.tenant_marketing_ingestion_attempts (
    tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
  ) VALUES (_tenant_id,_event_id,v_attempt,'retry','started',jsonb_build_object('retry_count',v_event.retry_count));
  RETURN jsonb_build_object('eventId',v_event.id,'state',v_event.ingestion_state,'retryState',v_event.retry_state,'rowVersion',v_event.row_version);
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 9. RLS and ACL. No direct application access and no provider HTTP in SQL.
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenant_marketing_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_connector_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_ingestion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_ingestion_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_manual_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_manual_import_rows ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tenant_marketing_connectors,
  public.tenant_marketing_connector_versions,
  public.tenant_marketing_field_mappings,
  public.tenant_marketing_ingestion_events,
  public.tenant_marketing_ingestion_attempts,
  public.tenant_marketing_manual_imports,
  public.tenant_marketing_manual_import_rows
FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.tenant_marketing_connectors,
  public.tenant_marketing_connector_versions,
  public.tenant_marketing_field_mappings,
  public.tenant_marketing_ingestion_events,
  public.tenant_marketing_ingestion_attempts,
  public.tenant_marketing_manual_imports,
  public.tenant_marketing_manual_import_rows
TO service_role;

REVOKE ALL ON FUNCTION public.assert_tenant_marketing_authority(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.marketing_config_contains_secret(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_marketing_credential_reference(uuid,uuid,text,uuid,bigint,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_marketing_mapping(uuid,uuid,text,uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_marketing_ingestion_payload(uuid,text,text,jsonb,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_marketing_ingestion_payload(uuid,bigint,text,uuid,uuid[],text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_marketing_manual_import(uuid,uuid,text,uuid,text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_tenant_marketing_manual_import(uuid,uuid,text,uuid,bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retry_tenant_marketing_ingestion(uuid,uuid,text,uuid,bigint) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assert_tenant_marketing_authority(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketing_config_contains_secret(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_tenant_marketing_credential_reference(uuid,uuid,text,uuid,bigint,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_marketing_mapping(uuid,uuid,text,uuid,integer,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_marketing_ingestion_payload(uuid,text,text,jsonb,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_marketing_ingestion_payload(uuid,bigint,text,uuid,uuid[],text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_tenant_marketing_manual_import(uuid,uuid,text,uuid,text,text,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_tenant_marketing_manual_import(uuid,uuid,text,uuid,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_tenant_marketing_ingestion(uuid,uuid,text,uuid,bigint) TO service_role;

COMMIT;
