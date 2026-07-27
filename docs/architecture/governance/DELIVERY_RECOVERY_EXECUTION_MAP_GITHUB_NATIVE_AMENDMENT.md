# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Historical recovery authority preserved; RPD-01 Accepted / Closed**

```text
CURRENT_MAIN_HEAD = acdc461b0a3c430339c7d07d0fafc94063eca5d8
CURRENT_ACCEPTED_STAGE = RPD-01
RPD01_STATE = Accepted / Closed
RPD01_ACCEPTED = true
RPD01_PLANNING_MERGED = true
RPD01_RECONCILIATION_MERGED = true
RPD01_CLOSURE_COMPLETE = true
NEXT_STAGE_AUTHORIZED = none
```

## 1. Purpose and authority

This amendment preserves the factual GitHub-native recovery chain that restored the accepted generated `Register` authority. It does not define a separate successor chain after HRI-01.

Authority order:

1. audited GitHub `main`;
2. permanent architecture and security invariants;
3. accepted stage-specific records;
4. `ROADMAP_ARCHITECTURAL.md`, `FINITE_ROADMAP_EXECUTION_MAP.md` and the accepted RPD-01 record;
5. this amendment for recovery history and continuity only.

Rejected, Superseded and historical records do not regain executable authority.

## 2. Completed recovery chain

```text
GNR-01 = Accepted
HRR-01 = Accepted
HRC-01 = Rejected — Terminal
HRI-01 = Accepted / Closed
RPD-01 = Accepted / Closed
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

## 3. RPD-01 terminal evidence

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

POST_PLANNING_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_PLANNING_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_PLANNING_MERGE_RELEASE_GATE_EVENT = push
POST_PLANNING_MERGE_RELEASE_GATE_BRANCH = main
POST_PLANNING_MERGE_RELEASE_GATE_HEAD_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133
POST_PLANNING_MERGE_RELEASE_GATE_RESULT = success
POST_PLANNING_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_PLANNING_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308

RPD01_RECONCILIATION_FINAL_AUDIT = Accepted
RPD01_RECONCILIATION_MERGE_AUTHORIZED = true
RPD01_RECONCILIATION_PR = 56
RPD01_RECONCILIATION_HEAD = 90b4792b90e66883ebcb1caa62dad9b644793f93
RPD01_RECONCILIATION_RELEASE_GATE_RUN_ID = 30164381209
RPD01_RECONCILIATION_RELEASE_GATE_JOB_ID = 89694819354
RPD01_RECONCILIATION_RELEASE_GATE_RESULT = success
RPD01_RECONCILIATION_RELEASE_GATE_ARTIFACT_ID = 8621159498
RPD01_RECONCILIATION_RELEASE_GATE_ARTIFACT_DIGEST = sha256:487c976138a033a5d7fe44b51cc517a589e35862aeacfc1437688f1ef6c3081e
RPD01_RECONCILIATION_MERGE_METHOD = squash
RPD01_RECONCILIATION_MERGE_SHA = acdc461b0a3c430339c7d07d0fafc94063eca5d8
RPD01_RECONCILIATION_MERGED = true

FINAL_PUSH_RELEASE_GATE_RUN_ID = 30270513019
FINAL_PUSH_RELEASE_GATE_JOB_ID = 89991615902
FINAL_PUSH_RELEASE_GATE_EVENT = push
FINAL_PUSH_RELEASE_GATE_BRANCH = main
FINAL_PUSH_RELEASE_GATE_HEAD_SHA = acdc461b0a3c430339c7d07d0fafc94063eca5d8
FINAL_PUSH_RELEASE_GATE_RESULT = success
FINAL_PUSH_RELEASE_GATE_ARTIFACT_ID = 8654686143
FINAL_PUSH_RELEASE_GATE_ARTIFACT_DIGEST = sha256:5b16716597c3dd036ffb7a6600ff6e62768adc8a04293d84b0f891acda6fb400
```

## 4. Current Product Delivery path

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted / Closed
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

## 6. Preserved delivery contract

The accepted detailed contracts remain authoritative in:

- `docs/architecture/ROADMAP_ARCHITECTURAL.md`;
- `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`;
- `docs/architecture/governance/RPD-01-product-delivery-rebaseline.md`;
- `docs/architecture/impact-analysis/RPD-01-roadmap-product-delivery-rebaseline-impact-analysis.md`.

They preserve:

- configurable `portal_name` and validated `integration_method`;
- Portal Connector Registry fields, secure credential references and versionable adapters;
- Cloudflare alternatives `MANUAL_ASSISTED`, `API_AUTOMATED` and `HYBRID`;
- CMS and CRM functional inventories;
- CMS Component and Layout Registry schema and explicit CMS taxonomy;
- deterministic dashboard authority and final-presentation split;
- Super Admin global Control Plane inventory and impersonation boundary;
- TH-M1 end-to-end flows and TH-M2 concrete classification;
- ownership matrix across PR-M2, PR-M3, TH-M1 and TH-M2;
- Product Discovery, Customization and Test Feedback Contract.

## 7. Permanent invariants

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

## 8. Product Discovery, Customization & Test Feedback Contract

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PROVIDER_CATALOG_IS_EXTENSIBLE = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
SILENT_SCOPE_EXPANSION_AFTER_STAGE_START = prohibited
RETROACTIVE_DEFINITION_OF_DONE_EXPANSION = prohibited
UNBOUNDED_IMPLEMENTATION_PROMPTS = prohibited
TENANT_SPECIFIC_CODE_FORKS = prohibited
CLIENT_SIDE_AUTHORITY = prohibited
PARALLEL_CMS_RUNTIME = prohibited
DUPLICATE_CMS_EDITOR_PATH = prohibited
SUPER_ADMIN_DIRECT_TENANT_AUTHORITY = prohibited
```

## 9. Scope integrity

```text
FILES_CHANGED = 6
FILES_OUTSIDE_ALLOWED = 0
RUNTIME_FILES_CHANGED = 0
FRONTEND_FILES_CHANGED = 0
CMS_RUNTIME_FILES_CHANGED = 0
CRM_RUNTIME_FILES_CHANGED = 0
SUPER_ADMIN_RUNTIME_FILES_CHANGED = 0
DEPENDENCIES_CHANGED = 0
DATABASE_AUTH_STORAGE_CHANGED = 0
WORKFLOW_CHANGED = 0
DEPLOY_EXECUTED = false
LIVE_TESTING_EXECUTED = false
LOVABLE_EXECUTED = false
CODEX_EXECUTED = false
```

## 10. Budget and authorization

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = true
RPD01_REMAINING_PROMPT_BUDGET = 0/2
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
