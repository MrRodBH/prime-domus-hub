-- Containment proof only; no application traffic is authorized.
DO $pca05r$
DECLARE
  vault_has_secrets boolean := false;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'Auth/storage boundary violated'; END IF;
  IF EXISTS (SELECT 1 FROM public.tenants) THEN RAISE EXCEPTION 'Tenant provisioning belongs to a later gate'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('pg_net','pg_cron')) THEN RAISE EXCEPTION 'External-call extension detected'; END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname IN ('net','cron')) THEN RAISE EXCEPTION 'External-call schema detected'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM vault.secrets)' INTO vault_has_secrets;
  END IF;
  IF vault_has_secrets THEN RAISE EXCEPTION 'Vault is not empty'; END IF;
END
$pca05r$;
