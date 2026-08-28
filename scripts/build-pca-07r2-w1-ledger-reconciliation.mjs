import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

export const CORRECTIVE_VERSION = "20260828160617";
export const CORRECTIVE_PATH =
  `supabase/migrations/${CORRECTIVE_VERSION}_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql`;
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07R2-w1-forensic-ledger-reconciliation-manifest.json";

export const W1 = [
  {
    version: "20260728165000",
    name: "pr_m2_tenant_lifecycle",
    path: "supabase/migrations/20260728165000_pr_m2_tenant_lifecycle.sql",
    sha256: "8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8",
    bytes: 20253,
  },
  {
    version: "20260728180000",
    name: "pr_m2_tenant_access_control",
    path: "supabase/migrations/20260728180000_pr_m2_tenant_access_control.sql",
    sha256: "3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e",
    bytes: 30313,
  },
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlTextArray = (values) => `ARRAY[${values.map(sqlString).join(", ")}]::text[]`;

const functionSpecs = [
  {
    source: 0,
    marker: "prm2_rebaseline.authorized_tenant_ids",
    signature: "prm2_rebaseline.authorized_tenant_ids()",
    securityDefiner: false,
    volatility: "s",
    searchPath: "search_path=public, extensions, pg_temp",
    serviceExecute: false,
  },
  {
    source: 0,
    marker: "public.bootstrap_tenant_with_owner",
    signature: "public.bootstrap_tenant_with_owner(uuid,text,text,uuid,text)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 0,
    marker: "public.invite_tenant_member",
    signature: "public.invite_tenant_member(uuid,uuid,text,uuid,text,boolean)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 0,
    marker: "public.accept_tenant_invitation",
    signature: "public.accept_tenant_invitation(uuid,uuid)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 0,
    marker: "public.transfer_tenant_ownership",
    signature: "public.transfer_tenant_ownership(uuid,uuid,text,uuid)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.resolve_tenant_permission",
    signature: "public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action)",
    securityDefiner: true,
    volatility: "s",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.assert_tenant_access_manager",
    signature: "public.assert_tenant_access_manager(uuid,uuid,text)",
    securityDefiner: true,
    volatility: "s",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.mutate_tenant_access_profile",
    signature: "public.mutate_tenant_access_profile(uuid,uuid,text,text,uuid,text,text)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.set_tenant_profile_permission",
    signature:
      "public.set_tenant_profile_permission(uuid,uuid,text,uuid,uuid,public.rbac_action,public.rbac_scope,boolean)",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.set_tenant_member_profiles",
    signature: "public.set_tenant_member_profiles(uuid,uuid,text,uuid,uuid[])",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
  {
    source: 1,
    marker: "public.mutate_tenant_team",
    signature:
      "public.mutate_tenant_team(uuid,uuid,text,text,uuid,text,text,uuid,boolean,uuid[])",
    securityDefiner: true,
    volatility: "v",
    searchPath: "search_path=public, pg_temp",
    serviceExecute: true,
  },
];

const expectedProductTables = [
  "cms_campaign_versions",
  "cms_form_versions",
  "cms_page_versions",
  "cms_publication_schedules",
  "cms_reusable_blocks",
  "cms_template_versions",
  "cms_templates",
  "cms_testimonials",
  "crm_alerts",
  "crm_attachments",
  "crm_automation_rules",
  "crm_calendar_events",
  "crm_communication_jobs",
  "crm_contacts",
  "crm_idempotency",
  "crm_lead_assignments",
  "crm_lead_events",
  "crm_lead_tags",
  "crm_lead_tasks",
  "crm_pipeline_stages",
  "crm_pipelines",
  "crm_proposals",
  "crm_sla_policies",
  "crm_tags",
  "crm_visits",
  "platform_incidents",
  "platform_support_cases",
  "portal_connector_credential_verifiers",
  "tenant_marketing_connector_versions",
  "tenant_marketing_connectors",
  "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_attempts",
  "tenant_marketing_ingestion_events",
  "tenant_marketing_manual_import_rows",
  "tenant_marketing_manual_imports",
  "tenant_portal_exports",
  "tenant_portal_job_attempts",
  "tenant_portal_jobs",
  "tenant_portal_mappings",
  "tenant_tracking_connector_versions",
  "tenant_tracking_connectors",
  "tenant_tracking_consent_configuration",
  "tenant_tracking_diagnostics",
  "tenant_tracking_event_bindings",
  "tenant_upload_targets",
];

const expectedRemainingProductColumns = [
  "cms_campaigns.draft_version_id",
  "cms_campaigns.published_at",
  "cms_campaigns.published_version_id",
  "cms_campaigns.revision",
  "cms_campaigns.schema_version",
  "cms_campaigns.unpublished_at",
  "cms_forms.draft_version_id",
  "cms_forms.published_at",
  "cms_forms.published_version_id",
  "cms_forms.revision",
  "cms_forms.schema_version",
  "cms_forms.unpublished_at",
  "cms_pages.draft_version_id",
  "cms_pages.layout_type",
  "cms_pages.page_type",
  "cms_pages.published_version_id",
  "cms_pages.revision",
  "cms_pages.schema_version",
  "cms_pages.unpublished_at",
  "imovel_portais.connector_id",
  "imovel_portais.current_state",
  "imovel_portais.desired_state",
  "imovel_portais.last_job_id",
  "imovel_portais.revision",
  "leads.archived_at",
  "leads.assigned_team_id",
  "leads.latest_attribution",
  "leads.merge_state",
  "leads.merged_into_lead_id",
  "leads.normalized_email",
  "leads.normalized_phone",
  "leads.original_attribution",
  "leads.pipeline_id",
  "leads.qualification_key",
  "leads.stage_id",
  "portal_connectors.credential_reference",
  "portal_connectors.credential_state",
  "portal_connectors.credential_version",
  "portal_connectors.last_rotated_at",
  "portal_connectors.rotation_required",
  "portal_connectors.row_version",
  "portal_sync_logs.attempt_id",
  "portal_sync_logs.error_code",
  "portal_sync_logs.job_id",
  "portal_sync_logs.metadata",
  "site_settings_versions.based_on_revision",
  "site_settings_versions.content_hash",
  "site_settings_versions.revision",
  "site_settings_versions.updated_at",
  "tenant_marketing_connectors.adapter_version",
  "tenant_marketing_connectors.ingestion_actor_origin",
  "tenant_marketing_connectors.ingestion_actor_user_id",
  "tenant_marketing_connectors.last_fixture_verified_at",
  "tenant_marketing_connectors.provider_contract_version",
  "tenant_upload_targets.tenant_origin",
];

const productVersions = [
  "20260728165000",
  "20260728180000",
  "20260728233000",
  "20260729103000",
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

const w1RlsTables = [
  "rbac_modules",
  "rbac_profiles",
  "rbac_permissions",
  "user_profiles",
  "teams",
  "team_members",
  "audit_log",
];

function extractFunctionBody(source, marker) {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION ${marker}(`);
  assert.notEqual(start, -1, `missing function ${marker}`);
  const declaration = source.slice(start);
  const match = declaration.match(/\nAS \$([a-zA-Z0-9_]*)\$/);
  assert.ok(match, `missing dollar body for ${marker}`);
  const delimiter = `$${match[1]}$`;
  const bodyStart = start + match.index + match[0].length;
  const bodyEnd = source.indexOf(`${delimiter};`, bodyStart);
  assert.notEqual(bodyEnd, -1, `unterminated function ${marker}`);
  return source.slice(bodyStart, bodyEnd);
}

export function build() {
  const sources = W1.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `byte drift: ${entry.path}`);
    assert.equal(sha256(source), entry.sha256, `hash drift: ${entry.path}`);
    assert.ok(!source.includes("$pca07r2_lifecycle$"));
    assert.ok(!source.includes("$pca07r2_access$"));
    return source;
  });

  const expectedFunctions = functionSpecs.map((spec) => ({
    signature: spec.signature,
    prosrcSha256: sha256(extractFunctionBody(sources[spec.source], spec.marker)),
    securityDefiner: spec.securityDefiner,
    volatility: spec.volatility,
    searchPath: spec.searchPath,
    serviceExecute: spec.serviceExecute,
  }));

  assert.equal(expectedProductTables.length, 45);
  assert.equal(expectedRemainingProductColumns.length, 55);
  assert.equal(productVersions.length, 17);
  assert.equal(w1RlsTables.length, 7);

  const sql = `-- PCA-07R2 — forensic forward-only W1 ledger reconciliation.
-- Repository artifact only until a separate Owner-authorized Lovable execution gate.
-- One top-level DO statement: no W1 DDL/DML replay and no blind migration repair.
DO $pca07r2$
DECLARE
  v_lifecycle_source text := $pca07r2_lifecycle$
${sources[0]}$pca07r2_lifecycle$;
  v_access_source text := $pca07r2_access$
${sources[1]}$pca07r2_access$;
  v_current_query text := current_query();
  v_expected_functions jsonb := $pca07r2_json$
${JSON.stringify(expectedFunctions, null, 2)}
$pca07r2_json$::jsonb;
  v_product_versions text[] := ${sqlTextArray(productVersions)};
  v_product_tables text[] := ${sqlTextArray(expectedProductTables)};
  v_remaining_columns text[] := ${sqlTextArray(expectedRemainingProductColumns)};
  v_w1_rls_tables text[] := ${sqlTextArray(w1RlsTables)};
  v_authorized_tenant uuid := '9664d189-4a12-4caa-8243-dc73383447e6'::uuid;
  v_expected jsonb;
  v_oid oid;
  v_owner text;
  v_security_definer boolean;
  v_volatility \"char\";
  v_config text;
  v_prosrc_sha256 text;
  v_item text;
  v_table text;
  v_column text;
  v_count bigint;
  v_target_ledger_count bigint;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'PCA-07R2 database authority mismatch' USING ERRCODE = '42501';
  END IF;
  IF current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'PCA-07R2 requires PostgreSQL 17+' USING ERRCODE = '0A000';
  END IF;

  IF octet_length(v_lifecycle_source) <> ${W1[0].bytes}
     OR encode(extensions.digest(v_lifecycle_source, 'sha256'), 'hex') <> '${W1[0].sha256}' THEN
    RAISE EXCEPTION 'PCA-07R2 lifecycle source identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF octet_length(v_access_source) <> ${W1[1].bytes}
     OR encode(extensions.digest(v_access_source, 'sha256'), 'hex') <> '${W1[1].sha256}' THEN
    RAISE EXCEPTION 'PCA-07R2 access source identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL
     OR (SELECT count(*)
           FROM pg_attribute
          WHERE attrelid = 'supabase_migrations.schema_migrations'::regclass
            AND attnum > 0 AND NOT attisdropped
            AND ((attname = 'version' AND atttypid = 'text'::regtype AND attnotnull)
              OR (attname = 'name' AND atttypid = 'text'::regtype)
              OR (attname = 'statements' AND atttypid = 'text[]'::regtype)
              OR (attname = 'created_by' AND atttypid = 'text'::regtype)
              OR (attname = 'idempotency_key' AND atttypid = 'text'::regtype)
              OR (attname = 'rollback' AND atttypid = 'text[]'::regtype))) <> 6 THEN
    RAISE EXCEPTION 'PCA-07R2 Lovable-managed ledger schema mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF v_current_query IS NULL OR v_current_query NOT LIKE '%PCA-07R2 — forensic forward-only W1 ledger reconciliation%' THEN
    RAISE EXCEPTION 'PCA-07R2 current query attestation unavailable' USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_count
    FROM supabase_migrations.schema_migrations
   WHERE version = ANY(v_product_versions)
     AND version NOT IN ('${W1[0].version}', '${W1[1].version}');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected W2-W6 product ledger rows, found %', v_count USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_target_ledger_count
    FROM supabase_migrations.schema_migrations
   WHERE version IN ('${W1[0].version}', '${W1[1].version}', '${CORRECTIVE_VERSION}');
  IF v_target_ledger_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'PCA-07R2 partial target ledger state: %/3', v_target_ledger_count USING ERRCODE = 'P0001';
  END IF;
  IF v_target_ledger_count = 3 AND (
    SELECT count(*)
      FROM supabase_migrations.schema_migrations
     WHERE (version = '${W1[0].version}' AND name = '${W1[0].name}'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = 'pca-07r2:${W1[0].version}:${W1[0].sha256}'
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = '${W1[0].sha256}')
        OR (version = '${W1[1].version}' AND name = '${W1[1].name}'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = 'pca-07r2:${W1[1].version}:${W1[1].sha256}'
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = '${W1[1].sha256}')
        OR (version = '${CORRECTIVE_VERSION}'
            AND name = 'pca_07r2_w1_forensic_forward_only_ledger_reconciliation'
            AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
            AND idempotency_key = ('pca-07r2:${CORRECTIVE_VERSION}:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
            AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]
            AND encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex') = encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
  ) <> 3 THEN
    RAISE EXCEPTION 'PCA-07R2 existing target ledger identity mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations
              WHERE version > '20260826002000' AND version <> '${CORRECTIVE_VERSION}') THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected ledger entry after accepted security corrective' USING ERRCODE = 'P0001';
  END IF;

  IF to_regnamespace('prm2_rebaseline') IS NULL
     OR has_schema_privilege('anon', 'prm2_rebaseline', 'USAGE')
     OR has_schema_privilege('authenticated', 'prm2_rebaseline', 'USAGE')
     OR has_schema_privilege('service_role', 'prm2_rebaseline', 'USAGE') THEN
    RAISE EXCEPTION 'PCA-07R2 manifest schema boundary mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOR v_expected IN SELECT value FROM jsonb_array_elements(v_expected_functions)
  LOOP
    v_oid := to_regprocedure(v_expected->>'signature');
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'PCA-07R2 missing W1 function %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    SELECT owner_role.rolname, p.prosecdef, p.provolatile,
           array_to_string(p.proconfig, ','),
           encode(extensions.digest(p.prosrc, 'sha256'), 'hex')
      INTO v_owner, v_security_definer, v_volatility, v_config, v_prosrc_sha256
      FROM pg_proc p
      JOIN pg_roles owner_role ON owner_role.oid = p.proowner
     WHERE p.oid = v_oid;
    IF v_owner <> 'postgres'
       OR v_security_definer <> (v_expected->>'securityDefiner')::boolean
       OR v_volatility <> (v_expected->>'volatility')::\"char\"
       OR v_config IS DISTINCT FROM v_expected->>'searchPath'
       OR v_prosrc_sha256 <> v_expected->>'prosrcSha256' THEN
      RAISE EXCEPTION 'PCA-07R2 W1 function definition mismatch: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      WHERE p.oid = v_oid AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) OR has_function_privilege('anon', v_oid, 'EXECUTE')
      OR has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'PCA-07R2 W1 client function exposure: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
    IF has_function_privilege('service_role', v_oid, 'EXECUTE')
       <> (v_expected->>'serviceExecute')::boolean THEN
      RAISE EXCEPTION 'PCA-07R2 W1 service function ACL mismatch: %', v_expected->>'signature' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rbac_profiles'
       AND column_name = 'tenant_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'user_profiles'
       AND column_name = 'tenant_id' AND data_type = 'uuid' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 W1 tenant column mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
       WHERE conname IN ('rbac_profiles_tenant_contract', 'user_profiles_tenant_required')
         AND NOT convalidated) <> 2 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 NOT VALID constraint mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid IN ('public.rbac_profiles'::regclass, 'public.user_profiles'::regclass)
         AND contype = 'f' AND pg_get_constraintdef(oid, true) LIKE 'FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE') <> 2 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 tenant foreign key mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM pg_index idx JOIN pg_class i ON i.oid = idx.indexrelid
       WHERE i.relnamespace = 'public'::regnamespace
         AND i.relname IN ('ux_rbac_profiles_tenant_name', 'ux_user_profiles_tenant_user_profile',
                           'ix_user_profiles_tenant_user', 'ix_rbac_profiles_tenant',
                           'ux_rbac_permissions_profile_module_action')
         AND idx.indisvalid AND idx.indisready) <> 5 THEN
    RAISE EXCEPTION 'PCA-07R2 W1 index mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_index idx
     WHERE idx.indrelid = 'public.user_profiles'::regclass AND idx.indisunique
       AND (SELECT array_agg(a.attname::text ORDER BY x.ord)
              FROM unnest(idx.indkey::smallint[]) WITH ORDINALITY x(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = x.attnum
             WHERE x.attnum > 0)
           IN (ARRAY['profile_id','user_id']::text[], ARRAY['user_id','profile_id']::text[])
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 legacy two-column profile uniqueness remains' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
     WHERE t.tgrelid = 'public.user_roles'::regclass AND NOT t.tgisinternal
       AND (pg_get_functiondef(p.oid) ILIKE '%user_profiles%'
         OR pg_get_functiondef(p.oid) ILIKE '%rbac_profiles%')
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 incompatible user_roles trigger remains' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_item IN ARRAY v_w1_rls_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
       WHERE c.oid = to_regclass(format('public.%I', v_item)) AND c.relrowsecurity
    ) OR has_table_privilege('anon', format('public.%I', v_item), 'SELECT')
      OR has_table_privilege('anon', format('public.%I', v_item), 'INSERT')
      OR has_table_privilege('anon', format('public.%I', v_item), 'UPDATE')
      OR has_table_privilege('anon', format('public.%I', v_item), 'DELETE')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'SELECT')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'INSERT')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'UPDATE')
      OR has_table_privilege('authenticated', format('public.%I', v_item), 'DELETE')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'SELECT')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'INSERT')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'UPDATE')
      OR NOT has_table_privilege('service_role', format('public.%I', v_item), 'DELETE') THEN
      RAISE EXCEPTION 'PCA-07R2 W1 RLS/ACL mismatch: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.rbac_profiles WHERE tenant_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.user_profiles WHERE tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'PCA-07R2 unexpected W1 tenant assignment' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = v_authorized_tenant)
     OR (SELECT count(*) FROM public.tenants) <> 74
     OR (SELECT count(*) FROM public.tenants WHERE id <> v_authorized_tenant) <> 73
     OR (SELECT md5(string_agg(id::text, ',' ORDER BY id::text)) FROM public.tenants WHERE id <> v_authorized_tenant)
          <> '3ece053ddbdfce5161380ec38824ea91'
     OR (SELECT encode(extensions.digest(string_agg(id::text, ',' ORDER BY id::text), 'sha256'), 'hex')
           FROM public.tenants WHERE id <> v_authorized_tenant)
          <> 'a9c8f3fbcd4feff88dbc06330b121f00a08c7796a3b163dfda23a91450755e95'
     OR (SELECT count(*) FROM public.portal_connectors) <> 444
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id <> v_authorized_tenant) <> 438
     OR (SELECT count(*) FILTER (WHERE feed_token IS NOT NULL)
              + count(*) FILTER (WHERE webhook_secret IS NOT NULL) FROM public.portal_connectors) <> 888
     OR (SELECT count(*) FROM public.tenant_subscriptions) <> 0 THEN
    RAISE EXCEPTION 'PCA-07R2 protected tenant/portal baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF (SELECT count(*) FROM public.tenant_members WHERE tenant_id = v_authorized_tenant) <> 4
     OR (SELECT count(*) FROM public.leads WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.imoveis WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.form_submissions WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.corretores WHERE tenant_id = v_authorized_tenant) <> 4
     OR (SELECT count(*) FROM public.lead_origens WHERE tenant_id = v_authorized_tenant) <> 8
     OR (SELECT count(*) FROM public.cms_campaign_events WHERE tenant_id = v_authorized_tenant) <> 0
     OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id = v_authorized_tenant) <> 6
     OR (SELECT count(*) FROM storage.objects) <> 22
     OR (SELECT coalesce(sum((metadata->>'size')::bigint), 0) FROM storage.objects) <> 15826788 THEN
    RAISE EXCEPTION 'PCA-07R2 protected RM Prime baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF (SELECT count(*) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 1386
     OR (SELECT count(DISTINCT r.tenant_id) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 198
     OR (SELECT md5(string_agg(r.id::text, ',' ORDER BY r.id::text)) FROM public.lead_discard_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL)
          <> '862e725f8891430bb864021d3c3afe29'
     OR (SELECT count(*) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 1386
     OR (SELECT count(DISTINCT r.tenant_id) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL) <> 198
     OR (SELECT md5(string_agg(r.id::text, ',' ORDER BY r.id::text)) FROM public.deal_lost_reasons r LEFT JOIN public.tenants t ON t.id = r.tenant_id WHERE t.id IS NULL)
          <> 'dc43bd9b59a63b20bc37b1fa127b4131' THEN
    RAISE EXCEPTION 'PCA-07R2 orphan baseline mismatch' USING ERRCODE = 'P0001';
  END IF;

  FOREACH v_item IN ARRAY v_product_tables
  LOOP
    IF to_regclass(format('public.%I', v_item)) IS NOT NULL THEN
      RAISE EXCEPTION 'PCA-07R2 W2-W6 product table unexpectedly present: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  FOREACH v_item IN ARRAY v_remaining_columns
  LOOP
    v_table := split_part(v_item, '.', 1);
    v_column := split_part(v_item, '.', 2);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = v_table AND column_name = v_column
    ) THEN
      RAISE EXCEPTION 'PCA-07R2 W2-W6 product column unexpectedly present: %', v_item USING ERRCODE = 'P0001';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('provision_tenant_product_baseline',
                         'provision_authorized_tenant_product_baselines',
                         'provision_new_tenant_product_baseline')
  ) THEN
    RAISE EXCEPTION 'PCA-07R2 W6 orchestrator unexpectedly present' USING ERRCODE = 'P0001';
  END IF;

  IF v_target_ledger_count = 0 THEN
    INSERT INTO supabase_migrations.schema_migrations
      (version, statements, name, created_by, idempotency_key, rollback)
    VALUES
      ('${W1[0].version}', ARRAY[v_lifecycle_source], '${W1[0].name}',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:${W1[0].version}:${W1[0].sha256}', ARRAY[]::text[]),
      ('${W1[1].version}', ARRAY[v_access_source], '${W1[1].name}',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:${W1[1].version}:${W1[1].sha256}', ARRAY[]::text[]),
      ('${CORRECTIVE_VERSION}', ARRAY[v_current_query],
       'pca_07r2_w1_forensic_forward_only_ledger_reconciliation',
       'PCA-07R2_FORENSIC_RECONCILIATION',
       'pca-07r2:${CORRECTIVE_VERSION}:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'),
       ARRAY[]::text[]);
  END IF;

  IF (SELECT count(*) FROM supabase_migrations.schema_migrations
       WHERE version IN ('${W1[0].version}', '${W1[1].version}', '${CORRECTIVE_VERSION}')
         AND created_by = 'PCA-07R2_FORENSIC_RECONCILIATION'
         AND idempotency_key IS NOT NULL
         AND rollback IS NOT DISTINCT FROM ARRAY[]::text[]) <> 3
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '${W1[0].version}') IS DISTINCT FROM '${W1[0].name}'
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '${W1[1].version}') IS DISTINCT FROM '${W1[1].name}'
     OR (SELECT name FROM supabase_migrations.schema_migrations
           WHERE version = '${CORRECTIVE_VERSION}')
          IS DISTINCT FROM 'pca_07r2_w1_forensic_forward_only_ledger_reconciliation'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '${W1[0].version}')
          IS DISTINCT FROM 'pca-07r2:${W1[0].version}:${W1[0].sha256}'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '${W1[1].version}')
          IS DISTINCT FROM 'pca-07r2:${W1[1].version}:${W1[1].sha256}'
     OR (SELECT idempotency_key FROM supabase_migrations.schema_migrations
           WHERE version = '${CORRECTIVE_VERSION}')
          IS DISTINCT FROM ('pca-07r2:${CORRECTIVE_VERSION}:' || encode(extensions.digest(v_current_query, 'sha256'), 'hex'))
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '${W1[0].version}') IS DISTINCT FROM '${W1[0].sha256}'
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '${W1[1].version}') IS DISTINCT FROM '${W1[1].sha256}'
     OR (SELECT encode(extensions.digest(array_to_string(statements, ''), 'sha256'), 'hex')
           FROM supabase_migrations.schema_migrations WHERE version = '${CORRECTIVE_VERSION}')
          IS DISTINCT FROM encode(extensions.digest(v_current_query, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'PCA-07R2 atomic ledger postcondition mismatch' USING ERRCODE = 'P0001';
  END IF;
END;
$pca07r2$;
`;

  assert.equal((sql.match(/^DO \$pca07r2\$/gm) ?? []).length, 1);
  assert.equal((sql.match(/INSERT INTO supabase_migrations\.schema_migrations/g) ?? []).length, 1);
  assert.equal((sql.match(/v_lifecycle_source text :=/g) ?? []).length, 1);
  assert.equal((sql.match(/v_access_source text :=/g) ?? []).length, 1);
  assert.ok(!sql.includes("EXECUTE v_lifecycle_source"));
  assert.ok(!sql.includes("EXECUTE v_access_source"));

  return {
    sql,
    manifest: {
      schemaVersion: 1,
      gate: "PCA-07R2_W1_FORENSIC_FORWARD_ONLY_LEDGER_RECONCILIATION_REPOSITORY_IMPLEMENTATION",
      repository: "MrRodBH/prime-domus-hub",
      branch: "agent/pca-07r2-w1-forensic-forward-only-ledger-reconciliation",
      sourceMain: "a28f257c640a128327e9f0ce97974e48679fa05c",
      sourceTree: "036a95e952e23f4a659aafd93330961ccdb1a952",
      authority: {
        repository: "PROTECTED_GITHUB_MAIN_ONLY",
        backend: "LOVABLE_MANAGED_CANONICAL_BACKEND_ONLY",
        ownerSupabaseAccess: "LOVABLE_ONLY",
      },
      incident: {
        classification: "W1_COMMITTED_WITHOUT_LEDGER_TRANSPORT_DIVERGENCE",
        transportResult: "INVALID_ARGUMENT_AFTER_PERSISTED_SIDE_EFFECTS",
        exactTransportRootCauseProven: false,
        priorW1SourceBytes: 50566,
        priorDuplicatedSourceLowerBoundBytes: 101132,
        w1PhysicalPostconditionsPresent: true,
        w1LedgerRows: 0,
        w2ThroughW6Executed: false,
      },
      corrective: {
        version: CORRECTIVE_VERSION,
        path: CORRECTIVE_PATH,
        sha256: sha256(sql),
        bytes: Buffer.byteLength(sql),
        topLevelStatements: 1,
        sourceCopiesPerW1Migration: 1,
        replaysW1DdlOrDml: false,
        reconstructsExactW1LedgerRows: true,
        historicalRowsWrittenInsideStatement: 2,
        correctiveRowWrittenInsideStatement: true,
        ledgerColumns:
          ["version", "statements", "name", "created_by", "idempotency_key", "rollback"],
        retryMode: "ZERO_TO_EXACT_THREE_OR_EXACT_THREE_NOOP",
        atomicFailureMode: "SINGLE_POSTGRES_DO_FOR_ALL_THREE_ROWS",
      },
      w1: W1,
      expectedFunctions,
      expectedProductTables,
      expectedRemainingProductColumns,
      productVersions,
      w1RlsTables,
      liveReadOnlySnapshot: {
        observedAtUtc: "2026-08-28T16:11:12Z",
        database: "postgres",
        databaseUser: "postgres",
        postgresVersion: "17.6",
        w1Functions: 11,
        w1IndexesValidReady: 5,
        w1ConstraintsNotValid: 2,
        w1RlsRelations: 7,
        w1ClientTableExposures: 0,
        productTablesPresent: 0,
        productTablesMissing: 45,
        productColumnsPresent: ["rbac_profiles.tenant_id", "user_profiles.tenant_id"],
        productColumnsMissing: 55,
        productLedgerRows: 0,
        orchestratorFunctionsPresent: 0,
        tenants: 74,
        protectedResidues: 73,
        protectedResidueMd5: "3ece053ddbdfce5161380ec38824ea91",
        protectedResidueSha256: "a9c8f3fbcd4feff88dbc06330b121f00a08c7796a3b163dfda23a91450755e95",
        portalConnectors: 444,
        protectedResiduePortalConnectors: 438,
        retainedPortalSensitiveFields: 888,
        storageObjects: 22,
        storageBytes: 15826788,
        commercialRls: "9/9",
        commercialClientExposures: 0,
        restrictedFunctionsClientDenied: "5/5",
        quarantineExact: "4/4",
      },
      controls: {
        sameBackendReads: 0,
        sameBackendWrites: 0,
        lovableCalls: 0,
        directSupabaseCalls: 0,
        providerMutation: false,
        deploy: false,
        roadmapSiteUpdate: false,
        pr105Mutation: false,
        blindMigrationRepairAllowed: false,
        w1ReplayAllowed: false,
        w2ThroughW6Allowed: false,
      },
      successor: {
        repositoryAuditAndMergeRequired: true,
        separateLovableManagedExecutionGateRequired: true,
        continueAtW2OnlyAfterExactReconciliationPostflight: true,
      },
    },
  };
}

if (process.argv.includes("--write")) {
  const { sql, manifest } = build();
  writeFileSync(new URL(CORRECTIVE_PATH, ROOT), sql);
  writeFileSync(new URL(MANIFEST_PATH, ROOT), `${JSON.stringify(manifest, null, 2)}\n`);
}
