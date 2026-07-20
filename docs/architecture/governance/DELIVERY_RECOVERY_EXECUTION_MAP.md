# DELIVERY RECOVERY EXECUTION MAP

## Status

**Accepted — binding map for the post-FRP delivery recovery path**

**Authority:** explicit product-owner delivery reset + final direct GitHub audits  
**Current repository HEAD at reconciliation start:** `d630daf8ffdf28e195de4ed0028577288e974652`  
**Current runtime implementation HEAD:** `a746e58bc2c48f0e20ddee62571c16ace809bbd8`

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
| 3 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | GitHub-native broad codemod path | principal + corrective consumed; remaining 0/2 |
| 4 | PTC-01 — Public Tenant Context Foundation | Accepted | GitHub-native direct file edits | principal PR consumed; corrective PR not consumed |
| 5 | PTR-01 — Public Tenant Read Binding | Rejected — terminal | duplicate concurrent GitHub-native flows | more than allowed budget consumed; remaining 0/2 |
| 6 | PSC-01 — Public Settings & Campaign Read Recovery | Authorized next | GitHub-native direct file edits | 1 principal PR + max 1 consolidated corrective PR |
| 7 | PPR-01 — Public Page Runtime Verification | Planned — Blocked by PSC-01 | GitHub-native direct file edits + executable evidence | 1 principal PR + max 1 consolidated corrective PR |
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

- principal workflow run `29783823263`, job `88490857332`, failed closed before any implementation commit;
- consolidated corrective workflow run `29784077156`, job `88491663735`, failed before codemod execution;
- PR `#9` was closed unmerged;
- `main` received no PTH-01 runtime, schema, migration, RLS, grant, Auth or Storage change.

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
```

Evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptc-01-public-tenant-context-acceptance.md`.

### PTR-01

Final state: `Rejected — terminal`.

Two implementation flows executed concurrently against the same stage:

```text
FLOW_A_PR = 21
FLOW_A_PRINCIPAL_RUN = 29786244606
FLOW_A_CORRECTIVE_RUN = 29786580653
FLOW_A_RESULT = failure / closed unmerged

FLOW_B_PR = 22
FLOW_B_PRINCIPAL_RUN = 29786394077
FLOW_B_CORRECTIVE_RUN = 29786681893
FLOW_B_RESULT = corrective green / merged as a746e58...
```

The acceptance reconciliation `d630daf...` considered only Flow B and therefore recorded a false compliant budget.

Final audit facts:

- audit PR `#26` ran the full Release Gate against effective runtime `a746e58...`;
- run `29787093558`, job `88500886301`, concluded success;
- compilation, build and current structural tests are green;
- root loader still catches unresolved tenant errors and renders default branding/metadata;
- public Meta read ignores the Supabase query error;
- PTR tests inspect source strings and do not execute runtime cross-tenant probes;
- prior claims `UNKNOWN_HOST_PUBLIC_READ_DENIAL = true` and `CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = true` were not proven.

```text
PTR01_STATE = Rejected
PTR01_TERMINAL = true
PTR01_PRINCIPAL_EXECUTIONS = 2
PTR01_CORRECTIVE_EXECUTIONS = 2
PTR01_BUDGET_COMPLIANT = false
PTR01_REMAINING_IMPLEMENTATION_BUDGET = 0/2
PTR01_ADDITIONAL_IMPLEMENTATION_AUTHORIZED = false
PTR01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false
PTW01_AUTHORIZED = false
```

Runtime disposition:

- commit `a746e58...` remains physically present because it removes client tenant fields and adds explicit tenant predicates;
- physical presence is not architectural acceptance;
- rollback is not authorized by this documentary reconciliation because it would restore less restrictive public reads;
- reduced successors must independently audit, retain, replace or correct only their frozen scope;
- no rejected PTR artifact is automatically accepted or transferable.

Evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/ptr-01-public-tenant-read-binding-acceptance.md`, now superseded into a final rejection record.

---

## 4. Reduced public-read recovery sequence

### PSC-01 — Public Settings & Campaign Read Recovery

**Objective:** close the remaining fail-closed defects in root settings, public Meta and active campaign reads, while producing executable collection-read evidence.

Required acceptance evidence:

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_META_TENANT_BOUND = true
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_CAMPAIGN_READ = false
UNKNOWN_HOST_ROOT_DENIAL = true
DEFAULT_BRANDING_AFTER_TENANT_FAILURE = false
CROSS_TENANT_COLLECTION_RUNTIME_PROOF = true
COLLECTION_RETURN_CONTRACTS_SERIALIZABLE = true
PTC01_SPECS_REMAIN_GREEN = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

Implementation limits:

- direct edits only;
- observed runtime `a746e58...` is a non-accepted baseline, not an auto-transferred deliverable;
- no public page, form, campaign-event or portal writer changes;
- no broad codemod;
- no migration/RLS/grant change unless a new Impact Analysis proves it necessary;
- no structural-only claim may be reported as runtime cross-tenant proof;
- complete Release Gate evidence must be persisted.

Successor: PPR-01 only after PSC-01 acceptance.

### PPR-01 — Public Page Runtime Verification

**Objective:** independently prove or correct the tenant-bound public page contract with a serializable DTO and executable ambiguity/cross-tenant evidence.

Required acceptance evidence:

```text
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_PAGE_CLIENT_TENANT_INPUT = false
GLOBAL_PAGE_SLUG_AMBIGUITY_FAILS_CLOSED = true
PUBLIC_PAGE_DTO_SERIALIZABLE = true
PUBLIC_PAGE_BLOCKS_TYPED = true
PUBLIC_PAGE_ROUTE_TYPECHECK_PASSED = true
UNKNOWN_HOST_PUBLIC_PAGE_DENIAL = true
CROSS_TENANT_PUBLIC_PAGE_RUNTIME_PROOF = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

Implementation limits:

- page scope only;
- no settings, Meta, campaigns or writers;
- direct edits only;
- no broad codemod;
- no migration/RLS/grant change unless proven necessary;
- current `maybeSingle()` behavior must be tested with 0/1/N results, not accepted by inspection alone.

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
PTW01_STARTED = false
PTW01_AUTHORIZED = false
BROAD_CODEMOD_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```
