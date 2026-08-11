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

The DCA-01 Worker FINAL version `0ad23ddc-f80b-41d6-b03c-f4ffeb3af841` was promoted successfully to 100% traffic after a fresh-build and redirected-Wrangler preflight. The controlled non-production domain proof then encountered two independent internal defects before any synthetic domain row was created.

### 1.1 Provider registration defect

The live `public.register_domain_provider_account` function raises PostgreSQL `42702` because the `RETURNS TABLE` output variables `provider_code` and `account_identifier` collide with the unqualified `ON CONFLICT (provider_code, account_identifier)` target. PostgreSQL aborts the statement atomically; no provider account or audit residue is created.

The canonical table already owns the exact constraint:

```text
domain_provider_accounts_provider_account_uq
UNIQUE (provider_code, account_identifier)
```

The deterministic corrective is to replace only this function and target that named constraint explicitly.

### 1.2 Managed CNAME runtime binding defect

`src/lib/domains/domain-jobs.server.ts::prepareDns` requires `DCA01_MANAGED_CNAME_TARGET`. The active FINAL version does not contain that plaintext binding. Without it, the synthetic lifecycle would deterministically fail with `domain_external_prerequisite_missing` after ownership verification.

The authorized non-production target is:

```text
DCA01_MANAGED_CNAME_TARGET = fallback.mrrod.com.br
```

## 2. Impact classification

The corrective changes two controlled surfaces:

1. **Database runtime function definition** — one new forward migration containing only `CREATE OR REPLACE FUNCTION public.register_domain_provider_account` plus exact grant/revoke preservation as needed.
2. **Cloudflare Worker Version binding set** — one new inactive corrective Worker Version derived from the current accepted FINAL code/assets/secrets, adding only the plaintext binding `DCA01_MANAGED_CNAME_TARGET=fallback.mrrod.com.br`.

No table, enum, index, RLS policy, tenant authority, authentication boundary, request resolver, scheduled executor, Cloudflare adapter, DNS observer or lifecycle state-machine change is required.

## 3. Architecture authority

The following invariants remain binding:

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

### 4.1 Forward-only rule

The historical DCA-01 migration `20260804180000_dca_01_domain_cloudflare_activation.sql` is immutable and must not be edited.

Exactly one new forward corrective migration is authorized.

### 4.2 Function-only delta

The migration must:

- replace only `public.register_domain_provider_account(text,text,jsonb,uuid,text)`;
- preserve `LANGUAGE plpgsql`;
- preserve `SECURITY DEFINER`;
- preserve `SET search_path = pg_catalog, public`;
- preserve all existing input validation;
- preserve opaque `env:NAME` credential-reference storage;
- preserve Cloudflare-only provider code;
- preserve the audit event with redacted credential reference;
- replace the ambiguous conflict target with `ON CONFLICT ON CONSTRAINT domain_provider_accounts_provider_account_uq`;
- preserve effective execution ACLs: `service_role` executable, `PUBLIC`, `anon`, and `authenticated` not executable;
- create no table, type, policy, trigger, index, extension or unrelated function.

### 4.3 Live validation

After application, the proof must establish:

- exactly one provider account after one canonical registration call;
- repeated identical registration remains idempotent and leaves cardinality at one;
- provider code = `cloudflare`;
- account identifier = expected Cloudflare account ID;
- credential reference stored only as `env:CLOUDFLARE_API_TOKEN_DCA01_HML`;
- zone mapping contains only `mrrod.com.br` → expected zone identifier;
- zero plaintext credential exposure;
- one or more sanitized provider registration audit events as defined by the function;
- no change to real tenant domain authority or `domain_authority_control`.

## 5. Regression coverage contract

Deterministic coverage must prevent recurrence of PostgreSQL 42702 by verifying the corrective migration contains the named constraint form and no unqualified `ON CONFLICT (provider_code, account_identifier)` in the corrected function body.

Existing DCA-01 lifecycle tests remain authoritative and must continue passing.

