# DCA-01 — Consolidated Corrective Runtime Proof Impact Analysis

## Status

**Accepted — corrective execution authorized end-to-end by Product Owner**

```text
STAGE_ID = DCA-01
CORRECTIVE_ID = DCA-01-CORRECTIVE-RUNTIME-PROOF
BASELINE_MAIN = dbd9f14e51ccb3e3965a4d0160f63cefd29fa29b
BRANCH = agent/dca-01-consolidated-corrective-runtime-proof
EXECUTION_MODE = END-TO-END
IMPACT_ANALYSIS_RESULT = Accepted
NEW_STAGE_CREATED = false
SPR03_REOPENED = false
WRI01_REOPENED = false
BCA01_STARTED = false
PRM3_STARTED = false
PRODUCTION_CUTOVER_AUTHORIZED = false
REAL_TENANT_PROOF_AUTHORIZED = false
```

## 1. Triggering evidence

The DCA-01 Worker FINAL version `0ad23ddc-f80b-41d6-b03c-f4ffeb3af841` was promoted successfully to 100% traffic. The controlled non-production proof then encountered two independent defects before any synthetic domain row was created.

### 1.1 Provider registration defect

The live `public.register_domain_provider_account` function raises PostgreSQL `42702` because its `RETURNS TABLE` output variables collide with the unqualified `ON CONFLICT (provider_code, account_identifier)` target. The statement aborts atomically and leaves no provider-account or audit residue.

The canonical table already owns:

```text
domain_provider_accounts_provider_account_uq
UNIQUE (provider_code, account_identifier)
```

The deterministic repair is to replace only that function and target the named constraint.

### 1.2 Managed CNAME runtime binding defect

`src/lib/domains/domain-jobs.server.ts::prepareDns` requires `DCA01_MANAGED_CNAME_TARGET`. The active FINAL version does not contain that plaintext binding. The authorized non-production value is:

```text
DCA01_MANAGED_CNAME_TARGET = fallback.mrrod.com.br
```

## 2. Impact classification

The corrective changes only:

1. one database runtime function definition through one new forward migration;
2. deterministic regression coverage for that function;
3. one Cloudflare Worker Version binding set, created inactive first and derived from the accepted FINAL.

No table, enum, index, RLS policy, tenant authority, authentication boundary, request resolver, scheduler integration, provider adapter, DNS observer or lifecycle state-machine change is required.

## 3. Binding architecture

```text
SERVER_IS_TENANT_AUTHORITY = true
SERVER_IS_DOMAIN_AUTHORITY = true
SERVER_IS_PROVIDER_AUTHORITY = true
CLIENT_PROVIDER_AUTHORITY = false
CLIENT_DNS_SUCCESS_AUTHORITY = false
CLIENT_SSL_SUCCESS_AUTHORITY = false
SUPER_ADMIN_TENANT_MUTATION_WITHOUT_IMPERSONATION = false
HEURISTIC_FALLBACK = prohibited
REQUEST_TIME_DUAL_AUTHORITY = prohibited
SILENT_MODE_FALLBACK = prohibited
FAIL_FAST = true
FAIL_CLOSED = true
SAME_BACKEND_HOMOLOGATION_CELL = binding
```

## 4. Database corrective contract

The historical migration `20260804180000_dca_01_domain_cloudflare_activation.sql` is immutable.

Exactly one new forward migration is authorized:

```text
supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql
```

It must:

- replace only `public.register_domain_provider_account(text,text,jsonb,uuid,text)`;
- preserve `LANGUAGE plpgsql`, `SECURITY DEFINER` and `SET search_path = pg_catalog, public`;
- preserve all existing input validation and Cloudflare-only provider semantics;
- preserve opaque `env:NAME` credential references;
- preserve sanitized `provider_account_registered` audit evidence;
- replace only the ambiguous conflict target with `ON CONFLICT ON CONSTRAINT domain_provider_accounts_provider_account_uq`;
- preserve effective ACL: `service_role` executable; `PUBLIC`, `anon`, `authenticated` not executable;
- create no table, type, policy, trigger, index, extension or unrelated function.

After application, validation must prove one provider account after registration, idempotent repeated registration, exact account/zone authority, opaque credential reference only, no real-tenant mutation and unchanged `domain_authority_control`.

## 5. Regression coverage contract

The initial plan was to extend the large existing DCA-01 spec directly. The Lovable principal and corrective executions both failed closed before code mutation because its internal mirror cannot author an unapplied migration file or read the GitHub-native corrective branch.

To avoid a third Lovable prompt and reduce edit risk, the GitHub-native implementation uses one isolated regression spec:

```text
run-dca-01-provider-registration-corrective-specs.ts
```

`package.json::test:dca-01` must execute the historical DCA-01 spec first and the isolated corrective spec second. `scripts/verify-release.mjs` already invokes `test:dca-01`, so the new regression is automatically part of the Release Gate without changing the release verifier.

The corrective spec must prove:

- exactly one replaced function;
- named constraint conflict target present;
- ambiguous conflict inference target absent;
- `SECURITY DEFINER` and fixed `search_path` preserved;
- client execute revoked and `service_role` execute preserved;
- no `CREATE TABLE`, `CREATE TYPE`, `CREATE POLICY`, `ALTER TABLE` or `CREATE INDEX` expansion.

This is an implementation-time testing-path justification only; it does not change runtime architecture.

## 6. Worker corrective version contract

The corrective Worker Version must be created **inactive first** and preserve:

```text
SOURCE_FINAL_VERSION = 0ad23ddc-f80b-41d6-b03c-f4ffeb3af841
WORKER = rm-prime-wri01-hml
ASSETS_BINDING = preserved
SECRET_BINDINGS =
  CLOUDFLARE_API_TOKEN_DCA01_HML
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_URL
```

It may add exactly:

```text
DCA01_MANAGED_CNAME_TARGET=fallback.mrrod.com.br
```

No route, workers.dev, preview URL, Cron Trigger, queue, email trigger, additional secret, additional plaintext variable, service binding or production-domain change is authorized. Promotion is prohibited until the inactive version is audited.

## 7. Controlled proof tenant

```text
TENANT_ID = 0246468a-ee84-402e-8fae-08f554daf0e1
TENANT_SLUG = scp0121_0246468aee84
INTENDED_HOSTNAME = dca01-hml.mrrod.com.br
REAL_TENANT_USE = prohibited
```

The hostname remains conditional on collision preflight.

## 8. Proof sequence

After both correctives are Accepted:

1. register the provider account through the canonical server/RPC boundary;
2. create the synthetic domain through the server-owned lifecycle, never direct table mutation;
3. issue ownership proof;
4. create only required non-production DNS evidence;
5. let the Worker lifecycle independently observe DNS;
6. provision/observe the Cloudflare Custom Hostname through the canonical adapter;
7. prove SSL lifecycle and reconciliation;
8. prove active authority only for the synthetic tenant;
9. execute teardown/removal and verify no orphan DNS/provider/job artifacts;
10. keep `domain_authority_control.authority_mode=legacy` and `activated_at=null`; no global cutover.

## 9. FILES_ALLOWED

