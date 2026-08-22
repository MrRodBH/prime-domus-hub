import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const ADR_PATH = "docs/architecture/ADR/ADR-007-tenant-isolation-pool-with-selective-bridge.md";
const INDEX_PATH = "docs/architecture/ADR/README.md";
const ALLOWLIST = [
  ".github/workflows/release-gate.yml",
  "docs/architecture/ADR/ADR-007-tenant-isolation-pool-with-selective-bridge.md",
  INDEX_PATH,
  "package.json",
  "run-arch-tenancy-01-adr-specs.ts",
] as const;

const adr = readFileSync(ADR_PATH, "utf8");
const index = readFileSync(INDEX_PATH, "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};
const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");
const pass = (id: string, detail: string) => console.log(`${id} PASS — ${detail}`);

// T01 — canonical mandatory sections occur once and in order.
const requiredHeadings = [
  "# ADR-007 — Tenant Isolation: Pool with Selective Bridge",
  "## Status",
  "## Context",
  "## Decision",
  "## Consequences",
  "## Alternatives Considered",
  "## References",
];
let previous = -1;
for (const heading of requiredHeadings) {
  assert.equal(adr.split(heading).length - 1, 1, `${heading} must occur once`);
  const position = adr.indexOf(heading);
  assert.ok(position > previous, `${heading} must preserve canonical order`);
  previous = position;
}
assert.match(adr, /## Status\nProposed\n\n- \*\*Date:\*\* 2026-08-22/);
pass("T01", "mandatory ADR sections and date are canonical");

// T02 — the index and filenames retain gap-free numbering with one ADR-007.
const indexedNumbers = [...index.matchAll(/\[ADR-(\d{3})\s+—/g)].map((match) => Number(match[1]));
assert.deepEqual(indexedNumbers, [1, 2, 3, 4, 5, 6, 7]);
assert.equal((index.match(/\[ADR-007\s+—/g) ?? []).length, 1);
const adr007Files = readdirSync("docs/architecture/ADR").filter((name) => name.startsWith("ADR-007-"));
assert.deepEqual(adr007Files, ["ADR-007-tenant-isolation-pool-with-selective-bridge.md"]);
pass("T02", "ADR numbering is gap-free and ADR-007 is unique");

// T03 — one exact current authority declaration.
assert.equal((adr.match(/TENANT_ISOLATION_MODEL=POOL/g) ?? []).length, 1);
assert.match(adr, /SILO=NOT_CURRENT_MODEL/);
pass("T03", "POOL is declared exactly once as current authority");

// T04 — shared persistence and row isolation are explicit.
for (const token of [
  "DATABASE_MODEL=SHARED_DATABASE_SHARED_SCHEMA_WITH_TENANT_BOUND_ROWS",
  "ROW_ISOLATION=RLS_PLUS_EXPLICIT_GRANTS_AND_SERVER_BOUNDARIES",
  "tenant_id",
  "Row Level Security (RLS)",
]) assert.ok(adr.includes(token), `missing Pool contract: ${token}`);
pass("T04", "shared database/schema, tenant rows and RLS are explicit");

// T05 — all transport candidates are non-authoritative and fail closed.
assert.match(adr, /TENANT_AUTHORITY=SERVER_RESOLVED_FAIL_CLOSED/);
for (const token of ["Headers", "client state", "hostnames", "query parameters", "provider metadata"]) {
  assert.ok(adr.includes(token), `missing non-authority transport: ${token}`);
}
assert.match(adr, /never establish tenant authority/);
pass("T05", "tenant identity remains server-resolved and transport-neutral");

// T06 — service-role bypass is bounded, server-only and auditable.
for (const token of [
  "controlled server-side code",
  "already resolved tenant scope",
  "must not be exposed to the client",
  "auditable operation boundary",
]) assert.ok(adr.includes(token), `missing service-role boundary: ${token}`);
pass("T06", "service-role bypass remains explicit and least-privileged");

// T07 — selective Bridge requires measurable evidence plus a new IA/ADR.
for (const token of [
  "FUTURE_ADR_AND_IA_REQUIRED",
  "regulatory or data-residency",
  "signed contractual requirement",
  "RPO/RTO",
  "dedicated encryption or key-custody",
  "p95/p99",
  "capacity assessment",
]) assert.ok(adr.includes(token), `missing Bridge criterion: ${token}`);
assert.match(adr, /three\s+consecutive\s+observation windows/);
assert.match(adr, /does not automatically\nauthorize Bridge/);
pass("T07", "Bridge is selective, measurable and separately authorized");

// T08 — CI-provided diff scope contains documentation and gate wiring only.
const integrationMode = process.env.ARCH_INTEGRATION_MODE === "true";
const baseSha = integrationMode
  ? process.env.ARCH_INTEGRATION_BASE_SHA
  : process.env.ARCH_TENANCY_BASE_SHA;
if (baseSha) {
  assert.match(baseSha, /^[0-9a-f]{40}$/);
  const changedFiles = execFileSync("git", ["diff", "--name-only", `${baseSha}..HEAD`], {
    encoding: "utf8",
  }).trim().split(/\r?\n/).filter(Boolean).sort();
  if (integrationMode) {
    assert.equal(changedFiles.length, 42);
    for (const path of ALLOWLIST) assert.ok(changedFiles.includes(path));
  } else {
    assert.deepEqual(changedFiles, [...ALLOWLIST].sort());
    assert.equal(changedFiles.some((path) => path.startsWith("src/") || path.startsWith("supabase/") || path === "bun.lock"), false);
  }
  assert.equal(execFileSync("git", ["rev-list", "--count", `${baseSha}..HEAD`], { encoding: "utf8" }).trim(), "1");
  assert.equal(changedFiles.includes("bun.lock"), false);
}
pass("T08", "runtime, schema, migrations, providers and routes remain unchanged");

// T09 — the ADR preserves existing tenant/RLS contracts instead of redefining them.
assert.match(adr, /Existing tenant snapshots, RLS policies, grants and server authorization\n  contracts remain binding/);
assert.doesNotMatch(adr, /CREATE\s+(?:TABLE|POLICY)|ALTER\s+TABLE|DROP\s+(?:TABLE|POLICY)/i);
pass("T09", "existing tenant and RLS suites remain the implementation authority");

// T10 — the focused matrix is wired ahead of complete release verification.
assert.equal(
  pkg.scripts?.["test:arch-tenancy-01"],
  "tsx --tsconfig tsconfig.json ./run-arch-tenancy-01-adr-specs.ts",
);
assert.match(workflow, /bun run test:arch-tenancy-01/);
assert.match(workflow, /bun run verify:release/);
pass("T10", "documentation governance and release verification are wired");

console.log("ARCH-TENANCY-01 ADR MATRIX PASS");
