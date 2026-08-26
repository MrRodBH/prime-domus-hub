-- PR-M2 — Analytics, Tracking, Conversion Events & Tag Governance Functional Completion
-- Additive, fail-closed and service-role-only. Not applied to the managed backend here.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tenant-owned provider connectors and immutable configuration versions.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_tracking_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_key text NOT NULL CHECK (provider_key IN ('META_PIXEL','GOOGLE_ANALYTICS','GOOGLE_TAG_MANAGER')),
  provider_identifier text,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  enabled boolean NOT NULL DEFAULT false,
  consent_category text NOT NULL CHECK (consent_category IN ('ANALYTICS','MARKETING')),
  configuration_version integer NOT NULL DEFAULT 1 CHECK (configuration_version >= 1),
  event_binding_version integer NOT NULL DEFAULT 1 CHECK (event_binding_version >= 1),
  availability_state text NOT NULL DEFAULT 'unconfigured' CHECK (availability_state IN (
    'unconfigured','configured','consent_required','inactive','preview_ready','active',
    'adapter_not_implemented','csp_blocked','temporarily_unavailable','failed'
  )),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  last_diagnostic_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_key),
  UNIQUE (id, tenant_id),
  CHECK (
    provider_identifier IS NULL OR
    (provider_key = 'META_PIXEL' AND provider_identifier ~ '^[0-9]{5,30}$') OR
    (provider_key = 'GOOGLE_ANALYTICS' AND provider_identifier ~ '^G-[A-Z0-9]{4,20}$') OR
    (provider_key = 'GOOGLE_TAG_MANAGER' AND provider_identifier ~ '^GTM-[A-Z0-9]{4,20}$')
  ),
  CHECK (NOT enabled OR provider_identifier IS NOT NULL),
  CHECK (
    (provider_key = 'META_PIXEL' AND consent_category = 'MARKETING') OR
    (provider_key IN ('GOOGLE_ANALYTICS','GOOGLE_TAG_MANAGER') AND consent_category = 'ANALYTICS')
  )
);

CREATE INDEX IF NOT EXISTS ix_tenant_tracking_connectors_tenant_state
  ON public.tenant_tracking_connectors (tenant_id, availability_state, enabled);

