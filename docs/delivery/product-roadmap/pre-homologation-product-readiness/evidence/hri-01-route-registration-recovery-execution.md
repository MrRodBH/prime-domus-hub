# HRI-01 — Route Registration Recovery Execution Evidence

## Evidence status

**Implementation evidence complete — Final Release Gate Pending**

```text
REPOSITORY = MrRodBH/prime-domus-hub
MAIN_BASELINE = 74058f0a1ff64de4e9ad498eb14a12512f9180aa
BRANCH = agent/hri-01-generated-register-recovery
AUDITED_IMPLEMENTATION_HEAD = 7b3c12005a154f4f24d4d8d3ee562c83ff6fe836
PR_NUMBER = 53
MERGE_EXECUTED = false
MAIN_CHANGED = false
```

## 1. Execution authority

```text
EXECUTOR = ChatGPT GitHub-native
LOVABLE_EXECUTION_AUTHORIZED = false
GNR01_STATE = Accepted
HRC01_STATE = Rejected — Terminal
HRR01_STATE = Accepted
```

```text
HRI01_PRINCIPAL_PROMPT_CONSUMED = true
HRI01_CORRECTIVE_PROMPT_CONSUMED = false
HRI01_REMAINING_PROMPT_BUDGET = 1/2
HRC01_BUDGET_CLASSIFICATION = historical terminal predecessor state
HRC01_BUDGET_CHANGED_DURING_HRI01 = false
```

## 2. Baseline integrity

```text
PACKAGE_JSON_BLOB_SHA = b5968ce52fe060f4a275dbe76d8ab2e68516c1db
BUN_LOCK_BLOB_SHA = 098eac32e22b587197565fb454706bf024769840
ROUTE_TREE_BASELINE_BLOB_SHA = 07e280d3d005e807e32088008991312d7c2754d0
VITE_CONFIG_BLOB_SHA = 9b1f2bd0e3943d47cd2f4e8a7dc845f6e65b11a0
TSCONFIG_BLOB_SHA = 533d40171d4cbc61370abbffca39ba9256ad5927
ROUTER_TSX_BLOB_SHA = 8b0405c4f54b96d0fdd2c454186e5289e74dc4bc
START_TS_BLOB_SHA = a204b1389f283e8888206b8f969d96cd629cab82
VERIFY_RELEASE_FINAL_BLOB_SHA = 042bd63c0c13a549f9c80aa74ba38d516f76cfb6
RELEASE_GATE_WORKFLOW_FINAL_BLOB_SHA = 52957dfb34f8ecb4925c9e6d5b5d456c41ef4709
```

The verifier and workflow final blobs match the audited `main` baseline.
`package.json`, `bun.lock`, Vite configuration, TypeScript configuration,
router and start entry remain unchanged.

## 3. Official generator output

The route tree was not manually edited. GitHub Actions checked out the audited
PR head, executed the canonical Release Gate and committed the working-tree
output only after verifying that the sole generated diff was
`src/routeTree.gen.ts`.

