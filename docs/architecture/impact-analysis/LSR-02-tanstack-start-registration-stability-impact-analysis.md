# LSR-02 — TanStack Start Registration Stability & LSR-01 Terminal Reconciliation

**Type:** Execution Envelope Planning + Principal Implementation + Final Corrective Executed + Terminal Rejection Factual Reconciliation
**Status:** Rejected — Terminal (final external audit decision)
**LSR-02 started:** true
**Principal prompt consumed:** true
**Corrective prompt consumed:** true
**Remaining implementation budget:** 0/2
**Principal external audit accepted:** false
**Final external audit accepted:** false
**Ready for final external audit:** false
**New implementation prompt authorized:** false
**Budget reopening authorized:** false
**Nature of this reconciliation:** documentary — no code, no build, no tests, no route regeneration, no runtime change.

**Authority:** derived from
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md` and the
Finite Roadmap Execution Map
(`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`).

**Baseline HEAD (planning):** `6bbef37d55378edaa37b4e1c1ed973a81334157c`
**Reconciliation Baseline HEAD:** `e0251331bb701206fcf4ee11f29e3d93e442ac38`
**Corrective Baseline HEAD:** `c1cb38655d075e2e3fe390a61ce4db6097bef1f3`
**Terminal Reconciliation Baseline HEAD:** `900c57ec00af25ff84bba72a7c77faa2794b9e62`
**Branch:** `main`

---

## FINAL EXTERNAL AUDIT DECISION — TERMINAL REJECTION

The final external audit rejected LSR-02. This section is authoritative
and supersedes any earlier claim in this document of "Ready for Final
External Audit", "audit-accepted", or equivalent phrasing. All earlier
sections below are preserved unchanged as historical technical record
of the rejected implementation; they must be read as HISTORICAL and
NON-AUTHORITATIVE.

- `LSR_02_STATE = Rejected`
- `LSR_02_FINAL_STATE = Rejected`
- `LSR_02_TERMINAL = true`
- `FINAL_EXTERNAL_AUDIT_ACCEPTED = false`
- `PRINCIPAL_EXTERNAL_AUDIT_ACCEPTED = false`
- `READY_FOR_FINAL_EXTERNAL_AUDIT = false`
- `NEW_IMPLEMENTATION_PROMPT_AUTHORIZED = false`
- `BUDGET_REOPENING_AUTHORIZED = false`
- `REMAINING_IMPLEMENTATION_BUDGET = 0/2`
- `LSV_03_STATE = Planned — Blocked` (unchanged)

### Blocking findings (preserved, non-authoritative for any successor)

1. **`CONTROLLED_DEV_REQUIRED_NOT_EXECUTED`** — Cycle B relied on
   canonical `build:dev` + `build` sequences driven from the current
   harness process instead of a separately controlled `vite dev`
   instance under harness authority. Stability under an authorized,
   harness-owned development process was therefore not proven.
2. **`COMPILER_FILE_LIST_NOT_PROVEN`** — inclusion of
   `src/tanstack-start-register.d.ts` in the effective compiler file
   list was asserted but not evidenced by a persisted, independently
   verifiable compiler file-list artifact.
3. **`CYCLE_COMPOSITE_DIGEST_NOT_PROVEN`** — the required
   deterministic ordered-manifest digest covering
   `src/routeTree.gen.ts`, the selected canonical source,
   `vite.config.ts`, `package.json`, and `bun.lock` was not
   independently computed and evidenced as the normative
   `CYCLE_FINAL_STATE_DIGEST`.
4. **`PARTIAL_FOOTER_FAIL_CLOSED_NOT_FULLY_IMPLEMENTED`** — the
   stripper handles the known EOF-anchored footer and a loose
   augmentation-shaped tail, but does not fully cover every
   partial-footer permutation with a fail-closed proof.
5. **`CONFLICTING_CURRENT_STATES_PRESENT`** — prior planning and
   execution documents recorded coexisting "not started", "started",
   and "ready for final audit" states. This reconciliation resolves
   the conflict into the single terminal state `Rejected`.

### Treatment of the rejected Strategy B artifacts

The Strategy B implementation — `src/tanstack-start-register.d.ts`,
the `lsr02:strip-tanstack-start-register-footer` Vite plugin in
`vite.config.ts`, and the bidirectional `_Lsr02Equal` / `_Lsr02Assert`
type-only static assertions — is retained in the repository as
rejected technical history. It is NOT an accepted deliverable, does
NOT satisfy the LSR-02 Definition of Done, and does NOT authorize any
downstream stage. Any real-execution outcome fields recorded elsewhere
in this document (Cycle A / Cycle B digests, TOTAL_REGISTER_SOURCE_COUNT,
route-tree SHA-256, FUNCTIONAL_ROUTE_DIFF, stripper safety tests) are
historical observations, not audit-accepted results.

### Successor

Formal replacement-path planning gate — **not started**. LSR-02
rejection does NOT auto-start LSV-03 and does NOT auto-transfer any
deliverable from LSR-01, LSV-02, or the rejected LSR-02
implementation. LSV-03 remains `Planned — Blocked`.

---

## FINAL CORRECTIVE SUMMARY (LSR-02 §5–§13) — HISTORICAL, NON-AUTHORITATIVE

The section below is preserved for audit traceability. It describes
the rejected implementation and does NOT reflect the terminal state.

- **STRATEGY_SELECTED:** B (dedicated_declaration_file); STRATEGY_C_USED = false.
- **Static assertions:** relocated from `src/tanstack-start-register.d.ts` (where `tsgo` does not enforce type-alias constraint violations in `.d.ts` files) into `vite.config.ts` as type-only `_Lsr02Assert<_Lsr02Equal<...>>` triples. Negative mutation of `Register["ssr"]` or `Register["router"]` produces real `TS2344` errors; positive typecheck passes clean.
- **Footer stripper hardening:** `KNOWN_FOOTER_RE` anchored to EOF and requires `declare module '@tanstack/react-start'`; suffix must not contain route content (`createFileRoute` / `_addFileChildren` / `_addFileTypes` / `RouteImport` / `rootRouteChildren`). Unknown/partial footers fail closed in `buildStart` / `writeBundle` / `closeBundle` and fail-soft (logged, untouched) in dev.
- **Stripper safety tests (all pass):** no-footer no-op, known footer strip, similar-import safety, partial footer fail-closed, trailing-content fail-closed.
- **Cycles A + B:** `build:dev`, `tsgo --noEmit`, `build` all green; `src/routeTree.gen.ts` SHA-256 stable at `c34cde3ab338c54121fadcb9bf38682f464f07446680eb3e380f204b8f4a6e1f` across every command; `GENERATED_FOOTER_COUNT=0`, `DEDICATED_DECLARATION_COUNT=1`, `TOTAL_REGISTER_SOURCE_COUNT=1`, `DUPLICATE_MODULE_AUGMENTATION=false`.
- **Functional route diff vs baseline `516d5af2…`:** 0.
- **`package.json` / `bun.lock` / `tsconfig.json`:** unchanged.

Files changed (within `FILES_ALLOWED`): `vite.config.ts`, `src/tanstack-start-register.d.ts`, this impact analysis, `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`, and the evidence artifact
`docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json`.

LSV-03 remains `Planned — Blocked`.

---



This document freezes the Execution Envelope for the future LSR-02
implementation. It does NOT start LSR-02, does NOT consume any LSR-02
prompt, does NOT modify code, does NOT regenerate the route tree, does
NOT alter generator or dependency configuration, and does NOT initiate
LSV-03.

---

## STAGE_ID

`LSR-02 — TanStack Start Registration Stability & LSR-01 Terminal Reconciliation`

## OBJECTIVE

Establish a single, deterministic and persistent source for the
TanStack Start module augmentation, stable across all real development
and build sequences (canonical generation, `vite dev`, `vite build`,
`vite build --mode development`, typecheck), without modifying
functional routes.

The objective is NOT limited to the presence of a footer inside
`src/routeTree.gen.ts`. The future implementation must select and
implement exactly ONE canonical source, via evidence-based selection
among:

- **Strategy A — Canonical stable footer.** The generator produces and
  preserves the module augmentation inside `src/routeTree.gen.ts`
  across every generation path (server tree and client tree).
- **Strategy B — Dedicated stable declaration.** The module
  augmentation lives in a versioned, non-generated TypeScript
  declaration file (`src/tanstack-start-register.d.ts`), while
  `src/routeTree.gen.ts` remains fully under generator authority AND
  the footer is provably suppressed from every generation path.
- **Strategy C — Dependency alignment.** Minimum, proven-necessary
  version alignment among `@tanstack/react-start`,
  `@tanstack/router-plugin`, and `@lovable.dev/vite-tanstack-config`.
  Strategy C is NEVER autonomous; it can only accompany A or B.

The future implementation must pick the shortest safe path and avoid
implementing redundant solutions simultaneously.

## PREDECESSOR

LSR-01 — Superseded (terminal · principal consumed · corrective
consumed · remaining budget 0/2 · corrective failed closed · register
stability not resolved).

## DELIVERABLES

- Single canonical source of the TanStack Start module augmentation
  (Strategy A or Strategy B, optionally combined with Strategy C).
- Concurrency diagnostic: enumeration of every process that may
  generate or rewrite `src/routeTree.gen.ts`; distinction between
  server-tree and client-tree generation paths; effective
  `routeTreeFileFooter` configuration; observed effect of `vite dev`
  running in background, `vite build`, `vite build --mode
  development`, and typecheck; declared vs resolved versions of the
  three TanStack/Lovable packages.
- Two full independent test cycles (Cycle A and Cycle B).
- Persisted evidence artifact.

## FILES_ALLOWED

The future LSR-02 implementation is restricted EXCLUSIVELY to the
following nine paths. FILES_ALLOWED is fully frozen; no additional
file may be identified during implementation and no addendum is
authorized.

- `vite.config.ts`
- `package.json`
- `bun.lock`
- `src/routeTree.gen.ts`
- `src/tanstack-start-register.d.ts`
- `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`
- `docs/architecture/impact-analysis/LSR-01-lsv-02-closure-recovery-roadmap-reconciliation-impact-analysis.md`
- `docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md`
- `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json`

Frozen flags:

- `FILES_ALLOWED_FULLY_FROZEN = true`
- `FUTURE_ADDENDUM_ALLOWED = false`

Conditional-write rules:

- `src/tanstack-start-register.d.ts` may be created ONLY under
  Strategy B. Under Strategy A its creation is forbidden.
- `package.json` and `bun.lock` may be modified ONLY if a version
  incompatibility is factually proven (Strategy C).
- `vite.config.ts` may be modified under the scoped authority defined
  in `VITE_CONFIG_CHANGE_ALLOWED` below.
- `src/routeTree.gen.ts` MUST NEVER be edited manually.
- No other file may be added or edited.

## MIGRATIONS_ALLOWED / DATABASE_CHANGES_ALLOWED / AUTH_CHANGES_ALLOWED / STORAGE_CHANGES_ALLOWED / CRON_CHANGES_ALLOWED / RLS_CHANGES_ALLOWED / GRANTS_CHANGES_ALLOWED / POLICY_CHANGES_ALLOWED

All `false`.

## RUNTIME_BEHAVIOR_CHANGES_ALLOWED

`false`.

## TYPE_REGISTRATION_CONFIGURATION_CHANGE_ALLOWED

`true`. Does NOT authorize functional route changes, URL changes,
loader changes, middleware changes, SSR behavior changes, auth
changes, or tenant context changes.

## VITE_CONFIG_CHANGE_ALLOWED

`conditionally_true`. The prior rule that restricted `vite.config.ts`
modifications to Strategy A is superseded. Under this reconciliation
both Strategy A and Strategy B may modify `vite.config.ts`, but only
within the scope defined below.

### Strategy A — authorized scope

`vite.config.ts` may be modified EXCLUSIVELY to configure a canonical
generation in which the footer (`declare module '@tanstack/react-start'`
block) is produced identically and persistently by every generation
path:

- `vite dev`
- `vite build`
- `vite build --mode development`
- server-tree generation
- client-tree generation

### Strategy B — authorized scope

`vite.config.ts` may be modified EXCLUSIVELY to guarantee that the
generated footer remains absent from `src/routeTree.gen.ts` across
every generation path, leaving `src/tanstack-start-register.d.ts` as
the single canonical source of the module augmentation.

### Common prohibitions

No `vite.config.ts` change may:

- alter routes;
- alter URLs;
- alter loaders;
- alter middleware;
- alter SSR;
- alter server entry;
- alter deploy target;
- alter aliases;
- alter Tailwind;
- alter unrelated plugins;
- alter authentication;
- alter Tenant Context;
- alter runtime behavior;
- duplicate plugins already provided by
  `@lovable.dev/vite-tanstack-config`.

Recorded scope:

```text
VITE_CONFIG_CHANGE_SCOPE = tanstack_start_registration_only
```

## DEPENDENCY_ALIGNMENT_ALLOWED

`conditionally_true`. Only if version incompatibility is proven by the
diagnostic step. Dependency update is never an autonomous objective.

```text
DEPENDENCY_ALIGNMENT_MINIMAL = true
```

When Strategy C is required:

- record declared versions;
- record resolved versions;
- identify the causal incompatibility;
- change only the strictly necessary packages;
- no major version bump;
- no update of unrelated dependencies;
- lockfile diff MUST be limited to the causal set;
- preserve all Cycle A and Cycle B tests.

If incompatibility is NOT proven:

```text
package.json unchanged
bun.lock unchanged
```

## NEW_STABLE_DECLARATION_FILE_ALLOWED

`conditionally_true`. Only under Strategy B; the file must be included
by the existing `tsconfig.json` without modifying `tsconfig.json`.

## DIAGNOSTIC REQUIREMENTS (future implementation)

Before implementing, the future LSR-02 implementation MUST identify:

1. every process that can generate or rewrite `src/routeTree.gen.ts`;
2. difference between server-tree and client-tree generation;
3. effective `routeTreeFileFooter` configuration;
4. influence of an already-running Vite dev server;
5. influence of `vite build`;
6. influence of `vite build --mode development`;
7. influence of `vite dev`;
8. influence of typecheck;
9. effectively installed versions of the three TanStack/Lovable
   packages;
10. divergence between declared and resolved versions;
11. feasibility of stable module augmentation outside the generated
    file.

The diagnostic must produce the following table:

```text
COMMAND_OR_PROCESS
GENERATOR_PATH
REGISTER_PRESENT_BEFORE
REGISTER_PRESENT_AFTER
FILE_SHA256_BEFORE
FILE_SHA256_AFTER
PROCESS_OWNER
EXPECTED_BEHAVIOR
OBSERVED_BEHAVIOR
```

Causality must NOT be attributed to typecheck without distinguishing
the concurrent process that effectively rewrote the file.

## SINGLE-REGISTER CONTRACT

At the end of the future implementation there must exist exactly one
canonical source of the module augmentation:

```text
TANSTACK_START_REGISTER_SOURCE = generated_footer OR dedicated_declaration_file
TANSTACK_START_REGISTER_SOURCE_COUNT = 1
DUPLICATE_MODULE_AUGMENTATION = false
TYPE_REGISTRATION_STABLE = true
```

### Strategy A — Generated footer contract

Required result after EACH command of Cycles A and B:

```text
DEDICATED_DECLARATION_PRESENT = false
GENERATED_FOOTER_COUNT = 1
TOTAL_REGISTER_SOURCE_COUNT = 1
DUPLICATE_MODULE_AUGMENTATION = false
```

Creating `src/tanstack-start-register.d.ts` is FORBIDDEN when
Strategy A is selected.

### Strategy B — Dedicated declaration contract

Required result after EACH command of Cycles A and B:

```text
DEDICATED_DECLARATION_PRESENT = true
DEDICATED_DECLARATION_COUNT = 1
GENERATED_FOOTER_COUNT = 0
TOTAL_REGISTER_SOURCE_COUNT = 1
DUPLICATE_MODULE_AUGMENTATION = false
```

The future implementation MUST prove that:

- `src/tanstack-start-register.d.ts` is included by the current
  `tsconfig.json`;
- `tsconfig.json` was NOT modified;
- the file appears in the effective list of files processed by the
  typechecker;
- the declaration contains the module augmentation exactly once;
- generation, typecheck, `build:dev`, `build`, and controlled
  development do not remove or duplicate that declaration;
- the footer stays suppressed in `src/routeTree.gen.ts` across every
  generation path (mutual exclusion with Strategy A).

Strategy A and Strategy B contracts are mutually exclusive: exactly
one canonical source may exist at any time.

## REGISTER SOURCE SCAN — NORMATIVE DEFINITION

```text
REGISTER_SOURCE_SCAN_SCOPE = repository TypeScript source files under src/
```

The count MUST search for the semantic block:

```text
declare module '@tanstack/react-start'
```

in:

```text
src/**/*.ts
src/**/*.tsx
src/**/*.d.ts
```

The scan MUST NOT count:

- documentation;
- JSON files;
- logs;
- evidence artifacts;
- files inside `node_modules`;
- textual occurrences inside comments.

The scan MUST record separately:

```text
GENERATED_FOOTER_COUNT
DEDICATED_DECLARATION_COUNT
TOTAL_REGISTER_SOURCE_COUNT
DUPLICATE_MODULE_AUGMENTATION
```

Acceptance criteria after EACH command of Cycles A and B:

```text
TOTAL_REGISTER_SOURCE_COUNT = 1
DUPLICATE_MODULE_AUGMENTATION = false
```

## HASH AND DIFF METRICS — NORMATIVE DEFINITION

The prior formulation of `CYCLE_A_FINAL_SHA256`,
`CYCLE_B_FINAL_SHA256` and `FULL_SEQUENCE_DIFF` is superseded by the
unambiguous definitions below.

### Individual hashes after each command

```text
ROUTE_TREE_SHA256
REGISTER_SOURCE_SHA256
VITE_CONFIG_SHA256
PACKAGE_JSON_SHA256
BUN_LOCK_SHA256
```

For non-existent files, record explicitly:

```text
ABSENT
```

### Cycle final state digest

```text
CYCLE_FINAL_STATE_DIGEST
```

is defined as a deterministic hash of the ordered manifest containing:

```text
src/routeTree.gen.ts
selected canonical source (footer OR dedicated declaration file)
vite.config.ts
package.json
bun.lock
```

### Inter-cycle criterion

```text
CYCLE_A_FINAL_STATE_DIGEST = CYCLE_B_FINAL_STATE_DIGEST
```

### Meaning of `FULL_SEQUENCE_DIFF = 0`

`FULL_SEQUENCE_DIFF = 0` means ALL of:

- no difference between the final state of Cycle A and Cycle B;
- no additional change caused by the second execution;
- no footer oscillation;
- no creation or removal of the dedicated declaration;
- no unexpected configuration or dependency change;
- no functional route change.

It does NOT mean that the final state must equal the pre-implementation
baseline: the implementation may legitimately introduce the selected
canonical source.

## TESTS_REQUIRED (future implementation)

Execute two full independent cycles.

### Cycle A

```text
initial state
→ canonical generation
→ register verification
→ typecheck
→ register verification
→ build:dev
→ register verification
→ build
→ register verification
→ generation via controlled development path
→ final verification
```

Record the following hashes after each command:

```text
ROUTE_TREE_SHA256
REGISTER_SOURCE_SHA256
VITE_CONFIG_SHA256
PACKAGE_JSON_SHA256
BUN_LOCK_SHA256
```

Record the following counts after each command:

```text
GENERATED_FOOTER_COUNT
DEDICATED_DECLARATION_COUNT
TOTAL_REGISTER_SOURCE_COUNT
DUPLICATE_MODULE_AUGMENTATION
```

### Cycle B

Repeat Cycle A integrally.

Acceptance criteria:

- `CYCLE_A_SUCCESS = true`
- `CYCLE_B_SUCCESS = true`
- `TOTAL_REGISTER_SOURCE_COUNT_AFTER_EACH_COMMAND = 1`
- `DUPLICATE_MODULE_AUGMENTATION = false` after each command
- `CYCLE_A_FINAL_STATE_DIGEST = CYCLE_B_FINAL_STATE_DIGEST`
- `FULL_SEQUENCE_DIFF = 0` (per semantics above)
- `TYPECHECK_PASSED = true`
- `BUILD_DEV_PASSED = true`
- `BUILD_PASSED = true`
- `FUNCTIONAL_ROUTE_DIFF = 0`

Additional validations:

- no duplicate module augmentation exists;
- no functional route added or removed;
- router imports and types validated;
- evidence JSON validated;
- no file outside FILES_ALLOWED changed;
- documentary link verification.

## STRATEGY B — POSITIVE PROOF OF TYPECHECK INCLUSION

When Strategy B is selected, the future implementation MUST record:

```text
DECLARATION_INCLUDED_BY_TYPECHECK = true
```

Inclusion MUST be proven via the effective list of files processed by
the compiler, without modifying `tsconfig.json`.

A static, type-level verification MUST also exist proving that:

```text
Register['router']
Register['config']
```

correspond to the expected types derived from:

```text
getRouter
startInstance.getOptions
```

That verification MAY reside within the declarative file itself,
provided that it:

- is exclusively type-level;
- generates no runtime code;
- does not alter application behavior;
- fails the typecheck if the module augmentation is incorrect.

## TESTS / EVIDENCE / DEFINITION OF DONE — FIELD RECONCILIATION

`TESTS_REQUIRED`, `EVIDENCE_REQUIRED`, and `DEFINITION_OF_DONE` MUST
require the same reconciled field set:

```text
STRATEGY_SELECTED
GENERATED_FOOTER_COUNT_AFTER_EACH_COMMAND
DEDICATED_DECLARATION_COUNT_AFTER_EACH_COMMAND
TOTAL_REGISTER_SOURCE_COUNT_AFTER_EACH_COMMAND
DUPLICATE_MODULE_AUGMENTATION

