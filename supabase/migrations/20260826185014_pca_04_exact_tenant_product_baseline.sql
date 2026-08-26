-- PCA-04 — Exact tenant product baseline orchestration.
-- Repository materialization only: this migration is not applied by this gate.

BEGIN;

CREATE OR REPLACE FUNCTION public.provision_tenant_product_baseline(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  v_pipeline_id uuid;
  v_snapshot jsonb := jsonb_build_object(
    'domain_activation_state', 'pending_DCA01',
    'cloudflare_mode', 'HYBRID_pending_DCA01',
    'billing_activation_state', 'pending_BCA01',
    'final_visual_refinement', 'pending_PRM3',
    'lead_form_required_fields', jsonb_build_array('name', 'email', 'phone'),
    'lead_consent_required', true
  );
BEGIN
  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'product_baseline_tenant_required' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.tenants WHERE id = _tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'product_baseline_tenant_not_found' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.site_settings_versions
    WHERE tenant_id = _tenant_id AND key = 'configuration'
  ) THEN
    PERFORM public.validate_tenant_configuration_snapshot(_tenant_id, v_snapshot);
    INSERT INTO public.site_settings_versions (
      tenant_id, key, value, status, revision, based_on_revision,
      content_hash, notes, created_by, published_at
    ) VALUES (
      _tenant_id, 'configuration', v_snapshot, 'published', 1, 0,
      encode(digest(v_snapshot::text, 'sha256'), 'hex'),
      'PCA-04 canonical future-tenant baseline', NULL, now()
    );
  END IF;

  SELECT id INTO v_pipeline_id
    FROM public.crm_pipelines
   WHERE tenant_id = _tenant_id AND pipeline_key = 'sales_default'
   FOR UPDATE;
  IF v_pipeline_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.crm_pipelines
      WHERE tenant_id = _tenant_id AND is_default AND ativo
    ) THEN
      RAISE EXCEPTION 'product_baseline_default_pipeline_conflict' USING ERRCODE = '23505';
    END IF;
    INSERT INTO public.crm_pipelines (tenant_id, pipeline_key, nome, ativo, is_default)
    VALUES (_tenant_id, 'sales_default', 'Pipeline comercial', true, true)
    RETURNING id INTO v_pipeline_id;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.crm_pipelines
    WHERE id = v_pipeline_id AND tenant_id = _tenant_id AND is_default AND ativo
  ) THEN
    RAISE EXCEPTION 'product_baseline_pipeline_contract_conflict' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.crm_pipeline_stages (
    tenant_id, pipeline_id, status_key, nome, position, terminal
  )
  SELECT _tenant_id, v_pipeline_id, stage.status_key, stage.nome, stage.position, stage.terminal
    FROM (VALUES
      ('novo','Novo',0,false), ('conversando','Conversando',1,false),
      ('visita','Visita',2,false), ('proposta','Proposta',3,false),
      ('ganho','Ganho',4,true), ('perdido','Perdido',5,true),
      ('descartado','Descartado',6,true)
    ) AS stage(status_key,nome,position,terminal)
  ON CONFLICT (tenant_id, pipeline_id, status_key) DO NOTHING;

  INSERT INTO public.tenant_marketing_connectors (
    tenant_id, channel_key, credential_state, verification_state,
    availability_state, active, config, adapter_version, provider_contract_version
  )
  SELECT
    _tenant_id,
    channel.channel_key,
    CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'credential_required' ELSE 'not_required' END,
    CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'not_live_verified' ELSE 'not_required' END,
    CASE
      WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'credential_required'
      WHEN channel.channel_key = 'MANUAL_IMPORT' THEN 'manual_ready'
      ELSE 'automated_ready'
    END,
    channel.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM'),
    CASE WHEN channel.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM') THEN jsonb_build_object(
      'channelKey', channel.channel_key, 'operationMode', 'HYBRID',
      'configurationVersion', 1, 'providerAccountReference', NULL,
      'providerFormReference', NULL, 'credentialReference', NULL, 'mappingVersion', 1
    ) ELSE '{}'::jsonb END,
    CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 1 ELSE NULL END,
    CASE WHEN channel.channel_key IN ('META_ADS','GOOGLE_ADS') THEN 1 ELSE NULL END
  FROM (VALUES ('META_ADS'),('GOOGLE_ADS'),('MANUAL_IMPORT'),('WEBSITE_FORM')) AS channel(channel_key)
  ON CONFLICT (tenant_id, channel_key) DO NOTHING;

  INSERT INTO public.tenant_marketing_connector_versions (
    tenant_id, connector_id, version, config, provider_account_reference,
    provider_form_reference, availability_state, created_by
  )
  SELECT tenant_id, id, configuration_version, config, provider_account_reference,
         provider_form_reference, availability_state, NULL
    FROM public.tenant_marketing_connectors
   WHERE tenant_id = _tenant_id
  ON CONFLICT (tenant_id, connector_id, version) DO NOTHING;

  INSERT INTO public.tenant_marketing_field_mappings (
    tenant_id, connector_id, version, mapping, is_current, created_by
  )
  SELECT
    tenant_id, id, 1,
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
    FROM public.tenant_marketing_connectors
   WHERE tenant_id = _tenant_id
  ON CONFLICT (tenant_id, connector_id, version) DO NOTHING;

  INSERT INTO public.tenant_tracking_connectors (
    tenant_id, provider_key, provider_identifier, enabled, consent_category,
    availability_state, configuration_version, event_binding_version
  )
  SELECT _tenant_id, provider.provider_key, NULL, false,
         provider.consent_category, 'unconfigured', 1, 1
    FROM (VALUES
      ('META_PIXEL','MARKETING'),
      ('GOOGLE_ANALYTICS','ANALYTICS'),
      ('GOOGLE_TAG_MANAGER','ANALYTICS')
    ) AS provider(provider_key, consent_category)
  ON CONFLICT (tenant_id, provider_key) DO NOTHING;

  INSERT INTO public.tenant_tracking_connector_versions (
    tenant_id, connector_id, version, provider_identifier, enabled,
    consent_category, availability_state, created_by
  )
  SELECT tenant_id, id, configuration_version, provider_identifier, enabled,
         consent_category, availability_state, NULL
    FROM public.tenant_tracking_connectors
   WHERE tenant_id = _tenant_id
  ON CONFLICT (tenant_id, connector_id, version) DO NOTHING;

  INSERT INTO public.tenant_tracking_event_bindings (
    tenant_id, connector_id, event_key, enabled, binding_version, created_by
  )
  SELECT connector.tenant_id, connector.id, event.event_key,
         event.event_key = 'page_view', connector.event_binding_version, NULL
    FROM public.tenant_tracking_connectors connector
    CROSS JOIN (VALUES
      ('page_view'),('view_property'),('search_properties'),('filter_properties'),
      ('submit_public_form'),('lead_created'),('contact_click'),('phone_click'),
      ('whatsapp_click'),('email_click'),('campaign_view'),('conversion_confirmed')
    ) AS event(event_key)
   WHERE connector.tenant_id = _tenant_id
  ON CONFLICT (tenant_id, connector_id, event_key) DO NOTHING;

  INSERT INTO public.tenant_tracking_consent_configuration (
    tenant_id, schema_version, notice_enabled, analytics_mode,
    marketing_mode, policy_revision, row_version
  ) VALUES (_tenant_id, 1, true, 'opt_in', 'opt_in', 1, 1)
  ON CONFLICT (tenant_id) DO NOTHING;

  IF (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id = _tenant_id AND key = 'configuration') <> 1
     OR (SELECT count(*) FROM public.crm_pipeline_stages WHERE tenant_id = _tenant_id AND pipeline_id = v_pipeline_id) <> 7
     OR (SELECT count(*) FROM public.tenant_marketing_connectors WHERE tenant_id = _tenant_id) <> 4
     OR (SELECT count(*) FROM public.tenant_marketing_connector_versions WHERE tenant_id = _tenant_id) <> 4
     OR (SELECT count(*) FROM public.tenant_marketing_field_mappings WHERE tenant_id = _tenant_id AND is_current) <> 4
     OR (SELECT count(*) FROM public.tenant_tracking_connectors WHERE tenant_id = _tenant_id) <> 3
     OR (SELECT count(*) FROM public.tenant_tracking_connector_versions WHERE tenant_id = _tenant_id) <> 3
     OR (SELECT count(*) FROM public.tenant_tracking_event_bindings WHERE tenant_id = _tenant_id) <> 36
     OR (SELECT count(*) FROM public.tenant_tracking_consent_configuration WHERE tenant_id = _tenant_id) <> 1 THEN
    RAISE EXCEPTION 'product_baseline_postflight_failed' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'tenantId', _tenant_id,
    'configuration', 1,
    'crmStages', 7,
    'marketingConnectors', 4,
    'trackingConnectors', 3,
    'trackingBindings', 36,
    'idempotent', true
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.provision_authorized_tenant_product_baselines(
  _tenant_ids uuid[],
  _manifest_sha256 text,
  _owner_authorization text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  v_actual_hash text;
  v_tenant_id uuid;
BEGIN
  IF cardinality(_tenant_ids) IS NULL OR cardinality(_tenant_ids) NOT BETWEEN 1 AND 1000
     OR array_position(_tenant_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'product_baseline_exact_manifest_required' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) <> count(DISTINCT id) FROM unnest(_tenant_ids) AS manifest(id)) THEN
    RAISE EXCEPTION 'product_baseline_manifest_duplicate_tenant_id' USING ERRCODE = '22023';
  END IF;
  IF _owner_authorization IS NULL OR _owner_authorization !~ '^PCA-[0-9A-Z_-]{3,120}$' THEN
    RAISE EXCEPTION 'product_baseline_owner_authorization_required' USING ERRCODE = '42501';
  END IF;

  SELECT encode(digest(string_agg(id::text, ',' ORDER BY id::text), 'sha256'), 'hex')
    INTO v_actual_hash
    FROM unnest(_tenant_ids) AS manifest(id);
  IF lower(_manifest_sha256) IS DISTINCT FROM v_actual_hash THEN
    RAISE EXCEPTION 'product_baseline_manifest_sha256_mismatch' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(_tenant_ids) AS manifest(id)
    LEFT JOIN public.tenants tenant ON tenant.id = manifest.id
    WHERE tenant.id IS NULL
  ) THEN
    RAISE EXCEPTION 'product_baseline_manifest_tenant_not_found' USING ERRCODE = '22023';
  END IF;

  FOR v_tenant_id IN SELECT id FROM unnest(_tenant_ids) AS manifest(id) ORDER BY id
  LOOP
    PERFORM public.provision_tenant_product_baseline(v_tenant_id);
  END LOOP;

  RETURN jsonb_build_object(
    'authorization', _owner_authorization,
    'manifestSha256', v_actual_hash,
    'tenantCount', cardinality(_tenant_ids),
    'completed', true
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.provision_new_tenant_product_baseline()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
BEGIN
  PERFORM public.provision_tenant_product_baseline(NEW.id);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_provision_new_tenant_product_baseline ON public.tenants;
CREATE TRIGGER trg_provision_new_tenant_product_baseline
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.provision_new_tenant_product_baseline();

REVOKE ALL ON FUNCTION public.provision_tenant_product_baseline(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.provision_authorized_tenant_product_baselines(uuid[],text,text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_new_tenant_product_baseline()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_authorized_tenant_product_baselines(uuid[],text,text) TO service_role;

COMMIT;
