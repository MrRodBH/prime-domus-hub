import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

export const GATE =
  "PCA-07_W5_FINAL_CORRECTIVE_INVENTORY_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_CORRECTIVE_REPOSITORY_IMPLEMENTATION";
export const BRANCH = "agent/pca-07-w5-final-corrective-inventory-transport-safe";
export const SOURCE_MAIN = "72cffa66686fd1de26cd48da688814b2c636dfe1";
export const SOURCE_TREE = "d6f3df55f0d1ae24cc21c14ffa4bae8ab374c7a5";
export const MANIFEST_PATH =
  "docs/architecture/impact-analysis/manifests/PCA-07-W5-transport-safe-compatibility-manifest.json";

export const W5 = [
  {
    capability: "CORE_CRM_UPLOAD",
    version: "20260730043000",
    name: "pr_m2_consolidated_final_corrective",
    path: "supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql",
    bytes: 21225,
    sha256: "f912e98bd31ad1dd6c37bf1fa66cf6c8ba0202ac1e36f4a35c81c1cf16bd47dc",
  },
  {
    capability: "CMS_MARKETING_HARDENING",
    version: "20260730050000",
    name: "pr_m2_cms_functional_inventory",
    path: "supabase/migrations/20260730050000_pr_m2_cms_functional_inventory.sql",
    bytes: 8874,
    sha256: "020e4a830b4a7e8930c87c37aa8ccd8ead50f78313ac44de18c7e6559886a6a4",
  },
  {
    capability: "CMS_MARKETING_HARDENING",
    version: "20260730051500",
    name: "pr_m2_marketing_adapter_activation",
    path: "supabase/migrations/20260730051500_pr_m2_marketing_adapter_activation.sql",
    bytes: 1778,
    sha256: "6eb21a513e15c32172a0fd8da718097ae23d6319d335239f962bf1c5686ba45a",
  },
  {
    capability: "CMS_MARKETING_HARDENING",
    version: "20260730053000",
    name: "pr_m2_marketing_and_cms_corrective_hardening",
    path: "supabase/migrations/20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql",
    bytes: 30646,
    sha256: "b4598c5f8e0d17e2757932db01131340cc913fa8b2d590144f42be8caa4e5b07",
  },
  {
    capability: "SUPER_CONTROL_PLANE",
    version: "20260730060000",
    name: "pr_m2_super_control_plane",
    path: "supabase/migrations/20260730060000_pr_m2_super_control_plane.sql",
    bytes: 10732,
    sha256: "6d8a20c88893c8b152e98f15d60726d153a9619c585b228bd889e936e816bdca",
  },
  {
    capability: "CONTENT_UPLOAD_CONSUMERS",
    version: "20260730100000",
    name: "pr_m2_content_upload_target_consumers",
    path: "supabase/migrations/20260730100000_pr_m2_content_upload_target_consumers.sql",
    bytes: 14065,
    sha256: "90eb1c9a3af0ad4f422a3c5c34bd3a5f4c0b3e2df77da7988d0a9077bba6a823",
  },
  {
    capability: "LAUNCH_TRANSACTIONAL_SAVE",
    version: "20260730101000",
    name: "pr_m2_launch_project_transactional_save",
    path: "supabase/migrations/20260730101000_pr_m2_launch_project_transactional_save.sql",
    bytes: 9260,
    sha256: "129e7abc033e84e9a4613b76f48429e18e8dfda473b2c8a10462d4a9428e5cdc",
  },
  {
    capability: "STORAGE_PROVENANCE_CRM_ATTACHMENT",
    version: "20260803183000",
    name: "pr_m2_storage_provenance_and_crm_attachment_corrective",
    path: "supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql",
    bytes: 11761,
    sha256: "48a07bc20515d5a88d5864dbb3cf02aabeef3121f1de062e28b6deda803af533",
  },
];

export const GROUPS = [
  { capability: "CORE_CRM_UPLOAD", indexes: [0] },
  { capability: "CMS_MARKETING_HARDENING", indexes: [1, 2, 3] },
  { capability: "SUPER_CONTROL_PLANE", indexes: [4] },
  { capability: "CONTENT_UPLOAD_CONSUMERS", indexes: [5] },
  { capability: "LAUNCH_TRANSACTIONAL_SAVE", indexes: [6] },
  { capability: "STORAGE_PROVENANCE_CRM_ATTACHMENT", indexes: [7] },
];

