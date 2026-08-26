# PR-M3-SEC-04A — Consolidated Security Corrective Evidence

## Frozen baseline

```text
REPOSITORY=MrRodBH/prime-domus-hub
BASE_BRANCH=main
BASE_HEAD=252398bca1bd8c17f06414f05332bf1beb69addc
BASE_TREE=1123a4edae762703798c8e6f0b4b1f6a695eb8a5
TRACKING_ISSUE=133
BRANCH=agent/pr-m3-sec-04a-consolidated-security-corrective
PRESERVED_PR=105
```

## Exact repository scope

```text
EXPECTED_CHANGED_PATHS=6
DATABASE_APPLICATION=false
ROW_DML=false
POLICY_WRITE=false
FUNCTION_BODY_WRITE=false
AUTH_STORAGE_TENANT_MEMBERSHIP_DOMAIN_MUTATION=false
PROVIDER_WRITE=false
DEPLOY=false
PRODUCTION_PUBLISH=false
PRODUCTION_CUTOVER=false
ROADMAP_UPDATE=false
```

Exact allowlist:

1. `supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql`
2. `run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts`
3. `.github/workflows/pr-m3-sec-04a-gate.yml`
4. `package.json`
5. `docs/architecture/impact-analysis/PR-M3-SEC-04-security-linter-findings-requalification-impact-analysis.md`
6. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-04a-consolidated-security-corrective-evidence.md`

`package.json` adds only the active SEC-04A focused script and advances the
front of `verify:release`; dependencies, toolchain, accepted historical scripts
and `bun.lock` remain unchanged.

## Requalified finding matrix

```text
RLS_WITHOUT_POLICY_TOTAL=24
INTENTIONAL_FAIL_CLOSED_SERVER_ONLY=15
REDUNDANT_TABLE_GRANT_TO_REVOKE=9

SECURITY_DEFINER_TOTAL=18
REDUNDANT_FUNCTION_GRANT_TO_REVOKE=5
INTENTIONAL_FUNCTION_FINDINGS=13

REPOSITORY_CORRECTIVE_OBJECTS=14
AUTOFIX_USED=false
GENERIC_POLICY_CREATED=false
BULK_FUNCTION_REVOKE=false
```

### Nine table grant corrections

- `billing_event_transitions`
- `billing_events`
- `billing_provider_definitions`
- `commercial_entitlement_definitions`
- `commercial_plan_entitlements`
- `commercial_plans`
- `tenant_billing_provider_mappings`
- `tenant_entitlements`
- `tenant_subscriptions`

### Five server-only function grant corrections

- `log_system_event(...)`
- `portal_dlq_enqueue(...)`
- `portal_dlq_mark_resolved(uuid)`
- `portal_dlq_mark_retry(uuid,text)`
- `rate_limit_hit(...)`

## Invariants

- No row insert, update, delete or truncate.
- RLS and zero-policy deny-by-default posture preserved.
- `service_role` and `postgres` retain required access.
- Public hostname resolvers remain available.
- Accepted business RPCs and RLS helpers remain available.
- No function body, owner or `search_path` changes.
- No `sandbox_exec` or managed `supabase_admin` change.
- No external Supabase fallback or parallel backend.
- PR #105 remains open, draft and unmerged.

## CI contract

The exact head must prove:

1. exact six-path scope;
2. frozen lockfile, application source and canonical Release Gate;
3. unchanged dependencies and toolchain;
4. active SEC-04A focused release entry point;
5. structural SQL restrictions and canonical server-only callers;
6. PRM3-P0A, typecheck, development/production builds and `verify:release`;
7. PR-M2, WRI-01 and Release Gate.

## Live application status

```text
MIGRATION_CREATED=true
MIGRATION_APPLIED=false
DATABASE_APPLICATION=false
NEXT_GATE=PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
LVR_01=SUSPENDED
```

SEC-04B requires separate authorization because it performs Same-Backend DDL.
