# RPD-01 — Product Delivery Rebaseline

## Status

**Accepted — corrective reconciliation complete; ready for final direct external audit**

```text
STAGE_ID = RPD-01
EXECUTOR = ChatGPT GitHub-native
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted
RPD01_ACCEPTED = true

BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

RPD01_RECONCILIATION_STATE = Corrected — Ready for Final Direct External Audit
RPD01_RECONCILIATION_MERGED = false
RPD01_RECONCILIATION_MERGE_AUTHORIZED = false

RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = true
RPD01_REMAINING_PROMPT_BUDGET = 0/2
```

## 1. Purpose and authority

RPD-01 establishes one finite Product Delivery path after HRI-01 closure. It places audited functional completion and final product experience before internal UAT, consolidated remediation, controlled security validation, formal homologation and production.

Authority order:

1. audited GitHub `main`;
2. permanent architecture and security invariants;
3. accepted HRI-01 closure evidence;
4. this accepted RPD-01 record;
5. reconciled roadmap and finite execution map;
6. historical records for traceability only.

Rejected, Superseded and historical states cannot regain current authority.

## 2. Accepted execution evidence

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
POST_MERGE_RELEASE_GATE_EVENT = push
POST_MERGE_RELEASE_GATE_BRANCH = main
POST_MERGE_RELEASE_GATE_HEAD_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308
```

## 3. Preserved architecture

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

## 4. Reconciled sequence

```text
HRI-01 Accepted / Closed
→ RPD-01 Accepted
→ PR-M2 Planned — Blocked pending explicit authorization
→ PR-M3 Product UX Refactor, Final Interface and Operational Readiness
→ PR-M3 deliverable: Pre-Homologation Release Candidate Deploy
→ TH-M1 Pre-Homologation End-to-End Product Validation and UAT
→ TH-M2 Consolidated Remediation, Regression and Product Acceptance
→ LSV-03 Same-Backend Controlled Security and Multi-Tenant Validation
→ Formal Homologation
→ Production
```

The Release Candidate Deploy is a PR-M3 exit deliverable, not an autonomous stage. TH-M1 is internal UAT, not formal homologation. LSV-03 follows TH-M2 acceptance and is not a discovery gate for ordinary missing functionality or UX defects.

## 5. Historical disposition

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

No historical record is deleted. No historical budget, deliverable or authority is transferred automatically.

## 6. PR-M2 functional completion envelope

PR-M2 remains unauthorized. Its future frozen envelope must audit and classify every capability as:

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

### 6.1 Tenant, onboarding, domains and Cloudflare

PR-M2 owns tenant lifecycle, onboarding, users, memberships, roles, permissions, invitations, Configuration Center, white label, public site, publication and rollback.

```text
CLOUDFLARE_INTEGRATION_MODEL =
MANUAL_ASSISTED
OR API_AUTOMATED
OR HYBRID
```

The future decision must preserve host-derived server authority, DNS, TXT verification, SSL, anti-takeover, canonical host, redirects, publication, rollback, status and diagnostics. RPD-01 does not choose an option.

### 6.2 Portal Connector Registry

The portal catalog is open-ended. `portal_name` is configurable and `integration_method` is declared and validated. New portals must not require tenant-specific code forks.

Minimum registry contract:

```text
portal_id
tenant_id
portal_name
portal_status
integration_method
configuration_schema
credential_reference
feed_or_endpoint
mapping_profile
publication_rules
last_sync_status
last_sync_at
error_state
```

Initial methods, without forming a closed list:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

Credentials are secure references, never exposed secrets. Adapter configuration and mapping are versionable.

### 6.3 Marketing and automatic lead ingestion

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

Campaign leads must enter the accepted initial Kanban stage. Tenant authority is server-derived; payload tenant data is not authority. Provenance, source, campaign, ad, UTM, deduplication, available fields, initial history and tenant-scoped assignment rules must be preserved.

### 6.4 CMS Functional Inventory

The future direct audit must inventory:

- Content Workspace, universal editor, adapters, dispatcher and metadata-driven forms;
- page builder, landing page builder, layouts, sections, blocks, widgets and templates;
- menus, headers, footers, grids, columns, cards, galleries, videos and tours;
- forms, CTAs, testimonials, property listings, launches, teams, contacts, maps and embeds;
- rich text, preview, versioning, scheduling, publication, rollback, permissions and workflow;
- media, SEO, responsive behavior, reusable blocks, themes and data-driven tenant customization.

CMS Component and Layout Registry minimum schema:

```text
component_key
component_name
component_category
schema_version
configuration_schema
content_schema
layout_constraints
responsive_rules
visibility_rules
tenant_customizable
theme_aware
preview_supported
versioning_supported
publication_supported
deprecated
replacement_component_key
```

Extensible capabilities:

```text
NEW_LAYOUT
NEW_SECTION
NEW_BLOCK
NEW_WIDGET
NEW_TEMPLATE
NEW_CONTENT_TYPE
NEW_EDITOR_CONTROL
NEW_TENANT_CONFIGURATION
```

Forbidden CMS outcomes:

```text
TENANT_SPECIFIC_CODE_FORK
DUPLICATE_EDITOR_PATH
PARALLEL_CMS_RUNTIME
CLIENT_SIDE_AUTHORITY
```

CMS findings taxonomy:

```text
CMS_BLOCKING_FUNCTIONAL_DEFECT
CMS_BLOCKING_EDITOR_DEFECT
CMS_BLOCKING_PUBLICATION_DEFECT
CMS_BLOCKING_PREVIEW_DEFECT
CMS_BLOCKING_VERSIONING_DEFECT
CMS_BLOCKING_PERMISSION_DEFECT
CMS_BLOCKING_RESPONSIVE_DEFECT
CMS_BLOCKING_ACCESSIBILITY_DEFECT
CMS_LAYOUT_REFINEMENT
CMS_EDITOR_UX_REFINEMENT
CMS_COMPONENT_EXTENSION
CMS_TEMPLATE_EXTENSION
CMS_CONTENT_TYPE_EXTENSION
CMS_TENANT_CUSTOMIZATION
CMS_NON_BLOCKING_BACKLOG
```

### 6.5 CRM Functional Inventory

The future direct audit must inventory:

- lead capture, deduplication and assignment;
- Kanban, funnel, stages and transitions;
- tasks, calendar, contacts, visits and proposals;
- action history, conversation history, notes and attachments;
- source, campaigns, reports, automations, permissions and audit;
- import, export and communication integrations;
- dashboards, KPIs, filters, SLA, alerts and follow-ups;
- relationships to property, broker and campaign.

Kanban stages, funnels, automations, reports and UX must evolve through tenant-scoped data and configuration, not client authority or code forks.

### 6.6 Dashboard Functional Authority

PR-M2 owns deterministic functional authority; PR-M3 owns final presentation.

```text
PRM2_DASHBOARD_FUNCTIONAL_AUTHORITY = true
PRM3_DASHBOARD_FINAL_PRESENTATION = true
```

The functional inventory includes data source, formulas, periods, timezone, cardinality, permissions, filters, drill-down, won/lost/discarded distinction, property metrics, lead metrics, funnel metrics, campaign metrics, publication metrics, reports, empty states and role-scoped data.

### 6.7 Super Admin SaaS Control Plane

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

The inventory includes global executive dashboard, tenants, users, memberships, roles, plans, entitlements, limits, billing visibility, domains, integrations, portals, campaigns, incidents, logs, audit, support, impersonation, health, jobs, cron, queues, webhooks, diagnostics and global reports.

Impersonation must be explicit, server-validated, visible, reversible and audited.

## 7. PR-M3 final product experience

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

PR-M3 owns final UX/UI and operational readiness for Tenant Admin, Super Admin, CRM, CMS, dashboards, reports, onboarding, domains, portals and campaigns. The UX/product professional enters during final PR-M2 handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

Product Owner dashboard images are references only for information density, composition, card organization, metric hierarchy and operational visibility. They do not define palette, typography, brand identity or final component style.

## 8. TH-M1 end-to-end UAT

Minimum flows:

- tenant entry and onboarding;
- users, roles, permissions and invitations;
- domain, DNS, Cloudflare and SSL;
- white label, site and publication;
- CMS from draft through preview, versioning, scheduling, publication and rollback;
- complete property registration and publication to no portal, one portal and multiple portals;
- dashboards and reports;
- CRM, Kanban, action history and conversations;
- Meta Ads, Google Ads, Meta Pixel, analytics, GTM, LinkedIn, TikTok, UTMs and conversions;
- Super Admin operations, explicit impersonation, exit from impersonation and proof of no tenant-scoped access without impersonation.

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

## 9. TH-M2 consolidated classification

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

CMS_BLOCKING_FUNCTIONAL_DEFECT
CMS_BLOCKING_EDITOR_DEFECT
CMS_BLOCKING_PUBLICATION_DEFECT
CMS_BLOCKING_PREVIEW_DEFECT
CMS_BLOCKING_VERSIONING_DEFECT
CMS_BLOCKING_PERMISSION_DEFECT
CMS_BLOCKING_RESPONSIVE_DEFECT
CMS_BLOCKING_ACCESSIBILITY_DEFECT
CMS_LAYOUT_REFINEMENT
CMS_EDITOR_UX_REFINEMENT
CMS_COMPONENT_EXTENSION
CMS_TEMPLATE_EXTENSION
CMS_CONTENT_TYPE_EXTENSION
CMS_TENANT_CUSTOMIZATION

CRM_BLOCKING_FUNCTIONAL_DEFECT
CRM_WORKFLOW_DEFECT
CRM_AUTOMATION_DEFECT
CRM_REPORTING_DEFECT
CRM_UX_REFINEMENT

SUPER_ADMIN_BLOCKING_FUNCTIONAL_DEFECT
SUPER_ADMIN_AUTHORIZATION_DEFECT
SUPER_ADMIN_IMPERSONATION_DEFECT
SUPER_ADMIN_TENANT_LIFECYCLE_DEFECT
SUPER_ADMIN_COMMERCIAL_VISIBILITY_DEFECT
SUPER_ADMIN_INTEGRATION_DIAGNOSTIC_DEFECT
SUPER_ADMIN_DASHBOARD_REFINEMENT
SUPER_ADMIN_REPORT_EXTENSION
SUPER_ADMIN_SUPPORT_TOOL_EXTENSION
SUPER_ADMIN_UX_REFINEMENT

NON_BLOCKING_BACKLOG
```

