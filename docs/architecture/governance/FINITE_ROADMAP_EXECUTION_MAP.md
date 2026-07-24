# FINITE ROADMAP EXECUTION MAP — RM Prime SaaS

**Status:** Active governance — RPD-01 Accepted; reconciliação pós-merge pronta para auditoria externa  
**Authority:** derived from `FINITE_DELIVERY_GOVERNANCE.md`, audited GitHub `main` and accepted RPD-01 authority.  
**Current main after planning merge:** `1acf99e272e448e834b52a0018e3d34b79f0a133`

No stage may start without a frozen Execution Envelope and explicit authorization. Each stage admits at most one principal implementation prompt and one consolidated corrective prompt.

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
| 10 | HVP-01 | Superseded / historical | no reopening |
| 11 | HRC-01 | Rejected / terminal | no reopening |
| 12 | GNR-01 | Accepted | completed predecessor |
| 13 | HRR-01 | Accepted | completed predecessor |
| 14 | HRI-01 | Accepted / Closed | completed predecessor |
| 15 | RPD-01 | Accepted; planning merged; reconciliation under external audit | no automatic successor |
| 16 | PR-M2 | Planned — Blocked pending explicit authorization | requires frozen Execution Envelope |
| 17 | PR-M3 | Planned — Blocked by PR-M2 | requires PR-M2 Accepted |
| 18 | PR-M3 deliverable — Pre-Homologation Release Candidate Deploy | Not autonomous | exit gate of PR-M3 |
| 19 | TH-M1 | Planned — Blocked by PR-M3 | internal UAT only |
| 20 | TH-M2 | Planned — Blocked by TH-M1 | consolidated remediation and acceptance |
| 21 | LSV-03 | Planned — Blocked by TH-M2 | controlled Same-Backend validation |
| 22 | Homologação formal | Blocked by LSV-03 | requires explicit authorization |
| 23 | Produção | Blocked until homologation acceptance | requires explicit production decision |

## 2. RPD-01 accepted evidence

```text
STAGE_ID = RPD-01
FINAL_EXTERNAL_AUDIT = Accepted
RPD01_STATE = Accepted
RPD01_ACCEPTED = true

RPD01_PLANNING_PR = 55
RPD01_PLANNING_HEAD = 8a56c758ca1d8b127dd0ee736769f0b4171f4c7d
RPD01_PLANNING_MERGED = true
RPD01_PLANNING_MERGE_SHA = 1acf99e272e448e834b52a0018e3d34b79f0a133

RPD01_PLANNING_RELEASE_GATE_RUN_ID = 30132995455
RPD01_PLANNING_RELEASE_GATE_JOB_ID = 89611181337
RPD01_PLANNING_RELEASE_GATE_RESULT = success
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_ID = 8611824397
RPD01_PLANNING_RELEASE_GATE_ARTIFACT_DIGEST = sha256:7052f7f3b31e4aaadf23f32a4004a2d3d9c3081cb84090fb130c0dc44d80bb86

POST_MERGE_RELEASE_GATE_RUN_ID = 30134139802
POST_MERGE_RELEASE_GATE_JOB_ID = 89614524262
POST_MERGE_RELEASE_GATE_RESULT = success
POST_MERGE_RELEASE_GATE_ARTIFACT_ID = 8612216615
POST_MERGE_RELEASE_GATE_ARTIFACT_DIGEST = sha256:bf474c3858f4b1e704df19c7e174f4bb2ad69c8c99ff4f7b4e7821f223df0308
```

## 3. Current executable path

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

No historical stage may re-enter this sequence.

## 4. Historical disposition

```text
RRS-01 = Superseded by Accepted Later Authority — GNR-01/HRI-01
PTA-01 = Absorbed by PTW-01/PSG-01 and PR-M2
MOC-01 = Absorbed by PR-M3 and LSV-03
RHV-01 = Absorbed by LSV-03
LSV-04 = Absorbed by TH-M2 and LSV-03
RDA-01 = Absorbed by PR-M2 and PR-M3
RC-01 = Absorbed by TH-M1 and TH-M2
```

Historical evidence remains preserved for traceability. Rejected, Superseded or historical artifacts do not authorize execution and do not transfer budgets or deliverables automatically.

## 5. PR-M2 initial execution envelope requirement

PR-M2 is the next planned macro, but remains unauthorized. Before any principal prompt, a direct GitHub audit and Impact Analysis must freeze:

- tenant lifecycle and onboarding;
- users, memberships, roles and permissions;
- domains, Cloudflare model, DNS/TXT, SSL and anti-takeover;
- white label, public site and publication;
- CMS, editor, page builder, templates, workflow and extensibility;
- properties, media and publication to none/one/multiple portals;
- extensible portal connector registry;
- Meta Ads, Google Ads and Meta Pixel as essential;
- LinkedIn, TikTok, analytics, GTM and future channels as extensible;
- automatic campaign lead ingestion into CRM/Kanban;
- CRM, Kanban, funnel, histories, tasks, reports and automations;
- tenant dashboard functional authority;
- Super Admin SaaS Control Plane functional authority;
- plans, entitlements, limits, billing visibility and diagnostics.

Every capability must be classified by direct repository audit:

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

## 6. PR-M3 initial execution envelope requirement

PR-M3 remains blocked by PR-M2. Its future envelope must cover final UX/UI for Tenant Admin, Super Admin, CRM, CMS, dashboards, reports, onboarding, domains, portals and campaigns, including design system, responsiveness, accessibility and perceived performance.

```text
LOVABLE = primary implementation platform
UX_PRODUCT_PROFESSIONAL = active collaborator
CHATGPT_GITHUB_AUDIT = mandatory
```

The UX/product professional enters during final PR-M2 handoff, participates throughout PR-M3 and supports TH-M1/TH-M2.

## 7. TH-M1, TH-M2 and LSV-03

TH-M1 is internal pre-homologation UAT and must produce one consolidated findings report. It is not formal homologation.

TH-M2 owns consolidated remediation, regression and Product Acceptance Review. Blocking or essential findings cannot be hidden as backlog.

LSV-03 follows TH-M2 acceptance and validates Same-Backend security, multi-tenant isolation, sessions, forged inputs, impersonation, RLS, grants, policies, Storage, public boundaries, cron, queues, webhooks, outbound controls, fixtures, teardown and residue scan.

## 8. Product discovery and flexibility

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

## 9. Permanent security invariants

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

## 10. Budget and authorization

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
