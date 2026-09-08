-- Round 52: persistent administrative records. No billing/provider activation.
-- Only the canonical server can supply the authenticated actor.
BEGIN;
-- Global commercial records cannot be attributed to an arbitrary tenant.
CREATE TABLE public.commercial_plan_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.commercial_plans(id),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commercial_plan_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.commercial_plan_audit FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.commercial_plan_audit TO service_role;
CREATE OR REPLACE FUNCTION public.save_super_onboarding_plan(p_actor uuid, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  old_row public.commercial_plans%ROWTYPE;
  plan_id uuid := (p_data->>'id')::uuid;
  expected timestamptz := (p_data->>'expectedUpdatedAt')::timestamptz;
  details jsonb;
BEGIN
  PERFORM 1 FROM public.user_roles WHERE user_id=p_actor AND role='super_admin' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'onboarding_forbidden'; END IF;
  IF jsonb_typeof(p_data) <> 'object' OR p_data->>'code' !~ '^[a-z][a-z0-9_]{1,63}$'
     OR length(coalesce(p_data->>'name','')) NOT BETWEEN 1 AND 200
     OR p_data->>'status' NOT IN ('draft','active','archived')
     OR jsonb_typeof(p_data->'features') <> 'array'
     OR (p_data->>'monthlyPriceCents')::bigint NOT BETWEEN 0 AND 100000000
     OR (p_data->>'propertyLimit')::integer NOT BETWEEN 0 AND 1000000
  THEN RAISE EXCEPTION 'onboarding_invalid'; END IF;
  details := jsonb_build_object('monthlyPriceCents',p_data->'monthlyPriceCents',
    'propertyLimit',p_data->'propertyLimit','features',p_data->'features',
    'portal',p_data->>'portal','productId',p_data->>'productId');
  SELECT * INTO old_row FROM public.commercial_plans WHERE id=plan_id FOR UPDATE;
  IF FOUND THEN
    IF expected IS NULL OR old_row.updated_at IS DISTINCT FROM expected OR old_row.code <> p_data->>'code'
    THEN RAISE EXCEPTION 'onboarding_conflict'; END IF;
    UPDATE public.commercial_plans SET name=p_data->>'name',description=p_data->>'description',
      status=p_data->>'status',metadata=coalesce(metadata,'{}') || jsonb_build_object('onboarding',details),
      updated_at=clock_timestamp() WHERE id=plan_id;
  ELSE
    IF expected IS NOT NULL THEN RAISE EXCEPTION 'onboarding_conflict'; END IF;
    INSERT INTO public.commercial_plans(id,code,name,description,status,metadata)
    VALUES(plan_id,p_data->>'code',p_data->>'name',p_data->>'description',p_data->>'status',jsonb_build_object('onboarding',details));
  END IF;
  INSERT INTO public.commercial_plan_audit(actor_user_id,action,plan_id,changes)
    VALUES(p_actor,'super_onboarding_plan_saved',plan_id,jsonb_build_object('code',p_data->>'code','status',p_data->>'status'));
  RETURN jsonb_build_object('saved',true);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'onboarding_conflict';
END $$;
REVOKE ALL ON FUNCTION public.save_super_onboarding_plan(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_super_onboarding_plan(uuid,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.save_super_onboarding_company(p_actor uuid, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE
  old_row public.tenants%ROWTYPE;
  tenant_id uuid := (p_data->>'tenantId')::uuid;
  plan_code text;
  company jsonb := p_data->'company';
BEGIN
  PERFORM 1 FROM public.user_roles WHERE user_id=p_actor AND role='super_admin' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'onboarding_forbidden'; END IF;
  IF company IS NULL OR jsonb_typeof(company) <> 'object'
     OR length(coalesce(company->>'legalName','')) NOT BETWEEN 1 AND 200
     OR coalesce(company->>'cnpj','') !~ '^[A-Z0-9]{12}[0-9]{2}$'
     OR coalesce(company->>'cpf','') !~ '^[0-9]{11}$'
  THEN RAISE EXCEPTION 'onboarding_invalid'; END IF;
  -- Lock the selected plan before tenant; plan updates never acquire tenant locks.
  SELECT code INTO plan_code FROM public.commercial_plans WHERE id=(p_data->>'planId')::uuid AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'onboarding_plan_unavailable'; END IF;
  SELECT * INTO old_row FROM public.tenants WHERE id=tenant_id FOR UPDATE;
  IF NOT FOUND OR old_row.updated_at IS DISTINCT FROM (p_data->>'expectedUpdatedAt')::timestamptz
  THEN RAISE EXCEPTION 'onboarding_conflict'; END IF;
  UPDATE public.tenants SET nome=company->>'legalName',plano_codigo=plan_code,
    metadata=coalesce(metadata,'{}') || jsonb_build_object('company_profile',company), updated_at=clock_timestamp()
    WHERE id=tenant_id;
  -- Do not duplicate CPF/contact/address in logs. Business row and audit commit together.
  INSERT INTO public.audit_log(tenant_id,user_id,action,entity,entity_id,after)
    VALUES(tenant_id,p_actor,'super_onboarding_company_saved','tenants',tenant_id::text,jsonb_build_object('planCode',plan_code,'profileUpdated',true));
  RETURN jsonb_build_object('saved',true);
END $$;
REVOKE ALL ON FUNCTION public.save_super_onboarding_company(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_super_onboarding_company(uuid,jsonb) TO service_role;
COMMIT;
