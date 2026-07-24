# RPD-01 — Product Delivery Rebaseline

## Status

**Planning Complete — Ready for Direct External Audit**

```text
STAGE_ID = RPD-01
EXECUTOR = ChatGPT GitHub-native
BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
RPD01_ACCEPTED = false
RPD01_MERGE_AUTHORIZED = false
```

## 1. Purpose

RPD-01 reconciles the remaining delivery path after HRI-01 closure. It does not implement product behavior. It creates one current, finite and auditable sequence that places functional completion and final UX before internal UAT, controlled security validation, formal homologation and production.

## 2. Authority

Authority order:

1. audited GitHub `main` at the baseline above;
2. permanent architecture and security invariants;
3. accepted HRI-01 closure evidence;
4. this RPD-01 record after direct audit and protected merge;
5. historical documents for traceability only.

Rejected, superseded and historical states cannot regain current authority.

## 3. Entry evidence

```text
HRI01_STATE = Accepted
HRI01_IMPLEMENTATION_PR = 53
HRI01_IMPLEMENTATION_MERGE_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021
HRI01_RECONCILIATION_PR = 54
HRI01_RECONCILIATION_MERGE_SHA = 7d0ea2869e0c15887637063a85a833ccff0721c4
FINAL_PUSH_RELEASE_GATE_RUN_ID = 30126260293
FINAL_PUSH_RELEASE_GATE_RESULT = success
MERGE_RECONCILIATION_COMPLETE = true
```

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
```

## 4. Reconciled sequence

```text
HRI-01 Accepted / Closed
→ RPD-01 Product Delivery Rebaseline
→ PR-M2 Tenant Product Functional Completion
→ PR-M3 Product UX Refactor, Final Interface and Operational Readiness
→ Pre-Homologation Release Candidate Deploy
→ TH-M1 Pre-Homologation End-to-End Product Validation and UAT
→ TH-M2 Consolidated Remediation, Regression and Product Acceptance
→ LSV-03 Same-Backend Controlled Security and Multi-Tenant Validation
→ Formal Homologation
→ Production
```

The Release Candidate Deploy is an exit deliverable of PR-M3. TH-M1 is internal validation, not formal homologation. LSV-03 follows product acceptance and is not used for ordinary functional or UX discovery.

## 5. Historical disposition

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and remaining PR-M2 scope
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03 according to factual scope
RDA-01 = Absorbed by PR-M2 dashboard authority and PR-M3 UX
RC-01 = Absorbed by TH-M1 and TH-M2
```

No historical record is deleted. Only stale executable authority is removed.

## 6. PR-M2 ownership

PR-M2 owns audited functional completion of:

- tenant creation, lifecycle and onboarding;
- users, memberships, roles and permissions;
- Configuration Center;
- domains, DNS, Cloudflare decision, SSL and publication;
- white label, public site and CMS;
- Content Workspace, editor, page builder, templates, components and workflow;
- properties, media and site/portal publication;
- extensible portal connector registry;
- extensible marketing and tracking connector registry;
- automatic lead ingestion into CRM;
- CRM, Kanban, funnel, history, conversations, tasks, reports and automations;
- tenant dashboard functional authority;
- Super Admin SaaS Control Plane functional authority;
- plans, entitlements, limits and integration diagnostics.

Every capability must be classified by direct repository audit before implementation is frozen.

## 7. PR-M3 ownership

PR-M3 owns the final product interface and operational readiness.

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

The UX/product professional joins during the final PR-M2 discovery/handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

PR-M3 includes Tenant Admin, Super Admin Control Plane, CRM, CMS, dashboards, reports, onboarding, domains, portais, campaigns, design system, responsive behavior, accessibility and pre-homologation Release Candidate deployment.

Dashboard images supplied by the Product Owner are references for information density, composition, card organization, metric hierarchy and operational visibility only. They do not define color palette, typography, brand identity or final component style.

## 8. TH-M1 ownership

TH-M1 executes internal end-to-end validation of:

- tenant onboarding and lifecycle;
- users, roles and permissions;
- domain, Cloudflare, SSL and public site;
- CMS authoring, preview, versioning, publication and rollback;
- complete property registration and portal publication choices;
- Tenant Admin dashboards and reports;
- CRM, Kanban, funnel, history and conversations;
- Meta, Google, Pixel, analytics, GTM, LinkedIn, TikTok and attribution;
- Super Admin global operations and explicit impersonation.

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

## 9. TH-M2 ownership

TH-M2 owns the consolidated response to TH-M1 findings, including blocking backend/frontend defects, essential missing capabilities, authorization or isolation defects, integration defects, CMS/CRM/Super Admin defects, UX and dashboard refinements, connector extensions, tenant customizations, regression and Product Acceptance Review.

## 10. LSV-03 ownership

LSV-03 remains the Same-Backend controlled security and multi-tenant validation gate after TH-M2 acceptance. It covers controlled sessions, tenant A/B isolation, forged inputs, impersonation, RLS, grants, policies, Storage, public boundaries, cron, queues, webhooks, outbound controls, manifest, teardown and residue scan.

## 11. Extensible portal contract

The portal catalog is open-ended. New portals may be added by name and validated integration method without a tenant-specific code fork.

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

Minimum registry data:

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

## 12. Marketing and lead-ingestion contract

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

Campaign leads must enter the CRM automatically at the accepted initial Kanban stage. Tenant authority is server-derived. Payload tenant data is never authority. Ingestion records provenance, source, campaign, ad, UTM, deduplication and initial history.

## 13. CMS flexibility contract

The CMS capability, layout, template, component, content-type and editor-control catalogs are extensible. The architecture must remain metadata-driven and avoid duplicate editors or parallel CMS runtimes.

During tests, CMS findings are classified as blocking functional/editor/publication/preview/versioning/permission/responsive/accessibility defects, layout or editor UX refinements, component/template/content-type extensions, tenant customizations or non-blocking backlog.

## 14. CRM flexibility contract

CRM capabilities are audit-driven. Kanban stages, funnels, automations and reports must be extensible through tenant-scoped data and configuration, not code forks.

During tests, missing essential capabilities and workflow, automation, reporting or UX defects are explicitly classified and routed to TH-M2.

## 15. Dashboard flexibility contract

Functional authority for tenant and Super Admin dashboards is completed in PR-M2. Final presentation belongs to PR-M3. Metrics, formulas, timezone, filters, permissions and drill-down must be deterministic. Visual density, widgets, reports and refinements may evolve through the test feedback contract.

## 16. Super Admin Control Plane boundary

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
SUPER_ADMIN_WITHOUT_IMPERSONATION_TENANT_ACCESS = prohibited
```

Impersonation must be explicit, server-validated, visible, reversible and audited. The Control Plane inventory includes global dashboard, tenants, users, memberships, roles, plans, entitlements, limits, domains, integrations, portal/campaign diagnostics, incidents, logs, support, jobs, cron, queues and webhooks.

## 17. Product Discovery, Customization & Test Feedback Contract

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

Flexibility is bounded by governance:

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

Requirements discovered before stage start may enter that stage's Execution Envelope. During-stage findings must be classified. Blocking defects inside frozen scope may use the single corrective prompt. Improvements and extensions flow to TH-M1/TH-M2 or backlog.

## 18. Ownership matrix

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

## 19. Scope integrity

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

## 20. Budget and authorization

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2
RPD01_STATE = Planning Complete — Ready for Direct External Audit
RPD01_ACCEPTED = false
RPD01_MERGE_AUTHORIZED = false
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
