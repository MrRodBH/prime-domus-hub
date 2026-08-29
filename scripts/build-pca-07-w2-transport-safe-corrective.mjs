import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

export const GATE =
  "PCA-07_W2_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w2-transport-safe-atomic-ledger-aware-corrective";
export const SOURCE_MAIN = "2ea96b2710b382944d9dfdcb8cae78eebd238dcf";
export const SOURCE_TREE = "b6d79b650ce575bee546e66395f97bf7ebd0ace8";
export const CORRECTIVE_VERSION = "20260829110000";
export const CORRECTIVE_NAME =
  "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W2-transport-safe-compatibility-manifest.json";

export const W1_LEDGER = [
  {
    version: "20260728165000",
    name: "pr_m2_tenant_lifecycle",
    bytes: 20253,
    sha256: "8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8",
    idempotencyKey:
      "pca-07r2:20260728165000:8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8",
  },
  {
    version: "20260728180000",
    name: "pr_m2_tenant_access_control",
    bytes: 30313,
    sha256: "3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e",
    idempotencyKey:
      "pca-07r2:20260728180000:3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e",
  },
  {
    version: "20260828160617",
    name: "pca_07r2_w1_forensic_forward_only_ledger_reconciliation",
    bytes: 77274,
    sha256: "3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa",
    idempotencyKey:
      "pca-07r2:20260828160617:3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa",
  },
];

export const W2 = [
  {
    wave: "W2",
    capability: "CONFIGURATION",
    version: "20260728233000",
    name: "pr_m2_configuration_center",
    path: "supabase/migrations/20260728233000_pr_m2_configuration_center.sql",
    bytes: 34401,
    sha256: "782a61c636cbd8310f197fa2af4fb50504a7e03f5a6f3f39dccd4e5266553472",
  },
  {
    wave: "W2",
    capability: "PORTALS",
    version: "20260729103000",
    name: "pr_m2_portal_functional_completion",
    path: "supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql",
    bytes: 48608,
    sha256: "0507fb83eda9fd6079dee18348a09ddfbb7ca9bbe951feb1abd0a0d1f2da30eb",
  },
];

export const CONFIG_FUNCTIONS = [
  "public.validate_tenant_configuration_snapshot(uuid,jsonb)",
  "public.assert_tenant_configuration_authority(uuid,uuid,text,text)",
  "public.save_tenant_configuration_draft(uuid,uuid,text,jsonb,bigint,text)",
  "public.discard_tenant_configuration_draft(uuid,uuid,text,bigint)",
  "public.publish_tenant_configuration(uuid,uuid,text,bigint)",
  "public.rollback_tenant_configuration(uuid,uuid,text,uuid,bigint)",
];

export const PORTAL_FUNCTIONS = [
  "public.assert_tenant_portal_authority(uuid,uuid,text,text)",
  "public.validate_tenant_portal_config(jsonb)",
  "public.assert_tenant_portal_transition(text,text)",
  "public.save_tenant_portal_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text)",
  "public.set_tenant_portal_connector_state(uuid,uuid,text,uuid,bigint,boolean)",
  "public.rotate_tenant_portal_credential_reference(uuid,uuid,text,uuid,bigint,text)",
  "public.save_tenant_portal_mapping(uuid,uuid,text,uuid,integer,jsonb)",
  "public.enqueue_tenant_portal_publication(uuid,uuid,text,uuid,uuid,text,text,text)",
  "public.claim_tenant_portal_job(uuid,uuid,bigint,text)",
  "public.record_tenant_portal_attempt(uuid,uuid,integer,text,text,text,integer,text,jsonb)",
  "public.complete_tenant_portal_job(uuid,uuid,bigint,boolean,boolean,text,text)",
  "public.schedule_tenant_portal_retry(uuid,uuid,text,uuid,bigint)",
  "public.cancel_tenant_portal_job(uuid,uuid,text,uuid,bigint)",
  "public.reconcile_tenant_portal_state(uuid,uuid,text,uuid,bigint,text,text)",
  "public.record_tenant_portal_export(uuid,uuid,text,uuid,uuid,text,text,text,integer,bigint,timestamptz)",
];

