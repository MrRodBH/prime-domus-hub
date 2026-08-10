# SPR-01 — Managed Secret Provisioning Execution Envelope

## Status

**Accepted / Merged / Closed — planning-only**

```text
STAGE_ID = SPR-01
STAGE_NAME = Managed Secret Provisioning Reconciliation
STAGE_TYPE = finite_planning_then_controlled_external_security_gate
BASE_BRANCH = main
PLANNING_BASELINE_MAIN = cc45ec8c334bdea3965830426992a705271b1103
PLANNING_BRANCH = agent/spr-01-managed-secret-provisioning-planning
PLANNING_PR = 75
PLANNING_HEAD = 0d2ad969b3109b6da2b4dd37307b3b8f12a517f7
PLANNING_MERGE_SHA = 5c4562531247f3c9b85b9fa3a1c799d6ef32fa7c
PLANNING_AUDIT = Accepted
PLANNING_STATE = Accepted / Merged / Closed
PLANNING_MERGE_AUTHORIZED = true
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
AUTO_MERGE = false
```

This envelope defines the only permitted future path for transferring the RM Prime Supabase administrative binding into an inactive Cloudflare Worker version without exposing it to the Product Owner. It authorizes no implementation or external operation.

## 1. Objective

Close the secret-custody gap between the Lovable-managed Same-Backend environment and Cloudflare while preserving:

```text
OWNER_SUPABASE_DASHBOARD_ACCESS = false
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
SERVER_IS_AUTHORITY = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_FALLBACK = prohibited
WRI01_STATE = Accepted / Merged / Closed
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
```

The finite output is an undeployed Worker with three inactive versions — source, synthetic canary and final secret-bearing — followed by fail-closed bridge disablement and provisioner-token revocation.

## 2. Entry gate

Before any future implementation or external mutation:

1. confirm this planning PR is merged through the protected process and its direct audit is `Accepted`;
2. confirm the current `main` equals the implementation baseline explicitly authorized by the Product Owner;
3. confirm WRI-01 remains `Accepted / Merged / Closed`;
4. confirm DCA-01 repository implementation remains `Accepted / Merged / Closed` and controlled external proof remains `Blocked External`;
5. confirm no competing SPR-01 implementation branch, PR, Worker or bridge exists;
6. inspect Cloudflare directly and confirm the target Worker state;
7. retrieve the current Cloudflare OpenAPI and verify the resource-oriented Worker and complete inactive-version primitives;
8. confirm the target account plan and current Wrangler version;
9. confirm the Lovable-managed backend still exposes the required server-only environment variables without revealing values;
10. confirm a temporary least-privilege provisioner token is available only in Lovable Secrets;
11. confirm BCA-01 and PR-M3 remain blocked and unstarted;
12. stop fail-closed on any mismatch.

## 3. Authority split

```text
GITHUB_MAIN = source and documentation authority
WRANGLER_JSONC = accepted deploy-configuration authority
LOVABLE_MANAGED_BACKEND = Supabase secret custodian
LOVABLE_EDGE_FUNCTION = temporary secret transfer executor
CLOUDFLARE_VERSION_API = target secret-binding authority
CLOUDFLARE_DEPLOYMENT_API = separate later activation authority
PRODUCT_OWNER = explicit authorization authority, not secret custodian
```

The Product Owner may manage a temporary Cloudflare provisioner token through secure provider inputs. The Product Owner must never receive, copy, paste or store `SUPABASE_SERVICE_ROLE_KEY`.

## 4. Planning and implementation budgets

```text
PLANNING_MATERIALIZATION = one GitHub-native documentation PR
IMPLEMENTATION_PRINCIPAL_PROMPT = available
IMPLEMENTATION_CONSOLIDATED_CORRECTIVE_PROMPT = available
IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
ARTIFICIAL_SUBSTAGES = prohibited
```

GitHub-native documentation work does not prohibit later Lovable execution. The bridge implementation must use Lovable because only the managed backend may read the Supabase administrative secret.

## 5. Branch and pull-request contract

