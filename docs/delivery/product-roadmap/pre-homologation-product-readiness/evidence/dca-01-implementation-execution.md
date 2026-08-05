# DCA-01 — Domain & Cloudflare Activation Implementation Evidence

## Status

**Repository implementation Accepted / Merged / Closed — controlled external proof Blocked External**

```text
STAGE_ID = DCA-01
IMPLEMENTATION_BASELINE_MAIN = 623f94f98174478af19b130cda9896c64f256f14
IMPLEMENTATION_BRANCH = agent/dca-01-domain-cloudflare-activation
IMPLEMENTATION_PR = 65
IMPLEMENTATION_PR_DRAFT = false
AUTO_MERGE = false
PREMERGE_AUDIT = Accepted
IMPLEMENTATION_MERGE_AUTHORIZED = executed
TERMINAL_DCA01_STATE = Blocked External

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
REAL_SECRET_USED = false
PRODUCTION_CUTOVER_EXECUTED = false

BCA01_STATE = Planned — Blocked by DCA-01
PRM3_STATE = Planned — Blocked by BCA-01
```

## Materialized repository scope

The principal PR materializes the accepted DCA-01 lifecycle through:

- one forward database migration;
- one closed TypeScript and SQL lifecycle;
- server-only domain authority modules;
- an official pinned Public Suffix List snapshot;
- tenant and global command surfaces;
- a narrow Cloudflare adapter;
- active-domain public resolution;
- canonical redirect before SSR;
- a platform-native scheduled executor;
- tenant and Super Admin operational surfaces;
- deterministic release specifications and two operational runbooks.

Additional subordinate files below `src/lib/domains/` are direct implementation-time consequences of the accepted Definition of Done:

- generated Public Suffix List snapshot segments;
- split server-only repository modules preserving one exported repository boundary;
- deterministic legacy-import manifest builder because SQL cannot infer PSL/IDNA authority.

They introduce no second authority, no new architectural decision and no additional stage.

## Authority and security evidence

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

## Lifecycle evidence

- The only persisted statuses are the accepted 12-state set.
- `degraded → active` is symmetric and requires the full current-generation predicate.
- Ownership issue/rotation/non-conclusive observation preserve status and append audit evidence.
- Ownership verification locks the current domain and challenge generation/version in one transaction.
- `removal_pending → active` is prohibited.
- Failed retry performs one explicit matching recovery transition before enqueuing work.
- A removal request closes public authority before provider cleanup.
- Replacement preserves the active incumbent while the candidate is prepared.
- Replacement retires the incumbent generation and promotes the candidate in one transaction; failure aborts both effects.
- Post-commit recovery requires a new explicit candidate generation.

## PSL and normalization evidence

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

The snapshot segments were reconciled by Git blob SHA against the generated source artifacts before runtime integration.

## Migration boundary

```text
MIGRATION_PATH = supabase/migrations/20260804180000_dca_01_domain_cloudflare_activation.sql
REMOTE_GITHUB_BLOB = 61d9e86cbbafe5f4a91017081d8b2f652847faf9
REMOTE_LINE_COUNT = 1490
HISTORICAL_LOCAL_DRAFT_BLOB = d4ca60f07bfb854aea823905d59dee772b1aecc5
LOCAL_DRAFT_IS_AUTHORITY = false
GITHUB_PR_CONTENT_IS_AUTHORITY = true
```

The initial local draft and the GitHub file are not byte-identical. That local draft is development history, not a repository authority. The GitHub PR file is the operative implementation and has been validated directly by the exact-head Release Gate and DCA-01 structural specifications.

The migration provides:

- all eight RLS-enabled DCA tables;
- no permissive client policies;
- explicit table and function grants;
- closed SQL transitions and active predicate enforcement;
- atomic domain creation, challenge verification and replacement;
- append-only audit events;
- opaque `env:VARIABLE` credential references;
- leased jobs with attempt records and bounded retry;
- public resolver functions over active `tenant_domains` only;
- a global cutover RPC with legacy continuity and current-generation evidence checks;
- fail-closed legacy import requiring a server-generated PSL/IDNA manifest and source SHA-256 binding.

The migration has not been applied to a managed database.

## Exact-head Release Gate history

### Initial draft diagnostic

