# SPR-02 — Managed Secret Provisioning Replacement Path Impact Analysis

## Status

**Ready for External Audit — planning-only — no runtime/provider mutation authorized**

```text
STAGE_ID = SPR-02
STAGE_NAME = Managed Secret Provisioning Replacement Path Planning
STAGE_TYPE = finite_architecture_first_replacement_planning
BASE_BRANCH = main
PLANNING_BASELINE_MAIN = 9d7e81a519a16c7365db177dcbd8748df4c84708
PLANNING_BRANCH = agent/spr-02-managed-secret-provisioning-replacement-planning
PLANNING_STATE = Ready for External Audit
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
RUNTIME_MUTATION_EXECUTED = false
PROVIDER_MUTATION_EXECUTED = false
MANAGED_MIGRATION_EXECUTED = false
DEPLOY_EXECUTED = false
SECRET_VALUE_EXPOSED = false
```

## 1. Trigger and predecessor reconciliation

SPR-02 exists because the finite SPR-01 implementation exhausted its implementation budget without producing a valid implementation.

The two SPR-01 scopes remain distinct and must not be collapsed:

```text
SPR01_PLANNING_STATE = Accepted / Merged / Closed
SPR01_PLANNING_PR = 75
SPR01_PLANNING_MERGE_SHA = 5c4562531247f3c9b85b9fa3a1c799d6ef32fa7c

SPR01_IMPLEMENTATION_STATE = Rejected
SPR01_IMPLEMENTATION_FILES_CHANGED = 0
SPR01_IMPLEMENTATION_PR = none
SPR01_PRINCIPAL_PROMPT = consumed
SPR01_CONSOLIDATED_CORRECTIVE_PROMPT = consumed
SPR01_IMPLEMENTATION_PROMPT_BUDGET = 2/2 consumed
SPR01_THIRD_IMPLEMENTATION_PROMPT = prohibited
```

The later read-only capability audit was factual inspection only. It did not mutate runtime or repository state and does not alter the SPR-01 budget.

The rejected SPR-01 implementation attempted to realize a planning contract whose secret-transfer executor was a new Supabase Edge Function. The Lovable project-specific capability audit established that the managed platform has an Edge Function runtime but that the active executor policy for this TanStack Start + Lovable Cloud project prohibits the agent from creating a new Supabase Edge Function. The failure is therefore an executor-policy incompatibility with the frozen SPR-01 implementation strategy, not a demonstrated incapacity of Supabase itself.

Historical SPR-01 planning remains valid evidence of the custody problem and the zero-deployment Cloudflare versioning contract. It is not current implementation authority for the rejected Edge Function bridge.

## 2. Direct GitHub baseline evidence

At the start of SPR-02 planning, direct GitHub inspection established:

```text
AUDITED_MAIN = 9d7e81a519a16c7365db177dcbd8748df4c84708
AUDITED_MAIN_MATCH = true
FAILED_IMPLEMENTATION_BRANCH = agent/spr-01-managed-secret-provisioning
FAILED_IMPLEMENTATION_BRANCH_HEAD = 9d7e81a519a16c7365db177dcbd8748df4c84708
FAILED_IMPLEMENTATION_BRANCH_COMPARE_TO_MAIN = identical
FAILED_IMPLEMENTATION_FILES_CHANGED = 0
OPEN_SPR01_PULL_REQUESTS = 0
COMPETING_SPR02_BRANCH_AT_START = false
```

The Lovable workspace SHA `bd7b1b71b2841f038b06c280442acf789086e2eb` is not the canonical GitHub `main` and is not adopted as a baseline.

## 3. External cleanup reconciliation

The Product Owner confirmed:

```text
CLOUDFLARE_API_TOKEN_SPR01_PROVISIONER = revoked_and_removed
```

A project-specific read-only Lovable secret-store metadata inspection subsequently established:

```text
SPR01_PROVISIONER_SECRET_NAME_IN_CURRENT_LOVABLE_STORE = false
STALE_SANDBOX_ENV_SNAPSHOT_OBSERVED = true
OWNER_ACTION_REQUIRED_FOR_SPR01_TOKEN_CLEANUP = false
```

The stale sandbox process environment is not current secret-store authority. SPR-02 must treat the old SPR-01 provisioner token as unavailable and must never attempt to reuse it.

If implementation later requires a temporary Cloudflare provisioning credential, it must be a newly issued, least-privilege, stage-specific credential:

```text
FUTURE_TEMPORARY_TOKEN_NAME = CLOUDFLARE_API_TOKEN_SPR02_PROVISIONER
CURRENTLY_REQUIRED_FOR_PLANNING = false
TARGET_WORKER_BINDING = false
```

