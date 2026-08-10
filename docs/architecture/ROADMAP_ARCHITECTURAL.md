# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — WRI-01 Accepted / Merged / Closed; SPR-01 planning Ready for External Audit
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
SPR01_PLANNING_STATE = Ready for External Audit
SPR01_SELECTED_STRATEGY = managed two-operator zero-deployment provisioning
SPR01_PLANNING_MERGE_AUTHORIZED = false
SPR01_IMPLEMENTATION_AUTHORIZED = false
SPR01_IMPLEMENTATION_STARTED = false
SPR01_OWNER_SERVICE_ROLE_ACCESS = false
SPR01_LOVABLE_MANAGED_BRIDGE_REQUIRED = true

BCA01_STATE = Planned — Blocked by DCA-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
DCA01_EXTERNAL_PROOF_STARTED = false
NEXT_STAGE_AUTHORIZED = none beyond direct SPR-01 planning audit
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
→ SPR-01 managed secret provisioning planning — Ready for External Audit
→ SPR-01 implementation only after protected planning merge and separate authorization
→ inactive secret-bearing Worker version with bridge disablement and token revocation
→ controlled workers.dev proof only after separate external authorization
→ controlled zone route/fallback proof only after prerequisite authorization
→ DCA-01 external proof only after WRI-01 terminal acceptance
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

## SPR-01 managed secret provisioning prerequisite

The DCA-01 controlled external proof is blocked by an operational custody gap, not by the repaired WRI-01 runtime. The Product Owner has no direct Supabase dashboard access and may not receive or transport `SUPABASE_SERVICE_ROLE_KEY`.

SPR-01 selects one managed path:

```text
GitHub exact source artifact
→ undeployed Cloudflare Worker resource
→ exact inactive source version
→ one-shot Lovable Edge Function
→ complete inactive canary and secret-bearing versions
→ deployment count remains zero
→ bridge capability disablement and provisioner-token revocation
```

Future execution must verify the resource-oriented Worker/version API against the live OpenAPI before transmitting any secret. Legacy script-secret endpoints, sequential writes and any primitive that creates a deployment are prohibited.

Lovable remains authorized and required for the later managed bridge implementation because it is the existing server-side secret custodian. This planning materialization is GitHub-native only because it changes documentation and does not need managed runtime access.

SPR-01 does not authorize Worker creation, deployment, secrets, Cron, DNS, routes, fallback origin, Custom Hostnames, migration, BCA-01 or PR-M3.

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
NEXT_STAGE_AUTHORIZED = none
NO_AUTOMATIC_SUCCESSOR = true
```

The next roadmap workstream is the direct external audit of SPR-01 planning. Its implementation requires a protected planning merge and separate Product Owner authorization. DCA-01 Controlled External Proof remains blocked and no successor is authorized by this planning materialization.
