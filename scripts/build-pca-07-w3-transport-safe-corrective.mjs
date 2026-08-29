import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

export const GATE =
  "PCA-07_W3_CMS_CRM_POSTGRES_UUID_AGGREGATE_INTEGER_SIGNATURE_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w3-cms-crm-transport-safe-corrective";
export const SOURCE_MAIN = "65e11c80c22f61929de340606be558cf26012f45";
export const SOURCE_TREE = "cb206ef3ceb61c49f2e731e716fdf8ee62e1a561";
export const CORRECTIVE_VERSION = "20260829145000";
export const CORRECTIVE_NAME =
  "pca_07_w3_transport_safe_atomic_ledger_aware_compatibility_corrective";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W3-transport-safe-compatibility-manifest.json";

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

export const W2_LEDGER = [
  { version: "20260728233000", name: "pr_m2_configuration_center" },
  { version: "20260729103000", name: "pr_m2_portal_functional_completion" },
  {
    version: "20260829110000",
    name: "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective",
  },
];

export const W3 = [
  {
    wave: "W3",
    capability: "CMS",
    version: "20260729183000",
    name: "pr_m2_cms_workflow_functional_completion",
    path: "supabase/migrations/20260729183000_pr_m2_cms_workflow_functional_completion.sql",
    bytes: 58763,
    sha256: "b4129777c1c63f7ff6cd452142ee05efe8154106ee9fafda09695cf2de4d5809",
  },
  {
    wave: "W3",
    capability: "CRM",
    version: "20260729211500",
    name: "pr_m2_crm_operational_workflow",
    path: "supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql",
    bytes: 73513,
    sha256: "841e63be5592ff3b28994f3d25626e247c0d32cf09afbde9809bbe16b931942e",
  },
];

export const CMS_TABLES = [
  "cms_pages",
  "cms_page_versions",
  "cms_templates",
  "cms_template_versions",
  "cms_forms",
  "cms_form_fields",
  "cms_form_versions",
  "cms_campaigns",
  "cms_campaign_versions",
];
export const CMS_CREATED_TABLES = [
  "cms_page_versions",
  "cms_templates",
  "cms_template_versions",
  "cms_form_versions",
  "cms_campaign_versions",
];
export const CRM_TABLES = [
  "crm_pipelines",
  "crm_pipeline_stages",
  "crm_lead_events",
  "crm_lead_assignments",
  "crm_lead_tasks",
  "crm_tags",
  "crm_lead_tags",
  "crm_idempotency",
];

export const CMS_FUNCTIONS = [
  "public.validate_tenant_cms_snapshot(uuid,text,jsonb)",
  "public.save_tenant_page_draft(uuid,uuid,uuid,bigint,jsonb)",
  "public.publish_tenant_page(uuid,uuid,uuid,bigint)",
  "public.unpublish_tenant_page(uuid,uuid,uuid,bigint)",
  "public.rollback_tenant_page(uuid,uuid,uuid,uuid,bigint)",
  "public.save_tenant_template_version(uuid,uuid,uuid,text,text,bigint,jsonb)",
  "public.instantiate_tenant_template(uuid,uuid,uuid,uuid,text,text)",
  "public.save_tenant_form_definition(uuid,uuid,uuid,bigint,jsonb)",
  "public.publish_tenant_form(uuid,uuid,uuid,bigint)",
  "public.save_tenant_campaign_definition(uuid,uuid,uuid,bigint,jsonb)",
  "public.publish_tenant_campaign(uuid,uuid,uuid,bigint)",
];
export const CMS_CREATED_FUNCTIONS = [
  "public.cms_protect_version_content()",
  "public.cms_protect_form_version_content()",
  "public.cms_protect_campaign_version_content()",
  ...CMS_FUNCTIONS,
];

