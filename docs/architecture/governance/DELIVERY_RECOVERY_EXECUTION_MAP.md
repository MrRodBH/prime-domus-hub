# DELIVERY RECOVERY EXECUTION MAP

## Status

**Accepted — binding map for the post-FRP delivery recovery path**

**Authority:** explicit product-owner delivery reset + DRA-01 direct GitHub audit  
**Current audited runtime HEAD:** `c021db3cf3b693887e2832d4d6736a04b0d749fc`

---

## 1. Scope and relation to prior history

This map governs only the delivery path created after the terminal rejection of FRP-01.

It does not reopen, rename, retry or inherit implementation authority from:

- LSV-01;
- LSV-02;
- LSR-01;
- LSR-02;
- FRP-01;
- rejected FRP-01 successor boundaries;
- PTH-01 after its terminal rejection.

`FINITE_ROADMAP_EXECUTION_MAP.md` remains the historical authority for prior terminal stages. For the recovery path beginning at DRA-01, this document is the binding execution map and supersedes stale remaining-stage sequences elsewhere.

---

## 2. Current stage table

| Order | Stage | State | Executor | Budget |
|---:|---|---|---|---|
| 1 | DRA-01 — Delivery Recovery & Release Criticality Audit | Accepted | Direct GitHub audit | completed; zero Lovable interactions |
| 2 | GNR-01 — GitHub-Native Release Gate | Accepted | GitHub-native | principal PR consumed; corrective PR not consumed |
| 3 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | GitHub-native broad codemod path | principal consumed; corrective consumed; remaining 0/2 |
| 4 | PTC-01 — Public Tenant Context Foundation | Authorized next | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 5 | PTR-01 — Public Tenant Read Binding | Planned — Blocked by PTC-01 | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 6 | PTW-01 — Public Tenant Writer Authority | Planned — Blocked by PTR-01 | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 7 | PSG-01 — Public Surface Security Gate | Planned — Blocked by PTW-01 | GitHub-native | 1 principal PR + max 1 consolidated corrective PR |
| 8 | HVP-01 — Homologation Validation Preflight | Planned — Blocked by PSG-01 | GitHub-native runbook + authorized operator | evidence gate; no feature implementation |
| 9 | VSP-01 — Optional Visual Stabilization Package | Optional — Not authorized | Lovable only when HVP-01 records blocking visual defects | global max 1 principal + 1 corrective |
| 10 | Controlled Homologation | Blocked by HVP-01 and, only when triggered, VSP-01 | operator/product team | not an implementation prompt |

---

## 3. Terminal and accepted stages

### DRA-01

Final state: `Accepted`.

Accepted outputs:

- hybrid delivery model;
- release-critical classification;
- executor allocation;
- finite recovery path;
- financial and interaction ceiling.

### GNR-01

Final state: `Accepted`.

Accepted implementation:

- PR `#7` merged as `9a9c97c549e0f6a575546abc5a9ffa0a3904078d`;
- rejected authored TanStack Start declaration removed;
- rejected route-tree rewriting plugin removed;
- generated route tree restored as the single Register authority;
- Bun pinned to `1.3.14`;
- canonical typecheck, release verification and CI commands materialized;
- GitHub Release Gate completed successfully.

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
PTH01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTH01_ADDITIONAL_ATTEMPT_AUTHORIZED = false
PTH01_CODE_MERGED_TO_MAIN = false
```

Factual result:

- principal workflow run `29783823263`, job `88490857332`, failed closed inside the broad codemod before any implementation commit;
- consolidated corrective workflow run `29784077156`, job `88491663735`, failed before codemod execution because the preparatory matcher was not unique;
- PR `#9` was closed unmerged;
- `main` received no PTH-01 runtime, schema, migration, RLS, grant, Auth or Storage change;
- rejected branch artifacts are historical only and are not transferred.

The material requirement remains release-blocking, but the failed broad codemod mechanism is prohibited. Continuation is allowed only because the scope is formally reduced into independent outcomes and the implementation mechanism changes to direct, reviewable file edits.

