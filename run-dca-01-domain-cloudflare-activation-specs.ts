import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DOMAIN_ACTIVATION_STATUSES,
  DOMAIN_EXECUTION_MODES,
  DOMAIN_OPERATION_TYPES,
  EMPTY_DOMAIN_EVIDENCE,
  type DomainEvidence,
  type TenantDomainRecord,
} from "./src/lib/domains/domain-contracts";
import {
  assertActivePredicate,
  assertAtomicReplacementSwap,
  assertDomainTransition,
  assertStatusPreservingOwnershipCommand,
  assertTransitionGraphClosed,
  DOMAIN_PREDECESSORS,
  DOMAIN_TRANSITIONS,
} from "./src/lib/domains/domain-state-machine";
import {
  normalizeDomainHostname,
  PUBLIC_SUFFIX_SNAPSHOT,
} from "./src/lib/domains/domain-normalization";

let assertions = 0;
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}
function equal<T>(actual: T, expected: T, message: string): void {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function deepEqual(actual: unknown, expected: unknown, message: string): void {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}
function throws(fn: () => unknown, pattern: RegExp, message: string): void {
  assert.throws(fn, pattern, message);
  assertions += 1;
}

const root = process.cwd();
const migrationPath = resolve(root, "supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql");
const migration = readFileSync(migrationPath, "utf8");
const server = readFileSync(resolve(root, "src/server.ts"), "utf8");
const tenantServer = readFileSync(resolve(root, "src/lib/tenant.server.ts"), "utf8");
const adapter = readFileSync(resolve(root, "src/lib/domains/cloudflare-adapter.server.ts"), "utf8");
const jobs = readFileSync(resolve(root, "src/lib/domains/domain-jobs.server.ts"), "utf8");
const superFunctions = readFileSync(resolve(root, "src/lib/api/super-domain.functions.ts"), "utf8");
const tenantFunctions = readFileSync(resolve(root, "src/lib/api/tenant-domain.functions.ts"), "utf8");
const reconciliation = readFileSync(resolve(root, "src/lib/domains/domain-reconciliation.server.ts"), "utf8");
const legacyImport = readFileSync(resolve(root, "src/lib/domains/legacy-domain-import.server.ts"), "utf8");

assertTransitionGraphClosed();
assertions += 1;
deepEqual(Object.keys(DOMAIN_TRANSITIONS).sort(), [...DOMAIN_ACTIVATION_STATUSES].sort(), "every status must own one transition row");
ok(DOMAIN_TRANSITIONS.degraded.includes("active"), "degraded must recover directly to active");
ok(DOMAIN_PREDECESSORS.active.includes("degraded"), "active predecessor matrix must include degraded");
ok(!DOMAIN_TRANSITIONS.pending_ownership_verification.includes("pending_ownership_verification"), "ownership commands must not persist self-transitions");
ok(!DOMAIN_TRANSITIONS.removal_pending.includes("active"), "post-swap direct reactivation must remain prohibited");
deepEqual(DOMAIN_TRANSITIONS.pending_cloudflare_provisioning, ["pending_ssl", "removal_pending", "failed"], "provider state must be closed and explicit");
assertStatusPreservingOwnershipCommand("pending_ownership_verification", "issue_ownership_challenge");
assertions += 1;
throws(() => assertStatusPreservingOwnershipCommand("draft", "issue_ownership_challenge"), /requires pending_ownership_verification/, "challenge issue must fail outside ownership state");

const completeEvidence: DomainEvidence = Object.fromEntries(
  Object.keys(EMPTY_DOMAIN_EVIDENCE).map((key) => [key, true]),
) as unknown as DomainEvidence;
assertActivePredicate(completeEvidence);
assertions += 1;
throws(() => assertActivePredicate({ ...completeEvidence, sslStatusActive: false }), /active predicate is incomplete/i, "active must require SSL evidence");
assertDomainTransition("pending_ssl", "active", { evidence: completeEvidence });
assertions += 1;
assertDomainTransition("degraded", "active", { evidence: completeEvidence });
assertions += 1;
throws(() => assertDomainTransition("degraded", "active", { evidence: { ...completeEvidence, ownershipVerified: false } }), /active predicate is incomplete/i, "degraded recovery must re-prove full evidence");
throws(() => assertDomainTransition("removal_pending", "active", { evidence: completeEvidence }), /forbidden/i, "removal_pending cannot reactivate");
throws(() => assertDomainTransition("failed", "pending_ssl"), /explicit matching recovery target/i, "failed recovery must be explicit");
assertDomainTransition("failed", "pending_ssl", { recoveryTarget: "pending_ssl" });
assertions += 1;
assertDomainTransition("failed", "removal_pending", { recoveryTarget: "removal_pending" });
assertions += 1;

const baseDomain: TenantDomainRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000010",
  normalizedHostname: "tenant.example-real.com",
  registrableDomain: "example-real.com",
  hostnameKind: "canonical",
  executionMode: "manual_assisted",
  status: "active",
  enabled: true,
  generation: 1,
  replacementOf: null,
  incumbentDomainId: null,
  lockVersion: 4,
  failureCode: null,
  failureDetailSanitized: {},
  resumeState: null,
  metadata: {},
  requestedBy: "00000000-0000-4000-8000-000000000020",
  activatedAt: new Date(0).toISOString(),
  revokedAt: null,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};
