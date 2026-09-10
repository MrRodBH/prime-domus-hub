-- Company registration precedes the independent initial administrator milestone.
-- No existing tenant owner, identity, permission or commercial entitlement is changed.
BEGIN;
CREATE TABLE public.tenant_initial_admin_setup (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE RESTRICT,
  invitation_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  administrator_name text NOT NULL CHECK (length(administrator_name) BETWEEN 2 AND 160),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','existing_account','failed')),
  activated_user_id uuid REFERENCES auth.users(id),
  activated_at timestamptz,
  CHECK ((activated_at IS NULL) = (activated_user_id IS NULL))
);
ALTER TABLE public.tenant_initial_admin_setup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_initial_admin_setup FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_initial_admin_setup TO service_role;

CREATE FUNCTION public.register_setup_company(p_actor uuid, p_id uuid, p_name text, p_slug text, p_source text, p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
DECLARE t public.tenants%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.user_roles WHERE user_id=p_actor AND role='super_admin' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'setup_forbidden'; END IF;
  IF p_id IS NULL OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 2 AND 160
    OR p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(p_slug) NOT BETWEEN 2 AND 63
    OR p_source IS NULL OR p_source NOT IN ('direct_sale','sales_platform')
    OR (p_source='sales_platform' AND coalesce(length(btrim(p_reference)),0) NOT BETWEEN 1 AND 200)
  THEN RAISE EXCEPTION 'setup_invalid'; END IF;
  SELECT * INTO t FROM public.tenants WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
    IF t.metadata->'initial_setup'->>'registered_by' IS DISTINCT FROM p_actor::text
      OR t.slug IS DISTINCT FROM p_slug THEN RAISE EXCEPTION 'setup_conflict'; END IF;
    RETURN jsonb_build_object('tenantId',t.id,'name',t.nome);
  END IF;
  -- Owner remains unassigned for a new company. Activation never claims ownership.
  INSERT INTO public.tenants(id,slug,nome,status,operational_kind,metadata)
    VALUES(p_id,p_slug,btrim(p_name),'trial','customer',jsonb_build_object('initial_setup',
      jsonb_build_object('registered_by',p_actor,'source',p_source,'reference',nullif(btrim(p_reference),''))))
    RETURNING * INTO t;
  RETURN jsonb_build_object('tenantId',t.id,'name',t.nome);
END $$;

CREATE FUNCTION public.prepare_initial_admin(p_actor uuid,p_tenant uuid,p_name text,p_email text,p_expected uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE t public.tenants%ROWTYPE; s public.tenant_initial_admin_setup%ROWTYPE; u auth.users%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.user_roles WHERE user_id=p_actor AND role='super_admin' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'setup_forbidden'; END IF;
  SELECT * INTO t FROM public.tenants WHERE id=p_tenant AND operational_kind='customer' AND status IN ('trial','ativo') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'setup_forbidden'; END IF;
  IF t.metadata->'company_profile' IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.commercial_plans WHERE code=t.plano_codigo AND status='active')
  THEN RAISE EXCEPTION 'setup_company_incomplete'; END IF;
  IF p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 2 AND 160 OR p_email IS NULL
    OR length(p_email) NOT BETWEEN 3 AND 254 OR p_email <> lower(btrim(p_email)) OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN RAISE EXCEPTION 'setup_invalid'; END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_members m WHERE m.tenant_id=p_tenant
    AND m.tenant_role IN ('owner','admin')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=m.user_id AND r.role='super_admin'))
  THEN RAISE EXCEPTION 'setup_already_operational'; END IF;
  SELECT * INTO s FROM public.tenant_initial_admin_setup WHERE tenant_id=p_tenant FOR UPDATE;
  IF s.activated_at IS NOT NULL THEN RAISE EXCEPTION 'setup_already_activated'; END IF;
  IF s.invitation_id IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'setup_conflict'; END IF;
  IF s.requested_at > now()-interval '60 seconds' THEN RAISE EXCEPTION 'setup_retry_later'; END IF;
  IF (SELECT count(*) FROM auth.users WHERE lower(email)=p_email)>1 THEN RAISE EXCEPTION 'setup_identity_ambiguous'; END IF;
  SELECT * INTO u FROM auth.users WHERE lower(email)=p_email;
  IF u.id IS NOT NULL AND (EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=u.id AND role='super_admin')
    OR EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id=p_tenant AND user_id=u.id)
    OR t.owner_user_id=u.id) THEN RAISE EXCEPTION 'setup_identity_ineligible'; END IF;
  INSERT INTO public.tenant_initial_admin_setup(tenant_id,administrator_name,email,requested_by)
    VALUES(p_tenant,btrim(p_name),p_email,p_actor)
    ON CONFLICT (tenant_id) DO UPDATE SET invitation_id=gen_random_uuid(),administrator_name=excluded.administrator_name,
      email=excluded.email,requested_by=p_actor,requested_at=now(),expires_at=now()+interval '7 days',delivery_status='pending'
    RETURNING * INTO s;
  RETURN jsonb_build_object('invitationId',s.invitation_id,'existingConfirmedAccount',u.email_confirmed_at IS NOT NULL);
