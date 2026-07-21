# GITHUB-NATIVE EXECUTION GOVERNANCE AMENDMENT

## Status

**Accepted by explicit product-owner decision — normative amendment pending merge to `main`**

**Repository:** `MrRodBH/prime-domus-hub`  
**Technical authority:** audited `main`  
**Decision date:** 2026-07-21  
**Product:** Plataforma SaaS White Label para corretores de imóveis e imobiliárias

---

## 1. Decision

The principal/corrective prompt budget was created to control external natural-language execution through Lovable: financial cost, interpretation drift, repeated implementation loops and unverifiable self-reporting.

That budget does **not** apply to direct GitHub-native work performed through auditable repository operations.

```text
LOVABLE_PROMPT_BUDGET_APPLICABLE = true
GITHUB_NATIVE_PROMPT_BUDGET_APPLICABLE = false
GITHUB_NATIVE_COMMIT_COUNT_IS_PROMPT_CONSUMPTION = false
GITHUB_NATIVE_CI_ITERATION_IS_PROMPT_CONSUMPTION = false
```

The quantitative Lovable ceiling already frozen by each applicable stage remains unchanged. This amendment changes applicability, not the approved Lovable ceiling.

---

## 2. Supersession boundary

This amendment supersedes every delivery-process clause that applies the Lovable prompt-count ceiling to:

- direct GitHub file edits;
- commits on a review branch;
- pull-request revisions;
- CI-driven corrective commits;
- direct audit and documentary reconciliation;
- evidence collection through GitHub Actions;
- GitHub-native implementation by ChatGPT, a code agent or a developer.

It does not supersede:

- Architecture First;
- mandatory Impact Analysis for structural or runtime-relevant changes;
- architectural and security invariants;
- `FILES_ALLOWED`;
- direct diff audit;
- branch and pull-request review;
- Release Gate requirements;
- fail-fast and fail-closed behavior;
- prohibition of concurrent flows for the same material stage;
- prohibition of Lovable execution where Lovable is not authorized.

Where `FINITE_DELIVERY_GOVERNANCE.md`, `FINITE_ROADMAP_EXECUTION_MAP.md`, an Execution Envelope or a historical report states that a GitHub-native stage became terminal solely because a principal/corrective prompt count was exhausted, this amendment is the controlling delivery-process authority.

---

## 3. Lovable governance

Lovable remains governed by a finite prompt budget because each invocation can create financial cost and interpretation drift.

For Lovable work:

- the stage-specific principal/corrective ceiling remains binding;
- reports are not proof when GitHub can be audited directly;
- no stage renaming may be used to bypass the Lovable ceiling;
- after the allowed Lovable attempts are exhausted, the decision must be terminalization, scope reduction or executor change.

```text
LOVABLE_GOVERNANCE_UNCHANGED = true
LOVABLE_REPORT_IS_FINAL_TECHNICAL_AUTHORITY = false
```

---

## 4. GitHub-native change control

GitHub-native work is not unlimited or informal. It is controlled by evidence rather than prompt count.

Every GitHub-native runtime stage MUST have:

1. an audited `main` baseline;
2. an accepted Impact Analysis or frozen execution envelope;
3. one active implementation branch and one active implementation PR;
4. explicit `FILES_ALLOWED` and prohibitions;
5. deterministic tests and a Release Gate;
6. direct inspection of every corrective diff;
7. a concrete failing observation before each corrective change;
8. no merge before final audit acceptance.

Corrections MAY continue in the same branch and PR while they remain inside the frozen scope and are justified by new factual evidence.

A CI failure MUST NOT automatically terminalize a GitHub-native stage because of the number of prior commits or conversational instructions.

```text
GITHUB_NATIVE_MAX_PARALLEL_IMPLEMENTATION_PRS_PER_STAGE = 1
GITHUB_NATIVE_SPECULATIVE_CORRECTION_ALLOWED = false
GITHUB_NATIVE_EVIDENCE_DRIVEN_CORRECTION_REQUIRED = true
GITHUB_NATIVE_MERGE_BEFORE_FINAL_AUDIT = false
```

---

## 5. Anti-loop controls for GitHub-native work

The absence of a prompt ceiling does not authorize blind loops.

A GitHub-native correction is valid only when all conditions below are met:

- the preceding run reached a terminal result;
- the exact failure or audit finding is identified;
- the proposed change is causally connected to that failure;
- the diff remains inside `FILES_ALLOWED`;
- no previously green invariant is weakened;
- the same unchanged attempt is not merely repeated;
- the Release Gate is rerun after the change.

The stage must be re-planned or explicitly stopped when:

- the required correction exceeds the accepted scope;
- a new architectural decision is required;
- the same root cause recurs without new diagnostic evidence;
- external dependencies make repository-only completion impossible;
- the expected value no longer justifies continued work.

---

## 6. Terminal-state semantics

Terminal states describe technical or strategic disposition, not prompt consumption.

For GitHub-native work, a stage may become:

- `Accepted` when the Definition of Done is proven;
- `Accepted with Non-Blocking Backlog` when only non-blocking work remains;
- `Blocked External` when repository work is complete but an external dependency is absent;
- `Rejected` when the implementation or path is intentionally abandoned;
- `Superseded` when a new explicit decision replaces the prior envelope or classification.

A GitHub-native stage MUST NOT be marked `Rejected` solely because two repository correction cycles occurred.

---

## 7. PPR-01 consequence

The prior classification of PPR-01 as `Rejected — terminal` was based on applying the Lovable prompt budget to direct GitHub-native execution.

That process rationale is superseded by this amendment.

The PR itself remains closed and unmerged:

```text
PR_33_REOPEN_AUTHORIZED = false
PR_33_MERGE_AUTHORIZED = false
REJECTED_BRANCH_IS_ACCEPTED_AUTHORITY = false
```

The technical objective remains release-blocking and must be re-planned from the audited `main` under a new GitHub-native envelope.

The prior branch and its CI evidence may be used only as diagnostic history. Every accepted implementation claim must be re-derived from the current `main` and proven in a new reviewable PR.

---

## 8. Binding workflow

```text
Audited main
→ accepted GitHub-native Impact Analysis
→ one implementation branch and PR
→ evidence-driven corrections in the same PR when required
→ complete Release Gate
→ direct final audit
→ merge or explicit stop/replan
```

```text
LOVABLE_AUTHORIZED_FOR_PPR_REPLANNING = false
NEXT_GOVERNANCE_ACTION = accept PPR-GN-01 planning envelope
```
