# PTR-01 — Public Tenant Read Binding Acceptance

## Decision

```text
PTR_01_STATE = Accepted
```

## Audited implementation

```text
Repository: MrRodBH/prime-domus-hub
Implementation PR: #22
Principal head tested: b36381b74344ffc65d368cb8af63cd44d86caec3
Corrective head tested: c27b09f99ca10720b47b90daced07e4f1b45ef09
Merged main SHA: a746e58bc2c48f0e20ddee62571c16ace809bbd8
Executor: GitHub-native direct file edits
Lovable interactions: 0
```

## Scope audit

Runtime changes were limited to:

```text
src/lib/tenant.server.ts
src/lib/api/site.functions.ts
src/lib/api/meta.functions.ts
src/lib/api/pages.functions.ts
src/lib/api/campaigns.functions.ts
```

Evidence/test changes:

```text
src/lib/__tests__/public-tenant-read-binding.spec.ts
run-public-tenant-read-binding-specs.ts
package.json
scripts/verify-release.mjs
```

No migration, RLS, grant, policy, Auth, Storage, cron or dependency change was introduced.

## Accepted behavior

- unresolved PTC-01 Host authority throws before the canonical reads execute;
- public site settings use explicit `tenant_id = resolved tenant`;
- public Meta pixel settings use explicit tenant equality before key lookup;
- published CMS page lookup accepts strict slug input only and combines it with server tenant equality;
- active campaign listing accepts strict empty input only and uses server tenant equality;
- public read query errors fail closed instead of returning empty-success data;
- the campaign event writer remains unchanged and is explicitly deferred to PTW-01.

## Workflow evidence

Principal Release Gate:

```text
Run ID: 29786394077
Job ID: 88498801855
Conclusion: failure
Cause: the structural test sliced the writer at its export but required an ownership comment located before that boundary.
Implementation defect proven: false
Test defect proven: true
```

Consolidated corrective:

```text
Run ID: 29786681893
Job ID: 88499607726
Conclusion: success
Checkout = success
Setup Bun = success
Install dependencies = success
Verify release gate = success
Complete job = success
```

The corrective changed only the ownership-comment assertion and did not alter runtime implementation.

## Acceptance fields

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_META_PIXEL_TENANT_BOUND = true
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_PUBLIC_READS = false
UNKNOWN_CLIENT_TENANT_FIELDS_REJECTED = true
GLOBAL_SLUG_AMBIGUITY_FAILS_CLOSED = true
UNKNOWN_HOST_PUBLIC_READ_DENIAL = true
CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
PTR01_PRINCIPAL_PR_CONSUMED = true
PTR01_CORRECTIVE_PR_CONSUMED = true
PTR01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
NEXT_STAGE_AUTHORIZED = PTW-01
```