ROUTE_TREE_SHA256_AFTER_EACH_COMMAND
REGISTER_SOURCE_SHA256_AFTER_EACH_COMMAND
CYCLE_A_FINAL_STATE_DIGEST
CYCLE_B_FINAL_STATE_DIGEST
FULL_SEQUENCE_DIFF

DECLARATION_INCLUDED_BY_TYPECHECK
TYPE_REGISTRATION_STATIC_ASSERTION_PASSED

TYPECHECK_PASSED
BUILD_DEV_PASSED
BUILD_PASSED
FUNCTIONAL_ROUTE_DIFF
```

Conditional rules:

```text
Strategy A:
  DECLARATION_INCLUDED_BY_TYPECHECK = not_applicable
  TYPE_REGISTRATION_STATIC_ASSERTION_PASSED = true
    (via equivalent proof over the generated footer)

Strategy B:
  DECLARATION_INCLUDED_BY_TYPECHECK = true
  TYPE_REGISTRATION_STATIC_ASSERTION_PASSED = true
```

## CONCURRENT PROCESSES

The future implementation MUST:

- identify Vite processes already active;
- record PID and command line of relevant processes;
- NOT attribute to `tsgo` a rewrite executed by a concurrent process;
- start and terminate only processes created by its own harness;
- NOT kill platform processes without explicit authorization;
- fail closed if a deterministic state cannot be obtained;
- prove stability also AFTER the authorized development process
  reprocesses routes.

## EVIDENCE_REQUIRED

Persisted evidence artifact (atomic write) at:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json
```

