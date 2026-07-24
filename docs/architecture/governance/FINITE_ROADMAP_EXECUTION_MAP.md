# FINITE ROADMAP EXECUTION MAP — RM Prime SaaS

**Status:** Active governance — reconciled by RPD-01  
**Baseline:** `7d0ea2869e0c15887637063a85a833ccff0721c4`  
**Authority:** derived from `FINITE_DELIVERY_GOVERNANCE.md` and the audited GitHub-native recovery chain.

This document is the finite, auditable execution map for the remaining product delivery path. No stage may start without a frozen Execution Envelope and explicit authorization. Each stage admits at most one principal implementation prompt and one consolidated corrective prompt.

## 1. Current finite sequence

| # | Stage | State | Successor condition |
|---:|---|---|---|
| 1 | PR-PH.0 | Accepted | historical predecessor |
| 2 | PR-M1 | Superseded | historical only |
| 3 | LSO-01 | Rejected / Closed | historical only |
| 4 | LSH-01 | Accepted / Closed | historical only |
| 5 | LSV-01 | Superseded / terminal | no reopening |
| 6 | LSV-02 | Superseded / terminal | no reopening |
| 7 | LSR-01 | Superseded / terminal | no reopening |
| 8 | LSR-02 | Rejected / terminal | no reopening |
| 9 | FRP-01 | Rejected / terminal | no reopening |
| 10 | DRA-01 | Accepted | complete |
| 11 | GNR-01 | Accepted | complete |
| 12 | PTC-01 | Accepted | complete |
| 13 | PSC-01 | Accepted | complete |
| 14 | PPR-GN-01 | Accepted | complete |
| 15 | PTW-01 | Accepted | complete |
| 16 | PSG-01 | Accepted with Non-Blocking Backlog / Merged | complete |
| 17 | HVP-01 | Superseded / historical | no reopening |
| 18 | HRC-01 | Rejected / terminal | no reopening |
| 19 | HRR-01 | Accepted | complete |
| 20 | HRI-01 | Accepted / Closed | complete |
| 21 | RPD-01 | Planning Complete — Ready for Direct External Audit | audit and protected merge |
| 22 | PR-M2 | Planned — Blocked by RPD-01 | RPD-01 Accepted and explicit planning authorization |
| 23 | PR-M3 | Planned — Blocked by PR-M2 | PR-M2 Accepted |
| 24 | TH-M1 | Planned — Blocked by PR-M3 | PR-M3 Accepted and Release Candidate available |
| 25 | TH-M2 | Planned — Blocked by TH-M1 | TH-M1 findings report complete |
| 26 | LSV-03 | Planned — Blocked by TH-M2 | TH-M2 Accepted |
| 27 | Homologação formal | Blocked by LSV-03 | LSV-03 Accepted and explicit authorization |
| 28 | Produção | Blocked | formal homologation accepted and explicit production decision |

## 2. Stale sequence disposition

| Historical stage | Current classification |
|---|---|
| RRS-01 | Superseded by Accepted Later Authority — GNR-01/HRI-01 |
| PTA-01 | Absorbed by accepted PTW-01/PSG-01 plus PR-M2 inventory |
| MOC-01 | Absorbed by PR-M3 operational readiness and LSV-03 |
| RHV-01 | Absorbed by LSV-03 |
| LSV-04 | Absorbed by TH-M2 and LSV-03 according to factual scope |
| RDA-01 | Absorbed by PR-M2 functional authority and PR-M3 final UX |
| RC-01 | Absorbed by TH-M1 and TH-M2 |

Historical artifacts remain available for evidence. They are not executable successors and cannot conflict with the sequence in §1.

## 3. RPD-01 Execution Envelope

```text
STAGE_ID = RPD-01
STAGE_TYPE = Architecture First planning and roadmap reconciliation
BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
EXECUTOR = ChatGPT GitHub-native
RPD01_PLANNING_AUTHORIZED = true
RPD01_RUNTIME_IMPLEMENTATION_AUTHORIZED = false
```

### 3.1 Objective

