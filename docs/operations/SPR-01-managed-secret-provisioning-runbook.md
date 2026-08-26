# SPR-01 — Managed Secret Provisioning Runbook

## Status and use restriction

**Accepted planning runbook — implementation remains non-executable until the Product Owner authorizes the finite SPR-01 sequence end-to-end. After that authorization, internal gates proceed continuously; pause only for an external Owner action or a material stop condition.**

```text
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_PLANNING_PR = 75
SPR01_PLANNING_HEAD = 0d2ad969b3109b6da2b4dd37307b3b8f12a517f7
SPR01_PLANNING_MERGE_SHA = 5c4562531247f3c9b85b9fa3a1c799d6ef32fa7c
SPR01_PLANNING_AUDIT = Accepted
SPR01_IMPLEMENTATION_AUTHORIZED = false
SPR01_EXTERNAL_OPERATION_AUTHORIZED = false
TARGET_WORKER = externally resolved by ARCH-12F-02A preflight
TARGET_WORKER_EXISTS_AT_PLANNING = false
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
```

Do not use this document as current deploy authorization.

## 1. Purpose

Provide one auditable ceremony that moves the three required runtime bindings from managed server-side custody into an inactive Cloudflare Worker version without revealing values to the Product Owner, browser, ChatGPT, GitHub or local files.

The runbook stops before workers.dev, Preview URLs, Cron, routes, DNS, fallback origin or Custom Hostnames are enabled.

## 2. Operator matrix

| Operator | Permitted responsibility | Prohibited responsibility |
|---|---|---|
| Product Owner | authorize finite gates; create/revoke temporary Cloudflare token through provider UI; confirm sanitized results | view, copy or paste Supabase administrative material |
| ChatGPT GitHub-native | audit source/head; prepare documentation; perform the authorized undeployed Worker/source-version creation and read-only verification continuously through the finite sequence | receive or transport secret values |
| Lovable | implement, deploy, invoke and disable the managed Edge Function capability; optionally undeploy its runtime while preserving auditable source; read server-only managed secrets | expose values in report, code, log or frontend |
| Cloudflare | store encrypted bindings; create versions and deployments | become tenant or application authorization authority |

Lovable is the required executor for the bridge portion. GitHub-native execution is used for documentation and repository audit to avoid unnecessary Lovable consumption.

## 3. Externally resolved identifiers

```text
CLOUDFLARE_ACCOUNT_ID = required external process input
CLOUDFLARE_WORKER_NAME = required external process input
RM_PRIME_DEPLOYMENT_ENVIRONMENT = required external process input
SUPABASE_PROJECT_REF = required external process input
SUPABASE_URL = required external process input; must match project ref exactly
WRANGLER_TEMPLATE = wrangler.jsonc
CANONICAL_WRANGLER_CONFIG = .wrangler.generated.jsonc (ignored, mode 0600)
WORKER_ENTRY = dist/server/index.mjs
ASSETS_DIRECTORY = dist/client
ASSETS_BINDING = ASSETS

REQUIRED_WORKER_SECRETS =
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  CLOUDFLARE_API_TOKEN_DCA01_HML

LOVABLE_ONLY_PROVISIONER_SECRET =
  CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER
```

The ARCH-12F-02A materializer must succeed before any provider call. Missing,
blank, malformed or cross-environment input fails closed without producing a
deployable configuration. Account ID and Worker name are transport inputs and
must be revalidated; neither is tenant or provider-business authority.

## 4. Global stop conditions

Stop before mutation when any of these is true:

- `main` differs from the authorized exact HEAD;
- an SPR-01 implementation PR or bridge already exists unexpectedly;
- the Worker state differs from the expected phase;
- workers.dev, Preview URLs, a route or Cron is already active unexpectedly;
- a required managed environment variable is absent;
- the dedicated ceremony-control migration, RLS/grant proof or atomic claim contract is absent;
- no authenticated Super Admin invocation path exists without exposing a JWT/token to the Owner, browser logs or chat;
- the provisioner token has permissions outside the approved account/Workers Scripts scope;
- the current OpenAPI does not prove resource creation plus complete inactive-version creation without deployment;
- the Worker ID, source version and source digest cannot be pinned uniquely;
- secret names or version/deployment counts are ambiguous;
- any log, response or tool attempts to display a secret value.

Do not improvise an alternate endpoint or another Supabase project.

## 5. Phase 0 — read-only preflight

The authorized operator records only sanitized facts:

```text
CURRENT_MAIN_HEAD
EXPECTED_MAIN_HEAD
WRI01_GATE_RESULT
DCA01_GATE_RESULT
BUILD_RESULT
TYPECHECK_RESULT
BUNDLE_AUDIT_RESULT
WRANGLER_DRY_RUN_RESULT
TARGET_WORKER_EXISTS
TARGET_VERSION_COUNT
TARGET_DEPLOYMENT_COUNT
TARGET_SECRET_NAMES
WORKERS_DEV_ENABLED
PREVIEW_URLS_ENABLED
ZONE_ROUTE_COUNT
CRON_COUNT
```

