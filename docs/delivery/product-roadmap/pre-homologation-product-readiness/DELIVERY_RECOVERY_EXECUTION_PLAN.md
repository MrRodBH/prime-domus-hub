# Delivery Recovery Execution Plan

## Status

**Accepted delivery plan — execution controlled by direct GitHub audit**

**Current planning authority:** DRA-01 + PTD-01  
**Delivery model:** `HYBRID_DELIVERY_EXECUTION_MODEL.md`  
**Binding stage map:** `DELIVERY_RECOVERY_EXECUTION_MAP.md`

---

## 1. Delivery objective

Reach controlled homologation without returning to broad prompts, broad codemods or full-product scope.

PTH-01 is `Rejected — terminal`. No code from its unmerged PR is accepted. The public tenant boundary is now divided into context, reads and mutations.

---

## 2. Critical path

| Order | Gate | Executor | Result | Lovable budget |
|---:|---|---|---|---:|
| 1 | GNR-01 — GitHub-Native Release Gate | GitHub-native | deterministic typecheck/build/CI and toolchain stability | 0 |
| 2 | PTC-01 — Public Tenant Context Foundation | Direct GitHub file changes | fail-closed request-host tenant context | 0 |
| 3 | PTQ-01 — Public Tenant Query Binding | Direct GitHub file changes | all public reads tenant-bound | 0 |
| 4 | PTM-01 — Public Tenant Mutation Binding | Direct GitHub file changes | all public writes tenant-bound with negative isolation proof | 0 |
| 5 | PSG-01 — Public Surface Security Gate | GitHub-native | privileged endpoints and CMS rendering hardened | 0 |
| 6 | HVP-01 — Homologation Validation Preflight | GitHub-native runbook + operator | Same-Backend eligibility and persisted evidence | 0 |
| 7 | VSP-01 — Optional Visual Stabilization | Lovable only if HVP evidence requires | one consolidated visual package | 0–2 |

No other stage may enter the release-critical path before controlled homologation.

---

## 3. Delivery rules

1. Every implementation is a branch and pull request.
2. `main` is not modified through an unreviewed external prompt.
3. Every PR identifies files changed, commands executed, exit codes and residual risk.
4. A report without underlying GitHub evidence is insufficient.
5. Each stage permits one principal PR and at most one consolidated corrective PR.
6. A failed corrective forces a terminal decision.
7. Material scope cannot be restarted under a renamed stage without formal decomposition or executor change.
8. PTC-01, PTQ-01 and PTM-01 prohibit GitHub Actions codemods; changes are direct file-level edits.
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
PRINCIPAL_CONSUMED = true
CORRECTIVE_CONSUMED = true
REMAINING_BUDGET = 0/2
CODE_MERGED = false
MAIN_CHANGED = false
```

### PTC-01

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

### PTQ-01

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

### PTM-01

```text
PUBLIC_LEAD_TENANT_BOUND = true
PUBLIC_FORM_SUBMISSION_TENANT_BOUND = true
PUBLIC_CAMPAIGN_EVENT_TENANT_BOUND = true
PORTAL_PROPERTY_TENANT_BOUND = true
FORGED_TENANT_PAYLOAD_DENIED = true
CROSS_TENANT_RESOURCE_ID_DENIED = true
RELEASE_GATE_GREEN = true
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
Mandatory remaining Lovable interactions before homologation = 0
Maximum optional Lovable interactions before homologation = 2
Maximum documentary/governance Lovable interactions = 0
```

---

## 7. Current authorization

```text
DRA-01 = Accepted
GNR-01 = Accepted
PTH-01 = Rejected — terminal
PTD-01 = Accepted
PTC-01 = Authorized next
PTQ-01 = Planned — Blocked by PTC-01
PTM-01 = Planned — Blocked by PTQ-01
PSG-01 = Planned — Blocked by PTM-01
HVP-01 = Planned — Blocked by PSG-01
VSP-01 = Optional — Not authorized unless HVP-01 records blocking visual defects
LOVABLE = Not authorized for current gate
```