export const CORE_TABLES = [
  "tenant_upload_targets",
  "crm_contacts",
  "crm_calendar_events",
  "crm_visits",
  "crm_proposals",
  "crm_attachments",
  "crm_automation_rules",
  "crm_communication_jobs",
  "crm_sla_policies",
  "crm_alerts",
];
export const CMS_TABLES = ["cms_testimonials", "cms_reusable_blocks", "cms_publication_schedules"];
export const CONTROL_TABLES = ["platform_incidents", "platform_support_cases"];
export const ALL_TABLES = [...CORE_TABLES, ...CMS_TABLES, ...CONTROL_TABLES];

export const NEW_FUNCTIONS = [
  "public.register_tenant_upload_target(uuid,uuid,text,text,uuid,text,text,text,text,bigint,timestamptz)",
  "public.consume_tenant_property_upload_target(uuid,uuid,text,uuid,uuid,text,integer)",
  "public.schedule_tenant_cms_publication(uuid,uuid,text,uuid,uuid,bigint,timestamptz,text,text)",
  "public.cancel_tenant_cms_publication_schedule(uuid,uuid,text,uuid)",
  "public.record_tenant_marketing_adapter_verification(uuid,uuid,text,uuid,bigint,boolean,boolean,text)",
  "public.ingest_verified_provider_marketing_lead(uuid,bigint,jsonb)",
  "public.assert_global_super_admin(uuid)",
  "public.mutate_platform_incident(uuid,text,uuid,text,text,uuid,text,text,text,text,text)",
  "public.mutate_platform_support_case(uuid,text,uuid,text,uuid,text,text,text,text,text,text,uuid)",
  "public.save_tenant_blog_post(uuid,uuid,text,uuid,text,text,text,text,uuid,uuid,uuid,text,text,text)",
  "public.consume_tenant_launch_upload_target(uuid,uuid,text,uuid,uuid,text,text,text,text,integer)",
  "public.save_tenant_launch_project(uuid,uuid,text,uuid,jsonb,uuid[])",
  "public.prm2_lock_upload_target(uuid,uuid,text,uuid,text,uuid)",
  "public.consume_tenant_media_upload_target(uuid,uuid,text,uuid,uuid[],text,text,text,bigint,integer,integer,text[],text)",
  "public.consume_tenant_broker_photo_upload_target(uuid,uuid,text,uuid,uuid)",
  "public.consume_tenant_crm_attachment_upload_target(uuid,uuid,text,uuid,uuid,text,text,bigint)",
  "public.delete_tenant_crm_attachment(uuid,uuid,text,uuid)",
];
export const EXISTING_MARKETING_FUNCTIONS = [
  "public.save_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,jsonb,text,text)",
  "public.publish_tenant_marketing_connector(uuid,uuid,text,uuid,bigint,boolean)",
  "public.reserve_marketing_ingestion_payload(uuid,text,text,jsonb,integer)",
];
export const INTERNAL_FUNCTION = "public.prm2_lock_upload_target(uuid,uuid,text,uuid,text,uuid)";
export const MEDIA_AUTHORITY_INDEX = "ux_media_library_tenant_id_id";