Required initial state for first resource creation:

```text
TARGET_WORKER_EXISTS = false
TARGET_VERSION_COUNT = 0
TARGET_DEPLOYMENT_COUNT = 0
TARGET_SECRET_NAMES = empty
ZONE_ROUTE_COUNT = 0
CRON_COUNT = 0
```

Any difference requires a new direct audit and explicit decision.

## 6. Phase 1 — temporary Cloudflare provisioner token

The Product Owner creates one temporary API token using secure Cloudflare UI inputs.

Required scope:

```text
RESOURCE = exact RM Prime Cloudflare account
PERMISSION = minimum Workers Scripts read/edit required by the approved endpoint
DNS_PERMISSION = none
WORKER_ROUTES_PERMISSION = none
ZONE_SETTINGS_PERMISSION = none
CUSTOM_HOSTNAME_PERMISSION = none
API_TOKEN_MANAGEMENT_PERMISSION = none
```

The token value must be entered only through Lovable's secure secret input as:

```text
CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER
```

Do not paste the token into chat, a prompt body, PowerShell transcript, `.env`, GitHub, issue, PR or screenshot.

The Product Owner may handle this temporary Cloudflare token. This does not authorize or require handling any Supabase secret.

## 7. Phase 2 — undeployed Worker resource and source version

This phase is executed under the single authorized end-to-end SPR-01 implementation sequence. It does not require another confirmation unless an external Owner action or a material stop condition occurs.

### 7.1 Exact-head gates

Run from an isolated worktree at the exact authorized HEAD:

```text
bun install --frozen-lockfile
bun run test:wri-01
bun run test:dca-01
bun run build
bun run typecheck
bun run wri01:bundle-audit
bun run wri01:dry-run
```

All must pass. The source clone and unrelated user changes must remain untouched.

### 7.2 Temporary configuration

Generate outside the tracked repository from the accepted `wrangler.jsonc` and override only:

```text
workers_dev = false
preview_urls = false
routes = []
triggers.crons = []
```

Resolve `main` and `assets.directory` in that temporary file to the exact isolated-worktree build paths so moving the config does not change artifact resolution. Do not add secrets. Do not edit or commit `wrangler.jsonc`.

### 7.3 Resource and source-version creation

Create the Worker identity first through:

```text
POST /accounts/{account_id}/workers/workers
name = rm-prime-wri01-hml
subdomain.enabled = false
subdomain.previews_enabled = false
```

Then upload one complete source version through the accepted toolchain:

```text
bunx wrangler@4.114.0 versions upload --config <temporary-config-outside-repository>
runtime secrets = absent
deployment request = absent
```

The source payload must contain the exact compiled modules, static assets, compatibility configuration and approved non-secret bindings derived from the authorized HEAD.

After both operations, record:

```text
WORKER_ID
SOURCE_VERSION_ID
SOURCE_HEAD
CONFIG_DIGEST
SOURCE_VERSION_DIGEST
WORKERS_DEV_DISABLED = true
PREVIEW_URLS_DISABLED = true
ZONE_ROUTE_COUNT = 0
CRON_COUNT = 0
SECRET_COUNT = 0
VERSION_COUNT = 1
DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
```

Do not invoke the Worker. Stop before any secret provisioning if ingress cannot be proven disabled.

## 8. Phase 3 — Lovable bridge implementation

Use one CTDD Lovable prompt under the future principal implementation budget.

The implementation must:

1. create `spr-01-managed-secret-provisioner` as a one-shot Edge Function;
2. keep JWT verification enabled;
3. verify authenticated global Super Admin authority server-side;
4. use a server-owned expiring one-time ceremony state persisted by the dedicated migration;
5. read the four allowed environment variables only inside the function;
6. pin exact account, Worker ID/name, source version/digest, zero deployments and Git HEAD;
7. accept no secret value and no tenant authority from the caller;
8. use structured allowlisted logs;
9. retrieve the exact pinned source version, recompute its sanitized source/configuration digest and fail closed if it cannot reproduce the modules, compatibility settings and approved non-secret binding inventory;
10. implement one complete synthetic semantic-canary version request and one complete real-secret version request;
11. implement read-only post-call reconciliation;
12. implement replay, concurrency and ambiguous-timeout protection;
13. return only the sanitized evidence contract;
14. remove the provisioner secret after success and prove the function cannot perform another Cloudflare call.

The dedicated migration must create only `public.spr01_managed_secret_ceremonies` plus its constraints/indexes and minimum grants. It must enable RLS, create no client policy, revoke all access from `PUBLIC`, `anon` and `authenticated`, grant only minimum `service_role` access, and contain no secret/token/request-body column.