const candidate: TenantDomainRecord = {
  ...baseDomain,
  id: "00000000-0000-4000-8000-000000000002",
  normalizedHostname: "replacement.example-real.com",
  status: "pending_ssl",
  generation: 2,
  incumbentDomainId: baseDomain.id,
  replacementOf: baseDomain.id,
  lockVersion: 2,
  activatedAt: null,
};
assertAtomicReplacementSwap({ incumbent: baseDomain, candidate, incumbentExpectedVersion: 4, candidateExpectedVersion: 2, candidateEvidence: completeEvidence });
assertions += 1;
throws(() => assertAtomicReplacementSwap({ incumbent: baseDomain, candidate: { ...candidate, generation: 1 }, incumbentExpectedVersion: 4, candidateExpectedVersion: 2, candidateEvidence: completeEvidence }), /newer generation/i, "replacement generation must increase");
throws(() => assertAtomicReplacementSwap({ incumbent: baseDomain, candidate, incumbentExpectedVersion: 3, candidateExpectedVersion: 2, candidateEvidence: completeEvidence }), /version conflict/i, "swap must enforce incumbent version");

const normalizedBr = normalizeDomainHostname("  Imóveis.ExemploReal.COM.BR. ");
equal(normalizedBr.hostname, "xn--imveis-cxa.exemploreal.com.br", "IDNA must produce canonical ASCII");
equal(normalizedBr.registrableDomain, "exemploreal.com.br", "PSL must derive com.br registrable domain");
equal(normalizedBr.publicSuffix, "com.br", "PSL must identify com.br");
const normalizedUk = normalizeDomainHostname("portal.example-real.co.uk");
equal(normalizedUk.registrableDomain, "example-real.co.uk", "PSL must derive co.uk registrable domain");
equal(normalizedUk.publicSuffix, "co.uk", "PSL must identify co.uk");
throws(() => normalizeDomainHostname("com.br"), /public suffix/i, "public suffix only must fail");
throws(() => normalizeDomainHostname("example.com"), /Reserved/i, "reserved example domain must fail");
throws(() => normalizeDomainHostname("https://example-real.com/path"), /Only a hostname/i, "URL input must fail");
throws(() => normalizeDomainHostname("*.example-real.com"), /Wildcard/i, "wildcard must fail");
throws(() => normalizeDomainHostname("127.0.0.1"), /IP literals/i, "IP literal must fail");
throws(() => normalizeDomainHostname("localhost"), /Reserved/i, "localhost must fail");
throws(() => normalizeDomainHostname("example-real.com.."), /terminal dot/i, "multiple terminal dots must fail");
equal(PUBLIC_SUFFIX_SNAPSHOT.ruleCount, 10_239, "official PSL snapshot cardinality must remain stable");
equal(PUBLIC_SUFFIX_SNAPSHOT.commit, "e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20", "PSL source commit must remain pinned");