export const CRM_FUNCTIONS = [
  "public.crm_bind_lead_pipeline()",
  "public.crm_resolve_scope(uuid,uuid,text,public.rbac_action)",
  "public.crm_scope_allows_lead(uuid,uuid,text,uuid)",
  "public.crm_scope_allows_user_target(uuid,uuid,text,uuid)",
  "public.crm_scope_allows_team_target(uuid,uuid,text,uuid)",
  "public.crm_idempotent_response(uuid,uuid,text,text,text)",
  "public.list_tenant_crm_leads(uuid,uuid,text,text,integer,integer)",
  "public.get_tenant_crm_lead_aggregate(uuid,uuid,text,uuid)",
  "public.create_tenant_crm_lead(uuid,uuid,text,text,text,text,uuid,text,uuid,text)",
  "public.update_tenant_crm_lead(uuid,uuid,text,uuid,bigint,jsonb,text)",
  "public.transition_tenant_crm_lead(uuid,uuid,text,uuid,text,bigint,uuid,text,text)",
  "public.assign_tenant_crm_lead(uuid,uuid,text,uuid,bigint,text,uuid,uuid,text,text)",
  "public.create_tenant_crm_task(uuid,uuid,text,uuid,text,text,text,timestamptz,uuid,text)",
  "public.transition_tenant_crm_task(uuid,uuid,text,uuid,text,bigint,text,text)",
  "public.add_tenant_crm_note(uuid,uuid,text,uuid,text,text)",
  "public.set_tenant_crm_tags(uuid,uuid,text,uuid,uuid[],bigint,text)",
  "public.find_tenant_crm_duplicates(uuid,uuid,text,uuid)",
  "public.set_tenant_crm_pipeline_state(uuid,uuid,text,uuid,bigint,boolean,text)",
  "public.create_tenant_crm_tag(uuid,uuid,text,text,text,text)",
  "public.get_tenant_crm_diagnostics(uuid,uuid,text)",
];
export const CRM_CREATED_FUNCTIONS = ["public.crm_protect_append_only()", ...CRM_FUNCTIONS];
const CMS_COLUMNS = [
  ["cms_pages", "page_type"],
  ["cms_pages", "layout_type"],
  ["cms_pages", "schema_version"],
  ["cms_pages", "revision"],
  ["cms_pages", "draft_version_id"],
  ["cms_pages", "published_version_id"],
  ["cms_pages", "unpublished_at"],
  ["cms_forms", "schema_version"],
  ["cms_forms", "revision"],
  ["cms_forms", "draft_version_id"],
  ["cms_forms", "published_version_id"],
  ["cms_forms", "published_at"],
  ["cms_forms", "unpublished_at"],
  ["cms_campaigns", "schema_version"],
  ["cms_campaigns", "revision"],
  ["cms_campaigns", "draft_version_id"],
  ["cms_campaigns", "published_version_id"],
  ["cms_campaigns", "published_at"],
  ["cms_campaigns", "unpublished_at"],
];
const CRM_COLUMNS = [
  ["leads", "pipeline_id"],
  ["leads", "stage_id"],
  ["leads", "assigned_team_id"],
  ["leads", "qualification_key"],
  ["leads", "archived_at"],
  ["leads", "normalized_email"],
  ["leads", "normalized_phone"],
  ["leads", "original_attribution"],
  ["leads", "latest_attribution"],
  ["leads", "merged_into_lead_id"],
  ["leads", "merge_state"],
];
const LATER_VERSIONS = [
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

export function projectCms(source) {
  const body = compactSql(stripTransaction(source, "CMS"));
  return `-- PCA-07 W3 executable projection: TRANSPORT_SAFE_SQL_COMPACTION\n${body}`;
}

export function projectCrm(source) {
  let projected = stripTransaction(source, "CRM");
  assert.equal(occurrences(projected, "min(id)"), 5, "CRM UUID aggregate shape drift");
  projected = projected.replaceAll("min(id)", "(array_agg(id ORDER BY id))[1]");
  projected = replaceOnce(
    projected,
    "public.transition_lead_status(uuid,text,bigint,uuid,jsonb)",
    "public.transition_lead_status(uuid,text,integer,uuid,jsonb)",
    "CRM transition signature",
  );
  return `-- PCA-07 W3 executable projection: POSTGRES_UUID_ARRAY_AGG_AUTHORITY\n-- PCA-07 W3 executable projection: TRANSITION_LEAD_STATUS_INTEGER_SIGNATURE\n-- PCA-07 W3 executable projection: TRANSPORT_SAFE_SQL_COMPACTION\n${compactSql(projected)}`;
}

function readAndProject() {
  return W3.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `${entry.path} byte drift`);
    assert.equal(sha256(source), entry.sha256, `${entry.path} hash drift`);
    const projected = entry.capability === "CMS" ? projectCms(source) : projectCrm(source);
    return {
      ...entry,
      source,
      projected,
      projectedBytes: Buffer.byteLength(projected),
      projectedSha256: sha256(projected),
    };
  });
}

