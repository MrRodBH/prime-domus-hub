# PR-M2 — CRM Report Authority — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = CRM Report Authority
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current authority

CRM reports and projections use the canonical Tenant CRM authority:

```text
ADMINISTRATIVE_CONTEXT = requireTenant
TENANT_AUTHORITY = requireTenantScopedAuthority
PERMISSION_AUTHORITY = resolveEffectiveTenantPermission
MODULE = crm
SCOPES = global / equipe / proprio
HAS_ROLE_TENANT_AUTHORITY = false
USER_ROLES_TENANT_AUTHORITY = false
CLIENT_SCOPE_AUTHORITY = false
SUPER_ADMIN_WITHOUT_IMPERSONATION = denied
```

Current code:

- `src/lib/api/tenant-crm-authority.server.ts`;
- `src/lib/api/tenant-crm.functions.ts`;
- `src/lib/api/tenant-crm-compat.functions.ts`;
- `src/lib/api/dashboard.functions.ts`.

Reports, dashboard projections and drill-downs derive from tenant-filtered server reads. Legacy direct lead table access and external AI-generated reporting are not active authorities.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:crm-report-authority
REGRESSION_COMMAND = bun run test:pr-m2:crm-operational-workflow-functional-completion
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic authority/report projection tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_BACKEND_STATE_PROVED = false
DEPLOY_EXECUTED = false
EXTERNAL_AI_PROVIDER_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
