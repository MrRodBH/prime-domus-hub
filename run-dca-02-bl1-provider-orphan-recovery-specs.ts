import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyProviderOrphanSnapshot,
  parseProviderOrphanDiagnosticRequest,
  ProviderOrphanRecoveryError,
  type ProviderOrphanCandidate,
  type ProviderOrphanDomainSnapshot,
} from "./src/lib/domains/provider-orphan-recovery.server";

let assertions = 0;
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}
function equal(actual: unknown, expected: unknown, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const service = readFileSync("src/lib/domains/provider-orphan-recovery.server.ts", "utf8");
const route = readFileSync("src/routes/api/internal/dca-02-provider-orphan-recovery.ts", "utf8");
const repository = readFileSync("src/lib/domains/domain-repository-provider.server.ts", "utf8");
const backlog = readFileSync("docs/delivery/product-roadmap/pre-homologation-product-readiness/backlog/dca-02-provider-identity-non-blocking-backlog.md", "utf8");
const impact = readFileSync("docs/architecture/impact-analysis/DCA-02-BL1-explicit-provider-orphan-recovery-impact-analysis.md", "utf8");
const runbook = readFileSync("docs/operations/DCA-02-BL1-provider-orphan-recovery-runbook.md", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const workflow = readFileSync(".github/workflows/release-gate.yml", "utf8");

const snapshot: ProviderOrphanDomainSnapshot = {
  tenantId: "00000000-0000-4000-8000-000000000201",
  domainId: "00000000-0000-4000-8000-000000000202",
  generation: 9,
  normalizedHostname: "tenant.example.com",
  providerAccountId: "00000000-0000-4000-8000-000000000203",
  zoneId: "90832d0006e9e630dbb73d33c551d836",
  bindingState: "missing",
  persistedProviderObjectId: null,
};
const candidate = (id: string): ProviderOrphanCandidate => ({
  id,
  hostname: snapshot.normalizedHostname,
  status: "active",
  sslStatus: "active",
  version: "2026-08-22T00:00:00.000Z",
});
const actorUserId = "00000000-0000-4000-8000-000000000204";

const missing = await classifyProviderOrphanSnapshot({ actorUserId, snapshot, candidates: [] });
equal(missing.status, "no_candidate", "missing candidate must be explicit");
equal(missing.candidateCount, 0, "missing candidate cardinality must be zero");
equal(missing.actionAuthorized, false, "missing candidate must authorize no action");

const single = await classifyProviderOrphanSnapshot({ actorUserId, snapshot, candidates: [candidate("custom-hostname-id-0202")] });
equal(single.status, "orphan_candidate_single", "single orphan must remain diagnostic");
equal(single.providerObjectIds[0], "custom-hostname-id-0202", "exact provider object ID evidence must be retained");
equal(single.automaticAdoption, false, "single candidate must never auto-adopt");
equal(single.providerWrites, 0, "dry run must perform zero provider writes");
equal(single.databaseWrites, 0, "dry run must perform zero database writes");
equal(single.retryOriginalCreate, false, "dry run must not retry provider create");
equal(single.manualFallback, false, "dry run must not switch execution mode");
equal(single.auditEvent.persisted, false, "diagnostic audit must disclose non-persistence");
equal(single.auditEvent.eventType, "dca02_provider_orphan_dry_run", "diagnostic event type must be exact");

const repeated = await classifyProviderOrphanSnapshot({ actorUserId, snapshot, candidates: [candidate("custom-hostname-id-0202")] });
equal(repeated.evidenceSha256, single.evidenceSha256, "identical snapshot must produce identical digest");
equal(repeated.auditEvent.correlationId, single.auditEvent.correlationId, "identical snapshot must produce identical correlation ID");

const multiple = await classifyProviderOrphanSnapshot({
  actorUserId,
  snapshot,
  candidates: [candidate("custom-hostname-id-0202"), candidate("custom-hostname-id-0203")],
});
equal(multiple.status, "ambiguous_candidates", "multiple candidates must fail closed");
equal(multiple.actionAuthorized, false, "multiple candidates must authorize no action");

const boundSnapshot = { ...snapshot, bindingState: "bound" as const, persistedProviderObjectId: "custom-hostname-id-0202" };
const bound = await classifyProviderOrphanSnapshot({ actorUserId, snapshot: boundSnapshot, candidates: [candidate("custom-hostname-id-0202")] });
equal(bound.status, "already_bound", "matching exact binding must not be treated as orphan");
const boundMissing = await classifyProviderOrphanSnapshot({ actorUserId, snapshot: boundSnapshot, candidates: [] });
equal(boundMissing.status, "bound_object_missing", "missing bound object must fail closed");
const conflict = await classifyProviderOrphanSnapshot({ actorUserId, snapshot: boundSnapshot, candidates: [candidate("custom-hostname-id-0203")] });
equal(conflict.status, "binding_candidate_conflict", "binding mismatch must fail closed");
const ambiguousBinding = await classifyProviderOrphanSnapshot({
  actorUserId,
  snapshot: { ...snapshot, bindingState: "ambiguous" },
  candidates: [candidate("custom-hostname-id-0202")],
});
equal(ambiguousBinding.status, "binding_state_unresolved", "ambiguous ledger state must remain unresolved");

equal(parseProviderOrphanDiagnosticRequest({ domain_id: snapshot.domainId }).domainId, snapshot.domainId, "only domain_id request must parse");
for (const invalid of [
  { domain_id: snapshot.domainId, hostname: snapshot.normalizedHostname },
  { domain_id: snapshot.domainId, provider_object_id: "custom-hostname-id-0202" },
  { domain_id: snapshot.domainId, tenant_id: snapshot.tenantId },
  { domain_id: snapshot.domainId, action: "adopt" },
]) {
  assert.throws(() => parseProviderOrphanDiagnosticRequest(invalid), ProviderOrphanRecoveryError);
  assertions += 1;
}

ok(service.includes('method: "GET"'), "provider diagnostic transport must be GET-only");
equal((service.match(/await fetch\(/g) ?? []).length, 1, "provider diagnostic must have one non-retrying fetch call");
ok(!/method:\s*"(?:POST|PUT|PATCH|DELETE)"/.test(service), "service must not issue provider mutations");
ok(service.includes("assertGlobalSuperAdmin"), "global super_admin server authority must be explicit");
for (const header of ["x-tenant-id", "x-domain-id", "x-hostname", "x-provider-object-id", "x-custom-hostname-id"]) {
  ok(service.includes(header), `${header} must be rejected as authority`);
}
ok(route.includes('allow: "POST"'), "route must expose POST as the sole application method");
ok(route.includes("cache-control"), "route responses must be non-cacheable");
ok(repository.includes("getGlobalProviderOrphanDiagnosticTarget"), "repository must resolve a global read-only target");
ok(repository.includes("Global read-only diagnostic target"), "repository read-only boundary must be explicit");
ok(impact.includes("AUTOMATIC_ADOPTION = false"), "impact analysis must prohibit automatic adoption");
ok(runbook.includes("one exact object ID"), "runbook must require exact object ID for any future action");
ok(backlog.includes("DCA-02-BL1"), "backlog must register the diagnostic implementation");
equal(packageJson.scripts["test:dca-02-bl1"], "tsx --tsconfig tsconfig.json ./run-dca-02-bl1-provider-orphan-recovery-specs.ts", "focused runner must be exact");
const verifyRelease = packageJson.scripts["verify:release"] as string;
ok(verifyRelease.includes("bun run test:dca-02-bl1 &&"), "release verification must run BL1");
ok(verifyRelease.indexOf("bun run test:dca-02-bl1") < verifyRelease.indexOf("bun ./scripts/verify-release.mjs"), "BL1 must precede core verification");
ok(workflow.includes('DCA02_BL1_PROVIDER_WRITES_ALLOWED: "false"'), "remote gate must freeze provider writes off");

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  diagnosticDryRunOnly: true,
  globalSuperAdminServerAuth: true,
  exactObjectIdEvidence: true,
  providerWrites: 0,
  databaseWrites: 0,
  automaticAdoption: false,
  blindCreateRetry: false,
  manualFallback: false,
}, null, 2));
