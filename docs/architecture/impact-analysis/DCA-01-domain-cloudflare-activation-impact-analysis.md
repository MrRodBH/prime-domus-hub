# DCA-01 — Domain & Cloudflare Activation Impact Analysis

## Status

**Planning — Ready for Direct External Re-Audit**

```text
STAGE_ID = DCA-01
STAGE_NAME = Domain & Cloudflare Activation
STAGE_TYPE = Architecture First planning
AUDITED_MAIN_HEAD = fad8874bfeef85683445f52d21611e7d8760c1a0
REJECTED_PLANNING_HEAD_HISTORICAL = b6974aaccc11fbc4118a2af8c15320e2e665233e
PREDECESSOR = PR-M2 — Accepted / Merged / Closed
EXECUTION_MODEL = GitHub-native
DOMAIN_AND_CLOUDFLARE_INTEGRATION_MODEL = HYBRID
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PLANNING_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

The rejected planning HEAD is historical evidence only. It is not current planning authority and must not be restored as the operative state.

## 1. Finite objective

DCA-01 must define and, only after a separate authorization, materialize one fail-closed custom-domain lifecycle for:

- tenant-domain binding;
- ownership challenge and independent verification;
- explicit `manual_assisted` and `api_automated` modes;
- DNS instruction, execution and observation;
- Cloudflare account, zone, custom-hostname and SSL authority;
- canonical host, explicit aliases and redirects;
- replacement, removal, rollback and reconciliation;
- tenant and Super Admin operational surfaces;
- deterministic evidence, audit, retry and idempotency;
- anti-domain-takeover controls;
- one atomic public-resolution cutover without request-time dual authority.

This planning does not execute implementation, migration, deploy, DNS mutation, Cloudflare API calls, real credentials, external proof, BCA-01, PR-M3, homologation or production.

## 2. Binding authority model

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
SERVER_IS_STATE_TRANSITION_AUTHORITY = true
SERVER_IS_CANONICAL_HOST_AUTHORITY = true
SERVER_IS_CUTOVER_AUTHORITY = true

CLIENT_HOSTNAME_IS_AUTHORITY = false
CLIENT_ZONE_ID_IS_AUTHORITY = false
CLIENT_ACCOUNT_ID_IS_AUTHORITY = false
CLIENT_PROVIDER_OBJECT_ID_IS_AUTHORITY = false
CLIENT_PROVIDER_STATUS_IS_AUTHORITY = false
CLIENT_SSL_STATUS_IS_AUTHORITY = false
CLIENT_DNS_OBSERVATION_IS_AUTHORITY = false

FAIL_FAST = true
FAIL_CLOSED = true
HEURISTIC_FALLBACK = prohibited
TENANT_DEFAULT = prohibited
FIRST_ROW_AUTHORITY = prohibited
REQUEST_TIME_DUAL_QUERY = prohibited
SILENT_MODE_FALLBACK = prohibited
DIRECT_STATUS_MUTATION = prohibited
```

A tenant-authorized user may request an operation and view sanitized state, but may not set lifecycle status, provider identifiers, verification outcome, certificate outcome, retry counters, canonical authority or cutover state.

Human Super Admin mutation of tenant-scoped domain data requires explicit impersonation. Global provider-account registration, credential-reference health, scheduler health and global cutover are explicit platform operations and do not grant tenant resource access.

## 3. Audited current state

### 3.1 Existing public tenant resolution

The current repository already provides:

- server-owned request `Host` input;
- trim, lowercase and trailing-dot normalization;
- rejection of schemes, credentials, paths, query strings, fragments and malformed ports;
- an explicit development-host map;
- a production lookup against `tenants.dominio_principal`;
- `limit(2)` cardinality detection and acceptance only when exactly one tenant matches;
- no default tenant and fail-closed behavior on absence or ambiguity.

This is a secure compatibility boundary, not a complete domain lifecycle. Production resolution must eventually cut over to the authoritative active-domain boundary defined here.

### 3.2 Existing Configuration Center placeholders

```text
domain_activation_state = pending_DCA01
cloudflare_mode = HYBRID_pending_DCA01
```

These values are system-owned, non-public and secret-rejecting placeholders. They are not domain authority, provider success, DNS evidence or SSL evidence.

The existing revision, optimistic-concurrency, publish, rollback and audit patterns are reusable. Configuration snapshots remain prohibited from containing provider secrets or credential references visible to clients.

### 3.3 Existing Super Admin decisions