const ledgerSchemaAssertion = `
 SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_columns
 FROM pg_attribute a WHERE a.attrelid='supabase_migrations.schema_migrations'::regclass
 AND a.attnum>0 AND NOT a.attisdropped;
 IF v_columns IS DISTINCT FROM ARRAY['version','statements','name','created_by','idempotency_key','rollback']::text[]
 THEN RAISE EXCEPTION 'PCA-07 W3 ledger schema mismatch' USING ERRCODE='P0001'; END IF;`;

const w1LedgerAssertion = `
 SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE
 (sm.version='${W1_LEDGER[0].version}' AND sm.name='${W1_LEDGER[0].name}' AND array_length(sm.statements,1)=1
  AND octet_length(sm.statements[1])=${W1_LEDGER[0].bytes} AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='${W1_LEDGER[0].sha256}'
  AND sm.idempotency_key='${W1_LEDGER[0].idempotencyKey}') OR
 (sm.version='${W1_LEDGER[1].version}' AND sm.name='${W1_LEDGER[1].name}' AND array_length(sm.statements,1)=1
  AND octet_length(sm.statements[1])=${W1_LEDGER[1].bytes} AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='${W1_LEDGER[1].sha256}'
  AND sm.idempotency_key='${W1_LEDGER[1].idempotencyKey}') OR
 (sm.version='${W1_LEDGER[2].version}' AND sm.name='${W1_LEDGER[2].name}' AND array_length(sm.statements,1)=1
  AND octet_length(sm.statements[1])=${W1_LEDGER[2].bytes} AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='${W1_LEDGER[2].sha256}'
  AND sm.idempotency_key='${W1_LEDGER[2].idempotencyKey}');
 IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W3 W1 ledger mismatch' USING ERRCODE='P0001'; END IF;`;

const w2LedgerAssertion = `
 SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm
 WHERE (sm.version,sm.name) IN (VALUES ${W2_LEDGER.map(({ version, name }) => `('${version}','${name}')`).join(",")})
 AND sm.created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION'
 AND array_length(sm.statements,1)=1
 AND sm.idempotency_key='pca-07-w2:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex')
 AND COALESCE(array_length(sm.rollback,1),0)=0;
 IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W3 W2 ledger mismatch' USING ERRCODE='P0001'; END IF;`;

const authorityAssertion = (tenantId) => `
 SELECT count(*),count(*) FILTER(WHERE tenant_id='${tenantId}'::uuid)
 INTO v_count,v_target_count FROM prm2_rebaseline.authorized_tenant_ids();
 IF v_count<>1 OR v_target_count<>1 THEN RAISE EXCEPTION 'PCA-07 W3 tenant manifest mismatch' USING ERRCODE='P0001'; END IF;`;

const protectedBaselineAssertion = (tenantId) => `
 IF (SELECT count(*) FROM public.tenants)<>74
 OR (SELECT count(*) FROM public.portal_connectors)<>444
 OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id='${tenantId}'::uuid)<>6
 OR (SELECT count(*) FROM public.portal_connectors WHERE tenant_id<>'${tenantId}'::uuid)<>438
 OR (SELECT count(*) FROM public.portal_connectors pc CROSS JOIN LATERAL
   (VALUES(NULLIF(pc.feed_token,'')),(NULLIF(pc.webhook_secret,''))) s(value) WHERE s.value IS NOT NULL)<>888
 OR (SELECT count(*) FROM storage.objects)<>22
 OR (SELECT COALESCE(sum((metadata->>'size')::bigint),0) FROM storage.objects)<>15826788
 THEN RAISE EXCEPTION 'PCA-07 W3 protected baseline drift' USING ERRCODE='P0001'; END IF;`;

