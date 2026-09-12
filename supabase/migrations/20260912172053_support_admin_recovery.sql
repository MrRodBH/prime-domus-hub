-- Narrow support operation: no account, membership, RLS or CMS changes.
BEGIN;
CREATE SCHEMA support_recovery_private;
REVOKE ALL ON SCHEMA support_recovery_private FROM PUBLIC,anon,authenticated;
CREATE TABLE support_recovery_private.requests (
  id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth.users(id),
  session_id uuid NOT NULL, case_id uuid NOT NULL REFERENCES public.platform_support_cases(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id), target_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), outcome text CHECK(outcome IN ('accepted','failed','unknown'))
);
ALTER TABLE support_recovery_private.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_recovery_private.requests FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX recovery_target_cooldown ON support_recovery_private.requests(target_id,created_at);
CREATE INDEX recovery_actor_cooldown ON support_recovery_private.requests(actor_id,created_at);
CREATE FUNCTION public.reserve_support_admin_recovery(
  p_actor uuid, p_session uuid, p_case uuid, p_email text, p_request uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $fn$
DECLARE c public.platform_support_cases%ROWTYPE; v_target uuid; target_email text;
  prior support_recovery_private.requests%ROWTYPE;
BEGIN
  PERFORM public.assert_global_super_admin(p_actor);
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_actor AND deleted_at IS NULL
    AND email_confirmed_at IS NOT NULL AND (banned_until IS NULL OR banned_until<=now())) THEN
    RAISE EXCEPTION 'recovery_actor_ineligible' USING ERRCODE='42501'; END IF;
  IF p_session IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.sessions WHERE id=p_session AND user_id=p_actor
      AND (not_after IS NULL OR not_after>now())
  ) THEN RAISE EXCEPTION 'recovery_session_invalid' USING ERRCODE='42501'; END IF;
  IF p_request IS NULL OR p_email IS NULL OR length(p_email)>254 THEN
    RAISE EXCEPTION 'recovery_input_invalid' USING ERRCODE='22023'; END IF;
  -- Serializes per operator and per target, including requests through other cases.
  PERFORM pg_advisory_xact_lock(hashtextextended('support-recovery-actor:'||p_actor::text,0));
  SELECT * INTO c FROM public.platform_support_cases WHERE id=p_case FOR SHARE;
  IF NOT FOUND OR c.tenant_id IS NULL OR c.category<>'access'
     OR c.status IN ('closed','resolved') OR NULLIF(btrim(c.requester_reference),'') IS NULL THEN
    RAISE EXCEPTION 'recovery_case_ineligible' USING ERRCODE='22023'; END IF;
  BEGIN
  SELECT u.id,u.email INTO STRICT v_target,target_email
    FROM public.tenant_members m JOIN auth.users u ON u.id=m.user_id
    JOIN public.tenants t ON t.id=m.tenant_id
    WHERE m.tenant_id=c.tenant_id AND m.tenant_role='admin' AND m.membership_status='active'
      AND NOT m.is_owner AND lower(u.email)=lower(btrim(p_email))
      AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
      AND (u.banned_until IS NULL OR u.banned_until<=now())
      AND t.operational_kind='customer' AND t.status IN ('ativo','trial')
      AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='super_admin');
  EXCEPTION WHEN no_data_found OR too_many_rows THEN
    RAISE EXCEPTION 'recovery_target_ineligible' USING ERRCODE='42501';
  END;
  PERFORM pg_advisory_xact_lock(hashtextextended('support-recovery-target:'||v_target::text,0));
  SELECT * INTO prior FROM support_recovery_private.requests WHERE id=p_request;
  IF FOUND THEN
    IF prior.actor_id<>p_actor OR prior.case_id<>p_case OR prior.target_id<>v_target THEN
      RAISE EXCEPTION 'recovery_request_conflict' USING ERRCODE='22023'; END IF;
    RETURN jsonb_build_object('send',false);
  END IF;
  IF EXISTS(SELECT 1 FROM support_recovery_private.requests WHERE requests.target_id=v_target AND created_at>now()-interval '5 minutes')
    OR (SELECT count(*) FROM support_recovery_private.requests WHERE actor_id=p_actor AND created_at>now()-interval '1 hour')>=10 THEN
    RAISE EXCEPTION 'recovery_rate_limited' USING ERRCODE='22023'; END IF;
  INSERT INTO support_recovery_private.requests(id,actor_id,session_id,case_id,tenant_id,target_id)
    VALUES(p_request,p_actor,p_session,p_case,c.tenant_id,v_target);
  INSERT INTO public.audit_log(id,user_id,tenant_id,action,entity,entity_id,after)
    VALUES(p_request,p_actor,c.tenant_id,'platform.support.recovery.requested','platform_support_cases',p_case::text,
      jsonb_build_object('targetUserId',v_target));
  -- Internal service-only response. Never forward email or IDs to the browser.
  RETURN jsonb_build_object('send',true,'email',target_email);
END; $fn$;
REVOKE ALL ON FUNCTION public.reserve_support_admin_recovery(uuid,uuid,uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_support_admin_recovery(uuid,uuid,uuid,text,uuid) TO service_role;

CREATE FUNCTION public.finish_support_admin_recovery(p_actor uuid,p_request uuid,p_outcome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $fn$
DECLARE a support_recovery_private.requests%ROWTYPE;
BEGIN
  PERFORM public.assert_global_super_admin(p_actor);
  IF p_outcome IS NULL OR p_outcome NOT IN ('accepted','failed','unknown') THEN
    RAISE EXCEPTION 'recovery_outcome_invalid' USING ERRCODE='22023'; END IF;
  SELECT * INTO a FROM support_recovery_private.requests WHERE id=p_request AND actor_id=p_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'recovery_request_missing' USING ERRCODE='22023'; END IF;
  IF a.outcome IS NOT NULL THEN RETURN; END IF;
  UPDATE support_recovery_private.requests SET outcome=p_outcome WHERE id=p_request;
  INSERT INTO public.audit_log(user_id,tenant_id,action,entity,entity_id,after)
    VALUES(p_actor,a.tenant_id,'platform.support.recovery.result.'||p_outcome,'platform_support_cases',a.case_id::text,
      jsonb_build_object('requestId',p_request));
END; $fn$;
REVOKE ALL ON FUNCTION public.finish_support_admin_recovery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_support_admin_recovery(uuid,uuid,text) TO service_role;
COMMIT;
