# FINITE ROADMAP EXECUTION MAP — RM Prime SaaS

**Status:** Active governance — WRI-01 implementation and redirected-Wrangler correction Accepted / Merged / Closed; PRs #70 and #72 merged
**Audited planning merge:** `a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca`
**Audited implementation code HEAD:** `cba0d1756d596c44b993b95e8288ea4474b326a0`
**Audited final implementation HEAD:** `8d03b1cc4fcf023224fc198f897008905956b5d6`
**Implementation merge SHA:** `81bfd7ba821187861dd1e183ac1c99198afdd43e`
**Audited correction HEAD:** `61893694c00ceb846d3de3e0cf6862c94dc386a4`
**Correction merge SHA:** `2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a`

## Current stage map

| # | Stage | State | Successor condition |
|---:|---|---|---|
| 1 | Fases 2, 3 and 4 | Accepted / Closed | historical |
| 2 | LSH-01 | Accepted / Closed | do not reopen |
| 3 | LSV-01, LSV-02, LSR-01 | Superseded / terminal | do not reopen |
| 4 | PR-M2 | Accepted / Merged / Closed | no automatic successor |
| 5 | DCA-01 repository implementation | Accepted / Merged / Closed | Worker runtime proof |
| 6 | DCA-01 Worker Runtime Preflight | Rejected | WRI-01 planning and correction |
| 7 | WRI-01 planning | Accepted / Merged / Closed | no automatic successor |
| 8 | WRI-01 implementation and redirected-Wrangler correction | Accepted / Merged / Closed | no automatic successor |
| 9 | DCA-01 controlled external proof | Blocked | safe external prerequisites plus separate authorization |
| 10 | BCA-01 | Planned — Blocked by DCA-01 | DCA-01 terminal Accepted and explicit authorization |
| 11 | PR-M3 | Planned — Blocked by BCA-01 | BCA-01 Accepted |
| 12 | Release Candidate | Blocked by PR-M3 | PR-M3 exit gate |
| 13 | TH-M1 | Blocked by Release Candidate | internal UAT |
| 14 | TH-M2 | Blocked by TH-M1 | consolidated remediation |
| 15 | LSV-03 | Planned — Blocked by TH-M2 | controlled Same-Backend validation |
| 16 | Formal Homologation | Blocked by LSV-03 | explicit authorization |
| 17 | Production | Blocked by Formal Homologation | explicit production decision |

## Current factual state

```text
DCA01_PLANNING_STATE = Accepted / Merged / Closed
DCA01_PLANNING_PR = 64
DCA01_PLANNING_MERGE_SHA = 623f94f98174478af19b130cda9896c64f256f14

DCA01_REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed
DCA01_IMPLEMENTATION_PR = 65
DCA01_IMPLEMENTATION_MERGE_SHA = e807b76f4428dd34fbdb01a9e547a8dd8c90f68b
DCA01_PREMERGE_AUDIT = Accepted

DCA01_WORKER_RUNTIME_PREFLIGHT = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_CURRENT_STATE = Rejected

WRI01_PLANNING_STATE = Accepted / Merged / Closed
WRI01_PLANNING_PR = 68
WRI01_PLANNING_HEAD = 750aa95b24262021a73a3a37e06fdbcc3bd3f196
WRI01_PLANNING_MERGE_SHA = a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca
WRI01_PLANNING_AUDIT = Accepted
WRI01_SELECTED_STRATEGY = Strategy A
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_AUTHORIZED = true
WRI01_IMPLEMENTATION_STARTED = true
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_BASELINE_MAIN = fc7ceb19a7389364aa69c5d5b6f33c8b478d3625
WRI01_IMPLEMENTATION_CODE_HEAD = cba0d1756d596c44b993b95e8288ea4474b326a0
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_POST_MERGE_RECONCILIATION = completed
WRI01_IMPLEMENTATION_AUDIT = Accepted
WRI01_PRIOR_POST_MERGE_RECONCILIATION_PR = 71
WRI01_PRIOR_POST_MERGE_RECONCILIATION_SHA = 7d24bc22346a664b846c8345ffe172d73f52f11b
WRI01_CORRECTION_STATE = Accepted / Merged / Closed
WRI01_CORRECTION_PR = 72
WRI01_CORRECTION_HEAD = 61893694c00ceb846d3de3e0cf6862c94dc386a4
WRI01_CORRECTION_MERGE_SHA = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_CORRECTION_AUDIT = Accepted
WRI01_POST_CORRECTION_RECONCILIATION = completed
WRI01_PR_OPEN = false
WRI01_PR_DRAFT = false
WRI01_PR_MERGED = true
PRODUCT_OWNER_MERGE_AUTHORIZATION_REQUIRED = false

WRI01_GATE_RUN = 31175025946
WRI01_GATE_RESULT = success
RELEASE_GATE_RUN = 31175025588
RELEASE_GATE_RESULT = success
PRM2_GATE_RUN = 31176940812
PRM2_GATE_RESULT = success
WRI01_LOCAL_POWERSHELL_PROOF = PASS
WRI01_LOCAL_PROOF_HEAD = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_REDIRECTED_WRANGLER_CONFIG_PROVED = true
WRI01_ROOT_DRY_RUN_PARITY_PROVED = true

BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
DCA01_EXTERNAL_PROOF_STARTED = false
NEXT_STAGE_AUTHORIZED = none
NO_AUTOMATIC_SUCCESSOR = true

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
SSL_PROVISIONING_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## Runtime-preflight evidence

```text
EXACT_BUILD_INSTALL = passed
EXACT_BUILD = passed
NITRO_PRESET = cloudflare-module
WORKER_ENTRY = dist/server/index.mjs
STATIC_ASSETS = dist/client
NODEJS_COMPAT = true

