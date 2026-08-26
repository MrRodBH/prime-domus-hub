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
against the Same-Backend catalogs and the canonical repository.

## Scope and method

The linter observation reported 46 INFO/WARN items. The direct catalog audit
reconstructed the actionable surface as:

- **24 RLS-enabled relations without policies**;
- **18 SECURITY DEFINER functions** with client-role execution;
- four of the 18 functions are executable by `anon` and are included in the
  same function inventory rather than counted as separate objects.

No correction is justified solely by a warning title. The decision gate used
effective grants, policy combination, owners, `search_path`, live row counts,
callers, tenant authority and the canonical architecture documents.

## Relation findings

### 15 INTENTIONAL_FAIL_CLOSED_SERVER_ONLY

The following relations have RLS enabled, no policies and no `anon` or
`authenticated` table privileges. Their zero-policy posture is intentional and
must not be replaced by generic permissive or deny-all policies:

1. `billing_charge_provider_mappings`
2. `billing_plan_provider_prices`
3. `commercial_charge_intents`
4. `commercial_charge_items`
5. `commercial_plan_prices`
6. `domain_audit_events`
7. `domain_authority_control`
8. `domain_operation_attempts`
9. `domain_operation_jobs`
10. `domain_provider_accounts`
11. `domain_provider_bindings`
12. `domain_verification_challenges`
13. `lead_audit_events`
14. `spr02_managed_secret_ceremonies`
15. `tenant_domains`

These objects remain server-only and fail closed for client roles. Existing
rows include domain operational evidence and canonical domain bindings; no row
change is permitted.

### 9 REDUNDANT_GRANT_TO_REVOKE

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
but the explicit grants contradict the accepted SCP-001/SCP-002 contract and
create unnecessary future risk if a policy is later introduced. These grants
are therefore a release interlock and must be revoked before canonical
homologation.

## Function findings

### 5 REDUNDANT_GRANT_TO_REVOKE

The following SECURITY DEFINER functions are server-only operational helpers.
Their canonical repository callers use `supabaseAdmin`; no RLS policy depends
on them, and no accepted client contract requires direct RPC execution:

1. `log_system_event(text,text,text,text,integer,integer,uuid,uuid,text,jsonb,text)`
2. `portal_dlq_enqueue(uuid,text,text,jsonb,text)`
3. `portal_dlq_mark_resolved(uuid)`
4. `portal_dlq_mark_retry(uuid,text)`
5. `rate_limit_hit(text,text,integer,integer)`

Direct authenticated execution would allow log spoofing, arbitrary DLQ state
mutation or rate-limit bucket manipulation. `PUBLIC`, `anon` and
`authenticated` execution must be absent; `service_role` and owner execution
must remain.

### 13 intentional function findings

The remaining **13 intentional function findings** are preserved in SEC-04A:

- public host-derived resolvers:
  `resolve_public_tenant_by_host(text)` and
  `get_canonical_redirect_for_active_alias(text)`;
- fail-closed tenant/RLS helpers:
  `get_current_tenant_id()`, `is_super_admin()`,
  `user_belongs_to_tenant(uuid)`, `has_role(uuid,app_role)`,
  `has_any_permission(uuid,text)`, `has_permission(uuid,text,rbac_action)`,
  `has_cms_permission(uuid,text,rbac_action)` and `user_team_ids(uuid)`;
- authenticated business/administrative RPCs with internal authorization:
  `create_manual_lead(...)`, `transition_lead_status(...)` and
  `super_observabilidade(integer)`.

The linter warning is informational for these functions. Their execution grants
cannot be revoked mechanically because they are required by public hostname
resolution, RLS policy evaluation or accepted authenticated workflows.
Parameter-binding and authorization redesign, if later desired, must be a new
Architecture First gate rather than an incidental linter fix.

## Root cause

The canonical SCP-001 and SCP-002 migrations explicitly granted only
`service_role`. The live catalog nevertheless contains default privileges for
objects created by role `postgres` in schema `public` that grant table
privileges to `anon`/`authenticated` and function execution to client roles.
Those defaults materialized the nine table overgrants and allowed later
server-only SECURITY DEFINER functions to remain directly executable.

