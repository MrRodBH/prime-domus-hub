
REVOKE ALL ON FUNCTION public.seed_default_lead_reasons(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_default_lead_reasons(uuid) TO service_role;