const CONFIG_TABLES = ["site_settings", "site_settings_versions", "website_menu_items"];
const PORTAL_TABLES = [
  "portal_connectors",
  "imovel_portais",
  "portal_sync_logs",
  "portal_sync_dlq",
  "portal_connector_credential_verifiers",
  "tenant_portal_mappings",
  "tenant_portal_jobs",
  "tenant_portal_job_attempts",
  "tenant_portal_exports",
];
const PORTAL_CREATED_TABLES = PORTAL_TABLES.slice(4);
const LATER_PRODUCT_VERSIONS = [
  "20260729183000",
  "20260729211500",
  "20260729233000",
  "20260730010000",
  "20260730043000",
  "20260730050000",
  "20260730051500",
  "20260730053000",
  "20260730060000",
  "20260730100000",
  "20260730101000",
  "20260803183000",
  "20260826185014",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlTextArray = (values) => `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;
const occurrences = (value, needle) => value.split(needle).length - 1;

function replaceOnce(source, needle, replacement, label) {
  assert.equal(occurrences(source, needle), 1, `${label} source shape drift`);
  return source.replace(needle, () => replacement);
}

function stripTransaction(source, label) {
  let projected = replaceOnce(source, "\nBEGIN;\n", "\n", `${label} BEGIN`);
  projected = replaceOnce(projected, "\nCOMMIT;\n", "\n", `${label} COMMIT`);
  assert.doesNotMatch(projected, /^\s*BEGIN\s*;/im);
  assert.doesNotMatch(projected, /^\s*COMMIT\s*;/im);
  return projected;
}

export function projectConfiguration(source) {
  let projected = stripTransaction(source, "configuration");
  projected = replaceOnce(
    projected,
    "    'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', ''),\n    'menu_locations', jsonb_build_array('header', 'footer'),",
    "    'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', '')\n  ) || jsonb_build_object(\n    'menu_locations', jsonb_build_array('header', 'footer'),",
    "configuration PG FUNC_MAX_ARGS projection",
  );
  projected = replaceOnce(
    projected,
    "    'instagram', NULLIF(ls.settings->'contato'->>'instagram', ''),",
    `    'instagram', CASE
      WHEN NULLIF(ls.settings->'contato'->>'instagram', '') IS NULL THEN NULL
      WHEN ls.settings->'contato'->>'instagram' ~ '^https://' THEN ls.settings->'contato'->>'instagram'
      WHEN ls.settings->'contato'->>'instagram' ~ '^@?[A-Za-z0-9._-]+$'
        THEN 'https://instagram.com/' || ltrim(ls.settings->'contato'->>'instagram', '@')
      ELSE NULL
    END,`,
    "configuration legacy Instagram projection",
  );
  return `-- PCA-07 W2 executable projection: PG_MAX_FUNCTION_ARGS_JSONB_OBJECT_SPLIT\n-- PCA-07 W2 executable projection: LEGACY_INSTAGRAM_HANDLE_TO_HTTPS\n${projected}`;
}

export function projectPortals(source) {
  let projected = stripTransaction(source, "portals");
  projected = replaceOnce(
    projected,
    "  ALTER COLUMN feed_token DROP NOT NULL,\n  ALTER COLUMN webhook_secret DROP NOT NULL;",
    "  ALTER COLUMN feed_token DROP NOT NULL,\n  ALTER COLUMN feed_token DROP DEFAULT,\n  ALTER COLUMN webhook_secret DROP NOT NULL,\n  ALTER COLUMN webhook_secret DROP DEFAULT;",
    "portal credential default projection",
  );
  projected = replaceOnce(
    projected,
    "-- High-entropy legacy values are retained only as one-way verifiers and then removed.",
    "-- Legacy values remain retained; this wave creates only one-way verification evidence.",
    "portal retained-credential comment",
  );
  projected = replaceOnce(
    projected,
    `ALTER TABLE public.portal_connectors
  ADD CONSTRAINT portal_connectors_no_plaintext_credentials_check CHECK (
    feed_token IS NULL AND webhook_secret IS NULL
  ) NOT VALID;`,
    `-- PCA-07 W2: plaintext-removal CHECK is intentionally deferred until the
-- separately authorized credential-reference cutover removes retained values.`,
    "portal deferred plaintext constraint projection",
  );
  return `-- PCA-07 W2 executable projection: PORTAL_CREDENTIAL_NULL_DEFAULTS\n-- PCA-07 W2 executable projection: DEFER_NO_PLAINTEXT_CHECK_UNTIL_CUTOVER\n${projected}`;
}

function readAndProject() {
  const entries = W2.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `${entry.path} byte drift`);
    assert.equal(sha256(source), entry.sha256, `${entry.path} hash drift`);
    const projected =
      entry.capability === "CONFIGURATION" ? projectConfiguration(source) : projectPortals(source);
    return {
      ...entry,
      source,
      projected,
      projectedBytes: Buffer.byteLength(projected),
      projectedSha256: sha256(projected),
    };
  });
  return entries;
}

const ledgerSchemaAssertion = `
  SELECT array_agg(a.attname::text ORDER BY a.attnum)
    INTO v_columns
    FROM pg_attribute a
   WHERE a.attrelid = 'supabase_migrations.schema_migrations'::regclass
     AND a.attnum > 0
     AND NOT a.attisdropped;
  IF v_columns IS DISTINCT FROM ARRAY[
    'version','statements','name','created_by','idempotency_key','rollback'
  ]::text[] THEN
    RAISE EXCEPTION 'PCA-07 W2 Lovable-managed ledger schema mismatch' USING ERRCODE = 'P0001';
  END IF;`;

const w1LedgerAssertion = `
  SELECT count(*) INTO v_count
    FROM supabase_migrations.schema_migrations sm
   WHERE (sm.version = '${W1_LEDGER[0].version}'
          AND sm.name = '${W1_LEDGER[0].name}'
          AND array_length(sm.statements, 1) = 1
          AND octet_length(sm.statements[1]) = ${W1_LEDGER[0].bytes}
          AND encode(extensions.digest(sm.statements[1], 'sha256'), 'hex') = '${W1_LEDGER[0].sha256}'
          AND sm.idempotency_key = '${W1_LEDGER[0].idempotencyKey}')
      OR (sm.version = '${W1_LEDGER[1].version}'
          AND sm.name = '${W1_LEDGER[1].name}'
          AND array_length(sm.statements, 1) = 1
          AND octet_length(sm.statements[1]) = ${W1_LEDGER[1].bytes}
          AND encode(extensions.digest(sm.statements[1], 'sha256'), 'hex') = '${W1_LEDGER[1].sha256}'
          AND sm.idempotency_key = '${W1_LEDGER[1].idempotencyKey}')
      OR (sm.version = '${W1_LEDGER[2].version}'
          AND sm.name = '${W1_LEDGER[2].name}'
          AND array_length(sm.statements, 1) = 1
          AND octet_length(sm.statements[1]) = ${W1_LEDGER[2].bytes}
          AND encode(extensions.digest(sm.statements[1], 'sha256'), 'hex') = '${W1_LEDGER[2].sha256}'
          AND sm.idempotency_key = '${W1_LEDGER[2].idempotencyKey}');
  IF v_count <> 3 THEN
    RAISE EXCEPTION 'PCA-07 W2 exact W1 ledger prerequisite mismatch' USING ERRCODE = 'P0001';
  END IF;`;

const authorityAssertion = (tenantId) => `
  SELECT count(*), min(tenant_id), max(tenant_id)
    INTO v_count, v_min_tenant, v_max_tenant
    FROM prm2_rebaseline.authorized_tenant_ids();
  IF v_count <> 1
     OR v_min_tenant IS DISTINCT FROM '${tenantId}'::uuid
     OR v_max_tenant IS DISTINCT FROM '${tenantId}'::uuid THEN
    RAISE EXCEPTION 'PCA-07 W2 exact tenant manifest mismatch' USING ERRCODE = 'P0001';
  END IF;`;

const protectedBaselineAssertion = (tenantId) => `
  IF (SELECT count(*) FROM public.tenants) <> 74
     OR (SELECT count(*) FROM public.portal_connectors) <> 444
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id = '${tenantId}'::uuid) <> 6
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id <> '${tenantId}'::uuid) <> 438
     OR (SELECT count(*) FROM public.portal_connectors pc
           CROSS JOIN LATERAL (VALUES(NULLIF(pc.feed_token,'')),(NULLIF(pc.webhook_secret,''))) s(value)
          WHERE s.value IS NOT NULL) <> 888
     OR (SELECT count(*) FROM storage.objects) <> 22
     OR (SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects) <> 15826788 THEN
    RAISE EXCEPTION 'PCA-07 W2 protected baseline drift' USING ERRCODE = 'P0001';
  END IF;`;

const noLaterLedgerAssertion = `
  IF EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
     WHERE version = ANY(${sqlTextArray(LATER_PRODUCT_VERSIONS)})
  ) THEN
    RAISE EXCEPTION 'PCA-07 W2 unexpected W3-W6 ledger row' USING ERRCODE = 'P0001';
  END IF;`;

const configCatalogAssertion = (expectedPresent) => `
  SELECT count(*) INTO v_count
    FROM (VALUES
      ('site_settings_versions','revision'),
      ('site_settings_versions','based_on_revision'),
      ('site_settings_versions','content_hash'),
      ('site_settings_versions','updated_at')
    ) expected(table_name, column_name)
    JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = expected.table_name
     AND c.column_name = expected.column_name;
  IF v_count <> ${expectedPresent ? 4 : 0} THEN
    RAISE EXCEPTION 'PCA-07 W2 configuration column state mismatch' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_count
    FROM unnest(${sqlTextArray(CONFIG_FUNCTIONS)}) AS item(signature)
   WHERE to_regprocedure(signature) IS NOT NULL;
  IF v_count <> ${expectedPresent ? CONFIG_FUNCTIONS.length : 0} THEN
    RAISE EXCEPTION 'PCA-07 W2 configuration function state mismatch' USING ERRCODE = 'P0001';
  END IF;`;

const portalCatalogAssertion = (expectedPresent) => `
  SELECT count(*) INTO v_count
    FROM unnest(${sqlTextArray(PORTAL_CREATED_TABLES)}) AS item(table_name)
   WHERE to_regclass('public.' || table_name) IS NOT NULL;
  IF v_count <> ${expectedPresent ? PORTAL_CREATED_TABLES.length : 0} THEN
    RAISE EXCEPTION 'PCA-07 W2 portal table state mismatch' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_count
    FROM (VALUES
      ('portal_connectors','credential_reference'),('portal_connectors','credential_version'),
      ('portal_connectors','credential_state'),('portal_connectors','last_rotated_at'),
      ('portal_connectors','rotation_required'),('portal_connectors','row_version'),
      ('imovel_portais','connector_id'),('imovel_portais','desired_state'),
      ('imovel_portais','current_state'),('imovel_portais','revision'),
      ('imovel_portais','last_job_id'),('portal_sync_logs','job_id'),
      ('portal_sync_logs','attempt_id'),('portal_sync_logs','error_code'),
      ('portal_sync_logs','metadata')
    ) expected(table_name, column_name)
    JOIN information_schema.columns c
      ON c.table_schema = 'public'
     AND c.table_name = expected.table_name
     AND c.column_name = expected.column_name;
  IF v_count <> ${expectedPresent ? 15 : 0} THEN
    RAISE EXCEPTION 'PCA-07 W2 portal column state mismatch' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_count
    FROM unnest(${sqlTextArray(PORTAL_FUNCTIONS)}) AS item(signature)
   WHERE to_regprocedure(signature) IS NOT NULL;
  IF v_count <> ${expectedPresent ? PORTAL_FUNCTIONS.length : 0} THEN
    RAISE EXCEPTION 'PCA-07 W2 portal function state mismatch' USING ERRCODE = 'P0001';
  END IF;`;

function configPreflight(tenantId) {
  return `DO $pca07w2_config_pre$
