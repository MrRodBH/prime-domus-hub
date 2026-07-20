# HYBRID DELIVERY EXECUTION MODEL

## Status

**Accepted — binding delivery governance**

**Effective date:** 2026-07-20  
**Repository:** `MrRodBH/prime-domus-hub`  
**Branch of technical authority:** `main`  
**Product:** Plataforma SaaS White Label para corretores de imóveis e imobiliárias

This decision was explicitly authorized by the product owner after repeated execution loops, budget overrun and insufficient interpretation fidelity in external implementation prompts.

---

## 1. Objective

Establish a finite, evidence-driven execution model that minimizes external interactions, preserves architectural safety and produces a realistic path to homologation.

The model separates architectural authority, implementation authority and visual-product assistance.

```text
GitHub main + direct audit
  = technical source of truth, architecture, roadmap, evidence and acceptance

GitHub-native executor
  = runtime, security, migrations, RLS, Auth, Storage, build, CI and toolchain

Lovable
  = limited visual/product executor after technical boundaries are frozen
```

---

## 2. Source of truth

The current audited state of `main` is the final technical source of truth.

Reports produced by Lovable or any external executor are indexes of claimed execution only. They are not sufficient evidence for acceptance when the repository, diff, tests or runtime evidence can be inspected directly.

Acceptance MUST be based on, as applicable:

- commit SHA and ancestry;
- changed-file inventory;
- effective file content;
- executable tests and exit codes;
- build and typecheck results;
- CI status;
- database, Auth, Storage or operational evidence gathered through an authorized runbook;
- persisted evidence artifacts.

A declarative field such as `TESTS_PASSED = true` is not evidence without the underlying command result.

---

## 3. Executor allocation

### 3.1 GitHub-native mandatory scope

The following domains MUST NOT be delegated to Lovable as primary executor:

- tenant authority and multi-tenancy;
- authorization, impersonation and membership boundaries;
- public server writers and public data resolution;
- migrations, RLS, grants, policies and SQL functions;
- Auth administration and privileged bootstrap surfaces;
- Storage authority and signed-URL boundaries;
- cron, queues, webhooks, outbound integrations and maintenance controls;
- build, typecheck, dependency, generator and toolchain stabilization;
- CI and release evidence;
- canonical architecture, roadmap and governance documents.

These domains require GitHub-native implementation through a reviewable branch and pull request, followed by direct audit.

### 3.2 Lovable-eligible scope

Lovable MAY be used only when all relevant technical boundaries are already frozen and the work is predominantly:

- layout and responsive behavior;
- visual components;
- content presentation;
- UX refinements;
- conventional CRUD wiring that does not change authority, security or schema;
- bounded visual defect correction.

Every Lovable task MUST have:

- one objective;
- a small explicit file scope;
- no architectural decision delegated to the executor;
- binary acceptance criteria;
- direct GitHub audit after execution.

### 3.3 Mandatory executor change

If a principal implementation and its single consolidated corrective fail, the same material problem MUST NOT be restarted under another stage identifier with the same executor.

The next decision MUST be one of:

- change executor;
- formally reduce scope before a new stage begins;
- terminalize as `Blocked External` when the remaining dependency is external;
- reject or supersede the path.

---

## 4. Interaction and financial budget

### 4.1 Before controlled homologation

```text
Lovable execution budget: 0
Lovable documentary confirmations: 0
Lovable governance prompts: 0
```

All release-critical work is GitHub-native until the public security boundary and release gate are accepted.

### 4.2 Visual stabilization after technical acceptance

A maximum of two Lovable executions is permitted before homologation:

```text
1 principal visual stabilization package
+ 1 consolidated visual corrective
= absolute maximum 2 executions
```

This budget is global for the pre-homologation visual package, not per screen or per defect.

### 4.3 Documentation

Documentation, terminal reconciliation, roadmap maintenance, audit confirmation and governance holds MUST be performed directly in GitHub without Lovable interaction.

---

## 5. Required workflow

```text
Audited main
→ release-criticality decision
→ frozen GitHub-native execution envelope
→ branch and pull request
→ automated and structural evidence
→ direct audit
→ merge or rejection
→ next authorized gate
```

No successor begins merely because a report says it is ready.

---

## 6. Release scope control

Every remaining item MUST be classified as exactly one of:

- `RELEASE_BLOCKING`;
- `POST_HOMOLOGATION`;
- `BACKLOG`.

Rules:

1. `POST_HOMOLOGATION` items cannot enter the release-critical path.
2. `BACKLOG` items receive no implementation work before homologation.
3. New findings can become `RELEASE_BLOCKING` only when they demonstrate a concrete security, correctness, integrity, build or testability failure.
4. Broad product completion is not a prerequisite for controlled homologation.

---

## 7. Permanent invariants

This model does not relax any existing invariant:

- server is the sole tenant and authorization authority;
- client, headers and paths are never authorities;
- no fallback tenant, tenant default, heuristic, dual path or authoritative `ORDER BY/LIMIT 1`;
- ambiguous or absent authority fails closed;
- Super Admin requires explicit server-validated impersonation for tenant scope;
- Storage does not trust client path or filename;
- signed URL is not primary authorization;
- Same-Backend Homologation Cell remains binding;
- external Supabase is not a canonical fallback;
- accepted phases and terminal stages are not reopened.

---

## 8. Supersession

This document supersedes any earlier operational rule that treated the Lovable report as the standard audit source or GitHub inspection as exceptional.

It does not supersede accepted architectural or security contracts. Where delivery-process wording conflicts, this document and the direct-audit rule prevail because they are more restrictive and were explicitly authorized by the product owner.
