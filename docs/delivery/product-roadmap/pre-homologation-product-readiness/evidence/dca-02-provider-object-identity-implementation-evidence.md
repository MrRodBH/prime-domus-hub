# DCA-02 — Provider Object Identity Implementation Evidence

## Status

**Repository & Same-Backend Database Accepted / Closed — mandatory live Cloudflare proof Blocked External by MCP transport**

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
CORRECTIVE_IA_PR = 96
CORRECTIVE_IA_MERGE_SHA = 5da0d3b3ba269eacc43912d49fc43a7cae3c5fd6
CORRECTIVE_IMPLEMENTATION_PR = 97
CORRECTIVE_IMPLEMENTATION_MERGE_SHA = c993f32217d47f64449b9e83986c0cc2a51e1618
PREMERGE_RELEASE_GATE = success
PREMERGE_PRM2_GATE = success
PREMERGE_WRI01_RUNTIME_GATE = success
PRINCIPAL_POST_MERGE_RELEASE_GATE = success
CORRECTIVE_PREMERGE_RELEASE_GATE = success
CORRECTIVE_PREMERGE_PRM2_GATE = success
CORRECTIVE_POST_MERGE_RELEASE_GATE = success
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

The final principal HEAD passed all protected gates before merge:

```text
RELEASE_GATE = success
PRM2_CONSOLIDATED_GATE = success
WRI01_RUNTIME_GATE = success
```

The implementation merged at `f5b5ec4dfbf9458219d332cb30ea96129e2bbcea`; its exact post-merge Release Gate also completed successfully.

## 2. Same-Backend principal managed migration

The GitHub-authoritative migration:

```text
supabase/migrations/20260812133000_dca_02_provider_object_identity_binding.sql
```

was first executed inside `BEGIN ... ROLLBACK` against the real Same-Backend PostgreSQL. Syntax, DDL, functions, trigger, constraints and grants completed without error and were rolled back.

After protected repository merge and Lovable developer synchronization, the same migration was applied through the managed Same-Backend migration mechanism.

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

## 3. Same-Backend bind-once functional proof

An all-rollback technical-tenant proof exercised the actually installed RPCs. All synthetic fixtures existed only inside the transaction and were rolled back.

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

The proof establishes database-side generation-bound identity, idempotence and fail-closed ambiguity without relying on Cloudflare Custom Metadata.

## 4. Post-principal privilege defect and consolidated corrective

Direct privilege audit after the principal managed migration found:

```text
SERVICE_ROLE_TRUNCATE = true
SERVICE_ROLE_REFERENCES = true
SERVICE_ROLE_TRIGGER = true
```

`TRUNCATE` bypasses row-level INSERT/UPDATE/DELETE triggers and therefore left the immutable provider-binding ledger insufficiently protected. DCA-02 repository/database acceptance was correctly withheld.

A separate Architecture First corrective IA selected least privilege:

```text
CORRECTIVE_STRATEGY = revoke all table privileges from service_role; grant SELECT only
HISTORICAL_MIGRATION_EDIT = false
CORRECTIVE_DATA_MUTATION = false
```

The corrective implementation was limited to exactly three frozen files and passed Release Gate and PR-M2 Consolidated Corrective Gate before protected merge.

Canonical GitHub forward migration:

```text
supabase/migrations/20260812143000_dca_02_provider_binding_privilege_hardening.sql
```

Its SQL authority is:

```text
REVOKE ALL PRIVILEGES ON public.domain_provider_bindings FROM service_role
GRANT SELECT ON public.domain_provider_bindings TO service_role
```

No data DML exists in the corrective migration.

## 5. Same-Backend corrective managed application

The corrective was applied through the managed Same-Backend migration path after the exact corrective GitHub merge synchronized into Lovable.

The managed platform recorded the semantically identical corrective SQL under its own generated migration identifier:

```text
MANAGED_CORRECTIVE_VERSION = 20260812141853
MANAGED_CORRECTIVE_NAME = 62120d7d-bd74-4959-a08a-c0db2dba07f6
MANAGED_CORRECTIVE_RECORDED_COUNT = 1
CANONICAL_GITHUB_MIGRATION_PATH = supabase/migrations/20260812143000_dca_02_provider_binding_privilege_hardening.sql
MANAGED_SQL_EQUIVALENT_TO_CANONICAL = true
```

The managed identifier difference is execution-ledger metadata; GitHub `main` remains the source authority for the canonical migration filename and source.

Final direct database privilege audit proved:

```text
SERVICE_ROLE_SELECT = true
SERVICE_ROLE_INSERT = false
SERVICE_ROLE_UPDATE = false
SERVICE_ROLE_DELETE = false
SERVICE_ROLE_TRUNCATE = false
SERVICE_ROLE_REFERENCES = false
SERVICE_ROLE_TRIGGER = false

RLS_ENABLED = true
DCA02_GUARD_TRIGGER_ENABLED = true
SERVICE_ROLE_DCA02_RPC_EXECUTE = true
ANON_DCA02_RPC_EXECUTE = false
AUTHENTICATED_DCA02_RPC_EXECUTE = false
```

Therefore direct runtime table mutation authority is reduced to read-only observation; provider-binding mutations remain behind the server-owned `SECURITY DEFINER` RPC boundary.

