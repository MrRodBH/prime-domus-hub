# DCA-02 — Provider Object Identity Implementation Execution Envelope

## Status

**Proposed for protected merge — implementation executable only after this exact envelope is audited and merged**

```text
STAGE_ID = DCA-02
STAGE_NAME = Cloudflare Custom Metadata Independence & Provider Object Identity Binding
ENVELOPE_TYPE = closed_implementation_execution_envelope
BASELINE_MAIN = 2b492b709a0e94a6542b1d34b991f17b65141789
PREDECESSOR_IA = docs/architecture/impact-analysis/DCA-02-cloudflare-custom-metadata-independence-impact-analysis.md
SELECTED_STRATEGY = Strategy C — Server-Bound Provider Object Identity
EXECUTION_MODE = END-TO-END
IMPLEMENTATION_AUTHORIZED_BY_OWNER = true
PRODUCTION_CUTOVER_AUTHORIZED = false
REAL_TENANT_PROOF_AUTHORIZED = false
BCA01 = blocked
PRM3 = blocked
```

This envelope closes the DCA-02 implementation boundary. It does not reopen DCA-01 and does not authorize any production cutover, real-tenant domain activation, root/www/notify DNS mutation, Cloudflare plan upgrade, or weakening of tenant/provider authority.

## 1. Audited baseline

Direct GitHub audit on 2026-08-12 confirmed:

```text
MAIN_HEAD = 2b492b709a0e94a6542b1d34b991f17b65141789
DCA01_TERMINAL_TEARDOWN = Accepted
DCA02_IMPACT_ANALYSIS = Accepted
DCA02_IMPLEMENTATION_STARTED = false at envelope creation
```

Direct database read-only audit confirmed:

```text
DOMAIN_AUTHORITY_MODE = legacy
DOMAIN_AUTHORITY_LOCK_VERSION = 0
DOMAIN_PROVIDER_BINDING_COUNT = 0
REAL_TENANT_DOMAIN_ID = 6eda5a4e-be96-4756-b39b-746d886bc387
REAL_TENANT_HOSTNAME = rmprimeimoveis.com.br
REAL_TENANT_STATUS = pending_ownership_verification
REAL_TENANT_EXECUTION_MODE = manual_assisted
SYNTHETIC_DCA01_DOMAIN_ID = 1d800a0d-b0b4-4f03-b75e-d9c6534a80e1
SYNTHETIC_DCA01_STATUS = revoked
```

The DCA-01 synthetic row and completed operational ledger remain historical evidence and must not be deleted.

## 2. External capability premise

The Cloudflare Custom Hostnames API exposes object identity through the provider-generated Custom Hostname ID and supports exact object retrieval by:

```text
GET /zones/{zone_id}/custom_hostnames/{custom_hostname_id}
```

The API model treats `custom_metadata` as optional. DCA-02 therefore removes it from the authorization/ownership contract rather than treating its absence as a degraded security mode.

The current Cloudflare account has previously proven that Custom Metadata is unavailable (`403 / 1413`). A new live Cloudflare proof remains mandatory before DCA-02 terminal acceptance. If the Cloudflare MCP is unavailable, implementation may proceed through deterministic repository/database gates, but live proof must remain blocked and no inference may substitute for it.

## 3. Binding security model

Cloudflare-side metadata is no longer authority. The only accepted provider-object ownership chain is:

```text
server tenant authority
→ authoritative tenant_domains row
→ current domain generation
→ valid global hostname reservation
→ current-generation ownership verification
→ exact server-owned provider account + zone
→ exactly one server-owned provider binding claim for domain_id + generation
→ exactly one immutable Cloudflare custom_hostname_id
→ GET by persisted provider object ID
→ exact returned ID + authoritative normalized hostname
```

The following are explicitly prohibited:

```text
HOSTNAME_ONLY_PROVIDER_OBJECT_ADOPTION = prohibited
CUSTOM_METADATA_AS_AUTHORITY = prohibited
CLIENT_OBJECT_ID_AS_AUTHORITY = prohibited
ORDER_BY_LIMIT_1_PROVIDER_AUTHORITY = prohibited
SILENT_REBIND = prohibited
SAME_GENERATION_PROVIDER_ID_REPLACEMENT = prohibited
BLIND_POST_RETRY_AFTER_AMBIGUOUS_OUTCOME = prohibited
AUTOMATIC_ORPHAN_ADOPTION = prohibited
API_AUTOMATED_TO_MANUAL_ASSISTED_FALLBACK = prohibited
```

## 4. FILES_ALLOWED

The principal implementation is closed to exactly the following paths:

