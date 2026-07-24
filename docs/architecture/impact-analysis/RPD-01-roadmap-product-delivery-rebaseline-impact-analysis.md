# RPD-01 — Roadmap Product Delivery Rebaseline Impact Analysis

## Status

**Planning Complete — Ready for Direct External Audit**

```text
STAGE_ID = RPD-01
STAGE_TYPE = Architecture First planning and roadmap reconciliation
BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
EXECUTOR = ChatGPT GitHub-native
IMPLEMENTATION_CHANGES = false
```

## 1. Problem statement

The repository contained multiple historical execution sequences created before the accepted GNR-01/HRI-01 recovery chain. Those sequences placed LSV-03 and other technical gates before product functional completion, final UX, internal end-to-end validation and consolidated remediation.

That ordering no longer represents the Product Owner's delivery decision and would force controlled security validation to discover ordinary missing functionality or UX defects. RPD-01 removes stale executable authority, preserves historical evidence and establishes one product-delivery path.

## 2. Decision

The remaining sequence is:

```text
HRI-01 Accepted / Closed
→ RPD-01
→ PR-M2 Functional Completion
→ PR-M3 Final Interface and Operational Readiness
→ Pre-Homologation Release Candidate Deploy
→ TH-M1 Internal End-to-End UAT
→ TH-M2 Consolidated Remediation and Product Acceptance
→ LSV-03 Controlled Security and Multi-Tenant Validation
→ Formal Homologation
→ Production
```

Formal homologation starts only after PR-M2, PR-M3, TH-M2 and LSV-03 are Accepted and TH-M1 has produced its complete findings report.

## 3. Authority and predecessor evidence

```text
HRI01_STATE = Accepted
HRI01_IMPLEMENTATION_MERGED = true
HRI01_RECONCILIATION_MERGED = true
MERGE_RECONCILIATION_COMPLETE = true
HRI01_IMPLEMENTATION_PR = 53
HRI01_RECONCILIATION_PR = 54
HRI01_IMPLEMENTATION_MERGE_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021
HRI01_RECONCILIATION_MERGE_SHA = 7d0ea2869e0c15887637063a85a833ccff0721c4
FINAL_PUSH_RELEASE_GATE_RUN_ID = 30126260293
FINAL_PUSH_RELEASE_GATE_RESULT = success
```

