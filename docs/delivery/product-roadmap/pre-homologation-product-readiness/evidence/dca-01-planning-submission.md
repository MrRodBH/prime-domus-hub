# DCA-01 — Architecture First Planning Submission

## Submission status

**Ready for Direct External Audit**

```text
STAGE_ID = DCA-01
STAGE_NAME = Domain & Cloudflare Activation
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
AUDITED_MAIN_HEAD = fad8874bfeef85683445f52d21611e7d8760c1a0
PLANNING_BRANCH = agent/dca-01-planning
EXECUTOR = ChatGPT GitHub-native
LOVABLE_USED = false
PLANNING_AUTHORIZED = true
IMPLEMENTATION_AUTHORIZED = false
PLANNING_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

## 1. Entry-gate result

```text
EXPECTED_MAIN_HEAD_MATCH = true
PRM2_STATE = Accepted / Merged / Closed
DCA01_PREVIOUS_STATE = Planned — Blocked pending explicit authorization
DCA01_IMPLEMENTATION_ALREADY_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
CONCURRENT_DCA01_BRANCH_FOUND = false
CONCURRENT_DCA01_PR_FOUND = false
```

The planning authorization changed only the DCA-01 planning gate. It did not authorize implementation or any external operation.

## 2. Direct repository evidence inspected

### Runtime and public tenant resolution

- `src/lib/tenant.server.ts`
- `src/lib/api/site.functions.ts`
- `src/server.ts`

Confirmed:

- request `Host` is server-owned input;
- normalization lowercases and removes one trailing dot;
- URL-shaped/malformed host input is rejected;
- explicit development-host mapping is configuration-bound and fails closed;
- production host resolution queries `tenants.dominio_principal` with maximum cardinality two;
- exactly one row is required;
- public site configuration uses the resolved tenant and no default tenant fallback.

### Configuration and future gates

- `src/lib/api/configuration-registry.ts`
- `src/lib/api/tenant-configuration.functions.ts`
- `supabase/migrations/20260728233000_pr_m2_configuration_center.sql`

Confirmed:

- `domain_activation_state` is a system-owned, non-public future gate;
- only `pending_DCA01` is currently valid;
- `cloudflare_mode` is a system-owned, non-public future gate;
- only `HYBRID_pending_DCA01` is currently valid;
- SQL rejects secret-shaped configuration keys;
- configuration diagnostics explicitly report DCA-01 as pending;
- configuration versioning, validation, publish, rollback and optimistic concurrency patterns are reusable.

### Platform operations and Product Owner authority

- `src/lib/super-admin/platform-operations-registry.ts`
- `docs/architecture/governance/PR-M2-product-owner-execution-decisions.md`
- `docs/architecture/ROADMAP_ARCHITECTURAL.md`
- `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`

Confirmed:

- `domain_visibility` is a global external gate blocked by DCA-01;
- external success is not implied by local state;
- tenant-scoped Super Admin access remains impersonation-bound;
- `DOMAINS_AND_CLOUDFLARE = HYBRID` is binding;
- DCA-01 precedes BCA-01 and PR-M3.

### Public surface and security history

The accepted Public Surface Security Gate established:

- Host/tenant binding;
- exact-cardinality public reads;
- fail-closed public authority;
- server-before-DTO public content security;
- preservation of tenant and public writer boundaries.

DCA-01 extends that foundation; it does not reopen or replace PSG-01.

## 3. Factual inventory classification

### Already materialized

```text
request Host normalization
exact public tenant cardinality
fail-closed public tenant requirement
explicit development host map
single compatibility domain field on tenants
configuration future-gate placeholders
Super Admin domain visibility placeholder
audit/version/retry patterns in adjacent capabilities
```

### Reusable without change

```text
requireTenant
explicit impersonation
server-only service-role boundary
PublicTenantResolutionError
configuration optimistic concurrency
exact-head Release Gate
external success not implied by local state
Same-Backend Homologation Cell
```

### Requires extension

```text
production hostname normalization with IDNA/public suffix validation
public resolution through active domain binding
configuration projections from DCA authority
Super Admin domain diagnostics
canonical URL generation
```

### Requires a new boundary

```text
tenant domain aggregate
ownership challenge lifecycle
provider account credential references
provider binding aggregate
operation jobs and attempts
domain audit events
Cloudflare adapter port
DNS observation port
periodic reconciliation
closed state machine
canonical/alias redirect model
```

### Requires external execution

```text
DNS/TXT/CNAME observation
Cloudflare account and zone lookup
custom hostname lifecycle
SSL observation
controlled non-production test-domain activation and rollback
```

### Out of scope

```text
BCA-01
PR-M3 visual refinement
production deployment
unrelated runtime redesign
managed Cloudflare infrastructure outside custom-domain activation
```

## 4. Principal architectural decisions

```text
DOMAIN_INTEGRATION_MODEL = HYBRID
CLOUDFLARE_INTEGRATION_MODEL = HYBRID
SUPPORTED_EXECUTION_MODES = manual_assisted, api_automated
MODE_SELECTION = explicit and authorized
SILENT_FALLBACK = prohibited
SERVER_DOMAIN_AUTHORITY = true
CLIENT_DOMAIN_AUTHORITY = false
ACTIVE_STATUS_REQUIRES_COMPOSITE_EVIDENCE = true
TENANTS_DOMINIO_PRINCIPAL_WRITE_AUTHORITY = retired during implementation cutover
PUBLIC_RESOLUTION_DUAL_PATH = prohibited
```

The active predicate requires current-generation ownership, DNS, provider binding, SSL, canonical uniqueness, enabled state and reconciliation freshness. No individual provider or DNS response activates a domain.

## 5. Planned state machine

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

Transitions are centralized, versioned, audited and constrained in server code and SQL. UI, workers and adapters cannot write state directly.

## 6. Planned anti-takeover controls

- IDNA ToASCII normalization;
- public-suffix validation;
- global normalized-hostname reservation;
- explicit apex/`www` aliasing;
- no wildcard activation;
- expiring and rotatable challenge generations;
- replay prevention;
- independent DNS/provider observation;
- active generation atomicity;
- provider cleanup before reservation release;
- tombstone/cooldown before reuse;
- orphan/dangling DNS reconciliation;
- public resolution closed on removal.

## 7. Secret boundary

```text
PLAINTEXT_CLOUDFLARE_SECRET_IN_DATABASE = prohibited
TENANT_CONFIGURATION_SECRET = prohibited
CLIENT_CREDENTIAL_REFERENCE_VISIBILITY = prohibited
REAL_CREDENTIAL_IN_CI = prohibited
CREDENTIAL_MODEL = opaque server-side reference
```

This planning does not choose, create or use a real credential.

## 8. Planning artifacts

```text
docs/architecture/impact-analysis/DCA-01-domain-cloudflare-activation-impact-analysis.md
docs/architecture/governance/DCA-01-domain-cloudflare-activation-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-planning-submission.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

