# RPD-01 — Roadmap Product Delivery Rebaseline Impact Analysis

## Status

**Accepted — planning merged; post-merge Release Gate successful; documentary reconciliation ready for direct external audit**

```text
STAGE_ID = RPD-01
STAGE_TYPE = Architecture First planning and roadmap reconciliation
EXECUTOR = ChatGPT GitHub-native
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted
RPD01_ACCEPTED = true
IMPLEMENTATION_CHANGES = false
```

## 1. Problem statement

The repository contained historical execution sequences created before the accepted GNR-01/HRI-01 recovery chain. Those sequences placed technical validation before product functional completion, final UX, internal end-to-end validation and consolidated remediation.

That ordering no longer represented the Product Owner's delivery decision. RPD-01 removed stale executable authority, preserved historical evidence and established one current Product Delivery path.

## 2. Accepted decision

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted
→ PR-M2 Planned — Blocked pending explicit authorization
→ PR-M3 Final Interface and Operational Readiness
→ Pre-Homologation Release Candidate Deploy
→ TH-M1 Internal End-to-End UAT
→ TH-M2 Consolidated Remediation and Product Acceptance
→ LSV-03 Controlled Security and Multi-Tenant Validation
→ Formal Homologation
→ Production
```

Formal homologation starts only after PR-M2 and PR-M3 are Accepted, TH-M1 has produced its complete findings report, TH-M2 is Accepted and LSV-03 is Accepted.

## 3. Accepted execution evidence

```text
BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
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

The post-merge Release Gate checked out `main` at the exact merge SHA and produced final status `PASS` with successful development and production builds, typecheck, deterministic route generation and release evidence upload.

## 4. Permanent invariants

RPD-01 does not alter:

