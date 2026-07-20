# PTR-01 — Public Tenant Read Binding — Terminal Rejection

## Decision

```text
PTR_01_STATE = Rejected
PTR_01_TERMINAL = true
```

## Audited baseline

```text
Repository: MrRodBH/prime-domus-hub
Main runtime baseline: 9c93b9c8b7b095e2a07e424ed895f529d5e4b4fc
Implementation PR: #21
Implementation branch: agent/ptr-01-public-read-binding
Executor: GitHub-native direct file edits
Lovable interactions: 0
```

## Principal attempt

```text
Tested head: 6f57c87a14ce3b35cac8713b46f281f8a736aef5
Workflow run: 29786244606
Job: 88498300379
Conclusion: failure
Complete log artifact: not yet present
```

The principal Release Gate failed. The connector exposed the terminal job status but truncated the output before the failing command, so no unsupported root-cause claim was made.

## Consolidated corrective

```text
Corrective head: 2d66ffb731ca7a6faa57d9ccca3abb25b9130cc2
Workflow run: 29786580653
Job: 88499305470
Conclusion: failure
Artifact ID: 8478684816
Artifact digest: sha256:fba80df57e7a5e2e650b41390a40e235b689e8bc975a949115b23d2924be75f0
Artifact expiry: 2026-08-03T23:15:33Z
```

The corrective persisted the complete Release Gate output with `pipefail` and an always-uploaded workflow artifact.

## Proven command result

```text
Cycle A development build = success
TanStack Register authority count = 1
Generated route tree digest = cce40b0d1a66716df8768468b86233e12ca896dcfb2c3e1954f912e45a1a828c
Cycle A typecheck = failure
Remaining gate commands = not reached
```

Blocking TypeScript evidence:

```text
src/lib/api/pages.functions.ts(147,12): TS2345
Omit<PublicPageRow, "tenant_id"> is not assignable to the
TanStack serializable server-function return contract because
PublicPageRow.blocks was typed as unknown.

src/routes/p.$slug.tsx(56,24): TS2339
Property 'blocks' does not exist on inferred type '{}'.
```

## Scope audit

- PR `#21` was closed unmerged.
- No PTR-01 application code, workflow change, dependency change or test reached `main`.
- No database, migration, RLS, grant, policy, Auth or Storage change was made.
- Rejected branch artifacts are historical evidence only and are not accepted or auto-transferred.

## Governance result

```text
PTR01_PRINCIPAL_CONSUMED = true
PTR01_CORRECTIVE_CONSUMED = true
PTR01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTR01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false
PTR01_THIRD_ATTEMPT_AUTHORIZED = false
PTR01_BUDGET_REOPENING_AUTHORIZED = false
PTR01_CODE_MERGED_TO_MAIN = false
```

The material release blocker remains. Continuation is allowed only through explicit scope reduction into:

```text
PSC-01 — Public Settings & Campaign Read Binding
  → PPR-01 — Public Page Serializable Read Binding
  → PTW-01
```

The decomposition separates collection reads from the page-specific serializable DTO contract. It does not reopen PTR-01.

```text
NEXT_STAGE_AUTHORIZED = PSC-01
BROAD_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