```text
1. supabase/migrations/20260812133000_dca_02_provider_object_identity_binding.sql
2. src/lib/domains/cloudflare-adapter.server.ts
3. src/lib/domains/cloudflare-port.server.ts
4. src/lib/domains/domain-repository-provider.server.ts
5. src/lib/domains/domain-jobs.server.ts
6. src/lib/domains/domain-reconciliation.server.ts
7. src/lib/domains/domain-errors.ts
8. run-dca-02-provider-object-identity-specs.ts
9. package.json
10. scripts/verify-release.mjs
11. docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-provider-object-identity-implementation-evidence.md
```

This envelope file itself is planning authority and is not part of the later implementation diff.

Any need to modify another file is a hard stop requiring a new Impact Analysis decision. No historical migration may be edited.

## 5. Forward migration contract

The new migration must harden `domain_provider_bindings` without weakening current RLS/grants.

### 5.1 Required state fields

The migration must add explicit server-owned binding lifecycle fields sufficient to distinguish:

```text
claimed
bound
ambiguous
```

Required semantics:

```text
binding_state = claimed
  => custom_hostname_id IS NULL
  => one non-null provisioning key identifies the current server operation

binding_state = bound
  => custom_hostname_id IS NOT NULL
  => immutable provider_account_id + zone_id + custom_hostname_id
  => identity_bound_at IS NOT NULL

binding_state = ambiguous
  => custom_hostname_id IS NULL
  => provider outcome cannot be proven absent or bound
  => automatic retry/create is prohibited
```

The provisioning key must be opaque, server-generated/derived, non-secret, deterministic for the current operation, and validated structurally. Provider object identity must never be stored in free-form JSON as its authoritative representation.

### 5.2 Bind-once RPC boundary

The migration must expose SECURITY DEFINER RPCs, service-role only, that implement at least these semantics:

```text
claim current-generation provider binding
bind exact provider object identity once
update observation for the same immutable identity
mark a claim ambiguous
release an unbound claim only after conclusive create failure or proven compensation
```

The RPC layer must validate:

- exact tenant/domain/generation cardinality;
- current lifecycle status compatible with provider provisioning/reconciliation/removal;
- current domain generation and expected lock/version where required;
- valid global hostname reservation;
- exactly one enabled server-owned provider account and exact zone mapping;
- same provisioning key for idempotent claim reuse;
- no change of provider account, zone, or provider object ID after bind;
- no transition from `ambiguous` back to automatic `claimed`;
- no delete/release of a bound identity through the claim-release primitive.

### 5.3 Database guard

Direct service-role DML currently has broad table grants. DCA-02 must therefore add a trigger/guard that prevents direct mutation of provider identity fields unless performed under the narrow DCA-02 RPC-controlled session flag.

Protected identity fields include at minimum:

```text
tenant_id
domain_id
generation
provider_account_id
zone_id
custom_hostname_id
binding_state
provisioning_key
identity_bound_at
```

Observation-only fields may change only through the observation RPC or another explicitly guarded server path.

RLS remains enabled. Existing `anon`/`authenticated` revocations remain unchanged or stricter. No client grant may be introduced.

## 6. Concurrent provisioning control

DCA-02 must prevent more than one live provider-provisioning operation per `(domain_id, generation)`.

The selected mechanism is:

```text
DATABASE_BINDING_CLAIM = primary serialization primitive
```

Before any provider POST, the current job must acquire/reuse exactly one `claimed` binding row using its server-owned provisioning key. A competing key must fail closed before provider creation.

The binding claim, not hostname lookup, serializes first creation.

## 7. Cloudflare adapter contract

### 7.1 Existing bound identity

When a binding is already `bound`:

```text
GET /zones/{zone_id}/custom_hostnames/{persisted_custom_hostname_id}
```

The adapter must require:

- returned provider ID equals persisted ID;
- returned hostname normalizes exactly to the authoritative hostname;
- provider account and zone were already revalidated server-side.

No hostname search is permitted to replace a missing/mismatched bound ID.

### 7.2 First-create collision preflight

When the DB claim is `claimed` and no object is bound:

- exact hostname list/search is diagnostic collision detection only;
- zero exact provider objects is required before POST;
- one or more exact provider objects causes fail-closed `unbound provider object` handling;
- an existing object must never be adopted automatically.

### 7.3 Create request

The Custom Hostname POST must omit `custom_metadata` entirely.

The response must contain:

```text
non-empty provider object ID
exact authoritative normalized hostname
```

Any response mismatch triggers compensation against only the exact ID returned by that POST.

## 8. Outcome classification

Provider outcomes must be classified before job retry logic.

### 8.1 Conclusive failure

A provider response that proves the create was rejected without creating an object may release the DB claim and follow the existing sanitized error path.

### 8.2 Ambiguous outcome

The following must be treated as potentially ambiguous after POST dispatch:

```text
network exception after dispatch
request abort/timeout
HTTP 408
HTTP 429
HTTP 5xx
malformed success response lacking authoritative object identity
```

