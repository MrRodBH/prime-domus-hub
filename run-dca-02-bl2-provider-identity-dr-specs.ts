import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Binding = {
  tenantId: string;
  providerAccountId: string;
  zoneId: string;
  domainId: string;
  generation: number;
  customHostnameId: string;
  bindingState: "bound";
  identityBoundAt: string;
};

let assertions = 0;
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const impact = read("docs/architecture/impact-analysis/DCA-02-BL2-provider-identity-disaster-recovery-impact-analysis.md");
const runbook = read("docs/operations/DCA-02-BL2-provider-identity-disaster-recovery-runbook.md");
const backlog = read("docs/delivery/product-roadmap/pre-homologation-product-readiness/backlog/dca-02-provider-identity-non-blocking-backlog.md");
const evidence = read("docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-bl2-terminal-evidence.md");
const principal = read("supabase/migrations/20260812133000_dca_02_provider_object_identity_binding.sql");
const corrective = read("supabase/migrations/20260812143000_dca_02_provider_binding_privilege_hardening.sql");
const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
const workflow = read(".github/workflows/release-gate.yml");

for (const token of [
  "RPO_CEILING = 15 minutes",
  "RTO_CEILING = 4 hours",
  "LIVE_PITR_RESTORE = prohibited",
  "PRODUCTION_RESTORE = prohibited",
  "custom_hostname_id",
  "FAIL_CLOSED_MANIFEST_DIGEST_MISMATCH",
  "FAIL_CLOSED_BINDING_MISSING",
  "FAIL_CLOSED_BINDING_DUPLICATE",
  "FAIL_CLOSED_PROVIDER_IDENTITY_CONFLICT",
  "FAIL_CLOSED_SECURITY_BOUNDARY_DRIFT",
]) {
  ok(`${impact}\n${runbook}`.includes(token), `recovery contract must contain ${token}`);
}

ok(backlog.includes("REPOSITORY_PROOF_STATE = implemented / exact-head gates required"), "backlog must record BL2 repository proof state");
ok(backlog.includes("NEXT_EXECUTION = DCA-02-BL1 diagnostic/dry-run only"), "backlog must preserve BL2 before BL1 ordering");
ok(evidence.includes("LIVE_BACKUP_SCOPE_VERIFIED = false"), "evidence must not claim unexecuted live backup verification");
ok(evidence.includes("PROVIDER_WRITES = 0") && evidence.includes("DATABASE_WRITES = 0"), "evidence must freeze external writes at zero");
ok(workflow.includes('DCA02_BL2_LIVE_RESTORE_ALLOWED: "false"'), "Release Gate must lock live restore off");
ok(pkg.scripts?.["test:dca-02-bl2"]?.includes("run-dca-02-bl2-provider-identity-dr-specs.ts"), "package must expose the BL2 runner");
const verifyRelease = pkg.scripts?.["verify:release"] ?? "";
ok(verifyRelease.includes("bun run test:dca-02-bl2 &&"), "release verification must run BL2");
ok(verifyRelease.indexOf("bun run test:dca-02-bl2") < verifyRelease.indexOf("bun ./scripts/verify-release.mjs"), "BL2 must precede core verification");

for (const token of [
  "alter table public.domain_provider_bindings enable row level security",
  "dca02_guard_provider_binding_write",
  "security definer",
  "grant execute on function public.dca02_claim_domain_provider_binding",
  "grant execute on function public.dca02_bind_domain_provider_object_identity",
]) {
  ok(`${principal}\n${read("supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql")}`.toLowerCase().includes(token.toLowerCase()), `database authority must preserve ${token}`);
}
ok(corrective.includes("revoke all privileges on table public.domain_provider_bindings from service_role"), "service_role broad table authority must remain revoked");
ok(corrective.includes("grant select on table public.domain_provider_bindings to service_role"), "service_role must retain SELECT only");
ok(!/insert\s+into|update\s+public\.domain_provider_bindings|delete\s+from|truncate\s+table/i.test(corrective), "corrective migration must remain data-neutral");

const required = ["tenantId", "providerAccountId", "zoneId", "domainId", "customHostnameId"] as const;