No other path belongs to the planning commit.

## 9. Scope integrity

```text
PLANNING_DOCUMENTS_CHANGED = 5
RUNTIME_FILES_CHANGED = 0
FRONTEND_FILES_CHANGED = 0
MIGRATIONS_CHANGED = 0
RLS_CHANGED = 0
GRANTS_CHANGED = 0
WORKFLOWS_CHANGED = 0
DEPENDENCIES_CHANGED = 0
LOCKFILE_CHANGED = 0
GENERATED_ROUTE_CHANGED = 0
CLOUDFLARE_CONFIGURATION_CHANGED = 0
SECRETS_CHANGED = 0
```

## 10. External operations not executed

```text
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
TXT_RECORD_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
REAL_SECRET_USED = false
LIVE_DOMAIN_VERIFIED = false
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
```

## 11. Validation requirements for this PR

```text
bun install --frozen-lockfile
bun run verify:release
git diff --check
EXACT_HEAD_RELEASE_GATE = required
FULL_DIFF_REVIEW = required
FILES_OUTSIDE_ALLOWED = 0
```

The PR remains draft. Ready-for-review transition and merge require a later direct external audit and explicit authorization.

## 12. Maximum state reached

```text
DCA01_PLANNING_STATE = Ready for Direct External Audit
DCA01_IMPLEMENTATION_STATE = Planned — Blocked
DCA01_IMPLEMENTATION_AUTHORIZED = false
DCA01_PLANNING_MERGE_AUTHORIZED = false
DCA01_IMPLEMENTATION_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```