Reconcile the remaining delivery path around functional completion, extensible integrations, CMS, CRM, Tenant Admin, Super Admin Control Plane, final UX, pre-homologation deploy, end-to-end UAT, consolidated remediation, controlled security validation, formal homologation and production.

### 3.2 Deliverables

1. unique current roadmap sequence;
2. disposition of stale executable stages;
3. PR-M2 functional ownership;
4. PR-M3 final-interface ownership;
5. TH-M1 internal UAT ownership;
6. TH-M2 consolidated remediation ownership;
7. LSV-03 position after functional and visual acceptance;
8. Product Discovery, Customization & Test Feedback Contract;
9. explicit Super Admin Control Plane boundary;
10. documentary evidence and direct-audit PR.

### 3.3 FILES_ALLOWED

```text
docs/architecture/ROADMAP_ARCHITECTURAL.md
docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
docs/architecture/governance/DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md
docs/architecture/governance/RPD-01-product-delivery-rebaseline.md
docs/architecture/impact-analysis/RPD-01-roadmap-product-delivery-rebaseline-impact-analysis.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/rpd-01-product-delivery-rebaseline-submission.md
```

### 3.4 Absolute prohibitions

```text
RUNTIME_CHANGE = prohibited
FRONTEND_CHANGE = prohibited
CMS_RUNTIME_CHANGE = prohibited
CRM_RUNTIME_CHANGE = prohibited
SUPER_ADMIN_RUNTIME_CHANGE = prohibited
DEPENDENCY_CHANGE = prohibited
DATABASE_AUTH_STORAGE_CHANGE = prohibited
WORKFLOW_CHANGE = prohibited
DEPLOY = prohibited
LIVE_TESTING = prohibited
LOVABLE = prohibited
CODEX = prohibited
HOMOLOGATION = prohibited
PRODUCTION = prohibited
```

### 3.5 Prompt budget

```text
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2
```

### 3.6 Maximum state

