# DCA-01 — Consolidated Planning Correction Submission

## Status

**Ready for Direct External Re-Audit**

```text
STAGE_ID = DCA-01
SUBMISSION_TYPE = consolidated planning correction
EXECUTION_MODEL = GitHub-native
MAIN_BASELINE = fad8874bfeef85683445f52d21611e7d8760c1a0
REJECTED_PLANNING_HEAD_HISTORICAL = b6974aaccc11fbc4118a2af8c15320e2e665233e
PLANNING_BRANCH = agent/dca-01-planning
PLANNING_PR = 64
FINAL_EXTERNAL_PLANNING_AUDIT_AT_REJECTED_HEAD = Rejected
CORRECTIVE_BUDGET = consumed by this consolidated correction
PLANNING_MERGE_AUTHORIZED = false
IMPLEMENTATION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

The rejected HEAD remains immutable historical evidence. This correction supersedes its planning authority without restoring any rejected statement as operative authority.

## 1. Authorized scope

This execution changes exactly five planning documents:

```text
docs/architecture/impact-analysis/DCA-01-domain-cloudflare-activation-impact-analysis.md
docs/architecture/governance/DCA-01-domain-cloudflare-activation-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-planning-submission.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

No file is created outside this list. No runtime, frontend, migration, RLS, policy, grant, RPC, job, queue, workflow, dependency, lockfile, generated route, deploy configuration, Cloudflare configuration or secret is changed by this planning correction.

## 2. Entry gate carried into the correction

Before mutation, direct GitHub verification confirmed:

```text
MAIN_HEAD = fad8874bfeef85683445f52d21611e7d8760c1a0
PR64_STATE = open
PR64_DRAFT = true
PR64_MERGED = false
PR64_MERGEABLE = true
PR64_HEAD = b6974aaccc11fbc4118a2af8c15320e2e665233e
PR64_COMMIT_COUNT = 1
MERGE_BASE = fad8874bfeef85683445f52d21611e7d8760c1a0
AHEAD_BY = 1
BEHIND_BY = 0
UNRESOLVED_REVIEW_THREADS = 0
FILES_OUTSIDE_ORIGINAL_PLANNING_SCOPE = 0
```

No competing main commit, review-thread blocker, implementation or external DCA operation was present.

## 3. Rejected findings consolidated

The direct external audit rejected the previous planning authority for eight material reasons:

1. an undefined “explicit imported state” existed outside the persisted enum;
2. cutover did not guarantee continuity for every incumbent public hostname;
3. replacement conflated the active incumbent with the candidate generation;
4. predecessor expressions were open rather than explicitly enumerable;
5. `FILES_ALLOWED` omitted deliverables already required by the Definition of Done;
6. canonical redirect had no request-level consumer;
7. periodic reconciliation had no repository-owned executable entrypoint;
8. production resolution and the explicit development-host map were not separated precisely enough.

The exact-head artifacts, scope integrity and baseline facts of the rejected submission were valid; the rejection was architectural and documentary.

## 4. Consolidated corrections

### 4.1 Closed state machine

The corrected Impact Analysis keeps exactly these statuses:

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

For each status it now defines:

- explicit predecessors and successors;
- authorized command and authority;
- persisted effect and generation behavior;
- public-authority behavior;
- success, recoverable error and terminal error;
- retry and rollback;
- audit event;
- tenant and Super Admin visibility.

Open expressions such as “draft through degraded” and “any non-terminal processing state” are removed.

```text
TERMINAL_STATES = revoked
PUBLICLY_AUTHORITATIVE_STATES = active
FAILED_IMPLICIT_REOPEN = prohibited
FAILED_EXPLICIT_RECOVERY_COMMAND = required
```

### 4.2 Canonical legacy import

Valid legacy hostnames are imported only as:

```text
status = pending_ownership_verification
metadata.import_source = tenants.dominio_principal
metadata.imported_at = server timestamp
metadata.imported_from_legacy_authority = true
```

No imported record becomes `active` without current-generation ownership, DNS, provider, SSL, canonical/alias and reconciliation evidence.

### 4.3 Fail-closed cutover

The corrected planning defines:

```text
CUTOVER_COMMAND = activate_authoritative_domain_resolution
CUTOVER_AUTHORITY = global platform operation
CUTOVER_FAILS_CLOSED = true
REQUEST_TIME_DUAL_QUERY = false
SILENT_FALLBACK = false
```