const laterLedgerAssertion = `
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=ANY(${sqlTextArray(LATER_VERSIONS)}))
 THEN RAISE EXCEPTION 'PCA-07 W3 later-wave ledger present' USING ERRCODE='P0001'; END IF;`;

function catalogCountAssertion({ tables, columns, functions, present, label }) {
  const tableExpected = present ? tables.length : 0;
  const columnExpected = present ? columns.length : 0;
  const functionExpected = present ? functions.length : 0;
  const columnValues = columns.map(([table, column]) => `('${table}','${column}')`).join(",");
  return `
 SELECT count(*) INTO v_count FROM unnest(${sqlTextArray(tables)}) x(name) WHERE to_regclass('public.'||name) IS NOT NULL;
 IF v_count<>${tableExpected} THEN RAISE EXCEPTION 'PCA-07 W3 ${label} table state mismatch' USING ERRCODE='P0001'; END IF;
 SELECT count(*) INTO v_count FROM (VALUES ${columnValues}) x(table_name,column_name)
 JOIN information_schema.columns c ON c.table_schema='public' AND c.table_name=x.table_name AND c.column_name=x.column_name;
 IF v_count<>${columnExpected} THEN RAISE EXCEPTION 'PCA-07 W3 ${label} column state mismatch' USING ERRCODE='P0001'; END IF;
 SELECT count(*) INTO v_count FROM unnest(${sqlTextArray(functions)}) x(signature) WHERE to_regprocedure(signature) IS NOT NULL;
 IF v_count<>${functionExpected} THEN RAISE EXCEPTION 'PCA-07 W3 ${label} function state mismatch' USING ERRCODE='P0001'; END IF;`;
}

const cmsCatalog = (present) =>
  catalogCountAssertion({
    tables: CMS_CREATED_TABLES,
    columns: CMS_COLUMNS,
    functions: CMS_CREATED_FUNCTIONS,
    present,
    label: "CMS",
  });
const crmCatalog = (present) =>
  catalogCountAssertion({
    tables: CRM_TABLES,
    columns: CRM_COLUMNS,
    functions: CRM_CREATED_FUNCTIONS,
    present,
    label: "CRM",
  });

function aclAssertion(tables, functions, label) {
  return `
 FOREACH v_table IN ARRAY ${sqlTextArray(tables)} LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||v_table)::regclass)
  THEN RAISE EXCEPTION 'PCA-07 W3 ${label} RLS missing: %',v_table USING ERRCODE='P0001'; END IF;
  FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF has_table_privilege(v_role,'public.'||v_table,'SELECT') OR has_table_privilege(v_role,'public.'||v_table,'INSERT')
   OR has_table_privilege(v_role,'public.'||v_table,'UPDATE') OR has_table_privilege(v_role,'public.'||v_table,'DELETE')
   THEN RAISE EXCEPTION 'PCA-07 W3 ${label} client ACL exposure: %.%',v_role,v_table USING ERRCODE='P0001'; END IF;
  END LOOP;
  IF NOT has_table_privilege('service_role','public.'||v_table,'SELECT')
  OR NOT has_table_privilege('service_role','public.'||v_table,'INSERT')
  OR NOT has_table_privilege('service_role','public.'||v_table,'UPDATE')
  OR NOT has_table_privilege('service_role','public.'||v_table,'DELETE')
  THEN RAISE EXCEPTION 'PCA-07 W3 ${label} service ACL missing: %',v_table USING ERRCODE='P0001'; END IF;
 END LOOP;
 FOREACH v_signature IN ARRAY ${sqlTextArray(functions)} LOOP
  IF has_function_privilege('anon',v_signature,'EXECUTE') OR has_function_privilege('authenticated',v_signature,'EXECUTE')
  OR NOT has_function_privilege('service_role',v_signature,'EXECUTE')
  THEN RAISE EXCEPTION 'PCA-07 W3 ${label} function ACL mismatch: %',v_signature USING ERRCODE='P0001'; END IF;
 END LOOP;`;
}

