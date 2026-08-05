# ROADMAP ARCHITECTURAL — RM Prime SaaS

**Status:** Ratificado — WRI-01 planning Accepted / Merged / Closed; implementation blocked pending explicit authorization
**Authority:** Single Source of Future Evolution
**Audited planning merge:** `a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca`

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

DCA01_WORKER_RUNTIME_PREFLIGHT = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
DCA01_CURRENT_STATE = Rejected

WRI01_PLANNING_STATE = Accepted / Merged / Closed
WRI01_PLANNING_PR = 68
WRI01_PLANNING_HEAD = 750aa95b24262021a73a3a37e06fdbcc3bd3f196
WRI01_PLANNING_MERGE_SHA = a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca
WRI01_PLANNING_AUDIT = Accepted
WRI01_SELECTED_STRATEGY = Strategy A
WRI01_IMPLEMENTATION_STATE = Planned — Blocked pending explicit Product Owner authorization
WRI01_IMPLEMENTATION_AUTHORIZED = false
WRI01_IMPLEMENTATION_STARTED = false

BCA01_STATE = Planned — Blocked by DCA-01 and WRI-01
BCA01_STARTED = false
PRM3_STATE = Planned — Blocked by BCA-01
PRM3_STARTED = false
NEXT_STAGE_AUTHORIZED = none without explicit Product Owner authorization
NO_AUTOMATIC_SUCCESSOR = true

DEPLOY_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DNS_MUTATION_EXECUTED = false
CLOUDFLARE_ROUTE_MUTATION_EXECUTED = false
CRON_TRIGGER_CREATED = false
CUSTOM_HOSTNAME_CREATED = false
SSL_PROVISIONING_EXECUTED = false
PRODUCTION_CUTOVER_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

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
→ WRI-01 implementation — Planned / Blocked pending explicit Product Owner authorization
→ repository runtime audit
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
WRI01_PLANNING_STATE = Accepted / Merged / Closed
WRI01_PLANNING_PR = 68
WRI01_PLANNING_HEAD = 750aa95b24262021a73a3a37e06fdbcc3bd3f196
WRI01_PLANNING_MERGE_SHA = a7dfee49d7e087f6dbdbf35f54414bb2b6e714ca
WRI01_PLANNING_AUDIT = Accepted
WRI01_SELECTED_STRATEGY = Strategy A
WRI01_IMPLEMENTATION_STATE = Planned — Blocked pending explicit Product Owner authorization
WRI01_IMPLEMENTATION_AUTHORIZED = false
WRI01_IMPLEMENTATION_STARTED = false
DCA01_CURRENT_STATE = Rejected
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
NEXT_STAGE_AUTHORIZED = none without explicit Product Owner authorization
BCA01_STARTED = false
PRM3_STARTED = false
NO_AUTOMATIC_SUCCESSOR = true
```
