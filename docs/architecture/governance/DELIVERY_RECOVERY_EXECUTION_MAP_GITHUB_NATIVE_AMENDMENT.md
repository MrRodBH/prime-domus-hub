# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Accepted and binding**

```text
CURRENT_MAIN = 0f23e4198cf7caf1ad046a32b861f4397994a607
CURRENT_RUNTIME_MAIN = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
CURRENT_ACCEPTED_STAGE = PSG-01 Planning
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PSG01_PLANNING_PR = 44
PSG01_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
NEXT_ACTION = explicit authorization for PSG-01 implementation execution
LOVABLE_AUTHORIZED = false
```

**Authority:** explicit product-owner clarification that prompt budgets apply only to Lovable.  
**Related governance:** `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md`.

---

## 1. Purpose

This document governs the post-FRP delivery recovery path after the PPR-01 principal and corrective GitHub-native attempts were incorrectly terminalized through a Lovable-specific prompt-budget rule.

It preserves PR #33 as closed diagnostic history, records the accepted PPR-GN-01 replacement path, records the accepted PTW-01 planning and implementation path, records the accepted and merged PSG-01 Architecture First planning, and defines the next action without authorizing implementation.

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
PPR_GN_01_IMPLEMENTATION_HEAD = ca48472bb6b7676e4c61639a1528c66083ab1c36
PPR_GN_01_IMPLEMENTATION_MERGE_HEAD = 0b6aa1a0f5d9df8786a51acae91f24a6ded94ec2

PTW01_STATE = Accepted
PTW01_IMPLEMENTATION_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a
PTW01_IMPLEMENTATION_MERGE_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f

PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_PR = 44
PSG01_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_PLANNING_MERGED = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
```

Accepted implementation merge heads remain runtime authority for their respective stages. The PSG-01 planning merge and this later documentation-only reconciliation do not alter runtime.

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
| 7 | PTW-01 — Public Tenant-Bound Writers | Accepted | GitHub-native | PR #41 planning; PR #42 implementation; direct final audit; Release Gate |
| 8 | PSG-01 — Public Surface Security Gate | Planning Accepted and Merged; Implementation Pending Authorization | GitHub-native | planning PR #44 merged; Architecture First envelope accepted; no implementation authorization |
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

PPR-GN-01 is not a reopening of PR #33 and is not a renamed Lovable retry. It is the accepted GitHub-native replacement envelope created after the executor-governance clarification.

Accepted PPR-GN-01 Release Gate:

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

Accepted implementation properties include server-owned tenant authority, strict slug input, explicit 0/1/N cardinality, tenant post-validation, validated SEO and blocks, tenant-free DTO serialization, removal of route casts and removal of the hardcoded canonical fallback.

---

## 6. PTW-01 planning disposition

```text
STAGE_ID = PTW-01
PREDECESSOR = PPR-GN-01 Accepted
CANONICAL_ISSUE = 16
DUPLICATE_ISSUE = 12 — Closed as duplicate
PLANNING_PR = 41
AUDITED_PLANNING_CONTENT_HEAD = 84e9834afa9c30d42e60e7f79c13a12052685676
PLANNING_RELEASE_GATE_RUN = 29853391455
PLANNING_RELEASE_GATE_JOB = 88711618102
PLANNING_RELEASE_GATE_CONCLUSION = success
PLANNING_ARTIFACT_ID = 8504351243
PLANNING_ARTIFACT_DIGEST = sha256:bcf74ef966248f43271b93c32a5c3ff2bfb18a76b2aabc8e9dfbaa48aaadc91b
PLANNING_STATE = Accepted
AUTHORIZED_EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
```

Accepted planning authority:

```text
docs/architecture/impact-analysis/PTW-01-public-tenant-bound-writers-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptw-01-public-writer-authority-inventory.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptw-01-planning-acceptance.md
```

The planning acceptance includes the binding schema clarification that public form fields must be queried and validated by the composite authority `accepted tenant.id + accepted form.id`.

---

## 7. PTW-01 final implementation disposition

```text
STAGE_ID = PTW-01
IMPLEMENTATION_PR = 42
IMPLEMENTATION_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a
IMPLEMENTATION_MERGE_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
IMPLEMENTATION_MERGED = true
FINAL_EXTERNAL_AUDIT = Accepted
IMPLEMENTATION_STATE = Accepted
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
```

The implementation was merged only after direct final audit acceptance and expected-head protection.

Accepted Release Gate:

```text
RELEASE_GATE_RUN = 29866481241
RELEASE_GATE_JOB = 88755888278
RELEASE_GATE_CONCLUSION = success
ARTIFACT_ID = 8509468989
ARTIFACT_DIGEST = sha256:269182b91d0b242a7117505d3414cdd879b9bb2b567f76cb5b71410bb711ca82
ARTIFACT_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a

