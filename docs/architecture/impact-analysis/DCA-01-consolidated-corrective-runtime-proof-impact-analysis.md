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
