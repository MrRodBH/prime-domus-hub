# SPR-01 — Managed Secret Provisioning Reconciliation Impact Analysis

## Status

**Ready for External Audit — planning-only — implementation and every external operation remain unauthorized**

```text
STAGE_ID = SPR-01
STAGE_NAME = Managed Secret Provisioning Reconciliation
STAGE_TYPE = finite_security_and_external-operation_prerequisite
PLANNING_BASELINE_MAIN = cc45ec8c334bdea3965830426992a705271b1103
PLANNING_BRANCH = agent/spr-01-managed-secret-provisioning-planning
SPR01_PLANNING_STATE = Ready for External Audit
SPR01_PLANNING_MERGE_AUTHORIZED = false
SPR01_IMPLEMENTATION_AUTHORIZED = false
SPR01_IMPLEMENTATION_STARTED = false

OWNER_SUPABASE_DASHBOARD_ACCESS = false
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false
SUPABASE_SECRET_CUSTODY = Lovable-managed backend only
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_FALLBACK = prohibited

WRI01_STATE = Accepted / Merged / Closed
DCA01_REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed
DCA01_WORKER_RUNTIME_PREFLIGHT_HISTORICAL = Rejected
DCA01_RUNTIME_DEFECT_RESOLUTION = WRI-01 Accepted / Merged / Closed
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_EXECUTABLE = false

TARGET_WORKER = rm-prime-wri01-hml
TARGET_WORKER_EXISTS_AT_PLANNING = false
CLOUDFLARE_WORKER_COUNT_AT_PLANNING = 0

DEPLOY_EXECUTED = false
SECRET_ACCESSED = false
SECRET_PROVISIONED = false
EDGE_FUNCTION_CREATED = false
WORKER_CREATED = false
CRON_TRIGGER_CREATED = false
DNS_MUTATION_EXECUTED = false
ROUTE_MUTATION_EXECUTED = false
CUSTOM_HOSTNAME_CREATED = false
MANAGED_MIGRATION_EXECUTED = false
```

## 1. Executive decision

SPR-01 selects one bounded custody and provisioning architecture:

> **Managed two-operator zero-deployment provisioning** — create an undeployed Worker resource, upload the exact accepted repository artifact as an inactive source version, create one synthetic-canary version and one final secret-bearing version without creating a deployment, then disable the one-shot Lovable provisioning capability before any public or scheduled ingress is enabled.

The selected architecture preserves all three authorities:

```text
SOURCE_AND_BUILD_AUTHORITY = GitHub main + accepted WRI-01 toolchain
SUPABASE_SECRET_CUSTODY = Lovable-managed backend
CLOUDFLARE_VERSION_AND_DEPLOYMENT_AUTHORITY = Cloudflare
```