Its creation is an external dependency after planning acceptance, not part of this planning execution.

## 4. Binding objective

SPR-02 must identify one executable replacement boundary that can transfer exactly these final server-side Worker bindings without the Product Owner receiving, copying, storing or transporting the Supabase administrative key:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
```

The temporary provisioning credential, if required, is never a target Worker binding.

The target Cloudflare transaction remains an inactive versioning ceremony. A Worker version and a Worker deployment are distinct resources; implementation must continue to prove that the secret-bearing version is created without activating traffic.

## 5. Frozen invariants

```text
SERVER_IS_AUTHORITY = true
CLIENT_IS_AUTHORITY = false
FAIL_FAST = true
FAIL_CLOSED = true
OWNER_SUPABASE_SERVICE_ROLE_ACCESS = false
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_FALLBACK = prohibited
NO_TENANT_DEFAULT = true
NO_HEURISTIC_FALLBACK = true
NO_DUAL_PATH = true
SUPER_ADMIN_WITHOUT_EXPLICIT_IMPERSONATION_CANNOT_ACCESS_TENANT_SCOPED_RESOURCES = true
X_TENANT_ID = transport_only
SIGNED_URL_IS_PRIMARY_AUTHORIZATION = false
```

SPR-02 is a global platform provisioning ceremony. It grants no tenant authority, accepts no tenant as an authorization input and does not weaken the explicit-impersonation rule for tenant-scoped resources.

Fases 2, 3 and 4, LSH-01, LSV-01, LSV-02 and LSR-01 remain closed or superseded and are not reopened.

## 6. Repository evidence for the TanStack boundary

Direct GitHub inspection of the audited baseline proves the following current application properties:

1. `src/lib/config.server.ts` defines the existing server-only environment access pattern and requires request-time `process.env` reads on the Cloudflare edge runtime.
2. `src/integrations/supabase/client.server.ts` already reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exclusively in a server-side module and constructs the administrative Supabase client there.
3. `src/integrations/supabase/auth-middleware.ts` already validates a Bearer token server-side and resolves the authenticated user ID.
4. `src/lib/api/super.functions.ts` already demonstrates authenticated TanStack server functions and an exact server-side global `super_admin` authorization check.
5. `src/server.ts` is the single application server entry and delegates requests to the existing TanStack Start server entry inside the accepted Nitro/Cloudflare runtime bridge.

These facts show that a TanStack server boundary does not require a new secret custodian. It can execute inside the same application server authority that already consumes the Lovable-managed Supabase secret.

## 7. Project-specific managed-runtime capability evidence

Because secret injection behavior is a characteristic of the managed Lovable environment and cannot be proved from GitHub alone, a read-only project capability audit was performed without file edits or provider mutation.

It established:

```text
LOVABLE_AUDIT_FILES_CHANGED = 0
LOVABLE_AUDIT_MUTATIONS = 0
LOVABLE_AUDIT_SECRET_VALUE_EXPOSED = false

