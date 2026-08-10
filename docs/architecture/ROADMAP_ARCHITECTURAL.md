# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — WRI-01 Accepted / Merged / Closed; SPR-01 planning Accepted / Merged / Closed; SPR-01 implementation Rejected; SPR-02 planning Accepted / Merged / Closed; SPR-02 principal implementation Rejected; SPR-03 planning Accepted / Merged / Closed; SPR-03 implementation capability gate Accepted; SPR-03 principal implementation Authorized / Not Started
**Authority:** Single Source of Future Evolution
**Audited planning merge:** `a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca`
**Audited implementation code HEAD:** `cba0d1756d596c44b993b95e8288ea4474b326a0`
**Audited final implementation HEAD:** `8d03b1cc4fcf023224fc198f897008905956b5d6`
**Implementation merge SHA:** `81bfd7ba821187861dd1e183ac1c99198afdd43e`
**Audited correction HEAD:** `61893694c00ceb846d3de3e0cf6862c94dc386a4`
**Correction merge SHA:** `2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a`

## Current authority

```text
PRM2_STATE = Accepted / Merged / Closed
PRM2_IMPLEMENTATION_PR = 60
PRM2_IMPLEMENTATION_MERGE_SHA = ec06a19af44cc988e602d7bc8d0dc7a627db1619

DCA01_PLANNING_STATE = Accepted / Merged / Closed
DCA01_PLANNING_PR = 64
DCA01_PLANNING_MERGE_SHA = 623f94f98174478af19b130cda9896c64f256f14
DCA01_INTEGRATION_MODEL = HYBRID
DCA01_SUPPORTED_MODES = manual_assisted, api_automated

DCA01_REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed
DCA01_IMPLEMENTATION_PR = 65
DCA01_IMPLEMENTATION_MERGE_SHA = e807b76f4428dd34fbdb01a9e547a8dd8c90f68b
DCA01_PREMERGE_AUDIT = Accepted

DCA01_WORKER_RUNTIME_PREFLIGHT_HISTORICAL = Rejected
DCA01_RUNTIME_DEFECT_RESOLUTION = WRI-01 Accepted / Merged / Closed
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_STARTED = false

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
PR72_CORRECTION_REQUIRED = false
WRI01_PR_OPEN = false
WRI01_PR_DRAFT = false
WRI01_PR_MERGED = true
WRI01_AUTO_MERGE_ENABLED = false
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

SPR01_PLANNING_BASELINE_MAIN = cc45ec8c334bdea3965830426992a705271b1103
SPR01_PLANNING_PR = 75
SPR01_PLANNING_HEAD = 0d2ad969b3109b6da2b4dd37307b3b8f12a517f7
SPR01_PLANNING_MERGE_SHA = 5c4562531247f3c9b85b9fa3a1c799d6ef32fa7c
SPR01_PLANNING_AUDIT = Accepted
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_SELECTED_STRATEGY = managed two-operator zero-deployment provisioning
SPR01_PLANNING_MERGE_AUTHORIZED = true
SPR01_IMPLEMENTATION_STATE = Rejected
SPR01_IMPLEMENTATION_FILES_CHANGED = 0
SPR01_IMPLEMENTATION_PR = none
SPR01_PRINCIPAL_PROMPT = consumed
SPR01_CONSOLIDATED_CORRECTIVE_PROMPT = consumed
SPR01_IMPLEMENTATION_PROMPT_BUDGET = 2/2 consumed
SPR01_THIRD_IMPLEMENTATION_PROMPT = prohibited
SPR01_OWNER_SERVICE_ROLE_ACCESS = false
SPR01_EDGE_FUNCTION_STRATEGY_EXECUTABLE = false under active Lovable executor policy
CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER = revoked_and_removed

SPR02_PLANNING_BASELINE_MAIN = 9d7e81a519a16c7365db177dcbd8748df4c84708
SPR02_PLANNING_BRANCH = agent/spr-02-managed-secret-provisioning-replacement-planning
SPR02_PLANNING_PR = 77
SPR02_PLANNING_HEAD = 61f7368266052ca21ae8dbb2b98fa6a564b61543
SPR02_PLANNING_MERGE_SHA = ae1e8fdf344ca6757b0aef15edbeda65ea0d42f5
SPR02_PLANNING_AUDIT = Accepted
SPR02_PLANNING_STATE = Accepted / Merged / Closed
SPR02_SELECTED_STRATEGY = Strategy A
SPR02_SELECTED_PRIMITIVE = authenticated TanStack server route + server-only helper
SPR02_IMPLEMENTATION_GATE_HISTORICAL = Accepted
SPR02_PRINCIPAL_IMPLEMENTATION_AUDIT = Rejected
SPR02_IMPLEMENTATION_STATE = Rejected
SPR02_IMPLEMENTATION_PRINCIPAL_PROMPT = consumed
SPR02_IMPLEMENTATION_PROMPT_BUDGET = 1/2 consumed
SPR02_CONSOLIDATED_CORRECTIVE = unused
SPR02_CONSOLIDATED_CORRECTIVE_AUTHORIZED = false
SPR02_CAPABILITY_MISMATCH_EXCEPTION = not_applicable
SPR02_GITHUB_IMPLEMENTATION_PR = none
SPR02_GITHUB_IMPLEMENTATION_FILES = 0
SPR02_CLOUDFLARE_MUTATIONS = 0
SPR02_SECRET_VALUE_EXPOSED = false
SPR02_SUPABASE_MUTATION_OCCURRED = true
SPR02_APPLIED_MIGRATION_RECORD_COUNT = 2
SPR02_TARGET_WORKER = rm-prime-wri01-hml
SPR02_TARGET_WORKER_EXISTS = false
SPR02_TEMPORARY_PROVISIONER_TEARDOWN = completed; removed from Lovable Secrets and revoked in Cloudflare per Owner confirmation on 2026-08-10
CLOUDFLARE_API_TOKEN_SPR02_PROVISIONER = rejected-stage credential; reuse prohibited

SPR03_PLANNING_BASELINE_MAIN = b430b6cb5033cec66902031394b7cb4406206c81
SPR03_PLANNING_BRANCH = agent/spr-03-worker-bootstrap-managed-secret-recovery-planning
SPR03_PLANNING_PR = 81
SPR03_PLANNING_HEAD = 4fc1372604f703600f3722f868e89c19339fbca9
SPR03_PLANNING_MERGE_SHA = 9deced9acede14192dcf794cc8bff3cbe02e8c54
SPR03_PLANNING_AUDIT = Accepted
SPR03_PLANNING_STATE = Accepted / Merged / Closed
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_SELECTED_PRIMITIVE = controlled first Wrangler deployment with zero ingress, followed by version-only canary and final secret-bearing inactive version
SPR03_RESIDUE_STRATEGY = R2 — Forward Historical Parity Materialization
SPR03_IMPLEMENTATION_GATE = Accepted
SPR03_STATIC_CLOUDFLARE_CAPABILITIES = Accepted
SPR03_GITHUB_CAPABILITY_STATE = Accepted
SPR03_SUPABASE_RESIDUE_CAPABILITY_STATE = Accepted
SPR03_CURRENT_CLOUDFLARE_ACCOUNT_STATE = Accepted / resolved
SPR03_DIRECT_CLOUDFLARE_CONNECTION_AVAILABLE = true
SPR03_SPR02_TOKEN_TEARDOWN_CONFIRMED = true
SPR03_CLOUDFLARE_ACCOUNT_CARDINALITY = 1
SPR03_TARGET_WORKER_EXISTS = false
SPR03_TARGET_WORKER_DEPLOYMENT_COUNT = 0 because target absent
SPR03_TARGET_WORKER_VERSION_COUNT = 0 because target absent
SPR03_CURRENT_WORKERS_DEV_INGRESS = absent because target absent
SPR03_CURRENT_PREVIEW_INGRESS = absent because target absent
SPR03_CURRENT_CUSTOM_ROUTE_COUNT = 0 across all 3 account zones
SPR03_CURRENT_CRON_COUNT = 0 because target absent
SPR03_CURRENT_CUSTOM_DOMAIN_COUNT = 0
SPR03_CURRENT_CUSTOM_HOSTNAME_COUNT = 0 across all 3 account zones
SPR03_CURRENT_FALLBACK_ORIGIN_STATE = absent across all 3 account zones
SPR03_IMPLEMENTATION_AUTHORIZED = true
SPR03_IMPLEMENTATION_STARTED = false
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
SPR03_THIRD_IMPLEMENTATION_PROMPT = prohibited

BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = SPR-03 principal implementation under frozen Strategy D + R2 Execution Envelope
NO_AUTOMATIC_SUCCESSOR = true

DEPLOY_EXECUTED = false on canonical Cloudflare target as of direct SPR-03 capability-gate revalidation
SPR02_MANAGED_MIGRATION_RESIDUE_EXECUTED = true outside GitHub main during rejected principal attempt
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_PROVIDER_MUTATION_EXECUTED = false in SPR-03 capability gate
CLOUDFLARE_READ_ONLY_API_CHECKS_EXECUTED = true through direct official Cloudflare connection
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_CONFIGURED = false
SSL_PROVISIONING_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

The current WRI-01 authority preserves the complete chain: principal implementation PR #70, prior post-merge reconciliation PR #71, and redirected Wrangler correction PR #72. The local PowerShell proof was executed on the exact correction merge HEAD and passed the frozen install, build, bundle audit and root redirected-config dry-run without mutating the owner clone.

## DCA-01 repository implementation authority

PR #65 remains the accepted repository implementation of the domain lifecycle. It materialized:

- one closed 12-state domain lifecycle;
- deterministic hostname normalization and pinned Public Suffix List handling;
- one forward migration with RLS, grants, server-only commands and audit evidence;
- ownership, DNS, provider, SSL, replacement, removal and reconciliation contracts;
- exact-hostname Cloudflare adapter with generation-bound metadata;
- active-domain public resolution with no request-time legacy fallback;
- canonical redirect before SSR;
- tenant and Super Admin operational surfaces;
- deterministic DCA-01 tests and operational runbooks.

Repository acceptance did not prove the compiled Worker integration. The later exact-build runtime preflight is therefore authoritative for Worker reachability.

## Worker runtime preflight evidence

The exact build from `main@9157f1e19e455d20b8272951bed25eb8ddd0572d` produced a valid Nitro Cloudflare Worker artifact but proved:

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
```

