# HRR-01 — Homologation Readiness Recovery & Route Registration Reconciliation

## Status

**Planning and documentation only — Ready for Direct External Audit**

```text
STAGE_ID = HRR-01
STAGE_NAME = Homologation Readiness Recovery & Route Registration Reconciliation
STAGE_TYPE = planning_and_documentation_only
EXECUTOR = ChatGPT GitHub-native
LOVABLE_EXECUTION_AUTHORIZED = false
AUDITED_MAIN_BASELINE = bc996d084932dea3c96877d5d597d9dcc3b3afb1
PLANNING_BRANCH = agent/hrr-01-planning-reconciliation
HRR01_STARTED = true
HRR01_PRINCIPAL_PROMPT_CONSUMED = true
HRR01_CORRECTIVE_PROMPT_CONSUMED = false
HRR01_REMAINING_PROMPT_BUDGET = 1/2
HVP01_STATE = Historical predecessor — not reopened
HRC01_STATE = Rejected — Terminal
HRC01_PRINCIPAL_PROMPT_CONSUMED = true
HRC01_CORRECTIVE_PROMPT_CONSUMED = true
HRC01_REMAINING_PROMPT_BUDGET = 0/2
HRI01_STATE = Planned — Not Authorized
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
```

---

## 1. Objective

HRR-01 records and reconciles the repository state left by the rejected HRC-01
execution. It does not repair runtime and does not regenerate the route tree.
Its exclusive objectives are:

1. record the HRC-01 scope violation and the resulting terminal rejection;
2. preserve the accepted GNR-01 route-registration decision;
3. prohibit revival of rejected Strategy B;
4. define a fail-closed, GitHub-native recovery plan;
5. produce an exact read/write inventory for a future implementation stage;
6. keep HRI-01, live execution, controlled homologation and production blocked.

---

## 2. Audited baseline and ancestry

The branch `main` was audited before any write.

```text
LAST_HANDOFF_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
CURRENT_AUDITED_MAIN_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
MAIN_ADVANCED_AFTER_HANDOFF = false
HRC01_REJECTION_GATE_COMMIT = f9326691f561b958c2a4ed7230dd5bf6059a8df4
COMMITS_AFTER_REJECTION_GATE = 9
ANCESTRY_STATUS = current main is a linear descendant of the rejection gate
RESET_MAIN = false
FORCE_PUSH = false
HISTORY_REWRITE = false
```

Comparison `f9326691...bc996d08` shows eight changed paths:

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

---

## 3. HRC-01 terminal finding

HRC-01 declared the following frozen scope:

```text
src/** = prohibited
vite.config.ts = prohibited
runtime = prohibited
```

Its own `FILES_ALLOWED` did not include `src/routeTree.gen.ts`. Nevertheless,
the final HRC-01 commit removed the generated TanStack Start module
augmentation from `src/routeTree.gen.ts`.

```text
HRC01_FILES_OUTSIDE_ALLOWED = 1
HRC01_OUTSIDE_ALLOWED_PATH = src/routeTree.gen.ts
HRC01_SCOPE_COMPLIANCE = false
HRC01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false
HRC01_STATE = Rejected — Terminal
HRC01_ADDITIONAL_PROMPT_AUTHORIZED = false
```

The HRC-01 planning documents remain historical planning input only. Their
previous `Ready for Direct External Audit` status is not current authority.

---

## 4. Current route-registration facts

Direct inspection of `main` established:

```text
ROUTE_TREE_REGISTER_FOOTER_PRESENT = false
DEDICATED_REGISTER_DECLARATION_PRESENT = false
CANONICAL_REGISTER_AUTHORITY_PROVEN = false
```

`src/routeTree.gen.ts` ends after:

```ts
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
```

No repository result exists for an authored
`src/tanstack-start-register.d.ts` or for another dedicated declaration.

This is a reconciliation finding, not authorization to add a declaration.

---

## 5. Binding GNR-01 decision

GNR-01 remains `Accepted` and is not reopened.

The accepted contract is:

