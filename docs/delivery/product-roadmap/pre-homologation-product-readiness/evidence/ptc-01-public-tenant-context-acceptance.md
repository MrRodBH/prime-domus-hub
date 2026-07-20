# PTC-01 — Public Tenant Context Foundation Acceptance

## Decision

```text
PTC_01_STATE = Accepted
```

## Audited implementation

```text
Repository: MrRodBH/prime-domus-hub
Base main: 2da4efc0ed1804ca51826f8f5264bc2e0ab0d2d6
Implementation PR: #18
Implementation head tested: 59376ec1054af871dbbc91e2eb3a20091c734a64
Merged main SHA: a462c7f4632d917dd76e2ab3e071fd8d11399a4e
Executor: GitHub-native direct file edits
Lovable interactions: 0
```

## Scope audit

Changed paths:

```text
src/lib/tenant.server.ts
src/lib/__tests__/public-tenant-context.spec.ts
run-public-tenant-context-specs.ts
package.json
scripts/verify-release.mjs
```

No lockfile, dependency version, database, migration, RLS, grant, policy, Auth, Storage or public consumer file changed.

## Accepted technical result

- implicit `rm-prime` fallback authority removed;
- Host normalization is strict and preserves `www` as an explicit alias decision;
- absent, malformed and multi-valued Host input fails closed;
- localhost and Lovable preview hosts require explicit `PUBLIC_TENANT_DEV_HOST_MAP` mapping;
- production resolution uses exact `tenants.dominio_principal` equality;
- development resolution uses an explicit tenant slug from validated configuration;
- tenant row cardinality reads at most two rows and accepts exactly one;
- request Host is obtained through the TanStack server request API;
- public read and writer consumers remain outside this foundation stage.

## Executed GitHub evidence

```text
Workflow: Release Gate
Run ID: 29785037101
Job ID: 88494602557
Conclusion: success
```

Successful fail-closed gate steps:

```text
Checkout = success
Setup Bun = success
Install dependencies = success
Verify release gate = success
Complete job = success
```

The release verifier executed:

- development build;
- typecheck;
- production build;
- repeated development build;
- generated Register authority and route-tree digest checks;
- lead authorization specifications;
- lead structural specifications;
- PTC-01 public tenant context specifications.

## Acceptance fields

```text
FALLBACK_TENANT_AUTHORITY = false
REQUEST_HOST_DERIVED_SERVER_SIDE = true
HOST_NORMALIZATION_DETERMINISTIC = true
UNKNOWN_HOST_FAILS_CLOSED = true
ABSENT_HOST_FAILS_CLOSED = true
AMBIGUOUS_HOST_FAILS_CLOSED = true
DEVELOPMENT_HOST_MAPPING_EXPLICIT_ONLY = true
CLIENT_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
PTC01_PRINCIPAL_PR_CONSUMED = true
PTC01_CORRECTIVE_PR_CONSUMED = false
PTC01_REMAINING_CORRECTIVE_BUDGET = 1
NEXT_STAGE_AUTHORIZED = PTR-01
```