Containing at minimum:

- `stage_id`
- `baseline_head`
- `strategy_selected`
- `diagnostic_results`
- `package_versions_declared`
- `package_versions_resolved`
- `register_source`
- `generated_footer_count_after_each_command`
- `dedicated_declaration_count_after_each_command`
- `total_register_source_count_after_each_command`
- `duplicate_module_augmentation`
- `route_tree_sha256_after_each_command`
- `register_source_sha256_after_each_command`
- `vite_config_sha256_after_each_command`
- `package_json_sha256_after_each_command`
- `bun_lock_sha256_after_each_command`
- `cycle_a_final_state_digest`
- `cycle_b_final_state_digest`
- `full_sequence_diff`
- `declaration_included_by_typecheck`
- `type_registration_static_assertion_passed`
- `cycle_a_results`
- `cycle_b_results`
- `typecheck_passed`
- `build_dev_passed`
- `build_passed`
- `functional_route_diff`
- `files_changed`
- `files_outside_allowed`
- `lsr_01_state`
- `lsr_02_started`
- `principal_prompt_consumed`
- `corrective_prompt_consumed`
- `remaining_implementation_budget`
- `ready_for_external_audit`

No self-referential `final_head` value is to be recorded. The final
HEAD will be established by external audit.

## DEFINITION_OF_DONE

