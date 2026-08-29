import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

export const GATE =
  "PCA-07_W4_MARKETING_TRACKING_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w4-marketing-tracking-transport-safe-corrective";
export const SOURCE_MAIN = "81778245b814eaea0ff54e5333a73f88fd8af12c";
export const SOURCE_TREE = "93af3337a2f8b957b0193a3ce288be9ed088d832";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W4-transport-safe-compatibility-manifest.json";

export const W4 = [
  {
    capability: "MARKETING",
    version: "20260729233000",
    name: "pr_m2_marketing_channels_lead_ingestion",
    path: "supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql",
    bytes: 61551,
    sha256: "eb96b8b2511a348b7b2467b39ec698a030d8a96e41ad49e01fe7b8ae65863c94",
  },
  {
    capability: "TRACKING",
    version: "20260730010000",
    name: "pr_m2_analytics_tracking_conversion_events",
    path: "supabase/migrations/20260730010000_pr_m2_analytics_tracking_conversion_events.sql",
    bytes: 24050,
    sha256: "18aef311ead8a2b0d2b12826ee29ff513b148f3a84f0a19e5cec66c63e7e6aa6",
  },
];

const W3_LEDGER = [
  ["20260729183000", "pr_m2_cms_workflow_functional_completion"],
  ["20260729211500", "pr_m2_crm_operational_workflow"],
  ["20260829145000", "pca_07_w3_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
const W2_LEDGER = [
  ["20260728233000", "pr_m2_configuration_center"],
  ["20260729103000", "pr_m2_portal_functional_completion"],
  ["20260829110000", "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
const LATER_VERSIONS = [
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

export const MARKETING_TABLES = [
  "tenant_marketing_connectors",
  "tenant_marketing_connector_versions",
  "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_events",
  "tenant_marketing_ingestion_attempts",
  "tenant_marketing_manual_imports",
  "tenant_marketing_manual_import_rows",
];
export const MARKETING_FUNCTIONS = [
  "public.assert_tenant_marketing_authority(uuid,uuid,text,text)",
  "public.marketing_config_contains_secret(jsonb)",
  "public.save_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text)",
  "public.publish_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,boolean)",
  "public.set_tenant_marketing_credential_reference(uuid,uuid,text,uuid,bigint,text)",
  "public.save_tenant_marketing_mapping(uuid,uuid,text,uuid,integer,jsonb)",
  "public.reserve_marketing_ingestion_payload(uuid,text,text,jsonb,integer)",
  "public.complete_marketing_ingestion_payload(uuid,bigint,text,uuid,uuid[],text)",
  "public.create_tenant_marketing_manual_import(uuid,uuid,text,uuid,text,text,text,text,jsonb)",
  "public.execute_tenant_marketing_manual_import(uuid,uuid,text,uuid,bigint)",
  "public.retry_tenant_marketing_ingestion(uuid,uuid,text,uuid,bigint)",
];
export const MARKETING_CREATED_FUNCTIONS = [
  "public.prevent_marketing_attempt_mutation()",
  ...MARKETING_FUNCTIONS,
];
export const TRACKING_TABLES = [
  "tenant_tracking_connectors",
  "tenant_tracking_connector_versions",
  "tenant_tracking_event_bindings",
  "tenant_tracking_diagnostics",
  "tenant_tracking_consent_configuration",
];
export const TRACKING_FUNCTIONS = [
  "public.assert_tenant_tracking_authority(uuid,uuid,text,text)",
  "public.save_tenant_tracking_connector(uuid,uuid,text,uuid,bigint,text,boolean)",
  "public.save_tenant_tracking_event_bindings(uuid,uuid,text,uuid,integer,jsonb)",
  "public.save_tenant_tracking_consent_configuration(uuid,uuid,text,bigint,boolean,integer)",
];
export const TRACKING_CREATED_FUNCTIONS = [
  "public.prevent_tracking_diagnostic_mutation()",
  ...TRACKING_FUNCTIONS,
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sqlString = (value) => `'${value.replaceAll("'", "''")}'`;
const sqlTextArray = (values) => `ARRAY[${values.map(sqlString).join(",")}]::text[]`;
const occurrences = (value, needle) => value.split(needle).length - 1;

function replaceOnce(source, needle, replacement, label) {
  assert.equal(occurrences(source, needle), 1, `${label} source shape drift`);
  return source.replace(needle, () => replacement);
}

function stripTransaction(source, label) {
  let projected = replaceOnce(source, "\nBEGIN;\n", "\n", `${label} BEGIN`);
  projected = replaceOnce(projected, "\nCOMMIT;\n", "\n", `${label} COMMIT`);
  return projected;
}

export function compactSql(source) {
  let output = "";
  let index = 0;
  let pendingSpace = false;
  const appendSpace = () => {
    if (output && !output.endsWith(" ")) output += " ";
  };
  while (index < source.length) {
    const current = source[index];
    const next = source[index + 1];
    if (current === "'" || current === '"') {
      if (pendingSpace) appendSpace();
      pendingSpace = false;
      const quote = current;
      output += current;
      index += 1;
      while (index < source.length) {
        output += source[index];
        if (source[index] === quote) {
          if (source[index + 1] === quote) {
            output += source[index + 1];
            index += 2;
            continue;
          }
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (current === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        if (pendingSpace) appendSpace();
        pendingSpace = false;
        const tag = match[0];
        const close = source.indexOf(tag, index + tag.length);
        assert.notEqual(close, -1, `unterminated dollar quote ${tag}`);
        const body = source.slice(index + tag.length, close);
        output += `${tag}${compactSql(body).trim()}${tag}`;
        index = close + tag.length;
        continue;
      }
    }
    if (current === "-" && next === "-") {
      index += 2;
      while (index < source.length && source[index] !== "\n") index += 1;
      pendingSpace = true;
      continue;
    }
    if (current === "/" && next === "*") {
      index += 2;
      while (index + 1 < source.length && !(source[index] === "*" && source[index + 1] === "/"))
        index += 1;
      assert.ok(index + 1 < source.length, "unterminated block comment");
      index += 2;
      pendingSpace = true;
      continue;
    }
    if (/\s/.test(current)) {
      pendingSpace = true;
      index += 1;
      continue;
    }
    if (pendingSpace) appendSpace();
    pendingSpace = false;
    output += current;
    index += 1;
  }
  return `${output.trim()}\n`;
}

export function projectMigration(source, capability) {
  const body = compactSql(stripTransaction(source, capability));
  return `-- PCA-07 W4 executable projection: BYTE_IDENTICAL_SEMANTICS\n-- PCA-07 W4 executable projection: TRANSPORT_SAFE_SQL_COMPACTION\n${body}`;
}

function readAndProject() {
  return W4.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `${entry.path} byte drift`);
    assert.equal(sha256(source), entry.sha256, `${entry.path} hash drift`);
    const projected = projectMigration(source, entry.capability);
    return {
      ...entry,
      projected,
      projectedBytes: Buffer.byteLength(projected),
      projectedSha256: sha256(projected),
    };
  });
}

const catalogCount = (items, present, kind, label) => {
  const expression =
    kind === "table"
      ? "to_regclass('public.'||x.name) IS NOT NULL"
      : "to_regprocedure(x.name) IS NOT NULL";
  return `SELECT count(*) INTO v_count FROM unnest(${sqlTextArray(items)}) x(name) WHERE ${expression};IF v_count<>${present ? items.length : 0} THEN RAISE EXCEPTION 'PCA-07 W4 ${label} ${kind} state mismatch' USING ERRCODE='P0001';END IF;`;
};

const protectedBaseline = (tenantId) => `
IF (SELECT count(*) FROM public.tenants)<>74
OR (SELECT count(*) FROM public.portal_connectors)<>444
OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id='${tenantId}'::uuid)<>6
OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id<>'${tenantId}'::uuid)<>438
OR (SELECT count(*) FROM public.portal_connectors pc CROSS JOIN LATERAL
 (VALUES(NULLIF(pc.feed_token,'')),(NULLIF(pc.webhook_secret,'')))s(v) WHERE s.v IS NOT NULL)<>888
OR (SELECT count(*) FROM storage.objects)<>22
OR (SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects)<>15826788
THEN RAISE EXCEPTION 'PCA-07 W4 protected baseline drift' USING ERRCODE='P0001';END IF;`;

const laterLedger = `IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=ANY(${sqlTextArray(LATER_VERSIONS)})) THEN RAISE EXCEPTION 'PCA-07 W4 later-wave ledger present' USING ERRCODE='P0001';END IF;`;

const aclAssertion = (tables, functions, label) => `
FOREACH v_table IN ARRAY ${sqlTextArray(tables)} LOOP
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||v_table)::regclass)
 THEN RAISE EXCEPTION 'PCA-07 W4 ${label} RLS missing: %',v_table USING ERRCODE='P0001';END IF;
 FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(v_role,'public.'||v_table,'SELECT') OR has_table_privilege(v_role,'public.'||v_table,'INSERT')
  OR has_table_privilege(v_role,'public.'||v_table,'UPDATE') OR has_table_privilege(v_role,'public.'||v_table,'DELETE')
  THEN RAISE EXCEPTION 'PCA-07 W4 ${label} client ACL exposure: %.%',v_role,v_table USING ERRCODE='P0001';END IF;
 END LOOP;
 IF NOT has_table_privilege('service_role','public.'||v_table,'SELECT')
 OR NOT has_table_privilege('service_role','public.'||v_table,'INSERT')
 OR NOT has_table_privilege('service_role','public.'||v_table,'UPDATE')
 OR NOT has_table_privilege('service_role','public.'||v_table,'DELETE')
 THEN RAISE EXCEPTION 'PCA-07 W4 ${label} service ACL missing: %',v_table USING ERRCODE='P0001';END IF;
END LOOP;
FOREACH v_signature IN ARRAY ${sqlTextArray(functions)} LOOP
 IF has_function_privilege('anon',v_signature,'EXECUTE') OR has_function_privilege('authenticated',v_signature,'EXECUTE')
 OR NOT has_function_privilege('service_role',v_signature,'EXECUTE')
 THEN RAISE EXCEPTION 'PCA-07 W4 ${label} function ACL mismatch: %',v_signature USING ERRCODE='P0001';END IF;
END LOOP;`;

function commonPreflight(tenantId) {
  const w3Values = W3_LEDGER.map(([version, name]) => `('${version}','${name}')`).join(",");
  const w2Values = W2_LEDGER.map(([version, name]) => `('${version}','${name}')`).join(",");
  return `
IF current_database()<>'postgres' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
THEN RAISE EXCEPTION 'PCA-07 W4 backend identity mismatch' USING ERRCODE='P0001';END IF;
SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_columns FROM pg_attribute a
WHERE a.attrelid='supabase_migrations.schema_migrations'::regclass AND a.attnum>0 AND NOT a.attisdropped;
IF v_columns IS DISTINCT FROM ARRAY['version','statements','name','created_by','idempotency_key','rollback']::text[]
THEN RAISE EXCEPTION 'PCA-07 W4 ledger schema mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*),count(*)FILTER(WHERE tenant_id='${tenantId}'::uuid) INTO v_count,v_target_count FROM prm2_rebaseline.authorized_tenant_ids();
IF v_count<>1 OR v_target_count<>1 THEN RAISE EXCEPTION 'PCA-07 W4 tenant manifest mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE
(sm.version='20260728165000' AND sm.name='pr_m2_tenant_lifecycle' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=20253 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8'
 AND sm.idempotency_key='pca-07r2:20260728165000:8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8') OR
(sm.version='20260728180000' AND sm.name='pr_m2_tenant_access_control' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=30313 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e'
 AND sm.idempotency_key='pca-07r2:20260728180000:3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e') OR
(sm.version='20260828160617' AND sm.name='pca_07r2_w1_forensic_forward_only_ledger_reconciliation' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=77274 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa'
 AND sm.idempotency_key='pca-07r2:20260828160617:3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W4 W1 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm
WHERE (sm.version,sm.name) IN (VALUES ${w2Values})
AND sm.created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
AND sm.idempotency_key='pca-07-w2:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex')
AND COALESCE(array_length(sm.rollback,1),0)=0;
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W4 W2 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm
WHERE (sm.version,sm.name) IN (VALUES ${w3Values})
AND sm.created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
AND sm.idempotency_key='pca-07-w3:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex')
AND COALESCE(array_length(sm.rollback,1),0)=0;
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W4 W3 ledger mismatch' USING ERRCODE='P0001';END IF;
IF to_regprocedure('public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action)') IS NULL
OR to_regprocedure('public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text)') IS NULL
OR to_regprocedure('public.transition_lead_status(uuid,text,integer,uuid,jsonb)') IS NULL
OR to_regprocedure('public.transition_lead_status(uuid,text,bigint,uuid,jsonb)') IS NOT NULL
OR to_regprocedure('pg_catalog.min(uuid)') IS NOT NULL
THEN RAISE EXCEPTION 'PCA-07 W4 dependency signature mismatch' USING ERRCODE='P0001';END IF;
${protectedBaseline(tenantId)}${laterLedger}`;
}

function marketingPreflight(tenantId) {
  return `DO $w4m_pre$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];BEGIN
${commonPreflight(tenantId)}
${catalogCount(MARKETING_TABLES, false, "table", "marketing")}
${catalogCount(MARKETING_CREATED_FUNCTIONS, false, "function", "marketing")}
${catalogCount(TRACKING_TABLES, false, "table", "tracking")}
${catalogCount(TRACKING_CREATED_FUNCTIONS, false, "function", "tracking")}
IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN ('${W4[0].version}','${W4[1].version}'))
OR (SELECT count(*) FROM public.leads WHERE tenant_id='${tenantId}'::uuid)<>0
OR (SELECT count(*) FROM public.cms_form_versions WHERE tenant_id='${tenantId}'::uuid)<>1
OR (SELECT count(*) FROM public.cms_campaign_versions WHERE tenant_id='${tenantId}'::uuid)<>1
OR (SELECT count(*) FROM public.crm_pipelines WHERE tenant_id='${tenantId}'::uuid AND is_default AND ativo)<>1
OR (SELECT count(*) FROM public.crm_pipeline_stages WHERE tenant_id='${tenantId}'::uuid)<>7
THEN RAISE EXCEPTION 'PCA-07 W4 marketing target boundary mismatch' USING ERRCODE='P0001';END IF;
END;$w4m_pre$;`;
}

function marketingState(tenantId) {
  return `
IF (SELECT count(*) FROM public.tenant_marketing_connectors WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_connector_versions WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_field_mappings WHERE tenant_id='${tenantId}'::uuid AND is_current)<>4
OR (SELECT count(*) FROM public.tenant_marketing_ingestion_events WHERE tenant_id='${tenantId}'::uuid)<>0
OR (SELECT count(*) FROM public.tenant_marketing_ingestion_attempts WHERE tenant_id='${tenantId}'::uuid)<>0
OR (SELECT count(*) FROM public.tenant_marketing_manual_imports WHERE tenant_id='${tenantId}'::uuid)<>0
OR (SELECT count(*) FROM public.tenant_marketing_manual_import_rows WHERE tenant_id='${tenantId}'::uuid)<>0
THEN RAISE EXCEPTION 'PCA-07 W4 marketing data state mismatch' USING ERRCODE='P0001';END IF;`;
}

function marketingPostflight(tenantId) {
  return `DO $w4m_post$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_table text;v_role text;v_signature text;v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W4[0].version}' AND name='${W4[0].name}'
AND created_by='PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(statements,1)=1 AND statements[1]=v_query
AND idempotency_key='pca-07-w4:${W4[0].version}:'||v_sha AND COALESCE(array_length(rollback,1),0)=0)<>1
THEN RAISE EXCEPTION 'PCA-07 W4 marketing ledger mismatch' USING ERRCODE='P0001';END IF;
${catalogCount(MARKETING_TABLES, true, "table", "marketing")}
${catalogCount(MARKETING_CREATED_FUNCTIONS, true, "function", "marketing")}
${catalogCount(TRACKING_TABLES, false, "table", "tracking")}
${marketingState(tenantId)}${aclAssertion(MARKETING_TABLES, MARKETING_FUNCTIONS, "marketing")}
${protectedBaseline(tenantId)}${laterLedger}
END;$w4m_post$;`;
}

function trackingPreflight(tenantId) {
  return `DO $w4t_pre$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];BEGIN
${commonPreflight(tenantId)}
IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W4[0].version}' AND name='${W4[0].name}'
AND created_by='PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(statements,1)=1
AND idempotency_key='pca-07-w4:${W4[0].version}:'||encode(extensions.digest(statements[1],'sha256'),'hex'))<>1
OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='${W4[1].version}')
THEN RAISE EXCEPTION 'PCA-07 W4 tracking ledger boundary mismatch' USING ERRCODE='P0001';END IF;
${catalogCount(MARKETING_TABLES, true, "table", "marketing")}${marketingState(tenantId)}
${catalogCount(TRACKING_TABLES, false, "table", "tracking")}
${catalogCount(TRACKING_CREATED_FUNCTIONS, false, "function", "tracking")}
IF (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id='${tenantId}'::uuid AND key='configuration' AND status='published')<>1
OR (SELECT count(*) FROM public.site_settings WHERE tenant_id='${tenantId}'::uuid AND key='meta_integracao')<>1
THEN RAISE EXCEPTION 'PCA-07 W4 tracking source cardinality mismatch' USING ERRCODE='P0001';END IF;
END;$w4t_pre$;`;
}

function trackingPostflight(tenantId) {
  return `DO $w4t_post$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_table text;v_role text;v_signature text;v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('${W4[0].version}','${W4[1].version}'))<>2
OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W4[1].version}' AND name='${W4[1].name}'
AND created_by='PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND statements[1]=v_query
AND idempotency_key='pca-07-w4:${W4[1].version}:'||v_sha AND COALESCE(array_length(rollback,1),0)=0)<>1
THEN RAISE EXCEPTION 'PCA-07 W4 tracking ledger mismatch' USING ERRCODE='P0001';END IF;
${catalogCount(TRACKING_TABLES, true, "table", "tracking")}
${catalogCount(TRACKING_CREATED_FUNCTIONS, true, "function", "tracking")}
IF (SELECT count(*) FROM public.tenant_tracking_connectors WHERE tenant_id='${tenantId}'::uuid)<>3
OR (SELECT count(*) FROM public.tenant_tracking_connectors WHERE tenant_id='${tenantId}'::uuid AND enabled AND provider_identifier IS NOT NULL)<>1
OR (SELECT count(*) FROM public.tenant_tracking_connector_versions WHERE tenant_id='${tenantId}'::uuid)<>3
OR (SELECT count(*) FROM public.tenant_tracking_event_bindings WHERE tenant_id='${tenantId}'::uuid)<>36
OR (SELECT count(*) FROM public.tenant_tracking_event_bindings WHERE tenant_id='${tenantId}'::uuid AND enabled)<>3
OR (SELECT count(*) FROM public.tenant_tracking_diagnostics WHERE tenant_id='${tenantId}'::uuid)<>0
OR (SELECT count(*) FROM public.tenant_tracking_consent_configuration WHERE tenant_id='${tenantId}'::uuid AND schema_version=1 AND analytics_mode='opt_in' AND marketing_mode='opt_in')<>1
THEN RAISE EXCEPTION 'PCA-07 W4 tracking data state mismatch' USING ERRCODE='P0001';END IF;
${aclAssertion(TRACKING_TABLES, TRACKING_FUNCTIONS, "tracking")}
${protectedBaseline(tenantId)}${laterLedger}
END;$w4t_post$;`;
}

function prelude(tenantId, ownerAuthorization, capability) {
  const manifest = JSON.stringify([tenantId]);
  return `-- PCA-07 W4 Lovable-managed migration-local envelope: ${capability}\nBEGIN;\nSET LOCAL search_path=public,extensions,pg_temp;\nSELECT set_config('app.pr_m2_authorized_tenant_ids',${sqlString(manifest)},true);\nSELECT set_config('app.pr_m2_authorized_tenant_manifest_sha256','${sha256(tenantId.toLowerCase())}',true);\nSELECT set_config('app.pr_m2_owner_authorization',${sqlString(ownerAuthorization)},true);`;
}

function ledgerInsert(entry) {
  return `DO $w4ledger$ DECLARE v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN INSERT INTO supabase_migrations.schema_migrations(version,statements,name,created_by,idempotency_key,rollback) VALUES ('${entry.version}',ARRAY[v_query],'${entry.name}','PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION','pca-07-w4:${entry.version}:'||v_sha,ARRAY[]::text[]);END;$w4ledger$;`;
}

export function buildApplication({ tenantId, ownerAuthorization }) {
  assert.match(
    tenantId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "exact tenant UUID required",
  );
  assert.match(ownerAuthorization, /^PCA-[0-9A-Z_-]{3,120}$/, "bounded PCA authorization required");
  const [marketing, tracking] = readAndProject();
  const marketingSql = compactSql(
    `${prelude(tenantId, ownerAuthorization, "MARKETING")}\n${marketingPreflight(tenantId)}\n${marketing.projected.trim()}\n${ledgerInsert(marketing)}\n${marketingPostflight(tenantId)}\nCOMMIT;\n`,
  );
  const trackingSql = compactSql(
    `${prelude(tenantId, ownerAuthorization, "TRACKING")}\n${trackingPreflight(tenantId)}\n${tracking.projected.trim()}\n${ledgerInsert(tracking)}\n${trackingPostflight(tenantId)}\nCOMMIT;\n`,
  );
  return {
    marketingSql,
    trackingSql,
    runtime: {
      authorization: ownerAuthorization,
      exactTenantCount: 1,
      tenantManifestSha256: sha256(tenantId.toLowerCase()),
      marketingSqlBytes: Buffer.byteLength(marketingSql),
      marketingSqlSha256: sha256(marketingSql),
      trackingSqlBytes: Buffer.byteLength(trackingSql),
      trackingSqlSha256: sha256(trackingSql),
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
      executionMode: "TWO_ORDERED_MIGRATION_LOCAL_ATOMIC_ENVELOPES",
      transportCompaction: "DETERMINISTIC_LITERAL_PRESERVING_SQL_COMPACTION",
      semanticProjection: "BYTE_IDENTICAL_SEMANTICS",
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      marketingMustCommitBeforeTracking: true,
      blindReplayAllowed: false,
    },
    projectedMigrations: projected,
    projections: ["BYTE_IDENTICAL_SEMANTICS", "TRANSPORT_SAFE_SQL_COMPACTION"],
    liveReadOnlyBaseline: {
      postgresVersion: "17.6",
      tenantCount: 74,
      exactTargetCount: 1,
      w1LedgerRows: 3,
      w2LedgerRows: 3,
      w3LedgerRows: 3,
      w4LedgerRows: 0,
      w4TablesPresent: 0,
      w4FunctionsPresent: 0,
      targetLeads: 0,
      targetMembers: 4,
      publishedConfigurationRows: 1,
      legacyMetaRows: 1,
      rawTrackingIdentifiers: 1,
      acceptedTrackingIdentifiers: 1,
      rejectedTrackingIdentifiers: 0,
      portalConnectorCount: 444,
      retainedSensitiveFields: 888,
      storageObjectCount: 22,
      storageBytes: 15826788,
    },
    security: {
      marketingTableCount: MARKETING_TABLES.length,
      marketingFunctionCount: MARKETING_FUNCTIONS.length,
      trackingTableCount: TRACKING_TABLES.length,
      trackingFunctionCount: TRACKING_FUNCTIONS.length,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"],
      serviceRoleRequired: true,
      dataApiExposureImplicitlyTrusted: false,
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