function commonPreflight(tenantId) {
  return `
 IF current_database()<>'postgres' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 THEN RAISE EXCEPTION 'PCA-07 W3 backend identity mismatch' USING ERRCODE='P0001'; END IF;
 ${ledgerSchemaAssertion}${w1LedgerAssertion}${w2LedgerAssertion}${authorityAssertion(tenantId)}${protectedBaselineAssertion(tenantId)}${laterLedgerAssertion}
 IF (SELECT count(*) FROM public.site_settings_versions WHERE tenant_id='${tenantId}'::uuid AND key='configuration'
  AND status='published' AND revision=1 AND based_on_revision=0 AND content_hash~'^[0-9a-f]{64}$')<>1
 OR (SELECT count(*) FROM public.portal_connector_credential_verifiers WHERE tenant_id='${tenantId}'::uuid AND verifier_hash~'^[0-9a-f]{64}$')<>12
 THEN RAISE EXCEPTION 'PCA-07 W3 W2 physical prerequisite mismatch' USING ERRCODE='P0001'; END IF;`;
}

function cmsPreflight(tenantId) {
  return `DO $w3cms_pre$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];BEGIN
 ${commonPreflight(tenantId)}${cmsCatalog(false)}${crmCatalog(false)}
 IF EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN ('${W3[0].version}','${W3[1].version}','${CORRECTIVE_VERSION}'))
 THEN RAISE EXCEPTION 'PCA-07 W3 ledger target not empty' USING ERRCODE='P0001'; END IF;
 IF (SELECT count(*) FROM public.cms_pages WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.cms_forms WHERE tenant_id='${tenantId}'::uuid)<>1
 OR (SELECT count(*) FROM public.cms_form_fields WHERE tenant_id='${tenantId}'::uuid)<>4
 OR (SELECT count(*) FROM public.cms_campaigns WHERE tenant_id='${tenantId}'::uuid)<>1
 OR EXISTS(SELECT 1 FROM public.cms_form_fields ff LEFT JOIN public.cms_forms f
   ON f.id=ff.form_id AND f.tenant_id=ff.tenant_id WHERE ff.tenant_id='${tenantId}'::uuid AND f.id IS NULL)
 OR EXISTS(SELECT 1 FROM public.cms_forms WHERE tenant_id='${tenantId}'::uuid AND
  (config::text~*'<script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]*=|onclick[[:space:]]*=|eval[[:space:]]*\\('
   OR config::text~*'\"(client_secret|refresh_token|private_key|api_key|access_token|password|script|componentName|typescript|javascript|css)\"[[:space:]]*:'))
 OR EXISTS(SELECT 1 FROM public.cms_campaigns WHERE tenant_id='${tenantId}'::uuid AND
  ((conteudo||segmentacao||frequencia)::text~*'<script|javascript:|data:text/html|onerror[[:space:]]*=|onload[[:space:]]*=|onclick[[:space:]]*=|eval[[:space:]]*\\('
   OR (conteudo||segmentacao||frequencia)::text~*'\"(client_secret|refresh_token|private_key|api_key|access_token|password|script|componentName|typescript|javascript|css)\"[[:space:]]*:'))
 THEN RAISE EXCEPTION 'PCA-07 W3 CMS target baseline mismatch' USING ERRCODE='P0001'; END IF;
END;$w3cms_pre$;`;
}

