-- Execute only through an authorized Lovable private fresh cell.
DO $pca05r$
DECLARE
  vault_has_secrets boolean := false;
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN RAISE EXCEPTION 'PCA-05R requires PostgreSQL 17+'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'Private cell is not empty'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('pg_net','pg_cron')) THEN RAISE EXCEPTION 'External-call extension detected'; END IF;
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname IN ('net','cron')) THEN RAISE EXCEPTION 'External-call schema detected'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM vault.secrets)' INTO vault_has_secrets;
  END IF;
  IF vault_has_secrets THEN RAISE EXCEPTION 'Vault is not empty'; END IF;
END
$pca05r$;
