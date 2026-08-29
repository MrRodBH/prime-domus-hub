import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BRANCH,
  buildApplication,
  buildContract,
  CONFIG_FUNCTIONS,
  CORRECTIVE_VERSION,
  GATE,
  MANIFEST_PATH,
  PORTAL_FUNCTIONS,
  SOURCE_MAIN,
  SOURCE_TREE,
  W2,
} from "./scripts/build-pca-07-w2-transport-safe-corrective.mjs";

const IMPACT =
  "docs/architecture/impact-analysis/PCA-07-W2-transport-safe-atomic-ledger-aware-compatibility-corrective.md";
const EVIDENCE =
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pca-07-w2-transport-safe-atomic-ledger-aware-compatibility-corrective.md";
const CONTINUITY = "docs/architecture/governance/RM_PRIME_SAFE_CHAT_MIGRATION_2026-08-25.md";
const BUILDER = "scripts/build-pca-07-w2-transport-safe-corrective.mjs";
const TEST = "run-pca-07-w2-transport-safe-corrective-specs.mjs";

const read = (path) => readFileSync(path, "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const occurrences = (value, needle) => value.split(needle).length - 1;
const mustContain = (value, needles, label) => {
  for (const needle of needles) {
    assert.ok(value.includes(needle), `${label} missing ${needle}`);
  }
};

const manifest = JSON.parse(read(MANIFEST_PATH));
const generatedContract = buildContract();
assert.deepEqual(manifest, generatedContract, "W2 contract manifest drift");
assert.equal(manifest.gate, GATE);
assert.equal(manifest.branch, BRANCH);
assert.equal(manifest.sourceMain, SOURCE_MAIN);
assert.equal(manifest.sourceTree, SOURCE_TREE);
assert.equal(manifest.corrective.version, CORRECTIVE_VERSION);
assert.equal(manifest.corrective.executionMode, "TWO_ORDERED_MIGRATION_LOCAL_ATOMIC_ENVELOPES");
assert.equal(manifest.corrective.transportSourceCopiesPerMigration, 1);
assert.equal(manifest.corrective.blindReplayAllowed, false);
assert.equal(manifest.projectedMigrations.length, 2);
assert.deepEqual(manifest.projections, [
  "PG_MAX_FUNCTION_ARGS_JSONB_OBJECT_SPLIT",
  "LEGACY_INSTAGRAM_HANDLE_TO_HTTPS",
  "PORTAL_CREDENTIAL_NULL_DEFAULTS",
  "DEFER_NO_PLAINTEXT_CHECK_UNTIL_CREDENTIAL_CUTOVER",
]);
assert.equal(manifest.security.configFunctionCount, CONFIG_FUNCTIONS.length);
assert.equal(manifest.security.portalFunctionCount, PORTAL_FUNCTIONS.length);
assert.equal(manifest.controls.repositoryImplementationOnly, true);
assert.equal(manifest.controls.sameBackendReads, 0);
assert.equal(manifest.controls.sameBackendWrites, 0);
assert.equal(manifest.controls.lovableCalls, 0);
assert.equal(manifest.controls.directSupabaseCalls, 0);
assert.equal(manifest.controls.portalSecretErasure, false);

for (const [index, entry] of W2.entries()) {
  const source = read(entry.path);
  const projected = manifest.projectedMigrations[index];
  assert.equal(Buffer.byteLength(source), entry.bytes);
  assert.equal(sha256(source), entry.sha256);
  assert.equal(projected.canonicalBytes, entry.bytes);
  assert.equal(projected.canonicalSha256, entry.sha256);
}

const testTenantId = "00000000-0000-4000-8000-000000000001";
const { configurationSql, portalSql, runtime } = buildApplication({
  tenantId: testTenantId,
  ownerAuthorization: "PCA-07_W2_TEST_ONLY",
});
assert.equal(runtime.exactTenantCount, 1);
assert.equal(runtime.tenantManifestSha256, sha256(testTenantId));
assert.equal(runtime.configurationSqlBytes, Buffer.byteLength(configurationSql));
assert.equal(runtime.configurationSqlSha256, sha256(configurationSql));
assert.equal(runtime.portalSqlBytes, Buffer.byteLength(portalSql));
assert.equal(runtime.portalSqlSha256, sha256(portalSql));
assert.ok(runtime.configurationSqlBytes < 77000);
assert.ok(runtime.portalSqlBytes < 77000);

for (const [label, sql] of [
  ["configuration", configurationSql],
  ["portal", portalSql],
]) {
  assert.equal(occurrences(sql, "\nBEGIN;\n"), 1, `${label} must own one transaction`);
  assert.equal(occurrences(sql, "\nCOMMIT;\n"), 1, `${label} must own one commit`);
  assert.equal(occurrences(sql, "SELECT set_config('app.pr_m2_authorized_tenant_ids'"), 1);
  assert.equal(occurrences(sql, testTenantId), 1 + occurrences(sql, `'${testTenantId}'::uuid`));
  assert.ok(!sql.includes("WHERE slug"));
  assert.ok(!sql.includes("supabase migration repair"));
  assert.ok(!sql.includes("DELETE FROM supabase_migrations"));
  assert.ok(!sql.includes("UPDATE supabase_migrations"));
  assert.ok(sql.includes("v_query text := current_query()"));
  assert.ok(sql.includes("statements[1] = v_query") || sql.includes("statements[1]=v_query"));
  assert.ok(sql.includes("protected baseline drift"));
  assert.ok(sql.includes("unexpected W3-W6 ledger row"));
}

assert.equal(occurrences(configurationSql, "-- PR-M2 — Configuration Center"), 1);
assert.equal(occurrences(configurationSql, "INSERT INTO public.site_settings_versions"), 3);
mustContain(
  configurationSql,
  [
    "PG_MAX_FUNCTION_ARGS_JSONB_OBJECT_SPLIT",
    "LEGACY_INSTAGRAM_HANDLE_TO_HTTPS",
    ") || jsonb_build_object(",
    "'https://instagram.com/' || ltrim",
    "expected one canonicalizable Instagram handle",
    `('${W2[0].version}', ARRAY[v_query], '${W2[0].name}'`,
    "configuration ledger postcondition mismatch",
    "configuration client ACL exposure",
  ],
  "configuration envelope",
);
assert.ok(
  !configurationSql.includes(
    "'map_embed_url', NULLIF(ls.settings->'pagina_contato'->>'mapa_url', ''),\n    'menu_locations'",
  ),
);
assert.equal(occurrences(configurationSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);

assert.equal(occurrences(portalSql, "-- PR-M2 — Portal Connector Registry"), 1);
mustContain(
  portalSql,
  [
    "PORTAL_CREDENTIAL_NULL_DEFAULTS",
    "DEFER_NO_PLAINTEXT_CHECK_UNTIL_CUTOVER",
    "ALTER COLUMN feed_token DROP DEFAULT",
    "ALTER COLUMN webhook_secret DROP DEFAULT",
    "plaintext-removal CHECK is intentionally deferred",
    `('${W2[1].version}', ARRAY[v_query], '${W2[1].name}'`,
    `('${CORRECTIVE_VERSION}', ARRAY[v_query]`,
    "retained credential postcondition mismatch",
    "portal client ACL exposure",
  ],
  "portal envelope",
);
assert.equal(
  occurrences(portalSql, "ADD CONSTRAINT portal_connectors_no_plaintext_credentials_check"),
  0,
);
assert.equal(occurrences(portalSql, "INSERT INTO supabase_migrations.schema_migrations"), 1);
assert.ok(!portalSql.includes("SET feed_token = NULL"));
assert.ok(!portalSql.includes("SET webhook_secret = NULL"));
assert.ok(
  portalSql.indexOf(`version = '${W2[0].version}'`) <
    portalSql.indexOf("-- PR-M2 — Portal Connector Registry"),
);

assert.throws(
  () => buildApplication({ tenantId: "rm-prime", ownerAuthorization: "PCA-07_W2_TEST_ONLY" }),
  /exact tenant UUID required/,
);
assert.throws(
  () => buildApplication({ tenantId: testTenantId, ownerAuthorization: "INVALID" }),
  /PCA Owner authorization reference required/,
);

const packageJson = JSON.parse(read("package.json"));
assert.equal(
  packageJson.scripts["test:pca-07-w2"],
  "node ./run-pca-07-w2-transport-safe-corrective-specs.mjs",
);
assert.ok(packageJson.scripts["verify:release"].includes("bun run test:pca-07-w2"));

const workflow = read(".github/workflows/release-gate.yml");
mustContain(
  workflow,
  [
    "pca_07_w2=false",
    TEST,
    "pca_07_w2=true",
    'echo "pca_07_w2=$pca_07_w2" >> "$GITHUB_OUTPUT"',
    "Verify PCA-07 W2 transport-safe atomic ledger-aware corrective",
    "PCA_07_W2_BASE_SHA:",
    "run: bun run test:pca-07-w2",
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
    "two ordered SQL",
    "blind replay is forbidden",
    "PORTAL_SECRET_ERASURE = false",
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
    "W2_LIVE_LEDGER_BEFORE_IMPLEMENTATION=0/2",
    "SAME_BACKEND_WRITES=0",
  ],
  "evidence",
);
mustContain(
  continuity,
  [
    "## 26. PCA-07 W2",
    `PCA07_W2_SOURCE_MAIN=${SOURCE_MAIN}`,
    "PCA07_W2_ENVELOPES=2_MIGRATION_LOCAL_ATOMIC",
    "PCA07_W2_PORTAL_SECRET_ERASURE=false",
  ],
  "continuity",
);

const base = process.env.PCA_07_W2_BASE_SHA?.trim();
if (base) {
  assert.match(base, /^[0-9a-f]{40}$/);
  assert.equal(base, SOURCE_MAIN, "PCA-07 W2 must be based on accepted main");
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
  assert.deepEqual(changed, allowed, "exact PCA-07 W2 diff changed");
  assert.equal(
    changed.some((path) => path.startsWith("supabase/migrations/")),
    false,
  );
}

console.log("PCA-07 W2 transport-safe corrective: PASS");