No operator, browser, GitHub artifact, local shell or ChatGPT transcript may receive `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Trigger and blocking defect

WRI-01 correctly requires these Worker bindings:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

The accepted repository contract defines their names and redaction requirements but does not define:

```text
SECRET_CUSTODIAN
SECRET_SOURCE_ENVIRONMENT
CROSS_PROVIDER_TRANSFER_PROTOCOL
OWNER_EXPOSURE_GUARD
FIRST-WORKER RESOURCE CREATION
VERSION_VERSUS_DEPLOYMENT BOUNDARY
ROTATION_AND_REVOCATION
```

The attempted Owner-operated deploy exposed this missing contract before any remote mutation. Asking the Owner to paste `SUPABASE_SERVICE_ROLE_KEY` is prohibited and is not a valid operational workaround.

## 3. Binding factual evidence

Direct GitHub audit established:

```text
AUDITED_MAIN = cc45ec8c334bdea3965830426992a705271b1103
AUDITED_MAIN_MATCH = true
COMPETING_SPR01_BRANCH = false
COMPETING_SPR01_PR = false
```

Direct read-only Cloudflare inspection on 2026-08-10 established:

```text
CLOUDFLARE_API_READ_SUCCESS = true
ACCOUNT_WORKER_COUNT = 0
TARGET_WORKER_EXISTS = false
```

Cloudflare's current API and documentation establish:

- a Worker version and a Worker deployment are separate resources;
- `POST /accounts/{account_id}/workers/workers` can establish a Worker identity before code is uploaded, and `deployed_on` remains `null` while it has never been deployed;
- `POST /accounts/{account_id}/workers/workers/{worker_id}/versions` creates an immutable version without affecting live traffic;
- version creation accepts a complete `bindings` array, including `secret_text` bindings, plus modules, assets and compatibility configuration in the same request;
- `wrangler versions upload` uploads a version without deploying it and is the selected source-version uploader so the accepted build process handles the canonical Static Assets manifest;
- a version binding may explicitly inherit a binding from a pinned prior version; SPR-01 uses this only for the `ASSETS` binding after live verification;
- `wrangler secret put` creates and deploys a new version immediately and is therefore prohibited for this ceremony;
- the Worker resource exposes explicit `subdomain.enabled` and `subdomain.previews_enabled` controls;
- a version annotation may carry a non-secret ceremony tag;
- a first deployment is not required while the target Worker does not exist.

SPR-01 therefore uses the resource-oriented Worker and Version API. It does not use the legacy script secret endpoints, does not patch a deployed script and does not create a deployment. The future executor must still retrieve and validate the live OpenAPI immediately before execution because this API family is currently identified by Cloudflare as Beta.

## 4. DCA-01 state reconciliation

The following statements describe different scopes and must not be collapsed into one `DCA01_CURRENT_STATE` value:

| Scope | Current authority |
|---|---|
| DCA-01 repository implementation | Accepted / Merged / Closed |
| Historical Worker Runtime Preflight | Rejected |
| Runtime defect resolution | WRI-01 Accepted / Merged / Closed |
| DCA-01 controlled external proof | Blocked External |
| External proof executable | false |

The historical `Rejected` preflight remains evidence. It no longer classifies the current repository implementation after WRI-01 repaired and proved the compiled runtime. The current blocker is external secret provisioning plus the remaining Cloudflare proof prerequisites.

## 5. Strategy comparison

| Strategy | Decision | Reason |
|---|---|---|
| Owner copies `SUPABASE_SERVICE_ROLE_KEY` | Rejected | Violates binding custody and Owner access constraints |
| Create another Supabase project | Prohibited | Violates Same-Backend Homologation Cell |
| Store Supabase administrative material in GitHub Actions | Rejected | Creates a new secret custodian and transfer path |
| Permanent Lovable proxy for every Worker backend call | Rejected | Creates runtime dual path and permanent coupling |
| Sequential `wrangler secret put` calls | Rejected | Each operation may deploy an incomplete intermediate version |
| Legacy script-level secret endpoints | Rejected | They couple the ceremony to script/deployment semantics and do not preserve the selected zero-deployment boundary |
| Cloudflare Secrets Store | Deferred | Changes the accepted synchronous binding contract and remains unnecessary for this finite gate |
| Managed two-operator zero-deployment provisioning | Selected | Keeps the Supabase secret server-side and materializes each complete immutable version without any deployment |

## 6. Selected transaction

### 6.1 Phase A — undeployed Worker resource and source version

Because `rm-prime-wri01-hml` does not exist, the future authorized execution must first establish its identity and source provenance without deploying it.

The source operation must:

1. reconfirm the exact authorized GitHub HEAD;
2. rerun every accepted WRI-01 and DCA-01 repository gate;
3. derive a temporary upload configuration outside the tracked repository;
4. preserve the canonical Worker code, static assets, compatibility settings and `ASSETS` binding;
5. create the Worker resource through `POST /accounts/{account_id}/workers/workers` with explicit ingress controls:

```text
subdomain.enabled = false
subdomain.previews_enabled = false
deployed_on = null
```

6. upload one complete source version with `wrangler versions upload` against the temporary configuration, containing no runtime secrets and no deployment request;
7. prove that no deployment, workers.dev URL, Preview URL, zone route or Cron Trigger exists;
8. record the immutable Worker ID, source version ID, exact Git HEAD, source/configuration digests and sanitized binding inventory.

Worker and version creation are external mutations and require future explicit Product Owner authorization. They are not executed by this planning PR.

### 6.2 Phase B — Lovable-managed provisioning bridge

The bridge is implemented and executed only inside the Same-Backend managed environment because that environment already owns the Supabase administrative secret.

It must read only server-side environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER
```

`CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` is a separate, temporary account token with only the minimum Workers Scripts permissions required to read the pinned Worker/source version, create inactive versions and verify state. It must have no DNS, Worker Routes, Custom Hostname, zone-settings, billing or user-token-management permission.

The bridge must reject every input except a frozen ceremony contract containing:

