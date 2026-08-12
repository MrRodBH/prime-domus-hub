# DCA-02 — Provider Object Identity Implementation Evidence

## Status

**Repository implementation Accepted / Merged — Same-Backend principal migration applied — consolidated privilege corrective in progress — live Cloudflare proof blocked by MCP transport**

```text
STAGE_ID = DCA-02
SELECTED_STRATEGY = Strategy C — Server-Bound Provider Object Identity
EXECUTION_ENVELOPE_PR = 94
EXECUTION_ENVELOPE_MERGE_SHA = c0346085da59f294bb34ad670b887ca653023cae
IMPLEMENTATION_PR = 95
IMPLEMENTATION_HEAD = 1a8041742335ea78e3bdfa1e4f3b91552c25eaad
IMPLEMENTATION_MERGE_SHA = f5b5ec4dfbf9458219d332cb30ea96129e2bbcea
IMPLEMENTATION_FILES_CHANGED = 11
FILES_ALLOWED_VIOLATIONS = 0
PREMERGE_RELEASE_GATE = success
PREMERGE_PRM2_GATE = success
PREMERGE_WRI01_RUNTIME_GATE = success
POST_MERGE_RELEASE_GATE = success
CUSTOM_METADATA_AUTHORITY = false
HOSTNAME_ONLY_PROVIDER_OBJECT_ADOPTION = false
PRODUCTION_CUTOVER = false
REAL_TENANT_PROOF = false
```

## 1. Principal repository implementation

The protected implementation materialized:

- one forward-only provider identity migration;
- database claim serialization before first provider POST;
- bind-once provider object identity;
- explicit `claimed`, `bound`, and `ambiguous` binding states;
- exact provider observation/removal by persisted `custom_hostname_id`;
- Custom Hostname creation without `custom_metadata` in the request body;
- collision-only exact-hostname search with no automatic adoption;
- explicit non-retryable `domain_provider_outcome_ambiguous` handling;
- exact-ID compensation when provider create succeeds but bind persistence fails;
- manual-assisted validation without silent automated-to-manual fallback;
- reconciliation that accepts only immutable `bound` identity;
- deterministic DCA-02 regression coverage integrated into the Release Gate.

## 2. Same-Backend managed migration

The exact GitHub migration:

```text
supabase/migrations/20260812133000_dca_02_provider_object_identity_binding.sql
```

was first executed inside `BEGIN ... ROLLBACK` against the real Same-Backend PostgreSQL and passed syntax/function/trigger/grant validation without persistence.

It was then applied through the Lovable-managed Supabase migration mechanism after the exact implementation merge synchronized into the Lovable workspace.

```text
MANAGED_MIGRATION_VERSION = 20260812133000
MANAGED_MIGRATION_NAME = 1bbea915-9c52-496e-953b-960aad9654d8
MIGRATION_RECORDED_COUNT = 1
DOMAIN_PROVIDER_BINDING_COUNT_AFTER_MIGRATION = 0
DOMAIN_AUTHORITY_MODE = legacy
DOMAIN_AUTHORITY_LOCK_VERSION = 0
REAL_DOMAIN = rmprimeimoveis.com.br
REAL_DOMAIN_MUTATED = false
```

Direct database audit proved:

```text
DCA02_COLUMNS_PRESENT = 3/3
DCA02_FUNCTION_COUNT = 6 including guard trigger function
DCA02_GUARD_TRIGGER_ENABLED = true
RLS_ENABLED = true
ANON_DCA02_RPC_EXECUTE = false
AUTHENTICATED_DCA02_RPC_EXECUTE = false
SERVICE_ROLE_DCA02_RPC_EXECUTE = true
SERVICE_ROLE_INSERT = false
SERVICE_ROLE_UPDATE = false
SERVICE_ROLE_DELETE = false
```

## 3. Managed migration source-drift finding

The Lovable executor textually reported zero repository edits, but direct `Lovable.get_diff` audit disproved that claim. The managed migration operation generated one platform-derived workspace drift artifact:

```text
src/integrations/supabase/types.ts
```

That generated source diff is **not** accepted as canonical repository source and is not present in GitHub `main`. It must be removed through the next GitHub-authoritative `developer_update`; no additional Lovable source-edit prompt is authorized for that reconciliation.

## 4. Same-Backend bind-once functional proof

An all-rollback technical-tenant proof exercised the actual installed RPCs. Two synthetic domain fixtures were created only inside the transaction and all state was rolled back.

Passed predicates:

```text
CLAIM_SAME_KEY_IDEMPOTENT = true
COMPETING_CLAIM_REJECTED = true
BIND_SAME_ID_IDEMPOTENT = true
REBIND_DIFFERENT_ID_REJECTED = true
EXACT_ID_OBSERVATION = true
BOUND_RELEASE_REJECTED = true
AMBIGUOUS_STATE_PERSISTED_WITHIN_TRANSACTION = true
AMBIGUOUS_REENTRY_REJECTED = true
AMBIGUOUS_RELEASE_REJECTED = true
POST_PROOF_SYNTHETIC_DOMAIN_COUNT = 0
POST_PROOF_SYNTHETIC_BINDING_COUNT = 0
GLOBAL_AUTHORITY_MODE = legacy
REAL_DOMAIN_MUTATED = false
```

The proof also confirmed `service_role` has no `INSERT`, `UPDATE`, or `DELETE` on the provider binding table.

## 5. Post-migration privilege defect

Direct privilege audit found one blocking security defect after the principal managed migration:

```text
SERVICE_ROLE_TRUNCATE = true
SERVICE_ROLE_REFERENCES = true
SERVICE_ROLE_TRIGGER = true
```

`TRUNCATE` is not a row-level INSERT/UPDATE/DELETE operation and bypasses the DCA-02 row trigger. It could destroy the immutable provider-object identity ledger and therefore blocks database acceptance.

A separate Architecture First corrective Impact Analysis was created and selected the least-privilege resolution:

```text
CORRECTIVE_STRATEGY = revoke all table privileges from service_role; grant SELECT only
CORRECTIVE_HISTORICAL_MIGRATION_EDIT = false
CORRECTIVE_DATA_MUTATION = false
```

The corrective is restricted to one new forward migration, the DCA-02 regression test, and this evidence document.

## 6. Cloudflare live proof status

The mandatory current-plan provider proof has **not** executed after the DCA-02 implementation because the explicitly requested `Cloudflare API MCP - RM Prime` developer MCP currently returns:

```text
FORBIDDEN: This conversation does not support developer MCPs
```

This is a connector/session transport blocker. It is neither provider acceptance nor provider rejection.

The live proof remains mandatory and must use a new technical synthetic hostname only. It must demonstrate creation without `custom_metadata`, exact returned-ID persistence, idempotent no-second-create behavior, exact-ID observation/removal, SSL observation, teardown, zero synthetic orphans, legacy authority preservation, and zero mutation of the real tenant/root/www/notify.

## 7. Current stage state

```text
DCA02_REPOSITORY_IMPLEMENTATION = Accepted / Merged
DCA02_PRINCIPAL_MANAGED_MIGRATION = Applied
DCA02_BIND_ONCE_DATABASE_PROOF = Passed
DCA02_PRIVILEGE_CORRECTIVE = In Progress
DCA02_EXTERNAL_PROVIDER_PROOF = Blocked External by MCP transport
DCA02_TERMINAL_ACCEPTED = false
BCA01 = blocked
PRM3 = blocked
```

DCA-02 can become terminally Accepted only after the consolidated privilege corrective is applied/audited and the mandatory live Cloudflare synthetic proof succeeds.