Future repository implementation must use:

```text
IMPLEMENTATION_BRANCH = agent/spr-01-managed-secret-provisioning
IMPLEMENTATION_PR = one principal draft pull request
BASE_BRANCH = main
AUTO_MERGE = false
MERGE_METHOD = protected squash only after direct Accepted audit
```

The future principal implementation requires one explicit end-to-end SPR-01 authorization. Once granted, every non-Owner operation in this finite sequence proceeds continuously through its internal gates without per-step reconfirmation. Pause is permitted only for an external action that the Product Owner must personally complete or for a material stop condition defined by this envelope.

## 6. Future FILES_ALLOWED

The future principal implementation may change only:

```text
supabase/functions/spr-01-managed-secret-provisioner/index.ts
supabase/config.toml
supabase/migrations/*_spr01_managed_secret_ceremony_control.sql — exactly one dedicated migration
run-spr-01-managed-secret-provisioning-specs.ts
package.json

docs/architecture/impact-analysis/SPR-01-managed-secret-provisioning-reconciliation-impact-analysis.md
docs/architecture/governance/SPR-01-managed-secret-provisioning-execution-envelope.md
docs/operations/SPR-01-managed-secret-provisioning-runbook.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/spr-01-managed-secret-provisioning-execution.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
docs/operations/WRI-01-cloudflare-worker-runtime-runbook.md
docs/architecture/governance/DCA-01-domain-cloudflare-activation-execution-envelope.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-implementation-execution.md
```

`supabase/config.toml` may change only when an exact per-function authentication declaration is required. The single control migration may create only `public.spr01_managed_secret_ceremonies`, its constraints/indexes and minimum grants. It must enable RLS, create no client policy, revoke all access from `PUBLIC`, `anon` and `authenticated`, grant only minimum `service_role` access, and prohibit secret/token/request-body columns. `package.json` may change only to register one deterministic SPR-01 specification command. No dependency may be added without a new direct impact justification.

## 7. FILES_PROHIBITED

```text
supabase/migrations/** except the single `*_spr01_managed_secret_ceremony_control.sql` migration
historical migrations
database schema, RLS, grants or policies outside the dedicated ceremony-control contract
src/**
frontend routes or components
wrangler.jsonc
generated Worker output
DCA-01 state machine and provider adapter
tenant middleware or impersonation architecture
billing, commercial, CMS, CRM, portal or storage runtime
production configuration
plaintext secret files
GitHub Actions secrets or workflows
```

The temporary source-upload configuration must be generated outside the tracked repository from the accepted `wrangler.jsonc`. Its `main` and `assets.directory` paths must resolve to the exact isolated-worktree build artifacts. It must never become a second versioned deploy authority.

## 8. Required Worker bindings

Exactly:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

No additional real secret may be created by SPR-01. The unmistakably synthetic canary exists only in its inactive intermediate version and is absent from the final version. `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` exists only in Lovable Secrets and is never a binding on the target Worker.

## 9. Undeployed Worker and source-version contract

The target Worker currently does not exist. The first future external operations must create its identity and exact source version without creating a deployment.

```text
WORKER_NAME = rm-prime-wri01-hml
SOURCE_HEAD = exact authorized main
WORKER_ENTRY = dist/server/index.mjs
ASSETS_DIRECTORY = dist/client
ASSETS_BINDING = ASSETS
SUBDOMAIN_ENABLED = false
SUBDOMAIN_PREVIEWS_ENABLED = false
ROUTES = []
CRONS = []
RUNTIME_SECRETS = absent
DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
```

Required source evidence:

```text
WORKER_ID
SOURCE_VERSION_ID
SOURCE_HEAD
WRANGLER_VERSION
CONFIG_DIGEST
SOURCE_VERSION_DIGEST
WORKERS_DEV_DISABLED = true
PREVIEW_URLS_DISABLED = true
ZONE_ROUTE_COUNT = 0
CRON_COUNT = 0
SECRET_COUNT = 0
DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
```