The future LSR-02 is ready for external audit ONLY when:

- `LSR_01_STATE = Superseded`
- `LSR_01_REMAINING_BUDGET = 0`
- `STRATEGY_SELECTED ∈ {A, B}` (optionally with C)
- `TOTAL_REGISTER_SOURCE_COUNT = 1` after every command
- `DUPLICATE_MODULE_AUGMENTATION = false` after every command
- Strategy A: `GENERATED_FOOTER_COUNT = 1` and
  `DEDICATED_DECLARATION_COUNT = 0` after every command
- Strategy B: `GENERATED_FOOTER_COUNT = 0` and
  `DEDICATED_DECLARATION_COUNT = 1` after every command, and
  `DECLARATION_INCLUDED_BY_TYPECHECK = true`
- `TYPE_REGISTRATION_STATIC_ASSERTION_PASSED = true`
- `TYPE_REGISTRATION_STABLE = true`
- `CYCLE_A_SUCCESS = true`
- `CYCLE_B_SUCCESS = true`
- `CYCLE_A_FINAL_STATE_DIGEST = CYCLE_B_FINAL_STATE_DIGEST`
- `FULL_SEQUENCE_DIFF = 0` (per normative semantics)
- `TYPECHECK_PASSED = true`
- `BUILD_DEV_PASSED = true`
- `BUILD_PASSED = true`
- `FUNCTIONAL_ROUTE_DIFF = 0`
- `FILES_OUTSIDE_ALLOWED = 0`
- `VITE_CONFIG_CHANGE_SCOPE = tanstack_start_registration_only`
- `EVIDENCE_ARTIFACT_VALID = true`
- `LSV_03_STATE = Planned — Blocked`

