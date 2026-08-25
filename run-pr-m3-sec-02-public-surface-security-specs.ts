import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runPublicPropertyAddressProjectionSpecs } from "./src/lib/__tests__/public-property-address-projection.spec";
import { runPublicSurfaceSecuritySqlStructuralSpecs } from "./src/lib/__tests__/public-surface-security-sql-structural.spec";

const root = process.cwd();
const baseSha =
  process.env.PR_M3_SEC_02_BASE_SHA ?? "2072e7cc97cd2583feb6d7e3acae169c173d86e5";
let assertions = 0;

const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

function equal<T>(actual: T, expected: T, message: string) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

const allowlist = new Set([
  "src/lib/public-property-address-projection.server.ts",
  "src/lib/api/catalogo.functions.ts",
  "src/routes/imovel.$slug.tsx",
  "supabase/migrations/20260825213000_pr_m3_sec_02_public_surface_security_hardening.sql",
  "src/lib/__tests__/public-property-address-projection.spec.ts",
  "src/lib/__tests__/public-surface-security-sql-structural.spec.ts",
  "run-pr-m3-sec-02-public-surface-security-specs.ts",
  "package.json",
  ".github/workflows/release-gate.yml",
  "docs/architecture/impact-analysis/PR-M3-SEC-01-public-surface-security-requalification-impact-analysis.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-02-public-surface-security-evidence.md",
]);

const localUntracked =
  process.env.GITHUB_ACTIONS === "true" ? "" : git("ls-files", "--others", "--exclude-standard");
const changed = new Set(
  [
    git("diff", "--name-only", `${baseSha}...HEAD`),
    git("diff", "--name-only"),
    git("diff", "--cached", "--name-only"),
    localUntracked,
  ]
    .flatMap((output) => output.split("\n"))
    .filter(Boolean),
);

for (const path of changed) ok(allowlist.has(path), `changed path must be allowlisted: ${path}`);
equal(changed.size, allowlist.size, "SEC-02 must change exactly eleven frozen paths");
for (const path of allowlist) ok(changed.has(path), `SEC-02 exact allowlist path must change: ${path}`);

equal(
  read("bun.lock"),
  `${git("show", `${baseSha}:bun.lock`)}\n`,
  "bun.lock must remain byte-for-byte unchanged",
);

const packageJson = JSON.parse(read("package.json")) as Record<string, unknown>;
const basePackageJson = JSON.parse(git("show", `${baseSha}:package.json`)) as Record<string, unknown>;
for (const key of ["dependencies", "devDependencies", "pnpm", "overrides", "resolutions"]) {
  equal(packageJson[key], basePackageJson[key], `${key} must remain unchanged`);
}

const scripts = packageJson.scripts as Record<string, string>;
const baseScripts = basePackageJson.scripts as Record<string, string>;
ok(
  scripts["test:pr-m3-sec-02"] ===
    "tsx --tsconfig tsconfig.json ./run-pr-m3-sec-02-public-surface-security-specs.ts",
  "focused SEC-02 package script missing",
);
ok(
  scripts["verify:release"]?.startsWith("bun run test:pr-m3-sec-02 &&"),
  "verify:release must start with the active SEC-02 focused gate",
);
ok(
  scripts["test:pr-m3-fvs6"] === baseScripts["test:pr-m3-fvs6"],
  "historical FVS6 script must remain available",
);

const projection = read("src/lib/public-property-address-projection.server.ts");
const catalog = read("src/lib/api/catalogo.functions.ts");
const route = read("src/routes/imovel.$slug.tsx");
const migration = read(
  "supabase/migrations/20260825213000_pr_m3_sec_02_public_surface_security_hardening.sql",
);
const workflow = read(".github/workflows/release-gate.yml");
const campaignWriter = read("src/lib/public-writers/public-campaign-writer.server.ts");
const campaignApi = read("src/lib/api/campaigns.functions.ts");
const brokerApi = read("src/lib/api/tenant-broker-directory.functions.ts");
const originsApi = read("src/lib/api/origens.functions.ts");

for (const token of [
  'export type PublicAddressMode = "hidden" | "street" | "full"',
  "projectPublicPropertyAddress",
  "public_address_mode",
  "public_location_label",
  "public_map_query",
  "public_latitude",
  "public_longitude",
  "delete safe[key]",
]) {
  ok(projection.includes(token), `address projection contract missing: ${token}`);
}
ok(
  projection.indexOf("withoutRawAddress(row)") < projection.indexOf("if (fullRequested)"),
  "raw address must be stripped before mode selection",
);
ok(
  projection.includes("row.mostrar_endereco_completo === true") &&
    projection.includes("row.mostrar_rua === true"),
  "visibility flags must require literal server-read booleans",
);
ok(
  projection.includes("if (coordinateInputPresent && !exactCoordinates)"),
  "inconsistent coordinate pairs must fail closed",
);

