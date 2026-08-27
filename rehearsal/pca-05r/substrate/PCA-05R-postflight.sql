-- Containment proof only; no application traffic is authorized.
DO $pca05r$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users) OR EXISTS (SELECT 1 FROM storage.objects) THEN RAISE EXCEPTION 'Auth/storage boundary violated'; END IF;
  IF EXISTS (SELECT 1 FROM public.tenants) THEN RAISE EXCEPTION 'Tenant provisioning belongs to a later gate'; END IF;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname IN ('pg_net','pg_cron','supabase_vault')) THEN RAISE EXCEPTION 'External-capability extension detected'; END IF;
END
$pca05r$;