Before its first provider mutation, the function atomically inserts the exact server-owned ceremony tuple with state `executing` and a lease expiry. A uniqueness conflict, active lease, expired ceremony or terminal row fails before any Cloudflare request. After ambiguous interruption, recovery may enter `reconciling` only after lease expiry and remains read-only until remote annotations conclusively classify the operation.

Lovable's final report must include the Audit Package, exact files changed, exact test results, sanitized provider actions, teardown and zero secret values.

## 9. Phase 4 — live semantic gate

Immediately before secret transmission, the bridge retrieves or validates the current Cloudflare OpenAPI and proves:

```text
METHOD = POST
PATH = /accounts/{account_id}/workers/workers/{worker_id}/versions
COMPLETE_VERSION_REQUEST = supported
SECRET_TEXT_BINDING = supported
PINNED_ASSETS_INHERIT_BINDING = supported
VERSION_ANNOTATION = supported
SECRET_VALUES_IN_RESPONSE = omitted
```

The immutable Worker ID, exact source version/digest and zero deployment count must be captured before the semantic canary.

The bridge must then submit one fixed synthetic, non-secret fixture:

```text
CANARY_NAME = SPR01_VERSION_ONLY_CANARY
CANARY_VALUE = fixed unmistakably synthetic fixture
CANARY_VERSION_ANNOTATION = ceremony ID + semantic-canary
```

Required canary result:

```text
CANARY_VERSION_CREATE_REQUEST_COUNT = 1
CANARY_VERSION_CREATED = true
CANARY_VERSION_DEPLOYED = false
DEPLOYMENT_COUNT_REMAINS_ZERO = true
PUBLIC_INGRESS_UNCHANGED = true
SCHEDULED_INGRESS_UNCHANGED = true
```

If the canary changes any deployment or ingress, stop before real-secret transmission.

If any assertion is unprovable, exit with:

```text
SPR01_PROVISIONING = BLOCKED
SECRET_TRANSMISSION_ATTEMPTED = false
DEPLOYMENT_CHANGED = false
```

Do not fall back to:

```text
wrangler secret put
PUT one secret at a time
three sequential version-secret operations
legacy script-level secret mutation
immediate deployment
```

## 10. Phase 5 — complete secret-bearing version creation

After the semantic canary passes, the bridge submits exactly one final version-create request. It copies the pinned source modules and compatibility settings, inherits `ASSETS` from the exact source version, preserves every other approved non-secret binding, omits the canary and adds exactly the three required server-side values as `secret_text` bindings plus a non-secret ceremony annotation. Reusing an asset-upload token is prohibited.

The implementation must never serialize the request body to a log, error, diagnostic, evidence file or response.

Expected sanitized result:

```text
TOTAL_VERSION_CREATE_REQUEST_COUNT_AFTER_SOURCE = 2
CANARY_VERSION_CREATE_REQUEST_COUNT = 1
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT = 1
REAL_SECRET_VALUE_COUNT = 3
SECRET_NAMES = exact required set
CANARY_PRESENT_IN_FINAL_VERSION = false
SECRET_VALUES_RETURNED = false
RESULT_VERSION_ANNOTATION = expected ceremony annotation
```

## 11. Phase 6 — post-call proof

The bridge and independent read-only auditor compare before/after state.

Required:

```text
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
SEMANTIC_CANARY_PASSED = true
WORKER_DEPLOYED_ON = null
SECRET_BEARING_VERSION_DEPLOYED = false
REQUIRED_SECRET_NAMES_PRESENT = true
UNEXPECTED_SECRET_NAMES_PRESENT = false
ASSETS_BINDING_PRESERVED = true
CODE_PROVENANCE_PRESERVED = true
COMPATIBILITY_SETTINGS_PRESERVED = true
WORKERS_DEV_DISABLED = true
PREVIEW_URLS_DISABLED = true
ZONE_ROUTE_COUNT = 0
CRON_COUNT = 0
```

Only names and identifiers may be recorded.

### Ambiguous timeout

If the mutation response is lost or times out:

1. do not retry;
2. keep the durable row in `executing` until its lease expires, then atomically enter `reconciling`;
3. list versions using the ceremony annotation;
4. list deployments;
5. list secret names;
6. classify the operation as applied, not applied or ambiguous;
7. retry only when non-application is conclusively proven;
8. otherwise keep ingress disabled and stop for audit.

## 12. Phase 7 — mandatory teardown

In order:

1. use Lovable to remove `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` from managed Secrets;
2. invoke the authenticated function once more and prove it fails closed before any Cloudflare request;
3. preserve the function source in GitHub for direct audit;
4. optionally undeploy the Edge Function runtime when Lovable supports doing so without deleting the auditable source;
5. have the Product Owner revoke the temporary token in Cloudflare;
6. verify the token is invalid without displaying it;
7. confirm no scheduled bridge job exists;
8. confirm the target Worker still has no public or scheduled ingress.

