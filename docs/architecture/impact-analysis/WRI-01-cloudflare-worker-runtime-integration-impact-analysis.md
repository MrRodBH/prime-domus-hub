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

WRI-01 adopts one build and runtime authority:

> **Strategy A — preserve `@lovable.dev/vite-tanstack-config` and the Nitro `cloudflare-module` preset, then add one narrow Cloudflare runtime bridge and one versioned Wrangler authority.**

Strategy B, which disables Nitro and migrates the application to `@cloudflare/vite-plugin`, is rejected for WRI-01 because it replaces the currently validated build authority, changes Lovable preview/build behavior, expands the regression surface beyond the proven defects, and would require a broader product-runtime migration.

Strategy C, a parallel or hybrid Nitro plus Cloudflare Vite pipeline, is rejected because it would create two Worker entries, two asset authorities, two binding authorities and potentially two deploy outputs.

The selected strategy is not permission to deploy. It is the architecture for a later implementation gate.

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

The source implementation and structural tests previously proved that `src/server.ts` contains `fetch` and `scheduled`. They did not prove that the compiled top-level Worker invokes both handlers. The compiled bundle is the runtime authority for this finding.

## 3. Authority and safety invariants

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

Super Admin tenant-scoped operations continue to require explicit impersonation. No Worker route, hostname, account ID, zone ID, request header or provider response becomes tenant authority.

## 4. Strategy comparison

| Criterion | Strategy A — Lovable config + Nitro | Strategy B — Cloudflare Vite plugin | Strategy C — parallel/hybrid |
|---|---|---|---|
| Preserves exact validated build | Yes | No | Partially |
| Preserves Lovable preview contract | Yes | Unproven | Unproven |
| Solves `scheduled` reachability | Yes, through one Nitro hook bridge | Yes, through a custom Worker entry | Potentially, but with duplicate authority |
| Solves `env`/`ctx` propagation | Yes, through one runtime-context bridge | Yes, directly in Worker entry | Ambiguous |
| Requires build-authority replacement | No | Yes | Yes/partial |
| Produces one deploy artifact | Yes | Yes | Not guaranteed |
| Architectural blast radius | Bounded | High | Unacceptable |
| Decision | **Selected** | Rejected for WRI-01 | Rejected |

Strategy B may be reconsidered only through a new explicit architecture decision if Strategy A cannot satisfy bundle-level tests without private or unstable framework internals.

## 5. Selected build architecture

The future implementation must preserve this single chain:

```text
source
→ @lovable.dev/vite-tanstack-config
→ TanStack Start
→ Nitro cloudflare-module
→ dist/server/index.mjs
→ versioned wrangler.jsonc
→ one Cloudflare Worker
```

The generated `dist/server/wrangler.json` is evidence, not final configuration authority. The repository must add one root `wrangler.jsonc` that points to the exact built entry and assets and is validated against the generated build metadata.

The Cloudflare Vite plugin must not be added while Nitro remains enabled.

## 6. Worker entry and runtime bridge

The top-level Worker exported by Nitro already has platform-native `fetch(request, env, ctx)` and `scheduled(controller, env, ctx)` handlers. WRI-01 must make the application boundaries reachable without creating a second Worker entry.

The future implementation shall provide:

```text
TOP_LEVEL_WORKER_ENTRY = Nitro cloudflare-module default export
REQUEST_APPLICATION_BOUNDARY = src/server.ts::fetch
SCHEDULED_APPLICATION_BOUNDARY = src/server.ts::scheduled
SCHEDULED_BRIDGE = one registered Nitro cloudflare:scheduled hook consumer
PUBLIC_HTTP_SCHEDULER = prohibited
```

### 6.1 Request path

1. Cloudflare invokes Nitro `fetch(request, env, ctx)`.
2. One WRI-01 runtime bridge obtains the Cloudflare `env` and `ExecutionContext` from the platform event made available by the Nitro Cloudflare preset.
3. The bridge installs a request-scoped `CloudflareRuntimeContext` before SSR/server-function execution.
4. `src/server.ts::fetch` obtains bindings through `requireCloudflareRuntimeContext()`.
5. Missing or ambiguous context returns a deterministic `503` and never falls through to another tenant or provider mode.
6. `process.env` may remain only as explicitly tested compatibility for non-secret values. Provider secrets and server authority must use the Cloudflare binding map.

The implementation must prove the exact Nitro event-context shape against the pinned package version. An undocumented property path cannot be accepted without a compiled-bundle and workerd test.

### 6.2 Scheduled path