function validateBinding(row: Binding): void {
  for (const key of required) {
    if (typeof row[key] !== "string" || row[key].trim() === "") throw new Error(`binding_${key}_missing`);
  }
  if (!Number.isSafeInteger(row.generation) || row.generation < 1) throw new Error("binding_generation_invalid");
  if (row.bindingState !== "bound") throw new Error("binding_state_not_bound");
  if (!Number.isFinite(Date.parse(row.identityBoundAt))) throw new Error("binding_identity_bound_at_invalid");
}

function canonicalLine(row: Binding): string {
  return [
    row.tenantId,
    row.providerAccountId,
    row.zoneId,
    row.domainId,
    String(row.generation),
    row.customHostnameId,
    row.bindingState,
    row.identityBoundAt,
  ].map((value) => `${Buffer.byteLength(value, "utf8")}:${value}`).join("|");
}

function reconstruct(rows: Binding[], expectedDigest?: string): { manifest: string; digest: string } {
  if (rows.length === 0) throw new Error("binding_missing");
  const generationKeys = new Set<string>();
  const providerKeys = new Set<string>();
  for (const row of rows) {
    validateBinding(row);
    const generationKey = [row.tenantId, row.providerAccountId, row.zoneId, row.domainId, row.generation].join("|");
    if (generationKeys.has(generationKey)) throw new Error("binding_duplicate_generation");
    generationKeys.add(generationKey);
    const providerKey = [row.providerAccountId, row.customHostnameId].join("|");
    if (providerKeys.has(providerKey)) throw new Error("binding_duplicate_provider_identity");
    providerKeys.add(providerKey);
  }
  const manifest = rows.map(canonicalLine).sort().join("\n");
  const digest = createHash("sha256").update(manifest, "utf8").digest("hex");
  if (expectedDigest !== undefined && digest !== expectedDigest) throw new Error("manifest_digest_mismatch");
  return { manifest, digest };
}

const row: Binding = {
  tenantId: "00000000-0000-4000-8000-000000000101",
  providerAccountId: "68ec853e6b04a038f09fca5712d6b26b",
  zoneId: "90832d0006e9e630dbb73d33c551d836",
  domainId: "00000000-0000-4000-8000-000000000102",
  generation: 7,
  customHostnameId: "custom-hostname-id-0102",
  bindingState: "bound",
  identityBoundAt: "2026-08-22T00:00:00.000Z",
};

const first = reconstruct([row]);
const second = reconstruct([{ ...row }], first.digest);
equal(second.manifest, first.manifest, "exact restore must reproduce canonical manifest byte for byte");
equal(second.digest, first.digest, "exact restore must reproduce SHA-256 digest");
equal(first.digest.length, 64, "manifest digest must be a full SHA-256 hex value");

assert.throws(() => reconstruct([]), /binding_missing/, "missing ledger must fail closed");
assertions += 1;
assert.throws(() => reconstruct([row, { ...row, customHostnameId: "conflict" }]), /binding_duplicate_generation/, "multiple identities for one generation must fail closed");
assertions += 1;
assert.throws(() => reconstruct([row, { ...row, domainId: "00000000-0000-4000-8000-000000000103", generation: 8 }]), /binding_duplicate_provider_identity/, "one provider object bound twice must fail closed");
assertions += 1;
assert.throws(() => reconstruct([{ ...row, customHostnameId: "" }]), /binding_customHostnameId_missing/, "blank provider identity must fail closed");
assertions += 1;
assert.throws(() => reconstruct([row], "0".repeat(64)), /manifest_digest_mismatch/, "manifest mismatch must fail closed");
assertions += 1;

for (const forbidden of ["hostname-only authority", "Custom Metadata authority", "ORDER BY LIMIT 1 authority"]) {
  ok(!runbook.includes(`${forbidden} = true`), `${forbidden} must never be enabled`);
}
ok(!/select\b[\s\S]{0,200}\border\s+by\b[\s\S]{0,80}\blimit\s+1\b/i.test(`${impact}\n${runbook}`), "recovery documents must not define first-row authority");
ok(!`${impact}\n${runbook}`.includes("automatic rebind allowed"), "recovery must not allow automatic rebind");

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  repositoryProofOnly: true,
  livePitrRestoreExecuted: false,
  productionRestoreExecuted: false,
  providerWrites: 0,
  databaseWrites: 0,
  deterministicManifestSha256: first.digest,
  missingDuplicateConflictFailClosed: true,
  rpoCeilingMinutes: 15,
  rtoCeilingHours: 4,
}, null, 2));
