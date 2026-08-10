# SPR-03 — Worker Bootstrap & Managed Secret Provisioning Recovery Impact Analysis

**Status:** Planning — Ready for Direct GitHub Audit
**Stage:** SPR-03
**Repository:** `MrRodBH/prime-domus-hub`
**Planning baseline:** `main@b430b6cb5033cec66902031394b7cb4406206c81`
**Execution model:** ChatGPT GitHub-native for planning/documentation; no Lovable documentation execution
**Runtime implementation authorized by this document:** false

## 1. Purpose

SPR-03 exists because the SPR-02 principal implementation was rejected after direct audit. The objective is to recover the same business/security outcome without rewriting SPR-01/SPR-02 history:

1. bootstrap the canonical Cloudflare Worker resource safely when the Worker does not yet exist;
2. preserve one deploy authority and one Worker identity;
3. make later inactive managed-secret version provisioning possible without giving the Product Owner access to `SUPABASE_SERVICE_ROLE_KEY`;
4. preserve zero public and scheduled ingress until a separately authorized DCA-01 external proof;
5. preserve and explicitly account for the safe Supabase residue created by the rejected SPR-02 attempt.

SPR-03 is Architecture First. This document authorizes no runtime, database or provider mutation.

## 2. Authority and predecessor state

The GitHub `main` audited state is final technical authority for repository state.

Binding predecessor facts:

```text
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_IMPLEMENTATION_STATE = Rejected
SPR01_IMPLEMENTATION_PROMPT_BUDGET = 2/2 consumed
SPR01_THIRD_IMPLEMENTATION_PROMPT = prohibited

SPR02_PLANNING_STATE = Accepted / Merged / Closed
SPR02_PLANNING_PR = 77
SPR02_PLANNING_MERGE_SHA = ae1e8fdf344ca6757b0aef15edbeda65ea0d42f5
SPR02_IMPLEMENTATION_GATE = historical Accepted
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

DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

The SPR-02 `Blocked External` claim is not terminal authority because the principal implementation contained internal scope and implementation defects. The absence of the Worker was already known during SPR-02 planning.

## 3. Direct repository findings

At the planning baseline, the versioned deployment authority is:

```text
DEPLOY_AUTHORITY = wrangler.jsonc
WORKER_NAME = rm-prime-wri01-hml
workers_dev = true
routes = []
triggers.crons = ["*/5 * * * *"]
```

Therefore the current configuration MUST NOT be used for a first bootstrap deployment while SPR-03 safety invariants require zero public and zero scheduled ingress.

WRI-01 remains Accepted / Merged / Closed for build/runtime integration. SPR-03 does not reopen WRI-01. It may, in a later explicitly authorized implementation, change only activation-facing Wrangler settings required to make the first external bootstrap safe while preserving:

```text
BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
DEPLOY_AUTHORITY = versioned wrangler.jsonc
TOP_LEVEL_WORKER_ENTRY = dist/server/index.mjs
REQUEST_APPLICATION_BOUNDARY = src/server.ts::fetch
SCHEDULED_APPLICATION_BOUNDARY = src/server.ts::scheduled
SECOND_WORKER_ENTRY = prohibited
SECOND_DEPLOY_AUTHORITY = prohibited
```

## 4. Current Cloudflare capability facts

Official Cloudflare documentation verified during this planning establishes:

1. `POST /accounts/{account_id}/workers/scripts/{script_name}/versions` uploads a Worker Version without deploying it and requires `Workers Scripts Write`.
2. `wrangler versions upload` is the corresponding version-only workflow.
3. Cloudflare documents that the first upload for a new Worker cannot use the version-only workflow; the initial project must first be created/deployed.
4. `PUT /accounts/{account_id}/workers/scripts/{script_name}` is the Worker script/module upload primitive.
5. `workers_dev = false` disables the `workers.dev` route.
6. `preview_urls = false` explicitly disables Preview URLs; otherwise Preview URLs default to the `workers_dev` value.
7. Cloudflare routing documentation states that a Worker requires an external endpoint (Custom Domain, Route or `workers.dev`) to receive inbound Internet HTTP requests.
8. Wrangler configuration allows an empty route set and allows Cron triggers to be absent/empty.

Official sources:

- `https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/`
- `https://developers.cloudflare.com/workers/wrangler/commands/workers/`
- `https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/create/`
- `https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/update/`
- `https://developers.cloudflare.com/workers/configuration/routing/workers-dev/`
- `https://developers.cloudflare.com/workers/configuration/routing/`
- `https://developers.cloudflare.com/workers/wrangler/configuration/`