```text
EXPECTED_ACCOUNT_ID
EXPECTED_WORKER_NAME = rm-prime-wri01-hml
EXPECTED_WORKER_ID
EXPECTED_SOURCE_VERSION_ID
EXPECTED_SOURCE_VERSION_DIGEST
EXPECTED_DEPLOYMENT_COUNT = 0
EXPECTED_GIT_HEAD
EXPECTED_REQUIRED_SECRET_NAMES
ONE_TIME_CEREMONY_ID
```

No request input may contain a secret value.

### 6.3 Phase C — complete immutable version creation

The selected primary primitive is:

```text
POST /accounts/{account_id}/workers/workers/{worker_id}/versions
Content-Type: application/json
```

The final request must create one complete version containing the pinned source modules and compatibility configuration, an explicit `ASSETS` inherit binding pinned to the source version, every other required non-secret binding and exactly these three `secret_text` bindings atomically:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

The complete final bindings array must omit `SPR01_VERSION_ONLY_CANARY`. A unique non-secret version annotation must bind the result to the ceremony ID, expected Git HEAD and pinned source version.

Before any real-secret transmission, the future implementation must retrieve the current official OpenAPI description and prove its structural support. The bridge must retrieve the exact pinned source version, recompute its sanitized source/configuration digest and stop if the response cannot reproduce the modules, compatibility settings and approved non-secret binding inventory. The live schema must support an `inherit` binding pinned to `EXPECTED_SOURCE_VERSION_ID` for `ASSETS`; otherwise execution stops. It must then create one empirical semantic-canary version from that exact payload:

```text
CANARY_NAME = SPR01_VERSION_ONLY_CANARY
CANARY_VALUE = fixed unmistakably synthetic non-secret fixture
CANARY_VERSION_CREATE_REQUEST_COUNT = 1
CANARY_VERSION_ANNOTATION = ceremony ID + semantic-canary
```

The canary request may contain no real secret. It must use the source modules/settings, the source-pinned `ASSETS` inherit binding and the single synthetic binding, create one inactive version and leave deployment count at zero. It must also prove that `ASSETS` still resolves to the same content/configuration digest. If any deployment, ingress or asset drift appears, execution stops before real-secret transmission.

Only after the canary passes may one final request create the complete secret-bearing version from the pinned source payload. The expected complete sequence after source-version creation is:

```text
TOTAL_VERSION_CREATE_REQUEST_COUNT_AFTER_SOURCE = 2
SYNTHETIC_CANARY_VERSION_CREATE_REQUEST_COUNT = 1
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT = 1
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
```

The live gate must prove all of the following:

```text
RESOURCE_VERSION_ENDPOINT_PRESENT = true
COMPLETE_VERSION_REQUEST_SUPPORTED = true
PINNED_ASSETS_INHERIT_SUPPORTED = true
CANARY_VERSION_CREATED = true
CANARY_VERSION_DEPLOYED = false
FINAL_SECRET_VERSION_CREATED = true
FINAL_SECRET_VERSION_DEPLOYED = false
DEPLOYMENT_COUNT_UNCHANGED_AT_ZERO = true
SECRET_VALUES_OMITTED_FROM_RESPONSE = true
```

If the endpoint, permissions, response shape or canary-proven version-only semantics differ, the operation must stop before transmitting any real secret. Falling back to a legacy script-secret endpoint, `wrangler secret put`, sequential real-secret calls or any immediately deployed version is prohibited.

### 6.4 Phase D — post-provisioning proof and teardown

After the final version creation, the bridge and read-only Cloudflare auditor must prove:

```text
SECRET_BEARING_VERSION_CREATED = true
SECRET_BEARING_VERSION_DEPLOYED = false
SEMANTIC_CANARY_VERSION_DEPLOYED = false
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
REQUIRED_SECRET_NAME_COUNT = 3
UNEXPECTED_SECRET_NAME_COUNT = 0
ASSETS_BINDING_PRESERVED = true
CODE_AND_COMPATIBILITY_PROVENANCE_PRESERVED = true
PUBLIC_INGRESS = false
SCHEDULED_INGRESS = false
```

Then, before SPR-01 can become terminally Accepted:

1. remove `CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER` from Lovable Secrets so the function fails before any Cloudflare call;
2. prove a later authenticated invocation returns the sanitized disabled result and performs no provider request;
3. revoke the Cloudflare provisioner token;
4. prove the revoked token can no longer authenticate;
5. keep the function source in GitHub for direct audit, with credential absence as the fail-closed capability gate;
6. optionally undeploy the Edge Function runtime when Lovable supports doing so without removing its auditable source;
7. preserve only sanitized evidence and secret names;
8. leave the secret-bearing Worker version inactive.

