-- Direct reads must use the same RBAC decision as listarSubmissoes.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.form_submissions'::regclass AND relrowsecurity)
 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='form_submissions' AND policyname='form_submissions_tenant_read' AND cmd='SELECT' AND permissive='PERMISSIVE' AND roles=ARRAY['authenticated']::name[])
 OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='form_submissions' AND policyname='round57_no_super_operation' AND permissive='RESTRICTIVE')
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='form_submissions' AND permissive='PERMISSIVE' AND cmd IN ('SELECT','ALL')) <> 1
 THEN RAISE EXCEPTION 'round63_submission_policy_drift'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS rm_submission_auth;
REVOKE ALL ON SCHEMA rm_submission_auth FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA rm_submission_auth TO authenticated;
CREATE OR REPLACE FUNCTION rm_submission_auth.can_read()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE tid uuid := public.get_current_tenant_id(); actor uuid := auth.uid(); decision jsonb;
BEGIN
 IF actor IS NULL OR tid IS NULL OR public.is_super_admin() THEN RETURN false; END IF;
 decision := public.resolve_tenant_permission(actor,tid,'selection','cms.formularios','visualizar'::public.rbac_action);
 -- CMS read accepts any valid granted scope; do not silently require global.
 RETURN COALESCE(decision->'allowed'='true'::jsonb AND decision->>'scope' IN ('proprio','equipe','global'),false);
END $$;
REVOKE ALL ON FUNCTION rm_submission_auth.can_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rm_submission_auth.can_read() TO authenticated;
ALTER POLICY form_submissions_tenant_read ON public.form_submissions
 USING (tenant_id=public.get_current_tenant_id() AND (SELECT rm_submission_auth.can_read()));
COMMIT;
