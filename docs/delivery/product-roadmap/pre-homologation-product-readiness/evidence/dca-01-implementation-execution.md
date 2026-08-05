# DCA-01 — Domain & Cloudflare Activation Implementation Evidence

## Status

**Repository implementation Accepted / Merged / Closed — Worker Runtime Preflight Rejected — external proof not executable**

```text
STAGE_ID = DCA-01
IMPLEMENTATION_BASELINE_MAIN = 623f94f98174478af19b130cda9896c64f256f14
IMPLEMENTATION_PR = 65
IMPLEMENTATION_MERGE_SHA = e807b76f4428dd34fbdb01a9e547a8dd8c90f68b
PREMERGE_AUDIT = Accepted
REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed

WORKER_RUNTIME_PREFLIGHT_BASELINE = 9157f1e19e455d20b8272951bed25eb8ddd0572d
WORKER_RUNTIME_PREFLIGHT = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_CURRENT_STATE = Rejected

WRI01_STATE = Planned
WRI01_IMPLEMENTATION_STARTED = false

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
REAL_SECRET_USED = false
PRODUCTION_CUTOVER_EXECUTED = false

BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
```

## 1. Repository implementation evidence

PR #65 materialized the accepted DCA-01 lifecycle through:

- one forward database migration;
- one closed TypeScript and SQL lifecycle;
- server-only domain authority modules;
- deterministic IDNA and official pinned Public Suffix List handling;
- tenant and global command surfaces;
- a narrow Cloudflare adapter;
- active-domain public resolution;
- canonical redirect before SSR;
- source-level scheduled executor;
- tenant and Super Admin operational surfaces;
- deterministic release specifications and two operational runbooks.

The protected implementation merge remained valid as repository implementation evidence. The later runtime preflight did not disprove the domain state machine, migration, provider adapter, RLS or command boundaries. It disproved the assumption that source-level scheduler presence established compiled Worker reachability.

## 2. Repository authority and security evidence

```text
SERVER_TENANT_AUTHORITY = true
SERVER_DOMAIN_AUTHORITY = true
SERVER_STATE_TRANSITION_AUTHORITY = true
SERVER_PROVIDER_ACCOUNT_AUTHORITY = true
SERVER_CANONICAL_HOST_AUTHORITY = true
SERVER_CUTOVER_AUTHORITY = true

CLIENT_TENANT_AUTHORITY = false
CLIENT_STATUS_AUTHORITY = false
CLIENT_PROVIDER_IDENTIFIER_AUTHORITY = false
CLIENT_DNS_SUCCESS_AUTHORITY = false
CLIENT_SSL_SUCCESS_AUTHORITY = false
REQUEST_TIME_DUAL_AUTHORITY = false
SILENT_MODE_FALLBACK = false
PUBLIC_HTTP_JOB_TRIGGER = false
PLAINTEXT_PROVIDER_SECRET_STORAGE = false
SUPER_ADMIN_TENANT_MUTATION_WITHOUT_IMPERSONATION = false
```

These invariants remain binding during WRI-01.

## 3. Domain lifecycle evidence preserved

- The accepted 12-state lifecycle remains the only persisted state set.
- `degraded → active` requires the complete current-generation predicate.
- Ownership issue, rotation and non-conclusive observation preserve status and append audit evidence.
- Ownership verification binds domain and challenge generation/version transactionally.
- `removal_pending → active` remains prohibited.
- Replacement preserves the incumbent until one atomic canonical-plus-alias swap.
- Candidate failure leaves the incumbent unchanged.
- Post-commit recovery requires a new explicit replacement generation.
- Removal closes public authority before provider cleanup.
- Revoked-hostname reuse requires the server-owned cooldown and a complete new lifecycle.

## 4. PSL and normalization evidence preserved

```text
PSL_VERSION = 2026-07-25_14-20-03_UTC
PSL_SOURCE_COMMIT = e1b8015c3b2f0f4f8c18659c2480fc1a22c07b20
PSL_RULE_COUNT = 10239
PSL_UNIQUE_RULE_COUNT = 10239
PSL_DUPLICATE_COUNT = 0
IDNA_TO_ASCII = implemented
PUBLIC_SUFFIX_ONLY_REJECTION = implemented
RESERVED_TEST_EXAMPLE_INTERNAL_REJECTION = implemented
APEX_WWW_IMPLICIT_EQUIVALENCE = prohibited
```

## 5. Migration boundary preserved

```text
MIGRATION_PATH = supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql
MANAGED_MIGRATION_EXECUTED = false
HISTORICAL_MIGRATION_EDIT = prohibited
```

The migration remains unapplied. WRI-01 does not authorize applying it or changing its schema, RLS, grants or state machine.

## 6. Protected implementation merge evidence

```text
CORRECTIVE_BASE_HEAD = 7dc42c163c0ab5bca415f3f689c2dc9617a06f19
CORRECTIVE_HEAD = c6a5b93c0869d38b1e03eba903e88513879e9402
CORRECTIVE_COMMITS = 1
CORRECTIVE_FILES = 13
FILES_OUTSIDE_CORRECTIVE_SCOPE = 0
REMOTE_RELEASE_GATE = success
REMOTE_CONSOLIDATED_GATE = success
PREMERGE_AUDIT = Accepted
IMPLEMENTATION_MERGE_SHA = e807b76f4428dd34fbdb01a9e547a8dd8c90f68b
```

The merge proved repository structure and deterministic source behavior. It did not include a deployed Worker or compiled-entry reachability proof.

## 7. Worker Runtime Preflight execution

The preflight was executed from a detached worktree at the exact audited `main` HEAD.