Every incumbent hostname required for continuity must pass the full active predicate before cutover. If one fails, cutover does not execute and the old deployed authority remains unchanged.

The new release contains only the `tenant_domains` active-domain production resolver. `tenants.dominio_principal` becomes a compatibility projection after cutover and is never a fallback.

### 4.4 Incumbent/candidate replacement

The active incumbent and replacement candidate are now separate rows/generations:

```text
INCUMBENT = remains active during candidate preparation
CANDIDATE = created in replacement_pending
CANDIDATE_PUBLIC_AUTHORITY_BEFORE_SWAP = false
```

Candidate failure leaves the incumbent unchanged. Final canonical and alias authority changes in one transaction together with candidate activation, incumbent removal-pending transition, projection update and correlated audit events.

### 4.5 Complete implementation file envelope

The corrected `FILES_ALLOWED` now includes:

- `src/server.ts` for canonical redirect before SSR;
- `src/server.ts::scheduled` as the platform-native scheduled executor;
- one exact migration path;
- the domain, API, UI and deterministic-test files;
- both mandatory runbooks:
  - `docs/operations/DCA-01-domain-activation-operator-runbook.md`;
  - `docs/operations/DCA-01-cloudflare-credential-incident-runbook.md`.

Known Definition of Done deliverables no longer depend on a future preflight amendment.

### 4.6 Production/development boundary

```text
PRODUCTION_CUSTOM_DOMAIN_RESOLUTION = tenant_domains active-domain boundary only
PRODUCTION_DOMAIN_TO_SLUG_FALLBACK = prohibited
PUBLIC_TENANT_DEV_HOST_MAP = development-only explicit authority
DEVELOPMENT_HOST_MAP_IN_PRODUCTION = prohibited
DEVELOPMENT_MAP_COUNTS_AS_PRODUCTION_FALLBACK = false
```

The existing explicit development/preview map is preserved but cannot resolve production custom domains.

### 4.7 Tests and operational evidence

The corrected envelope requires deterministic proof for:

- enum and transition closure;
- import state;
- incumbent continuity and candidate isolation;
- global cutover preflight;
- absence of request-time dual query;
- redirect integration and loop prevention;
- scheduled execution, lease, idempotency and concurrency;
- production/development separation;
- secret redaction;
- runbook and `FILES_ALLOWED` completeness.

A controlled external proof remains mandatory before terminal DCA-01 acceptance, but remains separately unauthorized.

## 5. Binding invariants preserved

```text
DOMAIN_AND_CLOUDFLARE_INTEGRATION_MODEL = HYBRID
SUPPORTED_MODES = manual_assisted, api_automated
SERVER_IS_DOMAIN_AUTHORITY = true
CLIENT_IS_DOMAIN_AUTHORITY = false
SERVER_IS_CLOUDFLARE_ACCOUNT_AUTHORITY = true
FAIL_CLOSED_ON_AMBIGUITY = true
HEURISTIC_FALLBACK = prohibited
SILENT_MODE_FALLBACK = prohibited
SUPER_ADMIN_TENANT_MUTATION_REQUIRES_IMPERSONATION = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
```

## 6. Explicit non-execution evidence

```text
RUNTIME_CHANGED = false
FRONTEND_CHANGED = false
MIGRATION_CREATED_OR_EXECUTED = false
RLS_CHANGED = false
GRANTS_CHANGED = false
WORKFLOW_CHANGED = false
DEPENDENCY_CHANGED = false
CLOUDFLARE_CONFIGURATION_CHANGED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
EXTERNAL_PROOF_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

## 7. State submitted for re-audit

```text
DCA01_PLANNING_STATE = Ready for Direct External Re-Audit
DCA01_IMPLEMENTATION_STATE = Planned — Blocked
DCA01_PLANNING_MERGE_READY = false
DCA01_PLANNING_MERGE_AUTHORIZED = false
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
PR64_DRAFT = true
PR64_MERGED = false
NEXT_STAGE_AUTHORIZED = none
```

The only recommended next instruction is a direct, read-only, exact-head external re-audit of PR #64. Acceptance would make a separate protected planning-merge instruction authorizable; it would not itself authorize merge or implementation.
