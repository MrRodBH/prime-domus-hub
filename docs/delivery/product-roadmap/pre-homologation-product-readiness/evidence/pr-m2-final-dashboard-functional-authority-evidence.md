# PR-M2 — Dashboard Functional Authority — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Dashboard Functional Authority
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current authority

```text
TENANT_CONTEXT = requireTenant
TENANT_BOUNDARY = requireTenantScopedAuthority
PERMISSION_RESOLUTION = resolveEffectiveTenantPermission
MODULE = crm
ACTION = visualizar
SCOPES = global / team / own
HAS_ROLE_TENANT_AUTHORITY = false
USER_ROLES_TENANT_AUTHORITY = false
SUPER_ADMIN_WITHOUT_IMPERSONATION = denied
```

Current code:

- `src/lib/api/dashboard.functions.ts`;
- `src/lib/dashboard/dashboard-metric-registry.ts`;
- `run-pr-m2-dashboard-authority-specs.ts`.

The effective scope controls broker/team filters and every data source is explicitly tenant-filtered. Ambiguous broker/team cardinality and partial source failures abort.

## Functional inventory

The closed metric registry records metric key, data source, formula, timezone, period boundary, null behavior, cardinality, permission, scope and drill-down contract. It differentiates won, lost and discarded outcomes and includes lead, funnel, property, marketing, portal and CRM alert metrics.

```text
TIMEZONE = America/Sao_Paulo
CLIENT_FORMULA_AUTHORITY = false
PARTIAL_DATA_ACCEPTED = false
DRILL_DOWN_TENANT_SCOPED = true
```

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:dashboard-authority
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic scope/filter/formula contract tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_BACKEND_STATE_PROVED = false
DEPLOY_EXECUTED = false
EXTERNAL_PROVIDER_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
