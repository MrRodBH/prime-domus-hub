# PR-M3-SEC-04 — Security Linter Findings Requalification Impact Analysis

## Status

Accepted — consolidated repository-first corrective authorized as `PR-M3-SEC-04A`.

## Authority

```text
REPOSITORY=MrRodBH/prime-domus-hub
BASE_BRANCH=main
BASE_HEAD=252398bca1bd8c17f06414f05332bf1beb69addc
BASE_TREE=1123a4edae762703798c8e6f0b4b1f6a695eb8a5
SOURCE_PR=132
SOURCE_ISSUE=131
POST_MERGE_RELEASE_GATE=805
PRESERVED_PR=105
PRESERVED_PR_STATE=OPEN_DRAFT_UNMERGED
```

GitHub `main` is the final code, CI and merge authority. The Lovable/Supabase
security linter is input evidence only; every claim below was requalified
against the Same-Backend catalogs and canonical repository.

## Requalified inventory

The direct audit reconstructed the linter surface as:

- **24 RLS-enabled relations without policies**;
- **18 SECURITY DEFINER functions** with client-role execution;
- four of the 18 functions are executable by `anon` and remain part of the
  same function inventory rather than separate objects.

### 15 INTENTIONAL_FAIL_CLOSED_SERVER_ONLY relations

These objects have RLS enabled, no policies and no client-role table grants:

`billing_charge_provider_mappings`, `billing_plan_provider_prices`,
`commercial_charge_intents`, `commercial_charge_items`,
`commercial_plan_prices`, `domain_audit_events`, `domain_authority_control`,
`domain_operation_attempts`, `domain_operation_jobs`,
`domain_provider_accounts`, `domain_provider_bindings`,
`domain_verification_challenges`, `lead_audit_events`,
`spr02_managed_secret_ceremonies`, and `tenant_domains`.

Their zero-policy posture is intentional fail-closed. Generic policies must not
be created.

### 9 REDUNDANT_GRANT_TO_REVOKE relations

The following SCP-001/SCP-002 relations are also designed as RLS
deny-by-default/service-role-only, but inherited explicit privileges for both
`anon` and `authenticated`:

1. `billing_event_transitions`
2. `billing_events`
3. `billing_provider_definitions`
4. `commercial_entitlement_definitions`
5. `commercial_plan_entitlements`
6. `commercial_plans`
7. `tenant_billing_provider_mappings`
8. `tenant_entitlements`
9. `tenant_subscriptions`

RLS currently prevents effective client row access because no policies exist,
but those grants contradict the accepted SCP-001/SCP-002 contract and create
future exposure if policies are added. They are a release interlock.

### 5 REDUNDANT_GRANT_TO_REVOKE functions

The canonical callers of these SECURITY DEFINER functions use
`supabaseAdmin`; no RLS policy or accepted client contract requires direct
execution:

1. `log_system_event(...)`
2. `portal_dlq_enqueue(...)`
3. `portal_dlq_mark_resolved(uuid)`
4. `portal_dlq_mark_retry(uuid,text)`
5. `rate_limit_hit(...)`

Authenticated direct execution could spoof logs, mutate DLQ state or manipulate
rate-limit buckets. `PUBLIC`, `anon` and `authenticated` execution must be
absent; owner and `service_role` execution remain.

### 13 intentional function findings

The remaining **13 intentional function findings** are preserved:

- public host-derived resolvers:
  `resolve_public_tenant_by_host(text)` and
  `get_canonical_redirect_for_active_alias(text)`;
- fail-closed tenant/RLS helpers:
  `get_current_tenant_id()`, `is_super_admin()`,
  `user_belongs_to_tenant(uuid)`, `has_role(uuid,app_role)`,
  `has_any_permission(uuid,text)`, `has_permission(uuid,text,rbac_action)`,
  `has_cms_permission(uuid,text,rbac_action)` and `user_team_ids(uuid)`;
- authenticated business/administrative RPCs:
  `create_manual_lead(...)`, `transition_lead_status(...)` and
  `super_observabilidade(integer)`.