TANSTACK_SERVER_PROCESS_ENV_SUPPORTED = true
SUPABASE_URL_AVAILABLE_SERVER_SIDE = true
SUPABASE_SERVICE_ROLE_KEY_AVAILABLE_SERVER_SIDE = true
ADDITIONAL_UNPREFIXED_LOVABLE_SECRET_SUPPORTED_SERVER_SIDE = true
CREATE_SERVER_FN_POLICY_PROHIBITION = false
TANSTACK_SERVER_ROUTE_POLICY_PROHIBITION = false
TANSTACK_BOUNDARY_USES_EXISTING_APPLICATION_RUNTIME = true
SECOND_DEPLOY_AUTHORITY_CREATED_BY_TANSTACK_BOUNDARY = false
```

No secret value was read into documentation, logs or chat evidence. Presence and platform capability are sufficient evidence.

## 8. Strategy comparison

### Strategy A — existing TanStack managed server boundary

Candidate primitives:

```text
createServerFn
TanStack server route
server-only helper modules
existing Nitro/TanStack application server runtime
```

Factual assessment:

| Requirement | Result | Evidence / decision |
|---|---|---|
| Read `SUPABASE_SERVICE_ROLE_KEY` server-side | Pass | already used by `client.server.ts`; managed runtime capability confirmed |
| Read `SUPABASE_URL` server-side | Pass | existing middleware/client and managed runtime capability confirmed |
| Read `CLOUDFLARE_API_TOKEN_DCA01_HML` server-side | Pass by platform capability | unprefixed Lovable Secrets are server-only; value never inspected |
| Receive a future stage-specific provisioner token server-side | Pass by platform capability | unprefixed Lovable Secret; old SPR-01 token remains prohibited |
| Prevent browser exposure | Pass with server-only boundary | no `VITE_*`, no return/log of secret values, server-only helper required |
| Validate authenticated session | Pass | existing Bearer/claims middleware pattern |
| Prove global Super Admin | Pass | existing exact `user_roles.role = super_admin` pattern |
| One-shot/replay/lease/atomicity | Pass by planned durable control contract | requires one dedicated sanitized control migration during implementation |
| Call Cloudflare Version API without target Worker deployment | Pass | Cloudflare version upload is separate from deployment; live semantic gate remains mandatory |
| Create second runtime/deploy authority | No | boundary compiles into the existing application server runtime |
| Require external Supabase fallback | No | same managed backend remains secret custodian |

#### A1. `createServerFn`

Technically valid and already established in the repository. It is best suited to RPC calls initiated by application code. Using it for this ceremony would require an application call site or temporary operator UI surface, increasing client-facing surface area without adding security value.

#### A2. TanStack server route — selected primitive

A dedicated authenticated server route is the preferred operational primitive because it:

- remains in the existing TanStack/Nitro server runtime;
- requires no permanent frontend control surface;
- can expose a narrow one-shot HTTP contract for an authenticated operator;
- can validate Bearer authentication and global Super Admin authority entirely server-side;
- can delegate every sensitive operation to a `.server.ts` helper;
- can accept only sanitized transport identifiers and never a secret value;
- can become fail-closed after removal of the temporary SPR-02 provisioner credential while the auditable source remains in GitHub.

The route is not tenant authority and must not accept tenant IDs.

### Strategy B — alternative managed primitive

No superior managed primitive was identified.

Rejected or non-selected candidates:

1. **New Supabase Edge Function** — rejected for SPR-02 because it recreates the exact executor-policy incompatibility that terminated SPR-01.
2. **Database row / PostgreSQL function as secret bridge** — rejected because the service role or Cloudflare provisioning credential must not be persisted in a database row, migration, function body or SQL-visible material; it would also relocate secret custody unnecessarily.
3. **Permanent managed proxy/service** — rejected because it would create a persistent secondary operational boundary for a one-shot ceremony and risk a dual path.
4. **GitHub Actions secret bridge** — rejected because it would create a new secret custodian and require copying the service role into GitHub.

Strategy B therefore has no candidate that satisfies the objective with fewer authorities than Strategy A.

### Strategy C — provider-mediated replacement

Cloudflare can receive a complete inactive Worker version without deploying it, but Cloudflare cannot originate the Lovable-managed `SUPABASE_SERVICE_ROLE_KEY`. A trusted server-side custodian must still transmit the value across the provider boundary.

A Cloudflare-side secret store or other provider primitive would still require the secret to be transferred to that provider first and would change the accepted final binding/custody model. A Supabase-side provider call would still require a Cloudflare mutation credential and a permitted server execution primitive.

Therefore no provider-mediated path removes the need for the trusted server bridge while also preserving:

```text
OWNER_SERVICE_ROLE_ACCESS = false
EXTERNAL_SUPABASE_FALLBACK = false
TARGET_WORKER_DEPLOYMENT_COUNT = 0
EXACT_FINAL_BINDING_SET = 3
NO_SECOND_APPLICATION_RUNTIME_AUTHORITY = true
```

Strategy C is not selected.

## 9. Selected replacement architecture

```text
SPR02_SELECTED_STRATEGY = Strategy A
SPR02_SELECTED_PRIMITIVE = authenticated TanStack server route + server-only helper
APPLICATION_RUNTIME_AUTHORITY = existing Lovable Cloud TanStack Start / Nitro server runtime
SUPABASE_SECRET_CUSTODIAN = existing managed application server environment
TARGET_PROVIDER = Cloudflare Worker Version API
TARGET_WORKER_DEPLOYMENT_DURING_SECRET_PROVISIONING = prohibited
```

The selected flow is:

```text
exact GitHub main + accepted WRI-01 build authority
→ undeployed target Worker/source-version prerequisites preserved from SPR-01
→ authenticated TanStack server route in the existing managed runtime
→ server-side Bearer validation
→ exact global Super Admin check
→ atomic sanitized ceremony claim with lease
→ read-only Cloudflare drift reconciliation
→ synthetic non-secret version-only semantic canary
→ one complete final inactive version with exactly three secret bindings
→ prove target Worker deployment count remains zero
→ disable bridge capability by removing the temporary SPR-02 provisioner secret
→ revoke the temporary Cloudflare provisioner token
→ preserve sanitized evidence only
```

SPR-02 replaces only the rejected secret-transfer executor. It does not reopen the accepted WRI-01 build/deploy authority or the previously planned Cloudflare version-versus-deployment safety model except where current live API verification requires fail-closed adaptation before execution.

## 10. Authorization boundary

The future server route must satisfy all of the following before any provider mutation:

1. request contains an `Authorization: Bearer ...` header;
2. token is validated server-side against the canonical Supabase Auth authority;
3. authenticated subject is resolved from verified claims, never from request body;
4. server independently proves the exact global `super_admin` role;
5. no tenant ID participates in authorization;
6. no secret value is accepted in headers, path, query or body;
7. target account/Worker/source-version/Git identifiers carried by the request are transport only and are revalidated against server-owned allowlists and direct provider/Git evidence;
8. the ceremony row is atomically claimed before provider mutation;
9. drift, ambiguity, replay, concurrency, stale lease or unexpected provider state fails closed.

## 11. Durable one-shot control

The future implementation may add exactly one dedicated control table:

```text
CONTROL_TABLE = public.spr02_managed_secret_ceremonies
```

The table may store only sanitized identifiers and state required for replay/concurrency control, for example:

```text
ceremony_id
expected_git_head
expected_worker_name
expected_worker_id
expected_source_version_id
expected_source_digest
state
lease_expires_at
attempt_classification
canary_version_id
final_version_id
created_at
updated_at
completed_at
```

It must never store:

```text
SUPABASE_SERVICE_ROLE_KEY value
SUPABASE_URL secret-bearing serialized payload
Cloudflare token value
Authorization header
JWT
cookie
provider request body
provider response body containing credentials
```

RLS must be enabled; no client policy is allowed; `PUBLIC`, `anon` and `authenticated` must have no table privileges; only the minimum server authority may access it.

## 12. Secret and logging contract

Future implementation must use an explicit source allowlist and never enumerate or dump the process environment.

Allowed sensitive environment variable names:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_API_TOKEN_DCA01_HML
CLOUDFLARE_API_TOKEN_SPR02_PROVISIONER
```

