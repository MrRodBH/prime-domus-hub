# Delivery Recovery Execution Plan

## Status

**Accepted delivery plan — execution controlled by direct GitHub audit**

**Initial baseline:** `193e761dad3d15981205362bc08eedd2bbd2c1c4`  
**Current repository baseline at reconciliation start:** `d630daf8ffdf28e195de4ed0028577288e974652`  
**Current runtime implementation baseline:** `a746e58bc2c48f0e20ddee62571c16ace809bbd8`  
**Planning authority:** DRA-01 + terminal scope reductions of PTH-01 and PTR-01  
**Delivery model:** `HYBRID_DELIVERY_EXECUTION_MODEL.md`

---

## 1. Delivery objective

Reach controlled homologation without continuing parallel execution loops, without reusing rejected mechanisms and without expanding scope into full product completion.

Current result:

- GNR-01 accepted;
- PTH-01 rejected terminal with no runtime merge;
- PTC-01 accepted;
- PTR-01 rejected terminal after two concurrent principal/corrective flows;
- PTR runtime remains physically present but is not accepted;
- PTW-01 is blocked;
- remaining read work is reduced into PSC-01 and PPR-01.

---

## 2. Critical path

| Order | Gate | State | Executor | Result | Lovable budget |
|---:|---|---|---|---|---:|
| 1 | GNR-01 — GitHub-Native Release Gate | Accepted | GitHub-native | deterministic typecheck/build/CI and toolchain stability | 0 |
| 2 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | rejected broad codemod path | no runtime code merged; budget exhausted | 0 |
| 3 | PTC-01 — Public Tenant Context Foundation | Accepted | GitHub-native direct file edits | fail-closed server-owned host-to-tenant context | 0 |
| 4 | PTR-01 — Public Tenant Read Binding | Rejected — terminal | duplicate concurrent direct-edit flows | runtime present but not accepted; budget violated | 0 |
| 5 | PSC-01 — Public Settings & Campaign Read Recovery | Authorized next | GitHub-native direct file edits | root/Meta fail-closed correction and runtime collection proof | 0 |
| 6 | PPR-01 — Public Page Runtime Verification | Blocked by PSC-01 | GitHub-native direct file edits | serializable page contract and runtime ambiguity/isolation proof | 0 |
| 7 | PTW-01 — Public Tenant Writer Authority | Blocked by PPR-01 | GitHub-native direct file edits | tenant-bound forms, campaign events and portal writers | 0 |
| 8 | PSG-01 — Public Surface Security Gate | Blocked by PTW-01 | GitHub-native | privileged endpoints, CSRF and CMS rendering hardened | 0 |
| 9 | HVP-01 — Homologation Validation Preflight | Blocked by PSG-01 | GitHub-native runbook + operator | Same-Backend eligibility and persisted evidence | 0 |
| 10 | VSP-01 — Optional Visual Stabilization | Not authorized | Lovable only if HVP evidence requires | consolidated blocking visual corrections | 0–2 |

No other stage may enter the critical path before controlled homologation.

---

## 3. Delivery rules

1. Every mandatory implementation is a branch and pull request.
2. `main` is not modified through an unreviewed external prompt.
3. Parallel principal/corrective flows for the same stage are prohibited.
4. Every PR must list files changed, commands executed, exit codes and unresolved risks.
5. A green Release Gate proves only the commands executed by that gate; it does not prove missing runtime behavior.
6. One principal PR and at most one consolidated corrective PR are permitted per gate.
7. A failed or exhausted stage cannot be restarted under another branch or issue with the same material scope.
8. PTH-01 and PTR-01 are terminal and receive no additional implementation.
9. PSC-01 and PPR-01 are valid only because the remaining defects are decomposed into independent collection/root and page-runtime outcomes.
10. Existing rejected runtime is an observed baseline, not an accepted deliverable.
11. Documentation-only confirmation never goes to Lovable.
12. Lovable cannot alter runtime, security, migrations, RLS, Auth, Storage, cron, queues, build or CI before homologation.
13. Structural source-string checks cannot be reported as executable runtime cross-tenant evidence.
14. Release Gate output must be persisted when needed for final audit.

---

## 4. Gate acceptance matrix

### GNR-01 — Accepted

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
CI_REQUIRED_CHECKS_GREEN = true
```

### PTH-01 — Rejected terminal

```text
PRINCIPAL_WORKFLOW_CONCLUSION = failure
CORRECTIVE_WORKFLOW_CONCLUSION = failure
CODE_MERGED_TO_MAIN = false
PRINCIPAL_CONSUMED = true
CORRECTIVE_CONSUMED = true
REMAINING_BUDGET = 0/2
THIRD_ATTEMPT_AUTHORIZED = false
```

### PTC-01 — Accepted

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
RELEASE_GATE_GREEN = true
```

### PTR-01 — Rejected terminal

```text
FLOW_A_PRINCIPAL = failure
FLOW_A_CORRECTIVE = failure
FLOW_B_PRINCIPAL = failure
FLOW_B_CORRECTIVE = success
EFFECTIVE_RUNTIME_RELEASE_GATE = success
PROMPT_PR_BUDGET_COMPLIANT = false
UNKNOWN_HOST_PUBLIC_APPLICATION_DENIAL = false
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = false
RUNTIME_CROSS_TENANT_READ_TESTS_EXECUTED = false
CODE_PRESENT_IN_MAIN = true
CODE_ACCEPTED = false
REMAINING_BUDGET = 0/2
ADDITIONAL_PTR_IMPLEMENTATION_AUTHORIZED = false
```

### PSC-01

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

### PPR-01

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

### PTW-01

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

### PSG-01

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

### HVP-01

```text
AUDITED_MAIN_GREEN = true
PROTECTED_BASELINE_REGISTERED = true
BACKUP_RECOVERY_CONFIRMED = true
SYNTHETIC_TENANTS_CREATED >= 2
REAL_SESSIONS_ACQUIRED > 0
FORGED_HEADER_DENIAL_VERIFIED = true
UNKNOWN_HOST_DENIAL_VERIFIED = true
CROSS_TENANT_DENIAL_VERIFIED = true
PUBLIC_CMS_SECURITY_PROBES_PASSED = true
ORPHANED_FIXTURES = 0
RESIDUE_SCAN_PASSED = true
EVIDENCE_PERSISTED = true
```

---

## 5. Scope deferred from homologation

- complete custom-domain provisioning;
- final billing-provider integration;
- checkout and customer portal;
- final commercial UI;
- complete onboarding/configuration center;
- broad dashboard redesign;
- noncritical visual polish;
- CDN/cache optimization;
- documentation reorganization;
- historical residue cleanup.

Deferral does not authorize unsafe fallback behavior.

---

## 6. Interaction ceiling

```text
Mandatory remaining Lovable interactions before homologation: 0
Maximum optional Lovable interactions before homologation: 2
Maximum documentary/governance Lovable interactions: 0
```

---

## 7. Current authorization

```text
DRA-01 = Accepted
GNR-01 = Accepted
PTH-01 = Rejected — terminal
PTC-01 = Accepted
PTR-01 = Rejected — terminal
PSC-01 = Authorized next
PPR-01 = Planned — Blocked by PSC-01
PTW-01 = Planned — Blocked by PPR-01
PSG-01 = Planned — Blocked by PTW-01
HVP-01 = Planned — Blocked by PSG-01
VSP-01 = Optional — Not authorized unless HVP-01 records blocking visual defects
LOVABLE = Not authorized for current gate
```
