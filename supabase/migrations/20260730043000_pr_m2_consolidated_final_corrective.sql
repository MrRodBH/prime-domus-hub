-- PR-M2 — Consolidated Final Corrective
-- Upload target provenance, CRM functional completion models and service-role-only boundaries.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing tenant entities become valid composite FK targets without changing their primary keys.
CREATE UNIQUE INDEX IF NOT EXISTS ux_imoveis_tenant_id_id
  ON public.imoveis (tenant_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_tenant_id_id
  ON public.leads (tenant_id, id);

-- ---------------------------------------------------------------------------
-- Server-issued upload-target provenance
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tenant_upload_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  domain text NOT NULL CHECK (domain IN (
    'imoveis',
    'lancamento-capa',
    'lancamento-galeria',
    'lancamento-pdf',
    'blog-cover',
    'blog-inline',
    'cms-page',
    'corretor-foto',
    'media',
    'crm-attachment'
  )),
  entity_id uuid,
  bucket text NOT NULL CHECK (bucket IN ('imoveis', 'lancamentos', 'site')),
  path text NOT NULL,
  storage_file_name text NOT NULL,
  mime_type text,
  size bigint CHECK (size IS NULL OR size >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_upload_targets_path_contract CHECK (
    length(path) BETWEEN 3 AND 512
    AND path !~ '(^|/)\.\.(/|$)'
    AND path !~ '^/'
  ),
  CONSTRAINT tenant_upload_targets_filename_contract CHECK (
    length(storage_file_name) BETWEEN 1 AND 180
    AND storage_file_name !~ '[/\\]'
    AND storage_file_name !~ '^\.'
  ),
  CONSTRAINT tenant_upload_targets_consumption_contract CHECK (
    (status = 'consumed' AND consumed_at IS NOT NULL)
    OR (status <> 'consumed' AND consumed_at IS NULL)
  ),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, bucket, path)
);

