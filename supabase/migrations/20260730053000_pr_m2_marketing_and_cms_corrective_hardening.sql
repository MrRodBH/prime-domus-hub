-- PR-M2 consolidated corrective — provider adapters and CMS scheduling hardening.
BEGIN;

ALTER TABLE public.tenant_marketing_connectors
  ADD COLUMN IF NOT EXISTS ingestion_actor_user_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS ingestion_actor_origin text;

ALTER TABLE public.tenant_marketing_connectors
  DROP CONSTRAINT IF EXISTS tenant_marketing_ingestion_actor_contract;
ALTER TABLE public.tenant_marketing_connectors
  ADD CONSTRAINT tenant_marketing_ingestion_actor_contract CHECK (
    channel_key NOT IN ('META_ADS','GOOGLE_ADS')
    OR (
      (ingestion_actor_user_id IS NULL AND ingestion_actor_origin IS NULL AND active = false)
      OR (
        ingestion_actor_user_id IS NOT NULL
        AND ingestion_actor_origin IN ('impersonation','selection','single-membership')
      )
    )
  );

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
  v_next_configuration integer;
  v_availability text;
  v_verification text;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(
    _actor_user_id,_tenant_id,_tenant_origin,'gerenciar'
  );
  IF jsonb_typeof(_config) <> 'object' THEN
    RAISE EXCEPTION 'marketing_config_invalid' USING ERRCODE = '22023';
  END IF;
  IF public.marketing_config_contains_secret(_config) THEN
    RAISE EXCEPTION 'marketing_inline_secret_prohibited' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(_config) key
    WHERE key NOT IN (
      'channelKey','operationMode','configurationVersion','providerAccountReference',
      'providerFormReference','credentialReference','mappingVersion'
    )
  ) THEN
    RAISE EXCEPTION 'marketing_config_unknown_field' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_marketing_connector_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'marketing_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF _config->>'channelKey' IS DISTINCT FROM v_connector.channel_key
     OR _config->>'operationMode' <> 'HYBRID'
     OR COALESCE((_config->>'configurationVersion')::integer,0) <> 1
     OR COALESCE((_config->>'mappingVersion')::integer,0) <> v_connector.mapping_version THEN
    RAISE EXCEPTION 'marketing_config_invalid' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(COALESCE(_config->>'providerAccountReference','')),'')
       IS DISTINCT FROM NULLIF(btrim(COALESCE(_provider_account_reference,'')),'')
     OR NULLIF(btrim(COALESCE(_config->>'providerFormReference','')),'')
       IS DISTINCT FROM NULLIF(btrim(COALESCE(_provider_form_reference,'')),'') THEN
    RAISE EXCEPTION 'marketing_config_reference_mismatch' USING ERRCODE = '22023';
  END IF;
  IF (_config->>'credentialReference') IS DISTINCT FROM v_connector.credential_reference THEN
    RAISE EXCEPTION 'marketing_credential_reference_requires_versioned_operation' USING ERRCODE = '22023';
  END IF;
  IF v_connector.channel_key IN ('META_ADS','GOOGLE_ADS')
     AND NULLIF(btrim(COALESCE(_provider_account_reference,'')),'') IS NULL THEN
    RAISE EXCEPTION 'marketing_provider_account_required' USING ERRCODE = '22023';
  END IF;
  IF v_connector.channel_key IN ('MANUAL_IMPORT','WEBSITE_FORM')
     AND (_config->>'credentialReference') IS NOT NULL THEN
    RAISE EXCEPTION 'marketing_credential_not_allowed' USING ERRCODE = '22023';
  END IF;

  v_next_configuration := v_connector.configuration_version + 1;
  IF v_connector.channel_key IN ('META_ADS','GOOGLE_ADS') THEN
    v_availability := CASE
      WHEN v_connector.credential_reference IS NULL THEN 'credential_required'
      WHEN v_connector.verification_state = 'verified' THEN 'automated_ready'
      ELSE 'verification_pending'
    END;
    v_verification := CASE
      WHEN v_connector.credential_reference IS NULL THEN 'not_live_verified'
      ELSE v_connector.verification_state
    END;
  ELSIF v_connector.channel_key = 'MANUAL_IMPORT' THEN
    v_availability := 'manual_ready';
    v_verification := 'not_required';
  ELSE
    v_availability := 'automated_ready';
    v_verification := 'not_required';
  END IF;

  UPDATE public.tenant_marketing_connectors
  SET config = _config,
      provider_account_reference = NULLIF(btrim(_provider_account_reference),''),
      provider_form_reference = NULLIF(btrim(_provider_form_reference),''),
      configuration_version = v_next_configuration,
      availability_state = v_availability,
      verification_state = v_verification,
      ingestion_actor_user_id = CASE
        WHEN channel_key IN ('META_ADS','GOOGLE_ADS') THEN _actor_user_id
        ELSE ingestion_actor_user_id
      END,
      ingestion_actor_origin = CASE
        WHEN channel_key IN ('META_ADS','GOOGLE_ADS') THEN _tenant_origin
        ELSE ingestion_actor_origin
      END,
      active = CASE
        WHEN channel_key IN ('META_ADS','GOOGLE_ADS') THEN false
        ELSE active
      END,
      row_version = row_version + 1,
      updated_at = now(),
      last_error_code = NULL
  WHERE id = _connector_id AND tenant_id = _tenant_id
  RETURNING * INTO v_connector;

  INSERT INTO public.tenant_marketing_connector_versions (
    tenant_id,connector_id,version,config,provider_account_reference,
    provider_form_reference,availability_state,created_by
  ) VALUES (
    _tenant_id,_connector_id,v_next_configuration,_config,
    v_connector.provider_account_reference,v_connector.provider_form_reference,
    v_connector.availability_state,_actor_user_id
  );

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (
    _tenant_id,_actor_user_id,'marketing.connector_saved',
    'tenant_marketing_connector',_connector_id,
    jsonb_build_object(
      'channel_key',v_connector.channel_key,
      'configuration_version',v_connector.configuration_version,
      'mapping_version',v_connector.mapping_version,
      'availability_state',v_connector.availability_state,
      'verification_state',v_connector.verification_state,
      'adapter_version',v_connector.adapter_version,
      'credential_reference_configured',v_connector.credential_reference IS NOT NULL,
      'ingestion_actor_configured',v_connector.ingestion_actor_user_id IS NOT NULL,
      'row_version',v_connector.row_version
    )
  );

  RETURN jsonb_build_object(
    'id',v_connector.id,
    'channelKey',v_connector.channel_key,
    'configurationVersion',v_connector.configuration_version,
    'availabilityState',v_connector.availability_state,
    'verificationState',v_connector.verification_state,
    'adapterVersion',v_connector.adapter_version,
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
DECLARE
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_mapping_count integer;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(
    _actor_user_id,_tenant_id,_tenant_origin,'gerenciar'
  );
  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_marketing_connector_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'marketing_revision_conflict' USING ERRCODE = '40001';
  END IF;
  SELECT count(*) INTO v_mapping_count
  FROM public.tenant_marketing_field_mappings
  WHERE tenant_id = _tenant_id
    AND connector_id = _connector_id
    AND is_current
    AND version = v_connector.mapping_version;
  IF v_mapping_count <> 1 THEN
    RAISE EXCEPTION 'marketing_mapping_required' USING ERRCODE = '22023';
  END IF;

  IF _active AND v_connector.channel_key IN ('META_ADS','GOOGLE_ADS') THEN
    IF v_connector.adapter_version IS NULL OR v_connector.provider_contract_version IS NULL THEN
      RAISE EXCEPTION 'marketing_adapter_contract_missing' USING ERRCODE = '22023';
    END IF;
    IF v_connector.credential_reference IS NULL THEN
      RAISE EXCEPTION 'marketing_credential_required' USING ERRCODE = '22023';
    END IF;
    IF v_connector.verification_state <> 'verified' THEN
      RAISE EXCEPTION 'marketing_provider_not_verified' USING ERRCODE = '22023';
    END IF;
    IF v_connector.ingestion_actor_user_id IS NULL
       OR v_connector.ingestion_actor_origin IS NULL THEN
      RAISE EXCEPTION 'marketing_ingestion_actor_required' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.tenant_marketing_connectors
  SET active = _active,
      availability_state = CASE
        WHEN NOT _active AND channel_key IN ('META_ADS','GOOGLE_ADS')
          THEN CASE WHEN credential_reference IS NULL THEN 'credential_required' ELSE 'configured' END
        WHEN _active AND channel_key IN ('META_ADS','GOOGLE_ADS') THEN 'automated_ready'
        ELSE availability_state
      END,
      row_version = row_version + 1,
      updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id
  RETURNING * INTO v_connector;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (
    _tenant_id,_actor_user_id,'marketing.connector_state',
    'tenant_marketing_connector',_connector_id,
    jsonb_build_object(
      'active',v_connector.active,
      'channel_key',v_connector.channel_key,
      'availability_state',v_connector.availability_state,
      'row_version',v_connector.row_version
    )
  );
  RETURN jsonb_build_object(
    'id',v_connector.id,
    'active',v_connector.active,
    'availabilityState',v_connector.availability_state,
    'rowVersion',v_connector.row_version
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.record_tenant_marketing_adapter_verification(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _connector_id uuid,
  _expected_row_version bigint,
  _verification_success boolean,
  _fixture_only boolean,
  _error_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_connector public.tenant_marketing_connectors%ROWTYPE;
BEGIN
  PERFORM public.assert_tenant_marketing_authority(
    _actor_user_id,_tenant_id,_tenant_origin,'gerenciar'
  );
  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = _connector_id AND tenant_id = _tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_marketing_connector_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_connector.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'marketing_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF v_connector.channel_key NOT IN ('META_ADS','GOOGLE_ADS')
     OR v_connector.adapter_version IS NULL THEN
    RAISE EXCEPTION 'marketing_adapter_verification_not_applicable' USING ERRCODE = '22023';
  END IF;

  UPDATE public.tenant_marketing_connectors
  SET verification_state = CASE
        WHEN _fixture_only THEN 'not_live_verified'
        WHEN _verification_success THEN 'verified'
        ELSE 'verification_failed'
      END,
      availability_state = CASE
        WHEN _fixture_only THEN CASE
          WHEN credential_reference IS NULL THEN 'credential_required'
          ELSE 'verification_pending'
        END
        WHEN _verification_success THEN CASE
          WHEN credential_reference IS NULL THEN 'credential_required'
          ELSE 'configured'
        END
        ELSE 'failed'
      END,
      active = false,
      last_fixture_verified_at = CASE WHEN _fixture_only AND _verification_success THEN now() ELSE last_fixture_verified_at END,
      last_verified_at = CASE WHEN NOT _fixture_only AND _verification_success THEN now() ELSE last_verified_at END,
      last_error_code = CASE WHEN _verification_success THEN NULL ELSE NULLIF(left(_error_code,200),'') END,
      row_version = row_version + 1,
      updated_at = now()
  WHERE id = _connector_id AND tenant_id = _tenant_id
  RETURNING * INTO v_connector;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (
    _tenant_id,_actor_user_id,'marketing.adapter_verification',
    'tenant_marketing_connector',_connector_id,
    jsonb_build_object(
      'channel_key',v_connector.channel_key,
      'fixture_only',_fixture_only,
      'success',_verification_success,
      'verification_state',v_connector.verification_state,
      'availability_state',v_connector.availability_state,
      'external_provider_executed',false,
      'row_version',v_connector.row_version
    )
  );
  RETURN jsonb_build_object(
    'id',v_connector.id,
    'verificationState',v_connector.verification_state,
    'availabilityState',v_connector.availability_state,
    'active',v_connector.active,
    'rowVersion',v_connector.row_version,
    'externalProviderExecuted',false
  );
END;
$fn$;

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
  IF NULLIF(btrim(_provider_payload_id),'') IS NULL
     OR length(_provider_payload_id) > 300 THEN
    RAISE EXCEPTION 'marketing_provider_payload_id_invalid' USING ERRCODE = '22023';
  END IF;
  IF _payload_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'marketing_payload_hash_invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(_payload_sanitized) <> 'object'
     OR public.marketing_config_contains_secret(_payload_sanitized) THEN
    RAISE EXCEPTION 'marketing_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF _payload_schema_version <> 1 THEN
    RAISE EXCEPTION 'marketing_payload_schema_unknown' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = _connector_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tenant_marketing_connector_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_connector.channel_key NOT IN ('META_ADS','GOOGLE_ADS') THEN
    RAISE EXCEPTION 'marketing_provider_endpoint_not_applicable' USING ERRCODE = '22023';
  END IF;
  IF v_connector.adapter_version IS NULL
     OR v_connector.provider_contract_version IS NULL THEN
    RAISE EXCEPTION 'marketing_adapter_contract_missing' USING ERRCODE = '22023';
  END IF;
  IF v_connector.active IS NOT TRUE
     OR v_connector.availability_state <> 'automated_ready'
     OR v_connector.verification_state <> 'verified'
     OR v_connector.credential_reference IS NULL
     OR v_connector.ingestion_actor_user_id IS NULL
     OR v_connector.ingestion_actor_origin IS NULL THEN
    RAISE EXCEPTION 'marketing_adapter_not_ready' USING ERRCODE = '22023';
  END IF;
  SELECT count(*) INTO v_mapping_count
  FROM public.tenant_marketing_field_mappings
  WHERE tenant_id = v_connector.tenant_id
    AND connector_id = v_connector.id
    AND is_current
    AND version = v_connector.mapping_version;
  IF v_mapping_count <> 1 THEN
    RAISE EXCEPTION 'marketing_mapping_required' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(_connector_id::text || ':' || _provider_payload_id,0)
  );
  SELECT * INTO v_event
  FROM public.tenant_marketing_ingestion_events
  WHERE connector_id = _connector_id
    AND provider_payload_id = _provider_payload_id
  FOR UPDATE;
  IF FOUND THEN
    IF v_event.payload_hash <> _payload_hash THEN
      RAISE EXCEPTION 'marketing_payload_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'eventId',v_event.id,
      'tenantId',v_event.tenant_id,
      'state',v_event.ingestion_state,
      'rowVersion',v_event.row_version,
      'idempotentReplay',true
    );
  END IF;

  INSERT INTO public.tenant_marketing_ingestion_events (
    tenant_id,connector_id,channel_key,provider_payload_id,
    provider_account_reference,provider_form_reference,payload_schema_version,
    mapping_version,payload_hash,payload_sanitized,ingestion_state,retry_state
  ) VALUES (
    v_connector.tenant_id,v_connector.id,v_connector.channel_key,
    _provider_payload_id,v_connector.provider_account_reference,
    v_connector.provider_form_reference,_payload_schema_version,
    v_connector.mapping_version,_payload_hash,_payload_sanitized,
    'received','not_required'
  ) RETURNING * INTO v_event;

  INSERT INTO public.tenant_marketing_ingestion_attempts (
    tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
  ) VALUES (
    v_event.tenant_id,v_event.id,1,'verification','started',
    jsonb_build_object(
      'channel_key',v_event.channel_key,
      'provider_contract_version',v_connector.provider_contract_version
    )
  );
  RETURN jsonb_build_object(
    'eventId',v_event.id,
    'tenantId',v_event.tenant_id,
    'state',v_event.ingestion_state,
    'rowVersion',v_event.row_version,
    'idempotentReplay',false
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.ingest_verified_provider_marketing_lead(
  _event_id uuid,
  _expected_row_version bigint,
  _prepared jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_event public.tenant_marketing_ingestion_events%ROWTYPE;
  v_connector public.tenant_marketing_connectors%ROWTYPE;
  v_attribution jsonb;
  v_candidates uuid[];
  v_candidate_count integer;
  v_property_ids uuid[];
  v_property_count integer;
  v_property_id uuid;
  v_created jsonb;
  v_lead_id uuid;
  v_lead_version bigint;
  v_attempt integer;
BEGIN
  IF jsonb_typeof(_prepared) <> 'object'
     OR public.marketing_config_contains_secret(_prepared)
     OR _prepared ?| ARRAY[
       'tenantId','tenant_id','actorUserId','actor_user_id','assignedTo',
       'assigned_to','pipelineId','pipeline_id','stageId','stage_id'
     ]
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(_prepared) key
       WHERE key NOT IN (
         'name','email','phone','message','propertyReference','source',
         'attribution','normalizedEmail','normalizedPhone'
       )
     ) THEN
    RAISE EXCEPTION 'marketing_provider_prepared_payload_invalid' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(btrim(_prepared->>'name'),'') IS NULL
     OR jsonb_typeof(_prepared->'attribution') <> 'object' THEN
    RAISE EXCEPTION 'marketing_provider_prepared_payload_invalid' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_event
  FROM public.tenant_marketing_ingestion_events
  WHERE id = _event_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'marketing_ingestion_event_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_event.row_version <> _expected_row_version THEN
    RAISE EXCEPTION 'marketing_revision_conflict' USING ERRCODE = '40001';
  END IF;
  IF v_event.ingestion_state <> 'verified' THEN
    RAISE EXCEPTION 'marketing_ingestion_event_not_verified' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_connector
  FROM public.tenant_marketing_connectors
  WHERE id = v_event.connector_id
    AND tenant_id = v_event.tenant_id
  FOR SHARE;
  IF NOT FOUND
     OR v_connector.active IS NOT TRUE
     OR v_connector.availability_state <> 'automated_ready'
     OR v_connector.verification_state <> 'verified'
     OR v_connector.ingestion_actor_user_id IS NULL
     OR v_connector.ingestion_actor_origin IS NULL THEN
    RAISE EXCEPTION 'marketing_adapter_not_ready' USING ERRCODE = '22023';
  END IF;

  v_attribution := _prepared->'attribution';
  SELECT COALESCE(array_agg(id ORDER BY id),ARRAY[]::uuid[]),count(*)
    INTO v_candidates,v_candidate_count
  FROM public.leads
  WHERE tenant_id = v_event.tenant_id
    AND merge_state = 'active'
    AND (
      (NULLIF(_prepared->>'normalizedEmail','') IS NOT NULL
       AND normalized_email = _prepared->>'normalizedEmail')
      OR
      (NULLIF(_prepared->>'normalizedPhone','') IS NOT NULL
       AND normalized_phone = _prepared->>'normalizedPhone')
    );

  IF v_candidate_count > 0 THEN
    UPDATE public.tenant_marketing_ingestion_events
    SET ingestion_state = 'duplicate_detected',
        duplicate_candidate_ids = v_candidates,
        error_code = 'marketing_duplicate_detected',
        verified_at = COALESCE(verified_at,now()),
        row_version = row_version + 1,
        updated_at = now()
    WHERE id = v_event.id
    RETURNING * INTO v_event;

    SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
    FROM public.tenant_marketing_ingestion_attempts
    WHERE ingestion_event_id = v_event.id;
    INSERT INTO public.tenant_marketing_ingestion_attempts (
      tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
    ) VALUES (
      v_event.tenant_id,v_event.id,v_attempt,'ingestion','duplicate_detected',
      jsonb_build_object('candidate_count',v_candidate_count)
    );
    RETURN jsonb_build_object(
      'eventId',v_event.id,
      'state','duplicate_detected',
      'duplicateCandidateIds',v_candidates,
      'rowVersion',v_event.row_version,
      'externalProviderExecuted',false
    );
  END IF;

  v_property_id := NULL;
  IF NULLIF(_prepared->>'propertyReference','') IS NOT NULL THEN
    IF _prepared->>'propertyReference'
       ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]),count(*)
        INTO v_property_ids,v_property_count
      FROM public.imoveis
      WHERE tenant_id = v_event.tenant_id
        AND id = (_prepared->>'propertyReference')::uuid;
    ELSE
      SELECT COALESCE(array_agg(id),ARRAY[]::uuid[]),count(*)
        INTO v_property_ids,v_property_count
      FROM public.imoveis
      WHERE tenant_id = v_event.tenant_id
        AND codigo = _prepared->>'propertyReference';
    END IF;
    IF v_property_count <> 1 THEN
      RAISE EXCEPTION 'marketing_property_reference_ambiguous_or_missing'
        USING ERRCODE = '22023';
    END IF;
    v_property_id := v_property_ids[1];
  END IF;

  v_created := public.create_tenant_crm_lead(
    v_connector.ingestion_actor_user_id,
    v_event.tenant_id,
    v_connector.ingestion_actor_origin,
    _prepared->>'name',
    NULLIF(_prepared->>'email',''),
    NULLIF(_prepared->>'phone',''),
    v_property_id,
    NULLIF(_prepared->>'message',''),
    NULL,
    'provider-marketing:' || v_event.id::text
  );
  v_lead_id := (v_created->>'id')::uuid;

  UPDATE public.leads
  SET origem = COALESCE(
        NULLIF(_prepared->>'source',''),lower(v_connector.channel_key)
      ),
      original_attribution = v_attribution,
      latest_attribution = v_attribution,
      utm_source = NULLIF(v_attribution->>'utmSource',''),
      utm_medium = NULLIF(v_attribution->>'utmMedium',''),
      utm_campaign = NULLIF(v_attribution->>'utmCampaign',''),
      utm_content = NULLIF(v_attribution->>'utmContent',''),
      utm_term = NULLIF(v_attribution->>'utmTerm',''),
      gclid = NULLIF(v_attribution->>'gclid',''),
      fbclid = NULLIF(v_attribution->>'fbclid',''),
      landing_url = NULLIF(v_attribution->>'landingUrl',''),
      referrer = NULLIF(v_attribution->>'referrer',''),
      version = version + 1,
      updated_at = now()
  WHERE id = v_lead_id AND tenant_id = v_event.tenant_id
  RETURNING version INTO v_lead_version;
  IF v_lead_version IS NULL THEN
    RAISE EXCEPTION 'marketing_lead_attribution_update_failed' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.crm_lead_events (
    tenant_id,lead_id,actor_user_id,event_type,payload
  ) VALUES (
    v_event.tenant_id,v_lead_id,v_connector.ingestion_actor_user_id,
    'source_corrected',
    jsonb_build_object(
      'source','provider_marketing_ingestion',
      'connector_id',v_connector.id,
      'channel_key',v_connector.channel_key,
      'ingestion_event_id',v_event.id,
      'attribution',v_attribution,
      'version',v_lead_version
    )
  );

  UPDATE public.tenant_marketing_ingestion_events
  SET campaign_id = NULLIF(v_attribution->>'campaignId',''),
      campaign_name = NULLIF(v_attribution->>'campaignName',''),
      adset_id = NULLIF(v_attribution->>'adsetId',''),
      adset_name = NULLIF(v_attribution->>'adsetName',''),
      ad_id = NULLIF(v_attribution->>'adId',''),
      ad_name = NULLIF(v_attribution->>'adName',''),
      payload_sanitized = _prepared,
      verified_at = COALESCE(verified_at,now()),
      ingestion_state = 'lead_created',
      lead_id = v_lead_id,
      retry_state = 'not_required',
      error_code = NULL,
      row_version = row_version + 1,
      updated_at = now()
  WHERE id = v_event.id
  RETURNING * INTO v_event;

  SELECT COALESCE(max(attempt_number),0)+1 INTO v_attempt
  FROM public.tenant_marketing_ingestion_attempts
  WHERE ingestion_event_id = v_event.id;
  INSERT INTO public.tenant_marketing_ingestion_attempts (
    tenant_id,ingestion_event_id,attempt_number,attempt_kind,outcome,metadata
  ) VALUES (
    v_event.tenant_id,v_event.id,v_attempt,'ingestion','success',
    jsonb_build_object('lead_id',v_lead_id,'adapter_version',v_connector.adapter_version)
  );
  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (
    v_event.tenant_id,v_connector.ingestion_actor_user_id,
    'marketing.provider_lead_ingested','lead',v_lead_id,
    jsonb_build_object(
      'connector_id',v_connector.id,
      'channel_key',v_connector.channel_key,
      'ingestion_event_id',v_event.id,
      'lead_version',v_lead_version,
      'external_provider_execution_proved',false
    )
  );
  RETURN jsonb_build_object(
    'eventId',v_event.id,
    'state',v_event.ingestion_state,
    'leadId',v_lead_id,
    'leadVersion',v_lead_version,
    'rowVersion',v_event.row_version,
    'externalProviderExecuted',false,
    'externalDeliveryProved',false
  );
