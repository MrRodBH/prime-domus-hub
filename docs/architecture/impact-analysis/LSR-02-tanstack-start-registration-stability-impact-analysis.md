# LSR-02 — TanStack Start Registration Stability & LSR-01 Terminal Reconciliation

**Type:** Execution Envelope Planning
**Status:** Ready for External Audit (planning materialized; implementation not started)
**LSR-02 started:** false
**Principal prompt consumed:** false
**Corrective prompt consumed:** false
**Remaining implementation budget:** 2/2

**Authority:** derived from
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md` and the
Finite Roadmap Execution Map
(`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`).

**Baseline HEAD (planning):** `6bbef37d55378edaa37b4e1c1ed973a81334157c`
**Branch:** `main`

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
  `src/routeTree.gen.ts` remains fully under generator authority.
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
  Strategy B.
- `package.json` and `bun.lock` may be modified ONLY if a version
  incompatibility is factually proven (Strategy C).
- `vite.config.ts` may be modified ONLY if Strategy A requires
  explicit configuration.
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

## DEPENDENCY_ALIGNMENT_ALLOWED

`conditionally_true`. Only if version incompatibility is proven by the
diagnostic step. Dependency update is never an autonomous objective.

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

Under Strategy B:

- the footer may remain absent from `src/routeTree.gen.ts`;
- the declaration file must be included by the current `tsconfig.json`;
- `tsconfig.json` MUST NOT be modified;
- typecheck must prove the declaration is active;
- route-tree generation must not remove or modify the declaration
  file.

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

Record SHA-256 hash after each command.

### Cycle B

Repeat Cycle A integrally.

Acceptance criteria:

- `CYCLE_A_SUCCESS = true`
- `CYCLE_B_SUCCESS = true`
- `REGISTER_SOURCE_COUNT_AFTER_EACH_COMMAND = 1`
- `CYCLE_A_FINAL_SHA256 = CYCLE_B_FINAL_SHA256`
- `FULL_SEQUENCE_DIFF = 0`
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
- `register_source_count`
- `cycle_a_results`
- `cycle_b_results`
- `hashes_after_each_command`
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
- `TANSTACK_START_REGISTER_SOURCE_COUNT = 1`
- `DUPLICATE_MODULE_AUGMENTATION = false`
- `TYPE_REGISTRATION_STABLE = true`
- `CYCLE_A_SUCCESS = true`
- `CYCLE_B_SUCCESS = true`
- `FULL_SEQUENCE_DIFF = 0`
- `TYPECHECK_PASSED = true`
- `BUILD_DEV_PASSED = true`
- `BUILD_PASSED = true`
- `FUNCTIONAL_ROUTE_DIFF = 0`
- `FILES_OUTSIDE_ALLOWED = 0`
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
- `LSR-02 started`: false
- `Principal prompt consumed`: false
- `Corrective prompt consumed`: false
- `Remaining implementation budget`: 2/2

This represents the state of the planning, not of any implementation.
