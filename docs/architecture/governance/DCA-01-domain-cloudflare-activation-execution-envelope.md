# DCA-01 — Domain & Cloudflare Activation Execution Envelope

## Status

**Planning — Ready for Direct External Audit**

```text
STAGE_ID = DCA-01
STAGE_NAME = Domain & Cloudflare Activation
STAGE_TYPE = finite_runtime_and_external_activation_gate
PLANNING_BASELINE_MAIN = fad8874bfeef85683445f52d21611e7d8760c1a0
PREDECESSOR = PR-M2 — Accepted / Merged / Closed
INTEGRATION_MODEL = HYBRID
PLANNING_AUTHORIZED = true
PLANNING_EXECUTED = true
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PLANNING_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

## 1. Closed implementation objective

A future expressly authorized DCA-01 execution must materialize and validate one authoritative custom-domain lifecycle supporting explicit `manual_assisted` and `api_automated` modes with:

- tenant-domain binding;
- ownership challenge and independent verification;
- DNS configuration and observation;
- Cloudflare custom-hostname and SSL lifecycle;
- canonical host, aliases and redirects;
- anti-takeover controls;
- replacement, removal, rollback and reconciliation;
- tenant and Super Admin operational surfaces;
- deterministic tests and controlled external proof.

The stage is not complete while the repository contains only planning placeholders or mocked provider success.

## 2. Entry gate for future implementation

Before any implementation mutation:

1. confirm `main` equals the factual planning-merge HEAD authorized by a later instruction;
2. confirm the DCA-01 planning PR is merged and externally audited as `Accepted`;
3. confirm BCA-01 and PR-M3 remain blocked;
4. inspect current schema and paths for collisions;
5. run a read-only preflight over every non-null `tenants.dominio_principal`;
6. stop fail-closed if invalid, duplicate or ambiguous normalized hostnames exist;
7. confirm no competing domain/Cloudflare implementation branch or PR exists;
8. confirm real credentials, DNS mutation and deploy remain separately unauthorized unless explicitly included by the Product Owner.

## 3. Binding authority

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_STATE_TRANSITION_AUTHORITY = true
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
SERVER_IS_CANONICAL_HOST_AUTHORITY = true
CLIENT_HOSTNAME_IS_AUTHORITY = false
CLIENT_STATUS_IS_AUTHORITY = false
CLIENT_PROVIDER_IDS_ARE_AUTHORITY = false
CLIENT_DNS_OBSERVATION_IS_AUTHORITY = false
CLIENT_SSL_STATUS_IS_AUTHORITY = false
FAIL_FAST = true
FAIL_CLOSED = true
HEURISTIC_FALLBACK = prohibited
DUAL_PATH = prohibited
```

Human Super Admin operations on tenant-scoped domain resources require explicit impersonation. Platform credential health and worker health remain global operations without tenant data authority.

## 4. Future implementation branch and PR

```text
IMPLEMENTATION_BRANCH = agent/dca-01-domain-cloudflare-activation
IMPLEMENTATION_PR = one principal draft pull request
BASE_BRANCH = main
AUTO_MERGE = false
MERGE_METHOD = squash only after final audit and explicit authorization
```

GitHub-native execution may use multiple internal commits and correction cycles inside that one implementation PR. No artificial stage subdivision or decimal stage identifiers are permitted.

## 5. FILES_ALLOWED for future implementation

The implementation preflight may remove an entry only when it proves the file unnecessary. Adding another runtime path requires an amended Architecture First decision before mutation.