---

## 4. Reduced public-tenant recovery sequence

### PTC-01 — Public Tenant Context Foundation

**Objective:** establish one server-owned request-host-to-tenant context foundation.

Required acceptance evidence:

```text
FALLBACK_TENANT_AUTHORITY = false
REQUEST_HOST_DERIVED_SERVER_SIDE = true
HOST_NORMALIZATION_DETERMINISTIC = true
UNKNOWN_HOST_FAILS_CLOSED = true
ABSENT_HOST_FAILS_CLOSED = true
AMBIGUOUS_HOST_FAILS_CLOSED = true
DEVELOPMENT_HOST_MAPPING_EXPLICIT_ONLY = true
CLIENT_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

Scope limit: foundation only. Do not migrate all public reads or writers in this stage.

Implementation mechanism:

- direct edits to explicitly listed files;
- no repository-wide codemod;
- no workflow that mutates and commits application code;
- no migration/RLS/grant changes unless a new Impact Analysis explicitly proves they are required for this foundation.

Successor: PTR-01 only after PTC-01 acceptance.

### PTR-01 — Public Tenant Read Binding

**Objective:** bind public read surfaces to the accepted server-derived tenant context.

Required acceptance evidence:

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_PUBLIC_READS = false
GLOBAL_SLUG_AMBIGUITY_FAILS_CLOSED = true
UNKNOWN_HOST_PUBLIC_READ_DENIAL = true
CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = true
```

Successor: PTW-01 only after PTR-01 acceptance.

### PTW-01 — Public Tenant Writer Authority

**Objective:** bind public forms, campaign events and portal writers to deterministic server authority.

Required acceptance evidence:

```text
PUBLIC_FORM_TENANT_BOUND = true
PUBLIC_CAMPAIGN_EVENT_TENANT_BOUND = true
PUBLIC_PORTAL_TOKEN_CARDINALITY_DETERMINISTIC = true
FORGED_TENANT_PAYLOAD_DENIED = true
FORGED_TENANT_HEADER_DENIED = true
CROSS_TENANT_PUBLIC_WRITE_TESTS_PASSED = true
RLS_GRANTS_PRESERVED_OR_EXPLICITLY_HARDENED = true
```

Successor: PSG-01 only after PTW-01 acceptance.

### PSG-01

Entry: PTW-01 Accepted.  
Exit: finite terminal state.

```text
ANONYMOUS_BOOTSTRAP_ADMIN = false
PUBLISHABLE_KEY_OPERATIONAL_AUTHORITY = false
PUBLIC_SERVICE_ROLE_ENTRYPOINTS_FAIL_CLOSED = true
CMS_RICHTEXT_SANITIZED = true
CMS_EMBED_ALLOWLIST = true
CMS_LINK_PROTOCOL_ALLOWLIST = true
NEGATIVE_SECURITY_TESTS_PASSED = true
```

Successor: HVP-01 only after PSG-01 acceptance.

### HVP-01

Entry: PSG-01 Accepted and green audited `main`.  
Mode: runbook/evidence gate.

Missing backup, operator authorization, recovery capability or safe data conditions results in `Blocked External`; it does not authorize implementation loops.

Successor:

- Controlled Homologation when no blocking visual defect exists;
- VSP-01 only when persisted HVP evidence identifies blocking visual/product defects.

### VSP-01

Lovable is permitted only here and only for visual/product defects explicitly evidenced by HVP-01.

Prohibited domains:

- tenant authority and security;
- migrations, RLS and grants;
- Auth and Storage;
- cron, queues and webhooks;
- build, toolchain and CI;
- canonical governance.

---

## 5. Global interaction ceiling

```text
Release-critical Lovable executions = 0
Governance/documentary Lovable executions = 0
Optional visual Lovable executions = maximum 2 total
```

---

## 6. Binding next action

```text
NEXT_STAGE_AUTHORIZED = PTC-01
AUTHORIZED_EXECUTOR = GitHub-native direct file edits
BROAD_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