## 6. Worker corrective version contract

The corrective Worker Version must be created **inactive first**.

It must preserve the accepted FINAL authority:

```text
SOURCE_FINAL_VERSION = 0ad23ddc-f80b-41d6-b03c-f4ffeb3af841
WORKER = rm-prime-wri01-hml
ASSETS_BINDING = preserved
SECRET_BINDINGS =
  CLOUDFLARE_API_TOKEN_DCA01_HML
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_URL
```

and add exactly:

```text
PLAIN_TEXT_BINDING =
  DCA01_MANAGED_CNAME_TARGET=fallback.mrrod.com.br
```

No route, workers.dev, preview URL, Cron Trigger, queue, email trigger, additional secret, additional plaintext variable, service binding or production-domain change is authorized.

Promotion is prohibited until the inactive version is directly audited and shown to have exactly the intended binding delta.

## 7. Controlled proof tenant

Only the synthetic Same-Backend tenant is authorized:

```text
TENANT_ID = 0246468a-ee84-402e-8fae-08f554daf0e1
TENANT_SLUG = scp0121_0246468aee84
REAL_TENANT_USE = prohibited
```

The proof hostname must remain non-production and under the already-audited `mrrod.com.br` Cloudflare zone. `dca01-hml.mrrod.com.br` is the intended hostname unless a direct preflight proves a collision.

## 8. Proof sequence

After both correctives are Accepted:

1. register the provider account through the canonical server/RPC boundary;
2. create the synthetic domain through the server-owned lifecycle, never direct table mutation;
3. issue ownership proof;
4. create only the required non-production DNS evidence;
5. let the Worker/scheduler lifecycle independently observe DNS;
6. provision/observe Cloudflare Custom Hostname through the canonical adapter;
7. prove SSL lifecycle and reconciliation;
8. prove active canonical authority for the synthetic tenant only;
9. prove canonical redirect behavior only if an explicit alias is created as part of the bounded proof;
10. execute teardown/removal and verify absence of orphan DNS/provider/job artifacts;
11. keep `domain_authority_control.authority_mode=legacy` and `activated_at=null` throughout; no authoritative global cutover.

## 9. FILES_ALLOWED

```text
docs/architecture/impact-analysis/DCA-01-consolidated-corrective-runtime-proof-impact-analysis.md
supabase/migrations/20260811234800_dca_01_provider_registration_corrective.sql
run-dca-01-domain-cloudflare-activation-specs.ts
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/dca-01-implementation-execution.md
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

`src/integrations/supabase/types.ts` and `src/routeTree.gen.ts` are generated drift risks and are not authorized as effective corrective changes unless the final GitHub audit proves a separate necessity. No other source/runtime file is required for the defect correction.

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

The corrective reaches `Accepted` only when all conditions hold:

- formal Impact Analysis is present and audited;
- one and only one forward corrective migration exists for the provider RPC defect;
- regression test passes;
- repository Release Gate passes at the exact corrective HEAD;
- live database function executes successfully and idempotently;
- ACL/RLS boundaries remain unchanged;
- one inactive Worker corrective version is created with exactly the authorized binding delta;
- that version is audited before promotion;
- after promotion, the synthetic domain proof completes or fails closed with an externally attributable blocker;
- real tenant remains untouched;
- no global authority cutover occurs;
- teardown leaves no orphan proof artifacts;
- documentation is reconciled to factual final state;
- BCA-01 and PR-M3 remain blocked unless separately authorized after terminal DCA-01 acceptance.

## 12. Decision

```text
IMPACT_ANALYSIS = Accepted
CORRECTIVE_EXECUTION = Authorized
CORRECTIVE_SCOPE = closed
NEW_ARCHITECTURAL_DECISION = false
NEW_RUNTIME_AUTHORITY = false
PRODUCTION_AUTHORITY = false
NEXT_ACTION = implement the database corrective and regression coverage, then audit before live application
```