const W2_LEDGER = [
  ["20260728233000", "pr_m2_configuration_center"],
  ["20260729103000", "pr_m2_portal_functional_completion"],
  ["20260829110000", "pca_07_w2_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
const W3_LEDGER = [
  ["20260729183000", "pr_m2_cms_workflow_functional_completion"],
  ["20260729211500", "pr_m2_crm_operational_workflow"],
  ["20260829145000", "pca_07_w3_transport_safe_atomic_ledger_aware_compatibility_corrective"],
];
const W4_LEDGER = [
  ["20260729233000", "pr_m2_marketing_channels_lead_ingestion"],
  ["20260730010000", "pr_m2_analytics_tracking_conversion_events"],
];
const REQUIRED_RELATIONS = [
  "tenants", "imoveis", "imovel_imagens", "leads", "launch_projects", "launch_pdfs",
  "launch_project_imagens", "launch_statuses", "launch_amenities", "launch_project_amenities",
  "cms_pages", "cms_page_versions", "media_library", "corretores", "cidades", "bairros",
  "blog_posts", "blog_categorias", "tenant_marketing_connectors",
  "tenant_marketing_connector_versions", "tenant_marketing_field_mappings",
  "tenant_marketing_ingestion_events", "tenant_marketing_ingestion_attempts",
  "crm_lead_events", "audit_log", "user_roles",
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
  let projected = source.startsWith("BEGIN;\n")
    ? replaceOnce(source, "BEGIN;\n", "", `${label} BEGIN`)
    : replaceOnce(source, "\nBEGIN;\n", "\n", `${label} BEGIN`);
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
      while (index + 1 < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
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
  return `-- PCA-07 W5 executable projection: BYTE_IDENTICAL_SEMANTICS\n-- PCA-07 W5 executable projection: TRANSPORT_SAFE_SQL_COMPACTION\n${body}`;
}

export function projectMigrationWithMediaAuthority(source, entry) {
  if (entry.version !== "20260730050000") return projectMigration(source, entry.capability);
  const anchor = "CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_pages_tenant_id_id\n  ON public.cms_pages (tenant_id, id);";
  const replacement = `${anchor}\nCREATE UNIQUE INDEX IF NOT EXISTS ${MEDIA_AUTHORITY_INDEX}\n  ON public.media_library (tenant_id, id);`;
  const corrected = replaceOnce(source, anchor, replacement, "W5R media authority index");
  const body = compactSql(stripTransaction(corrected, entry.capability));
  return `-- PCA-07 W5R executable projection: MEDIA_LIBRARY_COMPOSITE_AUTHORITY_ASSERTION\n-- PCA-07 W5 executable projection: TRANSPORT_SAFE_SQL_COMPACTION\n${body}`;
}

function readAndProject(mediaAuthorityCorrective = false) {
  return W5.map((entry) => {
    const source = readFileSync(new URL(entry.path, ROOT), "utf8");
    assert.equal(Buffer.byteLength(source), entry.bytes, `${entry.path} byte drift`);
    assert.equal(sha256(source), entry.sha256, `${entry.path} hash drift`);
    const projected = mediaAuthorityCorrective
      ? projectMigrationWithMediaAuthority(source, entry)
      : projectMigration(source, entry.capability);
    return { ...entry, projected, projectedBytes: Buffer.byteLength(projected), projectedSha256: sha256(projected) };
  });
}

const catalogCount = (items, present, kind, label) => {
  const expression = kind === "table" ? "to_regclass('public.'||x.name) IS NOT NULL" : "to_regprocedure(x.name) IS NOT NULL";
  return `SELECT count(*) INTO v_count FROM unnest(${sqlTextArray(items)}) x(name) WHERE ${expression};IF v_count<>${present ? items.length : 0} THEN RAISE EXCEPTION 'PCA-07 W5 ${label} ${kind} state mismatch' USING ERRCODE='P0001';END IF;`;
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
THEN RAISE EXCEPTION 'PCA-07 W5 protected baseline drift' USING ERRCODE='P0001';END IF;`;

const aclAssertion = (tables, functions, label) => `
FOREACH v_table IN ARRAY ${sqlTextArray(tables)} LOOP
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=('public.'||v_table)::regclass)
 THEN RAISE EXCEPTION 'PCA-07 W5 ${label} RLS missing: %',v_table USING ERRCODE='P0001';END IF;
 FOREACH v_role IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF has_table_privilege(v_role,'public.'||v_table,'SELECT') OR has_table_privilege(v_role,'public.'||v_table,'INSERT')
  OR has_table_privilege(v_role,'public.'||v_table,'UPDATE') OR has_table_privilege(v_role,'public.'||v_table,'DELETE')
  THEN RAISE EXCEPTION 'PCA-07 W5 ${label} client ACL exposure: %.%',v_role,v_table USING ERRCODE='P0001';END IF;
 END LOOP;
 IF NOT has_table_privilege('service_role','public.'||v_table,'SELECT')
 OR NOT has_table_privilege('service_role','public.'||v_table,'INSERT')
 OR NOT has_table_privilege('service_role','public.'||v_table,'UPDATE')
 OR NOT has_table_privilege('service_role','public.'||v_table,'DELETE')
 THEN RAISE EXCEPTION 'PCA-07 W5 ${label} service ACL missing: %',v_table USING ERRCODE='P0001';END IF;
END LOOP;
FOREACH v_signature IN ARRAY ${sqlTextArray(functions)} LOOP
 IF has_function_privilege('anon',v_signature,'EXECUTE') OR has_function_privilege('authenticated',v_signature,'EXECUTE')
 OR NOT has_function_privilege('service_role',v_signature,'EXECUTE')
 THEN RAISE EXCEPTION 'PCA-07 W5 ${label} function ACL mismatch: %',v_signature USING ERRCODE='P0001';END IF;
END LOOP;`;

function ledgerPairs(items) {
  return items.map(([version, name]) => `('${version}','${name}')`).join(",");
}

function commonPreflight(tenantId, priorEntries) {
  const priorPairs = priorEntries.length ? ledgerPairs(priorEntries.map((entry) => [entry.version, entry.name])) : null;
  return `
IF current_database()<>'postgres' OR current_user<>'postgres' OR current_setting('server_version_num')::integer/10000<>17
THEN RAISE EXCEPTION 'PCA-07 W5 backend identity mismatch' USING ERRCODE='P0001';END IF;
SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO v_columns FROM pg_attribute a
WHERE a.attrelid='supabase_migrations.schema_migrations'::regclass AND a.attnum>0 AND NOT a.attisdropped;
IF v_columns IS DISTINCT FROM ARRAY['version','statements','name','created_by','idempotency_key','rollback']::text[]
THEN RAISE EXCEPTION 'PCA-07 W5 ledger schema mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*),count(*)FILTER(WHERE tenant_id='${tenantId}'::uuid) INTO v_count,v_target_count FROM prm2_rebaseline.authorized_tenant_ids();
IF v_count<>1 OR v_target_count<>1 THEN RAISE EXCEPTION 'PCA-07 W5 tenant manifest mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE
(sm.version='20260728165000' AND sm.name='pr_m2_tenant_lifecycle' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=20253 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8') OR
(sm.version='20260728180000' AND sm.name='pr_m2_tenant_access_control' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=30313 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e') OR
(sm.version='20260828160617' AND sm.name='pca_07r2_w1_forensic_forward_only_ledger_reconciliation' AND array_length(sm.statements,1)=1
 AND octet_length(sm.statements[1])=77274 AND encode(extensions.digest(sm.statements[1],'sha256'),'hex')='3f4ff756caa611cd4e687444cebca6d912844aab26606b10942a37abcd6699aa');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W5 W1 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${ledgerPairs(W2_LEDGER)})
AND sm.created_by='PCA-07_W2_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
AND sm.idempotency_key='pca-07-w2:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W5 W2 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${ledgerPairs(W3_LEDGER)})
AND sm.created_by='PCA-07_W3_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
AND sm.idempotency_key='pca-07-w3:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>3 THEN RAISE EXCEPTION 'PCA-07 W5 W3 ledger mismatch' USING ERRCODE='P0001';END IF;
SELECT count(*) INTO v_count FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${ledgerPairs(W4_LEDGER)})
AND sm.created_by='PCA-07_W4_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1
AND sm.idempotency_key='pca-07-w4:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex');
IF v_count<>2 THEN RAISE EXCEPTION 'PCA-07 W5 W4 ledger mismatch' USING ERRCODE='P0001';END IF;
IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version=ANY(${sqlTextArray(W5.map((entry) => entry.version))}))<>${priorEntries.length}
${priorPairs ? `OR (SELECT count(*) FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${priorPairs}) AND sm.created_by='PCA-07_W5_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.idempotency_key='pca-07-w5:'||sm.version||':'||encode(extensions.digest(sm.statements[1],'sha256'),'hex'))<>${priorEntries.length}` : ""}
OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260826185014')
THEN RAISE EXCEPTION 'PCA-07 W5 ordered ledger boundary mismatch' USING ERRCODE='P0001';END IF;
IF to_regprocedure('public.resolve_tenant_permission(uuid,uuid,text,text,public.rbac_action)') IS NULL
OR to_regprocedure('public.crm_scope_allows_lead(uuid,uuid,text,uuid)') IS NULL
OR to_regprocedure('public.assert_tenant_marketing_authority(uuid,uuid,text,text)') IS NULL
OR to_regtype('public.blog_post_status') IS NULL OR to_regtype('public.rbac_action') IS NULL
THEN RAISE EXCEPTION 'PCA-07 W5 dependency signature mismatch' USING ERRCODE='P0001';END IF;
FOREACH v_table IN ARRAY ${sqlTextArray(REQUIRED_RELATIONS)} LOOP
 IF to_regclass('public.'||v_table) IS NULL THEN RAISE EXCEPTION 'PCA-07 W5 missing dependency relation: %',v_table USING ERRCODE='P0001';END IF;
END LOOP;
IF EXISTS(SELECT 1 FROM (SELECT tenant_id,id,count(*) FROM public.imoveis GROUP BY tenant_id,id HAVING count(*)>1)s)
OR EXISTS(SELECT 1 FROM (SELECT tenant_id,id,count(*) FROM public.leads GROUP BY tenant_id,id HAVING count(*)>1)s)
OR EXISTS(SELECT 1 FROM (SELECT tenant_id,id,count(*) FROM public.cms_pages GROUP BY tenant_id,id HAVING count(*)>1)s)
OR EXISTS(SELECT 1 FROM (SELECT tenant_id,id,count(*) FROM public.corretores GROUP BY tenant_id,id HAVING count(*)>1)s)
THEN RAISE EXCEPTION 'PCA-07 W5 composite authority collision' USING ERRCODE='P0001';END IF;
IF (SELECT count(*) FROM public.tenant_marketing_connectors WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_connector_versions WHERE tenant_id='${tenantId}'::uuid)<>4
OR (SELECT count(*) FROM public.tenant_marketing_field_mappings WHERE tenant_id='${tenantId}'::uuid AND is_current)<>4
THEN RAISE EXCEPTION 'PCA-07 W5 W4 marketing prerequisite mismatch' USING ERRCODE='P0001';END IF;
${protectedBaseline(tenantId)}`;
}

function presentState(groupIndex) {
  const presentTables = [
    groupIndex >= 0 ? CORE_TABLES : [],
    groupIndex >= 1 ? CMS_TABLES : [],
    groupIndex >= 2 ? CONTROL_TABLES : [],
  ].flat();
  const thresholds = [2, 6, 9, 11, 12, 17];
  return { presentTables, presentFunctions: NEW_FUNCTIONS.slice(0, thresholds[groupIndex]) };
}

function dataState(tenantId, groupIndex) {
  const { presentTables } = presentState(groupIndex);
  const empty = presentTables.length
    ? `FOREACH v_table IN ARRAY ${sqlTextArray(presentTables)} LOOP EXECUTE format('SELECT count(*) FROM public.%I',v_table) INTO v_count;IF v_count<>0 THEN RAISE EXCEPTION 'PCA-07 W5 target table not empty: %',v_table USING ERRCODE='P0001';END IF;END LOOP;`
    : "";
  const marketing = groupIndex >= 1
    ? `IF (SELECT count(*) FROM public.tenant_marketing_connectors WHERE tenant_id='${tenantId}'::uuid AND channel_key IN ('META_ADS','GOOGLE_ADS') AND adapter_version=1 AND provider_contract_version=1 AND verification_state='not_live_verified' AND availability_state='credential_required' AND NOT active AND ingestion_actor_user_id IS NULL AND ingestion_actor_origin IS NULL)<>2 THEN RAISE EXCEPTION 'PCA-07 W5 marketing hardening state mismatch' USING ERRCODE='P0001';END IF;IF position('current_version_id' IN pg_get_functiondef(to_regprocedure('public.schedule_tenant_cms_publication(uuid,uuid,text,uuid,uuid,bigint,timestamptz,text,text)')))<>0 OR position('draft_version_id' IN pg_get_functiondef(to_regprocedure('public.schedule_tenant_cms_publication(uuid,uuid,text,uuid,uuid,bigint,timestamptz,text,text)')))=0 THEN RAISE EXCEPTION 'PCA-07 W5 CMS final signature body mismatch' USING ERRCODE='P0001';END IF;`
    : "";
  const provenance = groupIndex >= 5
    ? `IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.tenant_upload_targets'::regclass AND attname='tenant_origin' AND atttypid='text'::regtype AND NOT attisdropped) THEN RAISE EXCEPTION 'PCA-07 W5 tenant_origin corrective missing' USING ERRCODE='P0001';END IF;`
    : "";
  return `${empty}${marketing}${provenance}`;
}

