# DCA-01 — Domain & Cloudflare Activation Impact Analysis

## Status

**Planning — Ready for Direct External Audit**

```text
STAGE_ID = DCA-01
STAGE_NAME = Domain & Cloudflare Activation
STAGE_TYPE = Architecture First planning
AUDITED_MAIN_HEAD = fad8874bfeef85683445f52d21611e7d8760c1a0
PREDECESSOR = PR-M2 — Accepted / Merged / Closed
EXECUTION_MODEL = GitHub-native
INTEGRATION_MODEL = HYBRID
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PLANNING_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

## 1. Objective

Define a finite, fail-closed architecture for custom-domain activation and Cloudflare integration without executing runtime implementation, DNS mutation, provider calls, managed migrations, deploy, homologation or production.

The future DCA-01 implementation must deliver one authoritative lifecycle for:

- domain request and tenant binding;
- ownership challenge and verification;
- manual-assisted and API-automated execution;
- DNS configuration and verification;
- Cloudflare account, zone and custom-hostname authority;
- SSL provisioning and certificate observation;
- canonical host and explicit aliases;
- redirect policy;
- replacement, removal, rollback and reconciliation;
- diagnostics, audit, rate limiting, retry and idempotency;
- anti-domain-takeover controls.

## 2. Binding decisions

```text
DOMAIN_AND_CLOUDFLARE_INTEGRATION_MODEL = HYBRID
MANUAL_ASSISTED_MODE = required
API_AUTOMATED_MODE = required
MODE_SELECTION = explicit_authorized_configuration
HEURISTIC_MODE_FALLBACK = prohibited
CLIENT_IS_DOMAIN_AUTHORITY = false
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
```

`HYBRID` means both operational modes are supported by one state machine and one authority model. It does not permit automatic fallback from API execution to manual execution, duplicate writes, independent status fields or separate tenant-resolution paths.

## 3. Audited current state

### 3.1 Already materialized

```text
ALREADY_MATERIALIZED =
- request Host normalization in src/lib/tenant.server.ts
- lowercase and trailing-dot normalization
- rejection of schemes, credentials, paths, query and malformed ports
- exact public tenant cardinality through limit(2) plus exactly-one selection
- fail-closed public tenant requirement
- explicit development-host map with invalid/ambiguous configuration failure
- tenants.dominio_principal nullable compatibility field
- public reads bound to server-owned Host resolution
- configuration system keys domain_activation_state and cloudflare_mode
- SQL validation freezing those keys at pending_DCA01 / HYBRID_pending_DCA01
- Super Admin domain_visibility external gate blocked_by_DCA01
- global-platform versus explicit-impersonation operation vocabulary
- configuration snapshots, revision checks, publish, rollback, diagnostics and audit patterns
```

The current public resolver normalizes the request `Host`, preserves `www`, queries `tenants.dominio_principal`, retrieves at most two rows and accepts only cardinality one. This is secure as a narrow single-host compatibility boundary, but it is not a complete domain lifecycle.

### 3.2 Reusable without change

```text
REUSABLE_WITHOUT_CHANGE =
- requireTenant and tenant middleware authority
- explicit Super Admin impersonation invariant
- PublicTenantResolutionError fail-closed behavior
- configuration revision and optimistic-concurrency patterns
- service-role server-only client boundary
- audit_log conventions
- deterministic exact-head Release Gate
- external success must not be inferred from local state
- Same-Backend Homologation Cell decision
```

### 3.3 Requires extension

```text
REQUIRES_EXTENSION =
- normalizePublicHost must delegate production-domain normalization to the canonical DCA normalizer
- public tenant resolution must require an active domain binding, not raw tenants.dominio_principal
- configuration future-gate keys must become projections of authoritative DCA state
- domain_visibility must read DCA lifecycle and diagnostic sources
- tenant and Super Admin diagnostics must expose all supported lifecycle states and modes
- public canonical URL generation must use the authoritative active canonical binding
```

### 3.4 Requires a new boundary

```text
REQUIRES_NEW_BOUNDARY =
- authoritative tenant_domains aggregate
- ownership challenge lifecycle
- provider account and credential-reference boundary
- provider binding records
- operation jobs and attempts
- domain audit events
- canonical alias and redirect model
- Cloudflare adapter port
- DNS observation port
- periodic reconciliation worker
- idempotent command boundary
- deterministic failure taxonomy
```

### 3.5 Requires external execution

```text
REQUIRES_EXTERNAL_EXECUTION =
- authoritative DNS queries against public resolvers
- TXT/CNAME observation
- Cloudflare account and zone lookup
- custom hostname creation/update/removal
- SSL/certificate observation
- live anti-takeover validation
- controlled test-domain activation
```

### 3.6 Out of scope

```text
OUT_OF_SCOPE =
- billing and commercial activation
- BCA-01
- PR-M3 visual refinement
- production release
- unrelated tenant, CRM, CMS, portal, marketing or tracking redesign
- replacement of Same-Backend Homologation Cell
- arbitrary Cloudflare infrastructure management outside domain activation
```

## 4. Material gaps and risks

### 4.1 Single nullable field is not a lifecycle aggregate

`tenants.dominio_principal` contains no ownership proof, mode, status, provider binding, SSL state, canonical/alias distinction, replacement generation, retry metadata or audit history. It must not become the write authority for DCA-01.

### 4.2 Public resolution currently has no activation-state predicate

The resolver accepts an exact match on `tenants.dominio_principal`. DCA-01 must retire this direct lookup as the primary authority and atomically cut over to an active-domain read model. Keeping both paths would create forbidden dual authority.

### 4.3 No repository-owned Cloudflare adapter was found

The audited HEAD contains planning placeholders and `domain_visibility`, but no server adapter that owns Cloudflare account selection, zone selection, custom-hostname lifecycle or certificate observation. Provider success cannot be inferred from current configuration or UI state.

### 4.4 No ownership challenge or anti-replay model exists

No challenge generation, expiry, rotation, digest verification, replay prevention, attempt tracking or cooldown contract is materialized.

### 4.5 No closed state machine exists

The current state is a single system-owned placeholder `pending_DCA01`. Partial activation could otherwise be mistaken for success. The implementation must persist every transition and reject unstated transitions.

### 4.6 Secret storage boundary is not materialized

Configuration snapshots explicitly reject secret-shaped keys and accept only public identifiers/non-secret values. Cloudflare credentials therefore require a separate server-only secret reference boundary; they may not be stored in tenant configuration, browser storage, public environment variables, logs or ordinary domain tables.

## 5. Authority model

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
SERVER_IS_STATE_TRANSITION_AUTHORITY = true
SERVER_IS_CANONICAL_HOST_AUTHORITY = true
CLIENT_HOSTNAME_IS_AUTHORITY = false
CLIENT_ZONE_ID_IS_AUTHORITY = false
CLIENT_ACCOUNT_ID_IS_AUTHORITY = false
CLIENT_PROVIDER_OBJECT_ID_IS_AUTHORITY = false
CLIENT_VERIFICATION_STATUS_IS_AUTHORITY = false
CLIENT_CERTIFICATE_STATUS_IS_AUTHORITY = false
FAIL_CLOSED_ON_AMBIGUITY = true
SUPER_ADMIN_REQUIRES_EXPLICIT_PLATFORM_OPERATION = true
SUPER_ADMIN_TENANT_MUTATION_REQUIRES_EXPLICIT_IMPERSONATION = true
```