The managed `supabase_admin` role has separate platform defaults. The current
Same-Backend execution role is `postgres` and is not a member of
`supabase_admin`; SEC-04A therefore does not attempt privilege escalation,
role membership changes or unsupported alteration of managed platform
defaults.

## Architecture First decision

Implement one forward-only repository migration that:

1. revokes all table privileges for `anon` and `authenticated` from the nine
   overgranted deny-by-default relations;
2. revokes execution for `PUBLIC`, `anon` and `authenticated` from the five
   server-only functions;
3. explicitly preserves `service_role` execution on those functions;
4. revokes future `postgres` default table/function client grants in `public`;
5. verifies RLS, zero-policy posture, service-role access and intentional
   resolver/RPC grants in transaction postconditions;
6. performs no row DML, policy write, function-body replacement, Auth, Storage,
   tenant, membership or domain mutation.

## Options rejected

- **Create generic policies:** rejected; it would convert an intentional
  fail-closed model into a new authorization surface.
- **Revoke every SECURITY DEFINER grant:** rejected; it would break RLS,
  hostname resolution and accepted authenticated workflows.
- **Use Lovable “fix all”:** rejected; it lacks repository-scoped impact
  analysis and can mutate unrelated objects.
- **Apply SQL before repository acceptance:** rejected; repository-first and
  Same-Backend application remain separate gates.
- **Modify `supabase_admin` role membership/defaults:** rejected; outside the
  connected capability and managed-platform boundary.

## Repository implementation packet

```text
STAGE=PR-M3-SEC-04A
DATABASE_APPLICATION=false
ROW_DML=false
POLICY_WRITE=false
FUNCTION_BODY_WRITE=false
NEW_DEPENDENCY=false
BUN_LOCK_CHANGE=false
EXPECTED_CHANGED_PATHS=5
```

Exact files:

1. `supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql`
2. `run-pr-m3-sec-04a-consolidated-security-corrective-specs.ts`
3. `.github/workflows/pr-m3-sec-04a-gate.yml`
4. `docs/architecture/impact-analysis/PR-M3-SEC-04-security-linter-findings-requalification-impact-analysis.md`
5. `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/pr-m3-sec-04a-consolidated-security-corrective-evidence.md`

## Same-Backend application packet

Live application is not part of SEC-04A. After repository acceptance, the
separate successor is:

```text
PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
```

SEC-04B must requalify the exact live state, apply only the accepted migration
transactionally, prove row-count invariance, verify grants/default privileges,
run negative client-role checks and preserve rollback-before-COMMIT /
forward-only-after-COMMIT semantics.

## Test matrix

1. Exactly five repository paths change.
2. `package.json`, `bun.lock`, source runtime and canonical Release Gate remain
   byte-identical.
3. Exactly nine table grant revocations exist.
4. Exactly five function execution revocations exist.
5. Five explicit service-role function grants remain.
6. No policy is created or removed.
7. No function body is replaced.
8. No table structure is altered.
9. No row DML exists.
10. RLS remains enabled and policy count remains zero on target relations.
11. `anon` and `authenticated` retain no target table privileges.
12. `anon` and `authenticated` cannot execute the five server-only functions.
13. `service_role` retains target table/function access.
14. Public hostname resolvers remain executable by `anon`.
15. RLS helpers and accepted business RPCs retain required execution.
16. PostgreSQL `postgres` future defaults no longer grant client access.
17. PRM3-P0A, typecheck, development/production builds and
    `verify:release` pass.
18. PR-M2, WRI-01 and Release Gate pass on one exact head.
19. PR #105 remains open, draft and unmerged.
20. Database/provider/deploy/publish/roadmap writes remain zero.

## Rollback

Before live COMMIT, any preflight or postcondition failure must abort the
transaction. After live COMMIT, no insecure grant is restored; any defect is
handled by a new forward-only migration. SEC-04A itself creates repository
state only, so a failed PR remains isolated and is never force-pushed.

## Terminal decision

```text
PR-M3-SEC-04_IMPACT_ANALYSIS=ACCEPTED
NEXT_EXECUTABLE_GATE=PR-M3-SEC-04A_CONSOLIDATED_SECURITY_CORRECTIVE_IMPLEMENTATION
NEXT_AFTER_SUCCESS=PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
LVR_01=SUSPENDED_UNTIL_SEC_04B_ACCEPTED
```
