-- Add defense in depth without changing roles, grants or restrictive policies.
BEGIN;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['corretores','imoveis'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t
      AND policyname='tenant_isolation' AND permissive='RESTRICTIVE'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t
      AND policyname='round57_no_super_operation' AND permissive='RESTRICTIVE'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t
      AND policyname=t || ' secretaria read' AND cmd='SELECT'
      AND permissive='PERMISSIVE' AND roles=ARRAY['authenticated']::name[]
    ) THEN
      RAISE EXCEPTION 'Round61 prerequisite missing for %', t;
    END IF;
  END LOOP;
END $$;

ALTER POLICY "corretores secretaria read" ON public.corretores
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role)
    AND tenant_id = public.get_current_tenant_id());
ALTER POLICY "imoveis secretaria read" ON public.imoveis
  USING (public.has_role(auth.uid(), 'secretaria'::public.app_role)
    AND tenant_id = public.get_current_tenant_id());
COMMIT;