## OUT_OF_SCOPE

- LSV-03
- LSV-04
- `CLIENT_TENANT_AUTHORITY`
- maintenance mode
- tenant fixtures
- Auth harness
- Storage
- database
- migrations
- RLS
- grants
- policies
- cron
- queues
- `net.http_post`
- external Supabase
- functional route changes
- reopening of LSR-01

## EXTERNAL_DEPENDENCIES

None.

## PROMPT_BUDGET

- Principal: 1
- Corrective: 1
- Absolute maximum: 2
- Consumed: 0
- Remaining: 2/2

## TERMINAL_STATES

- Accepted
- Accepted with Non-Blocking Backlog
- Blocked External
- Rejected
- Superseded

## SUCCESSOR

Formal replacement-path planning gate.

LSR-02 does not authorize LSV-03 implementation. LSV-03 remains
`Planned — Blocked`. No deliverable from LSV-02 or LSR-01 is
auto-transferred.

## PLANNING STATE

- `LSR-02 status`: Ready for External Audit
- `LSR-02 started`: true
- `Principal prompt consumed`: true
- `Corrective prompt consumed`: false
- `Remaining implementation budget`: 1/2

This represents the state after principal-prompt implementation.

## FACTUAL EXECUTION OUTCOME (principal prompt)

```text
STRATEGY_SELECTED = B
STRATEGY_C_USED = false
CAUSAL_VERSION_INCOMPATIBILITY_PROVEN = false
PACKAGE_JSON_CHANGED = false
BUN_LOCK_CHANGED = false
ROUTE_TREE_GEN_MANUALLY_EDITED = false

REGISTER_SOURCE = dedicated_declaration_file (src/tanstack-start-register.d.ts)
GENERATED_FOOTER_COUNT_AFTER_EACH_COMMAND = 0
DEDICATED_DECLARATION_COUNT_AFTER_EACH_COMMAND = 1
TOTAL_REGISTER_SOURCE_COUNT_AFTER_EACH_COMMAND = 1
DUPLICATE_MODULE_AUGMENTATION = false

ROUTE_TREE_SHA256_STABLE = c34cde3ab338c54121fadcb9bf38682f464f07446680eb3e380f204b8f4a6e1f
REGISTER_SOURCE_SHA256_STABLE = 856c0bd54b16876b3124a6d00d94d3048468f5ce3c3d0845ef2a57cc7b5e69bd
VITE_CONFIG_SHA256_STABLE = a7e6138fbc6a88e548e60649daa9a01fe7a2d89342a5a066891df638faefe6ff

CYCLE_A_SUCCESS = true
CYCLE_B_SUCCESS = true
CYCLE_A_FINAL_STATE_DIGEST = b9896a4a7a9a9f18abaec8896d208f173da2e074074a8642e4948be835a3d66d
CYCLE_B_FINAL_STATE_DIGEST = b9896a4a7a9a9f18abaec8896d208f173da2e074074a8642e4948be835a3d66d
FULL_SEQUENCE_DIFF = 0

DECLARATION_INCLUDED_BY_TYPECHECK = true
TYPE_REGISTRATION_STATIC_ASSERTION_PASSED = true
TYPE_REGISTRATION_STABLE = true

TYPECHECK_PASSED = true
BUILD_DEV_PASSED = true
BUILD_PASSED = true
FUNCTIONAL_ROUTE_DIFF = 0

VITE_CONFIG_CHANGE_SCOPE = tanstack_start_registration_only
FILES_OUTSIDE_ALLOWED = 0
EVIDENCE_ARTIFACT_VALID = true
READY_FOR_EXTERNAL_AUDIT = true
LSV_03_STATE = Planned — Blocked
```

