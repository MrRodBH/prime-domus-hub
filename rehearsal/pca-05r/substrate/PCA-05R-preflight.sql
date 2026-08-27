-- Execute only through an authorized Lovable private fresh cell.
DO $pca05r$
BEGIN
  IF current_setting('server_version_num')::integer < 170000 THEN RAISE EXCEPTION 'PCA-05R requires PostgreSQL 17+'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'Private cell is not empty'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('pg_net','pg_cron','supabase_vault')) THEN RAISE EXCEPTION 'External-capability extension detected'; END IF;
END
$pca05r$;
