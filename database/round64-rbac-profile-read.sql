BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.rbac_profiles'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rbac_profiles' AND policyname='rbac_profiles read auth' AND cmd='SELECT' AND permissive='PERMISSIVE')
 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='rbac_profiles' AND policyname='round57_no_super_operation' AND permissive='RESTRICTIVE')
 THEN RAISE EXCEPTION 'round64_profile_policy_drift'; END IF;
END $$;
-- Restrictive is necessary: the existing admin ALL policy also permits SELECT.
DROP POLICY IF EXISTS round64_profile_read_scope ON public.rbac_profiles;
CREATE POLICY round64_profile_read_scope ON public.rbac_profiles
 AS RESTRICTIVE FOR SELECT TO authenticated
 USING (
   auth.uid() IS NOT NULL AND NOT public.is_super_admin()
   AND public.get_current_tenant_id() IS NOT NULL
   AND (tenant_id=public.get_current_tenant_id() OR (sistema=true AND tenant_id IS NULL))
 );
COMMIT;
