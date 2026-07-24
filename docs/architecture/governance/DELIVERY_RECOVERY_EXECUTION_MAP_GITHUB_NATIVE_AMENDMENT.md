# DELIVERY RECOVERY EXECUTION MAP — GITHUB-NATIVE AMENDMENT

## Status

**Active governance — reconciled by RPD-01 planning**

```text
CURRENT_MAIN_BASELINE = 7d0ea2869e0c15887637063a85a833ccff0721c4
CURRENT_ACCEPTED_STAGE = HRI-01 Accepted / Closed
CURRENT_PLANNING_STAGE = RPD-01 — Ready for Direct External Audit
RPD01_ACCEPTED = false
RPD01_MERGE_AUTHORIZED = false
PRM2_PLANNING_AUTHORIZED = false
PRM3_IMPLEMENTATION_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
DEPLOY_AUTHORIZED = false
LIVE_TESTING_AUTHORIZED = false
CONTROLLED_HOMOLOGATION_AUTHORIZED = false
PRODUCTION_AUTHORIZED = false
NEXT_STAGE_AUTHORIZED = none
```

This amendment records the accepted GitHub-native recovery chain and the new product-delivery sequence after HRI-01. It supersedes stale executable ordering while preserving historical evidence.

## 1. Accepted GitHub-native chain

| Order | Stage | State | Evidence model |
|---:|---|---|---|
| 1 | DRA-01 | Accepted | direct repository audit |
| 2 | GNR-01 | Accepted | GitHub-native PR and Release Gate |
| 3 | PTC-01 | Accepted | GitHub-native PR and Release Gate |
| 4 | PSC-01 | Accepted | GitHub-native PR and Release Gate |
| 5 | PPR-GN-01 | Accepted | GitHub-native replacement completion |
| 6 | PTW-01 | Accepted | planning + implementation + direct audit |
| 7 | PSG-01 | Accepted with Non-Blocking Backlog / Merged | public-surface security gate |
| 8 | HVP-01 | Superseded / historical | live execution never authorized |
| 9 | HRC-01 | Rejected / terminal | no reopening |
| 10 | HRR-01 | Accepted | roadmap reconciliation |
| 11 | HRI-01 | Accepted / Closed | implementation + documentary reconciliation merged |
| 12 | RPD-01 | Planning Complete — Ready for Direct External Audit | documentary rebaseline only |

## 2. HRI-01 closure authority

```text
HRI01_IMPLEMENTATION_PR = 53
HRI01_IMPLEMENTATION_MERGE_SHA = 91d63bc5ed18540fc122301150a996ed0fe51021
HRI01_RECONCILIATION_PR = 54
HRI01_RECONCILIATION_MERGE_SHA = 7d0ea2869e0c15887637063a85a833ccff0721c4
FINAL_PUSH_RELEASE_GATE_RUN_ID = 30126260293
FINAL_PUSH_RELEASE_GATE_RESULT = success
MERGE_RECONCILIATION_COMPLETE = true
```

Generated registration authority remains:

```text
CANONICAL_REGISTER_STRATEGY = generated route-tree augmentation
GENERATED_REGISTER_AUTHORITY_COUNT = 1
AUTHORED_REGISTER_DECLARATION_COUNT = 0
GENERATED_FILE_REWRITER_COUNT = 0
STRATEGY_B_ALLOWED = false
```

## 3. Historical terminal preservation

The following units remain terminal or historical and may not be reopened:

```text
PR-M1
LSO-01
LSV-01
LSV-02
LSR-01
LSR-02
FRP-01
HVP-01
HRC-01
HRI-01
```

Historical documents and rejected implementations remain diagnostic evidence only. They do not authorize a successor, transfer accepted deliverables or reopen prompt budgets.

## 4. Reconciled product-delivery sequence

```text
HRI-01 Accepted / Closed
→ RPD-01 Product Delivery Rebaseline
→ PR-M2 Functional Completion
→ PR-M3 Final Interface and Operational Readiness
→ Pre-Homologation Release Candidate Deploy
→ TH-M1 Internal End-to-End UAT
→ TH-M2 Consolidated Remediation and Product Acceptance
→ LSV-03 Same-Backend Controlled Security Validation
→ Formal Homologation
→ Production
```

The Release Candidate Deploy is part of PR-M3. TH-M1 is internal pre-homologation validation, not formal homologation. LSV-03 occurs after functional and visual product acceptance.

## 5. Stale path disposition