### Root cause and resolution

- `@tanstack/start-plugin-core` always appends the `declare module
  '@tanstack/react-start'` footer during the server-tree generation used by
  `vite build`; the client-tree generator used by `vite dev` and by
  `build:dev` rewrites the file WITHOUT the footer. There is no supported
  config toggle to disable the built-in footer — only to append additional
  user footer entries.
- Strategy B was selected: `src/tanstack-start-register.d.ts` is the single
  canonical source of the module augmentation, and a scoped Vite plugin
  (`lsr02:strip-tanstack-start-register-footer`) in `vite.config.ts`
  removes the auto-generated footer from `src/routeTree.gen.ts` on
  `buildStart`, `writeBundle`, `closeBundle`, and `configureServer`. Scope
  is strictly `tanstack_start_registration_only` — no routes, URLs,
  loaders, middleware, SSR, aliases, Tailwind, or unrelated plugins are
  touched.

### Process inventory recorded during execution

- PID 448 (`node /dev-server/node_modules/.bin/vite dev --port 8080`) —
  platform-managed dev server, watches `src/`; NOT created or terminated
  by the harness.
- PID 458 (`esbuild --service=... --ping`) — esbuild worker owned by
  PID 448.

Detailed evidence, per-command hashes, and cycle records are persisted in
`docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json`.