END $$;

CREATE FUNCTION public.activate_initial_admin(p_actor uuid,p_invitation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.tenant_initial_admin_setup%ROWTYPE; t public.tenants%ROWTYPE; u auth.users%ROWTYPE; tid uuid; admin_profile uuid;
BEGIN
  SELECT tenant_id INTO tid FROM public.tenant_initial_admin_setup WHERE invitation_id=p_invitation;
  -- Same lock order as invitation preparation and existing membership mutations.
  SELECT * INTO t FROM public.tenants WHERE id=tid AND operational_kind='customer' AND status IN ('trial','ativo') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'setup_invitation_invalid'; END IF;
  SELECT * INTO s FROM public.tenant_initial_admin_setup WHERE tenant_id=tid FOR UPDATE;
  SELECT * INTO u FROM auth.users WHERE id=p_actor;
  IF u.id IS NULL OR u.email_confirmed_at IS NULL OR lower(u.email) IS DISTINCT FROM s.email
    OR s.invitation_id IS DISTINCT FROM p_invitation
    OR EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role='super_admin')
  THEN RAISE EXCEPTION 'setup_invitation_invalid'; END IF;
  IF s.activated_at IS NOT NULL THEN
    IF s.activated_user_id=p_actor AND EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id=tid
      AND user_id=p_actor AND tenant_role='admin' AND membership_status='active' AND NOT is_owner)
    THEN RETURN jsonb_build_object('tenantId',tid,'activated',true); END IF;
    RAISE EXCEPTION 'setup_already_activated';
  END IF;
  IF s.expires_at<=now() THEN RAISE EXCEPTION 'setup_invitation_expired'; END IF;
  IF t.metadata->'company_profile' IS NULL OR NOT EXISTS
    (SELECT 1 FROM public.commercial_plans WHERE code=t.plano_codigo AND status='active')
  THEN RAISE EXCEPTION 'setup_company_incomplete'; END IF;
  IF t.owner_user_id=p_actor OR EXISTS(SELECT 1 FROM public.tenant_members WHERE tenant_id=tid AND user_id=p_actor)
    OR EXISTS (SELECT 1 FROM public.tenant_members m WHERE m.tenant_id=tid
      AND m.tenant_role IN ('owner','admin')
      AND NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=m.user_id AND r.role='super_admin'))
  THEN RAISE EXCEPTION 'setup_already_operational'; END IF;
  SELECT id INTO admin_profile FROM public.rbac_profiles WHERE sistema=true AND tenant_id IS NULL AND codigo='admin';
  IF admin_profile IS NULL THEN RAISE EXCEPTION 'setup_admin_profile_unavailable'; END IF;
  -- Foundational first administrator only. Ordinary invitations and seat enforcement are unchanged.
  INSERT INTO public.tenant_members(tenant_id,user_id,tenant_role,membership_status,is_owner,is_default,invited_at,accepted_at)
    VALUES(tid,p_actor,'admin','active',false,false,s.requested_at,now());
  INSERT INTO public.user_profiles(tenant_id,user_id,profile_id) VALUES(tid,p_actor,admin_profile);
  UPDATE public.tenant_initial_admin_setup SET activated_at=now(),activated_user_id=p_actor WHERE tenant_id=tid;
  RETURN jsonb_build_object('tenantId',tid,'activated',true);
END $$;
REVOKE ALL ON FUNCTION public.register_setup_company(uuid,uuid,text,text,text,text),
  public.prepare_initial_admin(uuid,uuid,text,text,uuid),public.activate_initial_admin(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_setup_company(uuid,uuid,text,text,text,text),
  public.prepare_initial_admin(uuid,uuid,text,text,uuid),public.activate_initial_admin(uuid,uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
