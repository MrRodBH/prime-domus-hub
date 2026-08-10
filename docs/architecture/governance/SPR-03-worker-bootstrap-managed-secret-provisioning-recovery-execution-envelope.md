# SPR-03 — Worker Bootstrap & Managed Secret Provisioning Recovery Execution Envelope

**Status:** Planning — Ready for Direct GitHub Audit
**Stage:** SPR-03
**Planning baseline:** `main@b430b6cb5033cec66902031394b7cb4406206c81`
**Selected strategy:** Strategy D — Controlled Bootstrap Deployment with Zero Ingress
**Residue strategy:** R2 — Forward Historical Parity Materialization
**Implementation authorized by this envelope:** false

## 1. Purpose

This envelope freezes the finite implementation contract for SPR-03 after direct audit rejected the SPR-02 principal implementation and after current Cloudflare documentation disproved the former zero-deployment-from-resource-birth assumption.

SPR-03 must establish a first canonical Worker resource safely, preserve secret custody, restore repository/database migration-history parity, and create an inactive final secret-bearing Worker Version without starting DCA-01 external proof.

This planning execution itself is documentation-only and performs no runtime, database or provider mutation.

## 2. Predecessor terminal state

```text
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_IMPLEMENTATION_STATE = Rejected
SPR01_IMPLEMENTATION_PROMPT_BUDGET = 2/2 consumed
SPR01_THIRD_IMPLEMENTATION_PROMPT = prohibited

SPR02_PLANNING_STATE = Accepted / Merged / Closed
SPR02_IMPLEMENTATION_STATE = Rejected
SPR02_PRINCIPAL_IMPLEMENTATION_AUDIT = Rejected
SPR02_IMPLEMENTATION_PRINCIPAL_PROMPT = consumed
SPR02_IMPLEMENTATION_PROMPT_BUDGET = 1/2 consumed
SPR02_CONSOLIDATED_CORRECTIVE = unused
SPR02_CONSOLIDATED_CORRECTIVE_AUTHORIZED = false
SPR02_CAPABILITY_MISMATCH_EXCEPTION = not_applicable
SPR02_GITHUB_IMPLEMENTATION_PR = none
SPR02_CLOUDFLARE_MUTATIONS = 0
SPR02_SUPABASE_MUTATION_OCCURRED = true
SPR02_APPLIED_MIGRATION_RECORD_COUNT = 2
SPR02_TARGET_WORKER_EXISTS = false

DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

SPR-02 must not be reopened and its unused corrective budget must not be repurposed as SPR-03 implementation authority.

## 3. Architecture frozen for future implementation

```text
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_SELECTED_PRIMITIVE = controlled first Wrangler deployment with zero ingress, then version-only canary and final secret-bearing inactive version
SPR03_RESIDUE_STRATEGY = R2
TARGET_WORKER = rm-prime-wri01-hml
APPLICATION_RUNTIME_AUTHORITY = existing TanStack Start / Nitro runtime
BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
DEPLOY_AUTHORITY = versioned wrangler.jsonc only
SECOND_APPLICATION_RUNTIME = prohibited
SECOND_DEPLOY_AUTHORITY = prohibited
NEW_SUPABASE_EDGE_FUNCTION = prohibited
EXTERNAL_SUPABASE_FALLBACK = prohibited
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
```

## 4. Capability gate required before principal implementation

Before implementation authorization, read-only inspection must prove all applicable capabilities in the exact current project/provider state:

```text
CAPABILITY_TARGET_WORKER_STATE_RESOLVED = true
CAPABILITY_ACCOUNT_AUTHORITY_RESOLVED = true
CAPABILITY_FIRST_WORKER_DEPLOY = true
CAPABILITY_WORKERS_DEV_DISABLE = true
CAPABILITY_PREVIEW_URL_DISABLE = true
CAPABILITY_ZERO_CUSTOM_ROUTES = true
CAPABILITY_ZERO_CRON = true
CAPABILITY_SUBSEQUENT_VERSION_ONLY_UPLOAD = true
CAPABILITY_SECRET_BINDING_IN_VERSION_UPLOAD = true
CAPABILITY_ACTIVE_DEPLOYMENT_OBSERVATION = true
CAPABILITY_VERSION_BINDING_OBSERVATION = true
CAPABILITY_TEMP_PROVISIONER_SERVER_ACCESS = true if server-side secret transfer is retained
CAPABILITY_SECOND_RUNTIME_OR_DEPLOY_AUTHORITY = false
```

Unknown capability is not evidence. The principal implementation cannot start until this gate is Accepted.

## 5. Future implementation budget

SPR-03 is a new finite stage.

```text
SPR03_IMPLEMENTATION_PRINCIPAL_PROMPT = available
SPR03_IMPLEMENTATION_CONSOLIDATED_CORRECTIVE_PROMPT = available
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
SPR03_THIRD_IMPLEMENTATION_PROMPT = prohibited
```

Read-only audits do not consume the budget. Runtime/config/database/provider mutations performed as implementation do consume the applicable principal or corrective execution.

The `CAPABILITY_MISMATCH_EXCEPTION` remains governed by `CAPABILITY_PREFLIGHT_AND_CI_SCOPE_GOVERNANCE_AMENDMENT.md` and may not be used when repository or provider/database mutations have occurred.

## 6. Future implementation branch and PR contract

Frozen future branch:

```text
agent/spr-03-worker-bootstrap-managed-secret-recovery
```

Future implementation must use:

```text
BASE = audited current main at implementation start
PR_COUNT = exactly one principal implementation PR
PR_DRAFT = true initially
AUTO_MERGE = false
MERGE_METHOD = protected squash only after direct exact-head audit
```

No implementation branch or PR is created by this planning envelope.

## 7. FILES_ALLOWED for the future principal implementation

The principal implementation may modify only the exact classes below. Exact paths must be reconfirmed at the capability gate against the then-current `main`.

```text
wrangler.jsonc
run-spr-03-worker-bootstrap-managed-secret-recovery-specs.ts
package.json                              # test script registration only; no dependency changes
src/lib/spr-03/**                         # only if server-side version provisioning remains selected
src/routes/api/internal/spr-03-*.ts       # only if required by capability-gate result
src/routeTree.gen.ts                      # generated by official TanStack tooling only; no unrelated drift
supabase/migrations/20260810220152_1ee179b2-60f0-4ce1-b259-06762002733b.sql
supabase/migrations/20260810220939_b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b.sql
docs/architecture/impact-analysis/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-impact-analysis.md
docs/architecture/governance/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-execution-envelope.md
docs/operations/SPR-03-worker-bootstrap-managed-secret-recovery-runbook.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/spr-03-worker-bootstrap-managed-secret-recovery-execution.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

The two historical migration paths are parity artifacts only. They must represent already-applied history and must not be reapplied to the database.

If exact database history does not match the frozen versions/names/SQL effects, implementation must stop before creating those files.

## 8. FILES_PROHIBITED for the future principal implementation

Unless a new Impact Analysis explicitly supersedes this envelope:

```text
supabase/functions/**
supabase/config.toml
any new database migration beyond the two exact historical parity files
historical migrations unrelated to SPR-02 residue
src/integrations/supabase/**
.env*
bun.lock
.github/**
wrangler files other than canonical wrangler.jsonc
DCA-01 runtime/domain state machine files
tenant middleware
impersonation architecture
billing/commercial runtime
CMS/CRM/portal/storage runtime
production configuration
plaintext secret files
```

No dependency version change is permitted.

`src/routeTree.gen.ts` may change only as mechanical output for a newly authorized SPR-03 route. Any unrelated generated drift fails the implementation.

## 9. Supabase residue parity contract

Before any new SPR-03 database mutation could ever be considered, the implementation must perform a read-only live audit of:

```text
public.spr02_managed_secret_ceremonies
supabase_migrations.schema_migrations
```

Expected historical facts:

```text
APPLIED_VERSION_1 = 20260810220152
APPLIED_NAME_1 = 1ee179b2-60f0-4ce1-b259-06762002733b
APPLIED_VERSION_2 = 20260810220939
APPLIED_NAME_2 = b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b
TABLE_RLS = enabled
CLIENT_POLICIES = 0
ANON_TABLE_GRANT = none
AUTHENTICATED_TABLE_GRANT = none
SECRET_BEARING_COLUMNS = 0
```

Parity implementation rules:

1. never mutate `supabase_migrations.schema_migrations` manually;
2. never delete or rename applied history;
3. never claim that one migration ran when two ran;
4. materialize the exact two historical migration files only after read-only proof;
5. prove normal migration tooling recognizes those versions as already applied and schedules zero replay;
6. perform no new database mutation in the parity step;
7. reuse `public.spr02_managed_secret_ceremonies` only after live schema/RLS/grant revalidation.

If repository parity cannot be restored without database-history mutation, fail closed and return for architecture review.

## 10. Bootstrap-safe Wrangler contract

The current pre-SPR-03 configuration is not bootstrap-safe because it contains `workers_dev: true` and a Cron trigger.

Before the first remote deploy, the implementation must make the **single canonical `wrangler.jsonc`** represent this exact external activation state:

```text
name = rm-prime-wri01-hml
main = dist/server/index.mjs
workers_dev = false
preview_urls = false
routes = []
triggers.crons = []
```

Existing build/runtime settings required by WRI-01 must be preserved unless this envelope explicitly permits their activation-only change.

No temporary second Wrangler file, no alternate deploy script and no second deploy authority may be introduced.

The bootstrap-safe configuration remains canonical after SPR-03. Re-enabling `workers.dev`, Preview URLs, routes or Cron belongs to a later separately authorized external-proof stage.

## 11. Exact first-deployment contract

The first Cloudflare mutation in SPR-03, if implementation is later authorized, is exactly one controlled Worker creation/deployment.

Preconditions immediately before mutation:

```text
TARGET_WORKER_EXISTS = false
ACCOUNT_CARDINALITY = exactly 1 authoritative account
PUBLIC_WORKER_ROUTES = 0
CUSTOM_DOMAINS = 0
CUSTOM_HOSTNAMES = 0
FALLBACK_ORIGIN = absent
CURRENT_CRON_COUNT = 0 or target absent
CURRENT_WORKERS_DEV_INGRESS = absent because target absent
CURRENT_PREVIEW_INGRESS = absent because target absent
BOOTSTRAP_CONFIG_AUDITED = true
BOOTSTRAP_ARTIFACT_AUDITED = true
BOOTSTRAP_SECRET_BINDING_COUNT = 0
```

Mutation:

```text
FIRST_DEPLOY_REQUEST_COUNT = exactly 1
TARGET_WORKER = rm-prime-wri01-hml
DEPLOYED_SOURCE = exact audited WRI-01-compatible artifact
SECRET_BINDINGS = 0
```

Required immediate postcondition:

```text
TARGET_WORKER_EXISTS = true
DEPLOYMENT_COUNT = exactly 1
ACTIVE_DEPLOYMENT_SECRET_BINDING_COUNT = 0
WORKERS_DEV_ENABLED = false
PREVIEW_URLS_ENABLED = false
CUSTOM_ROUTE_COUNT = 0
CUSTOM_DOMAIN_COUNT = 0
CRON_COUNT = 0
PUBLIC_HTTP_INGRESS = 0
SCHEDULED_INGRESS = 0
```

Any ambiguity or additional deployment fails the stage closed. No blind retry is allowed after an ambiguous provider response; reconcile read-only first.

## 12. Synthetic inactive canary contract

Only after the bootstrap postconditions are conclusively true may the implementation use the version-only primitive.

Canary requirements:

```text
CANARY_VERSION_CREATE_REQUEST_COUNT = exactly 1
CANARY_SECRET_BINDING_COUNT = 0
CANARY_DEPLOYED = false
ACTIVE_DEPLOYMENT_COUNT_AFTER_CANARY = exactly 1
ACTIVE_DEPLOYMENT_VERSION_UNCHANGED = true
PUBLIC_HTTP_INGRESS = 0
SCHEDULED_INGRESS = 0
```

The canary must use the same version-upload primitive and source-preservation mechanism intended for the final Version.

No canary execution through public HTTP or scheduled event is permitted.

## 13. Final inactive secret-bearing Version contract

Only after the canary succeeds:

```text
FINAL_VERSION_CREATE_REQUEST_COUNT <= 1
FINAL_VERSION_DEPLOYED = false
ACTIVE_DEPLOYMENT_COUNT = exactly 1
ACTIVE_DEPLOYMENT_VERSION = bootstrap synthetic version
```

The final Version may contain exactly these secret binding names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

No additional secret binding name is allowed.

A stage-specific provisioning credential, if used, is never a Worker binding.

No secret value may appear in:

- request bodies from the client;
- route responses;
- logs;
- evidence artifacts;
- migration rows;
- documentation;
- GitHub;
- test fixtures.

## 14. Server-side authorization contract if secret-transfer route is retained

The request boundary must:

1. require Bearer authentication;
2. validate the token with canonical Supabase Auth server-side;
3. derive `sub` only from verified claims;
4. prove exact global `super_admin` using server authority;
5. accept no client user ID or role;
6. accept no tenant authority input;
7. reject `x-tenant-id` for this global infrastructure ceremony;
8. reject unknown and secret-like request fields;
9. revalidate all Worker/source/Git identifiers server-side;
10. fail before Cloudflare access when required managed secrets are missing.

Super Admin impersonation does not apply because SPR-03 bootstrap/provisioning is global infrastructure, not tenant-scoped access.

## 15. Ceremony durability contract

If the existing control table is reused, it is the local claim/lease/replay authority only after exact live revalidation.

Minimum states:

```text
executing
reconciling
completed
failed
```

Rules:

- first claim atomic;
- active lease rejects concurrency;
- terminal replay rejects;
- expired lease triggers read-only provider reconciliation before any mutation;
- ambiguous timeout never causes blind retry;
- provider state is authoritative for whether a deployment/version was materialized;
- local state never overrides observed provider reality.

## 16. Temporary provisioner contract

If the server-side secret-transfer path is retained, the temporary credential name is:

```text
CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER
```

It must:

- be newly created for SPR-03;
- never reuse the SPR-01 or SPR-02 provisioner;
- use least privilege sufficient for the approved Workers Scripts operations;
- have no Zone permissions unless a future explicit gate proves they are strictly required;
- never be a Worker binding;
- never be exposed or transported to the Product Owner through ChatGPT;
- be removed from the managed secret store after the ceremony;
- be revoked externally before terminal acceptance.

The implementation must not add token-administration permissions merely to self-revoke.

## 17. Provider mutations prohibited during SPR-03

Except for the exact first bootstrap deployment and the exact version-only canary/final Version uploads authorized above, all provider mutation is prohibited:

```text
additional Worker deployments
workers.dev enablement
Preview URL enablement
Worker Route creation/change
Custom Domain creation/change
Cron Trigger creation/change
DNS mutation
fallback origin configuration
Custom Hostname creation/change
DCA-01 managed domain migration
DCA-01 controlled external proof
BCA-01
PR-M3
```

## 18. Required test and CI gates for future implementation

Because the future implementation will change technical/config surfaces, GOV-01 requires full gates.

Minimum commands:

```text
bun run typecheck
bun run build:dev
bun run build
bun run test:wri-01
bun run test:dca-01
bun run test:spr-03
bun run verify:release
```

Any existing specialized WRI-01 runtime gate triggered by `wrangler.jsonc` must remain binding.

Required deterministic SPR-03 tests must prove at least:

- bootstrap configuration is `workers_dev=false`, `preview_urls=false`, routes zero, Cron zero;
- no secret is bound to bootstrap deployment;
- no second deploy configuration exists;
- first deployment count transition is 0 → 1 only;
- canary and final Version do not create deployments;
- active deployed version remains the bootstrap version;
- exact three final secret names only;
- missing provisioner fails before provider access;
- unknown/tenant/role/secret-like client fields reject;
- replay/lease ambiguity fails closed;
- migration parity contains exactly the two historical records and no replay is scheduled;
- no unrelated generated route-tree drift;
- no dependency version drift.

## 19. Evidence artifact

Future implementation must create:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/spr-03-worker-bootstrap-managed-secret-recovery-execution.md
```

Evidence may contain only sanitized identifiers, hashes, counts, booleans, status classes and exact non-secret binding names.

Secret values, Authorization headers, JWTs and raw provider response bodies are prohibited.

## 20. Definition of Done for future implementation

All of the following must be true before SPR-03 implementation can be externally audited as a candidate for acceptance:

```text
SPR02_REJECTION_PRESERVED = true
SPR02_HISTORY_NOT_REWRITTEN = true

MIGRATION_HISTORY_RECORD_COUNT = 2
MIGRATION_PARITY_RESTORED = true
MIGRATION_HISTORY_MUTATED_MANUALLY = false
NEW_DATABASE_MUTATION_FOR_PARITY = 0
CEREMONY_TABLE_RLS = enabled
CEREMONY_TABLE_CLIENT_POLICIES = 0

TARGET_WORKER_EXISTS = true
BOOTSTRAP_DEPLOYMENT_COUNT = 1
BOOTSTRAP_SECRET_BINDING_COUNT = 0
WORKERS_DEV_ENABLED = false
PREVIEW_URLS_ENABLED = false
CUSTOM_ROUTE_COUNT = 0
CRON_COUNT = 0
PUBLIC_HTTP_INGRESS = 0
SCHEDULED_INGRESS = 0

CANARY_VERSION_CREATED = true
CANARY_DEPLOYED = false
FINAL_SECRET_VERSION_CREATED = true
FINAL_SECRET_VERSION_DEPLOYED = false
FINAL_SECRET_BINDING_NAMES = exactly SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLOUDFLARE_API_TOKEN_DCA01_HML
ACTIVE_DEPLOYMENT_STILL_BOOTSTRAP = true

TEMPORARY_PROVISIONER_SECRET_REMOVED = true
TEMPORARY_PROVISIONER_TOKEN_REVOKED = true
POST_REMOVAL_SECRET_TRANSFER_PATH_FAILS_CLOSED = true

SECOND_RUNTIME_AUTHORITY_CREATED = false
SECOND_DEPLOY_AUTHORITY_CREATED = false
EXTERNAL_SUPABASE_FALLBACK_USED = false
SECRET_VALUE_EXPOSED = false

DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false

FILES_OUTSIDE_ALLOWED = 0
TYPECHECK = pass
BUILD_DEV = pass
BUILD = pass
WRI01_REGRESSION = pass
DCA01_REGRESSION = pass
SPR03_TESTS = pass
RELEASE_GATE = pass
READY_FOR_DIRECT_EXTERNAL_AUDIT = true
```

## 21. Planning execution scope

This planning PR itself may modify exactly:

```text
docs/architecture/impact-analysis/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-impact-analysis.md
docs/architecture/governance/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-execution-envelope.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

Current planning PR must remain `docs/**` only.

## 22. Planning Definition of Done

```text
SPR03_IMPACT_ANALYSIS_CREATED = true
SPR03_EXECUTION_ENVELOPE_CREATED = true
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_RESIDUE_STRATEGY = R2
SPR03_IMPLEMENTATION_AUTHORIZED = false
SPR03_IMPLEMENTATION_STARTED = false
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
PLANNING_PROVIDER_MUTATION = 0
PLANNING_DATABASE_MUTATION = 0
PLANNING_RUNTIME_CHANGE = 0
SECRET_EXPOSED = false
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_ALLOWED_ACTION = direct GitHub audit of SPR-03 planning
```

No implementation starts in the same execution that creates this planning envelope.