### 5.1 Tenant Admin

A tenant-authorized user may:

- request one normalized hostname;
- choose an explicitly available execution mode;
- view instructions, observed status, diagnostics and safe failure details;
- request challenge rotation, retry, replacement or removal;
- cancel only transitions explicitly marked cancellable.

A tenant-authorized user may not set lifecycle status, provider IDs, account IDs, zone IDs, verification result, SSL result, canonical activation or retry counters.

### 5.2 Super Admin and platform service

- Human mutation of a tenant-scoped domain requires explicit impersonation.
- Global provider-account registration, credential-reference availability and worker health are platform operations and do not grant tenant data access.
- Service workers execute commands already authorized and persisted by the server; they do not manufacture tenant authority.
- Manual-assisted operator evidence is an observation request, never a success assertion. The server must independently verify DNS/provider state before transition.

### 5.3 Public request

Anonymous/public requests may resolve only a domain binding with `status = active`, `enabled = true`, a current generation and an unambiguous tenant. Alias rows may redirect to the canonical hostname; they may not independently select another tenant.

## 6. Canonical data model

The future implementation must create one migration that materializes the following logical aggregates. Exact SQL names may only change during implementation preflight if a collision with current HEAD is proven.

### 6.1 `tenant_domains`

Required fields:

```text
id uuid primary key
tenant_id uuid not null
normalized_hostname text not null
registrable_domain text not null
hostname_kind canonical|alias
execution_mode manual_assisted|api_automated
status domain_activation_status not null
enabled boolean not null
current_generation bigint not null
replacement_of uuid null
lock_version bigint not null
failure_code text null
failure_detail_sanitized jsonb not null
requested_by uuid not null
activated_at timestamptz null
revoked_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

- global unique normalized hostname for all non-terminal reusable states;
- at most one active canonical hostname per tenant;
- aliases reference the same tenant and active canonical generation;
- wildcard hostnames prohibited;
- terminal rows remain auditable and are not silently reused;
- all mutations through server RPC/command functions with explicit expected version.

### 6.2 `domain_verification_challenges`

Required fields:

```text
id uuid primary key
domain_id uuid not null
generation bigint not null
challenge_kind dns_txt|dns_cname
record_name text not null
challenge_digest text not null
nonce text not null
status pending|verified|expired|revoked
expires_at timestamptz not null
verified_at timestamptz null
attempt_count integer not null
last_observed_value_hash text null
created_by uuid not null
created_at timestamptz not null
updated_at timestamptz not null
```

The published challenge value is derived server-side from an opaque nonce and a server-held secret or stored through an approved encrypted-secret facility. Ordinary tables do not persist a reusable plaintext proof token.

### 6.3 `domain_provider_accounts`

Global platform table containing only:

- provider code;
- server-selected account identifier;
- opaque credential reference;
- enabled/capability state;
- health metadata and timestamps.

No credential material is returned to tenant APIs or stored in configuration snapshots.

### 6.4 `domain_provider_bindings`

Server-owned mapping between a domain generation and provider objects:

```text
provider_account_id
provider_zone_id
provider_custom_hostname_id
provider_hostname_status
provider_ssl_status
last_provider_observed_at
last_provider_etag_or_version
```

Client input for these fields is prohibited.

### 6.5 `domain_operation_jobs` and `domain_operation_attempts`

Each command has:

- tenant and domain generation;
- operation type;
- explicit execution mode;
- idempotency key;
- requested authority and actor;
- bounded retry policy;
- lease/lock state;
- sanitized provider/DNS result;
- next attempt time;
- terminal result.

### 6.6 `domain_audit_events`

Append-only lifecycle events including actor, authority origin, transition, command ID, domain generation, sanitized before/after state and correlation ID.

### 6.7 Compatibility projection

`tenants.dominio_principal` becomes a read-only compatibility projection of the active canonical `tenant_domains` row. It may be updated transactionally by the server during cutover, but direct application writes are prohibited. Public resolution must use the DCA active-domain boundary, not this projection.

## 7. Hostname normalization and validation

The canonical normalizer must:

1. accept a hostname only, never URL input;
2. trim and lowercase;
3. remove exactly one terminal dot;
4. convert Unicode through IDNA ToASCII;
5. reject empty labels, invalid label length and total length over 253 octets;
6. reject scheme, path, query, fragment, credentials and port;
7. reject IP literals, localhost and development hosts for production activation;
8. reject wildcard labels;
9. reject reserved/test/example/internal names;
10. reject public-suffix-only input;
11. derive and persist the registrable domain through a vetted public-suffix implementation;
12. produce one canonical ASCII hostname used for uniqueness and DNS/provider calls.

`www` is not removed heuristically. Apex and `www` are distinct explicit bindings. Redirect behavior is configured through canonical/alias rows.

## 8. Closed state machine

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

No other persisted status is valid.

### 8.1 Transition matrix

| State | Valid predecessors | Server-authorized operation | Success condition | Recoverability |
|---|---|---|---|---|
| `draft` | none | validate and persist request | normalized hostname reserved globally | cancellable |
| `pending_ownership_verification` | draft, failed | issue/rotate challenge; observe DNS | current unexpired challenge independently verified | retryable with bounds |
| `ownership_verified` | pending_ownership_verification | freeze verified generation | verification proof recorded and not expired | advances only |
| `pending_dns_configuration` | ownership_verified | present instructions or execute DNS adapter | required DNS records observed exactly | retryable |
| `pending_cloudflare_provisioning` | pending_dns_configuration, degraded | create/reconcile provider binding | provider object identity confirmed server-side | retryable/idempotent |
| `pending_ssl` | pending_cloudflare_provisioning, degraded | observe certificate lifecycle | provider reports active certificate and hostname validation | retryable |
| `active` | pending_ssl, replacement_pending | atomically activate generation/canonical projection | DNS, provider and SSL all current and verified | monitored |
| `degraded` | active | reconcile drift | active requirements restored or removal initiated | retryable |
| `replacement_pending` | active | prepare new generation while old remains authoritative | replacement reaches complete activation checks | atomic cutover/rollback |
| `removal_pending` | draft through degraded | revoke provider/DNS authority safely | provider binding removed/disabled and public resolution closed | retryable |
| `failed` | non-terminal processing states | record deterministic terminal failure | failure taxonomy marks manual correction or explicit retry | explicit retry only |
| `revoked` | removal_pending, failed | retain tombstone/cooldown | no active public/provider authority remains | terminal |

### 8.2 Active predicate

`active` requires all of the following in the same current generation:

```text
ownership_verified = true
required_dns_observed = true
provider_binding_confirmed = true
ssl_status = active
canonical_binding_unique = true
enabled = true
last_reconciliation_within_policy = true
```

A DNS response alone, provider API success alone or certificate issuance alone must never activate the domain.

## 9. Hybrid execution contract

### 9.1 Manual-assisted mode

- Server generates exact DNS/provider instructions.
- Tenant or authorized operator performs the external action.
- Client may request recheck but cannot submit a success status.
- Server independently queries DNS/provider observation ports.
- Provider IDs typed by a human are treated as lookup hints only and must be resolved and matched by the server before persistence.

### 9.2 API-automated mode

- Server selects the enabled provider account and zone using platform policy.
- Adapter receives canonical server-owned inputs only.
- Every provider mutation has a deterministic idempotency key.
- Retries are bounded and operate on the same command/generation.
- Provider responses are sanitized before persistence/logging.

### 9.3 Mode changes

Mode change requires an explicit authorized command. It creates a new operation plan or generation where necessary. Provider outage, timeout or rate limit does not silently switch to manual-assisted mode.

## 10. DNS, canonical host and redirects

- TXT ownership challenge and CNAME/target records are modeled separately.
- DNS observations record resolver, response set, TTL and observation time without treating cache as authority.
- Canonical hostname is one explicit active row.
- Apex and `www` aliases are explicit rows and globally unique.
- Redirects are generated only after both source alias and target canonical binding are active for the same tenant/generation.
- Cross-tenant redirects are prohibited.
- Redirect loops and chains longer than one hop are prohibited.
- Canonical URL generation uses the active canonical binding and HTTPS only.

## 11. Anti-takeover and removal

- Hostname reservation starts before challenge issuance.
- Challenge is bound to domain ID and generation, expires, rotates and cannot be replayed.
- A replaced or removed hostname remains tombstoned for a configurable cooldown.
- Provider custom hostnames are disabled/removed before the reservation is released.
- Public resolution closes before or atomically with removal.
- Reconciliation detects dangling DNS, orphaned provider objects, certificate regression and provider binding drift.
- Reuse after cooldown requires a new ownership challenge and generation.

## 12. Cloudflare adapter port

The domain core depends on a provider-neutral port with operations equivalent to:

```text
getAccountCapabilities
resolveZoneForHostname
createOrGetCustomHostname
readCustomHostname
readSslStatus
disableCustomHostname
deleteCustomHostname
readDnsObservation
```

The Cloudflare implementation is one adapter. Provider-specific payloads and errors do not cross the domain boundary. The adapter must classify timeout, rate limit, authentication failure, permission failure, zone not found, object conflict, validation pending, certificate pending and terminal provider rejection.

## 13. Secrets and credential references

```text
TENANT_CONFIGURATION_MAY_STORE_PROVIDER_SECRET = false
CLIENT_MAY_READ_CREDENTIAL_REFERENCE = false
DATABASE_MAY_STORE_PLAINTEXT_API_TOKEN = false
LOGS_MAY_INCLUDE_SECRET = false
CI_MAY_USE_REAL_CREDENTIAL = false
```

A global provider account stores an opaque credential reference. Runtime resolves that reference from an approved server secret facility. Rotation changes the secret behind the reference or atomically changes the reference; domain records do not contain the credential.

## 14. Idempotency, concurrency and retry

- Domain commands require `expectedLockVersion`.
- One current operation lease per domain generation.
- Idempotency key includes tenant, domain ID, generation and operation type.
- Provider create is implemented as create-or-read/reconcile, not blind duplicate creation.
- Retry count, backoff and next-attempt time are persisted.
- `failed` requires an explicit retry command; workers do not reopen terminal states implicitly.
- Replacement cutover is atomic: old canonical remains active until the new generation satisfies the full active predicate.

## 15. Failure taxonomy

Minimum stable error codes:

```text
invalid_hostname
reserved_hostname
public_suffix_only
hostname_already_reserved
hostname_cross_tenant_conflict
ownership_challenge_expired
ownership_not_verified
ownership_observation_mismatch
dns_record_missing
dns_record_ambiguous
dns_propagation_pending
provider_account_unavailable
provider_zone_not_found
provider_authentication_failed
provider_permission_denied
provider_rate_limited
provider_conflict
provider_rejected
ssl_pending
ssl_failed
state_transition_invalid
lock_version_conflict
operation_already_in_progress
retry_budget_exhausted
reconciliation_drift_detected
removal_incomplete
```

Tenant responses expose safe codes and guidance. Provider payloads, account IDs, credential references and internal diagnostics remain restricted.

## 16. Observability and audit

Metrics and diagnostics must include:

- count by lifecycle state and execution mode;
- challenge age and verification attempts;
- operation queue age, attempts and retry exhaustion;
- provider latency/rate-limit/auth failures;
- SSL pending age;
- active-domain reconciliation age;
- degraded and orphaned binding counts;
- manual versus automated completion rate;
- sanitized correlation IDs.

Every state transition and operator command produces an append-only audit event.

## 17. Rate limiting

Server-side limits apply per actor, tenant, domain and IP where applicable:

- domain requests;
- challenge rotations;
- DNS rechecks;
- provider retries;
- replacements;
- removals.

Rate limiting is not delegated to the client and cannot be bypassed by changing identifiers.

## 18. Cutover strategy

1. Preflight all non-null `tenants.dominio_principal` values through the canonical normalizer.
2. Fail the migration if normalized duplicates, invalid values or ambiguous tenant bindings exist.
3. Backfill one domain aggregate per valid existing hostname with an explicit imported state that cannot become `active` without current verification/provider/SSL evidence.
4. Materialize the active-domain server read boundary.
5. Atomically switch public resolution to that boundary.
6. Remove direct application writes and direct public authority from `tenants.dominio_principal`.
7. Keep `tenants.dominio_principal` only as a transactional compatibility projection until a later separately approved cleanup.

No dual-path fallback is permitted during or after cutover.

## 19. Rollback

- Before public cutover: revert code/migration while no external objects have been activated.
- After provider object creation but before activation: disable/delete provider objects and revoke challenges; public resolution remains unchanged.
- After active cutover: restore the prior active generation atomically if still valid, otherwise fail closed and serve no tenant for the affected host.
- Replacement rollback never points a hostname to two tenants or two canonical generations.
- Database rollback does not imply external rollback; external cleanup must be independently confirmed and audited.

## 20. Future implementation validation

### Deterministic tests

- hostname normalization/IDNA/public suffix cases;
- exact transition matrix;
- tenant and Super Admin authorization;
- no client authority for status/provider IDs;
- global uniqueness and canonical cardinality;
- challenge expiry/rotation/replay;
- idempotency and lock conflicts;
- manual-assisted observation contract;
- API adapter create-or-reconcile behavior;
- bounded retry and failure taxonomy;
- replacement/removal atomicity;
- public resolution only for active bindings;
- alias redirect single-hop/same-tenant rules;
- secret redaction;
- no dual-path resolver.

### Integration tests with fakes

- deterministic DNS observation fake;
- deterministic Cloudflare adapter fake;
- provider timeout/rate-limit/auth/conflict scenarios;
- SSL pending-to-active progression;
- drift reconciliation;
- outbox/job retry behavior.

### Controlled external proof

DCA-01 cannot reach terminal `Accepted` solely from mocked tests. A later explicitly authorized operation must validate one isolated non-production test domain against real DNS and Cloudflare using Same-Backend Homologation Cell constraints. That proof remains part of DCA-01 and does not create an artificial successor stage.

## 21. Planning result

```text
DCA01_PLANNING_STATE = Ready for Direct External Audit
DCA01_IMPLEMENTATION_STATE = Planned — Blocked
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
LIVE_DOMAIN_VERIFIED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```
