# HRI-01 — Homologation Readiness Implementation Impact Analysis

## Status

**Execution Envelope frozen — Gate A accepted; Gate B authorized under fail-closed controls**

```text
STAGE_ID = HRI-01
STAGE_NAME = Homologation Readiness Implementation — Generated Register Authority Recovery & Deterministic Release Proof
EXECUTOR = ChatGPT GitHub-native
LOVABLE_EXECUTION_AUTHORIZED = false
HRI01_PRINCIPAL_PROMPT_CONSUMED = true
HRI01_CORRECTIVE_PROMPT_CONSUMED = false
HRI01_REMAINING_PROMPT_BUDGET = 1/2
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

## 1. Audited baseline

```text
CURRENT_MAIN_HEAD = 74058f0a1ff64de4e9ad498eb14a12512f9180aa
BRANCH = agent/hri-01-generated-register-recovery
BRANCH_BASE_SHA = 74058f0a1ff64de4e9ad498eb14a12512f9180aa
BRANCH_IS_DESCENDANT_OF_BASE = true
MAIN_CHANGED_DURING_BRANCH_CREATION = false

PACKAGE_JSON_BLOB_SHA = b5968ce52fe060f4a275dbe76d8ab2e68516c1db
BUN_LOCK_BLOB_SHA = 098eac32e22b587197565fb454706bf024769840
ROUTE_TREE_BLOB_SHA = 07e280d3d005e807e32088008991312d7c2754d0
VITE_CONFIG_BLOB_SHA = 9b1f2bd0e3943d47cd2f4e8a7dc845f6e65b11a0
TSCONFIG_BLOB_SHA = 533d40171d4cbc61370abbffca39ba9256ad5927
ROUTER_TSX_BLOB_SHA = 8b0405c4f54b96d0fdd2c454186e5289e74dc4bc
START_TS_BLOB_SHA = a204b1389f283e8888206b8f969d96cd629cab82
VERIFY_RELEASE_BLOB_SHA = 042bd63c0c13a549f9c80aa74ba38d516f76cfb6
RELEASE_GATE_WORKFLOW_BLOB_SHA = 52957dfb34f8ecb4925c9e6d5b5d456c41ef4709

BUN_VERSION = 1.3.14
TANSTACK_START_VERSION = 1.168.26
TANSTACK_ROUTER_PLUGIN_DECLARED_VERSION = ^1.168.18
LOVABLE_TANSTACK_VITE_CONFIG_VERSION = 2.7.6
VITE_DECLARED_VERSION = ^7.3.1
FROZEN_LOCKFILE_INSTALL = true
```

The current committed `src/routeTree.gen.ts` ends after
`._addFileTypes<FileRouteTypes>()` and contains no generated TanStack Start
Register augmentation. No repository result exists for
`src/tanstack-start-register.d.ts`.

## 2. Predecessor and architecture authority

```text
HRC01_STATE = Rejected — Terminal
HRR01_STATE = Accepted
GNR01_STATE = Accepted
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
REGISTER_AUTHORITY_REQUIRED_COUNT = 1
AUTHORED_REGISTER_DECLARATION_REQUIRED_COUNT = 0
GENERATED_FILE_REWRITER_REQUIRED_COUNT = 0
STRATEGY_B_ALLOWED = false
```

HRI-01 does not reopen HRC-01, LSR-01, LSR-02 or any earlier terminal stage.
The only accepted recovery path is the output emitted by the official
TanStack/Vite generation path already configured by
`@lovable.dev/vite-tanstack-config`.

## 3. Canonical commands

The repository contains no independent authored route-generation command.
Route generation is performed by the official Vite/TanStack build path.

```text
OFFICIAL_ROUTE_GENERATION_COMMAND_A = bun run build:dev
OFFICIAL_ROUTE_GENERATION_COMMAND_B = bun run build
TYPECHECK_COMMAND = bun run typecheck
BUILD_COMMAND = bun run build
BUILD_DEV_COMMAND = bun run build:dev
RELEASE_GATE_COMMAND = bun run verify:release
RELEASE_GATE_WORKFLOW = .github/workflows/release-gate.yml
```

The release verifier already executes three generator cycles:

```text
CYCLE_A = bun run build:dev
CYCLE_B = bun run build
CYCLE_C = bun run build:dev
```

It fails closed unless exactly one generated Register authority exists, the
rejected authored declaration is absent and all generated route-tree SHA-256
digests are identical.

## 4. Expected diff

```text
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF = 0
EXPECTED_GENERATED_DIFF = official generator-produced Register augmentation only
PACKAGE_JSON_DIFF = 0
BUN_LOCK_DIFF = 0
VITE_CONFIG_DIFF = 0
TSCONFIG_DIFF = 0
ROUTER_TSX_DIFF = 0
START_TS_DIFF = 0
AUTHORED_DECLARATION_DIFF = 0
```

## 5. Evidence extraction finding

The existing Release Gate uploads only `release-gate.log`. It proves hashes and
counts but does not persist the generated `src/routeTree.gen.ts` bytes needed to
commit the official generator output without manual editing.

A temporary evidence-only modification to `scripts/verify-release.mjs` is
therefore authorized to print:

```text
GENERATED_ROUTE_TREE_BASE64
GENERATED_ROUTE_TREE_SHA256
FUNCTIONAL_ROUTE_TOPOLOGY_SHA256
```

The export is produced only after all existing fail-closed checks pass. The
exporter must be removed and `scripts/verify-release.mjs` restored byte-for-byte
to baseline before the final branch audit.

```text
TEMPORARY_VERIFY_RELEASE_CHANGE_REQUIRED = true
FINAL_VERIFY_RELEASE_DIFF_REQUIRED = 0
RELEASE_GATE_WORKFLOW_DIFF_REQUIRED = 0
```

## 6. FILES_ALLOWED

```text
FILES_ALLOWED = [
  "docs/architecture/impact-analysis/HRI-01-homologation-readiness-implementation-impact-analysis.md",
  "docs/architecture/governance/HRI-01-roadmap-reconciliation.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hri-01-route-registration-recovery-execution.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hri-01-route-registration-recovery-execution.json",
  "src/routeTree.gen.ts"
]

