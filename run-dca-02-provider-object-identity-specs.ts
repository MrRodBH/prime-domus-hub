import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createCloudflareAdapter } from "./src/lib/domains/cloudflare-adapter.server";
import { DomainError } from "./src/lib/domains/domain-errors";
import type { TenantDomainRecord } from "./src/lib/domains/domain-contracts";

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
const migration = readFileSync(resolve(root, "supabase/migrations/20260812133000_dca_02_provider_object_identity_binding.sql"), "utf8");
const privilegeCorrective = readFileSync(resolve(root, "supabase/migrations/20260812143000_dca_02_provider_binding_privilege_hardening.sql"), "utf8");
const adapterSource = readFileSync(resolve(root, "src/lib/domains/cloudflare-adapter.server.ts"), "utf8");
const providerRepository = readFileSync(resolve(root, "src/lib/domains/domain-repository-provider.server.ts"), "utf8");
const jobs = readFileSync(resolve(root, "src/lib/domains/domain-jobs.server.ts"), "utf8");
const reconciliation = readFileSync(resolve(root, "src/lib/domains/domain-reconciliation.server.ts"), "utf8");
const errors = readFileSync(resolve(root, "src/lib/domains/domain-errors.ts"), "utf8");

for (const token of [
  "binding_state text",
  "provisioning_key text",
  "identity_bound_at timestamptz",
  "'claimed', 'bound', 'ambiguous'",
  "dca02_guard_provider_binding_write",
  "dca02_claim_domain_provider_binding",
  "dca02_bind_domain_provider_object_identity",
  "dca02_update_domain_provider_observation",
  "dca02_mark_domain_provider_claim_ambiguous",
  "dca02_release_domain_provider_claim",
  "dca02_provider_claim_competing_operation",
  "dca02_provider_identity_rebind_prohibited",
  "dca02_provider_claim_ambiguous",
]) {
  ok(migration.includes(token), `DCA-02 migration must contain ${token}`);
}
ok(migration.includes("revoke insert, update, delete on table public.domain_provider_bindings from service_role"), "principal migration must revoke direct service-role provider identity DML");
ok(migration.includes("grant select on table public.domain_provider_bindings to service_role"), "principal migration must retain read-only binding observation");
ok(migration.includes("app.dca02_provider_binding_write"), "provider binding identity writes must require the DCA-02 guarded session flag");
ok(!/create\s+policy/i.test(migration), "DCA-02 must not introduce client RLS policies");
ok(privilegeCorrective.includes("revoke all privileges on table public.domain_provider_bindings from service_role"), "corrective migration must remove TRUNCATE/REFERENCES/TRIGGER and all direct service-role table authority");
ok(privilegeCorrective.includes("grant select on table public.domain_provider_bindings to service_role"), "corrective migration must restore SELECT as the only service-role table privilege");
ok(!/insert\s+into|update\s+public\.domain_provider_bindings|delete\s+from|truncate\s+table/i.test(privilegeCorrective), "privilege corrective must not mutate provider-binding data");

ok(!adapterSource.includes("custom_metadata: {"), "runtime adapter must not send custom_metadata in provider create bodies");
ok(adapterSource.includes("getCustomHostnameById"), "adapter must implement exact provider-id lookup");
ok(adapterSource.includes("automatic adoption is prohibited"), "hostname lookup must be collision-only and fail closed");
ok(adapterSource.includes("domain_provider_outcome_ambiguous"), "provider mutation ambiguity must be explicit");
ok(adapterSource.includes("ambiguousOnTransportFailure: true"), "Custom Hostname POST must classify transport ambiguity");

ok(providerRepository.includes('db.rpc("dca02_claim_domain_provider_binding"'), "repository must claim provider identity through RPC");
ok(providerRepository.includes('db.rpc("dca02_bind_domain_provider_object_identity"'), "repository must bind provider identity through RPC");
ok(providerRepository.includes('db.rpc("dca02_update_domain_provider_observation"'), "repository observation must use immutable-identity RPC");
ok(!providerRepository.includes(".upsert("), "provider identity repository must not directly upsert bindings");

const provisionProviderStart = jobs.indexOf("async function provisionProvider(");
const provisionProviderEnd = jobs.indexOf("\nasync function cleanupDomain(", provisionProviderStart);
ok(provisionProviderStart >= 0 && provisionProviderEnd > provisionProviderStart, "provider provisioning function must be structurally resolvable");
const provisionProviderSource = jobs.slice(provisionProviderStart, provisionProviderEnd);
const claimIndex = provisionProviderSource.indexOf("claimDomainProviderBinding({");
const automatedDispatchIndex = provisionProviderSource.indexOf("automatedProviderObservation({");
const manualDispatchIndex = provisionProviderSource.indexOf("manualProviderObservation({");
ok(claimIndex >= 0 && automatedDispatchIndex > claimIndex, "database binding claim must precede automated provider dispatch");
ok(claimIndex >= 0 && manualDispatchIndex > claimIndex, "database binding claim must precede manual-assisted provider dispatch");
ok(jobs.includes('safe.code !== "domain_provider_outcome_ambiguous"'), "ambiguous provider outcome must never enter retry_wait");
ok(jobs.includes("compensateCreatedProviderObject"), "create/bind split failure must have exact-id compensation");
ok(jobs.includes("customHostnameId: observation.id"), "compensation/binding must retain exact create-response provider id");
ok(jobs.includes("provider object predates current-generation ownership verification"), "manual-assisted binding must reject provider objects predating current-generation ownership evidence");
ok(reconciliation.includes('binding.bindingState === "bound"'), "active evidence must require a bound provider identity");
ok(reconciliation.includes("getDomainProviderIdentityBinding"), "reconciliation must read the DCA-02 identity binding");
ok(reconciliation.includes("expectedCustomHostnameId: binding.customHostnameId"), "reconciliation must observe by persisted provider id");
ok(errors.includes('"domain_provider_outcome_ambiguous"'), "domain error catalog must expose the non-retryable ambiguity code");