The last name is temporary and is not a Worker binding.

Logs and responses may contain only sanitized identifiers, names of required bindings, booleans, counts, timestamps, hashes/digests that cannot reveal values, and provider resource IDs.

Generic request dumps, response dumps, exception serialization, environment dumps and secret-value comparison output are prohibited.

## 13. Cloudflare transaction preserved from SPR-01

SPR-02 does not authorize a Cloudflare mutation during planning.

The future implementation must re-read current official Cloudflare API semantics immediately before the first provider mutation and must prove that the chosen Worker Version primitive still:

- creates a version without deploying it;
- preserves the exact source/version provenance required by WRI-01;
- supports the complete binding transaction required for the final version;
- leaves Worker deployment count at zero;
- does not enable workers.dev, Preview URLs, routes, Cron, DNS, fallback origin or Custom Hostnames.

The existing SPR-01 prohibition remains binding against:

```text
wrangler secret put
legacy sequential secret writes
partial real-secret mutations
any primitive that immediately deploys the resulting version
```

A synthetic non-secret canary must precede the single real-secret version creation. If current Cloudflare semantics cannot reproduce the zero-deployment and complete-version contract, implementation stops before any real secret is transmitted.

## 14. Temporary provisioner token policy

`CLOUDFLARE_API_TOKEN_DCA01_HML` remains a final Worker binding. Its existing permissions must not be assumed to include version-provisioning authority.

If the existing runtime credential cannot safely perform the bounded provisioning operation, the future implementation requires a new token named:

```text
CLOUDFLARE_API_TOKEN_SPR02_PROVISIONER
```

It must be:

- created only after SPR-02 planning is Accepted and implementation is authorized;
- scoped to the exact Cloudflare account and minimum Workers Scripts read/write permissions required by the live API;
- denied DNS, Worker Routes, Custom Hostnames, zone settings, billing, membership and token-administration permissions;
- stored only in Lovable Secrets / the same managed server environment;
- never copied to GitHub, chat, logs, screenshots, database rows or target Worker bindings;
- removed from the managed secret store immediately after the sanitized success proof;
- revoked at Cloudflare before terminal acceptance.

The old SPR-01 provisioner token must never be recreated or reused under its old name.

## 15. Runtime/deploy authority analysis

