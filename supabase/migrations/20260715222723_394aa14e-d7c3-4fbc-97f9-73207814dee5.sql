-- LSH-01 — Lead Authorization & Audit Hardening
-- Aditiva sobre a baseline da LSO-01 (migration 20260715220034).

-- =========================================================================
-- 1) AUDIT TABLE HARDENING
-- =========================================================================

-- 1.1 Revogar DML direto (leituras e escritas) de todos os papéis.
REVOKE ALL ON TABLE public.lead_audit_events FROM PUBLIC;
REVOKE ALL ON TABLE public.lead_audit_events FROM anon;
REVOKE ALL ON TABLE public.lead_audit_events FROM authenticated;
REVOKE ALL ON TABLE public.lead_audit_events FROM service_role;

-- 1.2 Remover policies de acesso direto — leitura futura ocorrerá por
--     boundary server-side específico fora desta etapa.
DROP POLICY IF EXISTS lead_audit_events_select ON public.lead_audit_events;

-- RLS permanece habilitada (nega tudo por default sem policy).
ALTER TABLE public.lead_audit_events ENABLE ROW LEVEL SECURITY;

-- 1.3 Preservar audit trail — substituir ON DELETE CASCADE por ON DELETE RESTRICT.
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
    FROM pg_constraint
   WHERE conrelid = 'public.lead_audit_events'::regclass
     AND contype  = 'f'
     AND confrelid = 'public.leads'::regclass
   LIMIT 1;
  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lead_audit_events DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.lead_audit_events
  ADD CONSTRAINT lead_audit_events_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE RESTRICT;

-- 1.4 Remover DEFAULT autoritativo de tenant_id — toda escrita deve
--     informar tenant_id explicitamente.
ALTER TABLE public.lead_audit_events
  ALTER COLUMN tenant_id DROP DEFAULT;

-- 1.5 Restringir event_type ao conjunto suportado nesta etapa.
ALTER TABLE public.lead_audit_events
  DROP CONSTRAINT IF EXISTS lead_audit_events_event_type_check;
ALTER TABLE public.lead_audit_events
  ADD CONSTRAINT lead_audit_events_event_type_check
  CHECK (event_type IN ('manual_lead_created'));

-- =========================================================================
-- 2) RPC create_manual_lead — HARDENING
-- =========================================================================

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
SET search_path = 'public', 'pg_temp'
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
  v_nome        text;
  v_email       text;
  v_telefone    text;
  v_observacoes text;
BEGIN
  -- ---------------------------------------------------------------------
  -- 2.1 Auth
  -- ---------------------------------------------------------------------
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  -- ---------------------------------------------------------------------
  -- 2.2 Input validation (database-level)
  -- ---------------------------------------------------------------------
  v_nome        := btrim(COALESCE(p_nome, ''));
  v_email       := NULLIF(btrim(COALESCE(p_email, '')), '');
  v_telefone    := NULLIF(btrim(COALESCE(p_telefone, '')), '');
  v_observacoes := NULLIF(btrim(COALESCE(p_observacoes, '')), '');

  IF v_nome = '' OR char_length(v_nome) < 2 THEN
    RAISE EXCEPTION 'input_invalid: nome' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_nome) > 200 THEN
    RAISE EXCEPTION 'input_invalid: nome_max' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND char_length(v_email) > 320 THEN
    RAISE EXCEPTION 'input_invalid: email_max' USING ERRCODE = '22023';
  END IF;
  IF v_telefone IS NOT NULL AND char_length(v_telefone) > 40 THEN
    RAISE EXCEPTION 'input_invalid: telefone_max' USING ERRCODE = '22023';
  END IF;
  IF v_observacoes IS NOT NULL AND char_length(v_observacoes) > 2000 THEN
    RAISE EXCEPTION 'input_invalid: observacoes_max' USING ERRCODE = '22023';
  END IF;

  -- ---------------------------------------------------------------------
  -- 2.3 Tenant + membership ativa
  -- ---------------------------------------------------------------------
  v_tenant := public.get_current_tenant_id();
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

  -- ---------------------------------------------------------------------
  -- 2.4 Autorização funcional
  -- ---------------------------------------------------------------------
  v_is_admin    := public.has_role(v_actor, 'admin'::public.app_role);
  v_is_corretor := public.has_role(v_actor, 'corretor'::public.app_role);
  IF NOT (v_is_admin OR v_is_corretor) THEN
    RAISE EXCEPTION 'forbidden: lead.create_manual' USING ERRCODE = '42501';
  END IF;
  v_scope_tenant_wide := v_is_admin;

  -- ---------------------------------------------------------------------
  -- 2.5 Resolução do responsável
  -- ---------------------------------------------------------------------
  IF v_scope_tenant_wide THEN
    v_assigned := p_assigned_to;  -- pode ser NULL (unassigned)
  ELSE
    IF p_assigned_to IS NOT NULL AND p_assigned_to <> v_actor THEN
      RAISE EXCEPTION 'forbidden: assigned_to_cross_actor' USING ERRCODE = '42501';
    END IF;
    v_assigned := v_actor;
  END IF;

  IF v_assigned IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tenant_members tm
      WHERE tm.tenant_id = v_tenant
        AND tm.user_id   = v_assigned
        AND tm.membership_status = 'active'
    ) THEN
      RAISE EXCEPTION 'assigned_to_invalid_membership' USING ERRCODE = '42501';
    END IF;

    IF NOT (
      public.has_role(v_assigned, 'admin'::public.app_role)
      OR public.has_role(v_assigned, 'corretor'::public.app_role)
    ) THEN
      RAISE EXCEPTION 'assigned_to_not_eligible' USING ERRCODE = '42501';
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
    IF v_corretor_cnt = 0
       AND NOT public.has_role(v_assigned, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'corretor_registration_required' USING ERRCODE = '42501';
    END IF;
  ELSE
    v_corretor_id := NULL;
  END IF;

  -- ---------------------------------------------------------------------
  -- 2.6 Imóvel
  -- ---------------------------------------------------------------------
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

  -- ---------------------------------------------------------------------
  -- 2.7 INSERT lead + audit event (mesma transação)
  -- ---------------------------------------------------------------------
  INSERT INTO public.leads (
    tenant_id, nome, email, telefone, imovel_id, mensagem,
    origem, status, version, assigned_to, corretor_id,
    consent_lgpd, consent_at
  )
  VALUES (
    v_tenant, v_nome, v_email, v_telefone,
    p_imovel_id, v_observacoes,
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

-- 2.8 Grants explícitos da RPC.
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) TO authenticated;