This evidence invalidates the prior assumption that source presence alone proved a platform-native scheduler. DCA-01 cannot continue to external proof while the compiled scheduler is unreachable or the request boundary lacks authoritative Cloudflare runtime context.

## WRI-01 accepted repository evidence

PR #70 repaired the compiled-runtime defect while preserving Strategy A. The exact final implementation HEAD `8d03b1cc4fcf023224fc198f897008905956b5d6`, now merged as `81bfd7ba821187861dd1e183ac1c99198afdd43e`, proved:

```text
WRI01_WORKFLOW_RUN = 31051976386
RELEASE_GATE_RUN = 31051976436
PRM2_GATE_RUN = 31051978946
FROZEN_INSTALL = passed
WRI01_DETERMINISTIC_ASSERTIONS = 57
DCA01_REGRESSION_ASSERTIONS = 174
EXACT_BUILD = passed
TYPECHECK = passed
WRANGLER_DRY_RUN_EXIT_CODE = 0
WORKER_ENTRY = dist/server/index.mjs
STATIC_ASSETS = dist/client
DEFAULT_EXPORT_COUNT = 1
FETCH_REACHABLE = true
SCHEDULED_REACHABLE = true
CLOUDFLARE_SCHEDULED_HOOK_REACHABLE = true
SERVER_UNCOMPRESSED_BYTES = 8796620
SERVER_TEXT_GZIP_BYTES = 1854205
REACHABLE_MODULE_COUNT = 355
LOCAL_WORKERD_READY = true
FETCH_CONTEXT_NEGATIVE_PATH_PROVED = true
FAIL_CLOSED_SCHEDULED_NEGATIVE_PATH_PROVED = true
ZERO_ORPHAN_PROCESSES_PROVED = true
```

