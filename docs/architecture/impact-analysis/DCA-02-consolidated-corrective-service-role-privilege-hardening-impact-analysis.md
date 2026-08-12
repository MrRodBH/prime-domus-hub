# DCA-02 — Consolidated Corrective: Service-Role Provider-Binding Privilege Hardening

## Status

**Accepted for planning / corrective implementation not yet started**

```text
STAGE_ID = DCA-02
CORRECTIVE_TYPE = consolidated_corrective
TRIGGER = post-managed-migration direct privilege audit
AUDITED_MAIN = f5b5ec4dfbf9458219d332cb30ea96129e2bbcea
APPLIED_DCA02_MIGRATION = 20260812133000
PROBLEM = service_role retains TRUNCATE/REFERENCES/TRIGGER table privileges on domain_provider_bindings
SECURITY_IMPACT = TRUNCATE bypasses row-level DML trigger and can erase immutable provider binding identity
CURRENT_RUNTIME_INSERT = false
CURRENT_RUNTIME_UPDATE = false
CURRENT_RUNTIME_DELETE = false
CURRENT_RUNTIME_TRUNCATE = true
CORRECTIVE_REQUIRED = true
PRODUCTION_CUTOVER = prohibited
REAL_TENANT_PROOF = prohibited
```

## 1. Factual finding

After the principal DCA-02 migration was applied through the managed Same-Backend migration path, direct PostgreSQL audit proved:

```text
RLS_ENABLED = true
DCA02_TRIGGER_ENABLED = true
ANON_RPC_EXECUTE = false
AUTHENTICATED_RPC_EXECUTE = false
SERVICE_ROLE_RPC_EXECUTE = true
SERVICE_ROLE_INSERT = false
SERVICE_ROLE_UPDATE = false
SERVICE_ROLE_DELETE = false
SERVICE_ROLE_TRUNCATE = true
SERVICE_ROLE_REFERENCES = true
SERVICE_ROLE_TRIGGER = true
```

The principal migration revoked `INSERT`, `UPDATE`, and `DELETE` but did not revoke the remaining table privileges inherited by `service_role`.

`TRUNCATE` is a security blocker because it is not a row-level `INSERT/UPDATE/DELETE` operation and therefore is not blocked by `dca02_guard_provider_binding_write`. If available to the application runtime role, it could destroy the server-owned provider-object identity ledger without passing the bind-once RPC boundary.

`REFERENCES` and `TRIGGER` are not required by the DCA-02 runtime and unnecessarily broaden the table authority surface.

## 2. Impact analysis

The defect is isolated to database grants. The principal runtime design remains valid:

- server-owned binding claim before provider POST;
- immutable `custom_hostname_id` after bind;
- exact-ID observation and deletion;
- `ambiguous` fail-closed behavior;
- no hostname-only provider adoption;
- no Custom Metadata authorization dependency.

No application code change is required to close the defect.

### Security impact if not corrected

```text
BIND_ONCE_TABLE_INTEGRITY = not fully closed
TRIGGER_ONLY_PROTECTION = insufficient against TRUNCATE
TENANT_TAKEOVER_DIRECT_PATH = not demonstrated
LEDGER_DESTRUCTION_PATH = present for service_role
FAIL_CLOSED_GUARANTEE = incomplete
```

The issue is therefore blocking for DCA-02 repository/database acceptance.

## 3. Alternatives

### Strategy A — Revoke all table privileges from service_role, restore SELECT only

**Selected.**

```sql
revoke all privileges on table public.domain_provider_bindings from service_role;
grant select on table public.domain_provider_bindings to service_role;
```

The DCA-02 mutation RPCs are `SECURITY DEFINER`, so their internal table writes execute under the function owner authority and do not require direct table DML privileges for `service_role`.

This is the narrowest and most auditable authority model.

### Strategy B — Revoke only TRUNCATE

Rejected. It would leave `REFERENCES` and `TRIGGER` privileges without a runtime requirement and would not achieve least privilege.