function envelopePreflight(tenantId, groupIndex, priorEntries, mediaAuthorityCorrective) {
  const before = groupIndex === 0 ? { presentTables: [], presentFunctions: [] } : presentState(groupIndex - 1);
  const absentTables = ALL_TABLES.filter((item) => !before.presentTables.includes(item));
  const absentFunctions = NEW_FUNCTIONS.filter((item) => !before.presentFunctions.includes(item));
  return `DO $w5pre$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_table text;BEGIN
${commonPreflight(tenantId, priorEntries)}
${catalogCount(before.presentTables, true, "table", "prior")}${catalogCount(absentTables, false, "table", "future")}
${catalogCount(before.presentFunctions, true, "function", "prior")}${catalogCount(absentFunctions, false, "function", "future")}
${groupIndex > 0 ? dataState(tenantId, groupIndex - 1) : ""}
${mediaAuthorityCorrective && groupIndex === 1 ? `IF to_regclass('public.${MEDIA_AUTHORITY_INDEX}') IS NOT NULL THEN RAISE EXCEPTION 'PCA-07 W5R media authority index unexpectedly present' USING ERRCODE='P0001';END IF;` : ""}
END;$w5pre$;`;
}

function ledgerInsert(entries) {
  const values = entries.map((entry) => `('${entry.version}',ARRAY[v_query],'${entry.name}','PCA-07_W5_LOVABLE_MANAGED_CONTROLLED_APPLICATION','pca-07-w5:${entry.version}:'||v_sha,ARRAY[]::text[])`).join(",");
  return `DO $w5ledger$ DECLARE v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN INSERT INTO supabase_migrations.schema_migrations(version,statements,name,created_by,idempotency_key,rollback) VALUES ${values};END;$w5ledger$;`;
}

