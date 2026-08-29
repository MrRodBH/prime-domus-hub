import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  ALL_TABLES,
  compactSql,
  MEDIA_AUTHORITY_INDEX,
  NEW_FUNCTIONS,
  W5,
} from "./build-pca-07-w5-transport-safe-corrective.mjs";

const ROOT = new URL("../", import.meta.url);
export const GATE =
  "PCA-07_W6_EXACT_MANIFEST_TENANT_PRODUCT_BASELINE_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w6-exact-manifest-baseline-transport-safe";
export const SOURCE_MAIN = "1e166099b54ad6414e5ba21444dab66787726380";
export const SOURCE_TREE = "3d12751a50df491160850f6880dd104337fb1e3d";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W6-exact-manifest-baseline-transport-safe-manifest.json";
export const MIGRATION = {
  version: "20260826185014",
  name: "pca_04_exact_tenant_product_baseline",
  path: "supabase/migrations/20260826185014_pca_04_exact_tenant_product_baseline.sql",
  bytes: 12120,
  sha256: "676d220920f313c2f567962bbab9f27a641d7bc22d2283edc6bc8f0a4b989989",
};
export const FUNCTIONS = [
  "public.provision_tenant_product_baseline(uuid)",
  "public.provision_authorized_tenant_product_baselines(uuid[],text,text)",
  "public.provision_new_tenant_product_baseline()",
];
export const TRIGGER = "trg_provision_new_tenant_product_baseline";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlTextArray = (values) => `ARRAY[${values.map(sqlString).join(",")}]`;
const pairs = (items) => items.map(([version, name]) => `('${version}','${name}')`).join(",");

