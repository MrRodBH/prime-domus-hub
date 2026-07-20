# DELIVERY RECOVERY EXECUTION MAP

## Status

**Accepted — binding map for the post-FRP delivery recovery path**

**Authority:** explicit product-owner delivery reset + DRA-01 direct GitHub audit  
**Current audited runtime HEAD:** `9c93b9c8b7b095e2a07e424ed895f529d5e4b4fc`

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
- PTH-01 after its terminal rejection;
- PTR-01 after its terminal rejection.

`FINITE_ROADMAP_EXECUTION_MAP.md` remains the historical authority for prior terminal stages. For the recovery path beginning at DRA-01, this document is the binding execution map and supersedes stale remaining-stage sequences elsewhere.

---

## 2. Current stage table

| Order | Stage | State | Executor | Budget |
|---:|---|---|---|---|
| 1 | DRA-01 — Delivery Recovery & Release Criticality Audit | Accepted | Direct GitHub audit | completed; zero Lovable interactions |
| 2 | GNR-01 — GitHub-Native Release Gate | Accepted | GitHub-native | principal PR consumed; corrective PR not consumed |
| 3 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | GitHub-native broad codemod path | principal consumed; corrective consumed; remaining 0/2 |
| 4 | PTC-01 — Public Tenant Context Foundation | Accepted | GitHub-native direct file edits | principal PR consumed; corrective PR not consumed |
| 5 | PTR-01 — Public Tenant Read Binding | Rejected — terminal | GitHub-native direct file edits | principal consumed; corrective consumed; remaining 0/2 |
| 6 | PSC-01 — Public Settings & Campaign Read Binding | Authorized next | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 7 | PPR-01 — Public Page Serializable Read Binding | Planned — Blocked by PSC-01 | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 8 | PTW-01 — Public Tenant Writer Authority | Planned — Blocked by PPR-01 | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 9 | PSG-01 — Public Surface Security Gate | Planned — Blocked by PTW-01 | GitHub-native | 1 principal PR + max 1 consolidated corrective PR |
| 10 | HVP-01 — Homologation Validation Preflight | Planned — Blocked by PSG-01 | GitHub-native runbook + authorized operator | evidence gate; no feature implementation |
| 11 | VSP-01 — Optional Visual Stabilization Package | Optional — Not authorized | Lovable only when HVP-01 records blocking visual defects | global max 1 principal + 1 corrective |
| 12 | Controlled Homologation | Blocked by HVP-01 and, only when triggered, VSP-01 | operator/product team | not an implementation prompt |

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

The material requirement remained release-blocking, so it was reduced into independent outcomes with a different implementation mechanism.

### PTC-01

Final state: `Accepted`.

Accepted implementation:

- PR `#18` merged as `a462c7f4632d917dd76e2ab3e071fd8d11399a4e`;
- implicit tenant fallback removed;
- server request Host is the only public host input to the resolver;
- host normalization is deterministic and does not strip `www` heuristically;
- absent, malformed, unmapped development and ambiguous host resolution fails closed;
- localhost/Lovable preview resolution requires explicit validated mapping;
- production resolution uses exact `dominio_principal` equality;
- cardinality accepts exactly one row after reading at most two;
- PTC-01 specifications are enforced by the Release Gate.

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
PTC01_PRINCIPAL_PR_CONSUMED = true
PTC01_CORRECTIVE_PR_CONSUMED = false
PTC01_REMAINING_CORRECTIVE_BUDGET = 1
```

Evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptc-01-public-tenant-context-acceptance.md`.

### PTR-01

Final state: `Rejected — terminal`.

```text
PTR01_PRINCIPAL_CONSUMED = true
PTR01_CORRECTIVE_CONSUMED = true
PTR01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTR01_ADDITIONAL_ATTEMPT_AUTHORIZED = false
PTR01_CODE_MERGED_TO_MAIN = false
PTR01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false
```

Factual result:

- principal PR `#21` tested head `6f57c87a14ce3b35cac8713b46f281f8a736aef5` and failed Release Gate run `29786244606`, job `88498300379`;
- final corrective head `2d66ffb731ca7a6faa57d9ccca3abb25b9130cc2` persisted complete logs and failed Release Gate run `29786580653`, job `88499305470`;
- artifact `8478684816`, digest `sha256:fba80df57e7a5e2e650b41390a40e235b689e8bc975a949115b23d2924be75f0`, preserved the complete corrective output;
- development build succeeded and TanStack Register authority count remained one;
- typecheck failed because the public page DTO used `blocks: unknown`, which violated the TanStack server-function serializability contract;
- route `p.$slug.tsx` consequently inferred an empty object and could not access `blocks`;
- PR `#21` was closed unmerged;
- `main` received no PTR-01 application, workflow, dependency, schema, migration, RLS, grant, Auth or Storage change.

The all-readers scope mixed collection readers with a page DTO serialization contract. Continuation is permitted only through explicit decomposition into independent outcomes. No PTR-01 artifact is automatically transferred or accepted.

Evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptr-01-terminal-rejection.md`.

---

## 4. Reduced public-read recovery sequence

### PSC-01 — Public Settings & Campaign Read Binding

**Objective:** bind public `site_settings` and active-campaign collection reads to the accepted server-derived tenant context, without changing pages or writers.

Required acceptance evidence:

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_CAMPAIGN_READ = false
UNKNOWN_HOST_ROOT_DENIAL = true
CROSS_TENANT_COLLECTION_ROW_DENIAL = true
COLLECTION_RETURN_CONTRACTS_SERIALIZABLE = true
PTC01_SPECS_REMAIN_GREEN = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

Implementation limits:

- consume the accepted PTC-01 resolver;
- direct edits only;
- no public page changes;
- no form, campaign-event or portal writer changes;
- no broad codemod;
- no migration/RLS/grant change unless a new Impact Analysis proves it necessary;
- no fallback empty-data success for unresolved tenant authority;
- persist complete Release Gate evidence on failure and success.

Successor: PPR-01 only after PSC-01 acceptance.

### PPR-01 — Public Page Serializable Read Binding

**Objective:** bind public page lookup to server-derived tenant authority with an explicit serializable DTO contract.

Required acceptance evidence:

```text
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_PAGE_CLIENT_TENANT_INPUT = false
GLOBAL_PAGE_SLUG_AMBIGUITY_FAILS_CLOSED = true
PUBLIC_PAGE_DTO_SERIALIZABLE = true
PUBLIC_PAGE_BLOCKS_TYPED = true
PUBLIC_PAGE_ROUTE_TYPECHECK_PASSED = true
UNKNOWN_HOST_PUBLIC_PAGE_DENIAL = true
CROSS_TENANT_PUBLIC_PAGE_TESTS_PASSED = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

Implementation limits:

- use `Database["public"]["Tables"]["cms_pages"]["Row"]` or an explicitly serializable mapped DTO; `unknown` is prohibited in the server-function return contract;
- direct edits only;
- no settings, campaign, form, event or portal changes;
- no broad codemod;
- no migration/RLS/grant change unless proven necessary.

Successor: PTW-01 only after PPR-01 acceptance.

### PTW-01 — Public Tenant Writer Authority

**Objective:** bind public forms, campaign events and portal writers to deterministic server authority.

Required acceptance evidence:

```text
PUBLIC_FORM_TENANT_BOUND = true
PUBLIC_CAMPAIGN_EVENT_TENANT_BOUND = true
PUBLIC_PORTAL_TOKEN_CARDINALITY_DETERMINISTIC = true
PUBLIC_PORTAL_PROPERTY_TENANT_BOUND = true
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
SERVER_FUNCTION_CSRF_MIDDLEWARE_PRESENT = true
CROSS_SITE_SERVER_FUNCTION_REQUEST_DENIED = true
PUBLIC_SERVER_ROUTES_NOT_ACCIDENTALLY_BLOCKED = true
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
NEXT_STAGE_AUTHORIZED = PSC-01
AUTHORIZED_EXECUTOR = GitHub-native direct file edits
BROAD_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