Repository acceptance does not authorize deploy, managed migration, DNS, route, remote Cron Trigger, fallback-origin activation, Custom Hostname creation or DCA-01 external proof.

## WRI-01 architecture decision

WRI-01 selects one architecture:

```text
BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
DEPLOY_AUTHORITY = versioned wrangler.jsonc
REQUEST_BOUNDARY = src/server.ts::fetch
SCHEDULED_BOUNDARY = src/server.ts::scheduled
RUNTIME_BRIDGE = one Nitro Cloudflare runtime-context and scheduled-hook bridge
```

Rejected strategies:

- replacing Nitro with `@cloudflare/vite-plugin` inside WRI-01, because it changes the validated build and Lovable preview authority;
- running Nitro and the Cloudflare Vite plugin in parallel, because that creates dual Worker, assets, bindings and deploy authorities.

The official Cloudflare Vite plugin may be reconsidered only through a new explicit architecture decision if the selected Nitro strategy cannot pass compiled-bundle and workerd tests.

## Cloudflare non-production boundary

Operator-supplied context:

```text
CLOUDFLARE_ZONE_NAME = mrrod.com.br
CLOUDFLARE_FOR_SAAS_ENABLED = true
CLOUDFLARE_RUNTIME_SECRET_NAME = CLOUDFLARE_API_TOKEN_DCA01_HML
FALLBACK_ORIGIN_CONFIGURED = false
```