```text
AUDITED_HEAD = 9157f1e19e455d20b8272951bed25eb8ddd0572d
FROZEN_INSTALL = passed
BUILD = passed
BUILD_DURATION_SECONDS = approximately 22

NITRO_PRESET = cloudflare-module
WORKER_ENTRY = dist/server/index.mjs
STATIC_ASSETS = dist/client
NODEJS_COMPAT = true
GENERATED_WRANGLER = dist/server/wrangler.json
GENERATED_DEPLOY_CONFIG = .wrangler/deploy/config.json
```

Generated Worker configuration contained only the assets binding and compatibility settings. It did not contain versioned routes, Cron Triggers, deployment environments or WRI/DCA runtime bindings.

## 8. Compiled `fetch` evidence

```text
SRC_SERVER_FETCH_COMPILED = true
SRC_SERVER_FETCH_REACHABLE = true
SRC_SERVER_FETCH_RECEIVES_ENV = false
SRC_SERVER_FETCH_RECEIVES_CTX = false
```

Compiled request flow:

```text
Cloudflare Nitro entry fetch(request, env, ctx)
→ Nitro request/assets handling
→ SSR service fetch(request)
→ src/server.ts default fetch(request, undefined, undefined)
```

Consequences:

- `src/server.ts` cannot treat its `env` argument as the Cloudflare binding authority;
- `ExecutionContext.waitUntil` is unavailable at that boundary;
- current behavior relies on `process.env` compatibility rather than an explicit runtime-context contract;
- missing context is not currently a first-class fail-closed condition.

This must be corrected by WRI-01 without introducing a second request or tenant authority.

## 9. Compiled `scheduled` evidence

```text
SRC_SERVER_SCHEDULED_COMPILED = true
SRC_SERVER_SCHEDULED_REACHABLE = false
CLOUDFLARE_SCHEDULED_HOOK_CONSUMER = absent
WRANGLER_CRON_TRIGGER = absent
```

Compiled scheduled flow:

```text
Cloudflare Nitro entry scheduled(controller, env, ctx)
→ nitroHooks.callHook("cloudflare:scheduled", ...)
→ no registered consumer
→ src/server.ts::scheduled not invoked
```

Therefore these source capabilities were not remotely executable:

```text
processScheduledDomainJobs
periodic reconciliation
job leasing
bounded provider retries
orphan reconciliation
```

The original evidence statement “platform-native scheduled executor” is retained as historical source-level intent but superseded for runtime readiness by this compiled evidence.

## 10. Bundle evidence

```text
SERVER_UNCOMPRESSED_BYTES = 8586058
SERVER_MODULE_FILES = 381
CLIENT_ASSETS_SIZE = approximately 3.6 MB
WRANGLER_DRY_RUN_EXECUTED = false
GZIP_UPLOAD_BYTES = unknown
STARTUP_TIME_MS = unknown
CLOUDFLARE_ACCOUNT_PLAN_LIMIT = not yet audited
```

No Worker-size conclusion may be drawn from uncompressed bytes alone. WRI-01 must execute `wrangler deploy --dry-run --outdir` and compare the gzip size and startup time with the current plan limits.

## 11. Cloudflare preparation evidence

Operator-supplied, non-authoritative inputs:

```text
CLOUDFLARE_ZONE_NAME = mrrod.com.br
CLOUDFLARE_FOR_SAAS_ENABLED = true
FALLBACK_ORIGIN_CONFIGURED = false
CREDENTIAL_REFERENCE = env:CLOUDFLARE_API_TOKEN_DCA01_HML
SECRET_NAME_PRESENT_IN_LOVABLE = true
```

Account and zone identifiers are transport inputs and must be revalidated before provider mutation.

The previously attempted `fallback.mrrod.com.br` configuration reached `Pending Deployment (Error)` because no valid Worker origin and route contract had been established. No valid fallback origin or Custom Hostname proof exists.

## 12. Same-Backend evidence

```text
SEPARATE_TEST_BACKEND = false
PREVIEW_AND_PUBLISHED_SHARE_BACKEND = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
RM_PRIME_IMOVEIS_TENANT_TEST_USE = prohibited
TECHNICAL_TENANT_REQUIRED = true
```

WRI-01 must not create an external Supabase fallback or apply the DCA migration.

## 13. Reclassification

The exact-build preflight discovered an internal compiled-runtime defect. The prior state `Blocked External` is no longer sufficient.

```text
DCA01_WORKER_RUNTIME_PREFLIGHT = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_CURRENT_STATE = Rejected
NEXT_RECOVERY_GATE = WRI-01
```

This reclassification does not undo the historical protected repository merge. It records that DCA-01 cannot become terminally Accepted until WRI-01 repairs and proves Worker runtime integration.

## 14. WRI-01 disposition

```text
WRI01_STATE = Planned
WRI01_SELECTED_STRATEGY = preserve Lovable/TanStack/Nitro and add one runtime bridge plus versioned Wrangler authority
WRI01_IMPLEMENTATION_STARTED = false
LOVABLE_IMPLEMENTATION_AUTHORIZED = false
WORKER_DEPLOY_AUTHORIZED = false
DNS_MUTATION_AUTHORIZED = false
CLOUDFLARE_ROUTE_MUTATION_AUTHORIZED = false
CRON_TRIGGER_AUTHORIZED = false
```

WRI-01 planning is documented in:

- `docs/architecture/impact-analysis/WRI-01-cloudflare-worker-runtime-integration-impact-analysis.md`;
- `docs/architecture/governance/WRI-01-cloudflare-worker-runtime-integration-execution-envelope.md`.

No implementation or external operation may begin without a direct Accepted planning audit, protected planning merge and separate Product Owner authorization.