CREATE INDEX IF NOT EXISTS ix_tenant_upload_targets_pending
  ON public.tenant_upload_targets (tenant_id, actor_user_id, expires_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_tenant_upload_targets_entity
  ON public.tenant_upload_targets (tenant_id, domain, entity_id);

ALTER TABLE public.tenant_upload_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tenant_upload_targets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.tenant_upload_targets TO service_role;

CREATE OR REPLACE FUNCTION public.register_tenant_upload_target(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _domain text,
  _entity_id uuid,
  _bucket text,
  _path text,
  _storage_file_name text,
  _mime_type text,
  _size bigint,
  _expires_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_module text;
  v_target_id uuid;
  v_required_prefix text;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL THEN
    RAISE EXCEPTION 'upload_target_invalid_context' USING ERRCODE = '22023';
  END IF;
  IF _tenant_origin NOT IN ('impersonation', 'selection', 'single-membership') THEN
    RAISE EXCEPTION 'upload_target_invalid_origin' USING ERRCODE = '22023';
  END IF;
  IF _expires_at IS NULL OR _expires_at <= now() OR _expires_at > now() + interval '30 minutes' THEN
    RAISE EXCEPTION 'upload_target_invalid_expiry' USING ERRCODE = '22023';
  END IF;
  IF _domain NOT IN (
    'imoveis','lancamento-capa','lancamento-galeria','lancamento-pdf',
    'blog-cover','blog-inline','cms-page','corretor-foto','media','crm-attachment'
  ) THEN
    RAISE EXCEPTION 'upload_target_invalid_domain' USING ERRCODE = '22023';
  END IF;

  v_module := CASE WHEN _domain = 'crm-attachment' THEN 'crm' ELSE 'cms.midias' END;
  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    v_module,
    'criar'::public.rbac_action
  );
  IF v_decision IS NULL OR (v_decision->>'allowed') IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'upload_target_permission_denied' USING ERRCODE = '42501';
  END IF;
  IF _domain <> 'crm-attachment' AND (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'upload_target_global_scope_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'upload_target_tenant_not_found' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _actor_user_id) THEN
    RAISE EXCEPTION 'upload_target_actor_not_found' USING ERRCODE = '22023';
  END IF;

  IF _domain = 'imoveis' THEN
    IF _entity_id IS NULL OR _bucket <> 'imoveis' THEN
      RAISE EXCEPTION 'upload_target_property_contract_invalid' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.imoveis
      WHERE tenant_id = _tenant_id AND id = _entity_id
    ) THEN
      RAISE EXCEPTION 'upload_target_property_not_found' USING ERRCODE = '22023';
    END IF;
    v_required_prefix := _tenant_id::text || '/' || _entity_id::text || '/';
  ELSIF _domain IN ('lancamento-capa','lancamento-galeria','lancamento-pdf') THEN
    IF _entity_id IS NULL OR _bucket <> 'lancamentos' THEN
      RAISE EXCEPTION 'upload_target_launch_contract_invalid' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.launch_projects
      WHERE tenant_id = _tenant_id AND id = _entity_id
    ) THEN
      RAISE EXCEPTION 'upload_target_launch_not_found' USING ERRCODE = '22023';
    END IF;
    v_required_prefix := _tenant_id::text || '/';
  ELSE
    IF _bucket <> 'site' THEN
      RAISE EXCEPTION 'upload_target_site_bucket_required' USING ERRCODE = '22023';
    END IF;
    v_required_prefix := _tenant_id::text || '/';
  END IF;

  IF _path IS NULL OR _path NOT LIKE v_required_prefix || '%' OR _path LIKE '%/../%' THEN
    RAISE EXCEPTION 'upload_target_path_not_server_scoped' USING ERRCODE = '22023';
  END IF;
  IF split_part(reverse(_path), '/', 1) IS DISTINCT FROM reverse(_storage_file_name) THEN
    RAISE EXCEPTION 'upload_target_filename_mismatch' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tenant_upload_targets (
    tenant_id, actor_user_id, domain, entity_id, bucket, path,
    storage_file_name, mime_type, size, expires_at
  ) VALUES (
    _tenant_id, _actor_user_id, _domain, _entity_id, _bucket, _path,
    _storage_file_name, NULLIF(trim(_mime_type), ''), _size, _expires_at
  )
  RETURNING id INTO v_target_id;

  RETURN jsonb_build_object(
    'targetId', v_target_id::text,
    'tenantId', _tenant_id::text,
    'domain', _domain,
    'entityId', _entity_id,
    'bucket', _bucket,
    'path', _path,
    'storageFileName', _storage_file_name,
    'expiresAt', _expires_at,
    'status', 'pending'
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.consume_tenant_property_upload_target(
  _actor_user_id uuid,
  _tenant_id uuid,
  _tenant_origin text,
  _target_id uuid,
  _property_id uuid,
  _alt text,
  _order integer
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $fn$
DECLARE
  v_decision jsonb;
  v_target public.tenant_upload_targets%ROWTYPE;
  v_image_id uuid;
BEGIN
  IF _actor_user_id IS NULL OR _tenant_id IS NULL OR _target_id IS NULL OR _property_id IS NULL THEN
    RAISE EXCEPTION 'upload_target_consume_invalid_context' USING ERRCODE = '22023';
  END IF;
  IF _order IS NULL OR _order < 0 OR _order > 10000 THEN
    RAISE EXCEPTION 'upload_target_invalid_order' USING ERRCODE = '22023';
  END IF;
  IF _alt IS NOT NULL AND length(_alt) > 300 THEN
    RAISE EXCEPTION 'upload_target_alt_too_long' USING ERRCODE = '22023';
  END IF;

  v_decision := public.resolve_tenant_permission(
    _actor_user_id,
    _tenant_id,
    _tenant_origin,
    'cms.midias',
    'editar'::public.rbac_action
  );
  IF v_decision IS NULL
     OR (v_decision->>'allowed') IS DISTINCT FROM 'true'
     OR (v_decision->>'scope') IS DISTINCT FROM 'global' THEN
    RAISE EXCEPTION 'upload_target_consume_permission_denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target
  FROM public.tenant_upload_targets
  WHERE tenant_id = _tenant_id AND id = _target_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'upload_target_not_found' USING ERRCODE = '22023';
  END IF;
  IF v_target.actor_user_id <> _actor_user_id THEN
    RAISE EXCEPTION 'upload_target_actor_mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_target.domain <> 'imoveis'
     OR v_target.entity_id IS DISTINCT FROM _property_id
     OR v_target.bucket <> 'imoveis' THEN
    RAISE EXCEPTION 'upload_target_property_mismatch' USING ERRCODE = '42501';
  END IF;
  IF v_target.status <> 'pending' THEN
    RAISE EXCEPTION 'upload_target_not_pending' USING ERRCODE = '22023';
  END IF;
  IF v_target.expires_at <= now() THEN
    UPDATE public.tenant_upload_targets
       SET status = 'expired', updated_at = now()
     WHERE id = v_target.id;
    RAISE EXCEPTION 'upload_target_expired' USING ERRCODE = '22023';
  END IF;
  IF v_target.path NOT LIKE _tenant_id::text || '/' || _property_id::text || '/%' THEN
    RAISE EXCEPTION 'upload_target_property_path_mismatch' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.imoveis
    WHERE tenant_id = _tenant_id AND id = _property_id
  ) THEN
    RAISE EXCEPTION 'upload_target_property_not_found' USING ERRCODE = '22023';
  END IF;

  -- Same-backend proof that the object exists at the exact server-issued target.
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = v_target.bucket AND name = v_target.path
  ) THEN
    RAISE EXCEPTION 'upload_target_object_not_found' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.imovel_imagens (tenant_id, imovel_id, url, alt, ordem)
  VALUES (_tenant_id, _property_id, v_target.path, NULLIF(trim(_alt), ''), _order)
  RETURNING id INTO v_image_id;

  UPDATE public.tenant_upload_targets
     SET status = 'consumed', consumed_at = now(), updated_at = now()
   WHERE id = v_target.id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'upload_target_concurrent_consumption' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.audit_log (tenant_id, user_id, action, entity, entity_id, after)
  VALUES (
    _tenant_id,
    _actor_user_id,
    'property.image.upload_target_consumed',
    'imovel_imagens',
    v_image_id::text,
    jsonb_build_object(
      'propertyId', _property_id::text,
      'uploadTargetId', v_target.id::text,
      'bucket', v_target.bucket,
      'path', v_target.path
    )
  );

  RETURN jsonb_build_object(
    'imageId', v_image_id::text,
    'uploadTargetId', v_target.id::text,
    'path', v_target.path,
    'status', 'consumed'
  );
