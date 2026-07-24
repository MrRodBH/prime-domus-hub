# HRR-01 — Read-Only GitHub Audit Evidence

## Audit identity

```text
Repository: MrRodBH/prime-domus-hub
Audited branch: main
Audited HEAD: bc996d084932dea3c96877d5d597d9dcc3b3afb1
Historical handoff HEAD: bc996d084932dea3c96877d5d597d9dcc3b3afb1
Planning branch: agent/hrr-01-planning-reconciliation
Executor: ChatGPT GitHub-native
Lovable used: false
Audit mode: read-only before branch creation
```

## Repository state

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

## Changed paths between rejection gate and current main

```text
bun.lock
package.json
docs/architecture/governance/DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md
docs/architecture/governance/HRC-01-roadmap-reconciliation.md
docs/architecture/governance/HVP-01-roadmap-reconciliation.md
docs/architecture/impact-analysis/HRC-01-homologation-readiness-closure-impact-analysis.md
docs/architecture/impact-analysis/HVP-01-homologation-validation-preflight-impact-analysis.md
src/routeTree.gen.ts
```

## Scope violation evidence

The HRC-01 Impact Analysis recorded:

```text
src/** = prohibited
vite.config.ts = prohibited
src/routeTree.gen.ts not present in FILES_ALLOWED
```

Current commit history shows:

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

### authored declaration search

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

### registration type dependencies

```text
src/router.tsx blob = 8b0405c4f54b96d0fdd2c454186e5289e74dc4bc
src/start.ts blob = a204b1389f283e8888206b8f969d96cd629cab82
```

## Accepted GNR-01 historical evidence

```text
GNR01_IMPLEMENTATION_COMMIT = 9a9c97c549e0f6a575546abc5a9ffa0a3904078d
GNR01_ACCEPTANCE_COMMIT = c021db3cf3b693887e2832d4d6736a04b0d749fc
GNR01_STATE = Accepted
REJECTED_STRATEGY_B_PRESENT_AT_ACCEPTANCE = false
GENERATED_ROUTE_TREE_MANUAL_EDIT_AT_ACCEPTANCE = false
TANSTACK_REGISTER_AUTHORITY_COUNT_AT_ACCEPTANCE = 1
```

GNR-01 removed the authored declaration and the generated-file rewriting
plugin, and established the generated route tree as the single Register
authority.

## Operations not executed

```text
ROUTE_GENERATION_EXECUTED = false
TYPECHECK_EXECUTED = false
BUILD_EXECUTED = false
BUILD_DEV_EXECUTED = false
VITE_DEV_EXECUTED = false
MIGRATION_EXECUTED = false
DATABASE_MUTATION_EXECUTED = false
AUTH_MUTATION_EXECUTED = false
STORAGE_MUTATION_EXECUTED = false
CRON_MUTATION_EXECUTED = false
QUEUE_MUTATION_EXECUTED = false
WEBHOOK_EXECUTED = false
EMAIL_EXECUTED = false
MAIN_MOVED = false
```

## HRR-01 result submitted for audit

```text
HRC01_STATE = Rejected — Terminal
HRR01_STATE = Planning — Ready for Direct External Audit
HRR01_PRINCIPAL_PROMPT_CONSUMED = true
HRR01_CORRECTIVE_PROMPT_CONSUMED = false
HRR01_REMAINING_PROMPT_BUDGET = 1/2
HRI01_STATE = Planned — Not Authorized
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

This evidence does not declare HRR-01 accepted and does not authorize merge.