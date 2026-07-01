-- M2b: RESTRICTIVE tenant isolation policies em todas as tabelas de negócio.
-- RESTRICTIVE compõe (AND) com policies existentes — isolamento por tenant é obrigatório.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads','lead_atividades','lead_descartes','lead_origens',
    'imoveis','imovel_imagens',
    'launch_projects','launch_units','launch_amenities','launch_project_amenities',
    'launch_project_imagens','launch_payment_conditions','launch_pdfs','launch_statuses',
    'corretores','teams','team_members',
    'blog_posts','blog_categorias',
    'cidades','bairros',
    'instagram_posts','audit_log','site_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated, anon
        USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
        WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
    $f$, t);
  END LOOP;
END $$;