Register authority:

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
FUNCTIONAL_ROUTE_TOPOLOGY_DIFF = 0
```

## 4. Permanent invariants

RPD-01 does not alter:

- server as sole tenant authority;
- client/header/path non-authority;
- fail-fast and fail-closed behavior;
- explicit cardinality;
- Super Admin tenant access only through explicit server-validated impersonation;
- RLS, grants and storage isolation;
- no tenant default, fallback, dual path or heuristic resolution;
- Signed URL not being primary authorization;
- Same-Backend Homologation Cell;
- prohibition on external Supabase as canonical fallback;
- accepted generated Register authority.

## 5. Scope

RPD-01 changes documentation only to:

1. reconcile the architectural roadmap;
2. reconcile the finite execution map;
3. reconcile the GitHub-native recovery amendment;
4. create the RPD-01 governance record;
5. create this Impact Analysis;
6. create the planning submission evidence.

No runtime, frontend, CMS, CRM, Super Admin, dependency, workflow, database, Auth, Storage or deployment change is authorized.

## 6. Historical-stage analysis

### 6.1 RRS-01

Original purpose: replacement route-registration stabilization after rejected Strategy B history.

Current disposition: `Superseded by Accepted Later Authority — GNR-01/HRI-01` because the generated route-tree augmentation is accepted, merged and deterministically verified.

### 6.2 PTA-01

Original purpose: public tenant authority hardening.

Current disposition: accepted PTW-01 and PSG-01 already own accepted public writer/read authority. Any remaining functional gaps are inventory inputs for PR-M2, not an automatic standalone successor.

### 6.3 MOC-01

Original purpose: maintenance and operational control.

Current disposition: operational readiness belongs to PR-M3; controlled cron/queue/webhook/outbound validation belongs to LSV-03.

### 6.4 RHV-01

Original purpose: replacement homologation verification.

Current disposition: absorbed by LSV-03 after product acceptance.

### 6.5 LSV-04

Original purpose: authorization, atomicity, rollback and concurrency validation.

Current disposition: ordinary functional defects are remediated in TH-M2; controlled multi-tenant and security proof belongs to LSV-03. Exact future scope remains subject to the LSV-03 envelope.

### 6.6 RDA-01

Original purpose: dashboard authority.

Current disposition: PR-M2 owns functional authority and PR-M3 owns final UX.

### 6.7 RC-01

Original purpose: regression and closing.

Current disposition: TH-M1 and TH-M2 own UAT, consolidated remediation, regression and product acceptance.

## 7. PR-M2 impact

PR-M2 becomes the single functional-completion macro before final UX.

### 7.1 Tenant and onboarding

Required capabilities:

- tenant creation and lifecycle;
- owner, administrators, managers, brokers and invited users;
- memberships, roles, permissions and invitation flow;
- activation, suspension, closure and reactivation;
- Configuration Center and guided onboarding;
- strict separation between normal tenant selection and Super Admin impersonation.

### 7.2 Domains and Cloudflare

PR-M2 must decide one factual operating model:

```text
MANUAL_ASSISTED
API_AUTOMATED
HYBRID
```

The envelope must cover host-derived server authority, DNS/TXT verification, SSL, anti-takeover, canonical host, redirects, publication, rollback and diagnosis.

### 7.3 Portal connectors

Portal availability changes over time. The architecture must therefore use an extensible registry rather than a fixed enum or tenant-specific fork.

Minimum methods:

```text
JSON_API
XML_FEED
XLSX
CSV
WEBHOOK
MANUAL_EXPORT
CUSTOM_ADAPTER
```

The method catalog is open-ended and each adapter must have versioned configuration, mapping, publication rules, credentials by secure reference, status, synchronization evidence and diagnostics.

### 7.4 Marketing and tracking connectors

Essential initial channels:

```text
META_ADS
GOOGLE_ADS
META_PIXEL
```

Extensible channels include LinkedIn Ads, TikTok Ads, Google Analytics, Google Tag Manager and future platforms.

The model must distinguish advertising platform, tracking, analytics, pixel/tag, lead ingestion, conversion events, credential reference, campaign attribution, UTM attribution, consent and connector diagnostics.

### 7.5 Automatic lead ingestion

Campaign leads must be inserted into the CRM's accepted initial Kanban stage with server-derived tenant authority. Payload tenant values are diagnostic only. The boundary must handle deduplication, source/campaign/ad/UTM provenance, available lead fields, initial history and tenant-specific assignment rules.

### 7.6 CRM functional inventory

The future PR-M2 planning gate must inspect the repository and classify each CRM capability as implemented/validated, incomplete, legacy/dual path, missing, blocked, redesign required or separate gate required.

Inventory includes lead capture, deduplication, assignment, Kanban, funnel, stages, transitions, tasks, calendar, contacts, visits, proposals, action and conversation history, notes, attachments, origin, campaigns, reports, automation, permissions, audit, import/export, communication, KPIs, SLA, alerts and relationships to property, broker and campaign.

### 7.7 CMS functional inventory

PR-M2 must inventory Content Workspace, editor, adapters, dispatcher, metadata-driven forms, page builder, landing pages, blocks, widgets, menus, headers, footers, grids, cards, galleries, videos, tours, forms, CTAs, testimonials, property lists, launches, teams, contacts, maps, embeds, rich text, preview, versioning, scheduling, publication, rollback, permissions, workflow, media, SEO, responsive content, reusable blocks, templates, themes and tenant customizations.

### 7.8 CMS extensibility

A component/layout registry must contain keys, categories, schema version, configuration/content schemas, layout constraints, responsive/visibility rules, tenant customization, theme awareness, preview/versioning/publication support and deprecation/replacement metadata.

New layouts, sections, blocks, widgets, templates, content types, editor controls and tenant configurations must be possible without a parallel CMS runtime or tenant code fork.

### 7.9 Tenant dashboard authority

PR-M2 owns source data, formulas, periods, timezone, cardinality, permissions, filters, drill-down, gain/loss/discard distinctions, property/lead/funnel/campaign/publication metrics, reports and empty states. PR-M3 owns final presentation.

### 7.10 Super Admin Control Plane

The Super Admin area is a separate global control plane, not a tenant dashboard.

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

The inventory covers global dashboard, tenants, users, memberships, roles, plans, entitlements, limits, billing visibility, domains, integrations, portals, campaigns, incidents, logs, audit, support, impersonation, health, jobs, cron, queues, webhooks and reports.

Impersonation must be explicit, server-validated, visible, reversible and audited.

## 8. PR-M3 impact

PR-M3 is the macro for the final product experience after functional stabilization.

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

The professional enters during final PR-M2 handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

PR-M3 covers information architecture, design system, navigation, components, Tenant Admin, Super Admin, CRM, CMS, dashboards, reports, domains, onboarding, portals, campaigns, responsive behavior, accessibility, states, feedback and perceived performance.

Reference images are not palette authority. They are references for density, composition, card organization, metric hierarchy and operational visibility.

PR-M3 exit requires a deployable pre-homologation Release Candidate and a team-accessible validation environment.

## 9. TH-M1 impact

TH-M1 is internal UAT. It reproduces the complete lifecycle of a new tenant:

- tenant creation and onboarding;
- domain, Cloudflare, SSL and public-site publication;
- users, permissions and roles;
- CMS creation, preview, versioning, publication and rollback;
- property registration and publication to none/one/multiple portals;
- Tenant Admin dashboard and reports;
- CRM lead capture, Kanban, funnel, tasks, history and conversations;
- Meta/Google/Pixel/analytics/GTM/LinkedIn/TikTok attribution;
- Super Admin global management and explicit impersonation.

It produces one consolidated findings report.

## 10. TH-M2 impact

TH-M2 owns consolidated remediation and regression. Classification includes:

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

LSV-03 moves after TH-M2. It validates controlled security and isolation, not common functional discovery. The future envelope must cover tenant A/B, sessions, forged inputs, impersonation, RLS/grants/policies, Storage, public writers/readers, signed resources, cron/queues/webhooks/outbound controls, fixture manifest, teardown, residue scan and protected baseline.

## 12. Product Discovery, Customization & Test Feedback Contract

### 12.1 Allowed flexibility

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PROVIDER_CATALOG_IS_EXTENSIBLE = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CRM_WORKFLOW_REFINEMENT_IS_EXPECTED = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_COMPONENT_CATALOG_IS_EXTENSIBLE = true
CMS_TEMPLATE_CATALOG_IS_EXTENSIBLE = true
CMS_LAYOUT_CATALOG_IS_EXTENSIBLE = true
CMS_CONTENT_TYPE_CATALOG_IS_EXTENSIBLE = true
CMS_EDITOR_UX_REFINEMENT_IS_EXPECTED = true
CMS_PUBLICATION_WORKFLOW_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
SUPER_ADMIN_DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_OPERATIONAL_WIDGETS_ARE_EXTENSIBLE = true
SUPER_ADMIN_REPORT_CATALOG_IS_EXTENSIBLE = true
SUPER_ADMIN_SUPPORT_TOOLS_ARE_EXTENSIBLE = true
```

