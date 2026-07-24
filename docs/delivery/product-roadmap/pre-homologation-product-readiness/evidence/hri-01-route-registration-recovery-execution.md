# HRI-01 — Route Registration Recovery Execution Evidence

## Evidence status

**Accepted — Implementation merged and post-merge Release Gate successful**

```text
REPOSITORY = MrRodBH/prime-domus-hub
FINAL_EXTERNAL_AUDIT = Accepted
HRI01_STATE = Accepted

MAIN_BASELINE = 74058f0a1ff64de4e9ad498eb14a12512f9180aa
HRI01_IMPLEMENTATION_BRANCH = agent/hri-01-generated-register-recovery
HRI01_IMPLEMENTATION_PR = 53
HRI01_IMPLEMENTATION_HEAD = a390f842db3f6f2714f3a564b70cedfa2c78248d
HRI01_IMPLEMENTATION_MERGED = true
HRI01_IMPLEMENTATION_MERGE_METHOD = squash
HRI01_IMPLEMENTATION_MERGE_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021
```

## 1. Execution authority and budget

```text
EXECUTOR = ChatGPT GitHub-native
LOVABLE_EXECUTION_AUTHORIZED = false
GNR01_STATE = Accepted
HRC01_STATE = Rejected — Terminal
HRR01_STATE = Accepted

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

The verifier and workflow final blobs match the audited baseline. Package,
lockfile, Vite configuration, TypeScript configuration, router and start entry
remain unchanged.

## 3. Official generator output

The route tree was not manually edited. GitHub Actions executed the canonical
generation path and persisted only the official generator output.

```text
ROUTE_TREE_GENERATED_BY_OFFICIAL_GENERATOR = true
MANUAL_ROUTE_TREE_EDITED = false
ROUTE_TREE_FINAL_BLOB_SHA = d71f9718f3bdab2865af5bfd7e7a152914b7758d
ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF = 0
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

## 4. Deterministic verification

```text
CYCLE_A_COMMAND = bun run build:dev
CYCLE_B_COMMAND = bun run build
CYCLE_C_COMMAND = bun run build:dev

CYCLE_A_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
CYCLE_B_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
CYCLE_C_ROUTE_TREE_SHA256 = 65268afed0024657acc9c88bd72243b7e4c5890ff78d46687ece223ec5059745
GENERATION_CYCLES_DETERMINISTIC = true
GENERATED_FUNCTIONAL_ROUTE_TOPOLOGY_SHA256 = 650b317417e8dccb9e31da2c2461a0b30e6378cb0e6d85da2ca63263ee4130b3
```

## 5. Implementation Release Gate chronology

| Run | ID | Conclusion | Factual classification |
|---|---:|---|---|
| 140 | 30111997762 | failure | technical commands completed; temporary comparator rejected generator formatting |
| 141 | 30112294625 | failure | technical commands completed; temporary evidence exporter raised `ReferenceError` |
| 142 | 30112600486 | failure | technical commands completed; temporary evidence exporter raised `ReferenceError` |
| 143 | 30112896967 | success | official generator output and hashes extracted |
| 144 | 30113268229 | success | official generated route tree persisted |
| 147 | 30113666761 | success | canonical verifier and workflow restored |
| 151 | 30114310459 | success | definitive implementation and evidence set verified |
| 154 | 30114663053 | success | definitive PR head verified |

Runs 140–142 remain failed experimental evidence-helper runs and do not
establish acceptance. The definitive PR-head gate completed successfully before
the protected merge.

## 6. Protected merge and post-merge gate

```text
HRI01_IMPLEMENTATION_PR = 53
HRI01_IMPLEMENTATION_HEAD = a390f842db3f6f2714f3a564b70cedfa2c78248d
HRI01_IMPLEMENTATION_MERGED = true
HRI01_IMPLEMENTATION_MERGE_METHOD = squash
HRI01_IMPLEMENTATION_MERGE_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021

HRI01_POST_MERGE_RELEASE_GATE_RUN_ID = 30116233612
HRI01_POST_MERGE_RELEASE_GATE_EVENT = push
HRI01_POST_MERGE_RELEASE_GATE_BRANCH = main
HRI01_POST_MERGE_RELEASE_GATE_HEAD_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021
HRI01_POST_MERGE_RELEASE_GATE_STATUS = completed
HRI01_POST_MERGE_RELEASE_GATE_RESULT = success
HRI01_POST_MERGE_RELEASE_GATE_JOB_ID = 89557473837

CHECKOUT = success
SETUP_BUN = success
FROZEN_INSTALL = success
VERIFY_RELEASE = success
EVIDENCE_UPLOAD = success
```

The post-merge run checked out the exact `main` SHA. Its artifact is:

```text
ARTIFACT_ID = 8605584800
ARTIFACT_NAME = release-gate-91d63bc5ed18540fc122301150a996ed0fe51021
ARTIFACT_DIGEST = sha256:d14390afbcadf25041d14dd29bb25611a37b48926e38d59d38807da5ba380bb3
```

## 7. Final scope

```text
IMPLEMENTATION_FILES_CHANGED = 5
IMPLEMENTATION_FILES_OUTSIDE_ALLOWED = 0
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
UNEXPECTED_FILE_CHANGE_COUNT = 0
```

## 8. Final disposition

```text
HRI01_STATE = Accepted
HRI01_ACCEPTED = true
HRI01_IMPLEMENTATION_MERGED = true

LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

This evidence closes the implementation merge facts only. It does not authorize
controlled homologation, production, LSV-03, VSP-01 or any successor stage.