function cmsPostflight(tenantId) {
  return `DO $w3cms_post$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_table text;v_role text;v_signature text;v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W3[0].version}' AND name='${W3[0].name}'
  AND created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(statements,1)=1 AND statements[1]=v_query
  AND idempotency_key='pca-07-w3:${W3[0].version}:'||v_sha AND COALESCE(array_length(rollback,1),0)=0)<>1
 THEN RAISE EXCEPTION 'PCA-07 W3 CMS ledger mismatch' USING ERRCODE='P0001'; END IF;
 ${cmsCatalog(true)}${crmCatalog(false)}${protectedBaselineAssertion(tenantId)}${laterLedgerAssertion}
 IF (SELECT count(*) FROM public.cms_page_versions WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.cms_template_versions WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.cms_form_versions WHERE tenant_id='${tenantId}'::uuid AND revision=1 AND schema_version=0 AND content_hash~'^[0-9a-f]{64}$')<>1
 OR (SELECT count(*) FROM public.cms_campaign_versions WHERE tenant_id='${tenantId}'::uuid AND revision=1 AND schema_version=0 AND content_hash~'^[0-9a-f]{64}$')<>1
 THEN RAISE EXCEPTION 'PCA-07 W3 CMS data postcondition mismatch' USING ERRCODE='P0001'; END IF;
 ${aclAssertion(CMS_TABLES, CMS_FUNCTIONS, "CMS")}
END;$w3cms_post$;`;
}

function crmTransportPreflight(tenantId) {
  return `DO $w3crm_pre$ DECLARE c bigint;t bigint;BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM backend mismatch' USING ERRCODE='P0001';END IF;
 SELECT count(*),count(*)FILTER(WHERE tenant_id='${tenantId}'::uuid) INTO c,t FROM prm2_rebaseline.authorized_tenant_ids();
 IF c<>1 OR t<>1 THEN RAISE EXCEPTION 'PCA-07 W3 CRM manifest mismatch' USING ERRCODE='P0001';END IF;
 SELECT count(*) INTO c FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${W2_LEDGER.map(({ version, name }) => `('${version}','${name}')`).join(",")})
 AND sm.created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
 AND sm.idempotency_key='pca-07-w2:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
 IF c<>3 THEN RAISE EXCEPTION 'PCA-07 W3 CRM W2 ledger mismatch' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W3[0].version}' AND name='${W3[0].name}'
 AND created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(statements,1)=1
 AND idempotency_key='pca-07-w3:${W3[0].version}:'||encode(extensions.digest(statements[1],'sha256'),'hex'))<>1
 OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version IN ('${W3[1].version}','${CORRECTIVE_VERSION}') OR version=ANY(${sqlTextArray(LATER_VERSIONS)}))
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM ledger boundary mismatch' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM unnest(${sqlTextArray(CMS_CREATED_TABLES)})x(n) WHERE to_regclass('public.'||n) IS NOT NULL)<>5
 OR (SELECT count(*) FROM public.cms_form_versions WHERE tenant_id='${tenantId}'::uuid)<>1
 OR (SELECT count(*) FROM public.cms_campaign_versions WHERE tenant_id='${tenantId}'::uuid)<>1
 OR (SELECT count(*) FROM unnest(${sqlTextArray(CRM_TABLES)})x(n) WHERE to_regclass('public.'||n) IS NOT NULL)<>0
 OR (SELECT count(*) FROM (VALUES ${CRM_COLUMNS.map(([table, column]) => `('${table}','${column}')`).join(",")})x(t,n)
 JOIN information_schema.columns i ON i.table_schema='public' AND i.table_name=x.t AND i.column_name=x.n)<>0
 OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname~'^(crm_|.+_tenant_crm_)')<>0
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM catalog boundary mismatch' USING ERRCODE='P0001';END IF;
 IF to_regprocedure('public.transition_lead_status(uuid,text,integer,uuid,jsonb)') IS NULL
 OR to_regprocedure('public.transition_lead_status(uuid,text,bigint,uuid,jsonb)') IS NOT NULL
 OR to_regprocedure('pg_catalog.min(uuid)') IS NOT NULL
 OR (SELECT count(*) FROM public.leads WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.tenant_members WHERE tenant_id='${tenantId}'::uuid)<>4
 OR (SELECT count(*) FROM public.teams WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.lead_discard_reasons WHERE tenant_id='${tenantId}'::uuid)<>7
 OR (SELECT count(*) FROM public.deal_lost_reasons WHERE tenant_id='${tenantId}'::uuid)<>7
 OR (SELECT count(*) FROM public.rbac_modules WHERE codigo='crm')<>0
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM target mismatch' USING ERRCODE='P0001';END IF;
 ${protectedBaselineAssertion(tenantId)}
END;$w3crm_pre$;`;
}