No SPR-01 operation enables workers.dev, Preview URLs, Cron, DNS, routes, fallback origin or Custom Hostnames.

## 7. Executor allocation

```text
DOCUMENTATION_AND_GITHUB_PLANNING = ChatGPT GitHub-native
REPOSITORY_READ_ONLY_AUDIT = ChatGPT GitHub-native
CLOUDFLARE_RESOURCE_SOURCE_VERSION_AND_AUDIT = separately authorized Cloudflare operator
MANAGED_SECRET_BRIDGE_IMPLEMENTATION = Lovable
SUPABASE_SECRET_ACCESS = Lovable Edge Function only
PRODUCT_OWNER_SECRET_HANDLING = prohibited for Supabase administrative material
```

Lovable use is not prohibited. It is required for the future bridge portion because the Supabase administrative secret must remain in the managed backend. GitHub-native execution is used for this documentation-only planning materialization to avoid unnecessary Lovable consumption.

## 8. Invocation and authorization boundary

The one-shot Edge Function must keep JWT verification enabled. Invocation must require:

1. a valid authenticated user JWT;
2. a server-side global Super Admin authorization check;
3. an exact, unexpired one-time ceremony record or equivalent server-owned nonce;
4. an exact expected Worker/source-version tuple;
5. no tenant ID or secret material from the client.

Global secret provisioning is a platform operation. It does not grant tenant data authority and does not accept or infer a tenant.

The bridge must be unavailable after the single successful ceremony. Replays, expired ceremonies, mismatched versions, duplicate invocations and concurrent attempts fail closed.

## 9. Idempotency and concurrency

```text
IDEMPOTENCY_KEY = SPR01 ceremony ID + expected Worker ID + source version ID
CONCURRENT_EXECUTION = prohibited
SECOND_SUCCESSFUL_MUTATION = prohibited
VERSION_DRIFT = fail closed
DEPLOYMENT_DRIFT = fail closed
WORKER_NAME_DRIFT = fail closed
ACCOUNT_DRIFT = fail closed
```

An ambiguous timeout is not retried blindly. The auditor first lists versions, deployments and secret names using the ceremony annotation. A retry is permitted only when non-application is proven.

## 10. Logging and response contract

The function must never log or return:

```text
Authorization headers
request bodies containing secret text
environment values
JWTs or cookies
Cloudflare token values
Supabase URLs when treated as secret binding material
service-role material
provider runtime-token material
```

Allowed sanitized output:

```text
ceremony_id
worker_name
source_version_id
result_version_id or version annotation
required secret names
secret values present = omitted
deployment count remains zero boolean
public ingress disabled boolean
scheduled ingress disabled boolean
teardown and revocation booleans
```

## 11. Threat model and fail-closed controls

| Threat | Required control |
|---|---|
| Owner or browser receives service role | No client secret inputs; server-only environment read |
| Function endpoint is invoked by normal tenant user | JWT plus global Super Admin check plus one-time ceremony |
| Wrong Cloudflare account or Worker | Exact allowlist and server-side revalidation |
| Partial secret population | One complete version request; exactly three secret names and exact full binding inventory |
| Static Assets drift or token reuse | Source upload stays in Wrangler; canary/final inherit `ASSETS` from the pinned source version and prove equal digest |
| New version becomes live accidentally | Require deployment count zero before and after; abort acceptance on any deployment |
| Secret appears in logs or errors | Structured redaction and no body logging |
| Provisioner token persists | mandatory removal and revocation before acceptance |
| Replay creates extra versions | one-time state and version-annotation idempotency |
| Concurrent main changes code provenance | exact-head gate before source upload and before secret-version creation |
| Public preview exposure | explicit `workers_dev=false` and `preview_urls=false`, then direct proof |

## 12. Rollback

Before any secret-version creation, rollback deletes only the undeployed Worker resource when separately authorized and when no later dependency exists.

After secret provisioning but before deployment:

1. keep all ingress disabled;
2. revoke the provisioner token;
3. remove the provisioner secret and prove the bridge capability is disabled;
4. delete the inactive secret-bearing version or the entire undeployed Worker only under a separate exact-target authorization;
5. leave Supabase and unrelated Cloudflare resources unchanged.

No rollback rotates or reveals `SUPABASE_SERVICE_ROLE_KEY`, creates a replacement backend, alters database state or enables a fallback path.

## 13. Future implementation scope

The later implementation may alter only a tightly bounded bridge and its evidence, expected to include:

