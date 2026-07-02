-- B2 (parte 2): RESTRICTIVE tenant isolation para tabelas negócio remanescentes
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_import_snapshots',
    'deal_lost_reasons',
    'lead_discard_reasons',
    'lead_perdas',
    'portal_sync_logs'
  ]
  LOOP
    EXECUTE format($f$
      CREATE POLICY tenant_isolation_restrictive ON public.%I
        AS RESTRICTIVE FOR ALL TO authenticated, anon
        USING (tenant_id = public.get_current_tenant_id() OR public.is_super_admin())
        WITH CHECK (tenant_id = public.get_current_tenant_id() OR public.is_super_admin());
    $f$, t);
  END LOOP;
END $$;