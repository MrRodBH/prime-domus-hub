# HRR-01 — GitHub Audit, Merge and Post-Merge Evidence

## Audit identity

```text
Repository: MrRodBH/prime-domus-hub
Audited branch: main
Audited HEAD before planning merge: bc996d084932dea3c96877d5d597d9dcc3b3afb1
Historical handoff HEAD: bc996d084932dea3c96877d5d597d9dcc3b3afb1
Planning branch: agent/hrr-01-planning-reconciliation
Planning HEAD: 21fe811ec96c5da777ae9dc3090fbf551e8c4ae0
Executor: ChatGPT GitHub-native
Lovable used: false
Audit mode: read-only before branch creation and protected merge
```

## Repository state before HRR-01

```text
DEFAULT_BRANCH = main
MAIN_ADVANCED_AFTER_HANDOFF = false
CURRENT_MAIN_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
HRC01_REJECTION_GATE = f9326691f561b958c2a4ed7230dd5bf6059a8df4
COMPARE_STATUS = ahead
AHEAD_BY = 9
BEHIND_BY = 0
MERGE_BASE = f9326691f561b958c2a4ed7230dd5bf6059a8df4
```

## HRC-01 scope violation evidence

The HRC-01 Impact Analysis recorded:

```text
src/** = prohibited
vite.config.ts = prohibited
src/routeTree.gen.ts not present in FILES_ALLOWED
```

Current commit history showed:

```text
src/routeTree.gen.ts
additions = 0
deletions = 10
change = generated Register augmentation removed
```

Result:

```text
HRC01_FILES_OUTSIDE_ALLOWED = 1
HRC01_OUTSIDE_ALLOWED_PATH = src/routeTree.gen.ts
HRC01_SCOPE_COMPLIANCE = false
HRC01_STATE = Rejected — Terminal
```

## Effective file inspection

### `vite.config.ts`

```text
blob = 9b1f2bd0e3943d47cd2f4e8a7dc845f6e65b11a0
GNR01_CONTRACT_PRESENT = true
AUTHORED_DECLARATION_PROHIBITED = true
GENERATED_FILE_REWRITER_PROHIBITED = true
```

### `src/routeTree.gen.ts`

```text
blob = 07e280d3d005e807e32088008991312d7c2754d0
ROUTE_TREE_REGISTER_FOOTER_PRESENT = false
FILE_ENDS_AFTER_ADDFILETYPES = true
```

### Authored declaration search

```text
SEARCH_TERM = tanstack-start-register
RESULT_COUNT = 0
DEDICATED_REGISTER_DECLARATION_PRESENT = false
```

### `package.json`

```text
blob = b5968ce52fe060f4a275dbe76d8ab2e68516c1db
@lovable.dev/vite-tanstack-config = 2.7.6
@tanstack/react-start = 1.168.26
packageManager = bun@1.3.14
```

## Accepted GNR-01 evidence

```text
GNR01_IMPLEMENTATION_COMMIT = 9a9c97c549e0f6a575546abc5a9ffa0a3904078d
GNR01_ACCEPTANCE_COMMIT = c021db3cf3b693887e2832d4d6736a04b0d749fc
GNR01_STATE = Accepted
REJECTED_STRATEGY_B_PRESENT_AT_ACCEPTANCE = false
GENERATED_ROUTE_TREE_MANUAL_EDIT_AT_ACCEPTANCE = false
TANSTACK_REGISTER_AUTHORITY_COUNT_AT_ACCEPTANCE = 1
STRATEGY_B_ALLOWED = false
```

GNR-01 removed the authored declaration and generated-file rewriting plugin,
and established the generated route tree as the single Register authority.

## HRR-01 planning branch audit