ok(
  catalog.includes('from "@/lib/public-property-address-projection.server"'),
  "catalog must import server-owned address projection",
);
ok(
  catalog.includes("return projectPublicPropertyAddress(dto);"),
  "property detail must project address before serialization",
);
ok(!catalog.includes("endereco.ilike"), "public search must not inspect hidden address");
ok(
  catalog.includes("titulo.ilike") && catalog.includes("codigo.ilike"),
  "public title/code search must remain available",
);
ok(
  catalog.indexOf("assertTenantScopedRows") < catalog.indexOf("projectPublicPropertyAddress(dto)"),
  "tenant validation must precede address projection",
);

for (const forbidden of [
  "mostrar_rua",
  "mostrar_endereco_completo",
  "imovel.rua",
  "imovel.endereco",
  "imovel.numero",
  "imovel.complemento",
  "imovel.cep",
  "imovel.latitude",
  "imovel.longitude",
]) {
  ok(!route.includes(forbidden), `client route must not consume raw address authority: ${forbidden}`);
}
for (const required of [
  "public_address_mode",
  "public_location_label",
  "public_map_query",
  "public_latitude",
  "public_longitude",
]) {
  ok(route.includes(required), `client route must consume projected field: ${required}`);
}
ok(
  route.includes('mode === "full"') && route.includes("exactCoordinates"),
  "map must accept exact coordinates only in full mode",
);
ok(
  !route.includes("Belo Horizonte, MG"),
  "map must not reconstruct a hard-coded raw address context",
);

for (const required of [
  'DROP POLICY IF EXISTS "events_public_insert"',
  'DROP POLICY IF EXISTS "corretores self update"',
  'DROP POLICY IF EXISTS "lead_origens public read ativo"',
  "REVOKE EXECUTE ON FUNCTION public.user_belongs_to_tenant(uuid) FROM anon",
  "DO $preflight$",
  "DO $postcondition$",
]) {
  ok(migration.includes(required), `migration contract missing: ${required}`);
}
ok(!migration.includes("sandbox_exec"), "repository migration must not mutate sandbox_exec");

const campaignHandlerStart = campaignApi.indexOf("export const registrarEventoCampanha");
const campaignHandler =
  campaignHandlerStart >= 0 ? campaignApi.slice(campaignHandlerStart) : "";
ok(
  campaignHandler.includes("requirePublicWriterTenantFromRequest") &&
    campaignHandler.includes("recordPublicCampaignEvent") &&
    !campaignHandler.includes("supabaseAdmin") &&
    !campaignHandler.includes("await publicClient"),
  "public campaign event path must remain host-derived and server-owned",
);
ok(
  campaignWriter.includes("supabaseAdmin") &&
    campaignWriter.includes("tenant.id"),
  "campaign writer must retain server-side tenant authority",
);
ok(
  brokerApi.includes("adminSalvarCorretor") &&
    brokerApi.includes("adminExcluirCorretor") &&
    brokerApi.includes("supabaseAdmin"),
  "broker writes must remain behind canonical server functions",
);
ok(
  originsApi.includes("requireTenant") &&
    originsApi.includes("authorizeTenantCrmOperation") &&
    originsApi.includes('.eq("tenant_id", decision.tenantId)'),
  "lead source operations must remain authenticated and tenant-scoped",
);

for (const token of [
  "pr_m3_sec_02=false",
  "pr_m3_sec_02=true",
  "PR_M3_SEC_02_BASE_SHA",
  "bun run test:pr-m3-sec-02",
]) {
  ok(workflow.includes(token), `Release Gate SEC-02 wiring missing: ${token}`);
}

const frozenFvsPaths = [
  "run-pr-m3-fvs3-property-inventory-read-only-specs.ts",
  "run-pr-m3-fvs4-insights-visual-intelligence-specs.ts",
  "run-pr-m3-fvs5-operations-read-only-specs.ts",
  "run-pr-m3-fvs6-broker-team-directory-read-only-specs.ts",
  "src/components/inventory/PropertyInventoryReadOnlyPage.tsx",
  "src/components/insights/InsightsVisualIntelligencePage.tsx",
  "src/components/operations/AuthenticatedOperationsReadOnlyPage.tsx",
  "src/components/directory/BrokerTeamDirectoryReadOnlyPage.tsx",
];
const frozenDiff = spawnSync(
  "git",
  ["diff", "--quiet", `${baseSha}...HEAD`, "--", ...frozenFvsPaths],
  { cwd: root },
);
ok(frozenDiff.status === 0, "FVS3-FVS6 terminal implementation paths must remain unchanged");

const projectionResult = await runPublicPropertyAddressProjectionSpecs();
equal(projectionResult.failed, 0, "address projection focused specs must pass");
const sqlResult = await runPublicSurfaceSecuritySqlStructuralSpecs();
equal(sqlResult.failed, 0, "SQL structural focused specs must pass");

console.log(
  JSON.stringify(
    {
      status: "PASS",
      stage: "PR-M3-SEC-02",
      baseSha,
      changedPaths: [...changed].sort(),
      exactAllowlistCount: changed.size,
      addressProjectionSpecsPassed: projectionResult.passed,
      sqlStructuralSpecsPassed: sqlResult.passed,
      assertions,
      bunLockByteIdentical: true,
      dependenciesUnchanged: true,
      databaseApplied: false,
      providerWrites: 0,
      deploy: false,
      productionPublish: false,
    },
    null,
    2,
  ),
);
