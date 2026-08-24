# PR-M3-FVS1 — Frontend Shell Evidence

## Authority

```text
GATE=PR-M3-FVS1
PRIORITY=0
SOURCE_PR=115
TRACKING_ISSUE=117
EXPECTED_MAIN_HEAD=e9edb214fa43317924e89ddaf019184b32e1c3b7
EXPECTED_MAIN_TREE=912bd370160cb64d580a0a1b1edcc9c9fbd8fe08
DEFERRED_BCR_BACKLOG=116
```

The implementation starts from the exact terminal PRM3-P0A authority. The
existing authenticated `WorkspaceShell` remains the single application shell;
no parallel shell, route hierarchy or client-side authority path is introduced.

## Frozen scope

The eleven-path allowlist is frozen in issue #117 and enforced by
`run-pr-m3-fvs1-frontend-shell-specs.ts`. `bun.lock`, runtime dependencies,
development dependencies, server APIs, provider adapters and migrations remain
byte-for-byte outside this change.

The vertical slice contains:

1. semantic workspace surfaces, focus, state and content-width tokens;
2. a mobile-safe single shell with named landmarks and a skip link;
3. current-page semantics for desktop and mobile navigation;
4. deterministic `loading`, `empty`, `denied`, `unavailable` and `error` state
   contracts;
5. server-read-derived loading, empty and error states in the authenticated
   dashboard;
6. no debug switch or simulated denied/unavailable decision.

## Acceptance matrix

```text
ALLOWLIST_EXACT=ENFORCED
BUN_LOCK_PARITY=REQUIRED
SINGLE_WORKSPACE_SHELL=REQUIRED
SINGLE_OUTLET=REQUIRED
TENANT_SELECTION_GATE_PRESERVED=true
AUTHENTICATION_PRESERVED=true
IMPERSONATION_PRESERVED=true
STATE_KINDS=loading|empty|denied|unavailable|error
VIEWPORTS=375x812|768x1024|1440x900
KEYBOARD_AND_FOCUS=REQUIRED
REDUCED_MOTION=REQUIRED
FRONTEND_CONTRACT_REGRESSION=0
```

Local execution must include the focused structural matrix, security specs,
TypeScript, production build, complete release verification and visual
inspection at all three frozen viewports. Remote execution must reach terminal
success for PR-M2, WRI-01 and Release Gate on the exact PR head before merge.

## Local terminal results

```text
FOCUSED_MATRIX=PASS
FOCUSED_ASSERTIONS=133
PUBLIC_SURFACE_SECURITY=PASS_7_OF_7
TYPECHECK=PASS
PRODUCTION_BUILD=PASS
RESPONSIVE_CONTRACT_375x812=PASS
RESPONSIVE_CONTRACT_768x1024=PASS
RESPONSIVE_CONTRACT_1440x900=PASS
OVERFLOW_OVERLAY_LAYOUT_SHIFT_CONTEXT_LOSS=0
```

The responsive audit combines the generated production stylesheet with frozen
source-level constraints for viewport ownership, rail breakpoints, bounded
mobile navigation, shrink behavior, content width, focus and reduced motion.
It does not introduce a preview deployment or any provider write.

## Mutation ledger

```text
LOVABLE_ROADMAP_UPDATE=false
PROVIDER_WRITES=0
DATABASE_WRITES=0
DEPLOY=false
PRODUCTION_CUTOVER=false
PR_105_MERGE=false
```

Remote run identifiers and the protected merge commit are recorded in the PR
conversation because they do not exist before the single authorized commit is
created.