Account and zone IDs are transport inputs, not tenant or provider authority. They must be revalidated by the server/provider boundary before mutation.

The `mrrod.com.br` zone is conditionally acceptable only for controlled non-production proof with these no-Worker exclusions established before any wildcard route:

```text
mrrod.com.br/*
www.mrrod.com.br/*
notify.mrrod.com.br/*
```

Planned Worker route:

```text
*/* → rm-prime-wri01-hml
```

Planned fallback origin:

```text
fallback.mrrod.com.br AAAA 100:: — proxied, originless
```

No route, DNS record, fallback origin or Custom Hostname is authorized by this planning state.

## Same-Backend Homologation Cell

The Same-Backend Homologation Cell remains binding:

- no external Supabase fallback;
- no tenant default;
- no mutation of the `RM Prime Imóveis` tenant during WRI-01;
- one explicitly selected technical tenant for later controlled proof;
- preview and published environments continue to share the canonical backend;
- WRI-01 does not authorize the DCA managed migration.

## Executable sequence

```text
PR-M2 — Accepted / Merged / Closed
→ DCA-01 planning — Accepted / Merged / Closed
→ DCA-01 repository implementation — Accepted / Merged / Closed
→ DCA-01 Worker Runtime Preflight — Rejected
→ WRI-01 planning — Accepted / Merged / Closed
→ WRI-01 implementation — Accepted / Merged / Closed
→ repository runtime audit — Accepted
→ redirected Wrangler configuration correction — PR #72 Accepted / Merged / Closed
→ terminal post-correction documentation reconciliation — completed
→ SPR-01 managed secret provisioning planning — Accepted / Merged / Closed; PR #75
→ SPR-01 implementation — Rejected; implementation budget 2/2 consumed; zero files changed
→ SPR-02 Managed Secret Provisioning Replacement Path Planning — Accepted / Merged / Closed; PR #77
→ SPR-02 implementation capability gate — historical Accepted
→ SPR-02 principal implementation — Rejected; principal consumed; zero GitHub implementation files; Supabase residue preserved; zero Cloudflare mutation
→ SPR-03 Worker Bootstrap & Managed Secret Provisioning Recovery Planning — Accepted / Merged / Closed; PR #81
→ SPR-03 implementation capability gate — prior Blocked External snapshot reconciled by PR #83
→ SPR-02 credential teardown confirmed + direct Cloudflare read-only connection established
→ same SPR-03 implementation capability gate revalidated — Accepted
→ SPR-03 principal implementation — Authorized / Not Started; budget 0/2 consumed
→ controlled first synthetic Worker deployment with zero public/scheduled ingress
→ inactive canary and final secret-bearing Versions
→ temporary provisioner teardown
→ DCA-01 external proof only after terminal SPR-03 acceptance and separate authorization
→ no automatic successor
→ BCA-01 only after DCA-01 Accepted and explicit authorization
→ PR-M3 only after BCA-01 Accepted
→ Release Candidate
→ TH-M1
→ TH-M2
→ LSV-03
→ Formal Homologation
→ Production
```

## SPR-01 historical managed secret provisioning strategy

The DCA-01 controlled external proof is blocked by an operational custody gap, not by the repaired WRI-01 runtime. The Product Owner has no direct Supabase dashboard access and may not receive or transport `SUPABASE_SERVICE_ROLE_KEY`.