These grants cannot be removed mechanically because they support hostname
resolution, RLS evaluation or accepted authenticated workflows. Any redesign
requires a separate Architecture First gate.

## Root cause

The canonical SCP-001/SCP-002 migrations explicitly granted only
`service_role`, but live `postgres` default privileges in schema `public`
materialized client table/function grants on later objects. Managed
`supabase_admin` defaults are separate; current Same-Backend execution is
`postgres` and is not a member of `supabase_admin`. SEC-04A therefore does not
alter managed-role membership or platform defaults it cannot safely own.

## Architecture First decision

Create one forward-only repository migration that:

1. revokes all `anon`/`authenticated` table privileges from the nine targets;
2. revokes `PUBLIC`/`anon`/`authenticated` execution from the five server-only
   functions;
3. preserves explicit `service_role` execution;
4. hardens future `postgres` defaults for public tables/functions;
5. verifies RLS, zero-policy posture, service-role access and all intentional
   resolver/RPC grants in transaction postconditions;
6. performs no row DML, policy write, function-body replacement, Auth, Storage,
   tenant, membership or domain mutation.

## Options rejected

- Lovable “fix all”, generic policies and bulk EXECUTE revocation;
- live SQL before repository acceptance;
- restoring insecure grants after application;
- altering `supabase_admin` membership/defaults;
- Supabase external fallback or parallel backend.

## Repository implementation packet

```text
STAGE=PR-M3-SEC-04A
DATABASE_APPLICATION=false
ROW_DML=false
POLICY_WRITE=false
FUNCTION_BODY_WRITE=false
NEW_DEPENDENCY=false
BUN_LOCK_CHANGE=false
EXPECTED_CHANGED_PATHS=6
```

Exact files:

1. `supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql`
2. `run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts`
3. `.github/workflows/pr-m3-sec-04a-gate.yml`
4. `package.json`
5. `docs/architecture/impact-analysis/PR-M3-SEC-04-security-linter-findings-requalification-impact-analysis.md`
6. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-04a-consolidated-security-corrective-evidence.md`

`package.json` changes only the active focused release-gate entry point and
adds the SEC-04A script. Dependencies, toolchain, accepted historical scripts
and `bun.lock` remain unchanged.

## Same-Backend application packet

The migration is not applied by SEC-04A. The separate successor is:

```text
PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
```

SEC-04B must requalify live state, apply only the accepted migration
transactionally, prove row-count invariance, grants/default privileges and
negative client-role behavior, then retain forward-only recovery semantics.

## Test matrix

1. Exactly six paths change; no seventh path.
2. `bun.lock`, application source and canonical Release Gate remain unchanged.
3. Dependencies/toolchain objects remain unchanged.
4. `verify:release` starts with the active SEC-04A focused runner; UX-01 script
   remains available.
5. Exactly nine table grant revocations and five function revocations exist.
6. Five explicit service-role function grants remain.
7. No policy, function body, table structure or row data changes.
8. RLS and zero-policy posture remain on target relations.
9. Intentional public resolvers, RLS helpers and business RPCs remain callable.
10. Future `postgres` defaults no longer grant client access.
11. PRM3-P0A, typecheck, builds, `verify:release`, PR-M2, WRI-01 and Release
    Gate pass on one exact head.
12. PR #105 remains open, draft and unmerged.
13. Database/provider/deploy/publish/roadmap writes remain zero.

## Rollback

Pre-COMMIT live failures abort transactionally. After live COMMIT, no insecure
grant is restored; defects require a new forward-only migration. Repository
failures remain isolated in the PR and never use force-push.

## Terminal decision

```text
PR-M3-SEC-04_IMPACT_ANALYSIS=ACCEPTED
NEXT_EXECUTABLE_GATE=PR-M3-SEC-04A_CONSOLIDATED_SECURITY_CORRECTIVE_IMPLEMENTATION
NEXT_AFTER_SUCCESS=PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
LVR_01=SUSPENDED_UNTIL_SEC_04B_ACCEPTED
```