The selected boundary adds server code to the existing application, but it does not create a second application runtime or second deployment authority.

```text
EXISTING_APPLICATION_SERVER_ENTRY = src/server.ts
EXISTING_BUILD_AUTHORITY = @lovable.dev/vite-tanstack-config + Nitro cloudflare-module
SPR02_SERVER_BOUNDARY = part of existing TanStack server entry
NEW_SUPABASE_EDGE_FUNCTION = prohibited
SECOND_SERVER_APPLICATION = prohibited
SECOND_SUPABASE_PROJECT = prohibited
SECOND_WORKER_DEPLOY_AUTHORITY = prohibited
```

Any preview/publish mechanics needed to make the new route executable are deployment mechanics of the already accepted application authority and must be explicitly evidenced in the implementation runbook. They do not authorize deployment of the target Cloudflare Worker version.

## 16. Implementation envelope implications

The future implementation must be finite and closed. It may materialize only:

- one authenticated TanStack server route;
- server-only helper(s) strictly necessary for the ceremony;
- one dedicated sanitized ceremony-control migration;
- one deterministic SPR-02 specification harness;
- minimum package script registration if required;
- SPR-02 execution evidence and reconciled canonical docs.

It must not edit generated Supabase integration files to inject secrets or authorization behavior.

## 17. Tests required for future implementation

The future implementation envelope must require at minimum:

1. secret-source allowlist and no `VITE_*` use for sensitive values;
2. client/request schema contains no secret field;
3. missing/invalid Bearer authentication fails before provider access;
4. non-Super-Admin fails before provider access;
5. tenant input has no authorization effect and preferably is rejected as unknown input;
6. exact Worker/account/source/Git pinning and direct revalidation;
7. atomic first claim, replay rejection and concurrent claim rejection;
8. active lease rejection and expired-lease read-only reconciliation;
9. ambiguous provider timeout produces no blind retry;
10. Cloudflare semantic-canary proof before real-secret transmission;
11. exactly one real-secret version creation request;
12. exact final required secret-name set of three and zero unexpected names;
13. target Worker deployment count remains zero;
14. public/scheduled ingress remains unchanged;
15. route fails closed before provider access after temporary provisioner secret removal;
16. secret-value patterns absent from logs, responses, evidence and Git diff;
17. typecheck, build and existing WRI-01/DCA-01 regression gates pass;
18. no file outside `FILES_ALLOWED` is changed.

## 18. Strategies explicitly prohibited

```text
Owner handles SUPABASE_SERVICE_ROLE_KEY
Owner retrieves secret value
secret in frontend
secret in VITE_*
secret in GitHub
secret in commit
secret in migration
secret value in database row
secret in logs
secret in prompt
secret in screenshot
external Supabase fallback
new Supabase Edge Function created in deliberate violation of active executor policy
use bd7b1b71b2841f038b06c280442acf789086e2eb as canonical main
implementation before SPR-02 planning acceptance
wrangler secret put
sequential real-secret writes
Cloudflare target Worker deployment
workers.dev enablement
Cloudflare Preview URL activation
DNS mutation
Worker route mutation
Cron creation
Custom Hostname creation
DCA-01 external proof
BCA-01
PR-M3
```

## 19. Downstream state

```text
WRI01_STATE = Accepted / Merged / Closed
DCA01_REPOSITORY_IMPLEMENTATION_STATE = Accepted / Merged / Closed
DCA01_CONTROLLED_EXTERNAL_PROOF_STATE = Blocked External
DCA01_EXTERNAL_PROOF_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

DCA-01 controlled external proof remains blocked until SPR-02 replacement provisioning reaches a terminal state that makes the required inactive secret-bearing version available and a separate DCA-01 proof authorization is issued.

## 20. Planning decision

```text
SPR02_REPLACEMENT_STRATEGIES_COMPARED = true
SPR02_SINGLE_STRATEGY_SELECTED = true
SPR02_SELECTED_STRATEGY = Strategy A
SPR02_SELECTED_PRIMITIVE = authenticated TanStack server route + server-only helper
SPR02_RUNTIME_IMPLEMENTATION_EXECUTED = false
CLOUDFLARE_MUTATION_EXECUTED = false
SUPABASE_MANAGED_MIGRATION_EXECUTED = false
DCA01_EXTERNAL_PROOF_EXECUTED = false
BCA01_STARTED = false
PRM3_STARTED = false
SECRET_VALUE_EXPOSED = false
```

The next artifact is the finite SPR-02 Execution Envelope. No implementation is authorized by this Impact Analysis.