```text
EXPECTED_MAIN_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
ACTUAL_MAIN_HEAD_BEFORE_MERGE = bc996d084932dea3c96877d5d597d9dcc3b3afb1
EXPECTED_PLANNING_HEAD = 21fe811ec96c5da777ae9dc3090fbf551e8c4ae0
ACTUAL_PLANNING_HEAD = 21fe811ec96c5da777ae9dc3090fbf551e8c4ae0
MAIN_HEAD_MATCHED = true
PLANNING_HEAD_MATCHED = true
ANCESTRY_VERIFIED = true
PLANNING_AHEAD_BY = 6
PLANNING_BEHIND_BY = 0
FINAL_DIFF_FILES = 5
FILES_OUTSIDE_ALLOWED = 0
SRC_DIFF = 0
ROUTE_TREE_DIFF = 0
VITE_CONFIG_DIFF = 0
PACKAGE_JSON_DIFF = 0
BUN_LOCK_DIFF = 0
WORKFLOW_DIFF = 0
SUPABASE_DIFF = 0
```

Authorized planning paths:

```text
docs/architecture/impact-analysis/HRR-01-homologation-readiness-recovery-route-registration-reconciliation-impact-analysis.md
docs/architecture/governance/HRC-01-roadmap-reconciliation.md
docs/architecture/governance/HRC-01-terminal-rejection-record.md
docs/architecture/governance/HRR-01-roadmap-reconciliation.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hrr-01-read-only-audit.md
```

## Protected planning merge

```text
PR_NUMBER = 50
PR_BASE = main
PR_HEAD = agent/hrr-01-planning-reconciliation
PR_HEAD_SHA = 21fe811ec96c5da777ae9dc3090fbf551e8c4ae0
EXPECTED_HEAD_PROTECTION_USED = true
MERGE_METHOD = squash
PLANNING_MERGE_HEAD = 3f3bf60193f6294e629b4547a2d7875b2a7e9722
PR_MERGED = true
```

The five files on merged `main` were compared with the planning branch and had
identical blob SHAs. No planning content was lost or altered by the squash
merge.

## Manual operations not executed

```text
MANUAL_ROUTE_GENERATION_EXECUTED = false
MANUAL_TYPECHECK_EXECUTED = false
MANUAL_BUILD_EXECUTED = false
MANUAL_BUILD_DEV_EXECUTED = false
MANUAL_VITE_DEV_EXECUTED = false
MIGRATION_EXECUTED = false
DATABASE_MUTATION_EXECUTED = false
AUTH_MUTATION_EXECUTED = false
STORAGE_MUTATION_EXECUTED = false
CRON_MUTATION_EXECUTED = false
QUEUE_MUTATION_EXECUTED = false
WEBHOOK_EXECUTED = false
EMAIL_EXECUTED = false
FORCE_PUSH_EXECUTED = false
RESET_EXECUTED = false
HISTORY_REWRITE_EXECUTED = false
```

## Automatic GitHub Release Gate

Opening protected PRs against `main` triggered the repository's existing
`Release Gate` workflow automatically. This was not a manually invoked command
and did not change product runtime files.

```text
AUTOMATIC_RELEASE_GATE_TRIGGERED_BY_PR = true
PR50_RELEASE_GATE_RUN_ID = 30110425395
PR50_RELEASE_GATE_STATUS = completed
PR50_RELEASE_GATE_CONCLUSION = success
PR51_RELEASE_GATE_RUN_ID = 30110604498
PR51_RELEASE_GATE_STATUS_AT_AUDIT = in_progress
```

The automatic workflow may execute the repository's canonical verification
sequence, including build, typecheck and deterministic route-generation checks.
This CI activity is classified separately from manual HRR-01 execution.

## Final HRR-01 disposition

```text
HRC01_STATE = Rejected — Terminal
HRR01_STATE = Accepted
HRR01_PLANNING_STATE = Accepted
HRR01_PLANNING_MERGED = true
HRR01_PRINCIPAL_PROMPT_CONSUMED = true
HRR01_CORRECTIVE_PROMPT_CONSUMED = false
HRR01_REMAINING_PROMPT_BUDGET = 1/2
GNR01_STATE = Accepted
STRATEGY_B_ALLOWED = false
HRI01_STATE = Planned — Not Authorized
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
```

No later stage is authorized by this evidence.