The sequence is `POST /accounts/{account_id}/workers/workers` followed by `wrangler versions upload` against the temporary configuration. This keeps Static Assets upload inside the accepted build toolchain while creating no deployment. If Cloudflare cannot create both resources while every ingress path and deployment remain absent, execution stops.

## 10. Provisioner token contract

The temporary token must be:

- scoped to the exact Cloudflare account;
- limited to the minimum Workers Scripts read/edit permissions required;
- denied DNS, Worker Routes, zone settings, Custom Hostname, billing, membership and API-token administration permissions;
- stored only as `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` in Lovable Secrets;
- never copied into GitHub, local files, chat, logs or Worker bindings;
- revoked immediately after sanitized post-provisioning proof.

Because Cloudflare token scope may not restrict an edit grant to one script, the Edge Function must enforce the exact Worker allowlist and reject every other target.

## 11. Edge Function authorization contract

The one-shot bridge must:

1. keep JWT verification enabled;
2. accept only an authenticated user session;
3. verify global Super Admin authority server-side;
4. require one server-owned, expiring, single-use ceremony state persisted in the dedicated control table;
5. accept no tenant ID as authority;
6. accept no secret value in the request;
7. pin account ID, Worker name, immutable Worker ID, source version, source digest, zero deployments and Git HEAD;
8. reject replay, concurrency, timeout ambiguity and drift;
9. become incapable of a provider call after the provisioner secret is removed.

No frontend surface is added. Invocation uses the minimum authenticated operator path supported by the managed environment and must be proven in the implementation audit.

## 12. Cloudflare version-creation contract

Primary operation:

```text
METHOD = POST
PATH = /accounts/{account_id}/workers/workers/{worker_id}/versions
CONTENT_TYPE = application/json
REAL_SECRET_VALUE_COUNT = 3
COMPLETE_BINDING_ARRAY = required
ASSETS_BINDING = inherit from exact source version
CANARY_BINDING_ABSENT_FROM_FINAL = true
VERSION_ANNOTATION = non-secret ceremony identifier + expected Git HEAD + source version
```

Mandatory semantic gate before transmission:

```text
CURRENT_OPENAPI_RETRIEVED = true
RESOURCE_VERSION_ENDPOINT_PRESENT = true
COMPLETE_VERSION_REQUEST_PRESENT = true
SECRET_TEXT_BINDING_PRESENT = true
PINNED_INHERIT_BINDING_PRESENT = true
RESULT_OMITS_SECRET_VALUES = true
```

OpenAPI structure alone is insufficient. Before any real-secret transmission, one complete synthetic-canary version must be created from the exact pinned source payload with `SPR01_VERSION_ONLY_CANARY` as a fixed non-secret binding. It must prove:

The bridge must retrieve the exact pinned source version through the resource API, recompute its sanitized source/configuration digest and fail closed before version creation if the response cannot reproduce the modules, compatibility settings and approved non-secret binding inventory. The canary and final requests must use an explicit `inherit` binding for `ASSETS` pinned to that source version; they must never reuse an asset-upload token.

```text
CANARY_VERSION_CREATE_REQUEST_COUNT = 1
CANARY_VERSION_CREATED = true
CANARY_VERSION_DEPLOYED = false
DEPLOYMENT_COUNT_REMAINS_ZERO = true
PUBLIC_INGRESS_UNCHANGED = true
SCHEDULED_INGRESS_UNCHANGED = true
ASSETS_BINDING_DIGEST_UNCHANGED = true
```

Only then may one final complete version request use the pinned source modules and compatibility settings, inherit `ASSETS` from the exact source version, preserve every other approved non-secret binding, omit the canary and add exactly the three real `secret_text` bindings.

```text
TOTAL_VERSION_CREATE_REQUEST_COUNT_AFTER_SOURCE = 2
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT = 1
EXPECTED_TOTAL_VERSION_COUNT = 3
EXPECTED_TOTAL_DEPLOYMENT_COUNT = 0
```

Legacy script-secret endpoints, `wrangler secret put`, sequential secret writes and any primitive that immediately deploys are prohibited.

