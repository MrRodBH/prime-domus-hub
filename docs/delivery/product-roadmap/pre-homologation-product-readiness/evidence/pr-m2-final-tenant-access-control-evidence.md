# PR-M2 — Tenant Access Control — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Tenant Access Control
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current authority

```text
TENANT_PERMISSION_RESOLVER = resolve_tenant_permission
SERVER_BOUNDARY = resolveEffectiveTenantPermission
SCOPES = global / equipe / proprio
OWNER_ROOT_AUTHORITY = active owner only
SUPER_ADMIN_TENANT_ACCESS = explicit impersonation only
CUSTOM_PROFILES = tenant-bound
PROFILE_ASSIGNMENTS = tenant-bound
TEAMS = tenant-bound
USER_ROLES_TENANT_AUTHORITY = false
HAS_ROLE_TENANT_AUTHORITY = false
LEGACY_PROFILE_SYNC = retired
```

Current code and SQL:

- `src/lib/api/tenant-access-control-authority.server.ts`;
- `src/lib/api/tenant-access-control.functions.ts`;
- `supabase/migrations/20260728203000_pr_m2_tenant_access_control.sql`.

The corrective also converged Dashboard, Property Administration, CMS and CRM consumers onto this boundary and removed the active administrative wildcard export.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:tenant-access-control
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic RBAC/scope/impersonation tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_RLS_GRANT_EXECUTION_PROVED = false
DEPLOY_EXECUTED = false
EXTERNAL_PROVIDER_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
