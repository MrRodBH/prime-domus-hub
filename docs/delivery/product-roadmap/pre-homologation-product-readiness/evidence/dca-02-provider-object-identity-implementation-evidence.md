# DCA-02 — Provider Object Identity Implementation Evidence

## Status

**Principal repository implementation submitted — database and live provider gates pending**

```text
STAGE_ID = DCA-02
IMPLEMENTATION_BASELINE_MAIN = c0346085da59f294bb34ad670b887ca653023cae
SELECTED_STRATEGY = Strategy C — Server-Bound Provider Object Identity
IMPLEMENTATION_BRANCH = agent/dca-02-provider-object-identity-implementation
IMPLEMENTATION_PR = pending
IMPLEMENTATION_HEAD = pending
FILES_ALLOWED_VIOLATIONS = 0 at submission
CUSTOM_METADATA_AUTHORITY = false
HOSTNAME_ONLY_PROVIDER_OBJECT_ADOPTION = false
PRODUCTION_CUTOVER = false
REAL_TENANT_PROOF = false
```

## 1. Repository changes

The principal implementation materializes the accepted execution envelope through:

- one forward-only DCA-02 migration;
- database serialization before first provider create;
- bind-once provider object identity;
- explicit `claimed`, `bound`, and `ambiguous` provider binding states;
- direct provider-binding identity DML guard and narrowed service-role table grants;
- exact provider observation/removal by persisted `custom_hostname_id`;
- Custom Hostname creation without `custom_metadata`;
- collision-only exact-hostname search with no automatic adoption;
- explicit non-retryable `domain_provider_outcome_ambiguous` classification;
- exact-ID compensation when provider creation succeeds but server binding cannot be committed;
- manual-assisted object validation without fallback from automated mode;
- reconciliation that accepts only immutable `bound` identity;
- deterministic DCA-02 regression tests integrated into the Release Gate.

## 2. Database authority model

```text
FIRST_CREATE_SERIALIZATION = domain_provider_bindings claim before provider POST
CLAIM_KEY = server-owned job idempotency key
CLAIM_SCOPE = domain_id + generation + provider account + zone
COMPETING_CLAIM = fail closed
BOUND_CUSTOM_HOSTNAME_ID = immutable for generation
BOUND_PROVIDER_ACCOUNT = immutable for generation
BOUND_ZONE = immutable for generation
AMBIGUOUS_TO_AUTOMATIC_RETRY = prohibited
DIRECT_SERVICE_ROLE_BINDING_DML = revoked after migration
CLIENT_BINDING_DML = prohibited
```

The migration does not edit historical DCA-01 schema. RLS remains enabled on the existing table and no client policy is introduced.

## 3. Provider operation model

```text
FIRST_CREATE_HOSTNAME_QUERY = collision diagnostic only
EXISTING_UNBOUND_EXACT_HOSTNAME = fail closed / no adoption
CREATE_CUSTOM_METADATA = omitted
BOUND_OBSERVATION_LOOKUP = GET by persisted custom_hostname_id
BOUND_DELETE_TARGET = persisted custom_hostname_id only
HOSTNAME_SEARCH_REBIND = prohibited
```

A provider-generated ID returned by the successful create call is retained in the current server operation until bind-once persistence succeeds or exact-ID compensation completes.

## 4. Ambiguous outcome handling

Post-dispatch transport failures, HTTP 408/429/5xx and malformed successful create outcomes are classified as potentially ambiguous. They do not enter the normal `retry_wait` path.

```text
AMBIGUOUS_ERROR_CODE = domain_provider_outcome_ambiguous
AMBIGUOUS_RETRYABLE = false
BLIND_SECOND_POST = prohibited
DB_BINDING_STATE_AFTER_CONFIRMED_AMBIGUITY = ambiguous
ORPHAN_RECOVERY = explicit future recovery only
```

If exact-ID compensation after a known successful create cannot be confirmed, the claim is marked ambiguous and automatic provisioning stops.

## 5. Manual-assisted boundary

Manual-assisted mode remains explicit. The supplied provider object ID is only a hint until the server verifies:

- current verified ownership challenge;
- exact provider account and zone;
- exact object retrieval by ID;
- exact authoritative hostname;
- creation timestamp not predating current-generation ownership verification when reliable;
- bind-once database acceptance.

No automated-to-manual silent fallback is introduced.

## 6. Remaining gates

The repository implementation is not terminally Accepted from source alone. Required next gates remain:

```text
IMPLEMENTATION_DIFF_AUDIT = pending
RELEASE_GATE = pending
PROTECTED_IMPLEMENTATION_MERGE = pending
MANAGED_DCA02_MIGRATION = pending
DATABASE_BIND_ONCE_FUNCTIONAL_PROOF = pending
CONTROLLED_CURRENT_PLAN_CLOUDFLARE_PROOF = pending
SYNTHETIC_TEARDOWN_ZERO_ORPHANS = pending
GLOBAL_AUTHORITY_MODE = must remain legacy
REAL_TENANT_MUTATION = prohibited
```

The Cloudflare MCP connection was unavailable during repository implementation. That transport condition cannot be treated as provider acceptance or provider rejection; the live proof remains a separate mandatory gate.