# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Accepted and binding**

**Current audited `main`:** `0b6aa1a0f5d9df8786a51acae91f24a6ded94ec2`  
**Authority:** explicit product-owner clarification that prompt budgets apply only to Lovable  
**Related governance:** `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md`

---

## 1. Purpose

This document governs the post-FRP delivery recovery path after the PPR-01 principal and corrective GitHub-native attempts were incorrectly terminalized through a Lovable-specific prompt-budget rule.

It preserves PR #33 as closed diagnostic history, records the accepted PPR-GN-01 replacement path and defines the next authorized gate.

---

## 2. Historical disposition

### PPR-01

```text
PPR01_PROCESS_CLASSIFICATION = Superseded
PPR01_PR_33_STATE = Closed — Unmerged
PPR01_PR_33_REOPEN_AUTHORIZED = false
PPR01_PR_33_MERGE_AUTHORIZED = false
PPR01_BRANCH_ACCEPTED_AS_AUTHORITY = false
PPR01_TECHNICAL_OBJECTIVE_COMPLETED = false
```

Reason for `Superseded`:

- the prior `Rejected — terminal` decision relied on a prompt-budget rule that does not apply to direct GitHub-native execution;
- PR #33 remained red and was never merged;
- its code and CI findings remain diagnostic history only;
- PPR-GN-01 restarted from audited `main` under the accepted GitHub-native governance amendment.

The supersession changes the process classification only. It does not retroactively accept PR #33.

---

## 3. Accepted predecessor state

```text
PSC01_STATE = Accepted
PSC01_RUNTIME_HEAD = e5032890c7cc44dd03990d4e462ec3b3bb723be0
PSC01_ACCEPTANCE_HEAD = 871b5aa962e71cf3da5c585392f32b4cbca987e6
PPR_GN_01_STATE = Accepted
CURRENT_MAIN_HEAD = 0b6aa1a0f5d9df8786a51acae91f24a6ded94ec2
```

The audited `main` remains the sole implementation authority.

---

## 4. Current execution sequence

| Order | Stage | State | Executor | Control model |
|---:|---|---|---|---|
| 1 | DRA-01 | Accepted | direct GitHub audit | complete |
| 2 | GNR-01 | Accepted | GitHub-native | Release Gate |
| 3 | PTC-01 | Accepted | GitHub-native | Release Gate |
| 4 | PSC-01 | Accepted | GitHub-native | Release Gate |
| 5 | PPR-01 | Superseded | historical GitHub-native PR #33 | closed unmerged; diagnostic only |
| 6 | PPR-GN-01 — Public Page GitHub-Native Completion | Accepted | GitHub-native | PR #38; direct final audit; Release Gate |
| 7 | PTW-01 | Planning Authorized | GitHub-native | Architecture First; implementation not authorized |
| 8 | PSG-01 | Planned — Blocked by PTW-01 | GitHub-native | no implementation authorization |
| 9 | HVP-01 | Planned — Blocked by PSG-01 | runbook/operator | evidence gate |
| 10 | VSP-01 | Optional — Not authorized | Lovable only when triggered by HVP-01 | Lovable-specific budget |
| 11 | Controlled Homologation | Blocked | operator/product team | acceptance gate |

---

## 5. PPR-GN-01 final disposition

```text
STAGE_ID = PPR-GN-01
PREDECESSOR = PSC-01 Accepted
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
IMPLEMENTATION_PR = 38
IMPLEMENTATION_HEAD = ca48472bb6b7676e4c61639a1528c66083ab1c36
MERGE_HEAD = 0b6aa1a0f5d9df8786a51acae91f24a6ded94ec2
FINAL_EXTERNAL_AUDIT = Accepted
STATE = Accepted
```

PPR-GN-01 is not a reopening of PR #33 and is not a renamed Lovable retry.

It is the accepted GitHub-native replacement envelope created after the executor-governance clarification.

---

## 6. Accepted implementation evidence

PR #38 was merged only after direct final audit acceptance with expected-head protection.

```text
RELEASE_GATE_RUN = 29848399476
RELEASE_GATE_JOB = 88694757635
RELEASE_GATE_CONCLUSION = success
ARTIFACT_ID = 8502371728
ARTIFACT_DIGEST = sha256:1006a5c950bfff937aa4a4723b05e74f8825a263b53cdc9f9d5901ec897b7c66

PTC01 = 10 passed, 0 failed
PTR01 = 7 passed, 0 failed
PSC01 = 11 passed, 0 failed
PPR_GN_01 = 13 passed, 0 failed

TYPECHECK = success
BUILD = success
BUILD_DEV = success
ROUTE_TREE_DIGEST_A_B_C = cce40b0d1a66716df8768468b86233e12ca896dcfb2c3e1954f912e45a1a828c
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
```

Accepted implementation properties:

- tenant authority remains server-owned;
- input accepts only strict `{ slug }`;
- tenant equality precedes slug equality;
- public query reads at most two rows;
- cardinality is explicit as 0/1/N;
- returned rows are revalidated against the accepted tenant;
- malformed or foreign rows fail closed;
- blocks and SEO are validated before serialization;
- `tenant_id` is excluded from the public DTO;
- route-level unsafe casts were removed;
- hardcoded RM Prime canonical fallback was removed.

---

## 7. Scope integrity

The accepted PR changed exactly:

```text
package.json
run-public-page-runtime-verification-specs.ts
scripts/verify-release.mjs
src/lib/__tests__/public-page-runtime-verification.spec.ts
src/lib/api/pages.functions.ts
src/lib/public-page-contract.ts
src/routes/p.$slug.tsx
```

No dependency version, lockfile, workflow definition, database, migration, RLS, grant, Auth, Storage, generated route, renderer or public-writer change was introduced.

---

## 8. Binding next action

```text
NEXT_STAGE_AUTHORIZED = PTW-01 planning only
PTW01_PLANNING_AUTHORIZED = true
PTW01_IMPLEMENTATION_AUTHORIZED = false
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
MAX_ACTIVE_PTW01_PLANNING_PRS = 1
```

PTW-01 must begin with direct audit of current public mutation contracts and an accepted Impact Analysis before any implementation.

PTW-01 implementation, PSG-01 and Lovable remain blocked until their respective explicit gates are satisfied.
