-- Fix only the six CMS writers. Preserve current definitions, ACLs and authority checks.
-- Forward-only: no tenant rows, published snapshots, domain state or grants change.
DO $cms_digest$
DECLARE
  v_names text[] := ARRAY[
    'save_tenant_configuration_draft', 'rollback_tenant_configuration',
    'save_tenant_page_draft', 'save_tenant_template_version',
    'save_tenant_form_definition', 'save_tenant_campaign_definition'
  ];
  v_function record;
  v_definition text;
  v_replacement text;
  v_count integer;
BEGIN
  IF to_regprocedure('extensions.digest(text,text)') IS NULL THEN
    RAISE EXCEPTION 'cms_pgcrypto_extensions_missing';
  END IF;
  SELECT count(*) INTO v_count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=ANY(v_names);
  IF v_count <> cardinality(v_names) THEN
    RAISE EXCEPTION 'cms_writer_signature_set_changed';
  END IF;
  FOR v_function IN
    SELECT p.oid, p.proname, p.proacl, p.proowner, p.proconfig, p.prosecdef
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname=ANY(v_names) ORDER BY p.proname
  LOOP
    v_definition := pg_get_functiondef(v_function.oid);
    v_replacement := regexp_replace(v_definition, '(^|[^[:alnum:]_.])digest\(', '\1extensions.digest(', 'g');
    IF position('extensions.digest(' IN v_replacement)=0 THEN
      RAISE EXCEPTION 'cms_writer_digest_contract_changed: %', v_function.proname;
    END IF;
    IF v_definition <> v_replacement THEN EXECUTE v_replacement; END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p WHERE p.oid=v_function.oid AND (
        p.proacl IS DISTINCT FROM v_function.proacl OR p.proowner <> v_function.proowner OR
        p.proconfig IS DISTINCT FROM v_function.proconfig OR p.prosecdef <> v_function.prosecdef
      )
    ) THEN RAISE EXCEPTION 'cms_writer_security_metadata_changed'; END IF;
  END LOOP;
  IF encode(extensions.digest('abc'::text,'sha256'::text),'hex') <>
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' THEN
    RAISE EXCEPTION 'cms_digest_self_check_failed';
  END IF;
END
$cms_digest$;
