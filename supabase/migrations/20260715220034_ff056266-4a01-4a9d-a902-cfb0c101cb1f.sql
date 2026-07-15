
-- LSO-01 — Lead Security & Workspace OCC (fix: coluna é membership_status)

CREATE TABLE IF NOT EXISTS public.lead_audit_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL DEFAULT get_current_tenant_id(),
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  event_type    text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_audit_events_tenant_lead
  ON public.lead_audit_events (tenant_id, lead_id, created_at DESC);

GRANT SELECT ON public.lead_audit_events TO authenticated;
GRANT ALL    ON public.lead_audit_events TO service_role;

ALTER TABLE public.lead_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_audit_events_select ON public.lead_audit_events;
CREATE POLICY lead_audit_events_select ON public.lead_audit_events
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = lead_audit_events.tenant_id
        AND tm.user_id  = auth.uid()
        AND tm.membership_status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.create_manual_lead(
  p_nome        text,
  p_email       text DEFAULT NULL,
  p_telefone    text DEFAULT NULL,
  p_imovel_id   uuid DEFAULT NULL,
  p_observacoes text DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor       uuid := auth.uid();
  v_tenant      uuid;
  v_is_admin    boolean;
  v_is_corretor boolean;
  v_scope_tenant_wide boolean;
  v_assigned    uuid;
  v_corretor_id uuid;
  v_corretor_cnt int;
  v_imovel_ok   boolean;
  v_lead        public.leads%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  v_tenant := get_current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_resolved' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = v_tenant
      AND tm.user_id   = v_actor
      AND tm.membership_status = 'active'
  ) THEN
    RAISE EXCEPTION 'membership_required' USING ERRCODE = '42501';
  END IF;

  v_is_admin    := public.has_role(v_actor, 'admin'::public.app_role);
  v_is_corretor := public.has_role(v_actor, 'corretor'::public.app_role);
  IF NOT (v_is_admin OR v_is_corretor) THEN
    RAISE EXCEPTION 'forbidden: lead.create_manual' USING ERRCODE = '42501';
  END IF;
  v_scope_tenant_wide := v_is_admin;

  IF v_scope_tenant_wide THEN
    v_assigned := COALESCE(p_assigned_to, v_actor);
  ELSE
    IF p_assigned_to IS NOT NULL AND p_assigned_to <> v_actor THEN
      RAISE EXCEPTION 'forbidden: assigned_to_cross_actor' USING ERRCODE = '42501';
    END IF;
    v_assigned := v_actor;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.tenant_id = v_tenant
      AND tm.user_id   = v_assigned
      AND tm.membership_status = 'active'
  ) THEN
    RAISE EXCEPTION 'assigned_to_invalid_membership' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*)::int, MIN(id)
    INTO v_corretor_cnt, v_corretor_id
  FROM public.corretores
  WHERE tenant_id = v_tenant
    AND user_id   = v_assigned
    AND ativo     = true;

  IF v_corretor_cnt > 1 THEN
    RAISE EXCEPTION 'corretor_cardinality_conflict' USING ERRCODE = 'P0001';
  END IF;
  IF v_corretor_cnt = 0 AND NOT v_scope_tenant_wide THEN
    RAISE EXCEPTION 'corretor_registration_required' USING ERRCODE = '42501';
  END IF;

  IF p_imovel_id IS NOT NULL THEN
    SELECT (i.status::text = 'ativo')
      INTO v_imovel_ok
    FROM public.imoveis i
    WHERE i.id = p_imovel_id
      AND i.tenant_id = v_tenant;
    IF v_imovel_ok IS NULL THEN
      RAISE EXCEPTION 'imovel_not_available' USING ERRCODE = '42501';
    END IF;
    IF NOT v_imovel_ok THEN
      RAISE EXCEPTION 'imovel_status_not_allowed' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.leads (
    tenant_id, nome, email, telefone, imovel_id, mensagem,
    origem, status, version, assigned_to, corretor_id,
    consent_lgpd, consent_at
  )
  VALUES (
    v_tenant, p_nome, NULLIF(p_email,''), NULLIF(p_telefone,''),
    p_imovel_id, NULLIF(p_observacoes,''),
    'Cadastro Manual', 'novo', 1, v_assigned, v_corretor_id,
    true, now()
  )
  RETURNING * INTO v_lead;

  INSERT INTO public.lead_audit_events (
    tenant_id, lead_id, actor_user_id, event_type, metadata
  )
  VALUES (
    v_tenant, v_lead.id, v_actor, 'manual_lead_created',
    jsonb_build_object(
      'assigned_to', v_assigned,
      'corretor_id', v_corretor_id,
      'imovel_id',   p_imovel_id,
      'scope',       CASE WHEN v_scope_tenant_wide THEN 'tenant_wide' ELSE 'own_assigned' END
    )
  );

  RETURN jsonb_build_object(
    'id',          v_lead.id,
    'tenantId',    v_lead.tenant_id,
    'status',      v_lead.status,
    'version',     v_lead.version,
    'assignedTo',  v_lead.assigned_to,
    'corretorId',  v_lead.corretor_id,
    'imovelId',    v_lead.imovel_id,
    'createdAt',   v_lead.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) TO authenticated;