```text
CANONICAL_STRATEGY = GNR-01 generated route-tree augmentation
REGISTER_AUTHORITY_COUNT = exactly 1
AUTHORED_DECLARATION_ALLOWED = false
GENERATED_FILE_REWRITING_PLUGIN_ALLOWED = false
STRATEGY_B_ALLOWED = false
```

The current `vite.config.ts` restates the contract:

```text
GNR-01 restores TanStack Start's generated route-tree augmentation
as the only Register authority.

No authored declaration file and no generated-file rewriting plugin
are permitted.
```

The accepted GNR-01 implementation removed:

```text
src/tanstack-start-register.d.ts
LSR-02 footer-stripping/rewrite plugin
duplicate runtime-adjacent static assertions in vite.config.ts
```

Therefore HRR-01 explicitly prohibits:

- recreating `src/tanstack-start-register.d.ts`;
- restoring Strategy B under another filename;
- stripping or rewriting `src/routeTree.gen.ts` after generation;
- maintaining a second `declare module '@tanstack/react-start'` source;
- treating the current missing augmentation as permission for a fallback.

---

## 6. Architecture impact

### Registry, RegistrySnapshot, ResolutionGraph, ActionExecutor and PluginContext

```text
IMPACT = no runtime impact in HRR-01
```

HRR-01 creates documentation only and does not alter these components.

### Multi-tenancy and authorization

```text
TENANT_AUTHORITY_IMPACT = none
RLS_IMPACT = none
GRANTS_IMPACT = none
AUTH_IMPACT = none
STORAGE_IMPACT = none
```

All server-authoritative tenant, impersonation and storage invariants remain
binding.

### Runtime and generated artifacts

```text
RUNTIME_CHANGE = false
ROUTE_GENERATION_EXECUTED = false
BUILD_EXECUTED = false
TYPECHECK_EXECUTED = false
SRC_EDITED = false
VITE_CONFIG_EDITED = false
PACKAGE_OR_LOCK_EDITED = false
```

---

## 7. Hard gates

| Gate | Result | Reason |
|---|---|---|
| G0 — baseline known | Pass | `main` audited at `bc996d08...` |
| G1 — architecture authority | Pass | GNR-01 remains accepted and binding |
| G2 — scope isolation | Pass | HRR-01 is documentation-only |
| G3 — tenant isolation | Not impacted | no tenant/runtime changes |
| G4 — authorization | Not impacted | no auth/RLS/grants changes |
| G5 — generated-file safety | Pass for planning | no generation or edit executed |
| G6 — deterministic evidence | Planned | must be proved by future HRI-01 implementation |
| G7 — successor control | Pass | HRI-01 remains not authorized |

---

## 8. Future canonical recovery strategy

A future implementation may be authorized only through HRI-01 after a separate
direct audit of HRR-01.

HRI-01 must restore the accepted GNR-01 outcome through the official generator
and release-gate path. It must not author or post-process the Register
augmentation.

Required sequence:

```text
1. audit the then-current main HEAD
2. freeze an HRI-01 execution envelope
3. verify package and lockfile integrity
4. run only the official TanStack/Vite generation path
5. require exactly one generated Register augmentation
6. require authored declaration count = 0
7. require generated-file rewriting plugin count = 0
8. prove deterministic generation across independent cycles
9. prove typecheck/build/build:dev/release gate
10. prove final functional route diff = 0
11. persist evidence
12. stop for direct external audit before merge
```

Fail-closed conditions:

```text
GENERATED_REGISTER_AUTHORITY_COUNT != 1
AUTHORED_REGISTER_DECLARATION_COUNT != 0
GENERATED_FILE_REWRITER_COUNT != 0
FUNCTIONAL_ROUTE_DIFF != 0
PACKAGE_OR_LOCK_DRIFT != 0
UNEXPECTED_FILE_CHANGE_COUNT != 0
```

Any fail-closed condition terminates the implementation attempt without
fallback and without HRI-01 acceptance.

---

## 9. Exact future inventory

### 9.1 Mandatory read-only entry inventory