SPR-01 planning selected this historical path:

```text
GitHub exact source artifact
→ undeployed Cloudflare Worker resource
→ exact inactive source version
→ one-shot Lovable Edge Function
→ complete inactive canary and secret-bearing versions
→ deployment count remains zero
→ bridge capability disablement and provisioner-token revocation
```

The Edge Function transfer primitive became non-executable under the active Lovable executor policy for this TanStack Start project, and the SPR-01 implementation is terminally `Rejected` after consuming its principal and consolidated corrective prompts with zero repository files changed.

The temporary `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` was revoked at Cloudflare and removed from Lovable Secrets. It must not be reused.

The earlier assumption that the absent Worker resource could begin with an undeployed Version is now superseded by SPR-03 planning after direct verification of current Cloudflare first-upload semantics.

## SPR-02 historical replacement authority and terminal implementation audit

SPR-02 planning selected:

```text
SPR02_SELECTED_STRATEGY = Strategy A
SPR02_SELECTED_PRIMITIVE = authenticated TanStack server route + server-only helper
APPLICATION_RUNTIME_AUTHORITY = existing Lovable Cloud TanStack Start / Nitro server runtime
SUPABASE_SECRET_CUSTODIAN = existing managed application server environment
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
NEW_SUPABASE_EDGE_FUNCTION = prohibited
SECOND_APPLICATION_RUNTIME = prohibited
EXTERNAL_SUPABASE_FALLBACK = prohibited
```

SPR-02 planning remains Accepted / Merged / Closed. Its implementation capability gate is preserved as a historical snapshot of the server-route/executor capability that was proven at the time.

The principal implementation is terminally Rejected because direct audit found independent implementation defects, including:

- no GitHub implementation PR/branch materialized as required;
- repository scope drift in the Lovable workspace;
- two durable Supabase migration-history records instead of the planned single migration;
- no canary mutation implementation;
- no final secret-bearing Version mutation implementation;
- unreachable `completed` path;
- semantic gate weaker than the frozen official-contract requirement.

The implementation stopped before Cloudflare mutation, so no Worker, Version or deployment exists. The Supabase residue is preserved fail-closed and must not be hidden or manually removed from migration history.

The old `TARGET_WORKER_DEPLOYMENT_COUNT = 0 from resource birth` assumption is superseded only by the SPR-03 selected bootstrap strategy. No other SPR-02 security invariant is revived as implementation authority.

Historical planning artifacts remain:

```text
docs/architecture/impact-analysis/SPR-02-managed-secret-provisioning-replacement-path-impact-analysis.md
docs/architecture/governance/SPR-02-managed-secret-provisioning-replacement-execution-envelope.md
```

## SPR-03 worker bootstrap and managed secret recovery authority

SPR-03 planning is Accepted / Merged / Closed through protected PR #81 and merge `9deced9acede14192dcf794cc8bff3cbe02e8c54`. Its exact audited planning HEAD is `4fc1372604f703600f3722f868e89c19339fbca9`.

SPR-03 selects exactly one recovery architecture:

```text
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_SELECTED_PRIMITIVE = controlled first Wrangler deployment with zero ingress, followed by version-only canary and final secret-bearing inactive version
SPR03_RESIDUE_STRATEGY = R2 — Forward Historical Parity Materialization
TARGET_WORKER = rm-prime-wri01-hml
DEPLOY_AUTHORITY = versioned wrangler.jsonc only
APPLICATION_RUNTIME_AUTHORITY = existing TanStack Start / Nitro runtime only
SECOND_DEPLOY_AUTHORITY = prohibited
SECOND_APPLICATION_RUNTIME = prohibited
EXTERNAL_SUPABASE_FALLBACK = prohibited
```

Current official Cloudflare semantics establish that `wrangler versions upload` / the Version API can upload a new Version without deployment only after the Worker resource exists; the first Worker creation requires the initial deployment lifecycle. Cloudflare also documents `workers_dev = false`, explicit `preview_urls = false`, and route-free configuration as mechanisms for keeping Internet HTTP ingress absent.

The current `wrangler.jsonc` is not bootstrap-safe because it has `workers_dev: true` and Cron `*/5 * * * *`. The authorized SPR-03 implementation may change only activation-facing settings necessary to make the first deployment safe while preserving WRI-01 build/runtime authority.