DECLARE
  v_count integer;
  v_columns text[];
  v_min_tenant uuid;
  v_max_tenant uuid;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'PCA-07 W2 backend identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'PCA-07 W2 ledger missing' USING ERRCODE = 'P0001';
  END IF;${ledgerSchemaAssertion}${w1LedgerAssertion}${authorityAssertion(tenantId)}${protectedBaselineAssertion(tenantId)}${noLaterLedgerAssertion}
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
              WHERE version IN ('${W2[0].version}','${W2[1].version}','${CORRECTIVE_VERSION}')) THEN
    RAISE EXCEPTION 'PCA-07 W2 ledger target must be empty before configuration' USING ERRCODE = 'P0001';
  END IF;${configCatalogAssertion(false)}${portalCatalogAssertion(false)}
  IF (SELECT count(*) FROM public.site_settings WHERE tenant_id = '${tenantId}'::uuid) <> 5
     OR (SELECT count(*) FROM public.website_menu_items WHERE tenant_id = '${tenantId}'::uuid) <> 6
     OR (SELECT count(*) FROM public.media_library WHERE tenant_id = '${tenantId}'::uuid) <> 0
     OR (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id = '${tenantId}'::uuid) <> 4
     OR EXISTS (SELECT 1 FROM public.site_settings_versions
                 WHERE tenant_id = '${tenantId}'::uuid AND key = 'configuration') THEN
    RAISE EXCEPTION 'PCA-07 W2 configuration target baseline mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT key FROM public.site_settings WHERE tenant_id = '${tenantId}'::uuid
       GROUP BY key HAVING count(*) > 1
    ) duplicate_key
  ) THEN
    RAISE EXCEPTION 'PCA-07 W2 duplicate legacy setting key' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_count
    FROM public.site_settings
   WHERE tenant_id = '${tenantId}'::uuid
     AND key = 'contato'
     AND NULLIF(value->>'instagram','') ~ '^@?[A-Za-z0-9._-]+$';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'PCA-07 W2 expected one canonicalizable Instagram handle' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.site_settings
     WHERE tenant_id = '${tenantId}'::uuid
       AND value::text ~* '<script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]='
  ) OR EXISTS (
    SELECT 1 FROM public.site_settings
     WHERE tenant_id = '${tenantId}'::uuid
       AND value::text ~* '\"(client_secret|refresh_token|private_key|api_key|access_token|password)\"[[:space:]]*:'
  ) THEN
    RAISE EXCEPTION 'PCA-07 W2 unsafe legacy configuration content' USING ERRCODE = 'P0001';
  END IF;
