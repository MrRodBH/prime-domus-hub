-- LSH-01 · Lote B — Canonical Impersonation Closure (aditiva).
-- Substitui apenas o corpo de public.create_manual_lead para tornar a
-- evidência de impersonação semanticamente canônica: Super Admin com
-- x-tenant-id em UUID válido que coincide com o tenant resolvido pela
-- função canônica get_current_tenant_id. Nenhum outro contrato é alterado.

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
  v_actor              uuid := auth.uid();
  v_tenant             uuid;
  v_header_raw         text;
  v_header_tenant      uuid;
  v_is_super_admin     boolean := false;
  v_is_impersonating   boolean := false;
  v_is_admin           boolean := false;
  v_is_corretor        boolean := false;
  v_scope_tenant_wide  boolean := false;
  v_scope              text;
  v_mem_cnt            int;
  v_assigned           uuid;
  v_assigned_mem_cnt   int;
  v_assigned_is_admin  boolean;
  v_assigned_is_corretor boolean;
  v_corretor_id        uuid;
  v_corretor_cnt       int;
  v_imovel_ok          boolean;
  v_lead               public.leads%ROWTYPE;
  v_nome               text;
  v_email              text;
  v_telefone           text;
  v_observacoes        text;
BEGIN
  -- 1) Auth
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  -- 2) Input validation (DB-authoritative)
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

  -- 3) Canonical Super Admin detection.
  v_is_super_admin := public.is_super_admin();

  -- 3.1) Parse x-tenant-id header fail-closed.
  BEGIN
    v_header_raw := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
  EXCEPTION WHEN OTHERS THEN
    v_header_raw := NULL;
  END;

  v_header_tenant := NULL;
  IF v_header_raw IS NOT NULL AND btrim(v_header_raw) <> '' THEN
    BEGIN
      v_header_tenant := btrim(v_header_raw)::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_header_tenant := NULL;
    END;
  END IF;

  -- 4) Tenant resolution — canonical function (mirrors requireTenant).
  v_tenant := public.get_current_tenant_id();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_not_resolved' USING ERRCODE = '42501';
  END IF;

  -- 5) Canonical impersonation evidence.
  --   impersonating = super_admin ∧ header UUID válido ∧ header = tenant resolvido.
  --   Header presence alone (or a forged header from a regular user) is NOT
  --   authoritative.
  v_is_impersonating :=
       v_is_super_admin
   AND v_header_tenant IS NOT NULL
   AND v_header_tenant = v_tenant;

  -- 5.1) Super Admin sem impersonação canônica é bloqueado.
  IF v_is_super_admin AND NOT v_is_impersonating THEN
    RAISE EXCEPTION 'super_admin_requires_impersonation' USING ERRCODE = '42501';
  END IF;

  -- 6) Membership cardinality — regular users only.
  IF v_is_super_admin THEN
    -- Super Admin impersonating: authority derives from impersonation, not
    -- from a common tenant_members row.
    v_scope_tenant_wide := true;
    v_scope             := 'tenant_wide';
  ELSE
    SELECT COUNT(*)
      INTO v_mem_cnt
      FROM public.tenant_members tm
     WHERE tm.tenant_id = v_tenant
       AND tm.user_id   = v_actor
       AND tm.membership_status = 'active';

    IF v_mem_cnt = 0 THEN
      RAISE EXCEPTION 'membership_required' USING ERRCODE = '42501';
    ELSIF v_mem_cnt > 1 THEN
      RAISE EXCEPTION 'membership_cardinality_conflict' USING ERRCODE = 'P0001';
    END IF;

    -- 6.1) Functional authorization (admin | corretor).
    v_is_admin    := public.has_role(v_actor, 'admin'::public.app_role);
    v_is_corretor := public.has_role(v_actor, 'corretor'::public.app_role);
    IF NOT (v_is_admin OR v_is_corretor) THEN
      RAISE EXCEPTION 'forbidden: lead.create_manual' USING ERRCODE = '42501';
    END IF;
    v_scope_tenant_wide := v_is_admin;
    v_scope := CASE WHEN v_scope_tenant_wide THEN 'tenant_wide' ELSE 'own_assigned' END;
  END IF;

  -- 7) Assignee resolution.
  IF v_scope_tenant_wide THEN
    v_assigned := p_assigned_to;
  ELSE
    IF p_assigned_to IS NOT NULL AND p_assigned_to <> v_actor THEN
      RAISE EXCEPTION 'forbidden: assigned_to_cross_actor' USING ERRCODE = '42501';
    END IF;
    v_assigned := v_actor;
  END IF;

  IF v_assigned IS NOT NULL THEN
    -- 7.1 Explicit membership cardinality for the assignee.
    SELECT COUNT(*)
      INTO v_assigned_mem_cnt
      FROM public.tenant_members tm
     WHERE tm.tenant_id = v_tenant
       AND tm.user_id   = v_assigned
       AND tm.membership_status = 'active';

    IF v_assigned_mem_cnt = 0 THEN
      RAISE EXCEPTION 'assigned_to_invalid_membership' USING ERRCODE = '42501';
    ELSIF v_assigned_mem_cnt > 1 THEN
      RAISE EXCEPTION 'assigned_to_membership_conflict' USING ERRCODE = 'P0001';
    END IF;

    v_assigned_is_admin    := public.has_role(v_assigned, 'admin'::public.app_role);
    v_assigned_is_corretor := public.has_role(v_assigned, 'corretor'::public.app_role);
    IF NOT (v_assigned_is_admin OR v_assigned_is_corretor) THEN
      RAISE EXCEPTION 'assigned_to_not_eligible' USING ERRCODE = '42501';
    END IF;

    -- 7.2 Corretor registration cardinality — no MIN() heuristic.
    SELECT COUNT(*)
      INTO v_corretor_cnt
      FROM public.corretores c
     WHERE c.tenant_id = v_tenant
       AND c.user_id   = v_assigned
       AND c.ativo     = true;

    IF v_corretor_cnt > 1 THEN
      RAISE EXCEPTION 'corretor_cardinality_conflict' USING ERRCODE = 'P0001';
    ELSIF v_corretor_cnt = 1 THEN
      SELECT c.id
        INTO v_corretor_id
        FROM public.corretores c
       WHERE c.tenant_id = v_tenant
         AND c.user_id   = v_assigned
         AND c.ativo     = true;
    ELSE
      IF NOT v_assigned_is_admin THEN
        RAISE EXCEPTION 'corretor_registration_required' USING ERRCODE = '42501';
      END IF;
      v_corretor_id := NULL;
    END IF;
  ELSE
    v_corretor_id := NULL;
  END IF;

  -- 8) Property scoping (existence + tenant + active).
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

  -- 9) INSERT lead + audit event atomically.
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
      'assigned_to',            v_assigned,
      'corretor_id',            v_corretor_id,
      'imovel_id',              p_imovel_id,
      'scope',                  v_scope,
      'actor_is_super_admin',   v_is_super_admin,
      'impersonation_active',   v_is_impersonating
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

-- Reassert explicit RPC grants (posture preserved).
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.create_manual_lead(text,text,text,uuid,text,uuid) TO authenticated;
