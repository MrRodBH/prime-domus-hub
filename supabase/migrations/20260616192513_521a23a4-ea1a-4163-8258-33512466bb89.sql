
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "leads anyone create" ON public.leads;
CREATE POLICY "leads anyone create" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (nome IS NOT NULL AND length(trim(nome)) >= 2 AND (email IS NOT NULL OR telefone IS NOT NULL));