END;
$fn$;

-- Correct the scheduling predicate: cms_pages has draft_version_id and
-- published_version_id, not a generic current_version_id.
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
  v_version_count integer;
BEGIN
  IF _publish_at <= now() OR _publish_at > now() + interval '2 years' THEN
    RAISE EXCEPTION 'cms_schedule_invalid_time' USING ERRCODE = '22023';
  END IF;
  IF _timezone <> 'America/Sao_Paulo' THEN
    RAISE EXCEPTION 'cms_schedule_invalid_timezone' USING ERRCODE = '22023';
  END IF;
  IF _revision IS NULL OR _revision < 1
     OR length(_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'cms_schedule_invalid_input' USING ERRCODE = '22023';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id,_tenant_id,_tenant_origin,
    'cms.paginas','publicar'::public.rbac_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'cms_schedule_permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_version_count
  FROM public.cms_pages page
  JOIN public.cms_page_versions version
    ON version.id = _version_id
   AND version.tenant_id = page.tenant_id
   AND version.page_id = page.id
  WHERE page.tenant_id = _tenant_id
    AND page.id = _page_id
    AND page.draft_version_id = _version_id
    AND version.revision = _revision
    AND version.status = 'draft';
  IF v_version_count <> 1 THEN
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
      'scheduleId',v_existing.id::text,
      'state',v_existing.state,
      'publishAt',v_existing.publish_at,
      'idempotentReplay',true
    );
  END IF;

  INSERT INTO public.cms_publication_schedules (
    tenant_id,page_id,version_id,revision,publish_at,timezone,
    idempotency_key,created_by
  ) VALUES (
    _tenant_id,_page_id,_version_id,_revision,_publish_at,_timezone,
    _idempotency_key,_actor_user_id
  ) RETURNING id INTO v_schedule_id;

  INSERT INTO public.audit_log (tenant_id,user_id,action,entity,entity_id,after)
  VALUES (
    _tenant_id,_actor_user_id,'cms.publication.scheduled',
    'cms_publication_schedules',v_schedule_id::text,
    jsonb_build_object(
      'pageId',_page_id::text,
      'versionId',_version_id::text,
      'revision',_revision,
      'publishAt',_publish_at
    )
  );
  RETURN jsonb_build_object(
    'scheduleId',v_schedule_id::text,
    'state','scheduled',
    'publishAt',_publish_at,
    'idempotentReplay',false
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_tenant_marketing_adapter_verification(
  uuid,uuid,text,uuid,bigint,boolean,boolean,text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ingest_verified_provider_marketing_lead(
  uuid,bigint,jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_tenant_marketing_adapter_verification(
  uuid,uuid,text,uuid,bigint,boolean,boolean,text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.ingest_verified_provider_marketing_lead(
  uuid,bigint,jsonb
) TO service_role;

COMMIT;
