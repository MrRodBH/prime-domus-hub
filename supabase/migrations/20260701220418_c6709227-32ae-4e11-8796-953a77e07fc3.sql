
-- 1) Table
CREATE TABLE IF NOT EXISTS public.site_settings_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant_id() REFERENCES public.tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','published','archived')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings_versions TO authenticated;
GRANT ALL ON public.site_settings_versions TO service_role;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS ssv_tenant_key_created_idx
  ON public.site_settings_versions (tenant_id, key, created_at DESC);

-- Only one draft per (tenant, key)
CREATE UNIQUE INDEX IF NOT EXISTS ssv_one_draft_per_key
  ON public.site_settings_versions (tenant_id, key)
  WHERE status = 'draft';

-- 4) RLS
ALTER TABLE public.site_settings_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ssv_admin_gerente_read"
  ON public.site_settings_versions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin())
  );

CREATE POLICY "ssv_admin_gerente_write"
  ON public.site_settings_versions
  FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin())
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gerente') OR public.is_super_admin())
  );

-- 5) Tenant isolation RESTRICTIVE
CREATE POLICY "ssv_tenant_isolation"
  ON public.site_settings_versions
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());