```text
supabase/functions/spr-01-managed-secret-provisioner/index.ts
supabase/config.toml only if an explicit function-level auth declaration is required
run-spr-01-managed-secret-provisioning-specs.ts
package.json only for the deterministic SPR-01 test command

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

No migration, schema, RLS, grant, tenant resolver, domain state machine, Worker application code, `wrangler.jsonc`, frontend route or production setting belongs to the bridge implementation.

## 14. Required deterministic tests

The future principal implementation must prove at least:

1. no client-supplied secret field exists;
2. exactly four server-side source variables are allowlisted;
3. exact account, Worker and source-version IDs and digests are required;
4. non-Super-Admin invocation fails;
5. missing/expired ceremony fails;
6. replay and concurrency fail;
7. one synthetic canary proves version-only semantics before real-secret transmission;
8. all three real secrets and the complete non-secret binding inventory are sent in one version-create request and the canary is absent from the final version;
9. no legacy script-secret or sequential real-secret endpoint is referenced;
10. request, response, exception and logs are redacted;
11. deployment count remains zero after both version creations;
12. assets and code provenance match the pinned source version;
13. public and scheduled ingress remain disabled;
14. ambiguous timeout enters read-only reconciliation before retry;
15. teardown disables bridge capability by removing the provisioner secret;
16. provisioner-token revocation is evidenced;
17. existing WRI-01, DCA-01 and Release Gates remain green.

## 15. Definition of Done

SPR-01 may become terminally Accepted only when a separately authorized implementation proves:

```text
SAME_BACKEND_HOMOLOGATION_CELL_PRESERVED = true
OWNER_SERVICE_ROLE_ACCESS = false
EXTERNAL_SUPABASE_CREATED = false
SOURCE_VERSION_FROM_EXACT_HEAD = true
WORKER_PUBLIC_INGRESS = false
WORKER_SCHEDULED_INGRESS = false
COMPLETE_SECRET_VERSION_CREATION = true
SEMANTIC_CANARY_PASSED = true
REAL_SECRET_VERSION_CREATE_REQUEST_COUNT = 1
REQUIRED_SECRET_NAMES = exact set of 3
SECRET_VALUES_EXPOSED = false
SECRET_BEARING_VERSION_DEPLOYED = false
TOTAL_VERSION_COUNT = 3
TOTAL_DEPLOYMENT_COUNT = 0
WORKER_DEPLOYED_ON = null
ASSETS_BINDING_PRESERVED = true
BRIDGE_REPLAYABLE = false
BRIDGE_CAPABILITY_DISABLED = true
PROVISIONER_SECRET_REMOVED = true
PROVISIONER_TOKEN_REVOKED = true
SANITIZED_EVIDENCE_VALID = true
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
BCA01_STARTED = false
PRM3_STARTED = false
```

SPR-01 acceptance does not deploy the secret-bearing version and does not authorize the DCA-01 controlled external proof. That proof requires a later explicit Product Owner authorization.

## 16. Normative references

- [Cloudflare Workers — Versions and Deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)
- [Cloudflare Workers — resource-oriented Workers API](https://developers.cloudflare.com/changelog/post/2025-09-03-new-workers-api/)
- [Cloudflare Workers API reference](https://developers.cloudflare.com/api/resources/workers/)
- [Cloudflare Workers — Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers — workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Lovable Secrets](https://docs.lovable.dev/features/secrets)
- [Lovable Edge Functions](https://docs.lovable.dev/features/edge-functions)
- [Supabase Edge Function environment variables](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)

## 17. Planning conclusion

```text
SELECTED_STRATEGY = managed two-operator zero-deployment provisioning
PRIMARY_RESOURCE_PRIMITIVE = POST Worker resource before code upload
PRIMARY_SECRET_PRIMITIVE = POST complete inactive Worker version after live semantic verification
FIRST_WORKER_DEPLOYMENT_REQUIRED = false
LOVABLE_MANAGED_BRIDGE_REQUIRED = true
OWNER_MAY_HANDLE_SUPABASE_SERVICE_ROLE_KEY = false

SPR01_PLANNING_STATE = Ready for External Audit
SPR01_PLANNING_MERGE_AUTHORIZED = false
SPR01_IMPLEMENTATION_AUTHORIZED = false
SPR01_IMPLEMENTATION_STARTED = false
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_EXECUTABLE = false
NEXT_STAGE_AUTHORIZED = none beyond direct SPR-01 planning audit
```

This planning materialization changes documentation only. It does not create a Worker, version, deployment, Edge Function, token, secret, Cron, route, DNS record, fallback origin or Custom Hostname.
