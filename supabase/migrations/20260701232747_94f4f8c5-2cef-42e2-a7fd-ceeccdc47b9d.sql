
CREATE TABLE public.cms_import_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT get_current_tenant_id(),
  motivo text NOT NULL,
  modo text NOT NULL CHECK (modo IN ('merge','replace')),
  escopo jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload jsonb NOT NULL,
  contagem jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  restored_at timestamptz,
  restored_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.cms_import_snapshots TO authenticated;
GRANT ALL ON public.cms_import_snapshots TO service_role;

ALTER TABLE public.cms_import_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cms_snap_tenant_read" ON public.cms_import_snapshots
  FOR SELECT TO authenticated
  USING ((user_belongs_to_tenant(tenant_id) OR is_super_admin())
         AND (has_role(auth.uid(),'admin'::app_role) OR is_super_admin()));

CREATE POLICY "cms_snap_admin_write" ON public.cms_import_snapshots
  FOR INSERT TO authenticated
  WITH CHECK ((user_belongs_to_tenant(tenant_id) OR is_super_admin())
              AND (has_role(auth.uid(),'admin'::app_role) OR is_super_admin()));

CREATE POLICY "cms_snap_admin_update" ON public.cms_import_snapshots
  FOR UPDATE TO authenticated
  USING ((user_belongs_to_tenant(tenant_id) OR is_super_admin())
         AND (has_role(auth.uid(),'admin'::app_role) OR is_super_admin()))
  WITH CHECK ((user_belongs_to_tenant(tenant_id) OR is_super_admin())
              AND (has_role(auth.uid(),'admin'::app_role) OR is_super_admin()));

CREATE INDEX cms_snap_tenant_idx ON public.cms_import_snapshots(tenant_id, created_at DESC);
