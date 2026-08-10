# GOV-01 — Capability Preflight & CI Scope Optimization — Impact Analysis

**Status:** Accepted for implementation by explicit Product Owner authorization on 2026-08-10  
**Baseline:** `main@d0f120d9ffad018a9d1d944cf34e3266c8ca5c71`  
**Repository:** `MrRodBH/prime-domus-hub`  
**Scope:** governance and CI only  
**Runtime/Product mutation:** prohibited

## 1. Problem statement

Two independent delivery inefficiencies were confirmed during SPR-01/SPR-02:

1. an implementation strategy was frozen before proving that the selected executor could create and publish the required primitive in the exact project;
2. documentation-only pull requests triggered expensive runtime/build gates even when no runtime, configuration or migration file changed.

The Product Owner explicitly authorized correction of both governance defects.

## 2. Binding decisions

### 2.1 Mandatory capability preflight

Before freezing an implementation strategy that depends on an external executor or managed platform, the planning gate MUST answer, against the exact project and current executor policy:

```text
Can the selected executor create the required primitive in this exact project?
Can it access the required environment/secret names server-side without exposing values?
Can it publish/materialize the primitive through the intended managed path?
Does the proposed primitive create another runtime, deploy or secret-custody authority?
```

A strategy MUST NOT be frozen as executable while any required answer is unknown.

Secret values are never valid capability evidence. Presence, policy and server-side availability by name are sufficient.

### 2.2 CAPABILITY_MISMATCH_EXCEPTION

A factual executor/platform capability mismatch discovered during an implementation attempt qualifies for the exception only when all conditions are proven:

```text
FILES_CHANGED = 0
PROVIDER_MUTATION = 0
SECRET_EXPOSED = false
FAILURE_CLASS = factual executor/platform capability mismatch
```

When the exception applies:

```text
CONSOLIDATED_CORRECTIVE_CONSUMED = false
ARCHITECTURAL_SUBSTITUTION_WITHIN_STAGE = permitted
SHORT_REPLACEMENT_IMPACT_ANALYSIS = required
MAX_REPLACEMENT_STRATEGIES = 1
```

The exception does not permit scope growth, a third implementation strategy, secret handling by the Owner, bypass of security invariants, or mutation before the replacement IA is accepted.

If any repository/provider mutation occurred, if secret exposure occurred, or if the failure is an implementation defect rather than a capability mismatch, normal finite prompt-budget rules remain binding.

### 2.3 CI scope classification

For protected pull requests, change scope MUST be classified from the exact base/head diff.

```text
DOCS_ONLY = every changed path is under docs/**
TECHNICAL_CHANGE = any changed path exists outside docs/**
```

For `DOCS_ONLY = true`:

```text
documentation/governance validation = required
production build = prohibited as a mandatory gate
workerd proof = prohibited as a mandatory gate
Wrangler dry-run = prohibited as a mandatory gate
```

For `TECHNICAL_CHANGE = true`:

```text
existing full required technical gates = preserved
```

Workflow/config changes themselves are technical changes and therefore exercise the full gate before the optimization can reach `main`.

## 3. Branch-protection compatibility

Direct GitHub ruleset inspection at the baseline proves that `main` requires exactly these check contexts:

```text
Consolidated corrective exact-head Release Gate
Typecheck, build and deterministic route generation
```

The WRI-01 Worker Runtime Gate is not a required status check.

Therefore this change MUST preserve the two required check names and make each required workflow report a deterministic lightweight documentation result for docs-only diffs rather than suppressing the workflow trigger entirely.

This avoids the GitHub branch-protection failure mode in which a required context never materializes.

## 4. Documentation validation contract

The lightweight validator MUST run without dependency installation and MUST, at minimum:

- verify exact base/head SHA inputs;
- prove that the diff is non-empty and exclusively `docs/**`;
- run `git diff --check` on the exact commit range;
- reject unresolved merge-conflict markers in changed Markdown files;
- reject unbalanced fenced Markdown code blocks in changed Markdown files;
- emit auditable JSON evidence with base, head, changed files and validation results.

The validator MUST NOT execute application code, build the product, start workerd, execute Wrangler or access provider secrets.

## 5. WRI-01 gate scope

WRI-01 remains a specialized runtime gate. Documentation paths MUST NOT cause WRI-01 execution.

Its technical/runtime trigger surface remains intact. No WRI-01 runtime assertion is weakened for applicable technical changes.

## 6. Security and architecture impact

This governance change:

- does not alter tenant authority;
- does not alter authorization;
- does not alter RLS or grants;
- does not alter secret custody;
- does not alter Same-Backend Homologation Cell;
- does not alter Cloudflare/Supabase runtime behavior;
- does not authorize SPR-02 implementation;
- does not authorize DCA-01 external proof, BCA-01 or PR-M3.

The capability preflight strengthens Architecture First by requiring executor feasibility before implementation architecture is frozen.

## 7. Files allowed

```text
docs/architecture/impact-analysis/GOV-01-capability-preflight-and-ci-scope-optimization-impact-analysis.md
docs/architecture/governance/CAPABILITY_PREFLIGHT_AND_CI_SCOPE_GOVERNANCE_AMENDMENT.md
scripts/verify-documentation-governance.mjs
.github/workflows/release-gate.yml
.github/workflows/pr-m2-consolidated-corrective-gate.yml
.github/workflows/wri-01-worker-runtime-gate.yml
```

No product runtime, migration, database, Wrangler configuration or provider resource may change.

## 8. Definition of Done

GOV-01 is implementation-complete only when:

1. the capability-preflight rule is normative;
2. `CAPABILITY_MISMATCH_EXCEPTION` is normative and narrowly bounded;
3. the two required status-check names are unchanged;
4. docs-only PRs execute deterministic documentation validation without product build, workerd or Wrangler dry-run;
5. technical PRs continue executing the existing full required gates;
6. WRI-01 no longer triggers because of documentation paths;
7. the GOV-01 implementation PR itself executes the full gates because it changes workflows/scripts;
8. direct GitHub audit confirms only `FILES_ALLOWED` changed;
9. `main` remains unchanged until protected merge is explicitly safe relative to the concurrent SPR-02 executability audit.

## 9. State

```text
GOV01_IMPACT_ANALYSIS = Accepted
GOV01_IMPLEMENTATION_AUTHORIZED = true
GOV01_MAIN_MUTATION_AUTHORIZED_DURING_SPR02_AUDIT = false
SPR02_IMPLEMENTATION_STARTED_BY_GOV01 = false
DCA01_EXTERNAL_PROOF_STARTED_BY_GOV01 = false
```