1. Cloudflare invokes Nitro `scheduled(controller, env, ctx)`.
2. Nitro emits `cloudflare:scheduled`.
3. Exactly one WRI-01 plugin consumes that hook.
4. The plugin delegates the original controller, environment and execution context to `src/server.ts::scheduled`.
5. `src/server.ts::scheduled` calls the existing `processScheduledDomainJobs({ runtimeEnv: env, limit: 20 })` boundary.
6. The returned promise is registered through `ctx.waitUntil`.
7. No HTTP route can invoke the production scheduler.

A compiled handler without a registered hook consumer remains a failure.

## 7. Versioned Wrangler contract

The future `wrangler.jsonc` is the final deploy configuration authority and must contain:

```text
name = rm-prime-wri01-hml
main = dist/server/index.mjs
assets.directory = dist/client
assets.binding = ASSETS
compatibility_flags = [nodejs_compat]
compatibility_date = pinned implementation date
observability.enabled = true
workers_dev = true for initial preflight
no_bundle = true only if verified against Nitro output
rules = exact ES module inclusion required by the build
```

It must also define an explicit `homologation` environment. Production environment and production routes remain absent or disabled until a separate production decision.

The deploy script must be deterministic:

```text
bun run build
→ bun run wri01:bundle-audit
→ wrangler deploy --dry-run --outdir .wri01-dry-run --env homologation
→ explicit authorized deploy command only after all gates pass
```

No command may deploy implicitly as part of `build`, `test`, `verify:release` or ordinary Lovable preview.

## 8. Cron contract

The planned homologation schedule is:

```text
CRON_EXPRESSION = */5 * * * *
CRON_TIMEZONE = UTC
MAX_JOBS_PER_CYCLE = 20
OVERLAP_AUTHORITY = database lease and expected-version contracts
IDEMPOTENCY = persisted operation idempotency key
RETRY = existing bounded operation taxonomy
PUBLIC_HTTP_TRIGGER = false
```

The five-minute interval is a conservative non-production default. Any frequency change requires an explicit documented reason and provider-rate-limit analysis.

Local proof must use `wrangler dev --test-scheduled`. The local test endpoint is development-only and must not be exposed by the deployed production router.

Remote proof must verify one real Cron invocation through Cloudflare observability without directly mutating job state.

Rollback removes the Cron Trigger before removing the Worker route or Worker.

## 9. Zone routing analysis

Observed SaaS zone:

```text
ZONE_NAME = mrrod.com.br
CLOUDFLARE_FOR_SAAS_ENABLED = true
FALLBACK_ORIGIN_CONFIGURED = false
```

The operator-supplied account and zone IDs are transport inputs only and must be revalidated by the server/provider API before any mutation.

A Worker-as-origin wildcard route `*/*` captures both custom-hostname traffic and ordinary traffic entering the zone. Therefore `mrrod.com.br` is **conditionally acceptable only for the controlled non-production proof**, with all exclusion routes created and verified before the wildcard route.

Required no-Worker exclusions:

```text
mrrod.com.br/* → no Worker
www.mrrod.com.br/* → no Worker
notify.mrrod.com.br/* → no Worker
```

Wildcard Worker route:

```text
*/* → rm-prime-wri01-hml
```

Routing outcome:

```text
fallback.mrrod.com.br/* → WRI-01 Worker
customers.mrrod.com.br/* → WRI-01 Worker
dca-hml.mrrod.com.br/* → WRI-01 Worker through Custom Hostname traffic
```

More specific exclusions must be confirmed active before the wildcard route. The route transaction must fail closed and roll back immediately if apex, `www` or `notify` no longer resolve to their preflight responses.

For production, a dedicated SaaS apex remains the lower-risk architecture. Selecting or purchasing that apex is outside WRI-01 and requires a separate Product Owner decision.

## 10. Fallback origin contract

The exact non-production contract is:

```text
FALLBACK_HOSTNAME = fallback.mrrod.com.br
DNS_TYPE = AAAA
DNS_CONTENT = 100::
PROXY_STATUS = proxied
OTHER_A_AAAA_CNAME_AT_HOST = prohibited
WORKER_ROUTE_REQUIRED = true
EXPECTED_FALLBACK_STATUS = active
```

The current failed/pending fallback designation must be deleted or confirmed absent before creating the originless DNS record.

Activation order:

1. capture existing DNS and route state;
2. deploy the Worker to `workers.dev` without zone routes;
3. prove `fetch`, assets, `scheduled`, bindings and bundle limits;
4. create no-Worker exclusion routes;
5. create the originless proxied `AAAA fallback → 100::` record;
6. set `fallback.mrrod.com.br` as the fallback origin;
7. wait for fallback status `active`;
8. add `*/*` to the Worker;
9. verify exclusions and controlled hostname traffic;
10. stop before Custom Hostname creation unless the later DCA external-proof gate explicitly authorizes it.

Teardown order is the reverse, beginning with Cron disablement and wildcard route removal. Existing apex, `www`, `notify`, DMARC and Lovable verification records must not be modified.