SRC_SERVER_FETCH_COMPILED = true
SRC_SERVER_FETCH_REACHABLE = true
SRC_SERVER_FETCH_RECEIVES_ENV = false
SRC_SERVER_FETCH_RECEIVES_CTX = false

SRC_SERVER_SCHEDULED_COMPILED = true
SRC_SERVER_SCHEDULED_REACHABLE = false
CLOUDFLARE_SCHEDULED_HOOK_CONSUMER = absent
WRANGLER_CRON_TRIGGER = absent
WRANGLER_ROUTES = absent
VERSIONED_WRANGLER_CONFIG = absent
REPRODUCIBLE_DEPLOY_SCRIPT = absent

SERVER_UNCOMPRESSED_BYTES = 8586058
SERVER_MODULE_FILES = 381
CLOUDFLARE_SECRET_EXISTS = true
SEPARATE_TEST_BACKEND = false
PREVIEW_AND_PUBLISHED_SHARE_BACKEND = true
FALLBACK_ORIGIN_LAST_OBSERVED_STATUS = Pending Deployment (Error)
```

Source-level presence of `fetch` and `scheduled` is not runtime acceptance. The compiled Worker must prove both handlers are reachable and receive authoritative platform context.

## WRI-01 finite path

```text
DCA-01 exact-build Worker Runtime Preflight
→ internal compiled-runtime defect confirmed
→ DCA-01 state = Rejected
→ WRI-01 planning-only impact analysis
→ Strategy A selected
→ direct planning audit = Accepted
→ protected planning merge = completed
→ WRI-01 implementation authorization = granted
→ one principal implementation PR = #70
→ compiled-bundle, workerd and dry-run gates = passed
→ direct exact-head implementation audit = Accepted
→ protected exact-head squash merge = completed
→ post-merge reconciliation = completed
→ redirected Wrangler configuration correction PR #72 = Accepted / Merged / Closed
→ terminal post-correction documentation reconciliation = completed
→ controlled workers.dev proof only after separate authorization
→ controlled zone route and fallback proof only after separate authorization
→ WRI-01 terminal audit
→ DCA-01 external proof may resume only after WRI-01 Accepted
→ no automatic successor
```

WRI-01 remains one finite recovery stage. It may use one principal implementation cycle and at most one consolidated corrective pass. Artificial lots, sublots and decimal successor stages are prohibited.

## Selected architecture

```text
SELECTED_STRATEGY = Strategy A
BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
DEPLOY_AUTHORITY = versioned wrangler.jsonc
TOP_LEVEL_WORKER_ENTRY = dist/server/index.mjs
REQUEST_APPLICATION_BOUNDARY = src/server.ts::fetch
SCHEDULED_APPLICATION_BOUNDARY = src/server.ts::scheduled
RUNTIME_CONTEXT_BRIDGE = one request-scoped Cloudflare bridge
SCHEDULED_HOOK_CONSUMER_COUNT = exactly one
PUBLIC_HTTP_JOB_TRIGGER = prohibited
```

Rejected:

```text
STRATEGY_B = replacing Nitro with @cloudflare/vite-plugin in WRI-01
STRATEGY_C = parallel or hybrid Nitro/Cloudflare Vite pipelines
SECOND_WORKER_ENTRY = prohibited
SECOND_ASSETS_AUTHORITY = prohibited
SECOND_BINDING_AUTHORITY = prohibited
```

## Non-production Cloudflare contract

```text
ZONE_NAME = mrrod.com.br
CLOUDFLARE_FOR_SAAS_ENABLED = true
FALLBACK_ORIGIN_CONFIGURED = false
RUNTIME_SECRET_NAME = CLOUDFLARE_API_TOKEN_DCA01_HML