```text
RPD01_STATE = Planning Complete — Ready for Direct External Audit
RPD01_ACCEPTED = false
RPD01_MERGE_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

## 4. PR-M2 preliminary Execution Envelope

**State:** Planned — Blocked. This section is preliminary and does not authorize implementation.

### 4.1 Objective

Complete and validate product functionality before final interface work.

### 4.2 Functional domains

- tenant lifecycle and onboarding;
- users, memberships, roles and permissions;
- Configuration Center;
- domains, DNS, Cloudflare decision, SSL and publication;
- white label and public site;
- CMS, Content Workspace, page builder, templates, components and workflow;
- properties, media, site publication and portal publication;
- extensible Portal Connector Registry;
- extensible Marketing and Tracking Connector Registry;
- automatic campaign lead ingestion into CRM;
- CRM, Kanban, funnel, history, conversations, tasks, reports and automations;
- tenant dashboard functional authority;
- Super Admin SaaS Control Plane functional authority;
- plans, entitlements, limits and commercial visibility;
- integration diagnostics.

### 4.3 Required inventories

```text
TENANT_FUNCTIONAL_INVENTORY = required
CMS_FUNCTIONAL_INVENTORY = required
CRM_FUNCTIONAL_INVENTORY = required
TENANT_DASHBOARD_FUNCTIONAL_INVENTORY = required
SUPER_ADMIN_FUNCTIONAL_INVENTORY = required
PORTAL_CONNECTOR_INVENTORY = required
MARKETING_CONNECTOR_INVENTORY = required
DOMAIN_AND_CLOUDFLARE_INVENTORY = required
```

Every capability must be classified as implemented and validated, incomplete, legacy/dual path, missing, blocked, redesign required, separate gate required or future commercial scope.

### 4.4 Architectural guards

- server-only tenant authority;
- no tenant-specific code forks;
- no closed provider catalog;
- no duplicate CRM/CMS runtime;
- no direct Super Admin tenant authority;
- credentials referenced securely and tenant-scoped;
- unknown or ambiguous tenant fails closed.

### 4.5 Prompt budget

```text
principal = 1
corrective = 1
consumed = 0/2
```

## 5. PR-M3 preliminary Execution Envelope

**State:** Planned — Blocked by PR-M2.

### 5.1 Objective

Implement the final product interface and operational readiness after functional completion.

### 5.2 Executor model

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

### 5.3 Scope

- information architecture and design system;
- Tenant Admin and Super Admin Control Plane;
- CRM, Kanban, leads and funnel;
- CMS, editor, page builder, preview and publication;
- dashboards, graphs, tables, filters and reports;
- onboarding, domains, portals, campaigns and configuration;
- responsive, accessibility and perceived-performance review;
- environments, observability, runbooks and operational readiness;
- pre-homologation Release Candidate deployment.

Reference dashboard images define information density and composition only, never final color palette or brand identity.

### 5.4 Exit gate

```text
FINAL_FRONTEND_IMPLEMENTED = true
FINAL_TENANT_DASHBOARD_IMPLEMENTED = true
FINAL_SUPER_ADMIN_CONTROL_PLANE_UX_IMPLEMENTED = true
FINAL_CMS_EDITOR_EXPERIENCE_IMPLEMENTED = true
FINAL_CRM_EXPERIENCE_IMPLEMENTED = true
CRITICAL_FLOWS_USABLE = true
RESPONSIVE_VALIDATION_PASSED = true
ACCESSIBILITY_CRITICALS_RESOLVED = true
PRE_HOMOLOGATION_RELEASE_CANDIDATE_DEPLOYED = true
TEAM_TEST_ENVIRONMENT_AVAILABLE = true
```

### 5.5 Prompt budget

```text
principal = 1
corrective = 1
consumed = 0/2
```

## 6. TH-M1 preliminary Execution Envelope

**State:** Planned — Blocked by PR-M3.

TH-M1 is internal pre-homologation UAT, not formal homologation. It validates the complete tenant lifecycle, domains and Cloudflare, public site and CMS, properties and portals, Tenant Admin dashboards, CRM, marketing/tracking connectors and Super Admin Control Plane.

```text
THM1_FINDINGS_REPORT = required
THM1_PRODUCT_ACCEPTANCE = not automatic
```

Prompt budget: principal 1, corrective 1, consumed 0/2.

## 7. TH-M2 preliminary Execution Envelope

**State:** Planned — Blocked by TH-M1.

TH-M2 owns consolidated remediation of blocking backend/frontend defects, essential missing capabilities, authorization/isolation defects, integration defects, CRM/CMS/Super Admin defects, UX and dashboard refinements, connector extensions, tenant customizations and regression.

Prompt budget: principal 1, corrective 1, consumed 0/2.

## 8. LSV-03 preliminary Execution Envelope

**State:** Planned — Blocked by TH-M2.

LSV-03 validates Same-Backend security and multi-tenant behavior only after product acceptance:

- tenant A versus tenant B;
- controlled sessions;
- forged headers and payloads;
- impersonation;
- RLS, grants and policies;
- Storage isolation;
- public writers/readers and signed resources;
- cron, queues, webhooks and outbound controls;
- fixture manifest, teardown, residue scan and protected baseline.

It does not own common UX or functional discovery.

Prompt budget: principal 1, corrective 1, consumed 0/2.

## 9. Product Discovery, Customization & Test Feedback Contract

### 9.1 Extensible domains

```text
PROVIDER_CATALOG_IS_EXTENSIBLE = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_COMPONENT_CATALOG_IS_EXTENSIBLE = true
CMS_TEMPLATE_CATALOG_IS_EXTENSIBLE = true
CMS_LAYOUT_CATALOG_IS_EXTENSIBLE = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
SUPER_ADMIN_OPERATIONAL_WIDGETS_ARE_EXTENSIBLE = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

### 9.2 Governance limits

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

Requirements discovered before a stage starts may enter its frozen envelope. During-stage findings must be classified. Blocking defects within frozen scope may use the consolidated corrective prompt. Improvements and extensions flow to TH-M1/TH-M2 or backlog and cannot silently expand the active stage.

## 10. Current authorization state

```text
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