- server as sole tenant authority;
- client/header/path non-authority;
- fail-fast and fail-closed behavior;
- explicit cardinality;
- Super Admin tenant access only through explicit server-validated impersonation;
- RLS, grants and Storage isolation;
- prohibition on tenant default, fallback, dual path or heuristic resolution;
- Signed URL not being primary authorization;
- Same-Backend Homologation Cell;
- prohibition on external Supabase as canonical fallback;
- accepted generated `Register` authority.

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF = 0
```

## 5. Scope impact

RPD-01 changed documentation only:

1. `ROADMAP_ARCHITECTURAL.md`;
2. `FINITE_ROADMAP_EXECUTION_MAP.md`;
3. `DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md`;
4. the RPD-01 governance record;
5. this Impact Analysis;
6. the planning submission evidence.

No runtime, frontend, CMS, CRM, Super Admin, dependency, workflow, database, Auth, Storage or deployment change was authorized or executed.

## 6. Historical-stage impact

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

No historical record is deleted. Rejected and Superseded stages remain terminal and cannot transfer authority, budget or deliverables automatically.

## 7. PR-M2 impact

PR-M2 becomes the single functional-completion macro before final UX. Its future planning gate must audit and classify:

- tenant creation, lifecycle and onboarding;
- users, memberships, roles, permissions and invitation flow;
- Configuration Center;
- domains, Cloudflare operating model, DNS/TXT, SSL and anti-takeover;
- white label, public site, CMS and publication;
- properties, media and portal publication;
- portal connectors and their mapping/diagnostics;
- marketing, tracking and attribution connectors;
- automatic campaign-lead ingestion into CRM/Kanban;
- CRM, Kanban, funnel, tasks, calendar, histories, reports and automations;
- tenant dashboard formulas, permissions, periods, timezone and drill-down;
- Super Admin SaaS Control Plane;
- plans, entitlements, limits, billing visibility and diagnostics.

Classification contract:

```text
IMPLEMENTED_AND_VALIDATED
IMPLEMENTED_BUT_INCOMPLETE
LEGACY_OR_DUAL_PATH
MISSING
BLOCKED
REQUIRES_REDESIGN
REQUIRES_SEPARATE_GATE
FUTURE_COMMERCIAL_SCOPE
```

### 7.1 Portal connectors

The portal catalog is open-ended and must not depend on a fixed enum or tenant-specific fork.

Initial methods:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

Each connector requires versioned configuration, secure credential reference, mapping, publication rules, status, synchronization evidence and diagnostics.

### 7.2 Marketing and tracking

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

The model must distinguish advertising platform, tracking, analytics, pixel/tag, lead ingestion, conversion events, campaign/UTM attribution, consent and connector diagnostics.

### 7.3 Automatic lead ingestion

Campaign leads must enter the accepted initial Kanban stage with server-derived tenant authority. Payload tenant values are not authority. Provenance, source, campaign, ad, UTM, deduplication, available lead fields, initial history and tenant-specific assignment rules must be preserved.

### 7.4 CMS and CRM

CMS must be metadata-driven and support extensible layouts, sections, blocks, widgets, templates, content types and editor controls without parallel runtime, duplicate editor path or tenant-specific fork.

CRM capabilities are audit-driven. Kanban stages, funnels, automations, reports and UX may evolve through tenant-scoped data and configuration without code forks.

### 7.5 Dashboards and Super Admin

PR-M2 owns deterministic functional authority for tenant and Super Admin dashboards; PR-M3 owns final presentation.

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

Super Admin impersonation must be explicit, server-validated, visible, reversible and audited.

## 8. PR-M3 impact

PR-M3 is the macro for the final product experience after functional stabilization.

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

The professional enters during final PR-M2 handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

PR-M3 covers Tenant Admin, Super Admin, CRM, CMS, dashboards, reports, onboarding, domains, portals, campaigns, design system, navigation, responsive behavior, accessibility, interaction states and perceived performance.

Reference images are not palette authority; they are references for density, composition, card organization, metric hierarchy and operational visibility.

PR-M3 exit requires a deployable pre-homologation Release Candidate and team-accessible validation environment.

## 9. TH-M1 impact

TH-M1 is internal UAT, not formal homologation. It reproduces the complete lifecycle of a tenant, including onboarding, domain, Cloudflare, users, CMS, properties, portals, dashboards, CRM, marketing/tracking, Super Admin and explicit impersonation.

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

## 10. TH-M2 impact

TH-M2 owns consolidated remediation, regression and Product Acceptance Review.

Classification includes:

```text
BLOCKING_BACKEND_DEFECT
BLOCKING_FRONTEND_DEFECT
ESSENTIAL_CAPABILITY_MISSING
AUTHORIZATION_OR_ISOLATION_DEFECT
INTEGRATION_DEFECT
UX_REFINEMENT
DASHBOARD_REFINEMENT
CONNECTOR_EXTENSION
TENANT_CUSTOMIZATION
CMS_* classifications
CRM_* classifications
SUPER_ADMIN_* classifications
NON_BLOCKING_BACKLOG
```

Essential or blocking findings cannot be hidden as backlog.

## 11. LSV-03 impact

LSV-03 moves after TH-M2. It validates controlled security and isolation, not common functional discovery. Its future envelope must cover tenant A/B, sessions, forged inputs, impersonation, RLS, grants, policies, Storage, public writers/readers, signed resources, cron, queues, webhooks, outbound controls, fixture manifest, teardown, residue scan and protected baseline.

## 12. Product Discovery, Customization & Test Feedback Contract

Allowed:

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

Before a stage starts, newly discovered requirements may enter its frozen envelope. After stage start, findings must be classified. Blocking defects inside frozen scope may use the single corrective prompt. TH-M1 findings are consolidated for TH-M2; non-blocking items receive owner, priority and backlog.

## 13. Security and infrastructure impact

```text
MIGRATIONS = none
RLS_CHANGES = none
GRANT_CHANGES = none
POLICY_CHANGES = none
AUTH_MUTATIONS = none
STORAGE_MUTATIONS = none
CRON_MUTATIONS = none
QUEUE_MUTATIONS = none
WEBHOOK_MUTATIONS = none
DEPLOYMENT = none
```

## 14. Scope integrity

```text
FILES_CHANGED = 6
FILES_OUTSIDE_ALLOWED = 0
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

## 15. Budget and state transition

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2

RPD01_RECONCILIATION_STATE = Ready for Direct External Audit
RPD01_RECONCILIATION_MERGED = false

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