```text
supabase/migrations/<timestamp>_dca_01_domain_cloudflare_activation.sql

src/lib/domains/domain-contracts.ts
src/lib/domains/domain-normalization.ts
src/lib/domains/domain-state-machine.ts
src/lib/domains/domain-authority.server.ts
src/lib/domains/domain-repository.server.ts
src/lib/domains/domain-jobs.server.ts
src/lib/domains/domain-reconciliation.server.ts
src/lib/domains/dns-observation.server.ts
src/lib/domains/cloudflare-port.server.ts
src/lib/domains/cloudflare-adapter.server.ts
src/lib/domains/domain-errors.ts

src/lib/api/tenant-domain.functions.ts
src/lib/api/super-domain.functions.ts
src/lib/tenant.server.ts
src/lib/api/configuration-registry.ts
src/lib/api/tenant-configuration.functions.ts
src/lib/super-admin/platform-operations-registry.ts

src/routes/_authenticated.admin.domains.tsx
src/routes/_authenticated.super.domains.tsx
src/components/domains/TenantDomainWorkspace.tsx
src/components/domains/SuperDomainOperations.tsx

src/integrations/supabase/types.ts
src/routeTree.gen.ts
package.json
bun.lock
scripts/verify-release.mjs
run-dca-01-domain-cloudflare-activation-specs.ts

docs/architecture/impact-analysis/DCA-01-domain-cloudflare-activation-impact-analysis.md
docs/architecture/governance/DCA-01-domain-cloudflare-activation-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-implementation-execution.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

### 5.1 Dependency boundary

A vetted IDNA/public-suffix implementation may be added only for canonical hostname validation. The expected choice is `tldts`, subject to exact version pinning, license verification, Cloudflare runtime compatibility and lockfile review. No general Cloudflare SDK is required if a narrow fetch-based adapter satisfies the port; adding an SDK requires explicit impact justification in the implementation PR.

## 6. FILES_PROHIBITED unless a new impact analysis proves necessity

```text
unrelated src/**
unrelated supabase migrations
historical migrations
RLS or grants outside DCA tables/functions
authentication model changes
tenant middleware redesign
impersonation redesign
billing tables or providers
portal adapters
marketing adapters
storage contracts
CMS/CRM runtime
Same-Backend Homologation Cell replacement
production deployment configuration
real credential files
plaintext secret files
```

## 7. Migration contract

Exactly one new forward migration must:

1. create the closed domain status and operation enums/domains;
2. create `tenant_domains`;
3. create `domain_verification_challenges`;
4. create `domain_provider_accounts`;
5. create `domain_provider_bindings`;
6. create `domain_operation_jobs`;
7. create `domain_operation_attempts`;
8. create `domain_audit_events`;
9. add indexes and global/canonical uniqueness constraints;
10. enable RLS on all new tables;
11. expose no permissive direct-client mutation policy;
12. create server-only RPCs with explicit grants and revocations;
13. preflight and backfill valid `tenants.dominio_principal` values;
14. fail on invalid/ambiguous/duplicate normalized values;
15. establish `tenants.dominio_principal` as compatibility projection only;
16. preserve current public resolution until the code cutover is deployed atomically;
17. include reversible cleanup functions where external execution has not occurred.

Historical migrations must not be edited.

## 8. RLS and grants

```text
RLS_ENABLED = true
ANON_DIRECT_TABLE_ACCESS = false
AUTHENTICATED_DIRECT_MUTATION = false
TENANT_CLIENT_STATUS_MUTATION = false
SERVICE_ROLE_SERVER_BOUNDARY = true
RPC_SEARCH_PATH_FIXED = true
PUBLIC_EXECUTE_REVOKED = true
ANON_EXECUTE_REVOKED = true
AUTHENTICATED_EXECUTE_ONLY_WHEN_SERVER_CONTRACT_REQUIRES = true
```

Tenant-facing server functions may read sanitized DTOs only after `requireTenant` and domain authorization. Public resolution uses a narrow read function that returns only tenant public identity for exactly one active hostname.

## 9. Server command surface

### Tenant commands

```text
requestTenantDomain
getTenantDomainState
listTenantDomainEvents
rotateDomainOwnershipChallenge
requestDomainVerificationCheck
requestDomainOperationRetry
requestDomainReplacement
requestDomainRemoval
cancelCancellableDomainOperation
```

All tenant commands use `requireTenant`, explicit permission checks, strict Zod inputs and server-generated IDs/statuses.

### Super Admin commands

```text
getDomainPlatformDiagnostics
listDomainOperationFailures
getProviderAccountHealth
retryDomainOperationAsImpersonatedTenant
recordManualAssistedObservationAsImpersonatedTenant
rotateProviderCredentialReference
setProviderAccountAvailability
```

Tenant-scoped mutations require explicit impersonation. Global provider-account operations do not accept tenant IDs as authority from the client.

### Public read

```text
resolveActiveTenantByHost
getCanonicalRedirectForActiveAlias
```

Both must fail closed on zero or multiple matches and must not fall back to slug, first tenant, default tenant or `tenants.dominio_principal` after cutover.

## 10. State machine implementation contract

The only persisted domain statuses are:

```text
draft
pending_ownership_verification
ownership_verified
pending_dns_configuration
pending_cloudflare_provisioning
pending_ssl
active
degraded
replacement_pending
removal_pending
failed
revoked
```

The transition function must be centralized and deterministic. SQL constraints and server code must reject unlisted transitions. No UI component, adapter or worker may update status directly.

## 11. Hybrid mode contract

```text
SUPPORTED_MODES = manual_assisted, api_automated
DEFAULT_MODE = none
MODE_REQUIRED_BEFORE_EXTERNAL_OPERATION = true
SILENT_MODE_FALLBACK = false
MODE_CHANGE_REQUIRES_COMMAND = true
MODE_CHANGE_IS_AUDITED = true
```

Both modes call the same domain command/state boundary. Manual-assisted mode records requests for independent observation; API mode executes the adapter. Neither mode can declare success without server observation.

## 12. Cloudflare adapter contract

The adapter receives only canonical server-owned values and an already resolved credential capability. Minimum operations:

```text
resolveZoneForHostname
createOrGetCustomHostname
readCustomHostname
readSslStatus
disableCustomHostname
deleteCustomHostname
```

Requirements:

- deterministic idempotency keys;
- request timeout and abort signal;
- bounded retry classification;
- no automatic account/zone selection from client data;
- no raw provider payload in tenant responses;
- no secret in logs/errors/audit rows;
- conflict reconciliation before creating duplicates;
- provider success never directly sets `active`.

## 13. DNS observation contract

- Query through a server-owned resolver port.
- Treat multiple conflicting answers as ambiguous.
- Record observation timestamp, RR type, normalized values and TTL.
- Require the current challenge generation.
- Do not accept screenshots, pasted values or browser DNS results as proof.
- A client `recheck` request schedules observation only.

## 14. Jobs and reconciliation

The implementation must materialize one repository-owned worker entrypoint or scheduler-compatible server command for:

- pending operation execution;
- bounded retries;
- SSL observation;
- active-domain periodic reconciliation;
- removal cleanup;
- stale challenge expiry;
- orphaned provider binding detection.

The planning does not authorize creation or configuration of an external scheduler. A repository-owned callable contract and deterministic tests are required; managed scheduling remains an explicit operational action.

## 15. Minimal functional surfaces

DCA-01 includes functional, non-final operational surfaces so the capability is usable before PR-M3:

### Tenant workspace

- request domain;
- choose available mode explicitly;
- display DNS/TXT instructions;
- show every lifecycle state;
- request recheck/retry/replacement/removal;
- show sanitized diagnostics and retry timing;
- never expose provider credentials or internal IDs.

### Super Admin workspace

- platform account health;
- queue/retry/degraded/orphan diagnostics;
- tenant-scoped action only after impersonation;
- global credential-reference controls;
- complete audit correlation.

PR-M3 may refine visual composition but may not redefine DCA authority, states or supported modes.

## 16. Deterministic test catalog

The implementation must add `run-dca-01-domain-cloudflare-activation-specs.ts` and integrate it into `verify:release`.

Minimum assertions:

### Normalization and anti-takeover

- Unicode to ASCII IDNA;
- lowercase/trailing dot;
- invalid URL-shaped input rejected;
- IP, localhost, wildcard, reserved and public-suffix-only rejected;
- apex and `www` remain distinct;
- normalized duplicate conflict across tenants.

### Authority

- tenant derived only from server middleware;
- client tenant/zone/account/provider/status ignored or rejected;
- Super Admin tenant mutation requires impersonation;
- global provider operation cannot read arbitrary tenant state;
- public resolver returns only active exact cardinality one.

### State machine

- every allowed transition;
- every disallowed transition;
- active predicate requires ownership + DNS + provider + SSL;
- degraded recovery;
- failed requires explicit retry;
- replacement atomicity;
- removal closes public authority.

### Challenge security

- unpredictable value derivation;
- expiry;
- rotation invalidates prior generation;
- replay rejected;
- ambiguous/missing DNS fails closed;
- attempt and rate limits.

### Provider and jobs

- create-or-reconcile idempotency;
- timeout/rate limit/auth/permission/conflict mapping;
- retry budget and backoff;
- lease/concurrency conflict;
- secret redaction;
- orphan and drift reconciliation.

### Cutover

- invalid legacy hostname blocks migration;
- duplicate normalized legacy host blocks migration;
- no direct resolver fallback to `tenants.dominio_principal` after cutover;
- compatibility projection follows active canonical row only.

## 17. Validation commands

```text
bun install --frozen-lockfile
bun run test:dca-01:domain-cloudflare-activation
bun run verify:release
git diff --check
```

The exact-head Release Gate must prove typecheck, production build, development build and deterministic route generation. An integral artifact must be bound to the exact implementation HEAD before final audit.

## 18. External validation gate inside DCA-01

After code is accepted and before DCA-01 terminal acceptance, a separately authorized controlled operation must use:

- one isolated non-production test domain;
- approved server-side Cloudflare credential reference;
- Same-Backend Homologation Cell;
- no production tenant or production hostname;
- recorded DNS/TXT/custom-hostname/SSL evidence;
- removal/rollback proof after validation.

```text
LIVE_TEST_REQUIRED_FOR_TERMINAL_ACCEPTANCE = true
LIVE_TEST_AUTHORIZED_BY_PLANNING = false
REAL_CREDENTIAL_AUTHORIZED_BY_PLANNING = false
DNS_MUTATION_AUTHORIZED_BY_PLANNING = false
DEPLOY_AUTHORIZED_BY_PLANNING = false
```

No extra decimal stage is created. This is an external proof gate within finite DCA-01.

## 19. Rollback contract

- Code rollback cannot claim external rollback.
- External objects require independently confirmed disable/delete operations.
- Prior active generation remains authoritative during replacement.
- If the new generation fails, keep or restore the prior valid active generation.
- If no valid generation exists, public resolution fails closed.
- Challenge revocation, provider cleanup and hostname cooldown are auditable.

## 20. Documentation requirements

The future implementation PR must update:

- this Impact Analysis with factual implemented paths;
- this Execution Envelope with exact HEAD and state;
- an implementation evidence document;
- roadmap and finite map;
- operator instructions for manual-assisted DNS and provider recovery;
- credential rotation and incident runbook.

A runbook may be added only through an implementation preflight amendment that names its exact path; the current envelope does not authorize an unspecified file.

## 21. Definition of Done

### Repository materialization

```text
AUTHORITATIVE_DOMAIN_AGGREGATE = true
CLOSED_STATE_MACHINE = true
GLOBAL_HOSTNAME_UNIQUENESS = true
OWNERSHIP_CHALLENGE_LIFECYCLE = true
MANUAL_ASSISTED_MODE_IMPLEMENTED = true
API_AUTOMATED_MODE_IMPLEMENTED = true
CLOUDFLARE_ADAPTER_IMPLEMENTED = true
DNS_OBSERVATION_PORT_IMPLEMENTED = true
SSL_LIFECYCLE_IMPLEMENTED = true
CANONICAL_ALIAS_REDIRECT_MODEL = true
ANTI_TAKEOVER_CONTROLS = true
IDEMPOTENT_OPERATION_JOBS = true
PERIODIC_RECONCILIATION_CONTRACT = true
TENANT_OPERATIONAL_SURFACE = true
SUPER_ADMIN_OPERATIONAL_SURFACE = true
PUBLIC_ACTIVE_DOMAIN_RESOLUTION = true
DIRECT_DOMINIO_PRINCIPAL_AUTHORITY_RETIRED = true
DUAL_PATH_COUNT = 0
```

### Security

```text
CLIENT_DOMAIN_AUTHORITY = false
CLIENT_PROVIDER_AUTHORITY = false
CLIENT_STATUS_AUTHORITY = false
TENANT_ISOLATION_PRESERVED = true
RLS_ENABLED = true
PUBLIC_MUTATION_GRANTS = 0
PLAINTEXT_PROVIDER_SECRETS = 0
SECRET_LOG_FINDINGS = 0
SUPER_ADMIN_IMPERSONATION_BOUNDARY_PRESERVED = true
```

### Tests and evidence

```text
FROZEN_INSTALL_PASSED = true
DCA01_DETERMINISTIC_SPECS_PASSED = true
VERIFY_RELEASE_PASSED = true
DIFF_CHECK_EXIT_CODE = 0
EXACT_HEAD_MATCH = true
MERGE_REF_USED = false
FULL_DIFF_ARTIFACT_VALID = true
CONTROLLED_EXTERNAL_DOMAIN_VALIDATION = success
EXTERNAL_ROLLBACK_VALIDATION = success
```

### Terminal state

```text
DCA01_STATE = Accepted
DCA01_IMPLEMENTATION_MERGED = true
DCA01_EXTERNAL_PROOF_ACCEPTED = true
BCA01_STATE = Planned — Blocked pending explicit authorization
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```

## 22. Planning-state ceiling

This planning execution may reach only:

```text
DCA01_PLANNING_STATE = Ready for Direct External Audit
DCA01_IMPLEMENTATION_STATE = Planned — Blocked
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_PLANNING_MERGE_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```