```text
HEAD = 86d6e2543472fe136eccee062052fe1152031295
RESULT = failure
CAUSE = structural test matcher false positive before build/typecheck
DIRECT_PROVIDER_TABLE_MUTATION_FOUND = false
```

### Serializable DTO correction

```text
HEAD = 76fea3457cc1b8d97522e043a3fdf50409e07f65
DCA01_TEST = passed
BUILD_DEV = passed
TYPECHECK = failed
CAUSE = non-serializable Record<string, unknown> in server-function DTOs
```

The DTO root contract was replaced with strict recursive JSON types. External DNS/provider data is sanitized before persistence or return.

### Runtime and repository validation

```text
HEAD = b475f1e4e7b04021e32b74309df289fe07a605ba
RELEASE_GATE = success
PRM2_CONSOLIDATED_CORRECTIVE_GATE = success
BUILD_DEV = passed
BUILD = passed
TYPECHECK = passed
```

### Tenant/Super UI validation

```text
HEAD = 8ca3c64b2b13416389fd62da63e8894b5c05f14a
RELEASE_GATE = success
PRM2_CONSOLIDATED_CORRECTIVE_GATE = success
TENANT_DOMAIN_ROUTE_GENERATED = true
SUPER_DOMAIN_ROUTE_GENERATED = true
BUILD_DEV = passed
BUILD = passed
TYPECHECK = passed
```

### Generator-owned route-tree proof

```text
HEAD = 4bb3bfbcb1b77dae0feb3c77df5288b9d56eee8e
RELEASE_GATE = success
PRM2_CONSOLIDATED_CORRECTIVE_GATE = success
GENERATED_ROUTE_TREE_BYTES = 71456
GENERATED_ROUTE_TREE_LINES = 1695
GENERATED_ROUTE_TREE_SHA256 = 00ea348d4032a9619fd033fe1d794abc177a74a0f830a8645dcae1c4055d13d8
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
DETERMINISTIC_ROUTE_TREE_CYCLES = 3
```

### Final reconciled implementation head before evidence-number correction

```text
HEAD = 1cc8732cdc67b7d0ce537ec319d9a2123e59686d
RELEASE_GATE = success
PRM2_CONSOLIDATED_CORRECTIVE_GATE = success
DCA01_SPEC_ASSERTIONS = 149
BUILD_DEV = passed
BUILD = passed
TYPECHECK = passed
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
RELEASE_GATE_ARTIFACT_ID = 8909598262
RELEASE_GATE_ARTIFACT_DIGEST = sha256:4b6f4fac0ae4c5969015a622a6acd1444275c17b299763395fa47210c6be738b
```

`src/routeTree.gen.ts` remains generator-owned and unedited in the branch. The exact builds generate both DCA routes and produce one stable digest across development, production and repeated development cycles.

## Operational surfaces

### Tenant

The tenant workspace supports:

- domain request with explicit mode and binding kind;
- one-time ownership TXT display;
- challenge rotation;
- verification request;
- deterministic retry;
- canonical replacement request;
- removal request.

It exposes no status mutation, provider ID mutation, DNS success assertion or SSL success assertion.

### Super Admin

The global workspace supports:

- sanitized platform diagnostics;
- provider-account registration through audited RPC;
- opaque credential-reference rotation;
- explicit provider availability control;
- failed-job visibility;
- read-only authoritative-cutover preflight.

Tenant-scoped retry and manual-assisted observation remain protected by `requireTenant` and explicit impersonation.

## External proof boundary

No external operation has been executed. After an Accepted pre-merge audit and protected implementation merge, the controlled non-production proof still must cover:

- managed migration application;
- legacy import preflight where applicable;
- DNS ownership and required record observation;
- Cloudflare Custom Hostname creation or exact observation;
- SSL activation;
- activation, degradation and recovery;
- atomic replacement;
- removal and provider cleanup;
- exact-release cutover preflight.

Repository success is not external-provider success. Production cutover remains unauthorized.

## Protected merge and external-proof disposition

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
REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed
CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
MANAGED_MIGRATION_EXECUTED = false
DEPLOY_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
DNS_MUTATION_EXECUTED = false
REAL_SECRET_USED = false
PRODUCTION_CUTOVER_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

The repository implementation is accepted and merged. DCA-01 remains terminally Blocked External until an explicitly authorized non-production proof verifies migration, DNS ownership, Cloudflare Custom Hostname, SSL, activation, degradation/recovery, atomic replacement and removal.
