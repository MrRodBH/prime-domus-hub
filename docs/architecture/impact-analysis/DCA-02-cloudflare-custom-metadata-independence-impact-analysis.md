# DCA-02 — Cloudflare Custom Metadata Independence & Provider Object Identity Binding

## Status

**Accepted — Architecture First planning only / implementation not authorized**

```text
STAGE_ID = DCA-02
STAGE_NAME = Cloudflare Custom Metadata Independence & Provider Object Identity Binding
STAGE_TYPE = architecture_first_successor_gate
PREDECESSOR = DCA-01 — Blocked External / Terminal / Teardown Complete
BASELINE_MAIN = c90ad26daf41af10e8221096145ef79af23d32ab
IMPACT_ANALYSIS_RESULT = Accepted
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PRODUCTION_CUTOVER_AUTHORIZED = false
REAL_TENANT_PROOF_AUTHORIZED = false
BCA01 = blocked
PRM3 = blocked
```

DCA-02 is a successor architecture gate. It does not reopen DCA-01 and does not authorize runtime code, migration, Cloudflare mutation, DNS mutation, Worker mutation or real-tenant use.

## 1. Trigger and Product Owner constraint

The controlled DCA-01 proof reached provider provisioning and failed closed with Cloudflare HTTP `403`, error code `1413`, because Custom Metadata access is not allocated to the active zone/account. The synthetic proof was fully torn down and DCA-01 closed terminally.

The Product Owner decision is binding:

```text
PAID_OR_ENTERPRISE_CLOUDFLARE_UPGRADE_BEFORE_HOMOLOGATION = not_planned
UPGRADE_AS_ARCHITECTURAL_RESOLUTION = rejected
REMOVE_CUSTOM_METADATA_WITHOUT_IMPACT_ANALYSIS = prohibited
```

Therefore the successor must remove the runtime dependency on Cloudflare Custom Metadata without weakening ownership, idempotence, anti-takeover, tenant isolation or fail-closed behavior.

## 2. Direct current-state audit

### 2.1 Current Cloudflare API capability

Direct inspection of the official Cloudflare OpenAPI contract on 2026-08-12 showed that `POST /zones/{zone_id}/custom_hostnames` requires `hostname`; `custom_metadata` is an optional request property. DCA-02 may therefore evaluate a Custom Hostname creation path that omits `custom_metadata` entirely.

This API shape is not itself implementation proof. The implementation gate must execute a controlled non-production provider proof on the current account before acceptance.

### 2.2 Current adapter dependency

`src/lib/domains/cloudflare-adapter.server.ts` currently:

1. creates Custom Hostnames with `custom_metadata = { tenant_id, domain_id, generation }`;
2. resolves an existing object by exact hostname;
3. requires those metadata values to prove that the provider object belongs to the current domain generation;
4. repeats that metadata check during observation and removal.

Consequently, merely deleting the POST field would be unsafe: observation, retry, reconciliation and deletion would lose their current generation-bound ownership predicate.

### 2.3 Existing server-owned identity primitives

The repository already contains the foundation for a metadata-independent model:

```text
GLOBAL_HOSTNAME_RESERVATION = server/database-owned
TENANT_DOMAIN_ID = server-owned
DOMAIN_GENERATION = server-owned
DOMAIN_LOCK_VERSION = server-owned
OWNERSHIP_CHALLENGE = generation-bound
PROVIDER_ACCOUNT_AND_ZONE = server-owned and exact-cardinality
DOMAIN_PROVIDER_BINDING = unique(domain_id, generation)
CUSTOM_HOSTNAME_PROVIDER_ID = persisted server-side
PROVIDER_OBJECT_GLOBAL_UNIQUENESS = unique(provider_account_id, custom_hostname_id)
JOB_IDEMPOTENCY_KEY = persisted server-side
STATE_TRANSITIONS = server/RPC-owned
```

