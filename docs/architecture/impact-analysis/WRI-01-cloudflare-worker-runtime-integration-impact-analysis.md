# WRI-01 — Cloudflare Worker Runtime Integration Impact Analysis

## Status

**Planned — Architecture First / planning-only**

```text
STAGE_ID = WRI-01
STAGE_NAME = Cloudflare Worker Runtime Integration
STAGE_TYPE = finite_runtime_integration_recovery_gate
PLANNING_BASELINE_MAIN = 9157f1e19e455d20b8272951bed25eb8ddd0572d
PREDECESSOR = DCA-01 Worker Runtime Preflight — Rejected
IMPLEMENTATION_STARTED = false
DEPLOY_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
FALLBACK_ORIGIN_ACTIVATED = false
```

## 1. Executive decision

WRI-01 selects one build and runtime architecture:

> **Strategy A — preserve `@lovable.dev/vite-tanstack-config` and the Nitro `cloudflare-module` preset, then add one narrow Cloudflare runtime bridge and one versioned Wrangler authority.**

Strategy B, which disables Nitro and migrates the application to `@cloudflare/vite-plugin`, is rejected for WRI-01 because it replaces the validated build authority, changes Lovable preview/build behavior, and expands the regression surface beyond the two compiled-runtime defects actually proven.

Strategy C, a parallel or hybrid Nitro plus Cloudflare Vite pipeline, is rejected because it would create two Worker entries, two asset authorities, two binding authorities and potentially two deploy outputs.

Strategy B may be reconsidered only through a new architecture decision if Strategy A cannot pass bundle-level and workerd tests without private or unstable framework internals.

## 2. Binding factual evidence

The exact build was executed from `main@9157f1e19e455d20b8272951bed25eb8ddd0572d` in a detached temporary worktree.

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

The compiled bundle is the runtime authority. Source-level function presence is not sufficient evidence of platform reachability.

## 3. Permanent invariants

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_PROVIDER_AUTHORITY = true
SERVER_IS_STATE_TRANSITION_AUTHORITY = true

SAME_BACKEND_HOMOLOGATION_CELL = binding

CLIENT_TENANT_AUTHORITY = false
CLIENT_PROVIDER_ID_AUTHORITY = false
CLIENT_DNS_SUCCESS_AUTHORITY = false
CLIENT_SSL_SUCCESS_AUTHORITY = false

