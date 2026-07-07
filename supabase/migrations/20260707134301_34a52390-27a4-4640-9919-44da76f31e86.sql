-- M2b — Tenant RLS Policies Hardening (IA-003 §12.3 Opção A)
-- Remove `OR is_super_admin()` bypass de todas as policies RESTRICTIVE tenant_isolation.
-- Ajusta get_current_tenant_id() para retornar NULL quando super_admin não está impersonando.
-- Fecha cobertura de form_submissions (INSERT/UPDATE) preservando escrita pública anônima.

-- ============================================================================
-- 1) get_current_tenant_id: Opção A — super_admin sem impersonação → NULL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tenant uuid;
  v_header text;
BEGIN
  -- Anonymous path: only respect x-tenant-id header (public form endpoints, feeds)
  IF v_uid IS NULL THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Super Admin path: ONLY the impersonation header resolves a tenant.
  -- No default fallback (Opção A — IA-003 §12.3).
  IF public.is_super_admin() THEN
    BEGIN
      v_header := current_setting('request.headers', true)::jsonb ->> 'x-tenant-id';
      IF v_header IS NOT NULL AND v_header <> '' THEN
        RETURN v_header::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    RETURN NULL;
  END IF;

  -- Regular authenticated user: resolve via membership (default → owner → oldest)
  SELECT tenant_id INTO v_tenant
    FROM public.tenant_members
   WHERE user_id = v_uid
   ORDER BY is_default DESC, is_owner DESC, joined_at ASC
   LIMIT 1;

  RETURN v_tenant;
END;
$function$;

-- ============================================================================
-- 2) Reescrever policies RESTRICTIVE tenant_isolation — sem OR is_super_admin()
-- ============================================================================

-- audit_log (tenant-scoped audit)
DROP POLICY IF EXISTS tenant_isolation ON public.audit_log;
CREATE POLICY tenant_isolation ON public.audit_log AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.bairros;
CREATE POLICY tenant_isolation ON public.bairros AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.blog_categorias;
CREATE POLICY tenant_isolation ON public.blog_categorias AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.blog_posts;
CREATE POLICY tenant_isolation ON public.blog_posts AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.cidades;
CREATE POLICY tenant_isolation ON public.cidades AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.cms_campaign_events;
CREATE POLICY tenant_isolation ON public.cms_campaign_events AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.cms_campaigns;
CREATE POLICY tenant_isolation ON public.cms_campaigns AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS cms_form_fields_tenant_isolation ON public.cms_form_fields;
CREATE POLICY cms_form_fields_tenant_isolation ON public.cms_form_fields AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS cms_forms_tenant_isolation ON public.cms_forms;
CREATE POLICY cms_forms_tenant_isolation ON public.cms_forms AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.cms_import_snapshots;
CREATE POLICY tenant_isolation_restrictive ON public.cms_import_snapshots AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.corretores;
CREATE POLICY tenant_isolation ON public.corretores AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.deal_lost_reasons;
CREATE POLICY tenant_isolation_restrictive ON public.deal_lost_reasons AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.imoveis;
CREATE POLICY tenant_isolation ON public.imoveis AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.imovel_imagens;
CREATE POLICY tenant_isolation ON public.imovel_imagens AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.imovel_portais;
CREATE POLICY tenant_isolation_restrictive ON public.imovel_portais AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.instagram_posts;
CREATE POLICY tenant_isolation ON public.instagram_posts AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_amenities;
CREATE POLICY tenant_isolation ON public.launch_amenities AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_payment_conditions;
CREATE POLICY tenant_isolation ON public.launch_payment_conditions AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_pdfs;
CREATE POLICY tenant_isolation ON public.launch_pdfs AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_project_amenities;
CREATE POLICY tenant_isolation ON public.launch_project_amenities AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_project_imagens;
CREATE POLICY tenant_isolation ON public.launch_project_imagens AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_projects;
CREATE POLICY tenant_isolation ON public.launch_projects AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_statuses;
CREATE POLICY tenant_isolation ON public.launch_statuses AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.launch_units;
CREATE POLICY tenant_isolation ON public.launch_units AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.lead_atividades;
CREATE POLICY tenant_isolation ON public.lead_atividades AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.lead_descartes;
CREATE POLICY tenant_isolation ON public.lead_descartes AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.lead_discard_reasons;
CREATE POLICY tenant_isolation_restrictive ON public.lead_discard_reasons AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.lead_origens;
CREATE POLICY tenant_isolation ON public.lead_origens AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.lead_perdas;
CREATE POLICY tenant_isolation_restrictive ON public.lead_perdas AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.leads;
CREATE POLICY tenant_isolation ON public.leads AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS media_library_tenant_isolation ON public.media_library;
CREATE POLICY media_library_tenant_isolation ON public.media_library AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS media_usage_tenant_isolation ON public.media_usage;
CREATE POLICY media_usage_tenant_isolation ON public.media_usage AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.portal_connectors;
CREATE POLICY tenant_isolation_restrictive ON public.portal_connectors AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.portal_sync_dlq;
CREATE POLICY tenant_isolation_restrictive ON public.portal_sync_dlq AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_restrictive ON public.portal_sync_logs;
CREATE POLICY tenant_isolation_restrictive ON public.portal_sync_logs AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.site_settings;
CREATE POLICY tenant_isolation ON public.site_settings AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.team_members;
CREATE POLICY tenant_isolation ON public.team_members AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.teams;
CREATE POLICY tenant_isolation ON public.teams AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

-- ============================================================================
-- 3) form_submissions — cobertura completa RESTRICTIVE (SELECT/INSERT/UPDATE/DELETE)
--    INSERT/UPDATE preservam escrita pública anônima via join com cms_forms.published.
-- ============================================================================
DROP POLICY IF EXISTS form_submissions_tenant_isolation ON public.form_submissions;
DROP POLICY IF EXISTS form_submissions_tenant_isolation_del ON public.form_submissions;
DROP POLICY IF EXISTS form_submissions_tenant_isolation_ins ON public.form_submissions;
DROP POLICY IF EXISTS form_submissions_tenant_isolation_upd ON public.form_submissions;

CREATE POLICY form_submissions_tenant_isolation ON public.form_submissions AS RESTRICTIVE
  FOR SELECT TO anon, authenticated
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY form_submissions_tenant_isolation_del ON public.form_submissions AS RESTRICTIVE
  FOR DELETE TO anon, authenticated
  USING (tenant_id = get_current_tenant_id());

-- INSERT: aceita quando o tenant do form publicado bate com o tenant_id enviado
-- (mesma predicate do PERMISSIVE público) OR quando é o tenant efetivo do caller.
CREATE POLICY form_submissions_tenant_isolation_ins ON public.form_submissions AS RESTRICTIVE
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    tenant_id IS NOT NULL AND (
      tenant_id = get_current_tenant_id()
      OR EXISTS (
        SELECT 1 FROM public.cms_forms f
        WHERE f.id = form_submissions.form_id
          AND f.status = 'published'
          AND f.tenant_id = form_submissions.tenant_id
      )
    )
  );

CREATE POLICY form_submissions_tenant_isolation_upd ON public.form_submissions AS RESTRICTIVE
  FOR UPDATE TO anon, authenticated
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());