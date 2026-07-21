# PSC-01 — Public Settings & Campaign Read Recovery — Acceptance

## Decision

```text
PSC_01_STATE = Accepted
```

## Audited implementation

```text
Repository: MrRodBH/prime-domus-hub
Planning baseline: 706283dfacb189049ccf59ec78fe40f506c5bf11
Implementation PR: #29
Implementation head tested: 60522eeddc3a6ab75fc6375065a0982437c6a922
Merged main SHA: e5032890c7cc44dd03990d4e462ec3b3bb723be0
Executor: GitHub-native direct file edits
Lovable interactions: 0
```

## Scope audit

Exactly 12 files changed, all within the accepted PSC-01 `FILES_ALLOWED`:

```text
.github/workflows/release-gate.yml
package.json
run-public-settings-campaign-read-recovery-specs.ts
scripts/verify-release.mjs
src/lib/api/campaigns.functions.ts
src/lib/api/meta.functions.ts
src/lib/api/site.functions.ts
src/lib/public-tenant-read-guards.ts
src/lib/public-tenant-resolution-error.ts
src/lib/tenant.server.ts
src/lib/__tests__/public-settings-campaign-read-recovery.spec.ts
src/routes/__root.tsx
```

```text
FILES_OUTSIDE_ALLOWED = 0
DEPENDENCY_VERSION_CHANGE = false
LOCKFILE_CHANGE = false
DATABASE_OR_MIGRATION_CHANGE = false
RLS_GRANT_POLICY_CHANGE = false
AUTH_OR_STORAGE_CHANGE = false
PUBLIC_PAGE_CHANGE = false
PUBLIC_WRITER_BEHAVIOR_CHANGE = false
```

## Accepted technical result

- unresolved public tenant authority throws a typed error with a stable discriminator;
- root settings and Meta loads are mandatory and propagate failures;
- default RM Prime branding/meta are not returned after tenant/settings/Meta failure;
- public settings select `tenant_id`, throw on query error and execute a foreign-row response guard;
- public Meta selects `tenant_id`, throws on query error, rejects a foreign row and returns null only after a successful tenant-bound missing-row result;
- active campaigns select `tenant_id`, throw on query error and execute the same foreign-row response guard;
- `tenant_id` is removed from public DTOs;
- campaign read accepts no client tenant input;
- campaign-event writer remains unchanged and reserved for PTW-01;
- executable tests invoke the same response guards and root-loading policy used by production readers.

## Release Gate evidence

```text
Workflow: Release Gate
Run ID: 29788778515
Job ID: 88505858892
Conclusion: success
Artifact ID: 8479491312
Artifact digest: sha256:4fe4eb5dd1bf41f6f401fc83506558417937f293ae74b3f6ca69cf01715466ec
Artifact expiry: 2026-08-04T00:29:23Z
```

Verified command evidence:

```text
PTC-01 = 10 passed, 0 failed
PTR regression = 7 passed, 0 failed
PSC-01 = 11 passed, 0 failed
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_A_ROUTE_TREE_SHA256 = cce40b0d1a66716df8768468b86233e12ca896dcfb2c3e1954f912e45a1a828c
CYCLE_B_ROUTE_TREE_SHA256 = cce40b0d1a66716df8768468b86233e12ca896dcfb2c3e1954f912e45a1a828c
CYCLE_C_ROUTE_TREE_SHA256 = cce40b0d1a66716df8768468b86233e12ca896dcfb2c3e1954f912e45a1a828c
```

## Definition of Done

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_SETTINGS_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_SETTINGS_FOREIGN_ROW_DENIED = true

PUBLIC_META_TENANT_BOUND = true
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_META_FOREIGN_ROW_DENIED = true
PUBLIC_META_MISSING_ROW_RETURNS_NULL = true

PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_CAMPAIGN_READ = false
PUBLIC_CAMPAIGN_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_CAMPAIGN_FOREIGN_ROW_DENIED = true

UNKNOWN_HOST_ROOT_DENIAL = true
DEFAULT_BRANDING_AFTER_TENANT_FAILURE = false
ROOT_SETTINGS_FAILURE_PROPAGATED = true
ROOT_META_FAILURE_PROPAGATED = true

COLLECTION_RETURN_CONTRACTS_SERIALIZABLE = true
EXECUTABLE_COLLECTION_RESPONSE_GUARD = true
STRUCTURAL_ONLY_TESTS_REPORTED_AS_RUNTIME_PROOF = false
PTC01_SPECS_REMAIN_GREEN = true
PSC01_SPECS_PASSED = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

## Budget and successor

```text
PSC01_PRINCIPAL_CONSUMED = true
PSC01_CORRECTIVE_CONSUMED = false
PSC01_REMAINING_CORRECTIVE_BUDGET = 1
PSC01_FINAL_EXTERNAL_AUDIT_ACCEPTED = true
NEXT_STAGE_AUTHORIZED = PPR-01
PTW01_STARTED = false
LOVABLE_AUTHORIZED = false
```
