# PR-M2 — Portal Functional Completion — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Portal Connector Registry, Jobs & HYBRID Delivery
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current contract

```text
CONNECTOR_REGISTRY = closed build-time authority
OPERATION_MODE = HYBRID
TENANT_AUTHORITY = requireTenant + Tenant Access Control
SUPER_ADMIN_WITHOUT_IMPERSONATION = denied
MAPPINGS = closed and versioned
JOB_LEDGER = tenant-scoped and idempotent
RETRY = explicit and bounded
MANUAL_EXPORT = deterministic
CREDENTIALS = references only
AUTOMATED_EXTERNAL_SUCCESS = not claimed without factual adapter execution
```

Current code and SQL:

- `src/lib/portals/portal-connector-registry.ts`;
- `src/lib/api/tenant-portal-authority.server.ts`;
- `src/lib/api/tenant-portal.functions.ts`;
- `src/lib/portals/portal-adapter.server.ts`;
- `supabase/migrations/20260729103000_pr_m2_portal_functional_completion.sql`.

The active UI distinguishes manual export from automated publication and exposes configuration, job, retry, reconciliation and diagnostic states without secrets.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:portal-functional-completion
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic connector/job/export tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
REAL_PORTAL_ADAPTER_EXECUTED = false
EXTERNAL_PUBLICATION_PROVED = false
DEPLOY_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
