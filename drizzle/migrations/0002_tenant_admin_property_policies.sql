CREATE OR REPLACE FUNCTION public.is_active_tenant_admin(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = _tenant_id
      AND m.membership_status = 'active'
      AND m.tenant_role IN ('owner', 'admin')
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_tenant_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_tenant_admin(uuid) TO authenticated, service_role;

CREATE POLICY "imoveis tenant admin all" ON public.imoveis
  FOR ALL TO authenticated
  USING (public.is_active_tenant_admin(tenant_id))
  WITH CHECK (public.is_active_tenant_admin(tenant_id));

CREATE POLICY "imovel_imagens tenant admin all" ON public.imovel_imagens
  FOR ALL TO authenticated
  USING (public.is_active_tenant_admin(tenant_id))
  WITH CHECK (public.is_active_tenant_admin(tenant_id));