function envelopePostflight(tenantId, groupIndex, completedEntries, currentEntries, mediaAuthorityCorrective) {
  const state = presentState(groupIndex);
  const serviceFunctions = state.presentFunctions.filter((item) => item !== INTERNAL_FUNCTION);
  if (groupIndex >= 1) serviceFunctions.push(...EXISTING_MARKETING_FUNCTIONS);
  const values = ledgerPairs(currentEntries.map((entry) => [entry.version, entry.name]));
  return `DO $w5post$ DECLARE v_count bigint;v_target_count bigint;v_columns text[];v_table text;v_role text;v_signature text;v_query text:=current_query();v_sha text:=encode(extensions.digest(current_query(),'sha256'),'hex');BEGIN
IF (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version=ANY(${sqlTextArray(W5.map((entry) => entry.version))}))<>${completedEntries.length}
OR (SELECT count(*) FROM supabase_migrations.schema_migrations sm WHERE (sm.version,sm.name) IN (VALUES ${values}) AND sm.created_by='PCA-07_W5_LOVABLE_MANAGED_CONTROLLED_APPLICATION' AND array_length(sm.statements,1)=1 AND sm.statements[1]=v_query AND sm.idempotency_key='pca-07-w5:'||sm.version||':'||v_sha AND COALESCE(array_length(sm.rollback,1),0)=0)<>${currentEntries.length}
THEN RAISE EXCEPTION 'PCA-07 W5 current envelope ledger mismatch' USING ERRCODE='P0001';END IF;
${catalogCount(state.presentTables, true, "table", "postflight")}${catalogCount(state.presentFunctions, true, "function", "postflight")}
${dataState(tenantId, groupIndex)}${aclAssertion(state.presentTables, serviceFunctions, "postflight")}
${mediaAuthorityCorrective && groupIndex >= 1 ? `IF to_regclass('public.${MEDIA_AUTHORITY_INDEX}') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_index WHERE indexrelid='public.${MEDIA_AUTHORITY_INDEX}'::regclass AND indisunique AND indisvalid AND indpred IS NULL) THEN RAISE EXCEPTION 'PCA-07 W5R media authority index mismatch' USING ERRCODE='P0001';END IF;` : ""}
${groupIndex >= 5 ? `IF has_function_privilege('anon','${INTERNAL_FUNCTION}','EXECUTE') OR has_function_privilege('authenticated','${INTERNAL_FUNCTION}','EXECUTE') THEN RAISE EXCEPTION 'PCA-07 W5 internal function client exposure' USING ERRCODE='P0001';END IF;` : ""}
${protectedBaseline(tenantId)}
END;$w5post$;`;
}

