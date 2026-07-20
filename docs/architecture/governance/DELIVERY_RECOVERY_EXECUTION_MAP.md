# DELIVERY RECOVERY EXECUTION MAP

## Status

**Accepted — binding map for the post-FRP delivery recovery path**

**Authority:** explicit product-owner delivery reset + DRA-01 direct GitHub audit  
**Effective after merge to:** `main`

---

## 1. Scope and relation to prior history

This map governs only the delivery path created after the terminal rejection of FRP-01.

It does not reopen, rename, retry or inherit implementation authority from:

- LSV-01;
- LSV-02;
- LSR-01;
- LSR-02;
- FRP-01;
- rejected FRP-01 successor boundaries.

`FINITE_ROADMAP_EXECUTION_MAP.md` remains the historical authority for those terminal stages. For the recovery path beginning at DRA-01, this document is the binding execution map and supersedes any stale remaining-stage sequence in `ROADMAP_ARCHITECTURAL.md` or the former finite map.

---

## 2. Current stage table

| Order | Stage | State | Executor | Budget |
|---:|---|---|---|---|
| 1 | DRA-01 — Delivery Recovery & Release Criticality Audit | Accepted | Direct GitHub audit | completed; zero Lovable interactions |
| 2 | GNR-01 — GitHub-Native Release Gate | Authorized next | GitHub-native | 1 principal PR + max 1 consolidated corrective PR |
| 3 | PTH-01 — Public Tenant Authority Hardening | Planned — Blocked by GNR-01 | GitHub-native | 1 principal PR + max 1 consolidated corrective PR |
| 4 | PSG-01 — Public Surface Security Gate | Planned — Blocked by PTH-01 | GitHub-native | 1 principal PR + max 1 consolidated corrective PR |
| 5 | HVP-01 — Homologation Validation Preflight | Planned — Blocked by PSG-01 | GitHub-native runbook + authorized operator | evidence gate; no feature implementation |
| 6 | VSP-01 — Optional Visual Stabilization Package | Optional — Not authorized | Lovable only when HVP-01 records blocking visual defects | global max 1 principal + 1 corrective |
| 7 | Controlled Homologation | Blocked by HVP-01 and, only when triggered, VSP-01 | operator/product team | not an implementation prompt |

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

Entry: DRA-01 Accepted.  
Exit: `Accepted`, `Accepted with Non-Blocking Backlog`, `Rejected`, `Superseded` or `Blocked External`.

Required acceptance evidence:

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CI_REQUIRED_CHECKS_GREEN = true
```

Successor authorization: PTH-01 only after GNR-01 acceptance.

### PTH-01

Entry: GNR-01 Accepted.  
Exit: finite terminal state.

Required acceptance evidence:

```text
FALLBACK_TENANT_AUTHORITY = false
UNKNOWN_HOST_FAILS_CLOSED = true
CLIENT_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_FORM_TENANT_BOUND = true
PUBLIC_CAMPAIGN_TENANT_BOUND = true
CROSS_TENANT_NEGATIVE_TESTS_PASSED = true
```

Successor authorization: PSG-01 only after PTH-01 acceptance.

### PSG-01

Entry: PTH-01 Accepted.  
Exit: finite terminal state.

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

Missing backup, operator authorization, recovery capability or safe data conditions results in `Blocked External`. It does not authorize new implementation loops.

Successor authorization:

- Controlled Homologation when no blocking visual defect exists;
- VSP-01 only when the persisted HVP evidence identifies blocking visual/product defects.

### VSP-01

Lovable is permitted only here and only for visual/product defects explicitly evidenced by HVP-01.

Prohibited domains:

- tenant authority;
- security;
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

The optional limit is global across the entire pre-homologation visual package.

---

## 5. Binding next action

```text
NEXT_STAGE_AUTHORIZED = GNR-01
AUTHORIZED_EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
```
