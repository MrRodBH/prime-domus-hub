import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  buildApplication,
  buildContract,
  CMS_CREATED_FUNCTIONS,
  CMS_FUNCTIONS,
  CMS_TABLES,
  compactSql,
  CORRECTIVE_VERSION,
  CRM_FUNCTIONS,
  CRM_CREATED_FUNCTIONS,
  CRM_TABLES,
  GATE,
  MANIFEST_PATH,
  projectCms,
  projectCrm,
  SOURCE_MAIN,
  SOURCE_TREE,
  W3,
} from "./scripts/build-pca-07-w3-transport-safe-corrective.mjs";

const IMPACT =
  "docs/architecture/impact-analysis/PCA-07-W3-cms-crm-transport-safe-atomic-ledger-aware-corrective.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w3-cms-crm-transport-safe-atomic-ledger-aware-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w3-transport-safe-corrective.mjs";
const TEST = "run-pca-07-w3-transport-safe-corrective-specs.mjs";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => {
  for (const needle of needles) assert.ok(value.includes(needle), `${label} missing ${needle}`);
};

const manifest = JSON.parse(read(MANIFEST_PATH));
assert.deepEqual(manifest, buildContract(), "W3 contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.corrective.version, CORRECTIVE_VERSION);
assert.equal(manifest.corrective.executionMode, "TWO_ORDERED_MIGRATION_LOCAL_ATOMIC_ENVELOPES");
assert.equal(manifest.corrective.cmsMustCommitBeforeCrm, true);
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.deepEqual(manifest.projections, [
  "POSTGRES_UUID_ARRAY_AGG_AUTHORITY_X5",
  "TRANSITION_LEAD_STATUS_INTEGER_SIGNATURE",
  "TRANSPORT_SAFE_SQL_COMPACTION",
]);
assert.equal(manifest.security.cmsTableCount, CMS_TABLES.length);
assert.equal(manifest.security.cmsFunctionCount, CMS_FUNCTIONS.length);
assert.equal(manifest.security.crmTableCount, CRM_TABLES.length);
assert.equal(manifest.security.crmFunctionCount, CRM_FUNCTIONS.length);
assert.equal(CMS_CREATED_FUNCTIONS.length, 14);
assert.equal(CRM_CREATED_FUNCTIONS.length, 21);
assert.equal(manifest.security.dataApiExposureImplicitlyTrusted, false);
assert.equal(manifest.controls.repositoryImplementationOnly, true);
assert.equal(manifest.controls.sameBackendReads, 0);
assert.equal(manifest.controls.sameBackendWrites, 0);
assert.equal(manifest.controls.directSupabaseCalls, 0);
assert.equal(manifest.controls.canonicalMigrationMutation, false);

for (const [index, entry] of W3.entries()) {
  const source = read(entry.path);
  const projected = entry.capability === "CMS" ? projectCms(source) : projectCrm(source);
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.equal(sha256(source), entry.sha256);
  assert.equal(
    Buffer.byteLength(projected),
    manifest.projectedMigrations[index].projectedBodyBytes,
  );
  assert.equal(sha256(projected), manifest.projectedMigrations[index].projectedBodySha256);
}

const crmProjection = projectCrm(read(W3[1].path));
assert.equal(occurrences(crmProjection, "min(id)"), 0);
assert.equal(occurrences(crmProjection, "(array_agg(id ORDER BY id))[1]"), 5);
assert.equal(
  occurrences(crmProjection, "public.transition_lead_status(uuid,text,bigint,uuid,jsonb)"),
  0,
);
assert.equal(
  occurrences(crmProjection, "public.transition_lead_status(uuid,text,integer,uuid,jsonb)"),
  1,
);

const compacted = compactSql(
  "SELECT 'two  spaces -- literal'; -- removed\nDO $x$ BEGIN RAISE NOTICE 'inner  literal'; -- inner removed\nEND;$x$;\n",
);
assert.ok(compacted.includes("'two  spaces -- literal'"));
assert.ok(compacted.includes("'inner  literal'"));
assert.ok(!compacted.includes("removed"));

const tenantId = "9664d189-4a12-4caa-8243-dc73383447e6";
const authorization = "PCA-07_W3_CONTROLLED_APPLICATION";
const first = buildApplication({ tenantId, ownerAuthorization: authorization });
const second = buildApplication({ tenantId, ownerAuthorization: authorization });
assert.deepEqual(first, second, "W3 application generation must be deterministic");
const { cmsSql, crmSql, runtime } = first;
assert.equal(runtime.exactTenantCount, 1);
assert.equal(runtime.tenantManifestSha256, sha256(tenantId));
assert.equal(runtime.cmsSqlBytes, Buffer.byteLength(cmsSql));
assert.equal(runtime.cmsSqlSha256, sha256(cmsSql));
assert.equal(runtime.crmSqlBytes, Buffer.byteLength(crmSql));
assert.equal(runtime.crmSqlSha256, sha256(crmSql));
assert.equal(runtime.cmsSqlBytes, 74502);
assert.equal(
  runtime.cmsSqlSha256,
  "313c67a0dc8fdfcb77d76c4c1149b23dd6fe9af9c73708d1bf9d0bcbaf14d490",
);
assert.equal(runtime.crmSqlBytes, 76824);
assert.equal(
  runtime.crmSqlSha256,
  "acc00b4317ef4da5a0e9285bed4819a711b58f825c249be979f83ed8d59c9f49",
);
assert.ok(runtime.cmsSqlBytes < 77000);
assert.ok(runtime.crmSqlBytes < 77000);

for (const [label, sql] of [
  ["CMS", cmsSql],
  ["CRM", crmSql],
]) {
  assert.equal(occurrences(sql, "BEGIN;"), 1, `${label} must own one transaction`);
  assert.equal(occurrences(sql, "COMMIT;"), 1, `${label} must own one commit`);
  assert.equal(occurrences(sql, "SELECT set_config('app.pr_m2_authorized_tenant_ids'"), 1);
  assert.equal(occurrences(sql, authorization), 1);
  assert.ok(sql.includes("current_query()"));
  assert.ok(sql.includes("statements[1]=v_query") || sql.includes("statements[1]=q"));
  assert.ok(sql.includes("protected baseline drift"));
  assert.ok(!sql.includes("supabase migration repair"));
  assert.ok(!sql.includes("DELETE FROM supabase_migrations"));
  assert.ok(!sql.includes("UPDATE supabase_migrations"));
}

mustContain(
  cmsSql,
  [
    "CREATE TABLE IF NOT EXISTS public.cms_page_versions",
    "PCA-07 W3 CMS target baseline mismatch",
    "PCA-07 W3 CMS data postcondition mismatch",
    "PCA-07 W3 CMS client ACL exposure",
    `('${W3[0].version}',ARRAY[v_query],'${W3[0].name}'`,
  ],
  "CMS envelope",
);
assert.equal(occurrences(cmsSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);
assert.ok(!cmsSql.includes("CREATE TABLE IF NOT EXISTS public.crm_pipelines"));

mustContain(
  crmSql,
  [
    "CREATE TABLE IF NOT EXISTS public.crm_pipelines",
    "(array_agg(id ORDER BY id))[1]",
    "public.transition_lead_status(uuid,text,integer,uuid,jsonb)",
    "PCA-07 W3 CRM catalog postcondition",
    "PCA-07 W3 CRM function ACL",
    `('${W3[1].version}',ARRAY[v_query],'${W3[1].name}'`,
    `('${CORRECTIVE_VERSION}',ARRAY[v_query]`,
  ],
  "CRM envelope",
);
assert.equal(occurrences(crmSql, "(array_agg(id ORDER BY id))[1]"), 5);
assert.equal(occurrences(crmSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);

assert.throws(
  () => buildApplication({ tenantId: "rm-prime", ownerAuthorization: authorization }),
  /exact tenant UUID required/,
);
assert.throws(
  () => buildApplication({ tenantId, ownerAuthorization: "INVALID" }),
  /bounded PCA authorization required/,
);

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts["test:pca-07-w3"],
  "node ./run-pca-07-w3-transport-safe-corrective-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w3"));

const workflow = read(".github/workflows/release-gate.yml");
mustContain(
  workflow,
  [
    "pca_07_w3=false",
    TEST,
    "pca_07_w3=true",
    'echo "pca_07_w3=$pca_07_w3" >> "$GITHUB_OUTPUT"',
    "Verify PCA-07 W3 CMS/CRM transport-safe corrective",
    "PCA_07_W3_BASE_SHA:",
    "run: bun run test:pca-07-w3",
  ],
  "release workflow",
);

const impact = read(IMPACT);
const evidence = read(EVIDENCE);
const continuity = read(CONTINUITY);
mustContain(
  impact,
  [
    `SOURCE_MAIN = ${SOURCE_MAIN}`,
    `SOURCE_TREE = ${SOURCE_TREE}`,
    "five UUID",
    "two ordered migration-local atomic envelopes",
    "Blind replay is forbidden",
    "CANONICAL_MIGRATION_MUTATION = false",
    "PR_105_MUTATION = false",
  ],
  "impact",
);
mustContain(
  evidence,
  [
    `SOURCE_MAIN=${SOURCE_MAIN}`,
    `SOURCE_TREE=${SOURCE_TREE}`,
    `CORRECTIVE_VERSION=${CORRECTIVE_VERSION}`,
    "EXECUTION_ENVELOPES=2",
    "W3_LIVE_LEDGER_BEFORE_IMPLEMENTATION=0/3",
    "W3_UUID_AGGREGATE_REWRITES=5",
    "SAME_BACKEND_WRITES=0",
  ],
  "evidence",
);
mustContain(
  continuity,
  [
    "## 28. PCA-07 W3",
    `PCA07_W3_SOURCE_MAIN=${SOURCE_MAIN}`,
    "PCA07_W3_UUID_AGGREGATE_REWRITES=5",
    "PCA07_W3_SAME_BACKEND_WRITES=0",
  ],
  "continuity",
);

const base = process.env.PCA_07_W3_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07 W3 must be based on accepted main");
  const changed = execFileSync("git", ["diff", "--name-only", `${base}..HEAD`], {
    encoding: "utf8",
  })
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const allowed = [
    ".github/workflows/release-gate.yml",
    "package.json",
    BUILDER,
    TEST,
    MANIFEST_PATH,
    IMPACT,
    EVIDENCE,
    CONTINUITY,
  ].sort();
  assert.deepEqual(changed, allowed, "exact PCA-07 W3 diff changed");
  assert.equal(
    changed.some((path) => path.startsWith("supabase/migrations/")),
    false,
  );
}

console.log("PCA-07 W3 CMS/CRM transport-safe corrective: PASS");