## 11. Bundle and Cloudflare plan gates

The uncompressed build size does not determine Cloudflare eligibility. The future implementation must execute:

```text
wrangler deploy --dry-run --outdir .wri01-dry-run --env homologation
```

It must record:

```text
UNCOMPRESSED_UPLOAD_BYTES
GZIP_UPLOAD_BYTES
MODULE_COUNT
STARTUP_TIME_MS
ACCOUNT_PLAN_LIMIT
LIMIT_MARGIN_BYTES
```

Gate rules:

- account plan must be read from Cloudflare, not inferred;
- gzip size must be below the applicable plan limit with an explicit margin;
- startup time must be below the current Cloudflare limit;
- failures require dependency analysis, lazy loading or an explicitly planned service split;
- no test may claim success from the 8,586,058-byte uncompressed value alone.

Known large server chunks such as spreadsheet, formatting and charting dependencies must be classified as request-required, client-only or removable from the server graph.

## 12. Same-Backend Homologation Cell

The Worker will use the canonical backend. No second Supabase project or database branch may be introduced as fallback.

The non-production Worker must:

- use only a dedicated technical tenant with no real customer traffic;
- never mutate the `RM Prime Imóveis` tenant during WRI-01;
- reject missing explicit tenant/impersonation context;
- remain on `workers.dev` until route authorization;
- avoid migration, DCA domain creation and production cutover during runtime-integration proof;
- prove scheduler wiring using deterministic fixtures or fail-closed empty queues before DCA-01 migration authorization.

The exact technical tenant is selected by a separate read-only database preflight and then recorded as an explicit implementation input.

## 13. Secrets and bindings

The runtime provider credential reference remains:

```text
CREDENTIAL_REFERENCE = env:CLOUDFLARE_API_TOKEN_DCA01_HML
```

The secret currently stored in Lovable is not automatically a Cloudflare Worker secret. Future deployment must provision secrets in the Cloudflare Worker environment without reading or printing their values.

Required binding names include, subject to read-only preflight:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

A distinct deploy credential must be used for Wrangler/CI:

```text
CLOUDFLARE_DEPLOY_API_TOKEN_WRI01_HML
```

The deploy token and the runtime provider token must not be the same secret. No secret value may appear in GitHub, documentation, logs, PR comments, build artifacts or client bundles.

## 14. Mandatory future implementation tests

The future implementation is not accepted until tests prove:

1. frozen install and build on the exact HEAD;
2. final Worker export contains reachable `fetch` and `scheduled`;
3. real `env` propagation to the application boundary;
4. real `ctx` propagation and functional `waitUntil`;
5. `wrangler dev --test-scheduled` invokes `processScheduledDomainJobs` exactly once;
6. deployed Cron has no public HTTP production trigger;
7. assets are served from the configured binding;
8. canonical redirect executes before SSR;
9. unknown hostname fails closed;
10. no dual domain authority or tenant default exists;
11. absent runtime secret fails closed without secret disclosure;
12. dry-run gzip size is within the observed account plan limit;
13. startup time is within the current platform limit;
14. no-Worker exclusions preserve apex, `www` and `notify` byte-equivalent critical responses;
15. wildcard route reaches fallback and controlled custom-hostname traffic only as planned;
16. rollback removes Cron, wildcard route and fallback artifacts without touching existing DNS records;
17. existing Release Gate and DCA-01 deterministic tests remain green;
18. compiled-bundle tests, not source-string assertions, prove runtime reachability.

## 15. Future implementation scope

The future WRI-01 implementation may alter only:

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

Adding another runtime path requires a new impact analysis. Existing migrations, RLS, tenant middleware, domain state machine and Cloudflare provider adapter are prohibited unless a new directly evidenced defect requires reopening them.

## 16. Rollback

Before external deployment, rollback is ordinary Git reversion.

After an authorized non-production deployment:

1. disable Cron;
2. remove wildcard Worker route;
3. verify apex, `www` and `notify` bypass the Worker;
4. remove fallback-origin designation;
5. delete only the WRI-01 originless fallback record;
6. remove the non-production Worker;
7. preserve logs and correlation IDs;
8. leave the canonical backend, tenants and existing DNS records unchanged.

No rollback may reactivate legacy tenant or domain fallback logic.

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

WRI-01 implementation requires explicit Product Owner authorization after this planning PR is directly audited and accepted.

## 18. Normative references

- Cloudflare Workers — TanStack Start framework guide.
- Cloudflare Workers — Cron Triggers and Scheduled Handler.
- Cloudflare for SaaS — Workers as fallback origin.
- Cloudflare Workers — Wrangler configuration and platform limits.
- Nitro — Cloudflare module preset and runtime hooks as pinned by the repository lockfile.