## 6. Final Same-Backend preservation audit

```text
DOMAIN_AUTHORITY_MODE = legacy
DOMAIN_AUTHORITY_LOCK_VERSION = 0
DOMAIN_AUTHORITY_ACTIVATED_AT = null
DOMAIN_AUTHORITY_ACTIVATED_BY = null
PROVIDER_BINDING_COUNT = 0
DCA02_DB_PROOF_FIXTURE_COUNT = 0
DCA02_SERVICE_ROLE_PROOF_FIXTURE_COUNT = 0

REAL_DOMAIN_ID = 6eda5a4e-be96-4756-b39b-746d886bc387
REAL_DOMAIN_TENANT_ID = 9664d189-4a12-4caa-8243-dc73383447e6
REAL_DOMAIN_HOSTNAME = rmprimeimoveis.com.br
REAL_DOMAIN_STATUS = pending_ownership_verification
REAL_DOMAIN_GENERATION = 1
REAL_DOMAIN_LOCK_VERSION = 0
REAL_DOMAIN_EXECUTION_MODE = manual_assisted
REAL_DOMAIN_MUTATED = false

DCA01_SYNTHETIC_DOMAIN_ID = 1d800a0d-b0b4-4f03-b75e-d9c6534a80e1
DCA01_SYNTHETIC_DOMAIN_STATUS = revoked
DCA01_SYNTHETIC_DOMAIN_GENERATION = 1
DCA01_SYNTHETIC_DOMAIN_LOCK_VERSION = 9
```

No global cutover or real-tenant proof was executed.

## 7. Lovable generated source drift and canonical reconciliation

Both managed migration executions produced platform-generated workspace artifacts despite textual executor claims of zero edits.

Direct `Lovable.get_diff` audits found:

```text
GENERATED_DRIFT_1 = src/integrations/supabase/types.ts
GENERATED_DRIFT_2 = supabase/migrations/20260812141853_62120d7d-bd74-4959-a08a-c0db2dba07f6.sql
```

Neither artifact is accepted as a GitHub source mutation from the managed executor. The generated migration is semantically identical to the canonical corrective SQL but its filename remains a managed-execution artifact.

```text
GITHUB_MAIN_IS_SOURCE_AUTHORITY = true
CANONICAL_TYPES_SOURCE = GitHub main
CANONICAL_CORRECTIVE_MIGRATION = 20260812143000_dca_02_provider_binding_privilege_hardening.sql
LOVABLE_GENERATED_MIGRATION_CANONICAL = false
ADDITIONAL_LOVABLE_EDIT_PROMPT = prohibited
RECONCILIATION_MECHANISM = next GitHub-authoritative developer_update
```

This evidence merge is the authoritative repository reconciliation and must be used by Lovable developer synchronization to discard the noncanonical workspace artifacts rather than committing them back to GitHub.

## 8. Mandatory Cloudflare live proof — current blocker

The DCA-02 implementation still requires a controlled provider proof on the current Cloudflare plan. During this execution, repeated invocations of the explicitly requested `Cloudflare API MCP - RM Prime` returned:

```text
FORBIDDEN: This conversation does not support developer MCPs
```

The connector schema can be discovered, but actual Cloudflare API search/execute remains rejected by the conversation transport layer. Therefore no DCA-02 live Cloudflare mutation was executed after the implementation.

This is a connector/session blocker, not a Cloudflare provider-capability result. The following claims remain **unproven live**:

```text
CURRENT_PLAN_CREATE_WITHOUT_CUSTOM_METADATA = pending
LIVE_RETURNED_ID_BINDING = pending
LIVE_NO_SECOND_CREATE_IDEMPOTENCE = pending
LIVE_EXACT_ID_OBSERVATION = pending
LIVE_SSL_LIFECYCLE = pending
LIVE_EXACT_ID_REMOVAL = pending
LIVE_PROVIDER_TEARDOWN_ZERO_ORPHANS = pending
```

The live proof must use a new technical synthetic hostname only and must preserve the Worker corrective, root, `www`, `notify`, the real tenant and global `legacy` authority.

## 9. Current stage state

```text
DCA02_REPOSITORY_IMPLEMENTATION = Accepted / Merged / Closed
DCA02_SAME_BACKEND_SCHEMA_MIGRATION = Accepted / Applied
DCA02_BIND_ONCE_DATABASE_PROOF = Accepted / Passed
DCA02_PRIVILEGE_CORRECTIVE = Accepted / Merged / Applied / Audited
DCA02_REPOSITORY_DATABASE_STATE = Accepted
DCA02_EXTERNAL_PROVIDER_PROOF = Blocked External — Cloudflare MCP transport unavailable
DCA02_TERMINAL_ACCEPTED = false

GLOBAL_AUTHORITY_MODE = legacy
REAL_TENANT_MUTATION = false
PRODUCTION_CUTOVER = false
BCA01 = blocked
PRM3 = blocked
```

Repository and Same-Backend database work are closed. No additional DCA-02 repository/database implementation prompt is authorized. DCA-02 terminal acceptance requires only the mandatory live Cloudflare current-plan synthetic proof and its teardown/audit once the Cloudflare MCP transport is available.