```text
vite.config.ts
package.json
bun.lock
tsconfig.json
src/routeTree.gen.ts
src/router.tsx
src/start.ts
scripts/verify-release.mjs
.github/workflows/release-gate.yml
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/gnr-01-release-gate-acceptance.md
docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json
docs/architecture/impact-analysis/HRC-01-homologation-readiness-closure-impact-analysis.md
docs/architecture/governance/HRC-01-roadmap-reconciliation.md
```

### 9.2 Candidate implementation write inventory

The future HRI-01 planning gate must start with the narrowest possible set:

```text
src/routeTree.gen.ts
  classification: generated transient artifact
  manual edit: prohibited
  accepted final content: generator-produced only

scripts/verify-release.mjs
  classification: deterministic verification harness
  edit: allowed only if HRI-01 Impact Analysis proves a missing fail-closed assertion

.github/workflows/release-gate.yml
  classification: GitHub release gate
  edit: allowed only if required to persist exact-SHA evidence without weakening existing checks

HRI-01 governance/evidence documents
  classification: documentation and evidence
```

The following are excluded from the default HRI-01 write set:

```text
vite.config.ts
package.json
bun.lock
tsconfig.json
src/router.tsx
src/start.ts
src/tanstack-start-register.d.ts
```

Any future need to alter an excluded path requires a new explicit Impact
Analysis finding and Rodolfo's authorization before implementation.

---

## 10. Product Experience Parallel Lane

```text
PRODUCT_EXPERIENCE_PLANNING_BLOCKED_BY_HVP01 = false
PRODUCT_EXPERIENCE_PLANNING_BLOCKED_BY_HRC01 = false
PRODUCT_EXPERIENCE_PLANNING_BLOCKED_BY_HRR01 = false
PRODUCT_EXPERIENCE_RUNTIME_IMPLEMENTATION_AUTHORIZED = false
```

HRR-01 does not implement dashboard, UI, UX, onboarding, domains, sites,
portals, permissions or analytics.

---

## 11. FILES_ALLOWED — HRR-01

```text
FILES_ALLOWED = [
  "docs/architecture/impact-analysis/HRR-01-homologation-readiness-recovery-route-registration-reconciliation-impact-analysis.md",
  "docs/architecture/governance/HRR-01-roadmap-reconciliation.md",
  "docs/architecture/governance/HRC-01-roadmap-reconciliation.md",
  "docs/architecture/governance/HRC-01-terminal-rejection-record.md",
  "docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/hrr-01-read-only-audit.md"
]
```

No other path is authorized.

---

## 12. Prohibitions

HRR-01 does not execute or modify:

```text
src/**
vite.config.ts
package.json
bun.lock
tsconfig.json
scripts/**
.github/workflows/**
supabase/**
migrations
RLS
grants
policies
Auth
Storage
cron
queues
webhooks
email
route generation
typecheck
build
build:dev
vite dev
live execution
controlled homologation
production
```

---

## 13. Definition of Done

HRR-01 is ready for direct external audit only when:

```text
CURRENT_AUDITED_MAIN_HEAD = bc996d084932dea3c96877d5d597d9dcc3b3afb1
MAIN_ADVANCED_AFTER_HANDOFF = false
HRC01_STATE = Rejected — Terminal
HRC01_FILES_OUTSIDE_ALLOWED = 1
HRC01_OUTSIDE_ALLOWED_PATH = src/routeTree.gen.ts
GNR01_STATE = Accepted
STRATEGY_B_ALLOWED = false
ROUTE_TREE_REGISTER_FOOTER_PRESENT = false
DEDICATED_REGISTER_DECLARATION_PRESENT = false
CANONICAL_REGISTER_AUTHORITY_PROVEN = false
HRI01_STATE = Planned — Not Authorized
LIVE_EXECUTION_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
FILES_OUTSIDE_ALLOWED = 0
HRR01_PRINCIPAL_PROMPT_CONSUMED = true
HRR01_CORRECTIVE_PROMPT_CONSUMED = false
HRR01_REMAINING_PROMPT_BUDGET = 1/2
HRR01_STATE = Planning — Ready for Direct External Audit
```

HRR-01 does not declare itself `Accepted` and does not authorize HRI-01.