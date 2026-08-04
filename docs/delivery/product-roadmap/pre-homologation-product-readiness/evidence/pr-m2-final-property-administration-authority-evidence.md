# PR-M2 — Property Administration Authority — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Property Administration Authority
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current authority

```text
TENANT_CONTEXT = requireTenant
TENANT_BOUNDARY = requireTenantScopedAuthority
PERMISSION_AUTHORITY = resolveEffectiveTenantPermission
MODULES = cms.paginas / cms.midias
OPERATIONS = list / read / create / update / delete / media.manage / publish
EFFECTIVE_SCOPE_REQUIRED = global
HAS_ROLE_TENANT_AUTHORITY = false
USER_ROLES_TENANT_AUTHORITY = false
SUPER_ADMIN_WITHOUT_IMPERSONATION = denied
```

Current code:

- `src/lib/api/property-admin.functions.ts`;
- `src/lib/api/tenant-catalog-admin.functions.ts`;
- `src/components/admin/ImovelForm.tsx`;
- `src/lib/api/admin.functions.ts`.

The administrative wildcard export is absent. Property, neighborhood, broker and media references are tenant-filtered with explicit cardinality.

## Upload provenance

```text
REGISTRATION_INPUT = uploadTargetId only
RAW_CLIENT_PATH_REGISTRATION = prohibited
TARGET_LEDGER = tenant_upload_targets
TARGET_EXPIRY = enforced
TARGET_REPLAY = denied
OBJECT_EXISTENCE = storage.objects exact bucket/path
TARGET_CONSUMPTION = atomic with image metadata and audit
SIGNED_URL_PRIMARY_AUTHORIZATION = false
```

Relevant migration:

- `20260730043000_pr_m2_consolidated_final_corrective.sql`.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:property-admin-authority
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic provenance/authority tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_STORAGE_OBJECT_TEST_EXECUTED = false
DEPLOY_EXECUTED = false
EXTERNAL_PROVIDER_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