### 12.2 Prohibited flexibility

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

### 12.3 Classification flow

1. Before a stage starts, newly discovered requirements may enter its frozen envelope.
2. After stage start, findings must be classified.
3. Blocking defects inside frozen scope may use the single corrective prompt.
4. Improvements, new connectors, layouts, widgets or reports cannot silently enlarge the active stage.
5. TH-M1 discoveries are consolidated for TH-M2.
6. Non-blocking items receive owner, priority and backlog.
7. Tenant customization must be data-driven and server-authoritative.

## 13. Security impact

RPD-01 has no runtime security impact because it changes documentation only. Future stages must preserve all accepted multi-tenant, impersonation, RLS, grants, storage and commercial boundaries.

## 14. Database, Auth, Storage and infrastructure impact

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

Future PR-M2 planning may identify necessary migrations or connector infrastructure, but this RPD-01 execution does not authorize them.

## 15. FILES_ALLOWED

```text
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
docs/architecture/governance/DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md
docs/architecture/governance/RPD-01-product-delivery-rebaseline.md
docs/architecture/impact-analysis/RPD-01-roadmap-product-delivery-rebaseline-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/rpd-01-product-delivery-rebaseline-submission.md
```

## 16. Validation requirements

```text
CURRENT_MAIN_HEAD_VERIFIED = true
HRI01_CLOSURE_PRESERVED = true
CURRENT_ROADMAP_AUTHORITY_UNIQUE = true
STALE_EXECUTABLE_SEQUENCE_REMOVED = true
HISTORICAL_RECORDS_PRESERVED = true
PRM2_SCOPE_RECONCILED = true
PRM3_SCOPE_RECONCILED = true
THM1_SCOPE_RECONCILED = true
THM2_SCOPE_RECONCILED = true
LSV03_POSITION_RECONCILED = true
PORTAL_CONNECTOR_EXTENSIBILITY_RECORDED = true
MARKETING_CONNECTOR_EXTENSIBILITY_RECORDED = true
CRM_FUNCTIONAL_INVENTORY_REQUIRED = true
CMS_FUNCTIONAL_INVENTORY_REQUIRED = true
DASHBOARD_FUNCTIONAL_AUTHORITY_REQUIRED = true
SUPER_ADMIN_FUNCTIONAL_INVENTORY_REQUIRED = true
PRODUCT_DISCOVERY_FLEXIBILITY_CONTRACT_RECORDED = true
FILES_CHANGED = 6
FILES_OUTSIDE_ALLOWED = 0
RUNTIME_FILES_CHANGED = 0
FRONTEND_FILES_CHANGED = 0
CMS_RUNTIME_FILES_CHANGED = 0
CRM_RUNTIME_FILES_CHANGED = 0
SUPER_ADMIN_RUNTIME_FILES_CHANGED = 0
DATABASE_AUTH_STORAGE_CHANGED = 0
DEPLOY_EXECUTED = false
LIVE_TESTING_EXECUTED = false
```

## 17. Prompt budget

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2
```

## 18. State transition

```text
HRI-01 Accepted / Closed
→ RPD-01 Planning Complete — Ready for Direct External Audit
```

Planning acceptance, merge, PR-M2 planning, Lovable, deployment, live testing, homologation and production remain unauthorized until separately decided.
