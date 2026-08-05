# WRI-01 — Cloudflare Worker Runtime Integration Evidence

## Status

**Accepted — Ready for Product Owner Merge Decision; PR #70 open, draft and unmerged**

```text
STAGE_ID = WRI-01
SELECTED_STRATEGY = Strategy A
IMPLEMENTATION_BASELINE_MAIN = fc7ceb19a7389364aa69c5d5b6f33c8b478d3625
IMPLEMENTATION_PR = 70
IMPLEMENTATION_BRANCH = agent/wri-01-cloudflare-worker-runtime
IMPLEMENTATION_CODE_HEAD = cba0d1756d596c44b993b95e8288ea4474b326a0
IMPLEMENTATION_STATE = Accepted — Ready for Product Owner Merge Decision
IMPLEMENTATION_AUDIT = Accepted
PR_OPEN = true
PR_DRAFT = true
PR_MERGED = false
AUTO_MERGE_ENABLED = false
PRODUCT_OWNER_MERGE_AUTHORIZATION_REQUIRED = true
```

## 1. Scope and ancestry

Direct GitHub comparison proved that `main` remained at `fc7ceb19a7389364aa69c5d5b6f33c8b478d3625`. The implementation code HEAD is directly descended from that baseline, was `44` commits ahead and `0` behind before this documentation reconciliation, and changed only WRI-01 `FILES_ALLOWED` paths.

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
- empty root and homologation `routes` arrays.

`@cloudflare/vite-plugin`, account ID, zone ID, secret values, second Worker entry, application scheduler route and production route are absent.

## 2. Exact-head workflows

```text
WRI01_WORKFLOW_RUN_ID = 31051403004
WRI01_WORKFLOW_JOB_ID = 92459212226
WRI01_WORKFLOW_RESULT = success

RELEASE_GATE_RUN_ID = 31051402682
RELEASE_GATE_RESULT = success

PRM2_GATE_RUN_ID = 31051402593
PRM2_GATE_RESULT = success
```

All three runs targeted `cba0d1756d596c44b993b95e8288ea4474b326a0`. No result from another HEAD was combined.

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
SERVER_UNCOMPRESSED_BYTES = 8797258
SERVER_TEXT_GZIP_BYTES = 1855352
CLIENT_FILE_COUNT = 157
CLIENT_BYTES = 3636859

DEFAULT_EXPORT_COUNT = 1
FETCH_REACHABLE = true
SCHEDULED_REACHABLE = true
CLOUDFLARE_SCHEDULED_HOOK_REACHABLE = true
FAIL_CLOSED_CONTEXT_REACHABLE = true
DCA_SCHEDULED_DELEGATE_REACHABLE = true
CLOUDFLARE_VITE_PLUGIN_ABSENT = true
ROOT_ROUTES_EMPTY = true
HOMOLOGATION_ROUTES_EMPTY = true
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

WRI-01 repository implementation is Accepted and ready for the protected Product Owner merge decision. Acceptance does not authorize merge, deploy or any successor stage by itself.
