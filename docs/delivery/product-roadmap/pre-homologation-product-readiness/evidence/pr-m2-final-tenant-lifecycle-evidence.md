# PR-M2 — Tenant Lifecycle — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = Tenant Lifecycle
CORRECTIVE_START_HEAD = b5a15f050a88dfecd5cf6d7a7d7036cbc2083025
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current lifecycle

```text
TENANT_BOOTSTRAP = atomic tenant + initial owner
INITIAL_OWNER_CARDINALITY = exactly one
INVITATION = explicit invited membership
INVITATION_ACCEPTANCE = authenticated target only
OWNERSHIP_TRANSFER = atomic and audited
MEMBERSHIP_LIMIT = accepted commercial seat decision
SUPER_ADMIN_BOOTSTRAP_AUTHORITY = global platform operation
TENANT_MEMBER_MANAGEMENT = owner or delegated Tenant Access Control authority
SUPER_ADMIN_TENANT_SCOPED_ACCESS = explicit impersonation only
```

Current code and SQL:

- `src/lib/api/tenant-lifecycle.functions.ts`;
- `supabase/migrations/20260728160000_pr_m2_tenant_lifecycle.sql`;
- active Super Admin tenant bootstrap surface under `/super`.

The lifecycle does not select a default tenant heuristically, create a tenant without an owner or treat `x-tenant-id` as authority.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:tenant-lifecycle
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic lifecycle/ACL tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
LIVE_INVITATION_EMAIL_EXECUTED = false
LIVE_BACKEND_STATE_PROVED = false
DEPLOY_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```