REQUEST_TIME_DUAL_AUTHORITY = prohibited
TENANT_DEFAULT = prohibited
HEURISTIC_FALLBACK = prohibited
SILENT_MODE_FALLBACK = prohibited
PUBLIC_HTTP_CRON = prohibited
PLATFORM_NATIVE_SCHEDULED_EVENT = required
FAIL_FAST = true
FAIL_CLOSED = true
```

Super Admin tenant-scoped operations continue to require explicit impersonation. Account ID, zone ID, Worker route, request header, hostname and provider response are transport or evidence only, never tenant authority.

## 4. Strategy comparison

| Criterion | Strategy A — Lovable config + Nitro | Strategy B — Cloudflare Vite plugin | Strategy C — parallel/hybrid |
|---|---|---|---|
| Preserves exact validated build | Yes | No | Partially |
| Preserves Lovable preview contract | Yes | Unproven | Unproven |
| Repairs scheduler reachability | Yes, through one Nitro hook bridge | Yes, through a new custom entry | Ambiguous |
| Repairs `env`/`ctx` propagation | Yes, through one runtime-context bridge | Yes, directly | Ambiguous |
| Replaces build authority | No | Yes | Partially |
| Produces one deploy artifact | Yes | Yes | Not guaranteed |
| Blast radius | Bounded | High | Unacceptable |
| Decision | **Selected** | Rejected for WRI-01 | Rejected |

## 5. Selected build architecture

```text
source
→ @lovable.dev/vite-tanstack-config
→ TanStack Start
→ Nitro cloudflare-module
→ dist/server/index.mjs
→ versioned wrangler.jsonc
→ one Cloudflare Worker
```

The generated `dist/server/wrangler.json` is build evidence, not final deploy authority. The repository must add one root `wrangler.jsonc` and validate it against generated build metadata.

`@cloudflare/vite-plugin` must not be added while Nitro remains enabled.

## 6. Worker entry and runtime context

The top-level Nitro Worker already exposes platform-native `fetch(request, env, ctx)` and `scheduled(controller, env, ctx)`. WRI-01 must connect those handlers to the existing application boundaries without creating a second entry.

```text
TOP_LEVEL_WORKER_ENTRY = Nitro cloudflare-module default export
REQUEST_APPLICATION_BOUNDARY = src/server.ts::fetch
SCHEDULED_APPLICATION_BOUNDARY = src/server.ts::scheduled
SCHEDULED_BRIDGE = exactly one cloudflare:scheduled hook consumer
PUBLIC_HTTP_SCHEDULER = prohibited
```

### 6.1 Request path

1. Cloudflare invokes Nitro `fetch(request, env, ctx)`.
2. One WRI-01 bridge obtains the Cloudflare environment and execution context from the platform event exposed by the pinned Nitro preset.
3. The bridge installs a request-scoped `CloudflareRuntimeContext` before SSR and server functions execute.
4. `src/server.ts::fetch` uses `requireCloudflareRuntimeContext()`.
5. Missing or ambiguous context produces a sanitized `503` and never falls through to another tenant or provider mode.
6. Provider secrets and server authority use the Cloudflare binding map; `process.env` is not provider-secret authority.
7. Concurrent requests must prove runtime-context isolation.

The exact Nitro event-context shape must be proven against the pinned dependency and compiled bundle. If a stable, testable context is unavailable, Strategy A fails and implementation terminates as Rejected rather than rewriting generated files.

### 6.2 Scheduled path

1. Cloudflare invokes Nitro `scheduled(controller, env, ctx)`.
2. Nitro emits `cloudflare:scheduled`.
3. Exactly one WRI-01 plugin consumes the hook.
4. The plugin delegates the original controller, environment and execution context to `src/server.ts::scheduled`.
5. `src/server.ts::scheduled` calls `processScheduledDomainJobs({ runtimeEnv: env, limit: 20 })`.
6. The promise is registered through `ctx.waitUntil`.
7. No deployed HTTP route invokes the scheduler.

A compiled function without a registered consumer remains a failure.

## 7. Versioned Wrangler contract

The future `wrangler.jsonc` must explicitly define:

```text
name = rm-prime-wri01-hml
main = dist/server/index.mjs
assets.directory = dist/client
assets.binding = ASSETS
compatibility_flags = [nodejs_compat]
compatibility_date = pinned implementation date
observability.enabled = true
workers_dev = true
routes = [] for the initial workers.dev proof
no_bundle = true only if verified against Nitro output
rules = exact module rules required by the build
env.homologation.name = rm-prime-wri01-hml
```

No production environment or route is permitted in WRI-01.

Deterministic command chain:

```text
bun run build
→ bun run wri01:bundle-audit
→ wrangler deploy --dry-run --outdir .wri01-dry-run --env homologation
→ explicit authorized deploy only after all repository gates pass
```

Build, test, Release Gate and Lovable preview must never deploy implicitly.

## 8. Cron contract

```text
CRON_EXPRESSION = */5 * * * *
CRON_TIMEZONE = UTC
MAX_JOBS_PER_CYCLE = 20
OVERLAP_AUTHORITY = database lease and expected-version contracts
IDEMPOTENCY = persisted operation idempotency key
RETRY = existing bounded operation taxonomy
PUBLIC_HTTP_TRIGGER = false
```

Local proof uses `wrangler dev --test-scheduled`. Its development-only endpoint is not a production application route.

Remote proof must observe one real platform Cron invocation. If the DCA migration remains unauthorized, the remote event may prove reachability through a deterministic fail-closed empty/missing-boundary result; it must not fabricate job success.

Rollback disables Cron before removing routes or the Worker.

## 9. Zone routing analysis

Observed non-production SaaS zone:

```text
ZONE_NAME = mrrod.com.br
CLOUDFLARE_FOR_SAAS_ENABLED = true
FALLBACK_ORIGIN_CONFIGURED = false
```

Operator-supplied account and zone IDs must be revalidated before mutation.

A `*/*` Worker route captures custom-hostname traffic and ordinary traffic in the zone. Therefore `mrrod.com.br` is conditionally acceptable only for controlled non-production proof with all more-specific no-Worker routes active first.

Required exclusions:

```text
mrrod.com.br/* → no Worker
www.mrrod.com.br/* → no Worker
notify.mrrod.com.br/* → no Worker
```

Planned wildcard route:

```text
*/* → rm-prime-wri01-hml
```

Expected routing:

```text
fallback.mrrod.com.br/* → WRI-01 Worker
customers.mrrod.com.br/* → WRI-01 Worker
controlled Custom Hostname traffic → WRI-01 Worker
```

Any mismatch on apex, `www` or `notify` causes immediate wildcard-route rollback. A dedicated SaaS apex remains the lower-risk production architecture and requires a separate Product Owner decision.

## 10. Fallback origin contract

```text
FALLBACK_HOSTNAME = fallback.mrrod.com.br
DNS_TYPE = AAAA
DNS_CONTENT = 100::
PROXY_STATUS = proxied
OTHER_A_AAAA_CNAME_AT_HOST = prohibited
WORKER_ROUTE_REQUIRED = true
EXPECTED_FALLBACK_STATUS = active
```

The failed/pending fallback designation must be deleted or confirmed absent before creating the originless record.

Activation order:

1. capture existing DNS/routes and baseline HTTP/TLS evidence;
2. deploy Worker to `workers.dev` without zone routes;
3. prove handlers, assets, bindings and bundle limits;
4. create and verify no-Worker exclusions;
5. create proxied originless `AAAA fallback → 100::`;
6. designate the fallback origin and wait for `active`;
7. add wildcard route;
8. re-prove exclusions and controlled traffic;
9. stop before Custom Hostname creation unless a later DCA proof authorization exists.

Teardown reverses the sequence, beginning with Cron disablement and wildcard-route removal. Existing apex, `www`, `notify`, DMARC and Lovable verification records are protected.

## 11. Bundle and Cloudflare plan gates

Required command:

```text
wrangler deploy --dry-run --outdir .wri01-dry-run --env homologation
```

Required evidence:

```text
UNCOMPRESSED_UPLOAD_BYTES
GZIP_UPLOAD_BYTES
MODULE_COUNT
STARTUP_TIME_MS
ACCOUNT_PLAN_LIMIT
LIMIT_MARGIN_BYTES
```

Rules:

- read the account plan from Cloudflare; do not infer it;
- gzip size must remain below the applicable plan limit with explicit margin;
- startup time must remain below the current platform limit;
- the 8,586,058-byte uncompressed figure alone cannot pass or fail the gate;
- classify large spreadsheet, formatting and charting modules as required, client-only or removable from the server graph.

## 12. Same-Backend Homologation Cell and explicit tenant

No external Supabase project or database branch may be introduced.

The explicitly identified technical tenant candidate is:

```text
TECHNICAL_TENANT_CANDIDATE_ID = 8c9f696d-47a4-4098-a723-e281803e17ab
TECHNICAL_TENANT_CANDIDATE_NAME = SCP-012.0.2.1 harness
OBSERVED_MEMBER_COUNT = 0
OBSERVED_ACTIVE_MEMBER_COUNT = 0
CANDIDATE_AUTHORITY = false until server-side revalidation
REAL_CUSTOMER_DATA_AUTHORIZED = false
REAL_CUSTOMER_TRAFFIC_AUTHORIZED = false
```

This candidate was previously observed read-only as an existing zero-member harness tenant. Before any implementation or remote proof, the server must revalidate:

1. exact tenant ID and row cardinality;
2. zero active and total members;
3. no real customer data or traffic;
4. no domain, billing or operational authority attached;
5. explicit Super Admin impersonation boundary;
6. no concurrent use by another test gate.

Any divergence invalidates the candidate and blocks execution. Selection of a replacement tenant requires a documented read-only preflight; it must never default to `RM Prime Imóveis` or the first tenant.

The Worker must remain on `workers.dev` until route authorization and must avoid migration, DCA domain creation and production cutover during WRI-01 runtime-integration proof.

## 13. Secrets and bindings

Runtime provider reference:

```text
CREDENTIAL_REFERENCE = env:CLOUDFLARE_API_TOKEN_DCA01_HML
```

The Lovable secret is not automatically a Cloudflare Worker secret. Future deployment must provision Worker secrets without reading or printing values.

Required binding names, subject to read-only preflight:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

Distinct deployment credential:

```text
CLOUDFLARE_DEPLOY_API_TOKEN_WRI01_HML
```

Deploy and runtime-provider tokens must be separate. No secret value may enter GitHub, docs, logs, PR comments, artifacts or client bundles.

## 14. Mandatory future implementation tests

The future implementation must prove:

1. frozen install and build on exact HEAD;
2. final Worker export with reachable `fetch` and `scheduled`;
3. real `env` propagation;
4. real `ctx` propagation and functional `waitUntil`;
5. `wrangler dev --test-scheduled` invokes `processScheduledDomainJobs` once;
6. no deployed public HTTP scheduler;
7. assets served from the configured binding;
8. canonical redirect before SSR;
9. unknown host fails closed;
10. no dual authority or tenant default;
11. absent secret fails closed without disclosure;
12. gzip size within observed plan limit;
13. startup within current limit;
14. route exclusions preserve apex, `www` and `notify`;
15. wildcard route reaches only the intended Worker path;
16. rollback removes Cron, route and fallback artifacts without touching existing DNS;
17. exact technical-tenant revalidation and isolation;
18. existing Release Gate and DCA tests remain green;
19. compiled-bundle evidence, not source strings, proves reachability.

## 15. Future implementation FILES_ALLOWED

```text
vite.config.ts
package.json
bun.lock
wrangler.jsonc
src/server.ts
src/lib/runtime/cloudflare-runtime-context.server.ts
src/lib/runtime/wri-01-cloudflare-nitro-plugin.server.ts
src/types/cloudflare-runtime.d.ts
scripts/verify-wri-01-worker-bundle.mjs
scripts/verify-release.mjs
run-wri-01-cloudflare-worker-runtime-specs.ts
.github/workflows/wri-01-worker-runtime-gate.yml

docs/architecture/impact-analysis/WRI-01-cloudflare-worker-runtime-integration-impact-analysis.md
docs/architecture/governance/WRI-01-cloudflare-worker-runtime-integration-execution-envelope.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-implementation-execution.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/wri-01-implementation-execution.md
docs/operations/WRI-01-cloudflare-worker-runtime-runbook.md
```

Adding another runtime path requires a new impact analysis. Existing migrations, RLS, tenant middleware, domain state machine and provider adapter remain prohibited unless new direct evidence requires reopening them.

## 16. Rollback

Repository-only rollback is Git reversion.

External rollback order:

1. disable Cron;
2. remove wildcard Worker route;
3. verify apex, `www` and `notify` bypass the Worker;
4. remove fallback designation;
5. delete only the WRI-01 `AAAA fallback → 100::` record;
6. remove the non-production Worker;
7. preserve sanitized evidence;
8. leave the backend, tenant data and existing DNS unchanged.

No rollback may restore tenant-default or legacy request-time fallback logic.

## 17. Planning conclusion

```text
SELECTED_STRATEGY = A
SINGLE_BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
SINGLE_DEPLOY_AUTHORITY = versioned wrangler.jsonc
DCA01_CURRENT_STATE = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
WRI01_STATE = Planned
WRI01_IMPLEMENTATION_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
```

WRI-01 implementation requires direct planning acceptance, protected planning merge and separate Product Owner authorization.

## 18. Normative references

- Cloudflare Workers — TanStack Start framework guide.
- Cloudflare Workers — Cron Triggers and Scheduled Handler.
- Cloudflare for SaaS — Workers as fallback origin.
- Cloudflare Workers — Wrangler configuration and platform limits.
- Nitro Cloudflare preset and runtime hooks pinned by the repository lockfile.