END;
$pca07w2_config_pre$;`;
}

function configPostflight(tenantId) {
  return `DO $pca07w2_config_post$
DECLARE
  v_count integer;
  v_signature text;
  v_table text;
  v_role text;
  v_query text := current_query();
  v_query_sha text := encode(extensions.digest(current_query(), 'sha256'), 'hex');
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${W2[0].version}') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version = '${W2[0].version}'
          AND name = '${W2[0].name}'
          AND created_by = 'PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
          AND array_length(statements, 1) = 1
          AND statements[1] = v_query
          AND idempotency_key = 'pca-07-w2:${W2[0].version}:' || v_query_sha
          AND COALESCE(array_length(rollback,1),0) = 0
     ) THEN
    RAISE EXCEPTION 'PCA-07 W2 configuration ledger postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;${configCatalogAssertion(true)}${portalCatalogAssertion(false)}${protectedBaselineAssertion(tenantId)}${noLaterLedgerAssertion}
  IF (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id = '${tenantId}'::uuid) <> 5
     OR (SELECT count(*) FROM public.site_settings_versions
          WHERE tenant_id = '${tenantId}'::uuid AND key = 'configuration'
            AND status = 'published' AND revision = 1 AND based_on_revision = 0
            AND content_hash ~ '^[0-9a-f]{64}$') <> 1 THEN
    RAISE EXCEPTION 'PCA-07 W2 configuration snapshot postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;
  FOREACH v_table IN ARRAY ${sqlTextArray(CONFIG_TABLES)} LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || v_table)::regclass) THEN
      RAISE EXCEPTION 'PCA-07 W2 configuration RLS missing: %', v_table USING ERRCODE = 'P0001';
    END IF;
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(v_role, 'public.' || v_table, 'SELECT')
         OR has_table_privilege(v_role, 'public.' || v_table, 'INSERT')
         OR has_table_privilege(v_role, 'public.' || v_table, 'UPDATE')
         OR has_table_privilege(v_role, 'public.' || v_table, 'DELETE') THEN
        RAISE EXCEPTION 'PCA-07 W2 configuration client ACL exposure: %.%', v_role, v_table USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
    IF NOT has_table_privilege('service_role','public.' || v_table,'SELECT')
       OR NOT has_table_privilege('service_role','public.' || v_table,'INSERT')
       OR NOT has_table_privilege('service_role','public.' || v_table,'UPDATE')
       OR NOT has_table_privilege('service_role','public.' || v_table,'DELETE') THEN
      RAISE EXCEPTION 'PCA-07 W2 configuration service ACL missing: %', v_table USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  FOREACH v_signature IN ARRAY ${sqlTextArray(CONFIG_FUNCTIONS)} LOOP
    IF has_function_privilege('anon',v_signature,'EXECUTE')
       OR has_function_privilege('authenticated',v_signature,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_signature,'EXECUTE') THEN
      RAISE EXCEPTION 'PCA-07 W2 configuration function ACL mismatch: %', v_signature USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$pca07w2_config_post$;`;
}

function portalPreflight(tenantId) {
  return `DO $pca07w2_portal_pre$
