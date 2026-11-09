DO $mig$
DECLARE
  v_fn text;
  v_def text;
  v_new text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['transition_tenant_crm_lead','assign_tenant_crm_lead','set_tenant_crm_tags','update_tenant_crm_lead'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO v_def
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = v_fn;
    IF v_def IS NULL THEN
      RAISE EXCEPTION 'function % not found', v_fn;
    END IF;
    IF position('transition_lead_rpc' in v_def) > 0 THEN
      CONTINUE;
    END IF;
    v_new := regexp_replace(
      v_def,
      '(UPDATE public\.leads .*? RETURNING \* INTO v_lead;)',
      'PERFORM set_config(''app.transition_lead_rpc'', ''on'', true); \1 PERFORM set_config(''app.transition_lead_rpc'', ''off'', true);'
    );
    IF v_new = v_def THEN
      RAISE EXCEPTION 'lead update block not found in %', v_fn;
    END IF;
    EXECUTE v_new;
  END LOOP;
END
$mig$;