const domain: TenantDomainRecord = {
  id: "00000000-0000-4000-8000-000000000201",
  tenantId: "00000000-0000-4000-8000-000000000202",
  normalizedHostname: "dca02-hml.mrrod.com.br",
  registrableDomain: "mrrod.com.br",
  hostnameKind: "canonical",
  executionMode: "api_automated",
  status: "pending_cloudflare_provisioning",
  enabled: true,
  generation: 2,
  replacementOf: null,
  incumbentDomainId: null,
  lockVersion: 3,
  failureCode: null,
  failureDetailSanitized: {},
  resumeState: null,
  metadata: {},
  requestedBy: "00000000-0000-4000-8000-000000000203",
  activatedAt: null,
  revokedAt: null,
  hostnameReusableAfter: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const provider = {
  accountIdentifier: "68ec853e6b04a038f09fca5712d6b26b",
  zoneId: "90832d0006e9e630dbb73d33c551d836",
  credentialReference: "env:CLOUDFLARE_API_TOKEN_DCA01_HML",
};
const runtimeEnv = { CLOUDFLARE_API_TOKEN_DCA01_HML: "synthetic-token-value-for-dca02-tests" };
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

try {
  {
    const requests: Array<{ url: string; method: string; body: string | null }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : null });
      if (requests.length === 1) return jsonResponse({ success: true, result: [] });
      return jsonResponse({ success: true, result: { id: "custom-hostname-id-201", hostname: domain.normalizedHostname, status: "pending", ssl: { status: "pending_validation" }, created_at: "2026-08-12T13:30:00Z" } });
    }) as typeof fetch;
    const observation = await createCloudflareAdapter(runtimeEnv).provisionCustomHostname({ provider, domain, idempotencyKey: "a".repeat(64) });
    equal(observation.id, "custom-hostname-id-201", "create must return the provider-generated object id");
    equal(requests.length, 2, "first create must perform one collision read and one POST");
    equal(requests[1].method, "POST", "second first-create request must be POST");
    const body = JSON.parse(requests[1].body ?? "{}") as Record<string, unknown>;
    ok(!Object.prototype.hasOwnProperty.call(body, "custom_metadata"), "Custom Hostname POST body must omit custom_metadata");
    equal(body.hostname, domain.normalizedHostname, "POST hostname must remain server-authoritative");
  }

  {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return jsonResponse({ success: true, result: [{ id: "unbound-existing-id", hostname: domain.normalizedHostname }] });
    }) as typeof fetch;
    await assert.rejects(
      () => createCloudflareAdapter(runtimeEnv).provisionCustomHostname({ provider, domain, idempotencyKey: "b".repeat(64) }),
      (error: unknown) => error instanceof DomainError && error.code === "domain_provider_configuration_invalid",
      "an unbound exact hostname must fail closed instead of being adopted",
    );
    assertions += 1;
    equal(calls, 1, "collision must prevent the provider POST entirely");
  }

  {
    const paths: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      paths.push(String(input));
      return jsonResponse({ success: true, result: { id: "persisted-id-202", hostname: domain.normalizedHostname, status: "active", ssl: { status: "active" } } });
    }) as typeof fetch;
    const observation = await createCloudflareAdapter(runtimeEnv).observeCustomHostname({ provider, domain, expectedCustomHostnameId: "persisted-id-202" });
    equal(observation.id, "persisted-id-202", "observation must preserve exact provider id");
    ok(paths[0].endsWith("/custom_hostnames/persisted-id-202"), "observation must GET the persisted provider id directly");
    ok(!paths[0].includes("hostname.exact"), "observation must not discover ownership by hostname search");
  }

  {
    const requests: Array<{ url: string; method: string }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), method: init?.method ?? "GET" });
      if (requests.length === 1) return jsonResponse({ success: true, result: { id: "persisted-id-203", hostname: domain.normalizedHostname } });
      return jsonResponse({ success: true, result: { id: "persisted-id-203" } });
    }) as typeof fetch;
    await createCloudflareAdapter(runtimeEnv).removeCustomHostname({ provider, domain, customHostnameId: "persisted-id-203" });
    ok(requests[0].url.endsWith("/custom_hostnames/persisted-id-203"), "delete preflight must GET only the persisted id");
    ok(requests[1].url.endsWith("/custom_hostnames/persisted-id-203"), "delete must target only the persisted id");
    equal(requests[1].method, "DELETE", "provider removal must use DELETE on exact id");
  }

  {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) return jsonResponse({ success: true, result: [] });
      return jsonResponse({ success: false, errors: [{ code: 1000, message: "synthetic upstream failure" }] }, 500);
    }) as typeof fetch;
    await assert.rejects(
      () => createCloudflareAdapter(runtimeEnv).provisionCustomHostname({ provider, domain, idempotencyKey: "c".repeat(64) }),
      (error: unknown) => error instanceof DomainError && error.code === "domain_provider_outcome_ambiguous" && error.retryable === false,
      "HTTP 5xx after POST dispatch must be non-retryable ambiguity",
    );
    assertions += 1;
  }
} finally {
  globalThis.fetch = originalFetch;
}

console.log(JSON.stringify({
  status: "PASS",
  assertions,
  customMetadataAuthority: false,
  providerLookupByPersistedId: true,
  bindOnceDatabaseBoundary: true,
  serviceRoleBindingTableAuthority: "select-only",
  blindRetryAfterAmbiguity: false,
  hostnameOnlyAdoption: false,
}, null, 2));