For ambiguous outcome:

1. mark the DB claim `ambiguous`;
2. emit sanitized audit/result evidence;
3. return a dedicated non-retryable domain error;
4. do not transition the job to `retry_wait`;
5. do not execute a second blind POST;
6. require explicit future orphan recovery if provider state cannot be proven.

The dedicated application error code must be:

```text
domain_provider_outcome_ambiguous
```

## 9. Compensation protocol

If Cloudflare returns a successful create with exact object ID but the subsequent bind-once persistence fails:

1. retain the returned object ID only in the current server operation context;
2. DELETE only that exact object ID;
3. require a conclusive successful delete or conclusive already-absent result;
4. only then release the unbound DB claim;
5. if delete outcome is ambiguous/unconfirmed, mark the claim `ambiguous` and fail closed;
6. never search by hostname and delete the discovered object as compensation.

This compensation is best-effort safety, not a distributed transaction claim. The system must explicitly model the remaining ambiguity rather than imply atomicity across Cloudflare and PostgreSQL.

## 10. Manual-assisted mode

Manual-assisted remains an explicit mode, not fallback.

For initial binding from an operator-supplied object ID:

- current generation ownership verification must already be complete;
- acquire/reuse the DB claim first;
- GET the supplied object by exact ID;
- require exact authoritative hostname;
- require exact server-owned provider account and zone;
- reject any conflicting existing binding/claim;
- compare provider `created_at` with current-generation verified ownership evidence when both timestamps are available and reliable;
- bind once through the same RPC as automated provisioning.

An operator-supplied ID is transport/hint until all server-side checks pass.

## 11. Reconciliation contract

`domain-reconciliation.server.ts` must treat a provider binding as confirmed only when:

```text
binding_state = bound
custom_hostname_id != null
provider object GET by that ID succeeds
returned ID matches
returned hostname matches
provider_status is current
```

`claimed` and `ambiguous` bindings can never satisfy `providerBindingConfirmed`.

A missing bound provider object degrades/fails closed. It must never cause automatic hostname lookup and rebinding.

## 12. Removal contract

Removal must:

- load exactly one current-generation binding;
- require `bound` identity before provider delete, unless no provider identity was ever bound;
- GET by persisted object ID;
- validate exact ID and hostname;
- DELETE only the persisted object ID;
- treat exact-ID not-found as already absent;
- never delete an unbound hostname match;
- preserve the canonical lifecycle transition to `revoked`.

A `claimed`/`ambiguous` row must fail closed for automatic provider deletion and require explicit recovery if provider existence is uncertain.

## 13. Deterministic regression gate

A new test runner must prove at minimum:

```text
CREATE_WITHOUT_CUSTOM_METADATA = true
CLAIM_FIRST_CREATE_SERIALIZATION = true
CLAIM_SAME_KEY_IDEMPOTENT = true
CLAIM_DIFFERENT_KEY_REJECTED = true
BIND_ONCE_SAME_ID_IDEMPOTENT = true
BIND_ONCE_DIFFERENT_ID_REJECTED = true
BOUND_PROVIDER_ACCOUNT_IMMUTABLE = true
BOUND_ZONE_IMMUTABLE = true
DIRECT_IDENTITY_DML_GUARDED = true
EXISTING_BOUND_ID_OBSERVED_BY_ID = true
HOSTNAME_SEARCH_NOT_OWNERSHIP = true
UNBOUND_EXACT_HOSTNAME_OBJECT_REJECTED = true
MULTIPLE_EXACT_HOSTNAME_OBJECTS_REJECTED = true
POST_TIMEOUT_MARKS_AMBIGUOUS = true
POST_429_MARKS_AMBIGUOUS = true
POST_5XX_MARKS_AMBIGUOUS = true
AMBIGUOUS_OUTCOME_NOT_RETRY_WAIT = true
SUCCESS_CREATE_BIND_FAILURE_COMPENSATES_BY_EXACT_ID = true
COMPENSATION_UNCONFIRMED_MARKS_AMBIGUOUS = true
NO_BLIND_SECOND_POST = true
OBSERVE_RETURNED_HOSTNAME_MISMATCH_FAILS_CLOSED = true
REMOVE_BY_PERSISTED_ID_ONLY = true
UNBOUND_HOSTNAME_DELETE_PROHIBITED = true
MANUAL_OBJECT_ID_IS_NOT_CLIENT_AUTHORITY = true
CURRENT_GENERATION_CHANGE_REJECTS_BIND = true
GLOBAL_HOSTNAME_RESERVATION_INVALID_REJECTS_BIND = true
CUSTOM_METADATA_AUTHORITY = false
```

`package.json` must expose `test:dca-02`. `scripts/verify-release.mjs` must execute it before build cycles so the Release Gate cannot pass without DCA-02 regression coverage.