WORKER_NAME = rm-prime-wri01-hml
INITIAL_TARGET = workers.dev
CRON = */5 * * * * UTC
MAX_JOBS_PER_CYCLE = 20
```

Required no-Worker route exclusions before any wildcard Worker route:

```text
mrrod.com.br/*
www.mrrod.com.br/*
notify.mrrod.com.br/*
```

Planned wildcard route:

```text
*/* → rm-prime-wri01-hml
```

Planned originless fallback:

```text
fallback.mrrod.com.br AAAA 100:: — proxied
```

None of these external mutations is authorized by planning or repository implementation alone.

## Bundle gates

```text
FROZEN_INSTALL_REQUIRED = true
RELEASE_GATE_REQUIRED = true
DCA01_REGRESSION_GATE_REQUIRED = true
WRI01_RUNTIME_GATE_REQUIRED = true
WRANGLER_DRY_RUN_REQUIRED = true
COMPRESSED_SIZE_GATE_REQUIRED = true
STARTUP_TIME_GATE_REQUIRED = true
COMPILED_HANDLER_REACHABILITY_REQUIRED = true
```

The account plan and applicable compressed-size limit must be obtained from Cloudflare at execution time. The uncompressed byte count cannot be used to infer success or failure.

## Same-Backend Homologation Cell

```text
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_FALLBACK = prohibited
REAL_TENANT_USE = prohibited
RM_PRIME_IMOVEIS_TENANT_USE = prohibited
TECHNICAL_TENANT_REQUIRED = true
EXPLICIT_IMPERSONATION_REQUIRED = true
DCA01_MANAGED_MIGRATION_AUTHORIZED = false
```

## Governance

- GitHub `main` audited state is the final technical authority.
- WRI-01 planning changes documentation only.
- Lovable may not implement or publish WRI-01 under this planning gate.
- No Worker, route, Cron, DNS, fallback origin, Custom Hostname or migration is created.
- Account ID and zone ID are transport inputs only and must be revalidated server-side before mutation.
- Runtime and deploy credentials are distinct and remain secret.
- A green source-level test without compiled-bundle proof is insufficient.
- WRI-01 acceptance does not automatically authorize DCA-01 external proof or BCA-01.
- No successor starts without explicit Product Owner authorization.

## Historical authority

The PR-M2 terminal state is preserved at `fad8874bfeef85683445f52d21611e7d8760c1a0`.

DCA-01 corrected planning was merged at `623f94f98174478af19b130cda9896c64f256f14`. Repository implementation was merged at `e807b76f4428dd34fbdb01a9e547a8dd8c90f68b`. The Worker runtime defect was confirmed against `9157f1e19e455d20b8272951bed25eb8ddd0572d`.

## WRI-01 current implementation authority

```text
WRI01_PLANNING_STATE = Accepted / Merged / Closed
WRI01_PLANNING_PR = 68
WRI01_PLANNING_HEAD = 750aa95b24262021a73a3a37e06fdbcc3bd3f196
WRI01_PLANNING_MERGE_SHA = a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca
WRI01_PLANNING_AUDIT = Accepted
WRI01_SELECTED_STRATEGY = Strategy A
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_AUTHORIZED = true
WRI01_IMPLEMENTATION_STARTED = true
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_CODE_HEAD = cba0d1756d596c44b993b95e8288ea4474b326a0
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_POST_MERGE_RECONCILIATION = completed
WRI01_IMPLEMENTATION_AUDIT = Accepted
DCA01_CURRENT_STATE = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
NEXT_STAGE_AUTHORIZED = none
BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
PRODUCT_OWNER_MERGE_AUTHORIZATION_REQUIRED = false
```

## Protected exact-head merge and post-merge reconciliation

```text
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_IMPLEMENTATION_AUDIT = Accepted
WRI01_STRATEGY_A_PRESERVED = true
WRI01_POST_MERGE_RECONCILIATION = completed
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
AUTO_MERGE_ENABLED = false
```

Custom Hostname and Fallback Origin remain unproved and unconfigured. The last canonical provider observation remains `Pending Deployment (Error)`. This merge and reconciliation authorize no deploy, managed migration, DNS, Worker Route, remote Cron Trigger, provider API operation, DCA-01 external proof, BCA-01 or PR-M3.

## WRI-01 terminal post-correction authority

```text
WRI01_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_STATE = Accepted / Merged / Closed
WRI01_IMPLEMENTATION_PR = 70
WRI01_IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
WRI01_IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
WRI01_PRIOR_POST_MERGE_RECONCILIATION_PR = 71
WRI01_PRIOR_POST_MERGE_RECONCILIATION_SHA = 7d24bc22346a664b846c8345ffe172d73f52f11b
WRI01_CORRECTION_STATE = Accepted / Merged / Closed
WRI01_CORRECTION_PR = 72
WRI01_CORRECTION_HEAD = 61893694c00ceb846d3de3e0cf6862c94dc386a4
WRI01_CORRECTION_MERGE_SHA = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_CORRECTION_AUDIT = Accepted
WRI01_GATE_RUN = 31175025946
WRI01_GATE_RESULT = success
RELEASE_GATE_RUN = 31175025588
RELEASE_GATE_RESULT = success
PRM2_GATE_RUN = 31176940812
PRM2_GATE_RESULT = success
WRI01_LOCAL_POWERSHELL_PROOF = PASS
WRI01_LOCAL_PROOF_HEAD = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
WRI01_REDIRECTED_WRANGLER_CONFIG_PROVED = true
WRI01_ROOT_DRY_RUN_PARITY_PROVED = true
WRI01_POST_CORRECTION_RECONCILIATION = completed
DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_API_CALL_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
SSL_PROVISIONING_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
NO_AUTOMATIC_SUCCESSOR = true
```

The next workstream remains DCA-01 Controlled External Proof. Its first operation is a separately authorized controlled `workers.dev` proof; this terminal documentation reconciliation neither starts nor authorizes it.
