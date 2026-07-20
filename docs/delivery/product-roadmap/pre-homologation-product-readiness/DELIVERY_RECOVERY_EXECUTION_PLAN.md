# Delivery Recovery Execution Plan

## Status

**Accepted delivery plan — execution controlled by direct GitHub audit**

**Initial baseline:** `193e761dad3d15981205362bc08eedd2bbd2c1c4`  
**Current runtime baseline:** `c021db3cf3b693887e2832d4d6736a04b0d749fc`  
**Planning authority:** DRA-01 + PTH-01 terminal scope reduction  
**Delivery model:** `HYBRID_DELIVERY_EXECUTION_MODEL.md`

---

## 1. Delivery objective

Reach controlled homologation without continuing the prior prompt loop, without reusing rejected mechanisms and without expanding scope into full product completion.

GNR-01 is accepted. PTH-01 is rejected terminal after its broad codemod principal and corrective both failed closed before producing implementation code. The remaining public-tenant work is reduced into three independent GitHub-native gates executed through direct file edits.

---

## 2. Critical path

| Order | Gate | State | Executor | Result | Lovable budget |
|---:|---|---|---|---|---:|
| 1 | GNR-01 — GitHub-Native Release Gate | Accepted | GitHub-native | deterministic typecheck/build/CI and toolchain stability | 0 |
| 2 | PTH-01 — Public Tenant Authority Hardening | Rejected — terminal | rejected broad codemod path | no runtime code merged; budget exhausted | 0 |
| 3 | PTC-01 — Public Tenant Context Foundation | Authorized next | GitHub-native direct file edits | fail-closed server-owned host-to-tenant context | 0 |
| 4 | PTR-01 — Public Tenant Read Binding | Blocked by PTC-01 | GitHub-native direct file edits | tenant-bound public settings, pages and campaign reads | 0 |
| 5 | PTW-01 — Public Tenant Writer Authority | Blocked by PTR-01 | GitHub-native direct file edits | tenant-bound forms, campaign events and portal writers | 0 |
| 6 | PSG-01 — Public Surface Security Gate | Blocked by PTW-01 | GitHub-native | privileged endpoints and CMS rendering hardened | 0 |
| 7 | HVP-01 — Homologation Validation Preflight | Blocked by PSG-01 | GitHub-native runbook + operator | Same-Backend eligibility and persisted evidence | 0 |
| 8 | VSP-01 — Optional Visual Stabilization | Not authorized | Lovable only if HVP evidence requires | consolidated blocking visual corrections | 0–2 |

No other stage may enter the critical path before controlled homologation.

---

## 3. Delivery rules

1. Every mandatory implementation is a branch and pull request.
2. `main` is not modified through an unreviewed external prompt.
3. Every PR must list files changed, commands executed, exit codes and unresolved risks.
4. A green report without underlying logs is insufficient.
5. One principal PR and at most one consolidated corrective PR are permitted per gate.
6. A failed corrective cannot be restarted under a renamed stage with the same material scope and mechanism.
7. PTH-01 is terminal and receives no third attempt.
8. PTC-01, PTR-01 and PTW-01 are valid only because scope was reduced into independent outcomes and the mechanism changed from broad codemod to direct file edits.
9. Documentation-only confirmation never goes to Lovable.
10. Lovable cannot alter runtime, security, migrations, RLS, Auth, Storage, cron, queues, build or CI before homologation.

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
IMPLEMENTATION_COMMIT_PRODUCED = false
CODE_MERGED_TO_MAIN = false
PRINCIPAL_CONSUMED = true
CORRECTIVE_CONSUMED = true
REMAINING_BUDGET = 0/2
THIRD_ATTEMPT_AUTHORIZED = false
```

### PTC-01

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

### PTR-01

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_PUBLIC_READS = false
GLOBAL_SLUG_AMBIGUITY_FAILS_CLOSED = true
UNKNOWN_HOST_PUBLIC_READ_DENIAL = true
CROSS_TENANT_PUBLIC_READ_TESTS_PASSED = true
```

### PTW-01

```text
PUBLIC_FORM_TENANT_BOUND = true
PUBLIC_CAMPAIGN_EVENT_TENANT_BOUND = true
PUBLIC_PORTAL_TOKEN_CARDINALITY_DETERMINISTIC = true
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
PTC-01 = Authorized next
PTR-01 = Planned — Blocked by PTC-01
PTW-01 = Planned — Blocked by PTR-01
PSG-01 = Planned — Blocked by PTW-01
HVP-01 = Planned — Blocked by PSG-01
VSP-01 = Optional — Not authorized unless HVP-01 records blocking visual defects
LOVABLE = Not authorized for current gate
```