## 13. Idempotency and drift control

```text
CEREMONY_ID = unique and single-use
EXPECTED_WORKER = exact match
EXPECTED_SOURCE_VERSION = exact match
EXPECTED_SOURCE_VERSION_DIGEST = exact match
EXPECTED_DEPLOYMENT_COUNT = zero
EXPECTED_GIT_HEAD = exact match
EXPECTED_BINDING_SET = exact final set
EXPECTED_VERSION_CREATE_COUNT_AFTER_SOURCE = two: one synthetic canary plus one final real-secret version
REAL_SECRET_VERSION_CREATE_COUNT = one
RETRY_WITHOUT_RECONCILIATION = prohibited
```

Before mutation, list current versions, deployments and secret names. After mutation, list them again. Any unexpected version, deployment, secret, route, subdomain or Cron drift blocks acceptance.

The first provider-mutating invocation must atomically insert the exact server-owned tuple into `public.spr01_managed_secret_ceremonies` with an active lease and state `executing`. Unique conflict, active lease, expired ceremony or terminal state fails before provider access. The table stores only sanitized identifiers, timestamps, status, lease expiry, version IDs/annotations and classification. It stores no URL secret, key, token, JWT, cookie, authorization header or serialized provider body.

If execution becomes ambiguous, no second mutation is allowed while the lease is active. After expiry, an authenticated recovery invocation may atomically enter `reconciling` and perform only read-only Cloudflare inspection until the annotation proves applied, not applied or still ambiguous. A retry is possible only after conclusive non-application and an atomic state transition; otherwise the ceremony remains blocked.

## 14. Logging, error and response contract

Logging must use an explicit allowlist. Generic request/response dumping, environment dumping and serialized exception bodies are prohibited.

The sanitized result may contain only:

```text
ceremony_id
worker_name
source_version_id
result_version_id or version annotation
required secret names
deployment count remains zero boolean
workers.dev disabled boolean
preview URLs disabled boolean
route count
Cron count
bridge capability disabled boolean
provisioner secret removed boolean
provisioner token revoked boolean
```

Secret values are never evidence.

## 15. Post-provisioning verification

The exact acceptance predicate is:

```text
RESULT_VERSION_EXISTS = true
RESULT_VERSION_DEPLOYED = false
SEMANTIC_CANARY_PASSED = true
CANARY_VERSION_DEPLOYED = false
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
REQUIRED_SECRET_NAMES = exact set of 3
UNEXPECTED_SECRET_NAMES = empty
SECRET_VALUES_RETURNED = false
ASSETS_BINDING_PRESERVED = true
CODE_PROVENANCE_PRESERVED = true
COMPATIBILITY_SETTINGS_PRESERVED = true
WORKERS_DEV_DISABLED = true
PREVIEW_URLS_DISABLED = true
ZONE_ROUTE_COUNT = 0
CRON_COUNT = 0
```

No HTTP or scheduled execution against the secret-bearing version occurs in SPR-01.

## 16. Teardown contract

Before terminal acceptance:

1. remove `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` from Lovable Secrets immediately after one success;
2. prove a later authenticated invocation fails closed before any Cloudflare request;
3. preserve the Edge Function source in GitHub for direct audit;
4. optionally undeploy the Edge Function runtime when Lovable supports doing so without deleting the auditable source;
5. revoke the Cloudflare token;
6. prove token verification fails after revocation;
7. retain only sanitized evidence;
8. keep the secret-bearing version inactive and all ingress disabled.

The Owner does not perform Supabase dashboard cleanup. Lovable must remove the temporary provisioner secret and disable the Edge Function capability; runtime undeployment is optional only when its source remains auditable.

## 17. Rollback

### Before secret-version creation

Remove the undeployed Worker only under a separate exact-target authorization after proving no later resource depends on it.

### After secret-version creation, before deployment

Keep ingress disabled, remove the provisioner secret, prove the bridge capability is disabled, revoke the provisioner token, and either retain the inactive version for audit or delete the exact SPR-01-created Worker/version under separate authorization.

