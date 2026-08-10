# WRI-01 — Cloudflare Worker Runtime Integration Evidence

## Status

**Accepted / Merged / Closed; principal implementation PR #70 and redirected-Wrangler correction PR #72 merged**

```text
STAGE_ID = WRI-01
SELECTED_STRATEGY = Strategy A
IMPLEMENTATION_BASELINE_MAIN = fc7ceb19a7389364aa69c5d5b6f33c8b478d3625
IMPLEMENTATION_PR = 70
IMPLEMENTATION_BRANCH = agent/wri-01-cloudflare-worker-runtime
IMPLEMENTATION_CODE_HEAD = cba0d1756d596c44b993b95e8288ea4474b326a0
IMPLEMENTATION_HEAD = 8d03b1cc4fcf023224fc198f897008905956b5d6
IMPLEMENTATION_MERGE_SHA = 81bfd7ba821187861dd1e183ac1c99198afdd43e
POST_MERGE_RECONCILIATION = completed
PRIOR_POST_MERGE_RECONCILIATION_PR = 71
PRIOR_POST_MERGE_RECONCILIATION_SHA = 7d24bc22346a664b846c8345ffe172d73f52f11b
CORRECTION_STATE = Accepted / Merged / Closed
CORRECTION_PR = 72
CORRECTION_HEAD = 61893694c00ceb846d3de3e0cf6862c94dc386a4
CORRECTION_MERGE_SHA = 2d4074e7aec0f8fb7d9bdedd0a84c813ac8ac29a
CORRECTION_AUDIT = Accepted
POST_CORRECTION_RECONCILIATION = completed
PR72_CORRECTION_REQUIRED = false
IMPLEMENTATION_STATE = Accepted / Merged / Closed
IMPLEMENTATION_AUDIT = Accepted
PR_OPEN = false
PR_DRAFT = false
PR_MERGED = true
AUTO_MERGE_ENABLED = false
PRODUCT_OWNER_MERGE_AUTHORIZATION_REQUIRED = false
```

## 1. Scope and ancestry

Direct GitHub comparison proved that the final implementation HEAD `8d03b1cc4fcf023224fc198f897008905956b5d6` descended directly from `main@fc7ceb19a7389364aa69c5d5b6f33c8b478d3625`, was `45` commits ahead and `0` behind, changed only WRI-01 `FILES_ALLOWED` paths, and was merged by protected squash as `81bfd7ba821187861dd1e183ac1c99198afdd43e`.

The implementation preserves:

- `@lovable.dev/vite-tanstack-config`;
- Nitro `cloudflare-module`;
- exactly one Worker runtime pipeline;
- exactly one Worker default export;
- exactly one assets binding authority (`ASSETS`);
- exactly one bindings authority;
- exactly one request-scoped runtime-context bridge;
- exactly one `cloudflare:scheduled` consumer;
- one versioned Wrangler authority;
- empty root and generated redirected-config `routes` arrays;
- no named Wrangler `env` in either root or generated redirected configuration.

`@cloudflare/vite-plugin`, account ID, zone ID, secret values, second Worker entry, application scheduler route and production route are absent.

## 2. Exact-head workflows

```text
WRI01_WORKFLOW_RUN_ID = 31051976386
WRI01_WORKFLOW_JOB_ID = 92460979627
WRI01_WORKFLOW_RESULT = success

RELEASE_GATE_RUN_ID = 31051976436
RELEASE_GATE_RESULT = success

PRM2_GATE_RUN_ID = 31051978946
PRM2_READY_TRANSITION_GATE_RUN_ID = 31052697910
PRM2_GATE_RESULT = success
```

All required runs targeted `8d03b1cc4fcf023224fc198f897008905956b5d6`. The additional Ready for Review transition gate `31052697910` also succeeded on that exact HEAD before merge. No result from another HEAD was combined.

## 3. Deterministic and compiled evidence

