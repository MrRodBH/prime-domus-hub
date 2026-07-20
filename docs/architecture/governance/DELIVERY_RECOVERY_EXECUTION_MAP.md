# DELIVERY RECOVERY EXECUTION MAP

## Status

**Accepted — binding map for the post-FRP delivery recovery path**

**Authority:** explicit product-owner delivery reset + DRA-01/PTD-01 direct GitHub audits  
**Current audited implementation HEAD:** `c021db3cf3b693887e2832d4d6736a04b0d749fc`

---

## 1. Scope and relation to prior history

This map governs only the delivery path created after the terminal rejection of FRP-01.

It does not reopen, rename, retry or inherit implementation authority from:

- LSV-01;
- LSV-02;
- LSR-01;
- LSR-02;
- FRP-01;
- PTH-01;
- rejected successor boundaries or branch artifacts.

`FINITE_ROADMAP_EXECUTION_MAP.md` remains the historical authority for earlier terminal stages. For the recovery path beginning at DRA-01, this document is the binding execution map and supersedes stale remaining-stage sequences elsewhere.

---

## 2. Current stage table

| Order | Stage | State | Executor | Budget |
|---:|---|---|---|---|
| 1 | DRA-01 — Delivery Recovery & Release Criticality Audit | Accepted | Direct GitHub audit | completed; zero Lovable interactions |
| 2 | GNR-01 — GitHub-Native Release Gate | Accepted | GitHub-native | principal PR consumed; corrective PR not consumed |
| 3 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | GitHub Actions codemod | principal + corrective consumed; 0/2 remaining; no code merged |
| 4 | PTD-01 — Public Tenant Delivery Decomposition | Accepted | Direct GitHub audit | planning-only |
| 5 | PTC-01 — Public Tenant Context Foundation | Authorized next | Direct GitHub file changes | 1 principal PR + max 1 corrective PR |
| 6 | PTQ-01 — Public Tenant Query Binding | Planned — Blocked by PTC-01 | Direct GitHub file changes | 1 principal PR + max 1 corrective PR |
| 7 | PTM-01 — Public Tenant Mutation Binding | Planned — Blocked by PTQ-01 | Direct GitHub file changes | 1 principal PR + max 1 corrective PR |
| 8 | PSG-01 — Public Surface Security Gate | Planned — Blocked by PTM-01 | GitHub-native | 1 principal PR + max 1 corrective PR |
| 9 | HVP-01 — Homologation Validation Preflight | Planned — Blocked by PSG-01 | GitHub-native runbook + authorized operator | evidence gate; no feature implementation |
| 10 | VSP-01 — Optional Visual Stabilization Package | Optional — Not authorized | Lovable only when HVP-01 records blocking visual defects | global max 1 principal + 1 corrective |
| 11 | Controlled Homologation | Blocked by HVP-01 and, only when triggered, VSP-01 | operator/product team | not an implementation prompt |

---

## 3. Entry and exit rules

### DRA-01

Final state: `Accepted`.

Accepted outputs:

- hybrid delivery model;
- release-critical classification;
- executor allocation;
- finite recovery path;
- financial/interaction ceiling.

### GNR-01

Final state: `Accepted`.

Accepted implementation:

- PR `#7` merged as `9a9c97c549e0f6a575546abc5a9ffa0a3904078d`;
- rejected authored TanStack Start declaration removed;
- rejected route-tree rewriting plugin removed;
- generated route tree restored as the single Register authority;
- Bun pinned to `1.3.14`;
- canonical typecheck/release verification and GitHub Actions materialized;
- deterministic build, typecheck and structural/unit evidence passed.

Acceptance evidence:

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CI_REQUIRED_CHECKS_GREEN = true
REJECTED_STRATEGY_B_PRESENT = false
```

### PTH-01

Final state: `Rejected — terminal`.

```text
PTH01_PRINCIPAL_CONSUMED = true
PTH01_CORRECTIVE_CONSUMED = true
PTH01_REMAINING_BUDGET = 0/2
PTH01_CODE_MERGED = false
PTH01_MAIN_CHANGED = false
PTH01_BUDGET_REOPENING_AUTHORIZED = false
```

Evidence:

- PR `#9` closed unmerged;
- principal run `29783823263`, job `88490857332`, failed closed before commit;
- corrective run `29784077156`, job `88491663735`, failed before codemod execution;
- no rejected branch artifact is accepted or automatically transferred.