### Strategy C — Add a TRUNCATE trigger and retain broad grants

Rejected. It adds unnecessary database machinery and preserves authority that the runtime does not require.

## 4. Corrective FILES_ALLOWED

The consolidated corrective is closed to exactly:

```text
1. supabase/migrations/20260812143000_dca_02_provider_binding_privilege_hardening.sql
2. run-dca-02-provider-object-identity-specs.ts
3. docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-02-provider-object-identity-implementation-evidence.md
```

No historical migration may be edited. No adapter, job, reconciliation, auth, tenant, Cloudflare, Worker, DNS, package or lock-file change is authorized.

## 5. Corrective migration contract

The forward migration must:

1. revoke **all** table privileges on `public.domain_provider_bindings` from `service_role`;
2. grant back **SELECT only**;
3. preserve RLS enabled;
4. preserve all DCA-02 RPC EXECUTE grants to `service_role`;
5. preserve zero `anon`/`authenticated` RPC EXECUTE;
6. preserve the DCA-02 guard trigger;
7. make no data changes;
8. make no tenant/domain/provider-account/authority changes.

Expected final table privileges:

```text
SERVICE_ROLE_SELECT = true
SERVICE_ROLE_INSERT = false
SERVICE_ROLE_UPDATE = false
SERVICE_ROLE_DELETE = false
SERVICE_ROLE_TRUNCATE = false
SERVICE_ROLE_REFERENCES = false
SERVICE_ROLE_TRIGGER = false
```

## 6. Regression gate

`run-dca-02-provider-object-identity-specs.ts` must structurally require the corrective migration and prove that its source contains:

```text
revoke all privileges on table public.domain_provider_bindings from service_role
grant select on table public.domain_provider_bindings to service_role
```

The existing principal DCA-02 tests remain unchanged otherwise.

## 7. Managed database proof

After protected merge, apply only the new forward migration using the managed Same-Backend migration path. Direct audit must prove:

- migration recorded exactly once;
- final service-role privileges equal SELECT-only;
- RLS remains enabled;
- DCA-02 RPC privileges remain unchanged;
- authority remains `legacy`, lock_version 0;
- provider binding count remains unchanged;
- real domain `rmprimeimoveis.com.br` remains unchanged;
- no synthetic fixture remains.

## 8. Existing functional proof preserved

Before this corrective IA, an all-rollback Same-Backend functional proof already passed:

```text
CLAIM_SAME_KEY_IDEMPOTENT = true
COMPETING_CLAIM_REJECTED = true
BIND_SAME_ID_IDEMPOTENT = true
REBIND_DIFFERENT_ID_REJECTED = true
EXACT_ID_OBSERVATION = true
BOUND_RELEASE_REJECTED = true
AMBIGUOUS_STATE_PERSISTED = true within transaction
AMBIGUOUS_REENTRY_REJECTED = true
AMBIGUOUS_RELEASE_REJECTED = true
POST_PROOF_SYNTHETIC_DOMAIN_COUNT = 0
POST_PROOF_SYNTHETIC_BINDING_COUNT = 0
```

This proof does not waive the table-grant defect.

## 9. Decision

```text
CORRECTIVE_STRATEGY = A — SELECT-only service-role table authority
IMPACT_ANALYSIS = Accepted
CORRECTIVE_IMPLEMENTATION_AUTHORIZED_BY_EXISTING_OWNER_END_TO_END_MANDATE = true
CORRECTIVE_IMPLEMENTATION_STARTED = false
CORRECTIVE_PROMPT_BUDGET = single consolidated corrective
NEXT_ACTION = protected planning merge, then one consolidated corrective implementation
DCA02_EXTERNAL_CLOUDFLARE_PROOF = still mandatory
BCA01 = blocked
PRM3 = blocked
```

DCA-02 cannot be terminally Accepted until this privilege closure and the current-plan live Cloudflare synthetic proof both pass.