PTC01 = 10 passed, 0 failed
PTR01 = 7 passed, 0 failed
PSC01 = 11 passed, 0 failed
PPR_GN_01 = 13 passed, 0 failed
PTW01_AUTHORITY = 14 passed, 0 failed
PTW01_SQL_STRUCTURAL = 8 passed, 0 failed
LSH01_UNIT = 22 passed, 0 failed
LSH01_RUNTIME = 15 passed, 0 failed
LSH01_STRUCTURAL = 27 passed, 0 failed
LSH01_SQL_STRUCTURAL = 17 passed, 0 failed
TYPECHECK = success
BUILD = success
BUILD_DEV = success
DETERMINISTIC_ROUTE_TREE = success
```

Accepted implementation properties:

- Host-derived authority before service-role access for direct leads, forms, campaign events and Meta CAPI;
- exact tenant-scoped resource cardinality and post-validation;
- shared public lead writer across direct, form, portal and DLQ replay paths;
- portal connector authority with 0/1/N handling;
- tenant-bound property, launch, broker, form, field, campaign, Meta and portal operations;
- safe feed distinction between zero total links, explicit eligible links and existing noneligible links;
- exact and idempotent hardening of `events_public_insert`;
- anonymous DML revocation restricted to `anon`, preserving authenticated and server-side behavior;
- no reopening of accepted LSH, Auth, Storage, tenant middleware or `create_manual_lead` boundaries.

Canonical final evidence:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptw-01-final-acceptance.md
```

---

## 8. PSG-01 planning final disposition

```text
STAGE_ID = PSG-01
PREDECESSOR = PTW-01 Accepted
CANONICAL_ISSUE = 4
PLANNING_PR = 44
PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PLANNING_MERGED = true
FINAL_EXTERNAL_PLANNING_AUDIT = Accepted
PLANNING_STATE = Accepted
AUTHORIZED_EXECUTOR = GitHub-native
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
LOVABLE_AUTHORIZED = false
```

Accepted planning Release Gate:

```text
RELEASE_GATE_RUN = 29878588233
RELEASE_GATE_JOB = 88794376960
RELEASE_GATE_CONCLUSION = success
ARTIFACT_ID = 8513950228
ARTIFACT_DIGEST = sha256:e91cc43630348de299cba6f13794c0a87171321ba7360de99b3cf55b8f47e0b8
ARTIFACT_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
```

Accepted planning authority:

```text
docs/architecture/impact-analysis/PSG-01-public-surface-security-gate-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/psg-01-public-surface-security-inventory.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/psg-01-planning-submission.md
```

The planning merge is documentation-only and does not authorize or start runtime implementation.

---

## 9. Binding next action

```text
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
NEXT_ACTION = explicit authorization for PSG-01 implementation execution
AUTHORIZED_EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
```

PSG-01 implementation may begin only after explicit product-owner authorization. Planning acceptance and merge do not implicitly authorize runtime, dependency, migration, RLS, grant, Auth, Storage or security implementation.