```text
ROUTE_TREE_GENERATED_BY_OFFICIAL_GENERATOR = true
MANUAL_ROUTE_TREE_EDITED = false
ROUTE_TREE_FINAL_BLOB_SHA = d71f9718f3bdab2865af5bfd7e7a152914b7758d
ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

Effective generated augmentation:

```ts
import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
```

## 4. Deterministic cycles

The canonical verifier executed:

```text
CYCLE_A_COMMAND = bun run build:dev
CYCLE_B_COMMAND = bun run build
CYCLE_C_COMMAND = bun run build:dev
```

Each cycle produced:

```text
CYCLE_A_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
CYCLE_B_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
CYCLE_C_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
GENERATION_CYCLES_DETERMINISTIC = true
```

The generator-produced functional topology digest observed during extraction
was stable across all three cycles:

```text
GENERATED_FUNCTIONAL_ROUTE_TOPOLOGY_SHA256 = 650b317417e8dccb9e31da2c2461a0b30e6378cb0e6d85da2ca63263ee4130b3
```

The final GitHub diff against the baseline shows only ten additions at the end
of `src/routeTree.gen.ts`, consisting exclusively of the Register augmentation.
There are no removals or changes to route declarations, paths, identifiers,
parents or child mappings.

```text
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF = 0
```

## 5. Release Gate runs

| Run | ID | Conclusion | Factual classification |
|---|---:|---|---|
| 140 | 30111997762 | failure | all technical commands completed; temporary byte-oriented topology comparator rejected generator formatting |
| 141 | 30112294625 | failure | all technical commands completed; temporary evidence exporter raised `ReferenceError` |
| 142 | 30112600486 | failure | all technical commands completed; temporary evidence exporter raised `ReferenceError` |
| 143 | 30112896967 | success | official generator output and hashes extracted |
| 144 | 30113268229 | success | official generated route tree persisted by GitHub Actions |
| 147 | 30113666761 | success | canonical verifier and workflow restored; complete Release Gate passed |

Runs 140–142 are preserved as failed experimental evidence-helper runs. They do
not establish acceptance, but their logs show that the three builds,
typechecks, route generation and repository specifications completed before the
helper-specific failure.

## 6. Successful verification result

```text
TYPECHECK_COMMAND = bun run typecheck
TYPECHECK_RESULT = success
BUILD_COMMAND = bun run build
BUILD_RESULT = success
BUILD_DEV_COMMAND = bun run build:dev
BUILD_DEV_RESULT = success
RELEASE_GATE_COMMAND = bun run verify:release
RELEASE_GATE_RESULT = success
```

The successful canonical run reported:

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
```

Additional regression evidence:

```text
LEAD_AUTHORIZATION = passed 22 / failed 0
LEAD_RUNTIME_OPERATIONS = passed 15 / failed 0
LEAD_STRUCTURAL = passed 27 / failed 0
LEAD_SQL_STRUCTURAL = passed 17 / failed 0
PUBLIC_TENANT_CONTEXT_SPECS = passed
PUBLIC_TENANT_READ_BINDING_SPECS = passed
PUBLIC_SETTINGS_CAMPAIGN_RECOVERY_SPECS = passed
PUBLIC_PAGE_RUNTIME_SPECS = passed
PUBLIC_TENANT_WRITER_AUTHORITY_SPECS = passed
PUBLIC_TENANT_WRITER_SQL_STRUCTURAL_SPECS = passed
PUBLIC_SURFACE_SECURITY_SPECS = passed
PUBLIC_SURFACE_TENANT_READ_SPECS = passed
```

## 7. Final scope before final evidence gate

```text
PACKAGE_JSON_DIFF = 0
BUN_LOCK_DIFF = 0
VITE_CONFIG_DIFF = 0
TSCONFIG_DIFF = 0
ROUTER_TSX_DIFF = 0
START_TS_DIFF = 0
VERIFY_RELEASE_DIFF = 0
RELEASE_GATE_WORKFLOW_DIFF = 0
AUTHORED_DECLARATION_DIFF = 0
SUPABASE_DIFF = 0
DATABASE_DIFF = 0
```

Expected definitive files:

```text
docs/architecture/impact-analysis/HRI-01-homologation-readiness-implementation-impact-analysis.md
docs/architecture/governance/HRI-01-roadmap-reconciliation.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hri-01-route-registration-recovery-execution.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hri-01-route-registration-recovery-execution.json
src/routeTree.gen.ts
```

## 8. Disposition

```text
HRI01_STATE = Implementation Complete — Final Release Gate Pending
HRI01_ACCEPTED = false
MERGE_EXECUTED = false
MAIN_CHANGED = false
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
```

The branch must stop for direct external GitHub audit after the final Release
Gate succeeds on the definitive evidence commit.