### PTD-01

Final state: `Accepted`.

Decision:

- replace the broad PTH-01 codemod with three independent official stages;
- change the executor mechanism to direct GitHub file changes;
- preserve zero Lovable interactions for release-critical work.

### PTC-01

Entry: PTD-01 Accepted.  
Objective: establish the request-host tenant context foundation only.

Required acceptance evidence:

```text
FALLBACK_TENANT_AUTHORITY = false
UNKNOWN_HOST_FAILS_CLOSED = true
AMBIGUOUS_HOST_FAILS_CLOSED = true
LOCAL_MAPPING_EXPLICIT = true
CLIENT_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
ROOT_PUBLIC_TENANT_PREFLIGHT = true
RELEASE_GATE_GREEN = true
```

Successor authorization: PTQ-01 only after PTC-01 acceptance.

### PTQ-01

Entry: PTC-01 Accepted.  
Objective: bind all public reads to the accepted server context.

Required acceptance evidence:

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_META_TENANT_BOUND = true
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_FORM_DEFINITION_TENANT_BOUND = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
PUBLIC_CATALOG_TENANT_BOUND = true
PUBLIC_BLOG_TENANT_BOUND = true
PUBLIC_LAUNCH_TENANT_BOUND = true
CLIENT_TENANT_READ_INPUT = false
RELEASE_GATE_GREEN = true
```

Successor authorization: PTM-01 only after PTQ-01 acceptance.

### PTM-01

Entry: PTQ-01 Accepted.  
Objective: bind all public mutations and prove cross-tenant denial.

Required acceptance evidence:

```text
PUBLIC_LEAD_TENANT_BOUND = true
PUBLIC_FORM_SUBMISSION_TENANT_BOUND = true
PUBLIC_CAMPAIGN_EVENT_TENANT_BOUND = true
PORTAL_PROPERTY_TENANT_BOUND = true
FORGED_TENANT_PAYLOAD_DENIED = true
CROSS_TENANT_RESOURCE_ID_DENIED = true
RELEASE_GATE_GREEN = true
```

Successor authorization: PSG-01 only after PTM-01 acceptance.

### PSG-01

Entry: PTM-01 Accepted.

Required acceptance evidence:

```text
ANONYMOUS_BOOTSTRAP_ADMIN = false
PUBLISHABLE_KEY_OPERATIONAL_AUTHORITY = false
PUBLIC_SERVICE_ROLE_ENTRYPOINTS_FAIL_CLOSED = true
CMS_RICHTEXT_SANITIZED = true
CMS_EMBED_ALLOWLIST = true
CMS_LINK_PROTOCOL_ALLOWLIST = true
NEGATIVE_SECURITY_TESTS_PASSED = true
```

Successor authorization: HVP-01 only after PSG-01 acceptance.

### HVP-01

Entry: PSG-01 Accepted and green audited `main`.  
Mode: runbook/evidence gate.

Missing backup, operator authorization, recovery capability or safe-data conditions results in `Blocked External`; it does not authorize implementation loops.

Successor authorization:

- Controlled Homologation when no blocking visual defect exists;
- VSP-01 only when persisted HVP evidence identifies blocking visual/product defects.

### VSP-01

Lovable is permitted only for visual/product defects explicitly evidenced by HVP-01.

Prohibited domains:

- tenant authority and security;
- migrations/RLS/grants;
- Auth/Storage;
- cron/queues/webhooks;
- build/toolchain/CI;
- canonical governance.

---

## 4. Global interaction ceiling

```text
Release-critical Lovable executions = 0
Governance/documentary Lovable executions = 0
Optional visual Lovable executions = maximum 2 total
```

---

## 5. Binding next action

```text
NEXT_STAGE_AUTHORIZED = PTC-01
AUTHORIZED_EXECUTOR = Direct GitHub file changes
GITHUB_ACTIONS_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