for (const status of DOMAIN_ACTIVATION_STATUSES) {
  ok(migration.includes(`'${status}'`), `SQL enum must include ${status}`);
}
for (const mode of DOMAIN_EXECUTION_MODES) {
  ok(migration.includes(`'${mode}'`), `SQL enum must include ${mode}`);
}
for (const operation of DOMAIN_OPERATION_TYPES) {
  ok(migration.includes(`'${operation}'`), `SQL enum must include ${operation}`);
}

for (const table of [
  "tenant_domains",
  "domain_verification_challenges",
  "domain_provider_accounts",
  "domain_provider_bindings",
  "domain_operation_jobs",
  "domain_operation_attempts",
  "domain_audit_events",
  "domain_authority_control",
]) {
  ok(migration.includes(`create table public.${table}`), `migration must create ${table}`);
  ok(migration.includes(`alter table public.${table} enable row level security`), `${table} must enable RLS`);
  ok(migration.includes(`revoke all on table public.${table} from public, anon, authenticated`), `${table} must revoke client table grants`);
}

for (const rpc of [
  "create_tenant_domain_request",
  "transition_tenant_domain",
  "issue_domain_ownership_challenge",
  "verify_domain_ownership_challenge",
  "activate_domain_replacement",
  "lease_domain_operation_jobs",
  "complete_domain_operation_job",
  "register_domain_provider_account",
  "rotate_domain_provider_credential_reference",
  "set_domain_provider_account_availability",
  "resolve_public_tenant_by_host",
  "get_canonical_redirect_for_active_alias",
  "activate_authoritative_domain_resolution",
]) {
  ok(migration.includes(`function public.${rpc}`), `migration must materialize ${rpc}`);
}

ok(migration.includes("dca01_direct_status_mutation_prohibited"), "database must reject direct status writes");
ok(migration.includes("dca01_direct_domain_projection_write_prohibited"), "legacy projection must be server-maintained");
ok(migration.includes("dca01_audit_event_is_append_only"), "audit events must be append-only");
ok(migration.includes("dca01_active_predicate_incomplete"), "SQL active transition must enforce full predicate");
const replacementStart = migration.indexOf("create or replace function public.activate_domain_replacement");
const replacementEnd = migration.indexOf("create or replace function public.lease_domain_operation_jobs", replacementStart);
const replacementBody = migration.slice(replacementStart, replacementEnd);
ok(replacementStart >= 0 && replacementEnd > replacementStart, "replacement RPC body must be discoverable");
ok(replacementBody.indexOf("set status = 'removal_pending'") < replacementBody.indexOf("set status = 'active'"), "replacement must retire old authority before promoting the candidate in the same transaction");
ok(migration.includes("domain_verification_challenges c"), "cutover SQL must verify current-generation ownership evidence");
ok(migration.includes("domain_provider_bindings b"), "cutover SQL must verify provider and SSL evidence");
ok(migration.includes("legacy_source_sha256"), "cutover continuity must bind the legacy source without SQL normalization heuristics");

ok(migration.includes("dca01_explicit_recovery_target_required"), "SQL failed recovery must require explicit target");
ok(migration.includes("_to_status <> 'removal_pending'"), "SQL must permit explicit failed-to-removal recovery without stale resume-state authority");
ok(migration.includes("dca01_legacy_import_manifest_required"), "legacy import must fail closed without server-generated PSL manifest");
ok(migration.includes("source_sha256"), "legacy manifest must bind normalized results to the exact source value");
ok(migration.includes("extensions.digest"), "legacy and idempotency digests must be deterministic");
ok(migration.includes("for update skip locked"), "job leasing must use locked bounded concurrency");
ok(migration.includes("domain_operation_attempts"), "every lease must have an attempt record");
ok(migration.includes("lease_expired_after_max_attempts"), "expired exhausted leases must terminate explicitly");
ok(migration.includes("credential_reference ~ '^env:"), "credential storage must accept opaque env references only");
ok(!/create\s+policy/i.test(migration), "new tables must not expose permissive client policies");