END;
$fn$;

-- ---------------------------------------------------------------------------
-- CRM functional completion models
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 240),
  email text,
  phone text,
  normalized_email text,
  normalized_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','merged_review_required')),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_tenant_email
  ON public.crm_contacts (tenant_id, normalized_email)
  WHERE normalized_email IS NOT NULL AND status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS ux_crm_contacts_tenant_phone
  ON public.crm_contacts (tenant_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND status = 'active';

CREATE TABLE IF NOT EXISTS public.crm_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid,
  contact_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('follow_up','call','meeting','visit','proposal_review','other')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  notes text,
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, contact_id) REFERENCES public.crm_contacts(tenant_id, id) ON DELETE SET NULL,
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS public.crm_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  property_id uuid NOT NULL,
  calendar_event_id uuid,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  scheduled_at timestamptz NOT NULL,
  feedback text,
  feedback_recorded_at timestamptz,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.imoveis(tenant_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, calendar_event_id) REFERENCES public.crm_calendar_events(tenant_id, id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.crm_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  property_id uuid NOT NULL,
  amount numeric(16,2) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','cancelled')),
  valid_until date,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(terms) = 'object'),
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, property_id) REFERENCES public.imoveis(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.crm_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  upload_target_id uuid NOT NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 240),
  mime_type text,
  size bigint CHECK (size IS NULL OR size >= 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, upload_target_id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, upload_target_id) REFERENCES public.tenant_upload_targets(tenant_id, id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.crm_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_key text NOT NULL CHECK (rule_key IN (
    'new_lead_first_response_sla',
    'follow_up_overdue_alert',
    'visit_feedback_reminder',
    'proposal_expiry_alert',
    'inactive_lead_alert'
  )),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuration) = 'object'),
  active boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, rule_key),
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.crm_communication_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','sms')),
  template_key text NOT NULL CHECK (length(trim(template_key)) BETWEEN 1 AND 120),
  adapter_state text NOT NULL DEFAULT 'adapter_not_implemented' CHECK (adapter_state IN (
    'adapter_not_implemented','credential_provisioning_required','queued','processing',
    'dispatch_attempted','retry_scheduled','failed_terminal','cancelled'
  )),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 200),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.crm_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  policy_key text NOT NULL CHECK (policy_key IN ('first_response','follow_up','visit_feedback','proposal_review')),
  threshold_minutes integer NOT NULL CHECK (threshold_minutes BETWEEN 1 AND 525600),
  active boolean NOT NULL DEFAULT true,
  row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, policy_key),
  UNIQUE (tenant_id, id)
);

CREATE TABLE IF NOT EXISTS public.crm_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid,
  alert_key text NOT NULL CHECK (alert_key IN (
    'first_response_overdue','follow_up_overdue','visit_feedback_overdue',
    'proposal_review_overdue','proposal_expiring','inactive_lead'
  )),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  state text NOT NULL DEFAULT 'open' CHECK (state IN ('open','acknowledged','resolved','dismissed')),
  due_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, lead_id) REFERENCES public.leads(tenant_id, id) ON DELETE CASCADE
);

DO $rls$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'crm_contacts','crm_calendar_events','crm_visits','crm_proposals','crm_attachments',
    'crm_automation_rules','crm_communication_jobs','crm_sla_policies','crm_alerts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', v_table);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', v_table);
  END LOOP;
END;
$rls$;

REVOKE ALL ON FUNCTION public.register_tenant_upload_target(
  uuid,uuid,text,text,uuid,text,text,text,text,bigint,timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_tenant_property_upload_target(
  uuid,uuid,text,uuid,uuid,text,integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_tenant_upload_target(
  uuid,uuid,text,text,uuid,text,text,text,text,bigint,timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_tenant_property_upload_target(
  uuid,uuid,text,uuid,uuid,text,integer
) TO service_role;

COMMIT;
