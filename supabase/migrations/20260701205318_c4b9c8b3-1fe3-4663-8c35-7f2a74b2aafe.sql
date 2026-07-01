DO $$
DECLARE
  v_rm uuid := '9664d189-4a12-4caa-8243-dc73383447e6';
  t text;
  business_tables text[] := ARRAY[
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
  FOREACH t IN ARRAY business_tables LOOP
    -- 1. Add nullable column referencing tenants
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE RESTRICT',
      t
    );
    -- 2. Backfill existing rows to RM Prime
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_rm);
    -- 3. Enforce NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    -- 4. Default to current tenant on new inserts
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant_id()',
      t
    );
    -- 5. Index for tenant filtering
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
      t || '_tenant_id_idx', t
    );
  END LOOP;
END $$;

-- Composite indexes for hot paths (safe if columns exist)
CREATE INDEX IF NOT EXISTS leads_tenant_status_idx ON public.leads (tenant_id, status);
CREATE INDEX IF NOT EXISTS leads_tenant_created_idx ON public.leads (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS imoveis_tenant_status_idx ON public.imoveis (tenant_id, status);
CREATE INDEX IF NOT EXISTS imoveis_tenant_slug_idx ON public.imoveis (tenant_id, slug);
CREATE INDEX IF NOT EXISTS launch_projects_tenant_slug_idx ON public.launch_projects (tenant_id, slug);
CREATE INDEX IF NOT EXISTS blog_posts_tenant_slug_idx ON public.blog_posts (tenant_id, slug);
CREATE INDEX IF NOT EXISTS corretores_tenant_user_idx ON public.corretores (tenant_id, user_id);