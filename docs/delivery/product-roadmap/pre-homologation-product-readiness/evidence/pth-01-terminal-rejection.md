# PTH-01 — Terminal Rejection Evidence

## Decision

```text
PTH_01_STATE = Rejected
PTH_01_TERMINAL = true
```

## Audited baseline

```text
Repository: MrRodBH/prime-domus-hub
Main runtime baseline: c021db3cf3b693887e2832d4d6736a04b0d749fc
Implementation PR: #9
Implementation branch: agent/pth-01-public-tenant
Executor: GitHub-native broad codemod workflow
Lovable interactions: 0
```

## Principal attempt

```text
Workflow run: 29783823263
Job: 88490857332
Conclusion: failure
Failed step: Apply deterministic fail-closed codemod
Implementation commit produced: false
```

The principal failed closed because an exact source signature expected by the broad repository codemod diverged from the current source. The commit step was skipped.

## Consolidated corrective

```text
Workflow run: 29784077156
Job: 88491663735
Conclusion: failure
Failed step: Apply consolidated matcher correction
Codemod step executed: false
Implementation commit produced: false
```

The corrective failed before codemod execution because the preparatory matcher text occurred more than once while the correction required exactly one occurrence. The commit step was skipped.

## Scope audit

- PR `#9` was closed unmerged.
- No PTH-01 runtime implementation reached `main`.
- No migration, SQL, RLS, grant, policy, Auth, Storage or application-code change from PTH-01 was merged.
- Branch-only codemod/workflow artifacts are rejected historical evidence and are not accepted deliverables.

## Governance result

```text
PTH01_PRINCIPAL_CONSUMED = true
PTH01_CORRECTIVE_CONSUMED = true
PTH01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTH01_THIRD_ATTEMPT_AUTHORIZED = false
PTH01_BUDGET_REOPENING_AUTHORIZED = false
PTH01_REJECTED_BRANCH_ARTIFACTS_TRANSFERABLE = false
```

The public-tenant requirement remains release-blocking. Continuation is permitted only after:

1. formal scope reduction into independent outcomes;
2. replacement of the broad codemod mechanism with direct, reviewable file edits;
3. independent budgets and acceptance criteria for the reduced stages.

## Authorized reduced sequence

```text
PTC-01 — Public Tenant Context Foundation
  → PTR-01 — Public Tenant Read Binding
  → PTW-01 — Public Tenant Writer Authority
  → PSG-01
```

```text
NEXT_STAGE_AUTHORIZED = PTC-01
BROAD_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