FILES_CONDITIONALLY_ALLOWED = [
  "scripts/verify-release.mjs",
  ".github/workflows/release-gate.yml"
]
```

`src/routeTree.gen.ts` is a generated transient artifact. Manual editing,
copying a historical footer, post-processing or regex injection is prohibited.
Its accepted final content must be recovered from the GitHub Actions artifact
produced by the official generator.

## 7. FILES_PROHIBITED

```text
vite.config.ts
package.json
bun.lock
tsconfig.json
src/router.tsx
src/start.ts
src/tanstack-start-register.d.ts
supabase/**
migrations/**
database/**
all other paths not explicitly authorized
```

## 8. COMMANDS_ALLOWED

```text
bun install --frozen-lockfile
bun run build:dev
bun run build
bun run typecheck
bun run verify:release
GitHub Release Gate triggered by pull_request
read-only hashing, comparison and artifact extraction
```

## 9. COMMANDS_PROHIBITED

```text
vite dev
manual route-tree editing
manual footer insertion
historical footer copy
post-generation rewrite
fallback Register declaration
migration
DDL
DML
RLS
grants
policies
Auth mutation
Storage mutation
cron
queues
webhooks
email
controlled homologation
production
```

## 10. Fail-closed conditions

```text
CURRENT_MAIN_HEAD != BRANCH_BASE_SHA
GENERATED_REGISTER_AUTHORITY_COUNT != 1
AUTHORED_REGISTER_DECLARATION_COUNT != 0
GENERATED_FILE_REWRITER_COUNT != 0
STRATEGY_B_REACTIVATED = true
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF != 0
PACKAGE_JSON_DIFF != 0
BUN_LOCK_DIFF != 0
VITE_CONFIG_DIFF != 0
EXCLUDED_FILE_DIFF != 0
UNEXPECTED_FILE_CHANGE_COUNT != 0
GENERATION_CYCLES_DETERMINISTIC = false
TYPECHECK_RESULT != success
BUILD_RESULT != success
BUILD_DEV_RESULT != success
RELEASE_GATE_RESULT != success
```

Any condition terminates Gate B without fallback and without merge.

## 11. Gate decision

```text
GATE_A_RESULT = Accepted
EXECUTION_ENVELOPE_FROZEN = true
EXCLUDED_PATH_CHANGE_REQUIRED = false
PACKAGE_OR_LOCK_DRIFT = false
GATE_B_AUTHORIZED = true
```

Gate B is authorized only for repository-level generation and proof. No live
application execution, controlled homologation, production or successor stage
is authorized.

## 12. Definition of Done

HRI-01 may be submitted for direct external audit only when the official
GitHub Actions generator output is committed without manual mutation, all
three generation cycles are deterministic, the functional route topology is
unchanged, all protected files remain identical to baseline, the Release Gate
is successful, complete evidence is persisted, the PR remains unmerged and
`main` remains unchanged.