Capability conclusion:

```text
CAPABILITY_CREATE_FIRST_WORKER_WITH_VERSION_ONLY = false
CAPABILITY_UPLOAD_SUBSEQUENT_VERSION_WITHOUT_DEPLOY = true
CAPABILITY_DISABLE_WORKERS_DEV = true
CAPABILITY_DISABLE_PREVIEW_URLS = true
CAPABILITY_KEEP_CUSTOM_ROUTES_ZERO = true
CAPABILITY_KEEP_CRON_ZERO = true
CAPABILITY_SECOND_RUNTIME_OR_DEPLOY_AUTHORITY = false required
```

## 5. Architectural conflict discovered after SPR-02

The prior invariant:

```text
TARGET_WORKER_DEPLOYMENT_COUNT = 0 from resource birth
```

is incompatible with the documented first-upload lifecycle when the target Worker does not exist.

This is not permission to relax external exposure controls. The correct invariant must distinguish **deployment existence** from **ingress reachability**.

SPR-03 therefore evaluates whether one strictly controlled synthetic bootstrap deployment can exist while all ingress remains absent.

## 6. Strategy analysis

### Strategy A — Preserve zero deployments from resource birth

**Result:** Rejected.

Reason:

```text
TARGET_WORKER_EXISTS = false
FIRST_VERSION_ONLY_UPLOAD = unsupported
ZERO_DEPLOYMENT_BOOTSTRAP = not executable
```

Preserving the old invariant would create a permanent deadlock.

### Strategy B — Pre-provision an undeployed empty Worker resource

**Result:** Rejected unless future official Cloudflare documentation introduces a distinct resource-creation primitive.

No currently verified official primitive was found that creates the absent Worker identity while producing zero deployments.

Unknown capability is not acceptance evidence.

### Strategy C — Use a second runtime, external Supabase or alternate deploy authority

**Result:** Rejected.

This would violate existing architectural invariants:

```text
SECOND_APPLICATION_RUNTIME = prohibited
SECOND_DEPLOY_AUTHORITY = prohibited
EXTERNAL_SUPABASE_FALLBACK = prohibited
SAME_BACKEND_HOMOLOGATION_CELL = binding
```

### Strategy D — Controlled Bootstrap Deployment with Zero Ingress

**Result:** Selected.

The canonical Worker is created by exactly one initial deployment using the existing versioned Wrangler deploy authority, but only after the implementation has hardened the canonical deployment configuration to a bootstrap-safe state.

Required bootstrap configuration state:

```text
WORKER_NAME = rm-prime-wri01-hml
workers_dev = false
preview_urls = false
routes = []
triggers.crons = []
CUSTOM_DOMAINS = 0
CUSTOM_HOSTNAMES = 0
DNS_MUTATIONS = 0
FALLBACK_ORIGIN = absent
```

Required first deployment payload:

```text
BOOTSTRAP_SOURCE = exact audited WRI-01-compatible build artifact
BOOTSTRAP_SECRET_BINDINGS = 0
BOOTSTRAP_DEPLOYMENT_COUNT_AFTER = 1
BOOTSTRAP_PUBLIC_HTTP_INGRESS = 0
BOOTSTRAP_SCHEDULED_INGRESS = 0
BOOTSTRAP_ROUTE_COUNT = 0
BOOTSTRAP_CRON_COUNT = 0
BOOTSTRAP_WORKERS_DEV = disabled
BOOTSTRAP_PREVIEW_URLS = disabled
```

The initial deployment is a **resource bootstrap**, not DCA-01 external proof, because it exposes no public or scheduled invocation surface and carries no real secret binding.

After bootstrap, the normal Cloudflare Version API becomes available. A later ceremony within the same finite implementation may then:

1. perform read-only source/deployment/ingress reconciliation;
2. upload exactly one synthetic non-secret canary Version without deployment;
3. verify that the active deployment still points only to the synthetic bootstrap version;
4. upload at most one final inactive Version containing exactly the approved three secret bindings;
5. leave the final secret-bearing Version undeployed;
6. remove the stage-specific secret-transfer capability and require external token revocation before terminal acceptance.

Selected architecture:

```text
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_SELECTED_PRIMITIVE = controlled first Wrangler deployment with zero ingress, followed by version-only canary and final secret-bearing inactive version
DEPLOY_AUTHORITY = existing versioned wrangler.jsonc only
APPLICATION_RUNTIME_AUTHORITY = existing TanStack Start / Nitro runtime only
TARGET_WORKER = rm-prime-wri01-hml
FIRST_DEPLOYMENT_ALLOWED = exactly one synthetic non-secret bootstrap deployment
PUBLIC_INGRESS_DURING_SPR03 = prohibited
SCHEDULED_INGRESS_DURING_SPR03 = prohibited
FINAL_SECRET_VERSION_DEPLOYMENT = prohibited
```

### Strategy E — Abandon Cloudflare Worker path

**Result:** Rejected at planning time.

Strategy D is technically feasible without adding a second runtime/deploy authority and without weakening secret custody. Abandoning the Worker path is therefore not justified.

## 7. Security invariant replacement

SPR-03 formally supersedes only the **SPR-01/SPR-02 zero-deployment-from-resource-birth assumption**.

It does not supersede WRI-01 architecture, DCA-01 authorization boundaries or any tenant/security invariant.

New binding pre-DCA invariant:

```text
SPR03_BOOTSTRAP_DEPLOYMENT_COUNT = exactly 1 after bootstrap
SPR03_BOOTSTRAP_DEPLOYED_VERSION_SECRET_COUNT = 0
SPR03_PUBLIC_HTTP_INGRESS = 0
SPR03_SCHEDULED_INGRESS = 0
SPR03_CUSTOM_ROUTE_COUNT = 0
SPR03_CRON_COUNT = 0
SPR03_WORKERS_DEV = disabled
SPR03_PREVIEW_URLS = disabled
SPR03_FINAL_SECRET_VERSION_DEPLOYED = false
DCA01_EXTERNAL_PROOF_STARTED = false
```

Any public or scheduled ingress immediately fails the stage closed.

## 8. Secret custody

The Product Owner must never receive, copy, store or transport `SUPABASE_SERVICE_ROLE_KEY`.

The final inactive Worker Version may contain exactly these three secret binding names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

No secret value is valid evidence.

If the existing TanStack server-side secret-transfer primitive is reused in a future SPR-03 implementation, it must use a **new stage-specific temporary credential**:

```text
CLOUDFLARE_API_TOKEN_SPR03_PROVISIONER
```

The rejected SPR-02 provisioner must never be reused.

The SPR-03 token, if required, must be least privilege, stored only in the managed secret custodian, never become a Worker binding, and be removed/revoked before terminal acceptance.

## 9. SPR-02 Supabase residue

The rejected SPR-02 attempt produced durable Supabase residue before the GitHub implementation was accepted.

Read-only audit evidence established:

```text
TABLE = public.spr02_managed_secret_ceremonies
RLS_ENABLED = true
CLIENT_POLICY_COUNT = 0
ANON_GRANT = none observed
AUTHENTICATED_GRANT = none observed
SECRET_BEARING_COLUMNS = 0
APPLIED_MIGRATION_RECORD_COUNT = 2
APPLIED_VERSION_1 = 20260810220152
APPLIED_NAME_1 = 1ee179b2-60f0-4ce1-b259-06762002733b
APPLIED_VERSION_2 = 20260810220939
APPLIED_NAME_2 = b80a4010-1d42-48a9-bbcd-7d2d9e0ea84b
```

This residue is safe enough to preserve while planning proceeds, but GitHub/database parity must be reconciled before any future migration pipeline may treat SPR-03 as complete.

### Residue Strategy R1 — Delete or rewrite migration history

**Rejected.**

Prohibited:

```text
DELETE/UPDATE supabase_migrations.schema_migrations
silent migration-history rewrite
direct DROP used to hide rejected-stage history
pretending only one migration was applied
```

### Residue Strategy R2 — Forward historical parity materialization

**Selected.**

Before any new SPR-03 database migration, a future implementation must:

1. re-audit the live table and both migration-history records read-only;
2. materialize repository migration history that corresponds exactly to the two already-applied versions and SQL effects;
3. ensure this parity materialization causes no database re-execution;
4. preserve both applied records as historical facts;
5. reuse the table only if the final SPR-03 implementation contract still requires it;
6. if the table is no longer required, retire it only by a new forward migration after parity is restored.

No Supabase mutation is authorized by this planning IA.

## 10. Tenant and authorization invariants

Unchanged and binding:

- server is the sole tenant and authorization authority;
- client headers, paths, account IDs, Worker IDs and version IDs are transport only;
- `x-tenant-id` is never tenant authority;
- no default tenant, first-row selection, `ORDER BY/LIMIT 1` authority or heuristic fallback;
- ambiguity fails fast and closed;
- Super Admin without explicit impersonation cannot access tenant-scoped resources;
- no public secret-transfer endpoint;
- signed URLs are not authorization authority;
- Same-Backend Homologation Cell remains binding.

SPR-03 bootstrap itself is global infrastructure and MUST NOT require or infer a tenant.

## 11. Impacted surfaces for future implementation

A future implementation may require changes to the following classes of surface, but this planning does not authorize them yet:

```text
wrangler.jsonc                 # bootstrap-safe activation settings
SPR-03 deterministic specs     # zero-ingress bootstrap contract
SPR-03 provider orchestration   # canary/final version path
SPR-03 operational evidence
Supabase migration parity files # only after exact read-only history reconciliation
canonical roadmap/governance
```

Any exact `FILES_ALLOWED` list must be frozen in the SPR-03 Execution Envelope before implementation.

## 12. Provider execution sequence

The selected strategy requires this order:

```text
GitHub exact implementation HEAD accepted
→ bootstrap-safe wrangler configuration proved
→ exact build/dry-run/workerd gates passed
→ read-only Cloudflare preflight proves target Worker absent and ingress prerequisites clean
→ exactly one synthetic non-secret first deployment
→ read-only observation proves Worker exists, deployment count = 1, workers.dev disabled, preview disabled, routes = 0, Cron = 0
→ version-only semantic gate revalidated
→ exactly one synthetic non-secret inactive canary Version
→ read-only observation proves active deployment unchanged
→ at most one final secret-bearing inactive Version with exact three approved secret names
→ read-only observation proves final Version inactive and bootstrap deployment unchanged
→ temporary provisioner removed/revoked
→ post-removal secret-transfer path fails closed
→ direct external audit
```

No DCA-01 route, fallback-origin, Custom Hostname, public `workers.dev` proof or Cron proof occurs in SPR-03.

## 13. Failure rules

Fail closed if any of the following occurs:

- current Cloudflare contract differs materially from this IA;
- target Worker unexpectedly already exists before bootstrap and provenance is unresolved;
- any Worker deployment already exists with unknown source;
- `workers.dev` cannot be proven disabled;
- Preview URLs cannot be proven disabled;
- custom route/domain count is non-zero;
- Cron count is non-zero;
- bootstrap artifact contains a real secret binding;
- bootstrap creates more than one deployment;
- a final secret-bearing Version becomes deployed;
- account/Worker identity is ambiguous;
- Supabase migration history differs from the two preserved records;
- repository/database parity cannot be established without history mutation;
- any secret value appears in request, response, evidence, logs or documentation.

## 14. Planning decision

```text
SPR03_PLANNING_RESULT = Strategy selected
SPR03_SELECTED_STRATEGY = Strategy D
SPR03_RESIDUE_STRATEGY = R2
SPR03_IMPLEMENTATION_AUTHORIZED = false
SPR03_IMPLEMENTATION_STARTED = false
SPR03_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

The next action after protected planning acceptance is a separate SPR-03 implementation capability gate and direct audit. No implementation may start from this IA alone.