Essential or blocking findings cannot be hidden as backlog.

## 10. Ownership matrix

```text
PRM2_TENANT_FUNCTIONAL_OWNERSHIP = true
PRM2_CMS_FUNCTIONAL_OWNERSHIP = true
PRM2_CRM_FUNCTIONAL_OWNERSHIP = true
PRM2_SUPER_ADMIN_FUNCTIONAL_OWNERSHIP = true
PRM2_INTEGRATION_FUNCTIONAL_OWNERSHIP = true

PRM3_TENANT_FINAL_UX_OWNERSHIP = true
PRM3_CMS_FINAL_UX_OWNERSHIP = true
PRM3_CRM_FINAL_UX_OWNERSHIP = true
PRM3_SUPER_ADMIN_FINAL_UX_OWNERSHIP = true

THM1_TENANT_E2E_VALIDATION_REQUIRED = true
THM1_CMS_E2E_VALIDATION_REQUIRED = true
THM1_CRM_E2E_VALIDATION_REQUIRED = true
THM1_SUPER_ADMIN_E2E_VALIDATION_REQUIRED = true
THM1_INTEGRATION_E2E_VALIDATION_REQUIRED = true

THM2_TENANT_REMEDIATION_OWNERSHIP = true
THM2_CMS_REMEDIATION_OWNERSHIP = true
THM2_CRM_REMEDIATION_OWNERSHIP = true
THM2_SUPER_ADMIN_REMEDIATION_OWNERSHIP = true
THM2_INTEGRATION_REMEDIATION_OWNERSHIP = true
```

## 11. Product Discovery, Customization & Test Feedback Contract

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

Requirements discovered before stage start may enter its frozen Execution Envelope. During-stage findings must be classified. Blocking defects inside frozen scope may use the single corrective prompt. TH-M1 findings are consolidated for TH-M2; non-blocking items receive owner, priority and backlog.

## 12. Scope integrity and authorization

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
