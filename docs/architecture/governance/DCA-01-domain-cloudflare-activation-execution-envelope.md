# DCA-01 — Domain & Cloudflare Activation Execution Envelope

## Status

**Planning — Ready for Direct External Re-Audit**

```text
STAGE_ID = DCA-01
STAGE_NAME = Domain & Cloudflare Activation
STAGE_TYPE = finite_runtime_and_external_activation_gate
PLANNING_BASELINE_MAIN = fad8874bfeef85683445f52d21611e7d8760c1a0
REJECTED_PLANNING_HEAD_HISTORICAL = b6974aaccc11fbc4118a2af8c15320e2e665233e
PREDECESSOR = PR-M2 — Accepted / Merged / Closed
INTEGRATION_MODEL = HYBRID
PLANNING_AUTHORIZED = true
PLANNING_EXECUTED = true
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PLANNING_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

This envelope is an implementation contract only. It does not authorize implementation, migration, deploy, DNS mutation, Cloudflare API execution, credentials, external proof, BCA-01, PR-M3, homologation or production.

## 1. Finite implementation objective

A future expressly authorized DCA-01 implementation must materialize one authoritative custom-domain lifecycle supporting explicit `manual_assisted` and `api_automated` modes with:

- tenant-domain binding;
- ownership challenge and independent verification;
- DNS plan and observation;
- Cloudflare custom-hostname and SSL lifecycle;
- canonical host, aliases and single-hop redirects;
- anti-takeover controls;
- incumbent/candidate replacement;
- removal, rollback and periodic reconciliation;
- tenant and Super Admin operational surfaces;
- deterministic tests, Release Gate evidence and controlled external proof.

The implementation is not complete while the repository contains only planning placeholders, client-declared provider success, an unconsumed redirect query or an uninvokable reconciliation function.

## 2. Future implementation entry gate

Before any implementation mutation:

1. confirm `main` equals the factual planning-merge HEAD authorized by a later instruction;
2. confirm the DCA-01 planning PR is merged and the final external planning audit is `Accepted`;
3. confirm implementation is expressly authorized by the Product Owner;
4. confirm BCA-01 and PR-M3 remain blocked;
5. inspect the schema and all `FILES_ALLOWED` paths for collisions;
6. execute a read-only preflight over every non-null `tenants.dominio_principal`;
7. stop fail-closed if invalid, duplicate or ambiguous normalized hostnames exist;
8. confirm no competing domain/Cloudflare implementation branch or PR exists;
9. confirm real credentials, external DNS/provider execution, deploy and external proof remain separately unauthorized unless the instruction explicitly authorizes them.

Any divergence terminates the execution without mutation.

## 3. Binding authority

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_STATE_TRANSITION_AUTHORITY = true
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
SERVER_IS_CANONICAL_HOST_AUTHORITY = true
SERVER_IS_CUTOVER_AUTHORITY = true

CLIENT_HOSTNAME_IS_AUTHORITY = false
CLIENT_STATUS_IS_AUTHORITY = false
CLIENT_PROVIDER_IDS_ARE_AUTHORITY = false
CLIENT_DNS_OBSERVATION_IS_AUTHORITY = false
CLIENT_SSL_STATUS_IS_AUTHORITY = false

FAIL_FAST = true
FAIL_CLOSED = true
HEURISTIC_FALLBACK = prohibited
TENANT_DEFAULT = prohibited
FIRST_ROW_AUTHORITY = prohibited
REQUEST_TIME_DUAL_QUERY = prohibited
SILENT_MODE_FALLBACK = prohibited
```

Human Super Admin operations on tenant-scoped domain resources require explicit impersonation. Global provider-account, scheduler-health and cutover operations remain explicit platform operations without tenant data authority.

## 4. Future branch and PR contract

