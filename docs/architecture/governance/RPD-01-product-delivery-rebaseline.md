# RPD-01 — Product Delivery Rebaseline

## Status

**Accepted — planning merged; post-merge Release Gate successful; documentary reconciliation ready for direct external audit**

```text
STAGE_ID = RPD-01
EXECUTOR = ChatGPT GitHub-native
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted
RPD01_ACCEPTED = true

BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

RPD01_RECONCILIATION_STATE = Ready for Direct External Audit
RPD01_RECONCILIATION_MERGED = false
```

## 1. Purpose

RPD-01 reconciles the remaining Product Delivery path after accepted HRI-01 closure. It establishes one current, finite and auditable sequence that places functional completion and final UX before internal UAT, consolidated remediation, controlled security validation, formal homologation and production.

RPD-01 is documentation-only. It does not implement product behavior, modify runtime, deploy an environment or start live testing.

## 2. Authority

Authority order:

1. audited GitHub `main`;
2. permanent architecture and security invariants;
3. accepted HRI-01 closure evidence;
4. this accepted RPD-01 record;
5. reconciled roadmap and finite execution map;
6. historical documents for traceability only.

Rejected, Superseded and historical states cannot regain current authority.

## 3. Accepted evidence

Planning PR and pre-merge gate:

```text
RPD01_PLANNING_PR = 55
RPD01_PLANNING_HEAD = 8a56c758ca1d8b127dd0ee736769f0b4171f4c7d
RPD01_PLANNING_RELEASE_GATE_RUN_ID = 30132995455
RPD01_PLANNING_RELEASE_GATE_JOB_ID = 89611181337
RPD01_PLANNING_RELEASE_GATE_RESULT = success
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_ID = 8611824397
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:7052f7f3b31e4aaadf23f32a4004a2d3d9c3081cb84090fb130c0dc44d80bb86
```

Protected merge:

```text
RPD01_PLANNING_MERGED = true
RPD01_PLANNING_MERGE_METHOD = squash
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133
```

Post-merge gate:

```text
POST_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308
```

The post-merge run checked out `main` at `1acf99e272e448e834b52a0018e3d34b79f0a133`, completed dependency installation, development and production builds, typecheck, deterministic route generation and evidence upload. The final release-verifier result was `PASS`.

## 4. Preserved architecture

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

CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

## 5. Reconciled sequence

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted
→ PR-M2 Planned — Blocked pending explicit authorization
→ PR-M3 Product UX Refactor, Final Interface and Operational Readiness
→ Pre-Homologation Release Candidate Deploy
→ TH-M1 Pre-Homologation End-to-End Product Validation and UAT
→ TH-M2 Consolidated Remediation, Regression and Product Acceptance
→ LSV-03 Same-Backend Controlled Security and Multi-Tenant Validation
→ Formal Homologation
→ Production
```

The Release Candidate Deploy is an exit deliverable of PR-M3. TH-M1 is internal validation, not formal homologation. LSV-03 follows product acceptance and is not used for ordinary functional or UX discovery.

## 6. Historical disposition

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

No historical record is deleted. Only stale executable authority is removed.

## 7. PR-M2 ownership

PR-M2 owns audited functional completion of:

- tenant creation, lifecycle and onboarding;
- users, memberships, roles and permissions;
- Configuration Center;
- domains, DNS/TXT, Cloudflare decision, SSL, anti-takeover and publication;
- white label, public site and CMS;
- Content Workspace, editor, page builder, templates, components and workflow;
- properties, media and site/portal publication;
- extensible portal connector registry;
- extensible marketing and tracking connector registry;
- automatic campaign-lead ingestion into CRM/Kanban;
- CRM, Kanban, funnel, histories, conversations, tasks, reports and automations;
- tenant dashboard functional authority;
- Super Admin SaaS Control Plane functional authority;
- plans, entitlements, limits, billing visibility and integration diagnostics.

Every capability must be classified by direct repository audit before implementation is frozen.

## 8. PR-M3 ownership

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

The UX/product professional joins during final PR-M2 discovery and handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

PR-M3 owns final interface and operational readiness for Tenant Admin, Super Admin Control Plane, CRM, CMS, dashboards, reports, onboarding, domains, portals and campaigns.

Dashboard images supplied by the Product Owner are references only for information density, composition, card organization, metric hierarchy and operational visibility. They do not define palette, typography, brand identity or final component style.

## 9. TH-M1, TH-M2 and LSV-03

TH-M1 executes internal end-to-end validation of tenant onboarding, domains, site, CMS, properties, portals, Tenant Admin, CRM, marketing/tracking and Super Admin operations. It must produce one consolidated findings report.

TH-M2 owns consolidated remediation, regression and Product Acceptance Review. Essential or blocking findings cannot be hidden as backlog.

LSV-03 remains the Same-Backend controlled security and multi-tenant validation gate after TH-M2 acceptance. It covers tenant A/B isolation, real controlled sessions, forged inputs, impersonation, RLS, grants, policies, Storage, public boundaries, cron, queues, webhooks, outbound controls, manifest, teardown and residue scan.

## 10. Extensible portal and marketing contracts

Portal methods form an open-ended starting set:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

Marketing requirements:

```text
META_ADS = required
GOOGLE_ADS = required
META_PIXEL = required
LINKEDIN_ADS = extensible
TIKTOK_ADS = extensible
GOOGLE_ANALYTICS = extensible
GOOGLE_TAG_MANAGER = extensible
FUTURE_CHANNELS = extensible
```

Campaign leads must enter CRM automatically at the accepted initial Kanban stage. Tenant authority is server-derived; payload tenant data is not authority. Provenance, source, campaign, ad, UTM, deduplication and initial history must be preserved.

## 11. CMS, CRM, dashboards and Super Admin

```text
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_COMPONENT_CATALOG_IS_EXTENSIBLE = true
CMS_TEMPLATE_CATALOG_IS_EXTENSIBLE = true
CMS_LAYOUT_CATALOG_IS_EXTENSIBLE = true
CMS_EDITOR_UX_REFINEMENT_IS_EXPECTED = true

CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CRM_WORKFLOW_REFINEMENT_IS_EXPECTED = true
KANBAN_STAGE_CONFIGURATION_IS_EXTENSIBLE = true

DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

Impersonation must be explicit, server-validated, visible, reversible and audited.

## 12. Product Discovery, Customization & Test Feedback Contract

Allowed:

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

Prohibited:

```text
SILENT_SCOPE_EXPANSION_AFTER_STAGE_START = prohibited
RETROACTIVE_DEFINITION_OF_DONE_EXPANSION = prohibited
UNBOUNDED_IMPLEMENTATION_PROMPTS = prohibited
TENANT_SPECIFIC_CODE_FORKS = prohibited
CLIENT_SIDE_AUTHORITY = prohibited
PARALLEL_CMS_RUNTIME = prohibited
DUPLICATE_CMS_EDITOR_PATH = prohibited
SUPER_ADMIN_DIRECT_TENANT_AUTHORITY = prohibited
```

Requirements discovered before stage start may enter its frozen Execution Envelope. During-stage findings must be classified. TH-M1 discoveries are consolidated for TH-M2; non-blocking items receive owner, priority and backlog.

## 13. Scope integrity

```text
FILES_ALLOWED = 6 documentary paths
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

## 14. Budget and authorization

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