The successor can move provider-object ownership from paid Cloudflare metadata to these server-owned invariants, provided the binding identity becomes bind-once and no provider object is ever adopted heuristically by hostname alone.

## 3. Architectural invariants

DCA-02 must preserve:

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_PROVIDER_ACCOUNT_AUTHORITY = true
SERVER_IS_PROVIDER_OBJECT_BINDING_AUTHORITY = true
SERVER_IS_GENERATION_AUTHORITY = true
CLIENT_PROVIDER_OBJECT_AUTHORITY = false
CLIENT_TENANT_AUTHORITY = false
CLIENT_GENERATION_AUTHORITY = false
CLIENT_STATUS_AUTHORITY = false

FAIL_FAST = true
FAIL_CLOSED = true
HEURISTIC_PROVIDER_OBJECT_ADOPTION = prohibited
HOSTNAME_ONLY_OBJECT_OWNERSHIP = prohibited
ORDER_BY_LIMIT_1_AUTHORITY = prohibited
SILENT_MODE_FALLBACK = prohibited
REQUEST_TIME_DUAL_AUTHORITY = prohibited
TENANT_DEFAULT = prohibited

SUPER_ADMIN_TENANT_MUTATION_WITHOUT_IMPERSONATION = false
GLOBAL_CUTOVER = prohibited_until_separately_authorized
SAME_BACKEND_HOMOLOGATION_CELL = binding
```

## 4. Alternatives

### Strategy A — Upgrade Cloudflare plan

Rejected by binding Product Owner decision. It is not a DCA-02 implementation strategy.

### Strategy B — Remove `custom_metadata` and retain hostname-based reuse

Rejected. This would allow a provider object found by hostname to become authority without generation proof and would weaken anti-takeover and retry safety.

### Strategy C — Server-Bound Provider Object Identity

**Selected.**

Cloudflare Custom Metadata is not used as an authorization or ownership primitive. The current-generation ownership predicate becomes the conjunction of server-owned domain state and one immutable provider-object binding.

```text
SELECTED_STRATEGY = C — Server-Bound Provider Object Identity
CLOUDFLARE_CUSTOM_METADATA_REQUIRED = false
CLOUDFLARE_CUSTOM_METADATA_AUTHORITY = false
PROVIDER_OBJECT_IDENTITY_AUTHORITY = persisted server binding
BINDING_SCOPE = domain_id + generation + provider_account_id + zone_id + custom_hostname_id
BINDING_MUTABILITY = bind-once for object identity
```

## 5. Selected ownership predicate

A Cloudflare object may be treated as belonging to a domain generation only when all of the following are true:

1. the authoritative `tenant_domains` row exists exactly once;
2. its generation is the job/command generation;
3. the global hostname reservation is valid for that row;
4. current-generation ownership verification is complete where the lifecycle requires it;
5. the provider account and zone resolve server-side with exact cardinality;
6. `domain_provider_bindings` resolves exactly once for `(domain_id, generation)` after binding;
7. the binding's provider account and zone exactly match the server-selected provider context;
8. Cloudflare object retrieval by the persisted `custom_hostname_id` returns exactly that object;
9. the returned hostname normalizes exactly to the authoritative `normalized_hostname`;
10. the persisted object ID is never silently replaced for the same generation.

`custom_metadata`, client input, arbitrary provider search ordering and hostname-only lookup are not ownership evidence.

## 6. Provisioning protocol

### 6.1 Existing binding path

When a current-generation binding already exists:

```text
lookup_binding(domain_id, generation) = exactly one
GET provider object by persisted custom_hostname_id
provider account = exact binding account
zone = exact binding zone
returned object id = persisted id
returned hostname = authoritative normalized hostname
```

Any mismatch fails closed. No hostname search may rebind the generation to a different object.

### 6.2 First-create path

When no binding exists:

1. revalidate current domain generation, lock/version and lifecycle status;
2. revalidate global hostname reservation and current ownership prerequisites;
3. resolve exactly one provider account and zone server-side;
4. perform an exact provider preflight for the authoritative hostname;
5. if an exact object already exists without a current-generation binding, fail closed as an unbound/ambiguous provider object; do not adopt, mutate or delete it automatically;
6. only when the exact preflight returns zero objects, create the Custom Hostname **without `custom_metadata`**;
7. require a successful response containing a non-empty provider object ID and the exact authoritative hostname;
8. bind that exact returned ID to the current domain generation using a bind-once database operation conditioned on the still-current generation/status/version;
9. if binding persistence fails after a successful provider create, attempt compensation only against the exact object ID returned by that same create call;
10. if compensation cannot be proven successful, fail closed and require explicit orphan recovery; never infer ownership on retry.

This protocol prevents duplicate creation and unsafe adoption even when distributed failure prevents full automatic recovery.

## 7. Idempotence contract

DCA-02 does not claim that Cloudflare honors the repository's existing `idempotencyKey` as a provider-side idempotency token. That key remains server-side operation identity and audit correlation.

Idempotence means repeated execution is **state-safe and duplicate-resistant**:

```text
BINDING_EXISTS_AND_MATCHES = observe exact persisted object; no create
BINDING_EXISTS_AND_DIFFERS = fail closed
NO_BINDING_AND_PROVIDER_OBJECT_ABSENT = one create attempt permitted
NO_BINDING_AND_PROVIDER_OBJECT_PRESENT = fail closed; no adoption; no second create
CREATE_SUCCEEDED_BIND_SUCCEEDED = subsequent retries observe by persisted id
CREATE_SUCCEEDED_BIND_FAILED_COMPENSATION_SUCCEEDED = retry may start from clean provider state
CREATE_OUTCOME_AMBIGUOUS = fail closed; no blind retry
```

A network timeout with ambiguous provider outcome must not trigger a second blind POST.

## 8. Bind-once database contract

The current repository `upsertDomainProviderBinding` can update a binding keyed by `(domain_id, generation)`. DCA-02 must harden this boundary so provider object identity is immutable after first binding.

Required semantics:

```text
FIRST_BIND = allowed only for exact current domain generation and server-selected provider/zone
REPEAT_SAME_BIND = idempotent
REPLACE_CUSTOM_HOSTNAME_ID_SAME_GENERATION = prohibited
REPLACE_PROVIDER_ACCOUNT_SAME_GENERATION = prohibited
REPLACE_ZONE_SAME_GENERATION = prohibited
OBSERVATION_STATUS_UPDATE = allowed for same immutable identity
BINDING_CARDINALITY != 1 after creation = fail closed
```

The implementation Impact Analysis follow-through must decide whether this is enforced by a narrow SECURITY DEFINER RPC, a database guard/constraint plus repository contract, or both. Application-only mutable upsert is insufficient as the final anti-takeover boundary.

## 9. Observation and reconciliation

The current adapter finds by hostname and then checks Custom Metadata. DCA-02 must invert that authority:

```text
PRIMARY_PROVIDER_LOOKUP = custom_hostname_id from server binding
HOSTNAME_QUERY = collision/preflight diagnostic only
PERSISTED_ID = authority for provider object identity
RETURNED_HOSTNAME = must equal authoritative hostname
CUSTOM_METADATA = ignored for authorization
```

Reconciliation must degrade/fail closed if:

- the persisted provider object no longer exists;
- provider account or zone no longer matches;
- the returned object ID differs;
- the returned hostname differs;
- binding cardinality is ambiguous;
- current generation or global reservation changed;
- an unbound exact provider object is discovered where none is authorized.

It must never repair identity by replacing the persisted ID with whatever object hostname search returns.

## 10. Removal

Removal remains server-authoritative:

1. load exactly one current-generation binding;
2. validate provider account and zone against server-owned configuration;
3. retrieve by persisted object ID;
4. require exact ID and hostname match;
5. delete only that persisted object ID;
6. treat provider `not found` as already absent only after the binding identity was resolved server-side;
7. never delete an unbound object merely because its hostname matches;
8. transition to `revoked` only under the existing lifecycle contract.

## 11. Manual-assisted mode

`manual_assisted` remains explicit and must not become a fallback from `api_automated`.

An operator-supplied provider object ID remains a hint, not authority. Before first binding the server must independently prove:

- exact current tenant/domain/generation;
- ownership verification for that generation;
- exact provider account and zone;
- exact object retrieval by the supplied ID;
- exact authoritative hostname;
- no existing binding or conflicting object identity;
- provider object creation time is not older than the current generation's ownership lifecycle evidence when that timestamp is available and reliable.

If these conditions cannot establish a single safe candidate, manual-assisted binding fails closed. No hostname-only adoption is permitted.

## 12. Provider ambiguity and orphan recovery

DCA-02 requires an explicit recovery taxonomy rather than a heuristic fallback.

```text
BOUND_OBJECT_MISSING = fail closed / reconciliation failure
UNBOUND_EXACT_OBJECT_PRESENT = fail closed / orphan ambiguity
POST_OUTCOME_AMBIGUOUS = fail closed / no blind retry
COMPENSATION_DELETE_UNCONFIRMED = fail closed / operator recovery required
CONFLICTING_BOUND_ID = fail closed / security diagnostic
```

Any future orphan-recovery command must be a separately authorized server operation with audit evidence. Automatic adoption of an unbound provider object is prohibited.

## 13. Expected implementation impact

DCA-02 implementation is expected to affect only the domain/provider boundary and deterministic tests. Exact `FILES_ALLOWED` must be frozen in a subsequent execution envelope before implementation starts.

Likely affected areas:

```text
src/lib/domains/cloudflare-adapter.server.ts
src/lib/domains/cloudflare-port.server.ts
src/lib/domains/domain-repository-provider.server.ts
src/lib/domains/domain-jobs.server.ts
src/lib/domains/domain-reconciliation.server.ts
src/lib/domains/domain-contracts.ts              # only if observation/recovery contract requires it
supabase/migrations/<DCA02_FORWARD_MIGRATION>.sql # only if bind-once DB enforcement requires it
run-dca-02-*.ts                                  # deterministic regression harness
docs/architecture/**/DCA-02-*
docs/delivery/**/dca-02-*
```

No historical migration may be edited.

## 14. Explicit non-scope

```text
CLOUDFLARE_PLAN_UPGRADE = out_of_scope
PRODUCTION_DOMAIN_CUTOVER = prohibited
REAL_TENANT_PROOF = prohibited
ROOT_WWW_NOTIFY_DNS_MUTATION = prohibited
WORKER_ARCHITECTURE_REWRITE = prohibited
TENANT_AUTHORITY_CHANGE = prohibited
RLS_OR_GRANT_WEAKENING = prohibited
CLIENT_PROVIDER_AUTHORITY = prohibited
REQUEST_TIME_LEGACY_FALLBACK = prohibited
SILENT_API_TO_MANUAL_FALLBACK = prohibited
DCA01_REOPEN = prohibited
BCA01_START = prohibited
PRM3_START = prohibited
```

The accepted WRI/SPR Worker corrective remains preserved unless a later Impact Analysis proves an independent runtime need.

## 15. Implementation gate requirements

Before any DCA-02 code or migration mutation, a closed execution envelope must:

1. audit current `main` and exact adapter/repository state;
2. freeze `FILES_ALLOWED` and any forward migration path;
3. define bind-once database enforcement;
4. define exact-by-ID provider observation;
5. define safe first-create, compensation and ambiguous-outcome handling;
6. define manual-assisted evidence requirements;
7. include deterministic unit/regression tests for no metadata, no adoption and immutable ID;
8. include a controlled synthetic Cloudflare proof on the current plan/account;
9. require teardown and zero orphan verification;
10. preserve authority mode `legacy` and prohibit real-tenant/global cutover.

## 16. Required deterministic tests

At minimum:

```text
CREATE_WITHOUT_CUSTOM_METADATA = passes under mocked contract
EXISTING_BINDING_SAME_ID = idempotent
EXISTING_BINDING_DIFFERENT_ID = fail closed
NO_BINDING_EXISTING_PROVIDER_OBJECT = fail closed / no adoption
MULTIPLE_EXACT_HOSTNAME_RESULTS = fail closed
CREATE_RESPONSE_HOSTNAME_MISMATCH = fail closed + safe compensation path
BIND_ONCE_SAME_ID = idempotent
BIND_ONCE_DIFFERENT_ID = rejected
OBSERVE_BY_PERSISTED_ID = required
OBSERVE_RETURNED_HOSTNAME_MISMATCH = fail closed
REMOVE_BY_PERSISTED_ID_ONLY = required
UNBOUND_HOSTNAME_DELETE = prohibited
POST_AMBIGUOUS_OUTCOME = no blind retry
COMPENSATION_UNCONFIRMED = fail closed
CURRENT_GENERATION_CHANGED_MID_OPERATION = binding rejected
GLOBAL_HOSTNAME_RESERVATION_INVALID = operation rejected
CLIENT_OBJECT_ID_AS_AUTHORITY = false
CUSTOM_METADATA_AS_AUTHORITY = false
```

## 17. Controlled external proof

The implementation cannot be Accepted from mocks alone. A non-production proof must demonstrate, in order:

1. exact current GitHub/Worker/database baselines;
2. synthetic tenant only;
3. ownership and required DNS current-generation evidence;
4. Custom Hostname POST succeeds on the current Cloudflare plan **without `custom_metadata`**;
5. exact returned provider object ID is persisted once;
6. repeated provisioning is idempotent and performs no second create;
7. observation and reconciliation use the persisted ID and preserve generation ownership;
8. SSL lifecycle can be observed under the same identity;
9. synthetic removal deletes only the bound object;
10. Cron/DNS/provider/job teardown leaves zero synthetic orphans;
11. `domain_authority_control.authority_mode` remains `legacy`;
12. `rmprimeimoveis.com.br`, root, `www`, and `notify` remain untouched.

Any provider capability blocker fails closed and must not trigger plan upgrade, silent mode fallback or weakened ownership.

## 18. Acceptance criteria

DCA-02 implementation may become `Accepted` only if all of the following are proven:

```text
CUSTOM_METADATA_DEPENDENCY_REMOVED = true
CUSTOM_METADATA_AUTHORITY = false
GENERATION_BOUND_OWNERSHIP_PRESERVED = true
PROVIDER_BINDING_IDENTITY_IMMUTABLE = true
PROVIDER_OBSERVATION_BY_PERSISTED_ID = true
HOSTNAME_ONLY_ADOPTION = false
IDEMPOTENT_RETRY_WITHOUT_DUPLICATE_CREATE = true
AMBIGUOUS_PROVIDER_OUTCOME_FAILS_CLOSED = true
ANTI_TAKEOVER_PRESERVED = true
SERVER_TENANT_AUTHORITY_PRESERVED = true
RLS_AND_GRANTS_NOT_WEAKENED = true
CONTROLLED_CURRENT_PLAN_PROOF = passed
SYNTHETIC_TEARDOWN_ZERO_ORPHANS = true
GLOBAL_AUTHORITY_MODE = legacy
REAL_TENANT_MUTATION = false
PRODUCTION_CUTOVER = false
```

## 19. Decision

```text
DCA02_IMPACT_ANALYSIS = Accepted
SELECTED_STRATEGY = C — Server-Bound Provider Object Identity
ARCHITECTURE_FIRST_GATE = satisfied_for_planning
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
NEXT_ACTION = prepare and audit one closed DCA-02 implementation execution envelope
BCA01 = blocked
PRM3 = blocked
```

No implementation may start from this document alone. The next executable artifact is a closed implementation execution envelope audited against the then-current GitHub `main`.