function crmTransportPostflight(tenantId) {
  return `DO $w3crm_post$ DECLARE c bigint;r text;q text:=current_query();h text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
 IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version IN ('${W3[0].version}','${W3[1].version}','${CORRECTIVE_VERSION}'))<>3
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${W3[1].version}' AND name='${W3[1].name}'
 AND created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND statements[1]=q AND idempotency_key='pca-07-w3:${W3[1].version}:'||h)<>1
 OR (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${CORRECTIVE_VERSION}' AND name='${CORRECTIVE_NAME}'
 AND created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND statements[1]=q AND idempotency_key='pca-07-w3:${CORRECTIVE_VERSION}:'||h)<>1
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM ledger postcondition' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM unnest(${sqlTextArray(CRM_TABLES)})x(n) WHERE to_regclass('public.'||n) IS NOT NULL)<>8
 OR (SELECT count(*) FROM (VALUES ${CRM_COLUMNS.map(([table, column]) => `('${table}','${column}')`).join(",")})x(t,n)
 JOIN information_schema.columns i ON i.table_schema='public' AND i.table_name=x.t AND i.column_name=x.n)<>11
 OR (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname~'^(crm_|.+_tenant_crm_)')<>21
 OR (SELECT count(*) FROM unnest(${sqlTextArray(CRM_TABLES)})x(n) JOIN pg_class p ON p.oid=('public.'||n)::regclass WHERE p.relrowsecurity)<>8
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM catalog postcondition' USING ERRCODE='P0001';END IF;
 IF (SELECT count(*) FROM public.rbac_modules WHERE codigo='crm')<>1
 OR (SELECT count(*) FROM public.crm_pipelines WHERE tenant_id='${tenantId}'::uuid AND is_default AND ativo)<>1
 OR (SELECT count(*) FROM public.crm_pipeline_stages WHERE tenant_id='${tenantId}'::uuid)<>7
 OR (SELECT count(*) FROM public.leads WHERE tenant_id='${tenantId}'::uuid)<>0
 OR (SELECT count(*) FROM public.crm_lead_events)<>0 OR (SELECT count(*) FROM public.crm_lead_assignments)<>0
 OR (SELECT count(*) FROM public.crm_lead_tasks)<>0 OR (SELECT count(*) FROM public.crm_tags)<>0
 OR (SELECT count(*) FROM public.crm_lead_tags)<>0 OR (SELECT count(*) FROM public.crm_idempotency)<>0
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM data postcondition' USING ERRCODE='P0001';END IF;
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM unnest(${sqlTextArray(CRM_TABLES)})x(n) WHERE has_table_privilege(r,'public.'||n,'SELECT')
   OR has_table_privilege(r,'public.'||n,'INSERT') OR has_table_privilege(r,'public.'||n,'UPDATE') OR has_table_privilege(r,'public.'||n,'DELETE'))
  THEN RAISE EXCEPTION 'PCA-07 W3 CRM client ACL' USING ERRCODE='P0001';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM unnest(${sqlTextArray(CRM_TABLES)})x(n) WHERE NOT has_table_privilege('service_role','public.'||n,'SELECT')
  OR NOT has_table_privilege('service_role','public.'||n,'INSERT') OR NOT has_table_privilege('service_role','public.'||n,'UPDATE')
  OR NOT has_table_privilege('service_role','public.'||n,'DELETE'))
 OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname<>'crm_protect_append_only' AND p.proname~'^(crm_|.+_tenant_crm_)'
  AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') OR NOT has_function_privilege('service_role',p.oid,'EXECUTE')))
 OR has_function_privilege('authenticated','public.transition_lead_status(uuid,text,integer,uuid,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'PCA-07 W3 CRM function ACL' USING ERRCODE='P0001';END IF;
END;$w3crm_post$;`;
}