```text
IMPLEMENTATION_BRANCH = agent/dca-01-domain-cloudflare-activation
IMPLEMENTATION_PR = one principal draft pull request
BASE_BRANCH = main
AUTO_MERGE = false
MERGE_METHOD = squash only after final direct audit and explicit authorization
PROMPT_BUDGET = one principal implementation instruction plus at most one consolidated corrective instruction
ARTIFICIAL_SUBSTAGES = prohibited
```

Internal commits and deterministic development cycles inside the single principal PR do not create new stage identifiers or prompt budgets.

## 5. FILES_ALLOWED

The future implementation may alter only the following paths. An entry may be omitted when preflight proves it unnecessary. Adding another path requires a new Architecture First impact decision before mutation.

```text
supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql

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
src/server.ts
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
docs/operations/DCA-01-domain-activation-operator-runbook.md
docs/operations/DCA-01-cloudflare-credential-incident-runbook.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

### 5.1 Exact request and scheduler integration

`src/server.ts` is the single authorized request-level and scheduler-level integration point:

```text
CANONICAL_REDIRECT_ENTRYPOINT = src/server.ts::fetch before SSR rendering
SCHEDULED_EXECUTOR_ENTRYPOINT = src/server.ts::scheduled
SCHEDULED_AUTHORITY = Cloudflare platform-native scheduled event
PUBLIC_HTTP_JOB_TRIGGER = prohibited
```

The future implementation must not leave canonical redirect as an unused query function or reconciliation as an uninvokable library function.

### 5.2 Dependency boundary

A vetted IDNA/public-suffix dependency may be added only for canonical hostname validation. The expected choice is `tldts`, subject to exact version pinning, license review, Cloudflare runtime compatibility and lockfile inspection.

A general Cloudflare SDK is not required when a narrow fetch-based adapter satisfies the port. Adding an SDK requires an explicit implementation-time impact justification and remains limited to the listed dependency files.

## 6. FILES_PROHIBITED

Unless a new impact analysis proves necessity, the implementation must not alter:

```text
unlisted src/**
unlisted supabase migrations
historical migrations
unrelated RLS or grants
authentication model
tenant middleware architecture
impersonation architecture
billing or commercial tables/providers
portal adapters
marketing adapters
storage contracts
CMS or CRM runtime
Same-Backend Homologation Cell
production deployment configuration
Cloudflare account configuration files
real credential files
plaintext secret files
unrelated workflows
```

## 7. Single migration contract

Exactly one new forward migration at the authorized path must:

1. create the closed status and operation enums/domains;
2. create `tenant_domains`;
3. create `domain_verification_challenges`;
4. create `domain_provider_accounts`;
5. create `domain_provider_bindings`;
6. create `domain_operation_jobs`;
7. create `domain_operation_attempts`;
8. create `domain_audit_events`;
9. add global hostname reservation, active-canonical and generation constraints;
10. add expected-version concurrency checks;
11. enable RLS on every new table;
12. expose no permissive direct-client mutation policy;
13. create server-only functions with explicit grants and revocations;
14. preflight every non-null `tenants.dominio_principal`;
15. fail on invalid, duplicate or ambiguous normalized values;
16. import valid legacy values into `pending_ownership_verification` with server-owned import metadata;
17. prohibit automatic import as `active`;
18. establish `tenants.dominio_principal` as a server-maintained compatibility projection;
19. retain the old deployed resolver as sole authority until the separately controlled cutover;
20. include reversible database cleanup only where no external operation has occurred.

Historical migrations must not be edited.

## 8. RLS, grants and SQL authority

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
PROVIDER_IDENTIFIER_CLIENT_WRITE = false
```

Tenant-facing server functions may return sanitized DTOs only after `requireTenant` and explicit domain authorization. Public resolution uses one narrow server read that returns public tenant identity only for exactly one active hostname.

## 9. Closed state machine implementation

The only persisted statuses are:

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

The full predecessor, successor, command, authority, generation, public-authority, success, retry, rollback, audit and visibility contracts are binding from the Impact Analysis.

Implementation requirements:

- SQL and TypeScript use the same exact enum;
- unlisted transitions fail;
- adapters, workers, UI and clients cannot write status directly;
- `failed` reopens only through one of the named explicit recovery commands;
- `revoked` is terminal;
- only `active` is publicly authoritative;
- `removal_pending` closes public authority at entry;
- no open expressions such as “any processing state” are permitted.

## 10. Incumbent/candidate replacement

```text
INCUMBENT = existing active canonical row and generation
CANDIDATE = new linked row/generation created in replacement_pending
INCUMBENT_AUTHORITY_DURING_PREPARATION = preserved
CANDIDATE_AUTHORITY_BEFORE_SWAP = false
```

The incumbent remains `active` while the candidate progresses through ownership, DNS, provider and SSL checks. Candidate failure must not mutate the incumbent.

The swap must be one transaction that:

- validates both expected lock versions;
- proves the candidate active predicate;
- makes the candidate active;
- moves canonical and same-tenant alias authority;
- moves the incumbent to `removal_pending`;
- updates the compatibility projection;
- appends correlated audit events;
- rolls back entirely on any mismatch.

Database constraints must prevent two active canonical rows for one tenant.

## 11. Server command surfaces

### 11.1 Tenant commands

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

All tenant commands use `requireTenant`, strict Zod schemas, explicit permissions, server-generated identifiers and expected-version checks.

### 11.2 Super Admin commands

```text
getDomainPlatformDiagnostics
listDomainOperationFailures
getProviderAccountHealth
retryDomainOperationAsImpersonatedTenant
recordManualAssistedObservationAsImpersonatedTenant
rotateProviderCredentialReference
setProviderAccountAvailability
prepareAuthoritativeDomainCutover
```

Tenant-scoped mutations require explicit impersonation. Global provider-account and cutover operations do not accept client tenant IDs as authority.

### 11.3 Public reads

```text
resolveActiveTenantByHost
getCanonicalRedirectForActiveAlias
```

Both fail closed on zero or multiple matches. After cutover neither may fall back to slug, development mapping, first tenant, default tenant or `tenants.dominio_principal`.

## 12. Hostname normalization

The implementation must provide one server-owned normalizer that:

- accepts hostname-only input;
- trims, lowercases and removes exactly one terminal dot;
- performs IDNA ToASCII;
- validates labels and 253-octet total length;
- rejects URL shape, credentials, path, query, fragment and port;
- rejects IP, localhost, wildcard, reserved/test/example/internal names;
- rejects public-suffix-only input;
- derives registrable domain through a vetted public-suffix implementation;
- treats apex and `www` as explicit distinct bindings.

## 13. Hybrid mode contract

```text
SUPPORTED_MODES = manual_assisted, api_automated
DEFAULT_MODE = none
MODE_SELECTION = explicit authorized command
MODE_CHANGE = versioned and audited command
API_FAILURE_TO_MANUAL_FALLBACK = prohibited
```

### `manual_assisted`

The server generates instructions and independently observes DNS/provider state. Client/operator input may request recheck but cannot assert verification, provider success, SSL success or activation.

### `api_automated`

The server selects account and zone, provides canonical inputs to a narrow adapter, uses deterministic idempotency keys, bounds retries and sanitizes responses.

## 14. Canonical redirect in `src/server.ts::fetch`

Before SSR rendering:

1. parse the request URL and server-owned `Host`;
2. normalize the hostname;
3. query the active alias boundary with exact cardinality;
4. emit no redirect for a canonical host;
5. emit `308` only when source alias and target canonical are active, same-tenant and same-generation;
6. preserve path and query through URL objects;
7. force HTTPS;
8. reject loops, cross-tenant targets, chains above one hop and ambiguity;
9. fail closed without falling through to a different tenant.

Development/preview hosts classified server-side bypass custom-domain redirect evaluation and continue through the explicit development map only.

## 15. Scheduled executor in `src/server.ts::scheduled`

The default worker export must add one `scheduled` handler compatible with the current `fetch` entrypoint.

```text
AUTHENTICATION = Cloudflare platform-native scheduled authority
AUTH_FAILURE = fail-closed
PUBLIC_HTTP_TRIGGER = prohibited
TENANT_INPUT_AUTHORITY = false
LEASE_REQUIRED = true
IDEMPOTENCY_REQUIRED = true
CONCURRENCY_CONTROL = true
RETRY_LIMIT = explicit per operation taxonomy
TERMINAL_RESULT = explicit and persisted
```

The handler may:

- lease due jobs with an atomic compare-and-set;
- execute only persisted server-authorized commands;
- record one attempt per lease;
- sanitize provider/DNS output;
- schedule a bounded retry or terminal result;
- release or expire leases deterministically;
- run periodic reconciliation using the same authority model.

External Cron configuration and invocation remain separately authorized operations. No deployment configuration is changed by the principal implementation unless a later instruction explicitly authorizes it.

## 16. Import and cutover

### 16.1 Import state

Valid legacy hostnames are imported as:

```text
status = pending_ownership_verification
metadata.import_source = tenants.dominio_principal
metadata.imported_at = server timestamp
metadata.imported_from_legacy_authority = true
```

No other imported status exists.

### 16.2 Global cutover command

```text
CUTOVER_COMMAND = activate_authoritative_domain_resolution
CUTOVER_AUTHORITY = global platform operation
CUTOVER_FAILS_CLOSED = true
REQUEST_TIME_DUAL_QUERY = false
SILENT_FALLBACK = false
```

The command may authorize the exact release only after every incumbent hostname required for continuity has current evidence for normalization, uniqueness, ownership, DNS, provider binding, SSL, canonical/alias validity and reconciliation.

Failure behavior:

```text
CUTOVER_EXECUTED = false
OLD_AUTHORITY_REMAINS_UNCHANGED = true
CUTOVER_STATE = Blocked External or explicit failed preflight
```

The new release contains one production resolver path: active `tenant_domains`. It never queries the legacy field as fallback. The previous deployed release remains authoritative until the exact new release is activated. A failed activation leaves the previous release unchanged.

After successful cutover, `tenants.dominio_principal` remains only a server-maintained projection.

## 17. Production/development separation

```text
PRODUCTION_CUSTOM_DOMAIN_RESOLUTION = tenant_domains active-domain boundary only
PRODUCTION_DOMAIN_TO_SLUG_FALLBACK = prohibited
TENANT_DEFAULT_FALLBACK = prohibited
PUBLIC_TENANT_DEV_HOST_MAP = development-only explicit authority
DEVELOPMENT_HOST_MAP_IN_PRODUCTION = prohibited
DEVELOPMENT_MAP_COUNTS_AS_PRODUCTION_FALLBACK = false
```

Tests must prove that a production hostname cannot enter the development map and a development/preview host cannot reserve or activate a production custom-domain row.

## 18. Secrets and credential references

```text
PLAINTEXT_PROVIDER_SECRET_IN_DATABASE = prohibited
TENANT_CONFIGURATION_SECRET = prohibited
CLIENT_CREDENTIAL_REFERENCE_VISIBILITY = prohibited
REAL_CREDENTIAL_IN_CI = prohibited
LOG_SECRET_EXPOSURE = prohibited
```

`credential_reference` is an opaque server-side locator. The adapter resolves it from the deployment secret facility at runtime and redacts the reference and material from tenant DTOs, browser payloads, logs and ordinary diagnostics.

The credential incident runbook must define immediate disablement, rotation, impact assessment, audit preservation, provider cleanup and restoration without recording secret material.

## 19. Minimum functional surfaces

### Tenant workspace

Must expose:

- normalized hostname request;
- explicit mode selection;
- ownership instructions and challenge expiry;
- DNS instructions and observation state;
- provider/SSL progress in sanitized form;
- canonical/alias state;
- retry, replacement and removal commands where allowed;
- deterministic failure messages and next actions.

It must not expose provider credentials, opaque references, internal IDs as authority or direct status controls.

### Super Admin operations

Must expose:

- global provider-account health without tenant data access;
- scheduler and reconciliation health;
- failure inventory with sanitized metadata;
- explicit impersonation requirement before tenant-scoped mutation;
- global cutover preflight status;
- no button or field that declares external success directly.

## 20. Deterministic tests

`run-dca-01-domain-cloudflare-activation-specs.ts` must run deterministic tests covering:

1. normalization, IDNA and public suffix validation;
2. URL-shaped, IP, localhost, wildcard and reserved-domain rejection;
3. enum parity between SQL and TypeScript;
4. every explicitly enumerated predecessor/successor pair;
5. rejection of unlisted transitions;
6. tenant authority and explicit Super Admin impersonation;
7. challenge expiry, rotation, digest comparison and replay rejection;
8. global hostname and canonical uniqueness;
9. legacy import into `pending_ownership_verification`;
10. no automatic imported `active` state;
11. manual-assisted success assertion rejection;
12. API adapter server-owned account/zone selection;
13. provider failure, idempotency, bounded retry and terminal result;
14. lease acquisition, expiry and concurrency;
15. incumbent remains active during replacement;
16. candidate failure leaves incumbent unchanged;
17. atomic candidate/canonical/alias swap;
18. removal closes public authority before cleanup completion;
19. active-domain public resolver exact cardinality;
20. global cutover blocked by any unready incumbent;
21. old authority unchanged after failed preflight;
22. no request-time dual query or fallback;
23. canonical redirect before SSR, `308`, path/query preservation and HTTPS;
24. redirect loop, cross-tenant and multi-hop rejection;
25. `src/server.ts::scheduled` platform-native execution and fail-closed behavior;
26. periodic reconciliation and orphan detection;
27. production/development map isolation;
28. credential-reference and log redaction;
29. operator runbook completeness;
30. credential incident runbook completeness;
31. `FILES_ALLOWED` completeness against the Definition of Done;
32. migration rollback where no external operation occurred.

Existing release verification must continue to pass. Tests may not be removed or weakened to obtain green status.

## 21. Release Gate and exact-head evidence

Before implementation submission for direct audit:

1. run `git diff --check`;
2. run `bun install --frozen-lockfile`;
3. run `bun run verify:release`;
4. run the deterministic DCA test runner;
5. run typecheck and production/development builds through the existing Release Gate;
6. confirm exactly the allowed files changed;
7. produce exact-head full-diff evidence with manifest hashes and reconstruction match;
8. keep the implementation PR draft;
9. do not merge or enable auto-merge.

A green status without exact-head artifact validation is insufficient.

## 22. Runbooks

### `docs/operations/DCA-01-domain-activation-operator-runbook.md`

Must cover:

- manual-assisted tenant instructions;
- API-automated prerequisites;
- ownership and DNS observation;
- provider/SSL troubleshooting;
- replacement and removal;
- cutover preflight interpretation;
- external proof preparation;
- teardown and orphan verification;
- escalation and audit evidence.

### `docs/operations/DCA-01-cloudflare-credential-incident-runbook.md`

Must cover:

- provider account disablement;
- credential-reference rotation;
- secret exposure containment;
- affected job and domain inventory;
- log and audit preservation;
- provider cleanup;
- safe restoration and reconciliation;
- prohibition on writing secret material into tickets, docs or logs.

Both runbooks are mandatory implementation deliverables and do not require a later planning amendment.

## 23. Rollback

Before external operation:

- code and documentation may be reverted through Git history;
- the new migration must provide safe cleanup for empty/unactivated aggregates;
- no historical migration is edited;
- a failed implementation PR remains unmerged.

After separately authorized external operation:

- rollback is compensating and audit-preserving;
- public authority closes fail-closed before provider cleanup;
- provider objects and DNS changes are reconciled;
- challenge and hostname cooldown remain enforced;
- no destructive history rewrite is permitted.

## 24. Controlled external proof gate

Terminal DCA-01 acceptance requires a separately authorized proof in a non-production domain and Same-Backend Homologation Cell.

The proof must demonstrate:

- ownership challenge lifecycle;
- manual-assisted and, when credentials are authorized, API-automated mode;
- DNS, provider binding and SSL evidence;
- active-domain public resolution;
- canonical alias redirect;
- scheduler/reconciliation;
- replacement or removal safety;
- secret/log redaction;
- teardown and orphan absence.

The planning merge, implementation authorization and implementation merge do not automatically authorize this proof.

## 25. Definition of Done

DCA-01 implementation is ready for final direct implementation audit only when:

```text
ONE_AUTHORITATIVE_DOMAIN_AGGREGATE = true
CLOSED_STATE_MACHINE = true
ALL_PREDECESSORS_ENUMERATED = true
UNDEFINED_IMPORT_STATE = false
SERVER_ONLY_PROVIDER_AUTHORITY = true
MANUAL_AND_API_MODES_SHARE_AUTHORITY = true
SILENT_FALLBACK = false
INCUMBENT_PRESERVED_DURING_REPLACEMENT = true
ATOMIC_REPLACEMENT_SWAP = true
GLOBAL_HOSTNAME_UNIQUENESS = true
OWNERSHIP_ROTATION_AND_ANTI_REPLAY = true
ACTIVE_PREDICATE_COMPOSITE_AND_CURRENT = true
CANONICAL_REDIRECT_CONSUMED_IN_SERVER_FETCH = true
SCHEDULED_EXECUTOR_CONSUMED_IN_SERVER_SCHEDULED = true
PERIODIC_RECONCILIATION = true
LEGACY_IMPORT_PENDING_VERIFICATION = true
GLOBAL_CUTOVER_PREFLIGHT = true
REQUEST_TIME_DUAL_QUERY = false
LEGACY_FIELD_PRIMARY_AUTHORITY_AFTER_CUTOVER = false
DEVELOPMENT_MAP_ISOLATED_FROM_PRODUCTION = true
OPAQUE_CREDENTIAL_REFERENCE = true
PLAINTEXT_SECRET_PERSISTED = false
TENANT_AND_SUPER_ADMIN_SURFACES = true
TWO_REQUIRED_RUNBOOKS = true
DETERMINISTIC_TESTS = true
RELEASE_GATE = success
EXACT_HEAD_EVIDENCE = valid
IMPLEMENTATION_PR_DRAFT = true
IMPLEMENTATION_MERGED = false
EXTERNAL_PROOF_EXECUTED = false unless separately authorized
```

## 26. State ceiling for the future principal implementation

Absent a later instruction that explicitly changes the ceiling:

```text
DCA01_IMPLEMENTATION_STATE = Ready for Direct External Implementation Audit
DCA01_IMPLEMENTATION_AUTHORIZED = true only for the principal implementation instruction
DCA01_IMPLEMENTATION_MERGE_AUTHORIZED = false
DCA01_EXTERNAL_OPERATION_AUTHORIZED = false
DCA01_EXTERNAL_PROOF_AUTHORIZED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```

## 27. Current planning conclusion

This corrected envelope now names every known implementation file required by its own Definition of Done, including the request-level redirect integration, platform-native scheduled executor and two operational runbooks.

```text
DCA01_PLANNING_STATE = Ready for Direct External Re-Audit
DCA01_PLANNING_MERGE_READY = false
DCA01_PLANNING_MERGE_AUTHORIZED = false
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```
