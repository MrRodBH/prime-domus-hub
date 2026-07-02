-- B2: add RESTRICTIVE tenant isolation policies to portal tables
CREATE POLICY tenant_isolation_restrictive ON public.imovel_portais
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenant_isolation_restrictive ON public.portal_connectors
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());

CREATE POLICY tenant_isolation_restrictive ON public.portal_sync_dlq
  AS RESTRICTIVE FOR ALL TO authenticated, anon
  USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());