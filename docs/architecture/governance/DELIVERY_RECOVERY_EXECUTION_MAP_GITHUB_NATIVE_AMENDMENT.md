# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Historical recovery authority preserved; RPD-01 Accepted and merged; reconciliation ready for direct external audit**

```text
CURRENT_MAIN_HEAD = 1acf99e272e448e834b52a0018e3d34b79f0a133
CURRENT_ACCEPTED_STAGE = RPD-01
RPD01_ACCEPTED = true
RPD01_PLANNING_MERGED = true
RPD01_RECONCILIATION_STATE = Ready for Direct External Audit
RPD01_RECONCILIATION_MERGED = false
NEXT_STAGE_AUTHORIZED = none
```

## 1. Purpose

This amendment preserves the factual GitHub-native recovery chain that restored the accepted generated `Register` authority and reconciles it with the accepted Product Delivery roadmap. It no longer defines a separate successor chain after HRI-01.

Current authority order:

1. audited GitHub `main`;
2. permanent architecture and security invariants;
3. accepted stage-specific records;
4. `ROADMAP_ARCHITECTURAL.md` and `FINITE_ROADMAP_EXECUTION_MAP.md` as reconciled by RPD-01;
5. this amendment for recovery history and continuity only.

Rejected, Superseded and historical records do not regain executable authority.

## 2. Completed recovery chain

```text
GNR-01 = Accepted
HRR-01 = Accepted
HRC-01 = Rejected — Terminal
HRI-01 = Accepted / Closed
RPD-01 = Accepted
```

HRI-01 established:

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

The sole accepted authority is emitted by the official TanStack/Vite generator in `src/routeTree.gen.ts`.

## 3. RPD-01 accepted evidence

```text
RPD01_PLANNING_PR = 55
RPD01_PLANNING_HEAD = 8a56c758ca1d8b127dd0ee736769f0b4171f4c7d
RPD01_PLANNING_RELEASE_GATE_RUN_ID = 30132995455
RPD01_PLANNING_RELEASE_GATE_JOB_ID = 89611181337
RPD01_PLANNING_RELEASE_GATE_RESULT = success
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_ID = 8611824397
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:7052f7f3b31e4aaadf23f32a4004a2d3d9c3081cb84090fb130c0dc44d80bb86

RPD01_PLANNING_MERGED = true
RPD01_PLANNING_MERGE_METHOD = squash
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

POST_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308
```

The post-merge run checked out `main` at the exact merge SHA and completed dependency installation, release verification, development and production builds, typecheck, deterministic route generation and evidence upload successfully.

## 4. Current Product Delivery path

The recovery chain is complete. The current future-delivery authority is:

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted
→ PR-M2 Planned — Blocked pending explicit authorization
→ PR-M3
→ Pre-Homologation Release Candidate Deploy
→ TH-M1
→ TH-M2
→ LSV-03
→ Homologação formal
→ Produção
```

This amendment does not authorize any successor.

## 5. Historical-stage disposition

```text
RRS-01 = Superseded by GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

No deliverable, budget or authorization is transferred automatically from LSV-02, LSR-01, LSR-02, FRP-01, HVP-01 or HRC-01.

## 6. Permanent invariants

```text
SERVER_IS_SOLE_TENANT_AUTHORITY = true
CLIENT_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
PATH_TENANT_AUTHORITY = false
FAIL_FAST = true
FAIL_CLOSED = true
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_CANONICAL_FALLBACK = prohibited
```

## 7. Product-discovery contract

Future PR-M2 and PR-M3 planning may incorporate factual capabilities discovered by direct repository audit and product testing. Portal, marketing, CRM, CMS, dashboard and Super Admin catalogs remain extensible, but silent scope expansion, tenant-specific forks, client authority, duplicate CMS runtime and direct Super Admin tenant authority remain prohibited.

## 8. Scope integrity of this reconciliation

```text
RUNTIME_FILES_CHANGED = 0
FRONTEND_FILES_CHANGED = 0
CMS_RUNTIME_FILES_CHANGED = 0
CRM_RUNTIME_FILES_CHANGED = 0
SUPER_ADMIN_RUNTIME_FILES_CHANGED = 0
DATABASE_AUTH_STORAGE_CHANGED = 0
WORKFLOW_CHANGED = 0
DEPLOY_EXECUTED = false
LIVE_TESTING_EXECUTED = false
```

## 9. Budget and authorization

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2

PRM2_PLANNING_AUTHORIZED = false
PRM2_IMPLEMENTATION_AUTHORIZED = false
PRM3_IMPLEMENTATION_AUTHORIZED = false
LOVABLE_EXECUTION_AUTHORIZED = false
DEPLOY_AUTHORIZED = false
LIVE_TESTING_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```
