# GNR-01 — Release Gate Acceptance Evidence

## Decision

```text
GNR_01_STATE = Accepted
```

## Audited implementation

```text
Repository: MrRodBH/prime-domus-hub
Base main: ab529374bcee9db7fed81fd1128cf929b954d492
Implementation PR: #7
Implementation head tested: 7bf5479776c0d8346b8f7864f62fea91ca6ddc22
Merged main SHA: 9a9c97c549e0f6a575546abc5a9ffa0a3904078d
Executor: GitHub-native
Lovable interactions: 0
```

## Scope audit

Changed paths:

```text
.github/workflows/release-gate.yml
package.json
scripts/verify-release.mjs
src/tanstack-start-register.d.ts (removed)
vite.config.ts
```

No migration, database, Auth, Storage, RLS, grant, policy or product-feature file was changed.

## Technical result

- rejected authored TanStack Start declaration removed;
- rejected generated-route-tree rewriting plugin removed;
- duplicate static assertions removed from Vite runtime configuration;
- generated route-tree augmentation restored as the single Register authority;
- Bun pinned to `1.3.14` in package and CI;
- canonical typecheck and release verification scripts added;
- release workflow executes frozen dependency installation and deterministic verification.

## Executed GitHub evidence

Workflow:

```text
Name: Release Gate
Run ID: 29782421703
Job ID: 88486479374
Job: Typecheck, build and deterministic route generation
Conclusion: success
```

Successful steps:

```text
Checkout = success
Setup Bun = success
Install dependencies = success
Verify release gate = success
Complete job = success
```

The verifier fails closed unless all of the following complete successfully:

- development build;
- production build;
- repeated development build;
- typecheck after generated cycles;
- exactly one generated `@tanstack/react-start` Register authority;
- absence of the authored rejected declaration;
- stable SHA-256 digest across generated cycles;
- lead authorization unit specifications;
- lead structural specifications.

## Acceptance fields

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CI_REQUIRED_CHECKS_GREEN = true
REJECTED_STRATEGY_B_PRESENT = false
GNR01_PRINCIPAL_PR_CONSUMED = true
GNR01_CORRECTIVE_PR_CONSUMED = false
GNR01_REMAINING_CORRECTIVE_BUDGET = 1
NEXT_STAGE_AUTHORIZED = PTH-01
```