The selected pre-DCA bootstrap invariant is:

```text
BOOTSTRAP_DEPLOYMENT_COUNT = exactly 1 after bootstrap
BOOTSTRAP_DEPLOYED_VERSION_SECRET_COUNT = 0
WORKERS_DEV_ENABLED = false
PREVIEW_URLS_ENABLED = false
CUSTOM_ROUTE_COUNT = 0
CRON_COUNT = 0
PUBLIC_HTTP_INGRESS = 0
SCHEDULED_INGRESS = 0
FINAL_SECRET_VERSION_DEPLOYED = false
DCA01_EXTERNAL_PROOF_STARTED = false
```

The safe SPR-02 Supabase residue is preserved. Before any future database migration, repository parity must represent both already-applied migration records without manual migration-ledger mutation or replay.

Planning artifacts:

```text
docs/architecture/impact-analysis/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-impact-analysis.md
docs/architecture/governance/SPR-03-worker-bootstrap-managed-secret-provisioning-recovery-execution-envelope.md
```

SPR-03 planning itself authorized no implementation, deploy, database mutation, Worker Version upload, DNS, route, Cron, fallback origin, Custom Hostname, DCA-01 external proof, BCA-01 or PR-M3.

The separate SPR-03 implementation capability gate is now **Accepted** after direct GitHub revalidation, Owner-confirmed teardown of the rejected SPR-02 provisioner, and direct read-only Cloudflare API MCP observation. Current provider state proves one authoritative account, target Worker absent, zero target deployment/version materialization, zero Worker Routes, zero Custom Domains/Custom Hostnames, zero target Cron materialization and absent fallback origin across the three account zones. `workers.dev` and Preview ingress are recorded as absent because the target Worker does not yet exist, not as a synthetic disabled state. The SPR-03 principal implementation is therefore authorized but not started; budget remains `0/2 consumed`.

## Permanent invariants

- Server is the sole tenant, domain, authorization, storage and commercial authority.
- Client headers, hostnames, paths, account IDs, zone IDs and provider statuses are never authority.
- Ambiguity fails fast and closed.
- Super Admin tenant-scoped mutation requires explicit impersonation.
- No heuristic fallback, default tenant, dual path or first-row authority.
- Only active domain rows are publicly authoritative after cutover.
- External DNS, provider and SSL success require independent observation.
- Provider secrets remain outside database, client payloads, docs and logs.
- A platform-native scheduler must be reachable in the compiled Worker, not merely present in source.
- One build pipeline, one Worker entry, one assets authority and one deploy configuration are mandatory.
- Same-Backend Homologation Cell remains binding.
- Fases 2, 3 and 4, LSH-01, LSV-01, LSV-02 and LSR-01 remain closed or superseded and must not be reopened.

## Historical authority

The PR-M2 terminal roadmap is preserved at commit `fad8874bfeef85683445f52d21611e7d8760c1a0`.

The original rejected DCA-01 planning submission remains historical at `b6974aaccc11fbc4118a2af8c15320e2e665233e`. Corrected DCA-01 planning was merged at `623f94f98174478af19b130cda9896c64f256f14`; repository implementation was merged at `e807b76f4428dd34fbdb01a9e547a8dd8c90f68b`; the Worker runtime defect was confirmed against `9157f1e19e455d20b8272951bed25eb8ddd0572d`.

## WRI-01 protected planning merge reconciliation

```text
AUTHORITY_SCOPE = historical_planning_snapshot
WRI01_PLANNING_STATE = Accepted / Merged / Closed
WRI01_PLANNING_PR = 68
WRI01_PLANNING_HEAD = 750aa95b24262021a73a3a37e06fdbcc3bd3f196
WRI01_PLANNING_MERGE_SHA = a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca
WRI01_PLANNING_AUDIT = Accepted
WRI01_SELECTED_STRATEGY = Strategy A
WRI01_IMPLEMENTATION_STATE = Planned — Blocked pending explicit Product Owner authorization
WRI01_IMPLEMENTATION_AUTHORIZED = false
WRI01_IMPLEMENTATION_STARTED = false
DCA01_CURRENT_STATE_AT_WRI01_PLANNING = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
NEXT_STAGE_AUTHORIZED = none without explicit Product Owner authorization
BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
```