Rollback never mutates the backend, rotates the Supabase administrative secret, introduces an external Supabase project or enables a fallback path.

## 18. Deterministic tests

The future implementation specification must cover:

1. exact source-variable allowlist;
2. no client secret fields;
3. JWT and Super Admin checks;
4. exact Worker/account/source-version/source-digest pinning and zero-deployment precondition;
5. ceremony migration security: RLS enabled, no client policies, revoked `PUBLIC`/`anon`/`authenticated`, minimum `service_role`, no secret-bearing column;
6. atomic first claim succeeds once and replay/concurrency fail before provider access;
7. expired-lease recovery performs read-only reconciliation and no blind retry;
8. synthetic canary proves version-only semantics before real-secret transmission;
9. one final complete-version request writes exactly three real secret bindings and omits the canary;
10. no legacy script-secret endpoint or sequential real-secret write;
11. request, exception and log redaction;
12. deployment count remains zero across both new versions;
13. version-annotation idempotency;
14. assets/code/compatibility preservation;
15. no public or scheduled ingress;
16. ambiguous-timeout reconciliation;
17. bridge capability disablement and token revocation;
18. WRI-01, DCA-01 and Release Gate regression suites.

Tests may not use real secret values. Test fixtures must use unmistakably synthetic material and prove redaction.

## 19. Evidence artifact

Create during future implementation:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
  spr-01-managed-secret-provisioning-execution.md
```

It must record exact heads, version/deployment identifiers, secret names, before/after sanitized inventories, mutation count, bridge disablement, revocation, test results and files changed. It must not record values, authorization headers, full provider responses or an autoreferential final commit SHA.

## 20. Definition of Done

```text
PLANNING_MERGE_ACCEPTED = true
EXPLICIT_IMPLEMENTATION_AUTHORIZATION = true
EXACT_HEAD_GATES = passed
OWNER_SERVICE_ROLE_ACCESS = false
SAME_BACKEND_PRESERVED = true
SOURCE_VERSION_FROM_EXACT_HEAD = true
WORKER_INGRESS_DISABLED = true
COMPLETE_SECRET_VERSION_CREATION = true
SEMANTIC_CANARY_PASSED = true
DURABLE_CEREMONY_CONTROL = passed
ATOMIC_CLAIM_AND_REPLAY_DENIAL = passed
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT = 1
SECRET_BEARING_VERSION_DEPLOYED = false
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
REQUIRED_SECRET_SET_EXACT = true
SECRET_VALUE_EXPOSURE = false
BRIDGE_CAPABILITY_DISABLED = true
PROVISIONER_SECRET_REMOVED = true
PROVISIONER_TOKEN_REVOKED = true
EVIDENCE_VALID = true
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
BCA01_STARTED = false
PRM3_STARTED = false
```

## 21. State ceiling

The merged planning authority establishes only:

```text
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_IMPLEMENTATION_AUTHORIZED = false
SPR01_IMPLEMENTATION_STARTED = false
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
NEXT_STAGE_AUTHORIZED = none beyond SPR-01 planning terminal reconciliation
```

The protected planning merge is Accepted through PR #75. The principal implementation remains unstarted and may begin only after one explicit end-to-end Product Owner authorization. Even terminal planning acceptance does not activate the Worker or authorize DCA-01 external proof.

## 22. Planning non-execution record

```text
GITHUB_DOCUMENTATION_MUTATION = this planning branch only
LOVABLE_RUNTIME_MUTATION = false
SUPABASE_SECRET_ACCESSED = false
EDGE_FUNCTION_CREATED = false
CLOUDFLARE_WORKER_CREATED = false
CLOUDFLARE_VERSION_CREATED = false
CLOUDFLARE_DEPLOYMENT_CREATED = false
CRON_TRIGGER_CREATED = false
DNS_MUTATION_EXECUTED = false
ROUTE_MUTATION_EXECUTED = false
CUSTOM_HOSTNAME_CREATED = false
MANAGED_MIGRATION_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
