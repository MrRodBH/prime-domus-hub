-- PR-M2 consolidated corrective — global SaaS Control Plane records.
BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text NOT NULL UNIQUE CHECK (incident_key ~ '^INC-[0-9]{4}-[0-9]{4,}$'),
  scope text NOT NULL CHECK (scope IN ('global','tenant')),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  severity text NOT NULL CHECK (severity IN ('info','warning','major','critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','monitoring','resolved','closed')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 240),
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 3 AND 4000),
  source text NOT NULL CHECK (source IN ('manual','release_gate','runtime_diagnostic','queue','webhook','provider','security_validation')),
  started_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((scope = 'global' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL)),
  CHECK ((status IN ('resolved','closed') AND resolved_at IS NOT NULL) OR (status NOT IN ('resolved','closed') AND resolved_at IS NULL))
);

CREATE TABLE IF NOT EXISTS public.platform_support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key text NOT NULL UNIQUE CHECK (case_key ~ '^SUP-[0-9]{4}-[0-9]{4,}$'),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  requester_reference text,
  category text NOT NULL CHECK (category IN ('access','configuration','crm','cms','portal','marketing','billing_visibility','domain_visibility','incident','other')),
  priority text NOT NULL CHECK (priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triage','in_progress','waiting_customer','resolved','closed')),
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 240),
  summary text NOT NULL CHECK (length(trim(summary)) BETWEEN 3 AND 4000),
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status IN ('resolved','closed') AND resolved_at IS NOT NULL) OR (status NOT IN ('resolved','closed') AND resolved_at IS NULL))
);

