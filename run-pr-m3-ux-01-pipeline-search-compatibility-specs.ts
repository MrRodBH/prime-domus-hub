import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  migrateLegacyLeadsSearch,
  pipelineSearchSchema,
} from "./src/components/pipeline/search-schema";

const root = process.cwd();
const baseSha =
  process.env.PR_M3_UX_01_BASE_SHA ?? "3b70a96e535ef40ab0c246f4cf7b63d3bd3a6397";
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
  "src/routes/_authenticated.admin.leads.tsx",
  "src/components/pipeline/search-schema.ts",
  "src/components/workspace/CommandPalette.tsx",
  "run-pr-m3-ux-01-pipeline-search-compatibility-specs.ts",
  "package.json",
  "docs/architecture/impact-analysis/PR-M3-UX-01-pipeline-search-compatibility-impact-analysis.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-ux-01-pipeline-search-compatibility-evidence.md",
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
equal(changed.size, allowlist.size, "UX-01 must change exactly seven frozen paths");
for (const path of allowlist) ok(changed.has(path), `UX-01 exact allowlist path must change: ${path}`);

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
ok(
  scripts["test:pr-m3-ux-01"] ===
    "tsx --tsconfig tsconfig.json ./run-pr-m3-ux-01-pipeline-search-compatibility-specs.ts",
  "focused UX-01 package script missing",
);
ok(
  scripts["verify:release"]?.startsWith("bun run test:pr-m3-ux-01 &&"),
  "verify:release must start with the active UX-01 focused gate",
);
ok(
  scripts["test:pr-m3-sec-02"] ===
    "tsx --tsconfig tsconfig.json ./run-pr-m3-sec-02-public-surface-security-specs.ts",
  "accepted SEC-02 focused script must remain available",
);

const canonical = pipelineSearchSchema.parse({
  item: "3f26c6ba-44da-48e0-982d-632a64a0d7b1",
  q: "  Cliente  ",
  status: "proposta",
  origem: "  Portal  ",
});
equal(
  canonical,
  {
    item: "3f26c6ba-44da-48e0-982d-632a64a0d7b1",
    q: "Cliente",
    status: "proposta",
    origem: "Portal",
  },
  "canonical pipeline search must preserve only validated presentation state",
);

equal(
  pipelineSearchSchema.parse({
    new: "1",
    view: "list",
    tab: "ativos",
    density: "compact",
    desconhecido: "valor",
  }),
  {},
  "benign legacy and unknown presentation parameters must be stripped without breaking navigation",
);

equal(
  pipelineSearchSchema.parse({
    item: "not-a-uuid",
    status: "invalid",
    q: ["duplicated"],
    origem: { nested: true },
  }),
  {},
  "malformed presentation parameters must be discarded deterministically",
);

for (const authority of [
  { tenant_id: "client-tenant" },
  { role: "admin" },
  { scope: "all" },
  { command: "update" },
  { action: "delete" },
  { impersonation: "tenant" },
]) {
  assert.throws(
    () => pipelineSearchSchema.parse(authority),
    /unrecognized client authority key/i,
    "authority-bearing URL state must fail closed",
  );
  assertions += 1;
}

equal(
  migrateLegacyLeadsSearch({
    q: "Ana",
    origem: "Portal",
    tab: "descartados",
    view: "kanban",
    corretor_id: "legacy-filter",
  }),
  { q: "Ana", origem: "Portal", status: "descartado" },
  "legacy discarded-tab links must map to the canonical status and drop retired filters",
);

equal(
  migrateLegacyLeadsSearch({
    item: "3f26c6ba-44da-48e0-982d-632a64a0d7b1",
    tab: "kanban",
    new: "1",
  }),
  { item: "3f26c6ba-44da-48e0-982d-632a64a0d7b1" },
  "legacy navigation must preserve a valid deep link without reactivating view or creation commands",
);

assert.throws(
  () => migrateLegacyLeadsSearch({ tenant_id: "client-tenant" }),
  /unrecognized client authority key/i,
  "legacy redirect must not launder client tenant authority",
);
assertions += 1;

const legacyRoute = read("src/routes/_authenticated.admin.leads.tsx");
ok(
  legacyRoute.includes('import { migrateLegacyLeadsSearch }'),
  "legacy route must use the explicit compatibility boundary",
);
ok(
  legacyRoute.includes("search: migrateLegacyLeadsSearch(search)"),
  "legacy redirect must emit only canonical search state",
);
ok(!legacyRoute.includes("{ ...s }"), "legacy redirect must not spread untrusted search state");
ok(!legacyRoute.includes("corretor_id"), "retired broker filter must not be forwarded");
ok(!legacyRoute.includes('view = "kanban"'), "retired layout mode must not be recreated");

const pipelineRoute = read("src/routes/_authenticated.admin.pipeline.tsx");
ok(
  pipelineRoute.includes("pipelineSearchSchema.parse"),
  "pipeline route must retain one canonical runtime validator",
);

const searchSource = read("src/components/pipeline/search-schema.ts");
for (const token of [
  "PIPELINE_AUTHORITY_SEARCH_KEYS",
  "unrecognized client authority key",
  "pipelineNavigationSearchSchema",
  "migrateLegacyLeadsSearch",
  'source.tab === "descartados"',
  'migrated.status = "descartado"',
]) {
  ok(searchSource.includes(token), `search compatibility contract missing: ${token}`);
}
ok(
  searchSource.includes("Object.prototype.hasOwnProperty.call(source, key)"),
  "authority keys must be detected even when their values are empty",
);
ok(
  !searchSource.includes("tenant_id: z."),
  "tenant identity must never become an accepted pipeline search field",
);

const palette = read("src/components/workspace/CommandPalette.tsx");
ok(
  palette.includes('label: "Novo lead (indisponível)"'),
  "Command Palette must disclose that lead creation is unavailable",
);
ok(
  palette.includes('to: "/admin/pipeline"') && palette.includes("disabled: true"),
  "unavailable lead creation must be represented as a disabled command",
);
ok(
  !palette.includes('{ label: "Novo lead", to: "/admin/pipeline", search: { new: "1" }'),
  "Command Palette must not send the retired new command to the pipeline",
);
ok(
  palette.includes('search: { item: id } as any'),
  "lead lookup must navigate with the canonical item deep link only",
);
ok(
  !palette.includes('search: { item: id, view: "list", tab: "ativos" }'),
  "lead lookup must not send retired view or tab parameters",
);
ok(
  palette.includes("if (c.disabled) return;"),
  "disabled creation commands must not execute navigation",
);
ok(!palette.includes("criarLeadManual"), "UX-01 must not reactivate mutable lead creation");
ok(!palette.includes("useMutation"), "Command Palette must remain free of mutation transport");

const impact = read(
  "docs/architecture/impact-analysis/PR-M3-UX-01-pipeline-search-compatibility-impact-analysis.md",
);
const evidence = read(
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-ux-01-pipeline-search-compatibility-evidence.md",
);
for (const token of [
  "Architecture First",
  "server-authoritative",
  "new",
  "view",
  "tab",
  "PR-M3-SEC-04",
  "LVR-01",
]) {
  ok(impact.includes(token), `impact analysis missing governance token: ${token}`);
}
for (const token of [
  "EXACT_ALLOWLIST_COUNT = 7",
  "DATABASE_WRITE = false",
  "PRODUCTION_PUBLISH = false",
  "PR_105_MERGE = false",
  "PR-M3-SEC-04",
]) {
  ok(evidence.includes(token), `evidence missing terminal token: ${token}`);
}

console.log(`PR-M3-UX-01 pipeline compatibility specs passed: ${assertions} assertions.`);