```text
FROZEN_INSTALL = success
WRI01_DETERMINISTIC_ASSERTIONS = 57
DCA01_REGRESSION_ASSERTIONS = 174
EXACT_PRODUCTION_BUILD = success
TYPECHECK_AFTER_ROUTE_GENERATION = success
COMPILED_BUNDLE_AUDIT = success
WRANGLER_DRY_RUN_EXIT_CODE = 0

WORKER_ENTRY = dist/server/index.mjs
STATIC_ASSETS = dist/client
SERVER_FILE_COUNT = 389
MODULE_COUNT = 388
REACHABLE_MODULE_COUNT = 355
SERVER_UNCOMPRESSED_BYTES = 8796620
SERVER_TEXT_GZIP_BYTES = 1854205
CLIENT_FILE_COUNT = 156
CLIENT_BYTES = 3636269

DEFAULT_EXPORT_COUNT = 1
FETCH_REACHABLE = true
SCHEDULED_REACHABLE = true
CLOUDFLARE_SCHEDULED_HOOK_REACHABLE = true
FAIL_CLOSED_CONTEXT_REACHABLE = true
DCA_SCHEDULED_DELEGATE_REACHABLE = true
CLOUDFLARE_VITE_PLUGIN_ABSENT = true
ROOT_ROUTES_EMPTY = true
ROOT_ENV_ABSENT = true
GENERATED_ROUTES_EMPTY = true
GENERATED_ENV_ABSENT = true
CRON_EXPRESSION_MATCH = true
```

## 4. Local workerd proof

The workflow started Wrangler `4.114.0` and its local `workerd` process in a dedicated process group, detected readiness from the Wrangler log, exercised the development-only scheduled endpoint and terminated the entire group.

```text
COMPATIBILITY_DATE = 2026-07-29
READY = true
READY_SOURCE = wrangler_log
PROCESS_EXITED_BEFORE_READY = false
FETCH_HTTP_CODE = 503
FETCH_CURL_EXIT_CODE = 0
FETCH_CONTEXT_NEGATIVE_PATH_PROVED = true
SCHEDULED_ENDPOINT = /cdn-cgi/handler/scheduled
SCHEDULED_HTTP_CODE = 500
SCHEDULED_CURL_EXIT_CODE = 0
SCHEDULED_FAILED_CLOSED_LOG = true
OUTCOME_EXCEPTION = true
FAIL_CLOSED_SCHEDULED_NEGATIVE_PATH_PROVED = true
NEGATIVE_PATH_DEPENDENCY = SUPABASE_URL_http_127.0.0.1_port_9
PROCESS_GROUP_CAPTURED = true
TERMINATION_SIGNAL_SENT = true
TERMINATION_ESCALATED_TO_KILL = false
PROCESS_GROUP_MEMBER_COUNT_AFTER_TERMINATION = 0
WORKERD_RESIDUAL_COUNT_AFTER_TERMINATION = 0
ZERO_ORPHAN_PROCESSES_PROVED = true
WRANGLER_EXIT_CODE_AFTER_TERMINATION = 143
```

The HTTP `500` is accepted only together with the DCA-01 fail-closed log and Wrangler `{"outcome":"exception"}` response caused by the deliberately unreachable local backend. Absence of the scheduled event is not accepted.

The historical failure at run `31049376522`, job `92452707102`, was caused exactly by `compatibility_date = 2026-08-05` exceeding the pinned workerd ceiling `2026-07-29`. The final version pins the tested ceiling and passes.

## 5. External-operation boundary

```text
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
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
```

The prior provider observation `Pending Deployment (Error)` is not resolved by repository evidence. A later, separately authorized external execution must directly confirm or remove the failed fallback designation, establish the required originless fallback and routes in order, and only then prove a Custom Hostname.

## 6. Decision

WRI-01 repository implementation is Accepted / Merged / Closed. Its protected merge does not authorize deploy, external provider mutation or any successor stage.

## 7. Protected exact-head merge reconciliation

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

## 8. Terminal post-correction evidence

PR #72 preserves the accepted Strategy A runtime and corrects only the redirected Wrangler configuration and root dry-run parity. The PowerShell proof ran on the exact correction merge HEAD in an isolated clone and did not alter the owner's preserved clone or its generated route-tree diagnostic state.

```text
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
BCA01_STARTED = false
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none
NO_AUTOMATIC_SUCCESSOR = true
```

WRI-01 is terminally reconciled. SPR-01 managed secret provisioning planning is the next prerequisite workstream. DCA-01 Controlled External Proof remains unstarted and blocked until SPR-01 is terminally Accepted and its first controlled `workers.dev` proof receives separate authorization.