const resolverStart = migration.indexOf("create or replace function public.resolve_public_tenant_by_host");
const resolverEnd = migration.indexOf("create or replace function public.get_canonical_redirect_for_active_alias", resolverStart);
const resolverBody = migration.slice(resolverStart, resolverEnd);
ok(resolverStart >= 0 && resolverEnd > resolverStart, "public resolver body must be discoverable");
ok(resolverBody.includes("from public.tenant_domains"), "public resolver must use tenant_domains");
ok(!resolverBody.includes("dominio_principal"), "public resolver must not query legacy authority");
ok(!resolverBody.includes("authority_mode = 'legacy'"), "public resolver must not branch to legacy mode");
ok(resolverBody.includes("'tenant_domains'::text as authority_mode"), "public resolver must declare its single authority");

ok(tenantServer.includes('.rpc("resolve_public_tenant_by_host"'), "production host resolution must use one RPC");
ok(!tenantServer.includes('.eq("dominio_principal"'), "production host resolution must not query legacy projection");
ok(!tenantServer.includes('authority_mode === "legacy"'), "public DTO selection must expose no legacy authority branch");
ok(tenantServer.includes("PUBLIC_TENANT_DEV_HOST_MAP"), "development host map must remain explicit and separate");
ok(server.indexOf("canonicalRedirect(request)") < server.indexOf("handler.fetch(request"), "canonical redirect must execute before SSR");
ok(server.includes("async scheduled("), "server entry must expose scheduled handler");
ok(server.includes("ctx.waitUntil(execution)"), "scheduled work must be attached to platform execution context");
ok(jobs.includes("enqueueScheduledDomainReconciliationJobs"), "scheduled executor must enqueue periodic reconciliation");
ok(jobs.includes("retryDelaySeconds"), "retry policy must be bounded and explicit");
ok(legacyImport.includes("normalizeDomainHostname(source)"), "legacy manifest must use the canonical server normalizer");
ok(legacyImport.includes("source_sha256: await sha256(source.toLowerCase())"), "legacy manifest must bind the exact normalized source digest");
ok(legacyImport.includes("Duplicate normalized legacy hostname"), "legacy manifest must fail closed on duplicate normalized hostnames");
ok(jobs.includes('recoveryTarget: current.status === "failed" ? "removal_pending" : null'), "failed-domain removal must name its recovery target explicitly");

ok(adapter.includes("hostname.exact="), "Cloudflare provisioning must preflight exact hostname cardinality");
ok(adapter.includes("exact.length > 1"), "Cloudflare ambiguity must fail closed");
ok(adapter.includes("custom_metadata"), "Cloudflare object ownership must be generation-bound");
ok(adapter.includes('credentialReference: "[redacted]"'), "adapter errors must redact credential references");
ok(!adapter.includes("x-idempotency-key"), "adapter must not invent undocumented Cloudflare transport headers");
ok(superFunctions.includes('.rpc("register_domain_provider_account"'), "provider registration must be atomic and audited");
ok(superFunctions.includes('.rpc("rotate_domain_provider_credential_reference"'), "credential reference rotation must be atomic and audited");
ok(superFunctions.includes('.rpc("set_domain_provider_account_availability"'), "provider availability changes must be atomic and audited");
ok(!superFunctions.includes("credential_reference: data.credentialReference"), "global API must not directly persist provider secrets");
ok(tenantFunctions.includes('to: "removal_pending"'), "removal request must close public authority synchronously");
ok(tenantFunctions.includes('publicAuthorityClosed: true'), "removal API must report that public authority was closed");
ok(superFunctions.includes("transitionTenantDomain"), "impersonated failed retry must recover before enqueuing work");
ok(reconciliation.includes("buildCurrentGenerationEvidence(domain)"), "cutover preflight must evaluate the full current-generation predicate");
ok(reconciliation.includes('reason: "active_predicate_incomplete"'), "cutover preflight must report incomplete evidence fail-closed");

console.log(JSON.stringify({
  status: "PASS",
  stage: "DCA-01",
  assertions,
  publicSuffixRuleCount: PUBLIC_SUFFIX_SNAPSHOT.ruleCount,
  requestTimeDualAuthority: false,
  clientTenantAuthority: false,
  directClientStatusMutation: false,
  plaintextCredentialPersistence: false,
}, null, 2));