CREATE INDEX IF NOT EXISTS ix_platform_incidents_status
  ON public.platform_incidents (status, severity, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_platform_incidents_tenant
  ON public.platform_incidents (tenant_id, status, started_at DESC)
  WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_platform_support_cases_status
  ON public.platform_support_cases (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_platform_support_cases_tenant
  ON public.platform_support_cases (tenant_id, status, created_at DESC)
  WHERE tenant_id IS NOT NULL;

ALTER TABLE public.platform_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.platform_incidents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.platform_support_cases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.platform_incidents TO service_role;
GRANT ALL ON TABLE public.platform_support_cases TO service_role;

CREATE OR REPLACE FUNCTION public.assert_global_super_admin(_actor_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
BEGIN
  IF _actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _actor_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'global_super_admin_required' USING ERRCODE = '42501';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mutate_platform_incident(
  _actor_user_id uuid,
  _operation text,
  _incident_id uuid,
  _incident_key text,
  _scope text,
  _tenant_id uuid,
  _severity text,
  _status text,
  _title text,
  _summary text,
  _source text
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_row public.platform_incidents%ROWTYPE;
BEGIN
  PERFORM public.assert_global_super_admin(_actor_user_id);
  IF _operation NOT IN ('create','update') THEN
    RAISE EXCEPTION 'platform_incident_operation_invalid' USING ERRCODE = '22023';
  END IF;
  IF _scope NOT IN ('global','tenant')
     OR _severity NOT IN ('info','warning','major','critical')
     OR _status NOT IN ('open','investigating','monitoring','resolved','closed')
     OR _source NOT IN ('manual','release_gate','runtime_diagnostic','queue','webhook','provider','security_validation') THEN
    RAISE EXCEPTION 'platform_incident_input_invalid' USING ERRCODE = '22023';
  END IF;
  IF (_scope = 'global' AND _tenant_id IS NOT NULL)
     OR (_scope = 'tenant' AND (_tenant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id))) THEN
    RAISE EXCEPTION 'platform_incident_scope_invalid' USING ERRCODE = '22023';
  END IF;

  IF _operation = 'create' THEN
    INSERT INTO public.platform_incidents (
      incident_key,scope,tenant_id,severity,status,title,summary,source,
      resolved_at,created_by
    ) VALUES (
      _incident_key,_scope,_tenant_id,_severity,_status,btrim(_title),btrim(_summary),_source,
      CASE WHEN _status IN ('resolved','closed') THEN now() ELSE NULL END,_actor_user_id
    ) RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row FROM public.platform_incidents WHERE id = _incident_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'platform_incident_not_found' USING ERRCODE = '22023'; END IF;
    UPDATE public.platform_incidents
       SET scope = _scope,
           tenant_id = _tenant_id,
           severity = _severity,
           status = _status,
           title = btrim(_title),
           summary = btrim(_summary),
           source = _source,
           resolved_at = CASE WHEN _status IN ('resolved','closed') THEN COALESCE(resolved_at,now()) ELSE NULL END,
           updated_at = now()
     WHERE id = _incident_id
     RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.audit_log (user_id,tenant_id,action,entity,entity_id,after)
  VALUES (
    _actor_user_id,_tenant_id,'platform.incident.' || _operation,
    'platform_incidents',v_row.id::text,
    jsonb_build_object('incidentKey',v_row.incident_key,'status',v_row.status,'severity',v_row.severity,'scope',v_row.scope)
  );
  RETURN jsonb_build_object('id',v_row.id,'incidentKey',v_row.incident_key,'status',v_row.status,'severity',v_row.severity);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.mutate_platform_support_case(
  _actor_user_id uuid,
  _operation text,
  _case_id uuid,
  _case_key text,
  _tenant_id uuid,
  _requester_reference text,
  _category text,
  _priority text,
  _status text,
  _subject text,
  _summary text,
  _assigned_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_row public.platform_support_cases%ROWTYPE;
BEGIN
  PERFORM public.assert_global_super_admin(_actor_user_id);
  IF _operation NOT IN ('create','update')
     OR _category NOT IN ('access','configuration','crm','cms','portal','marketing','billing_visibility','domain_visibility','incident','other')
     OR _priority NOT IN ('low','normal','high','urgent')
     OR _status NOT IN ('open','triage','in_progress','waiting_customer','resolved','closed') THEN
    RAISE EXCEPTION 'platform_support_input_invalid' USING ERRCODE = '22023';
  END IF;
  IF _tenant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id) THEN
    RAISE EXCEPTION 'platform_support_tenant_not_found' USING ERRCODE = '22023';
  END IF;
  IF _assigned_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _assigned_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'platform_support_assignee_invalid' USING ERRCODE = '22023';
  END IF;

  IF _operation = 'create' THEN
    INSERT INTO public.platform_support_cases (
      case_key,tenant_id,requester_reference,category,priority,status,
      subject,summary,assigned_user_id,created_by,resolved_at
    ) VALUES (
      _case_key,_tenant_id,NULLIF(btrim(_requester_reference),''),_category,_priority,_status,
      btrim(_subject),btrim(_summary),_assigned_user_id,_actor_user_id,
      CASE WHEN _status IN ('resolved','closed') THEN now() ELSE NULL END
    ) RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row FROM public.platform_support_cases WHERE id = _case_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'platform_support_case_not_found' USING ERRCODE = '22023'; END IF;
    UPDATE public.platform_support_cases
       SET tenant_id = _tenant_id,
           requester_reference = NULLIF(btrim(_requester_reference),''),
           category = _category,
           priority = _priority,
           status = _status,
           subject = btrim(_subject),
           summary = btrim(_summary),
           assigned_user_id = _assigned_user_id,
           resolved_at = CASE WHEN _status IN ('resolved','closed') THEN COALESCE(resolved_at,now()) ELSE NULL END,
           updated_at = now()
     WHERE id = _case_id
     RETURNING * INTO v_row;
  END IF;

  INSERT INTO public.audit_log (user_id,tenant_id,action,entity,entity_id,after)
  VALUES (
    _actor_user_id,_tenant_id,'platform.support.' || _operation,
    'platform_support_cases',v_row.id::text,
    jsonb_build_object('caseKey',v_row.case_key,'status',v_row.status,'priority',v_row.priority,'category',v_row.category)
  );
  RETURN jsonb_build_object('id',v_row.id,'caseKey',v_row.case_key,'status',v_row.status,'priority',v_row.priority);
END;
$fn$;

REVOKE ALL ON FUNCTION public.assert_global_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_platform_incident(uuid,text,uuid,text,text,uuid,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mutate_platform_support_case(uuid,text,uuid,text,uuid,text,text,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_global_super_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_platform_incident(uuid,text,uuid,text,text,uuid,text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mutate_platform_support_case(uuid,text,uuid,text,uuid,text,text,text,text,text,text,uuid) TO service_role;

COMMIT;