The current repository keeps `domain_visibility` blocked by DCA-01 and separates global platform operations from tenant-scoped operations requiring explicit impersonation.

The Product Owner decision remains binding:

```text
DOMAINS_AND_CLOUDFLARE = HYBRID
SUPPORTED_MODES = manual_assisted, api_automated
MODE_SELECTION = explicit
SILENT_MODE_FALLBACK = prohibited
EXTERNAL_SUCCESS_INFERRED_FROM_LOCAL_STATE = prohibited
```

### 3.4 Not materialized in the audited baseline

The current `main` does not materialize:

- `tenant_domains`;
- `domain_verification_challenges`;
- `domain_provider_accounts`;
- `domain_provider_bindings`;
- `domain_operation_jobs`;
- `domain_operation_attempts`;
- `domain_audit_events`;
- a Cloudflare adapter;
- a closed domain state machine;
- ownership challenge rotation and anti-replay;
- canonical/alias aggregate authority;
- SSL lifecycle authority;
- periodic domain reconciliation;
- an active-domain public resolver.

Document names and placeholders are not evidence of implementation.

## 4. Canonical data model

A future authorized implementation must create one forward migration containing these logical aggregates.

### 4.1 `tenant_domains`

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
generation bigint not null
replacement_of uuid null
incumbent_domain_id uuid null
lock_version bigint not null
failure_code text null
failure_detail_sanitized jsonb not null
resume_state domain_activation_status null
metadata jsonb not null
requested_by uuid not null
activated_at timestamptz null
revoked_at timestamptz null
created_at timestamptz not null
updated_at timestamptz not null
```

Constraints:

- normalized hostname is globally reserved across all non-reusable and cooldown states;
- no more than one active canonical hostname exists per tenant;
- aliases belong to the same tenant and active canonical generation;
- wildcard hostnames are prohibited;
- provider identifiers are not client-writable;
- all commands use explicit expected `lock_version`;
- direct client table mutation is prohibited;
- terminal tombstones remain auditable and are not silently reused.

### 4.2 `domain_verification_challenges`

Required fields include domain ID, generation, challenge kind, record name, digest, opaque nonce reference, status, expiry, verification timestamp, attempt count, observed-value hash and actor metadata.

The challenge must be temporary, generation-bound, rotatable and anti-replay. A reusable plaintext proof token must not be persisted in ordinary tables.

### 4.3 `domain_provider_accounts`

Global platform aggregate containing only:

- provider code;
- server-selected account identifier;
- opaque server-side credential reference;
- enabled capabilities;
- sanitized health state and timestamps.

Plaintext provider secrets are prohibited in the database, tenant configuration, logs, client DTOs and CI.

### 4.4 `domain_provider_bindings`

Server-owned mapping between a domain generation and provider objects, including account, zone, custom-hostname identity, observed provider status, observed SSL status, provider version/etag and observation timestamps.

Client-supplied account IDs, zone IDs, custom-hostname IDs and status values are never authority.

### 4.5 `domain_operation_jobs` and `domain_operation_attempts`

Every operation must include:

- tenant, domain and generation;
- explicit operation type and execution mode;
- deterministic idempotency key;
- requesting authority and actor;
- bounded retry policy;
- lease owner and lease expiry;
- next-attempt timestamp;
- sanitized DNS/provider result;
- terminal result and deterministic error taxonomy.

A worker may execute only a persisted server-authorized command. It may not manufacture tenant authority or infer a successful transition from transport success.

### 4.6 `domain_audit_events`

Append-only events must record actor, authority origin, command ID, correlation ID, generation, transition, sanitized before/after state and external observation references.

### 4.7 Compatibility projection

`tenants.dominio_principal` becomes a read-only compatibility projection of the active canonical `tenant_domains` row. Direct application writes are prohibited. After cutover it is never a public-resolution authority.

## 5. Canonical hostname normalization

The single server-owned normalizer must:

1. accept a hostname only, never a URL-shaped input;
2. trim and lowercase;
3. remove exactly one terminal dot;
4. convert Unicode through IDNA ToASCII;
5. reject empty labels, invalid label lengths and total length above 253 octets;
6. reject scheme, path, query, fragment, credentials and port;
7. reject IP literals, localhost, wildcard and development-only hosts for production activation;
8. reject reserved, example, test and internal domains;
9. reject public-suffix-only input;
10. derive the registrable domain using a vetted public-suffix implementation;
11. persist and compare only canonical ASCII hostnames.

Apex and `www` are separate explicit bindings. Neither is inferred from the other.

## 6. Closed domain state machine

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

```text
TERMINAL_STATES = revoked
RETRYABLE_STATES = pending_ownership_verification, pending_dns_configuration, pending_cloudflare_provisioning, pending_ssl, degraded, replacement_pending, removal_pending, failed
PUBLICLY_AUTHORITATIVE_STATES = active
GENERATION_CREATING_TRANSITIONS = create_domain_request, request_domain_replacement
EXPLICIT_RECOVERY_TRANSITIONS = recover_failed_ownership, recover_failed_dns, recover_failed_provider, recover_failed_ssl, recover_failed_removal
STATUS_PRESERVING_COMMANDS = issue_ownership_challenge, rotate_ownership_challenge, observe_ownership_dns_without_verified_evidence
```

No adapter, UI component, client request or worker may mutate status directly. The centralized server transition function and database constraints must reject every transition not listed below. Commands that preserve status are audited commands, not edges in the transition graph.

### 6.1 `draft`

```text
VALID_PREDECESSORS = none; created only by create_domain_request
VALID_SUCCESSORS = pending_ownership_verification, removal_pending, failed
AUTHORIZED_COMMAND = create_domain_request, issue_ownership_challenge, request_domain_removal
AUTHORITY = tenant command after requireTenant, or impersonated tenant command
PERSISTED_EFFECT = reserve normalized hostname and generation 1
GENERATION_EFFECT = creates generation
PUBLIC_AUTHORITY = false
SUCCESS = normalized hostname passes validation and global reservation
RECOVERABLE_ERRORS = transient persistence conflict before commit
TERMINAL_ERRORS = invalid, reserved, duplicate or ambiguous hostname
RETRY = new command with same deterministic idempotency key before commit; otherwise explicit new request
ROLLBACK = delete only before reservation commit; after commit use removal_pending
AUDIT_EVENT = domain_request_created
TENANT_VISIBILITY = sanitized request state
SUPER_ADMIN_VISIBILITY = diagnostic state; tenant mutation only by impersonation
```

### 6.2 `pending_ownership_verification`

```text
VALID_PREDECESSORS = draft, replacement_pending, failed through recover_failed_ownership only
VALID_SUCCESSORS = ownership_verified, removal_pending, failed
AUTHORIZED_COMMAND = issue_ownership_challenge, rotate_ownership_challenge, observe_ownership_dns
STATUS_PRESERVING_COMMAND = issue_ownership_challenge, rotate_ownership_challenge, observe_ownership_dns when current verified evidence is absent
AUTHORITY = server command requested by authorized tenant or impersonated tenant
PERSISTED_EFFECT = active challenge generation, expiry and anti-replay metadata
GENERATION_EFFECT = preserves domain generation; challenge rotation increments challenge version only
PUBLIC_AUTHORITY = false
SUCCESS = current unexpired challenge independently observed and verified
RECOVERABLE_ERRORS = DNS timeout, propagation delay, bounded resolver error
TERMINAL_ERRORS = challenge replay, ownership conflict, policy rejection
RETRY = bounded observation retry or explicit rotation
ROLLBACK = revoke challenge and enter removal_pending
AUDIT_EVENT = ownership_challenge_issued|rotated|observed|verified|failed
TENANT_VISIBILITY = instructions and sanitized observations
SUPER_ADMIN_VISIBILITY = full sanitized diagnostics; no tenant mutation without impersonation
```

Challenge issuance, rotation and non-conclusive observations preserve `pending_ownership_verification`; they increment the challenge version or observation metadata and append audit events without creating a persisted self-transition. Every new challenge version is generation-bound, expires independently and invalidates prior proof material for anti-replay enforcement.

### 6.3 `ownership_verified`

```text
VALID_PREDECESSORS = pending_ownership_verification
VALID_SUCCESSORS = pending_dns_configuration, removal_pending, failed
AUTHORIZED_COMMAND = freeze_ownership_proof, prepare_dns_configuration
AUTHORITY = server transition after independent verification
PERSISTED_EFFECT = immutable current-generation ownership evidence reference
GENERATION_EFFECT = preserves generation
PUBLIC_AUTHORITY = false
SUCCESS = proof is current, unexpired and generation-bound
RECOVERABLE_ERRORS = none after committed verification
TERMINAL_ERRORS = proof invalidated before DNS preparation
RETRY = explicit restart through failed recovery when proof becomes invalid
ROLLBACK = removal_pending
AUDIT_EVENT = ownership_verified
TENANT_VISIBILITY = verified state without secret proof material
SUPER_ADMIN_VISIBILITY = sanitized evidence metadata
```

### 6.4 `pending_dns_configuration`

```text
VALID_PREDECESSORS = ownership_verified, failed through recover_failed_dns only
VALID_SUCCESSORS = pending_cloudflare_provisioning, removal_pending, failed
AUTHORIZED_COMMAND = present_manual_dns_instructions, execute_automated_dns_plan, observe_required_dns
AUTHORITY = server command; external actor never sets success
PERSISTED_EFFECT = required DNS plan and independent observation set
GENERATION_EFFECT = preserves generation
PUBLIC_AUTHORITY = false
SUCCESS = exact required records independently observed for current generation
RECOVERABLE_ERRORS = propagation delay, resolver timeout, bounded provider error
TERMINAL_ERRORS = conflicting ownership, policy-invalid record set
RETRY = bounded job retry or explicit tenant recheck request
ROLLBACK = remove server-created provider records when applicable, then removal_pending
AUDIT_EVENT = dns_plan_created|dns_observed|dns_failed
TENANT_VISIBILITY = exact instructions and sanitized observations
SUPER_ADMIN_VISIBILITY = platform diagnostics plus impersonated tenant actions
```

### 6.5 `pending_cloudflare_provisioning`

```text
VALID_PREDECESSORS = pending_dns_configuration, degraded, failed through recover_failed_provider only
VALID_SUCCESSORS = pending_ssl, removal_pending, failed
AUTHORIZED_COMMAND = provision_or_reconcile_provider_binding
AUTHORITY = server-selected provider account and server-owned canonical inputs
PERSISTED_EFFECT = idempotent provider binding and sanitized provider observation
GENERATION_EFFECT = preserves generation
PUBLIC_AUTHORITY = false
SUCCESS = provider object identity independently confirmed server-side
RECOVERABLE_ERRORS = timeout, rate limit, transient provider failure
TERMINAL_ERRORS = account policy rejection, zone mismatch, ownership conflict
RETRY = bounded with the same deterministic idempotency key
ROLLBACK = disable/remove server-created provider object, then removal_pending
AUDIT_EVENT = provider_provisioning_started|observed|failed
TENANT_VISIBILITY = sanitized progress and actionable instructions
SUPER_ADMIN_VISIBILITY = provider health globally; tenant operation only through impersonation
```

### 6.6 `pending_ssl`

```text
VALID_PREDECESSORS = pending_cloudflare_provisioning, degraded, failed through recover_failed_ssl only
VALID_SUCCESSORS = active, removal_pending, failed
AUTHORIZED_COMMAND = observe_ssl_lifecycle, activate_domain_generation
AUTHORITY = server after provider and DNS observations
PERSISTED_EFFECT = current-generation SSL observations and activation preconditions
GENERATION_EFFECT = preserves generation
PUBLIC_AUTHORITY = false
SUCCESS = certificate active and all active predicate evidence current
RECOVERABLE_ERRORS = provider pending state, transient observation failure
TERMINAL_ERRORS = certificate policy rejection or irreconcilable provider mismatch
RETRY = bounded observation retry
ROLLBACK = provider cleanup followed by removal_pending
AUDIT_EVENT = ssl_observed|ssl_active|ssl_failed
TENANT_VISIBILITY = sanitized certificate state
SUPER_ADMIN_VISIBILITY = sanitized provider diagnostics
```

### 6.7 `active`

```text
VALID_PREDECESSORS = pending_ssl, degraded
VALID_SUCCESSORS = degraded, removal_pending
AUTHORIZED_COMMAND = activate_domain_generation, restore_degraded_domain, record_reconciliation_drift, request_domain_removal
AUTHORITY = server-only activation or restoration transaction
PERSISTED_EFFECT = exactly one active canonical generation and compatible aliases
GENERATION_EFFECT = makes current candidate generation authoritative or restores the same degraded generation after complete evidence
PUBLIC_AUTHORITY = true
SUCCESS = complete current-generation active predicate
RECOVERABLE_ERRORS = post-activation drift transitions to degraded
TERMINAL_ERRORS = none directly; security or ownership loss closes authority through degraded/removal flow
RETRY = periodic reconciliation only
ROLLBACK = transaction abort before commit only; after a committed replacement swap, recovery requires a new explicit replacement generation
AUDIT_EVENT = domain_activated|domain_restored|domain_drift_detected
TENANT_VISIBILITY = active domain and safe diagnostics
SUPER_ADMIN_VISIBILITY = global diagnostics; tenant mutation only through impersonation
```

Direct `degraded → active` restoration is valid only after the server re-proves the complete current-generation active predicate, including ownership, DNS, provider binding, SSL, canonical/alias validity and successful reconciliation. It restores the same generation and is not a replacement rollback.

### 6.8 `degraded`

```text
VALID_PREDECESSORS = active
VALID_SUCCESSORS = active, pending_cloudflare_provisioning, pending_ssl, removal_pending, failed
AUTHORIZED_COMMAND = reconcile_domain_drift, restart_provider_reconciliation, restart_ssl_observation, request_domain_removal
AUTHORITY = server reconciliation command
PERSISTED_EFFECT = close public authority and persist deterministic drift evidence
GENERATION_EFFECT = preserves generation
PUBLIC_AUTHORITY = false
SUCCESS = full active predicate independently restored before transition to active
RECOVERABLE_ERRORS = DNS, provider or SSL transient drift
TERMINAL_ERRORS = ownership loss, provider deletion or irreconcilable binding conflict
RETRY = bounded reconciliation
ROLLBACK = restore active only after full evidence; otherwise removal_pending
AUDIT_EVENT = domain_degraded|domain_restored|domain_reconciliation_failed
TENANT_VISIBILITY = sanitized degraded reason and remediation
SUPER_ADMIN_VISIBILITY = platform diagnostics and impersonated remediation
```

### 6.9 `replacement_pending`

```text
VALID_PREDECESSORS = none; created only as a new candidate generation by request_domain_replacement while an incumbent row remains active
VALID_SUCCESSORS = pending_ownership_verification, removal_pending, failed
AUTHORIZED_COMMAND = request_domain_replacement, issue_ownership_challenge_for_candidate
AUTHORITY = tenant command after requireTenant, or impersonated tenant command
PERSISTED_EFFECT = create candidate domain/generation linked to active incumbent
GENERATION_EFFECT = creates a new candidate generation
PUBLIC_AUTHORITY = false; incumbent remains active and authoritative
SUCCESS = candidate reservation succeeds and challenge can be issued
RECOVERABLE_ERRORS = transient candidate preparation failure
TERMINAL_ERRORS = duplicate hostname, policy rejection, ownership conflict
RETRY = explicit candidate command with deterministic idempotency key
ROLLBACK = revoke candidate only; incumbent remains unchanged
AUDIT_EVENT = domain_replacement_requested|candidate_created|candidate_failed
TENANT_VISIBILITY = candidate progress plus incumbent identity
SUPER_ADMIN_VISIBILITY = sanitized diagnostics; tenant mutation only by impersonation
```

### 6.10 `removal_pending`

```text
VALID_PREDECESSORS = draft, pending_ownership_verification, ownership_verified, pending_dns_configuration, pending_cloudflare_provisioning, pending_ssl, active, degraded, replacement_pending, failed
VALID_SUCCESSORS = revoked, failed
AUTHORIZED_COMMAND = request_domain_removal, continue_domain_cleanup
AUTHORITY = authorized tenant or impersonated tenant request; cleanup executed server-side
PERSISTED_EFFECT = close public authority atomically, revoke challenges, remove/disable provider binding and enforce cooldown
GENERATION_EFFECT = preserves generation as tombstone
PUBLIC_AUTHORITY = false from entry into the state
SUCCESS = no public resolver, provider or reusable ownership authority remains
RECOVERABLE_ERRORS = provider cleanup timeout or transient DNS/provider error
TERMINAL_ERRORS = deterministic cleanup failure recorded as failed with resume_state=removal_pending
RETRY = bounded cleanup retry or recover_failed_removal
ROLLBACK = prohibited after public authority is closed unless an explicit new generation is created
AUDIT_EVENT = domain_removal_requested|cleanup_attempted|domain_revoked
TENANT_VISIBILITY = sanitized removal progress
SUPER_ADMIN_VISIBILITY = cleanup diagnostics; tenant mutation only through impersonation
```

A row that entered `removal_pending` after a committed replacement swap cannot transition directly back to `active`. Any later recovery of that hostname requires a new explicit candidate generation and the complete verification lifecycle.

### 6.11 `failed`

```text
VALID_PREDECESSORS = draft, pending_ownership_verification, ownership_verified, pending_dns_configuration, pending_cloudflare_provisioning, pending_ssl, degraded, replacement_pending, removal_pending
VALID_SUCCESSORS = pending_ownership_verification, pending_dns_configuration, pending_cloudflare_provisioning, pending_ssl, removal_pending, revoked
AUTHORIZED_COMMAND = recover_failed_ownership, recover_failed_dns, recover_failed_provider, recover_failed_ssl, recover_failed_removal, revoke_failed_domain
AUTHORITY = explicit authorized server command; no implicit retry transition
PERSISTED_EFFECT = deterministic failure code, sanitized detail and constrained resume_state
GENERATION_EFFECT = preserves generation unless a separate replacement command creates a new one
PUBLIC_AUTHORITY = false
SUCCESS = explicit recovery command validates the exact allowed resume target
RECOVERABLE_ERRORS = only failure codes classified retryable
TERMINAL_ERRORS = policy, ownership or security failures classified non-recoverable
RETRY = explicit, audited and bounded; background worker cannot reopen automatically
ROLLBACK = cleanup or revocation; no restoration of public authority without full active predicate
AUDIT_EVENT = domain_failed|domain_recovery_requested|domain_recovery_started
TENANT_VISIBILITY = safe failure code and permitted action
SUPER_ADMIN_VISIBILITY = sanitized diagnostics; tenant recovery requires impersonation
```

### 6.12 `revoked`

```text
VALID_PREDECESSORS = removal_pending, failed through revoke_failed_domain only
VALID_SUCCESSORS = none
AUTHORIZED_COMMAND = finalize_domain_revocation
AUTHORITY = server after cleanup proof
PERSISTED_EFFECT = immutable tombstone and cooldown metadata
GENERATION_EFFECT = terminal generation
PUBLIC_AUTHORITY = false
SUCCESS = all public/provider authority removed and cooldown recorded
RECOVERABLE_ERRORS = none after commit
TERMINAL_ERRORS = none; this state is terminal
RETRY = prohibited
ROLLBACK = prohibited; reuse requires a new request after cooldown and anti-takeover checks
AUDIT_EVENT = domain_revoked
TENANT_VISIBILITY = revoked state and cooldown policy
SUPER_ADMIN_VISIBILITY = immutable audit metadata
```

## 7. Active predicate

A candidate may become `active` only when all evidence belongs to the same current generation:

```text
normalized_hostname_valid = true
global_hostname_reservation_valid = true
ownership_verified = true
required_dns_observed = true
provider_binding_confirmed = true
ssl_status = active
canonical_or_alias_binding_valid = true
enabled = true
last_reconciliation_current_generation_success = true
```

DNS success alone, provider API success alone, local configuration state alone or certificate issuance alone never activates a domain.

## 8. Replacement authority

```text
INCUMBENT_DOMAIN = current active canonical row and generation
CANDIDATE_DOMAIN = new linked generation created in replacement_pending
INCUMBENT_PUBLIC_AUTHORITY_DURING_REPLACEMENT = preserved
CANDIDATE_PUBLIC_AUTHORITY_BEFORE_ATOMIC_SWAP = false
POST_SWAP_DIRECT_REACTIVATION = prohibited
ROLLBACK_BOUNDARY = transaction abort before commit only
POST_COMMIT_RECOVERY = new explicit replacement generation
```

The incumbent remains `active` while the candidate progresses through ownership, DNS, provider and SSL states. Candidate failure never mutates or degrades the incumbent.

The final swap is one server-owned transaction that:

1. revalidates both rows and expected lock versions;
2. proves the candidate active predicate;
3. moves canonical and same-tenant alias authority to the candidate;
4. transitions the candidate from `pending_ssl` to `active`;
5. transitions the incumbent to `removal_pending` and closes its public authority;
6. updates `tenants.dominio_principal` as a compatibility projection;
7. appends correlated audit events;
8. fails entirely on any constraint or evidence mismatch.

Before commit, any mismatch aborts the entire transaction and leaves the incumbent active and unchanged. After commit, the former incumbent remains in `removal_pending` and cannot be reactivated directly. Any later recovery must create a new candidate generation and repeat ownership, DNS, provider, SSL and reconciliation verification before a new atomic swap.

## 9. Hybrid execution contract

### 9.1 `manual_assisted`

- The server generates exact instructions.
- A tenant or authorized operator performs the external action.
- The client may request recheck but may not assert success.
- DNS/provider state is independently observed server-side.
- Human-entered provider identifiers are non-authoritative hints and are never persisted until independently resolved and matched.

### 9.2 `api_automated`

- The server selects the provider account and zone through platform policy.
- Adapter inputs are canonical and server-owned.
- Every provider mutation uses a deterministic idempotency key.
- Retries are bounded and remain attached to the same command and generation.
- Provider output is sanitized before storage or logging.

### 9.3 Mode changes

Mode selection is explicit, versioned and audited. A mode change is an authorized command and creates a new operation plan or generation when required. API timeout, failure, rate limit or provider outage never causes silent fallback to `manual_assisted`.

## 10. Import and cutover contract

### 10.1 Legacy import

Every non-null `tenants.dominio_principal` value must be normalized and preflighted before mutation. Invalid, duplicate or ambiguous values stop the operation fail-closed.

A valid legacy value is imported as:

```text
status = pending_ownership_verification
metadata.import_source = tenants.dominio_principal
metadata.imported_at = server timestamp
metadata.imported_from_legacy_authority = true
```

No imported row is marked `active` without current-generation ownership, DNS, provider, SSL, canonical and reconciliation evidence.

### 10.2 Ordered cutover

The cutover is separated into:

1. migration and fail-closed backfill;
2. independent verification of every incumbent hostname that must remain available;
3. materialization and testing of one active-domain read boundary;
4. global preflight;
5. explicit cutover authorization command;
6. atomic deployment activation of the new resolver without fallback;
7. removal of `tenants.dominio_principal` as primary authority;
8. continued maintenance of that field only as a projection.

```text
CUTOVER_COMMAND = activate_authoritative_domain_resolution
CUTOVER_AUTHORITY = global platform operation
CUTOVER_FAILS_CLOSED = true
PER_REQUEST_DUAL_QUERY = false
SILENT_FALLBACK = false
```

The command may succeed only when every incumbent hostname that must remain public satisfies:

```text
normalized_hostname_valid = true
global_uniqueness = true
current_generation_ownership_verified = true
dns_evidence_current = true
provider_binding_current = true
ssl_status_active = true
canonical_or_alias_binding_valid = true
reconciliation_current_generation_success = true
```

If any incumbent fails:

```text
CUTOVER_EXECUTED = false
OLD_AUTHORITY_REMAINS_UNCHANGED = true
CUTOVER_STATE = Blocked External or explicit failed preflight
```

The release must contain one resolver path only. It must never query both `tenant_domains` and `tenants.dominio_principal`, never fall back by request and never select a first row. The previous deployed release remains authoritative until the new exact release is activated; a failed deployment leaves the previous release unchanged.

## 11. Production versus development resolution

```text
PRODUCTION_CUSTOM_DOMAIN_RESOLUTION = tenant_domains active-domain boundary only
PRODUCTION_DOMAIN_TO_SLUG_FALLBACK = prohibited
TENANT_DEFAULT_FALLBACK = prohibited
PUBLIC_TENANT_DEV_HOST_MAP = development-only explicit authority
DEVELOPMENT_HOST_MAP_IN_PRODUCTION = prohibited
DEVELOPMENT_MAP_COUNTS_AS_PRODUCTION_FALLBACK = false
```

The explicit development/preview host map remains available only after server-side environment classification. A production hostname may never resolve through slug, development mapping or client configuration.

## 12. Redirect contract

Canonical redirects are evaluated in `src/server.ts` before SSR rendering and only after server-owned host normalization.

Requirements:

- source alias and target canonical row are active, same-tenant and same-generation;
- exact cardinality is one;
- HTTPS is mandatory;
- path and query are preserved through URL parsing, not string concatenation;
- redirect is single-hop;
- redirect loops and cross-tenant redirects are rejected;
- ambiguous or invalid aliases fail closed;
- redirect status is `308` for stable active bindings and no redirect is emitted for non-active state.

## 13. Scheduled execution and reconciliation

The repository-owned executor is `src/server.ts::scheduled` using Cloudflare platform-native scheduled authority. It does not expose a public HTTP trigger.

```text
AUTHENTICATION = platform-native scheduled authority
AUTH_FAILURE = fail-closed
TENANT_INPUT_AUTHORITY = false
LEASE_REQUIRED = true
IDEMPOTENCY_REQUIRED = true
CONCURRENCY_CONTROL = true
RETRY_LIMIT = explicit per operation taxonomy
TERMINAL_RESULT = explicit and persisted
```

The handler may lease and execute only due persisted jobs, must release or expire leases deterministically and must append sanitized attempt and audit records. External Cron configuration remains a separately authorized operation.

Periodic reconciliation detects DNS drift, dangling DNS, orphaned provider objects, SSL regression, stale challenge material and public-resolution mismatch. It never silently changes execution mode or reopens `failed`.

## 14. Anti-takeover controls

- reservation begins before challenge issuance;
- challenge is temporary, generation-bound, rotatable and anti-replay;
- provider cleanup precedes hostname release;
- removed/replaced hostnames remain tombstoned for cooldown;
- dangling DNS and orphaned custom hostnames are reconciled;
- hostname reuse requires a new ownership proof after cooldown;
- aliases are same-tenant, explicit and single-hop;
- public suffix, wildcard, IP, localhost and reserved names are rejected.

## 15. Secret boundary

```text
PLAINTEXT_PROVIDER_SECRET_IN_DATABASE = prohibited
TENANT_CONFIGURATION_SECRET = prohibited
CLIENT_CREDENTIAL_REFERENCE_VISIBILITY = prohibited
REAL_CREDENTIAL_IN_CI = prohibited
LOG_SECRET_EXPOSURE = prohibited
```

`domain_provider_accounts.credential_reference` is an opaque server-side locator only. The adapter resolves it through the deployment secret facility at execution time. The reference is redacted from tenant DTOs, browser payloads, ordinary logs and public diagnostics.

## 16. Deterministic test obligations

The future implementation must cover at minimum:

1. hostname normalization and IDNA;
2. public-suffix and reserved-domain rejection;
3. complete enum and explicitly enumerated predecessors;
4. absence of persisted states outside the enum;
5. tenant authority and Super Admin impersonation;
6. challenge expiry, rotation, replay prevention and proof that rotation is status-preserving rather than a self-transition;
7. global hostname uniqueness and canonical uniqueness;
8. valid legacy import into `pending_ownership_verification`;
9. cutover blocked by any unready incumbent;
10. preservation of old authority when preflight fails;
11. cutover without dual query or fallback;
12. incumbent authority during replacement;
13. candidate failure without incumbent mutation;
14. atomic canonical and alias swap, transaction abort before commit and prohibition of post-commit incumbent reactivation;
15. direct `degraded → active` restoration only with the complete current-generation active predicate;
16. provider errors, retry, lease and idempotency;
17. removal, cooldown and orphan cleanup;
18. active-domain public resolver cardinality;
19. canonical redirect, loop prevention and same-tenant enforcement;
20. scheduled handler fail-closed behavior;
21. development map isolation from production;
22. secret and credential-reference redaction;
23. `FILES_ALLOWED` completeness;
24. operator and credential-incident runbook presence;
25. migration cutover without request-time dual path.

## 17. External proof gate

Terminal DCA-01 acceptance requires a separately authorized controlled proof using:

- a non-production test domain;
- Same-Backend Homologation Cell;
- server-held temporary credentials where API mode is tested;
- evidence for ownership, DNS, provider binding, SSL, canonical redirect, reconciliation and cleanup;
- credential and log redaction review;
- explicit teardown and orphan check.

The planning PR and its correction do not authorize this proof.

## 18. Risk and rollback

Material risks are domain takeover, cross-tenant resolution, authority ambiguity, certificate regression, provider drift, stale challenge reuse, secret leakage and cutover outage.

Controls are global uniqueness, closed transitions, current-generation composite evidence, explicit impersonation, opaque credential references, deterministic jobs, periodic reconciliation, atomic candidate/incumbent swap and fail-closed global cutover.

Repository rollback may revert unmerged code and migration artifacts. A replacement swap may only be rolled back by aborting its transaction before commit. Once committed, recovery is compensating and generation-creating: the former incumbent cannot transition directly from `removal_pending` to `active`.

Once external provider or DNS mutation is separately authorized, rollback must be compensating and audit-preserving rather than destructive.

## 19. Planning conclusion

This corrected planning closes the previously identified gaps:

- no undefined imported status;
- no open predecessor expressions;
- direct `degraded → active` recovery is symmetric and requires the complete active predicate;
- challenge issuance, rotation and inconclusive observations preserve status without a persisted self-transition;
- replacement rollback is limited to transaction abort before commit, and post-commit recovery requires a new generation;
- incumbent and replacement candidate are distinct;
- cutover requires all incumbents ready and preserves old authority on failure;
- `src/server.ts` is the exact redirect and scheduled-executor boundary;
- runbooks are mandatory implementation deliverables;
- production resolution and the development host map are explicitly separated.

```text
DCA01_PLANNING_STATE = Ready for Direct External Re-Audit
DCA01_ARCHITECTURE_FIRST_COMPLETE = submitted_for_re_audit
DCA01_PLANNING_MERGE_READY = false
DCA01_PLANNING_MERGE_AUTHORIZED = false
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```