function prelude(tenantId, ownerAuthorization, capability) {
  const manifest = JSON.stringify([tenantId]);
  return `-- PCA-07 W3 Lovable-managed migration-local envelope: ${capability}\nBEGIN;\nSET LOCAL search_path=public,extensions,pg_temp;\nSELECT set_config('app.pr_m2_authorized_tenant_ids',${sqlString(manifest)},true);\nSELECT set_config('app.pr_m2_authorized_tenant_manifest_sha256','${sha256(tenantId.toLowerCase())}',true);\nSELECT set_config('app.pr_m2_owner_authorization',${sqlString(ownerAuthorization)},true);`;
}

function ledgerInsert(entries) {
  const values = entries
    .map(
      ({ version, name }) =>
        `('${version}',ARRAY[v_query],'${name}','PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION','pca-07-w3:${version}:'||v_sha,ARRAY[]::text[])`,
    )
    .join(",");
  return `DO $w3ledger$ DECLARE v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN INSERT INTO supabase_migrations.schema_migrations(version,statements,name,created_by,idempotency_key,rollback) VALUES ${values};END;$w3ledger$;`;
}

export function buildApplication({ tenantId, ownerAuthorization }) {
  assert.match(
    tenantId,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "exact tenant UUID required",
  );
  assert.match(ownerAuthorization, /^PCA-[0-9A-Z_-]{3,120}$/, "bounded PCA authorization required");
  const [cms, crm] = readAndProject();
  const cmsSql = compactSql(
    `${prelude(tenantId, ownerAuthorization, "CMS")}\n${cmsPreflight(tenantId)}\n${cms.projected.trim()}\n${ledgerInsert([cms])}\n${cmsPostflight(tenantId)}\nCOMMIT;\n`,
  );
  const crmSql = compactSql(
    `${prelude(tenantId, ownerAuthorization, "CRM")}\n${crmTransportPreflight(tenantId)}\n${crm.projected.trim()}\n${ledgerInsert([crm, { version: CORRECTIVE_VERSION, name: CORRECTIVE_NAME }])}\n${crmTransportPostflight(tenantId)}\nCOMMIT;\n`,
  );
  return {
    cmsSql,
    crmSql,
    runtime: {
      authorization: ownerAuthorization,
      exactTenantCount: 1,
      tenantManifestSha256: sha256(tenantId.toLowerCase()),
      cmsSqlBytes: Buffer.byteLength(cmsSql),
      cmsSqlSha256: sha256(cmsSql),
      crmSqlBytes: Buffer.byteLength(crmSql),
      crmSqlSha256: sha256(crmSql),
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
      transportCompaction: "DETERMINISTIC_LITERAL_PRESERVING_SQL_COMPACTION",
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      uuidAuthorityMode: "COUNT_PLUS_ORDERED_UUID_ARRAY_FIRST_ELEMENT",
      cmsMustCommitBeforeCrm: true,
      blindReplayAllowed: false,
    },
    projectedMigrations: projected,
    projections: [
      "POSTGRES_UUID_ARRAY_AGG_AUTHORITY_X5",
      "TRANSITION_LEAD_STATUS_INTEGER_SIGNATURE",
      "TRANSPORT_SAFE_SQL_COMPACTION",
    ],
    liveReadOnlyBaseline: {
      postgresVersion: "17.6",
      tenantCount: 74,
      exactTargetCount: 1,
      w1LedgerRows: 3,
      w2LedgerRows: 3,
      w3LedgerRows: 0,
      w3TablesPresent: 0,
      w3ColumnsPresent: 0,
      w3FunctionsPresent: 0,
      targetCmsPages: 0,
      targetCmsForms: 1,
      targetCmsFormFields: 4,
      targetCmsCampaigns: 1,
      targetLeads: 0,
      targetMembers: 4,
      targetTeams: 0,
      targetDiscardReasons: 7,
      targetLostReasons: 7,
      portalConnectorCount: 444,
      retainedSensitiveFields: 888,
      storageObjectCount: 22,
      storageBytes: 15826788,
    },
    security: {
      cmsTableCount: CMS_TABLES.length,
      cmsFunctionCount: CMS_FUNCTIONS.length,
      crmTableCount: CRM_TABLES.length,
      crmFunctionCount: CRM_FUNCTIONS.length,
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