```text
RRS-01 = Superseded by GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and remaining PR-M2 inventory
MOC-01 = Absorbed by PR-M3 operational readiness and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03 according to factual scope
RDA-01 = Absorbed by PR-M2 dashboard authority and PR-M3 UX
RC-01 = Absorbed by TH-M1 and TH-M2
```

No historical record is deleted. Only stale executable authority is removed.

## 6. RPD-01 planning authority

```text
STAGE_ID = RPD-01
EXECUTOR = ChatGPT GitHub-native
BASELINE_MAIN = 7d0ea2869e0c15887637063a85a833ccff0721c4
RPD01_PLANNING_AUTHORIZED = true
RPD01_RUNTIME_IMPLEMENTATION_AUTHORIZED = false
RPD01_PRINCIPAL_PROMPT_CONSUMED = true
RPD01_CORRECTIVE_PROMPT_CONSUMED = false
RPD01_REMAINING_PROMPT_BUDGET = 1/2
```

RPD-01 may change exactly six documentary paths. It may not change runtime, frontend, CMS/CRM/Super Admin runtime, dependencies, workflows, database, Auth, Storage, integrations or deployment.

## 7. Ownership after RPD-01

### 7.1 PR-M2

PR-M2 owns functional completion and audited inventories for:

- tenant lifecycle and onboarding;
- domains, DNS, Cloudflare decision, SSL and publication;
- white label, public site and CMS;
- CRM, Kanban, funnel and lead ingestion;
- properties and portal publication;
- portal, marketing and tracking connector registries;
- tenant dashboard functional authority;
- Super Admin SaaS Control Plane functional authority;
- plans, entitlements, limits and integration diagnostics.

### 7.2 PR-M3

PR-M3 owns final interface, design system, responsive and accessible UX, operational readiness and the pre-homologation Release Candidate deploy. Lovable is the planned primary implementation platform; the UX/product professional joins at the PR-M2 handoff and participates throughout PR-M3, TH-M1 and TH-M2.

### 7.3 TH-M1

TH-M1 owns internal end-to-end validation of the complete customer journey, tenant operations, CMS, CRM, properties, portals, campaigns, dashboards and Super Admin Control Plane. It produces a consolidated findings report and does not automatically accept the product.

### 7.4 TH-M2

TH-M2 owns consolidated remediation, regression and Product Acceptance Review.

### 7.5 LSV-03

LSV-03 owns controlled Same-Backend security and multi-tenant validation after TH-M2 acceptance.

## 8. Extensibility and discovery contract

```text
DOCUMENTATION_SUPPORTS_FUTURE_DISCOVERY = true
PORTAL_CATALOG_IS_EXTENSIBLE = true
MARKETING_CHANNEL_CATALOG_IS_EXTENSIBLE = true
CRM_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
CMS_LAYOUT_AND_COMPONENT_CATALOGS_ARE_EXTENSIBLE = true
DASHBOARD_REFINEMENT_IS_EXPECTED = true
SUPER_ADMIN_CAPABILITY_CATALOG_IS_AUDIT_DRIVEN = true
TENANT_CUSTOMIZATION_IS_EXPECTED = true
```

The following remain prohibited:

```text
SILENT_SCOPE_EXPANSION_AFTER_STAGE_START
RETROACTIVE_DEFINITION_OF_DONE_EXPANSION
UNBOUNDED_IMPLEMENTATION_PROMPTS
TENANT_SPECIFIC_CODE_FORKS
CLIENT_SIDE_AUTHORITY
PARALLEL_CMS_RUNTIME
DUPLICATE_CMS_EDITOR_PATH
SUPER_ADMIN_DIRECT_TENANT_AUTHORITY
```

New requirements may enter an Execution Envelope before its stage starts. During-stage findings must be classified. Improvements and extensions are routed to TH-M1/TH-M2 or backlog and cannot silently consume a corrective prompt.

## 9. Super Admin boundary

```text
TENANT_ADMIN_DASHBOARD != SUPER_ADMIN_SAAS_CONTROL_PLANE
SUPER_ADMIN_GLOBAL_AUTHORITY = global platform administration only
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
IMPERSONATION_MUST_BE_SERVER_VALIDATED = true
IMPERSONATION_MUST_BE_VISIBLE = true
IMPERSONATION_MUST_BE_AUDITED = true
```

The Control Plane inventory includes global dashboard, tenants, users, memberships, roles, plans, entitlements, limits, domains, integrations, portals, campaigns, incident and support tooling, audit, jobs, cron, queues, webhooks and diagnostics.

## 10. Current gate

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

Required next action: complete the pull-request Release Gate and perform direct external audit of RPD-01. Do not merge or start PR-M2 without separate authorization.
