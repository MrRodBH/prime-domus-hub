# Delivery Recovery Execution Plan

## Status

**Accepted delivery plan — execution controlled by direct GitHub audit**

**Baseline:** `193e761dad3d15981205362bc08eedd2bbd2c1c4`  
**Planning authority:** DRA-01  
**Delivery model:** `HYBRID_DELIVERY_EXECUTION_MODEL.md`

---

## 1. Delivery objective

Reach controlled homologation without continuing the prior prompt loop or expanding scope into full product completion.

The plan is intentionally limited to four mandatory gates and one optional visual package.

---

## 2. Critical path

| Order | Gate | Executor | Result | Lovable budget |
|---:|---|---|---|---:|
| 1 | GNR-01 — GitHub-Native Release Gate | GitHub-native | deterministic typecheck/build/CI and toolchain stability | 0 |
| 2 | PTH-01 — Public Tenant Authority Hardening | GitHub-native | fail-closed host/tenant context across public reads and writes | 0 |
| 3 | PSG-01 — Public Surface Security Gate | GitHub-native | privileged endpoints and CMS rendering hardened | 0 |
| 4 | HVP-01 — Homologation Validation Preflight | GitHub-native runbook + operator | Same-Backend eligibility and persisted evidence | 0 |
| 5 | VSP-01 — Optional Visual Stabilization | Lovable, only if evidence requires | consolidated blocking visual corrections | 0–2 |

No other stage may enter the critical path before controlled homologation.

---

## 3. Delivery rules

1. Every mandatory implementation is a branch and pull request.
2. `main` is not modified through an unreviewed external prompt.
3. Every PR must list files changed, commands executed, exit codes and unresolved risks.
4. A green report without underlying logs is insufficient.
5. One principal PR and at most one consolidated corrective PR are permitted per gate.
6. A failed corrective cannot be restarted under a renamed stage with the same material scope and executor.
7. Documentation-only confirmation never goes to Lovable.
8. Lovable cannot alter runtime, security, migrations, RLS, Auth, Storage, cron, queues, build or CI before homologation.

---

## 4. Gate acceptance matrix

### GNR-01

Must prove:

```text
TYPECHECK_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
CI_REQUIRED_CHECKS_GREEN = true
```

### PTH-01

Must prove:

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

### PSG-01

Must prove:

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

Must prove:

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

The following items are explicitly outside the current delivery path:

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

Deferral does not authorize unsafe fallback behavior. Existing exposed boundaries still require the minimum security treatment defined by DRA-01.

---

## 6. Interaction ceiling

```text
Mandatory remaining Lovable interactions before homologation: 0
Maximum optional Lovable interactions before homologation: 2
Maximum documentary/governance Lovable interactions: 0
```

The optional budget may be used only after HVP-01 and only for a single consolidated visual package.

---

## 7. Current authorization

```text
DRA-01 = Accepted
GNR-01 = Authorized next
PTH-01 = Planned — Blocked by GNR-01
PSG-01 = Planned — Blocked by PTH-01
HVP-01 = Planned — Blocked by PSG-01
VSP-01 = Optional — Not authorized unless HVP-01 records blocking visual defects
LOVABLE = Not authorized for current gate
```