```text
docs/architecture/impact-analysis/DCA-01-consolidated-corrective-runtime-proof-impact-analysis.md
supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql
run-dca-01-provider-registration-corrective-specs.ts
package.json
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-implementation-execution.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

`package.json` may change only the `test:dca-01` command. Runtime dependencies and devDependencies must remain byte-semantically unchanged.

`src/integrations/supabase/types.ts` and `src/routeTree.gen.ts` are generated drift risks and are not authorized as effective corrective changes.

## 10. Explicit prohibitions

```text
HISTORICAL_MIGRATION_EDIT = prohibited
DIRECT_TABLE_PROVIDER_INSERT = prohibited
MANUAL_SCHEMA_HISTORY_EDIT = prohibited
RLS_CHANGE = prohibited
GRANT_EXPANSION = prohibited
ENUM_CHANGE = prohibited
TENANT_AUTHORITY_CHANGE = prohibited
PROVIDER_ADAPTER_CHANGE = prohibited
STATE_MACHINE_CHANGE = prohibited
REAL_TENANT_MUTATION = prohibited
PRODUCTION_DNS_MUTATION = prohibited
AUTHORITATIVE_GLOBAL_CUTOVER = prohibited
BCA01 = blocked
PRM3 = blocked
SPR03_REOPEN = prohibited
WRI01_REOPEN = prohibited
```

## 11. Definition of Done

The corrective reaches `Accepted` only when:

- this Impact Analysis is present and audited;
- exactly one forward corrective migration exists;
- regression coverage passes through `test:dca-01` and Release Gate at the exact corrective HEAD;
- live database function executes successfully and idempotently with ACL/RLS boundaries unchanged;
- one inactive Worker corrective version is created with exactly the authorized binding delta and audited before promotion;
- after promotion, the synthetic proof completes or fails closed with a factual external blocker;
- real tenant remains untouched;
- no global authority cutover occurs;
- teardown leaves no orphan proof artifacts;
- final documentation reflects factual state;
- BCA-01 and PR-M3 remain blocked unless separately authorized after terminal DCA-01 acceptance.

## 12. Decision

```text
IMPACT_ANALYSIS = Accepted
CORRECTIVE_EXECUTION = Authorized
CORRECTIVE_SCOPE = closed
NEW_ARCHITECTURAL_DECISION = false
NEW_RUNTIME_AUTHORITY = false
PRODUCTION_AUTHORITY = false
LOVABLE_PRINCIPAL_PROMPT = consumed_fail_closed
LOVABLE_CORRECTIVE_PROMPT = consumed_fail_closed
FURTHER_LOVABLE_PROMPTS = prohibited_for_this_corrective
GITHUB_NATIVE_COMPLETION = authorized_by_governance_fallback
NEXT_ACTION = audit repository corrective and run protected CI before live application
```

## 13. Managed migration transport governance reconciliation

### 13.1 Impact Analysis of the reconciliation

This subsection reconciles a transport-only governance contradiction after the GitHub-native corrective implementation was merged. It does not reopen the corrective implementation, create a new architectural stage, change runtime architecture, alter database state, modify provider state, mutate tenant state, or authorize production cutover.

```text
RECONCILIATION_SCOPE = governance_only_documentation
RUNTIME_EFFECT = none
DATABASE_EFFECT = none
PROVIDER_EFFECT = none
TENANT_EFFECT = none
ARCHITECTURE_CHANGE = none
NEW_STAGE_CREATED = false
IMPLEMENTATION_BUDGET_REOPENED = false
LOVABLE_PRINCIPAL_PROMPT = consumed_fail_closed
LOVABLE_CORRECTIVE_PROMPT = consumed_fail_closed
```

The Section 12 statement `FURTHER_LOVABLE_PROMPTS = prohibited_for_this_corrective` remains binding for implementation, corrective implementation, code generation, file editing, schema redesign, runtime changes, or any scope expansion. It does not classify a managed migration transport invocation as an implementation prompt when that invocation is limited to applying the already-merged immutable migration through the Lovable Cloud migration-aware infrastructure.

### 13.2 One-time transport-only authorization

The Product Owner explicitly authorizes one narrow operational exception:

```text
TRANSPORT_ONLY_MANAGED_MIGRATION_EXECUTION = authorized_once
ONE_TIME_MANAGED_MIGRATION_TRANSPORT_INVOCATION = authorized
TRANSPORT_CLASSIFICATION = operational_only
THIRD_CORRECTIVE_CREATED = false
IMPLEMENTATION_PROMPT_BUDGET_CHANGED = false
SQL_AUTHORITY = GitHub main audited after this reconciliation is merged
SOURCE_FILE = supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql
```

The sole purpose of the invocation is to apply exactly the SQL from `SOURCE_FILE` through the Lovable Cloud managed migration primitive and let the platform create normal managed migration history. The SQL must be obtained from the audited GitHub `main` after this governance reconciliation is merged; it must not be reconstructed, reinterpreted, expanded, or replaced by ad-hoc DDL.

The transport-only invocation must not:

- implement or edit code;
- edit repository files;
- generate new application logic;
- alter schema beyond the exact canonical forward migration;
- use direct `query_database` DDL as a substitute for the managed migration primitive;
- manually insert, update, delete, repair, rename, or force migration history/version;
- touch Cloudflare, DNS, the real tenant, production ingress, or global authority cutover;
- execute any additional mutation after the managed migration and its immediate read-only verification.

If the managed migration fails before commit, execution must fail closed without blind retry or alternate DDL. If any managed-history entry, partial commit, or ambiguous state is observed, the actual live state must be audited before any consideration of reapplication.

### 13.3 Reconciliation decision

```text
MANAGED_MIGRATION_TRANSPORT_GOVERNANCE_RECONCILIATION = Accepted
GOVERNANCE_ONLY_IMPACT = confirmed
ZERO_RUNTIME_DATABASE_PROVIDER_EFFECT_FROM_THIS_DOCUMENT_CHANGE = true
ONE_TIME_TRANSPORT_INVOCATION_AVAILABLE_AFTER_MERGE = true
FURTHER_IMPLEMENTATION_PROMPTS = prohibited
NEXT_ACTION_AFTER_MERGE = invoke exactly one Lovable Cloud managed-migration transport execution for the canonical corrective migration, then audit live state and workspace drift
```

## 14. Managed migration transport execution evidence

### 14.1 Managed database result

The one-time transport-only invocation was consumed exactly once after Section 13 became canonical on GitHub `main`. The Lovable Cloud managed migration primitive read the canonical migration from the audited Git commit and applied that SQL as one managed migration.

```text
TRANSPORT_ONLY_INVOCATION_CONSUMED = true
TRANSPORT_INVOCATION_COUNT = 1
SQL_AUTHORITY_HEAD = 97f977302f6a97a77f557034bee4e6ff26000a10
SOURCE_FILE = supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql
SOURCE_FILE_SHA256 = 92ba1f2d0d5cb464e7974f686875ee1ad3383ae38fce7141dc0bb8b2d5d7bdb5
MANAGED_MIGRATION_RESULT = success
CORRECTIVE_LIVE_MANAGED_MIGRATION_VERSION = 20260812014256
CORRECTIVE_LIVE_MANAGED_MIGRATION_NAME = 2e268935-ea5d-48bc-9df6-f4e3a42fb9d0
BASE_MANAGED_MIGRATION_VERSION = 20260811224106
BASE_MANAGED_MIGRATION_INTACT = true
MANUAL_SCHEMA_HISTORY_EDIT = false
```

Independent read-only database audit after the managed migration confirmed:

- `public.register_domain_provider_account(text,text,jsonb,uuid,text)` contains `ON CONFLICT ON CONSTRAINT domain_provider_accounts_provider_account_uq`;
- the former ambiguous `ON CONFLICT (provider_code, account_identifier)` target is absent;
- `LANGUAGE plpgsql`, `SECURITY DEFINER` and fixed `search_path` to `pg_catalog, public` are preserved;
- `service_role` retains execute permission and `PUBLIC`, `anon`, `authenticated` do not have execute permission;
- all eight DCA tables remain present with RLS enabled, zero policies and zero client table grants;
- `domain_authority_control` remains `authority_mode=legacy`, `lock_version=0`, `activated_at=null`;
- the managed migration itself created no provider account and no synthetic domain row;
- the real tenant remained unchanged;
- no global authority cutover occurred.

Functional provider registration and idempotence proof remain a separate post-drift validation gate and are not inferred from migration success alone.

### 14.2 Generated Lovable workspace drift

The transport agent's textual claim of zero effective workspace diff is rejected because direct `Lovable.get_diff` audit of the exact transport execution identified two generated artifacts:

```text
src/integrations/supabase/types.ts
supabase/migrations/20260812014256_2e268935-ea5d-48bc-9df6-f4e3a42fb9d0.sql
```

The generated migration copy contains the same corrective SQL applied through the managed primitive; it is not a second database migration and is not accepted as a second canonical migration file. `src/integrations/supabase/types.ts` reflects platform-generated type regeneration. Neither generated artifact is authorized as an effective source change. `src/routeTree.gen.ts` was not present in the audited generated diff.

```text
GENERATED_DRIFT_COUNT = 2
GENERATED_DRIFT_CLASSIFICATION = platform_transport_generated
GENERATED_DRIFT_CANONICAL_ACCEPTANCE = false
LOVABLE_EFFECTIVE_DIFF_COUNT = pending_reconciliation
ROUTE_TREE_GENERATED_DRIFT = false
ADDITIONAL_DATABASE_MUTATION_FOR_DRIFT_CLEANUP = prohibited
```

### 14.3 Drift reconciliation mechanism and next gate

The selected reconciliation is a GitHub-authoritative developer sync. This evidence update is GitHub-native and governance/documentation-only. After merge, the resulting exact GitHub `main` must become the Lovable `developer_update` authority and replace the transport-generated workspace tree. No additional Lovable edit prompt and no database mutation are authorized for this reconciliation.

```text
DRIFT_RECONCILIATION_MECHANISM = GitHub_authoritative_developer_sync
ADDITIONAL_LOVABLE_EDIT_PROMPT = prohibited
ADDITIONAL_DATABASE_MUTATION = prohibited
TARGET_LOVABLE_EFFECTIVE_DIFF_COUNT = 0
DATABASE_FUNCTIONAL_PROVIDER_REGISTRATION = pending_after_zero_diff
DCA01_DATABASE_CORRECTIVE_GATE = Pending
WORKER_CORRECTIVE_PROMOTION = prohibited_until_database_gate_accepted
CONTROLLED_DOMAIN_PROOF = pending_corrective_gates
BCA01 = blocked
PRM3 = blocked
```

The database corrective gate may become `Accepted` only after the GitHub-authoritative Lovable workspace is proven clean and the canonical provider-registration boundary is exercised successfully and idempotently with all security, redaction, authority, and real-tenant invariants preserved.

## 15. Functional provider-registration proof evidence

### 15.1 Canonical boundary and execution

The repository boundary `src/lib/api/super-domain.functions.ts::registerCloudflareProviderAccount` validates server-owned input, requires authenticated Global Super Admin authority, normalizes zone apexes, and persists exclusively through `public.register_domain_provider_account`. The controlled harness could not materialize an authenticated application session, so the authorized persistence RPC was invoked directly through Supabase PostgREST with the server-side service-role credential. No direct table DML was used.

```text
PROVIDER_REGISTRATION_BOUNDARY = canonical_rpc
DIRECT_TABLE_DML = false
RPC_TRANSPORT = Supabase_PostgREST_service_role
ACTOR_USER_ID = 1302d850-2a8c-4e17-b7a7-4bef292cd394
ACTOR_SUPER_ADMIN_REVALIDATED = true
AUTHORITY_ORIGIN = super_admin
ACCOUNT_IDENTIFIER = 68ec853e6b04a038f09fca5712d6b26b
CREDENTIAL_REFERENCE = env:CLOUDFLARE_API_TOKEN_DCA01_HML
ZONE_NAME = mrrod.com.br
ZONE_ID = 90832d0006e9e630dbb73d33c551d836
```

### 15.2 Idempotence and redaction result

Two consecutive invocations with identical canonical parameters completed successfully without PostgreSQL `42702` and returned the same provider account identity.

```text
RPC_CALL_1 = success_http_200
RPC_CALL_2 = success_http_200
POSTGRES_42702 = absent
PROVIDER_ACCOUNT_ID_CALL_1 = e6bdc745-5370-4e72-ad46-deafc8be18b3
PROVIDER_ACCOUNT_ID_CALL_2 = e6bdc745-5370-4e72-ad46-deafc8be18b3
PROVIDER_ACCOUNT_COUNT = 1
IDEMPOTENT_PROVIDER_IDENTITY = true
PROVIDER_CODE = cloudflare
PROVIDER_ENABLED = true
PROVIDER_HEALTH_STATUS = unknown
CUSTOM_HOSTNAMES_CAPABILITY = true
SSL_OBSERVATION_CAPABILITY = true
OPAQUE_CREDENTIAL_REFERENCE_PRESERVED = true
PROVIDER_REGISTRATION_AUDIT_EVENT_COUNT = 2
SANITIZED_AUDIT_EVENT_COUNT = 2
SUSPICIOUS_AUDIT_SECRET_COUNT = 0
```

Independent read-only database audit confirmed both audit rows contain the exact actor and `authority_origin=super_admin`, while `detail_sanitized.credential_reference='[redacted]'`. The persisted provider credential reference remains only the opaque environment reference; no token value was persisted.

The same audit confirmed:

```text
SYNTHETIC_TENANT_DOMAIN_COUNT = 0
REAL_TENANT_DOMAIN = rmprimeimoveis.com.br
REAL_TENANT_DOMAIN_COUNT = 1
AUTHORITY_MODE = legacy
AUTHORITY_LOCK_VERSION = 0
AUTHORITY_ACTIVATED_AT = null
GLOBAL_CUTOVER_EXECUTED = false
```

### 15.3 Generated types drift and reconciliation

Direct `Lovable.get_diff` audit of the operational proof rejected the agent's textual clean-workspace claim. The proof caused one platform-generated workspace drift artifact:

```text
src/integrations/supabase/types.ts
```

No new migration file and no `src/routeTree.gen.ts` drift were present in that execution diff. This generated types change is not accepted as canonical source. This GitHub-native evidence merge is the selected authoritative developer sync for removing it without additional database mutation or Lovable edit prompt.

```text
FUNCTIONAL_PROOF_GENERATED_DRIFT_COUNT = 1
FUNCTIONAL_PROOF_GENERATED_DRIFT_CANONICAL_ACCEPTANCE = false
FUNCTIONAL_PROOF_NEW_MIGRATION_DRIFT = false
FUNCTIONAL_PROOF_ROUTE_TREE_DRIFT = false
DRIFT_RECONCILIATION_MECHANISM = GitHub_authoritative_developer_sync
ADDITIONAL_DATABASE_MUTATION_FOR_RECONCILIATION = prohibited
ADDITIONAL_LOVABLE_EDIT_PROMPT_FOR_RECONCILIATION = prohibited
TARGET_LOVABLE_EFFECTIVE_DIFF_COUNT = 0
DCA01_DATABASE_CORRECTIVE_GATE = Pending_until_post_merge_zero_diff_audit
WORKER_CORRECTIVE_PROMOTION = prohibited_until_database_gate_accepted
```

After this evidence merge becomes the completed Lovable `developer_update`, the workspace must be audited directly. Only a zero effective source diff against that exact GitHub `main` authorizes `DCA01_DATABASE_CORRECTIVE_GATE = Accepted` and progression to the Worker corrective gate.