Required result:

```text
BRIDGE_CAPABILITY_DISABLED = true
EDGE_FUNCTION_SOURCE_AUDITABLE = true
PROVISIONER_SECRET_REMOVED_FROM_LOVABLE = true
PROVISIONER_TOKEN_REVOKED = true
REVOKED_TOKEN_AUTHENTICATION_FAILED = true
PUBLIC_INGRESS = false
SCHEDULED_INGRESS = false
```

Do not ask the Product Owner to access Supabase or remove the service-role key.

## 13. Evidence package

Create only after future execution:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
  spr-01-managed-secret-provisioning-execution.md
```

Required fields:

```text
EXECUTION_BASELINE_MAIN
OBSERVED_MAIN_BEFORE_RESOURCE_CREATION
WORKER_ID
SOURCE_VERSION_ID
SOURCE_VERSION_DIGEST
RESULT_VERSION_ID_OR_ANNOTATION
DEPLOYMENT_COUNT_BEFORE_SECRET_VERSIONS
DEPLOYMENT_COUNT_AFTER_SECRET_VERSIONS
REQUIRED_SECRET_NAMES
UNEXPECTED_SECRET_NAMES
TOTAL_VERSION_CREATE_REQUEST_COUNT_AFTER_SOURCE
CANARY_VERSION_CREATE_REQUEST_COUNT
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT
WORKERS_DEV_DISABLED
PREVIEW_URLS_DISABLED
ZONE_ROUTE_COUNT
CRON_COUNT
BRIDGE_CAPABILITY_DISABLED
PROVISIONER_SECRET_REMOVED
PROVISIONER_TOKEN_REVOKED
REVOKED_TOKEN_AUTHENTICATION_FAILED
CEREMONY_CONTROL_STATE
ATOMIC_CLAIM_RESULT
REPLAY_AND_CONCURRENCY_RESULT
FILES_CHANGED
FILES_OUTSIDE_ALLOWED
TEST_RESULTS
SECRET_VALUES_RECORDED = false
```

No response body, token, JWT, cookie, URL credential, Supabase administrative value or environment dump may be preserved.

## 14. Failure and rollback matrix

| Failure point | Required response |
|---|---|
| Repository gate fails | no external operation; fix only through authorized repository workflow |
| Worker/source version exposes ingress | disable ingress or remove exact Worker; no secret transmission |
| Managed variable missing | stop; do not ask Owner for Supabase material |
| Durable control or atomic claim fails | no provider mutation; keep the Worker inactive and correct within the SPR-01 budget |
| Token scope too broad | reject token; create a narrower temporary token |
| OpenAPI semantics differ | stop before secret transmission; return to planning |
| Final version creation fails conclusively | keep Worker undeployed; teardown bridge/token |
| Version-create result ambiguous | read-only reconciliation; no blind retry |
| Deployment changes unexpectedly | disable all ingress; classify Rejected; audit exact remote state |
| Secret value appears in any output | security incident; stop, preserve sanitized metadata, rotate affected material through managed custodians |
| Bridge disablement or teardown incomplete | SPR-01 cannot be Accepted; keep Worker inactive |

## 15. Handoff ceiling

A successful SPR-01 execution leaves:

```text
WORKER_EXISTS = true
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
SECRET_BEARING_VERSION_EXISTS = true
SECRET_BEARING_VERSION_DEPLOYED = false
WORKERS_DEV_ENABLED = false
PREVIEW_URLS_ENABLED = false
CRON_COUNT = 0
ZONE_ROUTE_COUNT = 0
BRIDGE_CAPABILITY_ACTIVE = false
PROVISIONER_TOKEN_ACTIVE = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
```

The next operation would be a separately planned and authorized deployment/ingress proof under DCA-01. SPR-01 does not authorize it.

## 16. Current planning record

```text
PLANNING_BASELINE_MAIN = cc45ec8c334bdea3965830426992a705271b1103
PLANNING_DOCUMENTATION_ONLY = true
IMPLEMENTATION_EXECUTED = false
LOVABLE_USED_FOR_RUNTIME = false
SUPABASE_SECRET_ACCESSED = false
CLOUDFLARE_WORKER_CREATED = false
CLOUDFLARE_SECRET_PROVISIONED = false
CLOUDFLARE_DEPLOYMENT_CREATED = false
CRON_TRIGGER_CREATED = false
DNS_MUTATION_EXECUTED = false
ROUTE_MUTATION_EXECUTED = false
CUSTOM_HOSTNAME_CREATED = false
MANAGED_MIGRATION_EXECUTED = false
```