CREATE TABLE IF NOT EXISTS public.tenant_tracking_connector_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  provider_identifier text,
  enabled boolean NOT NULL,
  consent_category text NOT NULL CHECK (consent_category IN ('ANALYTICS','MARKETING')),
  availability_state text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, connector_id, version),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_tracking_connectors(id, tenant_id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 2. Closed event bindings, diagnostics and consent configuration.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_tracking_event_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid NOT NULL,
  event_key text NOT NULL CHECK (event_key IN (
    'page_view','view_property','search_properties','filter_properties','submit_public_form',
    'lead_created','contact_click','phone_click','whatsapp_click','email_click',
    'campaign_view','conversion_confirmed'
  )),
  enabled boolean NOT NULL DEFAULT false,
  binding_version integer NOT NULL DEFAULT 1 CHECK (binding_version >= 1),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, connector_id, event_key),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_tracking_connectors(id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_tenant_tracking_bindings_connector
  ON public.tenant_tracking_event_bindings (tenant_id, connector_id, enabled, event_key);

CREATE TABLE IF NOT EXISTS public.tenant_tracking_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connector_id uuid,
  provider_key text CHECK (provider_key IS NULL OR provider_key IN ('META_PIXEL','GOOGLE_ANALYTICS','GOOGLE_TAG_MANAGER')),
  diagnostic_state text NOT NULL CHECK (diagnostic_state IN (
    'configured','consent_required','runtime_configured','provider_runtime_loaded',
    'dispatch_attempted','csp_blocked','duplicate_detected','temporarily_unavailable','failed'
  )),
  error_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (connector_id, tenant_id)
    REFERENCES public.tenant_tracking_connectors(id, tenant_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_tenant_tracking_diagnostics_tenant_created
  ON public.tenant_tracking_diagnostics (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_tracking_consent_configuration (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
  notice_enabled boolean NOT NULL DEFAULT true,
  analytics_mode text NOT NULL DEFAULT 'opt_in' CHECK (analytics_mode = 'opt_in'),
  marketing_mode text NOT NULL DEFAULT 'opt_in' CHECK (marketing_mode = 'opt_in'),
  policy_revision integer NOT NULL DEFAULT 1 CHECK (policy_revision >= 1),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Diagnostics are append-only. They describe runtime state and never grant authority.
CREATE OR REPLACE FUNCTION public.prevent_tracking_diagnostic_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  RAISE EXCEPTION 'tracking_diagnostic_append_only' USING ERRCODE = '55000';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_tracking_diagnostic_append_only ON public.tenant_tracking_diagnostics;
CREATE TRIGGER trg_tracking_diagnostic_append_only
BEFORE UPDATE OR DELETE ON public.tenant_tracking_diagnostics
FOR EACH ROW EXECUTE FUNCTION public.prevent_tracking_diagnostic_mutation();

-- ---------------------------------------------------------------------------
-- 3. Deterministic cutover from legacy public identifiers.
-- ---------------------------------------------------------------------------

DO $fn$
BEGIN
  IF EXISTS (
    SELECT tenant_id
    FROM public.site_settings_versions
    WHERE key = 'configuration' AND status = 'published'
      AND EXISTS (
        SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
        WHERE authorized.tenant_id = site_settings_versions.tenant_id
      )
    GROUP BY tenant_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_published_configuration_ambiguous';
  END IF;
  IF EXISTS (
    SELECT tenant_id
    FROM public.site_settings
    WHERE key = 'meta_integracao'
      AND EXISTS (
        SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
        WHERE authorized.tenant_id = site_settings.tenant_id
      )
    GROUP BY tenant_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'tracking_legacy_meta_configuration_ambiguous';
  END IF;
END;
$fn$;

WITH published AS (
  SELECT tenant_id, value
  FROM public.site_settings_versions
  WHERE key = 'configuration' AND status = 'published'
), legacy_meta AS (
  SELECT tenant_id, value
  FROM public.site_settings
  WHERE key = 'meta_integracao'
), raw AS (
  SELECT
    tenant.id AS tenant_id,
    provider.provider_key,
    provider.consent_category,
    upper(btrim(CASE provider.provider_key
      WHEN 'META_PIXEL' THEN COALESCE(
        NULLIF(published.value->>'meta_pixel_id',''),
        NULLIF(legacy_meta.value->>'pixel_id','')
      )
      WHEN 'GOOGLE_ANALYTICS' THEN NULLIF(published.value->>'ga4_measurement_id','')
      WHEN 'GOOGLE_TAG_MANAGER' THEN NULLIF(published.value->>'google_tag_manager_container_id','')
    END)) AS raw_identifier
  FROM public.tenants tenant
  JOIN prm2_rebaseline.authorized_tenant_ids() authorized ON authorized.tenant_id = tenant.id
  CROSS JOIN (VALUES
    ('META_PIXEL','MARKETING'),
    ('GOOGLE_ANALYTICS','ANALYTICS'),
    ('GOOGLE_TAG_MANAGER','ANALYTICS')
  ) AS provider(provider_key, consent_category)
  LEFT JOIN published ON published.tenant_id = tenant.id
  LEFT JOIN legacy_meta ON legacy_meta.tenant_id = tenant.id
), normalized AS (
  SELECT *, CASE
    WHEN provider_key = 'META_PIXEL' AND raw_identifier ~ '^[0-9]{5,30}$' THEN raw_identifier
    WHEN provider_key = 'GOOGLE_ANALYTICS' AND raw_identifier ~ '^G-[A-Z0-9]{4,20}$' THEN raw_identifier
    WHEN provider_key = 'GOOGLE_TAG_MANAGER' AND raw_identifier ~ '^GTM-[A-Z0-9]{4,20}$' THEN raw_identifier
    ELSE NULL
  END AS accepted_identifier
  FROM raw
)
INSERT INTO public.tenant_tracking_connectors (
  tenant_id, provider_key, provider_identifier, schema_version, enabled,
  consent_category, configuration_version, event_binding_version,
  availability_state, row_version, last_error_code
)
SELECT
  tenant_id,
  provider_key,
  accepted_identifier,
  1,
  accepted_identifier IS NOT NULL,
  consent_category,
  1,
  1,
  CASE WHEN accepted_identifier IS NULL THEN 'unconfigured' ELSE 'active' END,
  1,
  CASE WHEN raw_identifier IS NOT NULL AND accepted_identifier IS NULL
    THEN 'tracking_legacy_identifier_invalid' ELSE NULL END
FROM normalized
ON CONFLICT (tenant_id, provider_key) DO NOTHING;

INSERT INTO public.tenant_tracking_connector_versions (
  tenant_id, connector_id, version, provider_identifier, enabled,
  consent_category, availability_state, created_by
)
SELECT tenant_id, id, configuration_version, provider_identifier, enabled,
       consent_category, availability_state, NULL
FROM public.tenant_tracking_connectors
WHERE EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = tenant_tracking_connectors.tenant_id
)
ON CONFLICT (tenant_id, connector_id, version) DO NOTHING;

INSERT INTO public.tenant_tracking_event_bindings (
  tenant_id, connector_id, event_key, enabled, binding_version, created_by
)
SELECT connector.tenant_id, connector.id, event.event_key,
       event.event_key = 'page_view', connector.event_binding_version, NULL
FROM public.tenant_tracking_connectors connector
JOIN prm2_rebaseline.authorized_tenant_ids() authorized
  ON authorized.tenant_id = connector.tenant_id
CROSS JOIN (VALUES
  ('page_view'),('view_property'),('search_properties'),('filter_properties'),
  ('submit_public_form'),('lead_created'),('contact_click'),('phone_click'),
  ('whatsapp_click'),('email_click'),('campaign_view'),('conversion_confirmed')
) AS event(event_key)
ON CONFLICT (tenant_id, connector_id, event_key) DO NOTHING;

INSERT INTO public.tenant_tracking_consent_configuration (
  tenant_id, schema_version, notice_enabled, analytics_mode, marketing_mode,
  policy_revision, row_version
)
SELECT id, 1, true, 'opt_in', 'opt_in', 1, 1
FROM public.tenants
WHERE EXISTS (
  SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
  WHERE authorized.tenant_id = tenants.id
)
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.tenant_tracking_diagnostics (
  tenant_id, connector_id, provider_key, diagnostic_state, error_code, metadata
)
SELECT tenant_id, id, provider_key, 'failed', last_error_code,
       jsonb_build_object('source','legacy_identifier_cutover','raw_value_persisted',false)
FROM public.tenant_tracking_connectors
WHERE last_error_code = 'tracking_legacy_identifier_invalid'
  AND EXISTS (
    SELECT 1 FROM prm2_rebaseline.authorized_tenant_ids() authorized
    WHERE authorized.tenant_id = tenant_tracking_connectors.tenant_id
  );

-- ---------------------------------------------------------------------------
-- 4. Server-owned tenant authority and versioned mutations.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_tenant_tracking_authority(
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
    RAISE EXCEPTION 'tenant_tracking_authority_required' USING ERRCODE = '22023';
  END IF;
  IF _action NOT IN ('visualizar','editar','publicar') THEN
    RAISE EXCEPTION 'tenant_tracking_action_invalid' USING ERRCODE = '22023';
  END IF;
  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    CASE WHEN _action = 'publicar' THEN 'cms.versoes' ELSE 'cms.configuracoes' END,
    _action::public.rbac_action
  );
  IF COALESCE((v_decision->>'allowed')::boolean, false) IS NOT TRUE
     OR v_decision->>'scope' <> 'global' THEN
    RAISE EXCEPTION 'tenant_tracking_permission_denied' USING ERRCODE = '42501';
  END IF;
  RETURN v_decision;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_tenant_tracking_connector(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _provider_identifier text,
  _enabled boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_connector public.tenant_tracking_connectors%ROWTYPE;
  v_identifier text;
  v_next_version integer;
  v_state text;
BEGIN
  PERFORM public.assert_tenant_tracking_authority(_actor_user_id,_tenant_id,_tenant_origin,'editar');
  SELECT * INTO v_connector
  FROM public.tenant_tracking_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_tracking_connector_not_found'; END IF;
  IF v_connector.row_version <> _expected_row_version THEN RAISE EXCEPTION 'tracking_revision_conflict'; END IF;

  v_identifier := NULLIF(upper(btrim(COALESCE(_provider_identifier,''))),'');
  IF v_identifier IS NOT NULL AND NOT (
    (v_connector.provider_key = 'META_PIXEL' AND v_identifier ~ '^[0-9]{5,30}$') OR
    (v_connector.provider_key = 'GOOGLE_ANALYTICS' AND v_identifier ~ '^G-[A-Z0-9]{4,20}$') OR
    (v_connector.provider_key = 'GOOGLE_TAG_MANAGER' AND v_identifier ~ '^GTM-[A-Z0-9]{4,20}$')
  ) THEN RAISE EXCEPTION 'tracking_provider_identifier_invalid'; END IF;
  IF _enabled AND v_identifier IS NULL THEN RAISE EXCEPTION 'tracking_provider_identifier_required'; END IF;

  v_next_version := v_connector.configuration_version + 1;
  v_state := CASE WHEN v_identifier IS NULL THEN 'unconfigured' WHEN _enabled THEN 'active' ELSE 'configured' END;

  UPDATE public.tenant_tracking_connectors
  SET provider_identifier = v_identifier,
      enabled = _enabled,
      configuration_version = v_next_version,
      availability_state = v_state,
      row_version = row_version + 1,
      last_error_code = NULL,
      updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id
  RETURNING * INTO v_connector;

  INSERT INTO public.tenant_tracking_connector_versions (
    tenant_id, connector_id, version, provider_identifier, enabled,
    consent_category, availability_state, created_by
  ) VALUES (
    _tenant_id, v_connector.id, v_connector.configuration_version,
    v_connector.provider_identifier, v_connector.enabled,
    v_connector.consent_category, v_connector.availability_state, _actor_user_id
  );

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'tracking.connector_saved','tenant_tracking_connector',v_connector.id,
    jsonb_build_object(
      'provider_key',v_connector.provider_key,
      'identifier_configured',v_connector.provider_identifier IS NOT NULL,
      'enabled',v_connector.enabled,
      'configuration_version',v_connector.configuration_version,
      'availability_state',v_connector.availability_state,
      'row_version',v_connector.row_version
    ));

  RETURN jsonb_build_object(
    'id',v_connector.id,
    'providerKey',v_connector.provider_key,
    'enabled',v_connector.enabled,
    'configurationVersion',v_connector.configuration_version,
    'availabilityState',v_connector.availability_state,
    'rowVersion',v_connector.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_tenant_tracking_event_bindings(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_binding_version integer,
  _bindings jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_connector public.tenant_tracking_connectors%ROWTYPE;
  v_next_version integer;
  v_item jsonb;
  v_event_key text;
BEGIN
  PERFORM public.assert_tenant_tracking_authority(_actor_user_id,_tenant_id,_tenant_origin,'editar');
  IF jsonb_typeof(_bindings) <> 'array' OR jsonb_array_length(_bindings) <> 12 THEN
    RAISE EXCEPTION 'tracking_event_bindings_complete_set_required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(_bindings) item
    WHERE jsonb_typeof(item) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(item) key WHERE key NOT IN ('eventKey','enabled'))
       OR jsonb_typeof(item->'enabled') <> 'boolean'
       OR item->>'eventKey' NOT IN (
         'page_view','view_property','search_properties','filter_properties','submit_public_form',
         'lead_created','contact_click','phone_click','whatsapp_click','email_click',
         'campaign_view','conversion_confirmed'
       )
  ) THEN RAISE EXCEPTION 'tracking_event_binding_invalid'; END IF;
  IF EXISTS (
    SELECT item->>'eventKey'
    FROM jsonb_array_elements(_bindings) item
    GROUP BY item->>'eventKey'
    HAVING count(*) <> 1
  ) THEN RAISE EXCEPTION 'tracking_event_binding_duplicate'; END IF;

  SELECT * INTO v_connector
  FROM public.tenant_tracking_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_tracking_connector_not_found'; END IF;
  IF v_connector.event_binding_version <> _expected_binding_version THEN RAISE EXCEPTION 'tracking_binding_revision_conflict'; END IF;
  v_next_version := v_connector.event_binding_version + 1;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_bindings) LOOP
    v_event_key := v_item->>'eventKey';
    UPDATE public.tenant_tracking_event_bindings
       SET enabled = (v_item->>'enabled')::boolean,
           binding_version = v_next_version,
           created_by = _actor_user_id,
           updated_at = now()
     WHERE tenant_id = _tenant_id AND connector_id = _connector_id AND event_key = v_event_key;
    IF NOT FOUND THEN RAISE EXCEPTION 'tracking_event_binding_missing'; END IF;
  END LOOP;

  UPDATE public.tenant_tracking_connectors
     SET event_binding_version = v_next_version,
         row_version = row_version + 1,
         updated_at = now()
   WHERE id = _connector_id AND tenant_id = _tenant_id
   RETURNING * INTO v_connector;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'tracking.bindings_saved','tenant_tracking_connector',_connector_id,
    jsonb_build_object('event_binding_version',v_next_version,'row_version',v_connector.row_version));

  RETURN jsonb_build_object(
    'connectorId',_connector_id,
    'eventBindingVersion',v_next_version,
    'rowVersion',v_connector.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_tenant_tracking_consent_configuration(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _expected_row_version bigint,
  _notice_enabled boolean,
  _policy_revision integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_row public.tenant_tracking_consent_configuration%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_tracking_authority(_actor_user_id,_tenant_id,_tenant_origin,'editar');
  IF _policy_revision < 1 THEN RAISE EXCEPTION 'tracking_consent_policy_revision_invalid'; END IF;
  SELECT * INTO v_row
  FROM public.tenant_tracking_consent_configuration
  WHERE tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_tracking_consent_configuration_not_found'; END IF;
  IF v_row.row_version <> _expected_row_version THEN RAISE EXCEPTION 'tracking_consent_revision_conflict'; END IF;

  UPDATE public.tenant_tracking_consent_configuration
     SET notice_enabled = _notice_enabled,
         analytics_mode = 'opt_in',
         marketing_mode = 'opt_in',
         policy_revision = _policy_revision,
         row_version = row_version + 1,
         updated_at = now()
   WHERE tenant_id = _tenant_id
   RETURNING * INTO v_row;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (_tenant_id,_actor_user_id,'tracking.consent_configuration_saved','tenant_tracking_consent_configuration',_tenant_id,
    jsonb_build_object(
      'notice_enabled',v_row.notice_enabled,
      'analytics_mode',v_row.analytics_mode,
      'marketing_mode',v_row.marketing_mode,
      'policy_revision',v_row.policy_revision,
      'row_version',v_row.row_version
    ));

  RETURN jsonb_build_object(
    'tenantId',_tenant_id,
    'noticeEnabled',v_row.notice_enabled,
    'analyticsMode',v_row.analytics_mode,
    'marketingMode',v_row.marketing_mode,
    'policyRevision',v_row.policy_revision,
    'rowVersion',v_row.row_version
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 5. RLS, grants and RPC ACL.
-- ---------------------------------------------------------------------------

ALTER TABLE public.tenant_tracking_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tracking_connector_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tracking_event_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tracking_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_tracking_consent_configuration ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.tenant_tracking_connectors,
  public.tenant_tracking_connector_versions,
  public.tenant_tracking_event_bindings,
  public.tenant_tracking_diagnostics,
  public.tenant_tracking_consent_configuration
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.tenant_tracking_connectors,
  public.tenant_tracking_connector_versions,
  public.tenant_tracking_event_bindings,
  public.tenant_tracking_diagnostics,
  public.tenant_tracking_consent_configuration
TO service_role;

REVOKE ALL ON FUNCTION public.assert_tenant_tracking_authority(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_tracking_connector(uuid,uuid,text,uuid,bigint,text,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_tracking_event_bindings(uuid,uuid,text,uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_tenant_tracking_consent_configuration(uuid,uuid,text,bigint,boolean,integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assert_tenant_tracking_authority(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_tracking_connector(uuid,uuid,text,uuid,bigint,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_tracking_event_bindings(uuid,uuid,text,uuid,integer,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_tenant_tracking_consent_configuration(uuid,uuid,text,bigint,boolean,integer) TO service_role;

COMMIT;