## 14. Managed database migration gate

Before any live Cloudflare DCA-02 proof:

1. merge repository implementation only after protected checks pass;
2. apply only the new DCA-02 forward migration to the Same-Backend Homologation Cell;
3. confirm migration presence exactly once;
4. audit RLS, grants, RPC privileges and trigger guards;
5. prove bind-once/claim semantics with synthetic database-only fixtures or transaction-safe harnesses;
6. confirm authority remains `legacy`;
7. confirm real tenant remains unchanged.

No historical migration edit is allowed.

## 15. Controlled synthetic Cloudflare proof

Live provider acceptance must use a new synthetic hostname/technical tenant only. The revoked DCA-01 generation must not be reused before its cooldown and must not be mutated to bypass lifecycle policy.

The live proof must demonstrate:

1. exact GitHub main and applied migration baseline;
2. Cloudflare Worker corrective still preserved;
3. no pre-existing synthetic Custom Hostname for the new proof hostname;
4. synthetic ownership verification and required DNS evidence;
5. DB binding claim acquired before provider POST;
6. POST without `custom_metadata` succeeds on the current Cloudflare plan;
7. provider-generated ID binds exactly once;
8. repeated provisioning performs no second POST;
9. observation/reconciliation use GET by persisted ID;
10. SSL lifecycle is observable without metadata authority;
11. canonical removal deletes only the persisted ID;
12. temporary Cron/DNS/provider artifacts are torn down;
13. zero synthetic provider/binding/job orphans remain except immutable terminal history;
14. authority remains `legacy`;
15. `rmprimeimoveis.com.br`, root, www, and notify remain untouched.

If the Cloudflare connector/credential is unavailable, this gate is `Blocked External`; repository/database acceptance must not be misrepresented as live provider acceptance.

## 16. Protected invariants

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_PROVIDER_OBJECT_AUTHORITY = true
CURRENT_GENERATION_REQUIRED = true
GLOBAL_HOSTNAME_RESERVATION_REQUIRED = true
FAIL_FAST = true
FAIL_CLOSED = true
RLS_WEAKENING = false
CLIENT_PROVIDER_AUTHORITY = false
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_MUTATION = false
SAME_BACKEND_HOMOLOGATION_CELL = binding
GLOBAL_CUTOVER = prohibited
REAL_TENANT_PROOF = prohibited
ROOT_WWW_NOTIFY_MUTATION = prohibited
CLOUDFLARE_PLAN_UPGRADE = prohibited_as_resolution
DCA01_REOPEN = prohibited
```

## 17. Definition of Done

DCA-02 implementation may be terminally Accepted only when all are true:

```text
ENVELOPE_MERGED = true
IMPLEMENTATION_DIFF_WITHIN_FILES_ALLOWED = true
FORWARD_MIGRATION_ONLY = true
BINDING_CLAIM_SERIALIZATION = passed
BIND_ONCE_DB_ENFORCEMENT = passed
DIRECT_IDENTITY_DML_GUARD = passed
CUSTOM_METADATA_REMOVED_FROM_RUNTIME_AUTHORITY = true
PROVIDER_LOOKUP_BY_PERSISTED_ID = true
AMBIGUOUS_OUTCOME_FAILS_CLOSED = true
BLIND_RETRY_AFTER_AMBIGUITY = false
COMPENSATION_BY_EXACT_RETURNED_ID = true
HOSTNAME_ONLY_ADOPTION = false
RELEASE_GATE = success
MANAGED_MIGRATION_GATE = success
CONTROLLED_CURRENT_PLAN_CLOUDFLARE_PROOF = success
SYNTHETIC_TEARDOWN_ZERO_ORPHANS = true
GLOBAL_AUTHORITY_MODE = legacy
REAL_TENANT_MUTATION = false
PRODUCTION_CUTOVER = false
```

If the repository/database implementation passes but live Cloudflare proof cannot execute solely because the mandatory connector is unavailable, the only valid state is:

```text
DCA02_IMPLEMENTATION_REPOSITORY_DATABASE = Accepted
DCA02_EXTERNAL_PROVIDER_PROOF = Blocked External
DCA02_TERMINAL_ACCEPTED = false
```

## 18. Execution order

```text
1. merge and audit this envelope
2. branch exact merged main
3. implement only FILES_ALLOWED
4. audit implementation diff
5. require Release Gate success
6. protected merge implementation
7. audit exact merged main
8. apply DCA-02 forward migration to Same-Backend Homologation Cell
9. audit DB invariants / real tenant / authority
10. execute controlled synthetic current-plan Cloudflare proof
11. teardown synthetic proof completely
12. consolidate terminal evidence
13. audit final GitHub main
14. only then authorize BCA-01 or another successor
```

No step may infer success from a later or earlier step. Provider live proof remains independently mandatory.