function prelude(tenantId, ownerAuthorization, capability) {
  const manifest = JSON.stringify([tenantId]);
  return `-- PCA-07 W5 Lovable-managed ordered atomic envelope: ${capability}\nBEGIN;\nSET LOCAL search_path=public,extensions,pg_temp;\nSELECT set_config('app.pr_m2_authorized_tenant_ids',${sqlString(manifest)},true);\nSELECT set_config('app.pr_m2_authorized_tenant_manifest_sha256','${sha256(tenantId.toLowerCase())}',true);\nSELECT set_config('app.pr_m2_owner_authorization',${sqlString(ownerAuthorization)},true);`;
}

export function buildApplication({ tenantId, ownerAuthorization, mediaAuthorityCorrective = false }) {
  assert.match(tenantId, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, "exact tenant UUID required");
  assert.match(ownerAuthorization, /^PCA-[0-9A-Z_-]{3,120}$/, "bounded PCA authorization required");
  const projected = readAndProject(mediaAuthorityCorrective);
  const completed = [];
  const envelopes = GROUPS.map((group, groupIndex) => {
    const entries = group.indexes.map((index) => projected[index]);
    const source = entries.map((entry) => entry.projected.trim()).join("\n");
    const sql = compactSql(`${prelude(tenantId, ownerAuthorization, group.capability)}\n${envelopePreflight(tenantId, groupIndex, completed, mediaAuthorityCorrective)}\n${source}\n${ledgerInsert(entries)}\n${envelopePostflight(tenantId, groupIndex, [...completed, ...entries], entries, mediaAuthorityCorrective)}\nCOMMIT;\n`);
    completed.push(...entries);
    return { capability: group.capability, versions: entries.map((entry) => entry.version), sql, bytes: Buffer.byteLength(sql), sha256: sha256(sql) };
  });
  return { envelopes, runtime: { authorization: ownerAuthorization, exactTenantCount: 1, tenantManifestSha256: sha256(tenantId.toLowerCase()) } };
}