## Protected exact-head merge and post-merge reconciliation

```text
AUTHORITY_SCOPE = historical_wri01_merge_snapshot
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

Custom Hostname and Fallback Origin remain unproved and unconfigured. This historical WRI-01 merge snapshot authorized no deploy, managed migration, DNS, Worker Route, remote Cron Trigger, provider API operation, DCA-01 external proof, BCA-01 or PR-M3.

## WRI-01 terminal post-correction authority

```text
AUTHORITY_SCOPE = historical_wri01_post_correction_snapshot
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
PR72_CORRECTION_REQUIRED = false
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
NEXT_STAGE_AUTHORIZED = historical only
NO_AUTOMATIC_SUCCESSOR = true
```

## SPR-02 protected planning merge reconciliation

```text
AUTHORITY_SCOPE = historical_planning_reconciliation
SPR02_PLANNING_BASELINE_MAIN = 9d7e81a519a16c7365db177dcbd8748df4c84708
SPR02_PLANNING_PR = 77
SPR02_PLANNING_HEAD = 61f7368266052ca21ae8dbb2b98fa6a564b61543
SPR02_PLANNING_MERGE_SHA = ae1e8fdf344ca6757b0aef15edbeda65ea0d42f5
SPR02_PLANNING_AUDIT = Accepted
SPR02_PLANNING_STATE = Accepted / Merged / Closed
SPR02_SELECTED_STRATEGY = Strategy A
SPR02_SELECTED_PRIMITIVE = authenticated TanStack server route + server-only helper
SPR02_IMPLEMENTATION_AUTHORIZED = false
SPR02_IMPLEMENTATION_STARTED = false
SPR02_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = historical SPR-02 capability gate only
NO_AUTOMATIC_SUCCESSOR = true
```

## SPR-02 implementation gate reconciliation

```text
AUTHORITY_SCOPE = historical_execution_gate
SPR02_IMPLEMENTATION_GATE_BASELINE = d0f120d9ffad018a9d1d944cf34e3266c8ca5c71
SPR02_IMPLEMENTATION_GATE = Accepted
SPR02_STRATEGY_A_EXECUTABLE = true for server-route primitive only
SPR02_RUNTIME_PRIMITIVE_AVAILABLE = true
SPR02_REQUIRED_SERVER_ENV_AVAILABLE = true
SPR02_SECOND_RUNTIME_REQUIRED = false
SPR02_CAPABILITY_MISMATCH_EXCEPTION_USED = false
SPR02_IMPLEMENTATION_PROMPT_BUDGET_AT_GATE = 0/2 consumed
SPR02_TEMPORARY_PROVISIONER_REQUIRED = true
SPR02_PROVISIONER_PERMISSION = Workers Scripts Edit only
SPR02_PROVISIONER_ACCOUNT_SETTINGS_READ = not_granted
SPR02_PROVISIONER_ZONE_PERMISSIONS = none
SPR02_IMPLEMENTATION_AUTHORIZED_AT_GATE = true
SPR02_IMPLEMENTATION_STARTED_AT_GATE = false
NEXT_STAGE_AUTHORIZED_AT_GATE = SPR-02 principal implementation
NO_AUTOMATIC_SUCCESSOR = true
```

This gate remains historical evidence only. It did not prove that a first version-only upload could create an absent Worker resource.

## SPR-02 principal implementation terminal audit

```text
AUTHORITY_SCOPE = terminal_spr02_implementation_audit
SPR02_PRINCIPAL_IMPLEMENTATION_AUDIT = Rejected
SPR02_IMPLEMENTATION_STATE = Rejected
SPR02_IMPLEMENTATION_PRINCIPAL_PROMPT = consumed
SPR02_IMPLEMENTATION_PROMPT_BUDGET = 1/2 consumed
SPR02_CONSOLIDATED_CORRECTIVE = unused
SPR02_CONSOLIDATED_CORRECTIVE_AUTHORIZED = false
SPR02_CAPABILITY_MISMATCH_EXCEPTION = not_applicable
SPR02_GITHUB_IMPLEMENTATION_PR = none
SPR02_GITHUB_IMPLEMENTATION_FILES = 0
SPR02_CLOUDFLARE_MUTATIONS = 0
SPR02_SECRET_VALUE_EXPOSED = false
SPR02_SUPABASE_MUTATION_OCCURRED = true
SPR02_APPLIED_MIGRATION_RECORD_COUNT = 2
SPR02_TARGET_WORKER_EXISTS = false
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = SPR-03 planning only
NO_AUTOMATIC_SUCCESSOR = true
```

## SPR-03 protected planning merge reconciliation

```text
AUTHORITY_SCOPE = current_spr03_planning_terminal
SPR03_PLANNING_BASELINE_MAIN = b430b6cb5033cec66902031394b7cb4406206c81
SPR03_PLANNING_BRANCH = agent/spr-03-worker-bootstrap-managed-secret-recovery-planning
SPR03_PLANNING_PR = 81
SPR03_PLANNING_HEAD = 4fc1372604f703600f3722f868e89c19339fbca9
SPR03_PLANNING_MERGE_SHA = 9deced9acede14192dcf794cc8bff3cbe02e8c54
SPR03_PLANNING_AUDIT = Accepted
SPR03_PLANNING_STATE = Accepted / Merged / Closed
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_SELECTED_PRIMITIVE = controlled first Wrangler deployment with zero ingress, followed by version-only canary and final secret-bearing inactive version
SPR03_RESIDUE_STRATEGY = R2 — Forward Historical Parity Materialization
SPR03_IMPLEMENTATION_AUTHORIZED = false
SPR03_IMPLEMENTATION_STARTED = false
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
SPR03_THIRD_IMPLEMENTATION_PROMPT = prohibited
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = SPR-03 implementation capability gate and direct audit only
NO_AUTOMATIC_SUCCESSOR = true
```

## SPR-03 implementation capability gate

```text
AUTHORITY_SCOPE = current_spr03_capability_gate
SPR03_IMPLEMENTATION_GATE = Accepted
SPR03_STATIC_CLOUDFLARE_CAPABILITIES = Accepted
SPR03_GITHUB_CAPABILITY_STATE = Accepted
SPR03_SUPABASE_RESIDUE_CAPABILITY_STATE = Accepted
SPR03_CURRENT_CLOUDFLARE_ACCOUNT_STATE = Accepted / resolved
SPR03_DIRECT_CLOUDFLARE_CONNECTION_AVAILABLE = true
SPR03_SPR02_TOKEN_TEARDOWN_CONFIRMED = true
SPR03_CLOUDFLARE_ACCOUNT_CARDINALITY = 1
SPR03_TARGET_WORKER_EXISTS = false
SPR03_TARGET_WORKER_DEPLOYMENT_COUNT = 0 because target absent
SPR03_TARGET_WORKER_VERSION_COUNT = 0 because target absent
SPR03_CURRENT_WORKERS_DEV_INGRESS = absent because target absent
SPR03_CURRENT_PREVIEW_INGRESS = absent because target absent
SPR03_CURRENT_CUSTOM_ROUTE_COUNT = 0 across all 3 account zones
SPR03_CURRENT_CRON_COUNT = 0 because target absent
SPR03_CURRENT_CUSTOM_DOMAIN_COUNT = 0
SPR03_CURRENT_CUSTOM_HOSTNAME_COUNT = 0 across all 3 account zones
SPR03_CURRENT_FALLBACK_ORIGIN_STATE = absent across all 3 account zones
SPR03_IMPLEMENTATION_AUTHORIZED = true
SPR03_IMPLEMENTATION_STARTED = false
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
CAPABILITY_MISMATCH_EXCEPTION_USED = false
DATABASE_MUTATION_BY_GATE = 0
CLOUDFLARE_MUTATION_BY_GATE = 0
RUNTIME_CHANGE_BY_GATE = 0
SECRET_EXPOSED = false
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = SPR-03 principal implementation under frozen Strategy D + R2 Execution Envelope
NO_AUTOMATIC_SUCCESSOR = true
```

The two prior external prerequisites are satisfied: the rejected SPR-02 provisioner teardown was confirmed by the Product Owner, and the direct official Cloudflare API MCP connection independently re-observed the current account/Worker/ingress state. The capability gate itself executed no Cloudflare mutation and consumed no implementation prompt budget.