export const HISTORICAL_W2 = [
  ["20260728233000", "pr_m2_configuration_center"],
  ["20260729103000", "pr_m2_portal_connectors"],
  ["20260829110000", "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
export const HISTORICAL_W3 = [
  ["20260729183000", "pr_m2_cms_content_management"],
  ["20260729211500", "pr_m2_crm_operational_workflows"],
  ["20260829145000", "pca_07_w3_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
export const HISTORICAL_W4 = [
  ["20260729233000", "pr_m2_marketing_connectors"],
  ["20260730010000", "pr_m2_tracking_consent_and_event_bindings"],
];
export const CANONICAL_W2 = [
  ["20260728233000", "pr_m2_configuration_center"],
  ["20260729103000", "pr_m2_portal_functional_completion"],
  ["20260829110000", "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
export const CANONICAL_W3 = [
  ["20260729183000", "pr_m2_cms_workflow_functional_completion"],
  ["20260729211500", "pr_m2_crm_operational_workflow"],
  ["20260829145000", "pca_07_w3_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
export const CANONICAL_W4 = [
  ["20260729233000", "pr_m2_marketing_channels_lead_ingestion"],
  ["20260730010000", "pr_m2_analytics_tracking_conversion_events"],
];

function canonicalProjection() {
  const source = readFileSync(new URL(MIGRATION.path, ROOT), "utf8");
  assert.equal(Buffer.byteLength(source), MIGRATION.bytes, "W6 canonical byte drift");
  assert.equal(sha256(source), MIGRATION.sha256, "W6 canonical hash drift");
  const begin = "\nBEGIN;\n";
  const commit = "\nCOMMIT;\n";
  assert.equal(source.split(begin).length - 1, 1, "W6 BEGIN boundary drift");
  assert.ok(source.endsWith(commit), "W6 COMMIT boundary drift");
  const withoutOuterTransaction = source.replace(begin, "\n").slice(0, -commit.length);
  const projected = `-- PCA-07 W6 executable projection: BYTE_IDENTICAL_SEMANTICS
-- PCA-07 W6 executable projection: TRANSPORT_SAFE_SQL_COMPACTION
${compactSql(withoutOuterTransaction)}`;
  return { source, projected };
}

const protectedBaseline = (tenantId) => `
IF (SELECT count(*) FROM public.tenants)<>74
OR (SELECT count(*) FROM public.portal_connectors)<>444
OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id='${tenantId}'::uuid)<>6
OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id<>'${tenantId}'::uuid)<>438
OR (SELECT count(*) FROM public.portal_connectors pc CROSS JOIN LATERAL
 (VALUES(NULLIF(pc.feed_token,'')),(NULLIF(pc.webhook_secret,'')))s(v) WHERE s.v IS NOT NULL)<>888
OR (SELECT count(*) FROM storage.objects)<>22
OR (SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects)<>15826788
THEN RAISE EXCEPTION 'PCA-07 W6 protected baseline drift' USING ERRCODE='P0001';END IF;`;

const tenantBaseline = (tenantId) => `
IF (SELECT count(*) FROM public.tenants WHERE id='${tenantId}'::uuid)<>1
OR (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id='${tenantId}'::uuid AND key='configuration')<>1
OR (SELECT count(*) FROM public.crm_pipelines WHERE tenant_id='${tenantId}'::uuid AND pipeline_key='sales_default' AND is_default AND ativo)<>1
OR (SELECT count(*) FROM public.crm_pipeline_stages s JOIN public.crm_pipelines p ON p.id=s.pipeline_id AND p.tenant_id=s.tenant_id WHERE p.tenant_id='${tenantId}'::uuid AND p.pipeline_key='sales_default')<>7
OR (SELECT count(*) FROM public.tenant_marketing_connectors WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_connector_versions WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_field_mappings WHERE tenant_id='${tenantId}'::uuid AND is_current)<>4
OR (SELECT count(*) FROM public.tenant_tracking_connectors WHERE tenant_id='${tenantId}'::uuid)<>3
OR (SELECT count(*) FROM public.tenant_tracking_connector_versions WHERE tenant_id='${tenantId}'::uuid)<>3
OR (SELECT count(*) FROM public.tenant_tracking_event_bindings WHERE tenant_id='${tenantId}'::uuid)<>36
OR (SELECT count(*) FROM public.tenant_tracking_consent_configuration WHERE tenant_id='${tenantId}'::uuid)<>1
THEN RAISE EXCEPTION 'PCA-07 W6 exact tenant baseline mismatch' USING ERRCODE='P0001';END IF;`;

function preflight(tenantId, priorLedgerCanonicalNames) {
  const w5Pairs = pairs(W5.map((entry) => [entry.version, entry.name]));
  const w2 = priorLedgerCanonicalNames ? CANONICAL_W2 : HISTORICAL_W2;
  const w3 = priorLedgerCanonicalNames ? CANONICAL_W3 : HISTORICAL_W3;
  const w4 = priorLedgerCanonicalNames ? CANONICAL_W4 : HISTORICAL_W4;
  return `DO $w6pre$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_item text;BEGIN
IF current_database()<>'postgres' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
THEN RAISE EXCEPTION 'PCA-07 W6 backend identity mismatch' USING ERRCODE='P0001';END IF;
SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_columns FROM pg_attribute a
WHERE a.attrelid='supabase_migrations.schema_migrations'::regclass AND a.attnum>0 AND NOT a.attisdropped;
IF v_columns IS DISTINCT FROM ARRAY['version','statements','name','created_by','idempotency_key','rollback']::text[]
THEN RAISE EXCEPTION 'PCA-07 W6 ledger schema mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*),count(*)FILTER(WHERE tenant_id='${tenantId}'::uuid) INTO v_count,v_target_count FROM prm2_rebaseline.authorized_tenant_ids();
IF v_count<>1 OR v_target_count<>1 THEN RAISE EXCEPTION 'PCA-07 W6 tenant manifest mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE
(sm.version='20260728165000' AND sm.name='pr_m2_tenant_lifecycle' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=20253 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8') OR
(sm.version='20260728180000' AND sm.name='pr_m2_tenant_access_control' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=30313 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e') OR
(sm.version='20260828160617' AND sm.name='pca_07r2_w1_forensic_forward_only_ledger_reconciliation' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=77274 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W6 W1 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${pairs(w2)}) AND sm.created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.idempotency_key='pca-07-w2:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W6 W2 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${pairs(w3)}) AND sm.created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.idempotency_key='pca-07-w3:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W6 W3 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${pairs(w4)}) AND sm.created_by='PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.idempotency_key='pca-07-w4:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>2 THEN RAISE EXCEPTION 'PCA-07 W6 W4 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${w5Pairs}) AND sm.created_by='PCA-07_W5_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.idempotency_key='pca-07-w5:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>8 THEN RAISE EXCEPTION 'PCA-07 W6 W5 ledger mismatch' USING ERRCODE='P0001';END IF;
IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${MIGRATION.version}')
THEN RAISE EXCEPTION 'PCA-07 W6 ledger unexpectedly present' USING ERRCODE='P0001';END IF;
FOREACH v_item IN ARRAY ${sqlTextArray(ALL_TABLES)} LOOP
 IF to_regclass('public.'||v_item) IS NULL THEN RAISE EXCEPTION 'PCA-07 W6 missing W5 table: %',v_item USING ERRCODE='P0001';END IF;
END LOOP;
FOREACH v_item IN ARRAY ${sqlTextArray(NEW_FUNCTIONS)} LOOP
 IF to_regprocedure(v_item) IS NULL THEN RAISE EXCEPTION 'PCA-07 W6 missing W5 function: %',v_item USING ERRCODE='P0001';END IF;
END LOOP;
FOREACH v_item IN ARRAY ${sqlTextArray(FUNCTIONS)} LOOP
 IF to_regprocedure(v_item) IS NOT NULL THEN RAISE EXCEPTION 'PCA-07 W6 function unexpectedly present: %',v_item USING ERRCODE='P0001';END IF;
END LOOP;
IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.tenants'::regclass AND tgname='${TRIGGER}' AND NOT tgisinternal)
OR to_regprocedure('public.validate_tenant_configuration_snapshot(uuid,jsonb)') IS NULL
OR to_regprocedure('extensions.digest(text,text)') IS NULL
OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid='public.${MEDIA_AUTHORITY_INDEX}'::regclass AND indisunique AND indisvalid AND indpred IS NULL)
THEN RAISE EXCEPTION 'PCA-07 W6 dependency state mismatch' USING ERRCODE='P0001';END IF;
${tenantBaseline(tenantId)}
${protectedBaseline(tenantId)}
END;$w6pre$;`;
}

function postflight(tenantId) {
  return `DO $w6post$ DECLARE v_count bigint;v_item text;v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm
WHERE sm.version='${MIGRATION.version}' AND sm.name='${MIGRATION.name}'
AND sm.created_by='PCA-07_W6_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
AND array_length(sm.statements,1)=1 AND sm.statements[1]=v_query
AND sm.idempotency_key='pca-07-w6:${MIGRATION.version}:'||v_sha
AND coalesce(array_length(sm.rollback,1),0)=0;
IF v_count<>1 THEN RAISE EXCEPTION 'PCA-07 W6 ledger mismatch' USING ERRCODE='P0001';END IF;
FOREACH v_item IN ARRAY ${sqlTextArray(FUNCTIONS)} LOOP
 IF to_regprocedure(v_item) IS NULL THEN RAISE EXCEPTION 'PCA-07 W6 function missing: %',v_item USING ERRCODE='P0001';END IF;
END LOOP;
IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.tenants'::regclass AND tgname='${TRIGGER}' AND NOT tgisinternal)<>1
THEN RAISE EXCEPTION 'PCA-07 W6 trigger mismatch' USING ERRCODE='P0001';END IF;
IF has_function_privilege('anon','public.provision_tenant_product_baseline(uuid)','EXECUTE')
OR has_function_privilege('authenticated','public.provision_tenant_product_baseline(uuid)','EXECUTE')
OR has_function_privilege('service_role','public.provision_tenant_product_baseline(uuid)','EXECUTE')
OR has_function_privilege('anon','public.provision_authorized_tenant_product_baselines(uuid[],text,text)','EXECUTE')
OR has_function_privilege('authenticated','public.provision_authorized_tenant_product_baselines(uuid[],text,text)','EXECUTE')
OR NOT has_function_privilege('service_role','public.provision_authorized_tenant_product_baselines(uuid[],text,text)','EXECUTE')
OR has_function_privilege('anon','public.provision_new_tenant_product_baseline()','EXECUTE')
OR has_function_privilege('authenticated','public.provision_new_tenant_product_baseline()','EXECUTE')
THEN RAISE EXCEPTION 'PCA-07 W6 function ACL mismatch' USING ERRCODE='P0001';END IF;
${tenantBaseline(tenantId)}
${protectedBaseline(tenantId)}
END;$w6post$;`;
}

export function buildApplication({ tenantId, ownerAuthorization, priorLedgerCanonicalNames = false }) {
  assert.match(tenantId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "exact tenant UUID required");
  assert.match(ownerAuthorization, /^PCA-[0-9A-Z_-]{3,120}$/, "bounded PCA authorization required");
  const { projected } = canonicalProjection();
  const manifestSha256 = sha256(tenantId.toLowerCase());
  const sql = compactSql(`-- PCA-07 W6 Lovable-managed exact-manifest atomic envelope
BEGIN;
SET LOCAL search_path=public,extensions,pg_temp;
SELECT set_config('app.pr_m2_authorized_tenant_ids','["${tenantId}"]',true);
SELECT set_config('app.pr_m2_authorized_tenant_manifest_sha256','${manifestSha256}',true);
SELECT set_config('app.pr_m2_owner_authorization',${sqlString(ownerAuthorization)},true);
${preflight(tenantId, priorLedgerCanonicalNames)}
${projected}
DO $w6apply$ DECLARE v_result jsonb;BEGIN
SELECT public.provision_authorized_tenant_product_baselines(ARRAY['${tenantId}'::uuid],'${manifestSha256}',${sqlString(ownerAuthorization)}) INTO v_result;
IF v_result->>'completed'<>'true' OR (v_result->>'tenantCount')::integer<>1 OR v_result->>'manifestSha256'<>'${manifestSha256}'
THEN RAISE EXCEPTION 'PCA-07 W6 exact manifest application mismatch' USING ERRCODE='P0001';END IF;
END;$w6apply$;
DO $w6ledger$ DECLARE v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
INSERT INTO supabase_migrations.schema_migrations(version,statements,name,created_by,idempotency_key,rollback)
VALUES('${MIGRATION.version}',ARRAY[v_query],'${MIGRATION.name}','PCA-07_W6_LOVABLE_MANAGED_CONTROLLED_APPLICATION','pca-07-w6:${MIGRATION.version}:'||v_sha,ARRAY[]::text[]);
END;$w6ledger$;
${postflight(tenantId)}
COMMIT;
`);
  return {
    envelope: {
      capability: "EXACT_MANIFEST_TENANT_PRODUCT_BASELINE",
      versions: [MIGRATION.version],
      sql,
      bytes: Buffer.byteLength(sql),
      sha256: sha256(sql),
    },
    runtime: { authorization: ownerAuthorization, exactTenantCount: 1, tenantManifestSha256: manifestSha256 },
  };
}

export function buildContract() {
  const { projected } = canonicalProjection();
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
    migration: {
      ...MIGRATION,
      projectedBodyBytes: Buffer.byteLength(projected),
      projectedBodySha256: sha256(projected),
    },
    corrective: {
      executionMode: "ONE_EXACT_MANIFEST_ATOMIC_ENVELOPE",
      semanticProjection: "BYTE_IDENTICAL_SEMANTICS",
      transportCompaction: "DETERMINISTIC_LITERAL_PRESERVING_SQL_COMPACTION",
      exactTenantCount: 1,
      tenantManifestSha256: "5cdb260e43d782fbebf29ea73a21ed557e3da5c70438fe82a97e03f186e7b0b9",
      existingTenantApplication: "IDEMPOTENT_EXACT_MANIFEST_ONLY",
      futureTenantProvisioning: "SERVER_OWNED_TRIGGER",
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      blindReplayAllowed: false,
    },
    liveReadOnlyBaseline: {
      postgresVersion: "17.6",
      tenantCount: 74,
      exactTargetCount: 1,
      w5LedgerRows: 8,
      w6LedgerRows: 0,
      w6FunctionsPresent: 0,
      w6TriggerPresent: 0,
      configurationRows: 1,
      salesDefaultPipelines: 1,
      salesStages: 7,
      marketingConnectors: 4,
      marketingVersions: 4,
      marketingCurrentMappings: 4,
      trackingConnectors: 3,
      trackingVersions: 3,
      trackingBindings: 36,
      trackingConsentRows: 1,
      portalConnectorCount: 444,
      retainedSensitiveFields: 888,
      storageObjectCount: 22,
      storageBytes: 15826788,
    },
    security: {
      functions: FUNCTIONS,
      trigger: TRIGGER,
      directProvisionFunctionDeniedToServiceRole: true,
      authorizedOrchestratorServiceRoleOnly: true,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"],
    },
    controls: {
      repositoryImplementationOnly: true,
      sameBackendReads: 0,
      sameBackendWrites: 0,
      directSupabaseCalls: 0,
      providerMutation: false,
      deploy: false,
      roadmapUpdate: false,
      pr105Mutation: false,
      canonicalMigrationMutation: false,
    },
  };
}