export function buildContract() {
  const projectedMigrations = readAndProject().map((entry) => ({
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
    authority: { repository: "PROTECTED_GITHUB_MAIN_ONLY", canonicalBackend: "LOVABLE_MANAGED_BACKEND_ONLY", ownerSupabaseAccess: "LOVABLE_ONLY" },
    corrective: {
      executionMode: "SIX_ORDERED_ATOMIC_ENVELOPES",
      transportCompaction: "DETERMINISTIC_LITERAL_PRESERVING_SQL_COMPACTION",
      semanticProjection: "BYTE_IDENTICAL_SEMANTICS",
      ledgerStatementMode: "EXACT_TRANSPORT_QUERY_VIA_CURRENT_QUERY",
      cmsIntermediateDefectContainedAtomically: true,
      blindReplayAllowed: false,
    },
    groups: GROUPS.map((group) => ({ capability: group.capability, versions: group.indexes.map((index) => W5[index].version) })),
    projectedMigrations,
    projections: ["BYTE_IDENTICAL_SEMANTICS", "TRANSPORT_SAFE_SQL_COMPACTION"],
    liveReadOnlyBaseline: {
      postgresVersion: "17.6", tenantCount: 74, exactTargetCount: 1,
      w1LedgerRows: 3, w2LedgerRows: 3, w3LedgerRows: 3, w4LedgerRows: 2, w5LedgerRows: 0,
      w5TablesPresent: 0, w5FunctionsPresent: 0, marketingConnectorRows: 4,
      portalConnectorCount: 444, retainedSensitiveFields: 888, storageObjectCount: 22, storageBytes: 15826788,
    },
    security: {
      tableCount: ALL_TABLES.length, newFunctionCount: NEW_FUNCTIONS.length,
      clientRolesDenied: ["PUBLIC", "anon", "authenticated"], serviceRoleRequired: true,
      dataApiExposureImplicitlyTrusted: false,
    },
    controls: {
      repositoryImplementationOnly: true, sameBackendReads: 0, sameBackendWrites: 0,
      directSupabaseCalls: 0, providerMutation: false, deploy: false, roadmapUpdate: false,
      pr105Mutation: false, canonicalMigrationMutation: false,
    },
  };
}
