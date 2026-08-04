# PR-M2 — Administrative CMS Tenant Authority — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Administrative CMS Tenant Authority
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Scope and current authority

```text
ADMINISTRATIVE_CONTEXT = requireTenant
TENANT_AUTHORITY = requireTenantScopedAuthority
PERMISSION_AUTHORITY = resolveEffectiveTenantPermission
CMS_MODULE_AUTHORITY = cms.paginas / cms.midias / cms.configuracoes / cms.versoes
GLOBAL_ROLE_TENANT_AUTHORITY = false
SUPER_ADMIN_WITHOUT_IMPERSONATION = denied
LEGACY_CMS_PERMISSION_BYPASS = false
CLIENT_TENANT_AUTHORITY = false
```

Current code:

- `src/lib/api/tenant-cms-authority.server.ts`;
- `src/lib/api/tenant-cms-functional.functions.ts`;
- `src/lib/api/_cms.ts`;
- `src/hooks/use-cms-permissions.ts`.

The client hook is a visual projection only and no longer grants an `admin` bypass from global roles. Every read or mutation is reauthorized by the server boundary.

## Runtime and persistence

The current administrative runtime uses one tenant-scoped CMS authority for pages, media, configuration, versioning and the functional inventory. No tenant-provided executable code, arbitrary component import or parallel public runtime is accepted.

Relevant migrations include:

- `20260729183000_pr_m2_cms_workflow_functional_completion.sql`;
- `20260730050000_pr_m2_cms_functional_inventory.sql`;
- `20260730053000_pr_m2_marketing_and_cms_corrective_hardening.sql`.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:cms-authority
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic structural/runtime contract tests
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