DECLARE
  v_count integer;
  v_columns text[];
  v_min_tenant uuid;
  v_max_tenant uuid;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
     OR current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'PCA-07 W2 backend identity mismatch' USING ERRCODE = 'P0001';
  END IF;${ledgerSchemaAssertion}${w1LedgerAssertion}${authorityAssertion(tenantId)}${protectedBaselineAssertion(tenantId)}${noLaterLedgerAssertion}${configCatalogAssertion(true)}${portalCatalogAssertion(false)}
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '${W2[0].version}') <> 1
     OR NOT EXISTS (
       SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version = '${W2[0].version}'
          AND name = '${W2[0].name}'
          AND created_by = 'PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
          AND array_length(statements,1) = 1
          AND idempotency_key = 'pca-07-w2:${W2[0].version}:' || encode(extensions.digest(statements[1], 'sha256'), 'hex')
     ) OR EXISTS (
       SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version IN ('${W2[1].version}','${CORRECTIVE_VERSION}')
     ) THEN
    RAISE EXCEPTION 'PCA-07 W2 portal ledger prerequisite mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.portal_connectors WHERE tenant_id = '${tenantId}'::uuid) <> 6
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id = '${tenantId}'::uuid
          AND (NULLIF(feed_token,'') IS NOT NULL OR NULLIF(webhook_secret,'') IS NOT NULL)) <> 6
     OR (SELECT count(*) FROM public.imovel_portais WHERE tenant_id = '${tenantId}'::uuid) <> 0
     OR (SELECT count(*) FROM public.portal_sync_logs WHERE tenant_id = '${tenantId}'::uuid) <> 0
     OR EXISTS (SELECT 1 FROM public.portal_connectors WHERE portal_slug IS NULL OR btrim(portal_slug) = '')
     OR EXISTS (SELECT 1 FROM public.portal_connectors GROUP BY tenant_id,portal_slug HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'PCA-07 W2 portal target baseline mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_attrdef d JOIN pg_attribute a
        ON a.attrelid=d.adrelid AND a.attnum=d.adnum
       WHERE d.adrelid='public.portal_connectors'::regclass
         AND a.attname::text IN ('feed_token','webhook_secret')
         AND pg_get_expr(d.adbin,d.adrelid) = 'replace((gen_random_uuid())::text, ''-''::text, ''''::text)') <> 2 THEN
    RAISE EXCEPTION 'PCA-07 W2 portal credential default baseline mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conrelid='public.portal_connectors'::regclass
                AND conname='portal_connectors_no_plaintext_credentials_check') THEN
    RAISE EXCEPTION 'PCA-07 W2 unexpected plaintext constraint before deferred cutover' USING ERRCODE = 'P0001';
  END IF;
END;
$pca07w2_portal_pre$;`;
}

function portalPostflight(tenantId) {
  return `DO $pca07w2_portal_post$
DECLARE
  v_count integer;
  v_signature text;
  v_table text;
  v_role text;
  v_query text := current_query();
  v_query_sha text := encode(extensions.digest(current_query(), 'sha256'), 'hex');
BEGIN
  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
       WHERE version IN ('${W2[0].version}','${W2[1].version}','${CORRECTIVE_VERSION}')) <> 3
     OR NOT EXISTS (
       SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version='${W2[1].version}' AND name='${W2[1].name}'
          AND created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
          AND array_length(statements,1)=1 AND statements[1]=v_query
          AND idempotency_key='pca-07-w2:${W2[1].version}:' || v_query_sha
          AND COALESCE(array_length(rollback,1),0)=0
     ) OR NOT EXISTS (
       SELECT 1 FROM supabase_migrations.schema_migrations
        WHERE version='${CORRECTIVE_VERSION}' AND name='${CORRECTIVE_NAME}'
          AND created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
          AND array_length(statements,1)=1 AND statements[1]=v_query
          AND idempotency_key='pca-07-w2:${CORRECTIVE_VERSION}:' || v_query_sha
          AND COALESCE(array_length(rollback,1),0)=0
     ) THEN
    RAISE EXCEPTION 'PCA-07 W2 portal ledger postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;${configCatalogAssertion(true)}${portalCatalogAssertion(true)}${protectedBaselineAssertion(tenantId)}${noLaterLedgerAssertion}
  IF (SELECT count(*) FROM public.portal_connector_credential_verifiers) <> 12
     OR (SELECT count(*) FROM public.portal_connector_credential_verifiers
          WHERE tenant_id='${tenantId}'::uuid AND verifier_hash ~ '^[0-9a-f]{64}$') <> 12
     OR (SELECT count(*) FROM public.portal_connectors
          WHERE tenant_id='${tenantId}'::uuid AND credential_state='rotation_required' AND rotation_required) <> 6
     OR (SELECT count(*) FROM pg_attrdef d JOIN pg_attribute a
          ON a.attrelid=d.adrelid AND a.attnum=d.adnum
         WHERE d.adrelid='public.portal_connectors'::regclass
           AND a.attname::text IN ('feed_token','webhook_secret')) <> 0
     OR EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid='public.portal_connectors'::regclass
                   AND conname='portal_connectors_no_plaintext_credentials_check') THEN
    RAISE EXCEPTION 'PCA-07 W2 retained credential postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.tenant_portal_mappings) <> 0
     OR (SELECT count(*) FROM public.tenant_portal_jobs) <> 0
     OR (SELECT count(*) FROM public.tenant_portal_job_attempts) <> 0
     OR (SELECT count(*) FROM public.tenant_portal_exports) <> 0
     OR (SELECT count(*) FROM public.imovel_portais) <> 0 THEN
    RAISE EXCEPTION 'PCA-07 W2 unexpected portal business-row mutation' USING ERRCODE = 'P0001';
  END IF;
  FOREACH v_table IN ARRAY ${sqlTextArray(PORTAL_TABLES)} LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.' || v_table)::regclass) THEN
      RAISE EXCEPTION 'PCA-07 W2 portal RLS missing: %', v_table USING ERRCODE = 'P0001';
    END IF;
    FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(v_role,'public.' || v_table,'SELECT')
         OR has_table_privilege(v_role,'public.' || v_table,'INSERT')
         OR has_table_privilege(v_role,'public.' || v_table,'UPDATE')
         OR has_table_privilege(v_role,'public.' || v_table,'DELETE') THEN
        RAISE EXCEPTION 'PCA-07 W2 portal client ACL exposure: %.%', v_role, v_table USING ERRCODE = 'P0001';
      END IF;
    END LOOP;
    IF NOT has_table_privilege('service_role','public.' || v_table,'SELECT')
       OR NOT has_table_privilege('service_role','public.' || v_table,'INSERT')
       OR NOT has_table_privilege('service_role','public.' || v_table,'UPDATE')
       OR NOT has_table_privilege('service_role','public.' || v_table,'DELETE') THEN
      RAISE EXCEPTION 'PCA-07 W2 portal service ACL missing: %', v_table USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  FOREACH v_signature IN ARRAY ${sqlTextArray(PORTAL_FUNCTIONS)} LOOP
    IF has_function_privilege('anon',v_signature,'EXECUTE')
       OR has_function_privilege('authenticated',v_signature,'EXECUTE')
       OR NOT has_function_privilege('service_role',v_signature,'EXECUTE') THEN
      RAISE EXCEPTION 'PCA-07 W2 portal function ACL mismatch: %', v_signature USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
END;
$pca07w2_portal_post$;`;
}

function prelude(tenantId, ownerAuthorization, capability) {
  const manifest = JSON.stringify([tenantId]);
  const manifestSha = sha256(tenantId.toLowerCase());
  return `-- PCA-07 W2 Lovable-managed migration-local envelope: ${capability}
-- Canonical repository sources are projected once and never duplicated in transport.
BEGIN;
SET LOCAL search_path = public, extensions, pg_temp;
SELECT set_config('app.pr_m2_authorized_tenant_ids', ${sqlString(manifest)}, true);
SELECT set_config('app.pr_m2_authorized_tenant_manifest_sha256', '${manifestSha}', true);
SELECT set_config('app.pr_m2_owner_authorization', ${sqlString(ownerAuthorization)}, true);`;
}

function ledgerInsert(entries) {
  const values = entries
    .map(
      ({ version, name }) =>
        `('${version}', ARRAY[v_query], '${name}',
       'PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION',
       'pca-07-w2:${version}:' || v_query_sha, ARRAY[]::text[])`,
    )
    .join(",\n    ");
  return `DO $pca07w2_ledger$
DECLARE
  v_query text := current_query();
  v_query_sha text := encode(extensions.digest(current_query(), 'sha256'), 'hex');
BEGIN
  INSERT INTO supabase_migrations.schema_migrations
    (version, statements, name, created_by, idempotency_key, rollback)
  VALUES
    ${values};
END;
$pca07w2_ledger$;`;
}

export function buildApplication({ tenantId, ownerAuthorization }) {
  assert.match(
    tenantId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "exact tenant UUID required",
  );
  assert.match(
    ownerAuthorization,
    /^PCA-[0-9A-Z_-]{3,120}$/,
    "PCA Owner authorization reference required",
  );
  const [configuration, portals] = readAndProject();
  const configurationSql = `${prelude(tenantId, ownerAuthorization, "CONFIGURATION")}
${configPreflight(tenantId)}
${configuration.projected.trim()}
${ledgerInsert([configuration])}
${configPostflight(tenantId)}
COMMIT;
`;
  const portalSql = `${prelude(tenantId, ownerAuthorization, "PORTALS")}
${portalPreflight(tenantId)}
${portals.projected.trim()}
${ledgerInsert([portals, { version: CORRECTIVE_VERSION, name: CORRECTIVE_NAME }])}
${portalPostflight(tenantId)}
COMMIT;
`;
  return {
    configurationSql,
    portalSql,
    runtime: {
      authorization: ownerAuthorization,
      exactTenantCount: 1,
      tenantManifestSha256: sha256(tenantId.toLowerCase()),
      configurationSqlBytes: Buffer.byteLength(configurationSql),
      configurationSqlSha256: sha256(configurationSql),
      portalSqlBytes: Buffer.byteLength(portalSql),
      portalSqlSha256: sha256(portalSql),
    },
  };
}

export function buildContract() {
  const projected = readAndProject().map((entry) => ({
    version: entry.version,
    name: entry.name,
    path: entry.path,
    capability: entry.capability,
    canonicalBytes: entry.bytes,
    canonicalSha256: entry.sha256,
    projectedBodyBytes: entry.projectedBytes,
    projectedBodySha256: entry.projectedSha256,
  }));
  return {
    schemaVersion: 1,
    gate: GATE,
    branch: BRANCH,
    sourceMain: SOURCE_MAIN,
    sourceTree: SOURCE_TREE,
    authority: {
      repository: "PROTECTED_GITHUB_MAIN_ONLY",
      canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY",
      ownerSupabaseAccess: "LOVABLE_ONLY",
    },
    corrective: {
      version: CORRECTIVE_VERSION,
      name: CORRECTIVE_NAME,
      executionMode: "TWO_ORDERED_MIGRATION_LOCAL_ATOMIC_ENVELOPES",
      transportSourceCopiesPerMigration: 1,
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      configurationMustCommitBeforePortal: true,
      readOnlyReconciliationRequiredAfterAmbiguousTransportResult: true,
      blindReplayAllowed: false,
    },
    projectedMigrations: projected,
    projections: [
      "PG_MAX_FUNCTION_ARGS_JSONB_OBJECT_SPLIT",
      "LEGACY_INSTAGRAM_HANDLE_TO_HTTPS",
      "PORTAL_CREDENTIAL_NULL_DEFAULTS",
      "DEFER_NO_PLAINTEXT_CHECK_UNTIL_CREDENTIAL_CUTOVER",
    ],
    liveReadOnlyBaseline: {
      postgresMajor: 17,
      tenantCount: 74,
      exactTargetCount: 1,
      portalConnectorCount: 444,
      targetPortalConnectorCount: 6,
      protectedPortalConnectorCount: 438,
      retainedSensitiveFieldCount: 888,
      targetVerifierRowsExpected: 12,
      targetConfigurationRowsExpected: 1,
      storageObjectCount: 22,
      storageBytes: 15826788,
      w1LedgerRowsExact: 3,
      w2LedgerRowsBeforeApplication: 0,
    },
    security: {
      configRlsTables: CONFIG_TABLES,
      portalRlsTables: PORTAL_TABLES,
      configFunctionCount: CONFIG_FUNCTIONS.length,
      portalFunctionCount: PORTAL_FUNCTIONS.length,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"],
      serviceRoleRequired: true,
      dataApiExposureImplicitlyTrusted: false,
    },
    controls: {
      repositoryImplementationOnly: true,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      lovableCalls: 0,
      directSupabaseCalls: 0,
      providerMutation: false,
      deploy: false,
      roadmapUpdate: false,
      pr105Mutation: false,
      portalSecretErasure: false,
    },
  };
}
