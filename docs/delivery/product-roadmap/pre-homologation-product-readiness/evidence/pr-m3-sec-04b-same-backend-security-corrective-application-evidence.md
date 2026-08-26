# PR-M3-SEC-04B — Same-Backend Security Corrective Application Evidence

## Status

`Accepted — PASS_SEC04B_TERMINAL`

## Authority

```text
REPOSITORY=MrRodBH/prime-domus-hub
BASE_BRANCH=main
BASE_HEAD=7fe0231bc92ac3cb205414c351e5549114bb639a
BASE_TREE=43b7fcc58f441da12d05687067a43711c1a67823
PREDECESSOR_PR=134
PREDECESSOR_ISSUE=133
POST_MERGE_RELEASE_GATE=808/SUCCESS
TRACKING_ISSUE=135
OWNER_AUTHORIZATION=PR-M3-SEC-04B_SAME_BACKEND_SECURITY_CORRECTIVE_APPLICATION
```

## Accepted migration

```text
PATH=supabase/migrations/20260826002000_pr_m3_sec_04a_consolidated_security_corrective.sql
VERSION=20260826002000
BLOB_SHA=8de35022cdc9fae1e2c9493d1d315c3cee5b062c
REPOSITORY_FIRST_ACCEPTED=true
SAME_BACKEND_APPLICATION=true
```

## Preflight result

- Canonical protected tenant fingerprint present.
- Nine target relations present.
- RLS enabled on all nine relations.
- Policy count zero on all nine relations.
- Redundant `anon` and `authenticated` table privileges present exactly as classified by SEC-04A.
- Five target functions present, owned by `postgres`, `SECURITY DEFINER`, with controlled `search_path`.
- `service_role` execution present on all five functions.
- Redundant `authenticated` execution present on all five functions.
- Intentional public resolvers, RLS helpers and authenticated business RPC grants matched the accepted baseline.
- `postgres/public` default privileges still granted client table/function access before the corrective.
- Migration ledger did not yet contain version `20260826002000`.

## Frozen row-count baseline

| Relation | Before | After |
| --- | ---: | ---: |
| `billing_event_transitions` | 0 | 0 |
| `billing_events` | 0 | 0 |
| `billing_provider_definitions` | 1 | 1 |
| `commercial_entitlement_definitions` | 1 | 1 |
| `commercial_plan_entitlements` | 0 | 0 |
| `commercial_plans` | 0 | 0 |
| `tenant_billing_provider_mappings` | 0 | 0 |
| `tenant_entitlements` | 0 | 0 |
| `tenant_subscriptions` | 0 | 0 |
| **Total** | **2** | **2** |

No row content was read or recorded.

## Transactional application

The exact accepted SQL from blob
`8de35022cdc9fae1e2c9493d1d315c3cee5b062c` was executed against the
Lovable-managed canonical Same-Backend.

The migration transaction completed without error and its internal preflight
and postcondition blocks accepted the live state.

## Migration ledger reconciliation

Direct SQL execution does not automatically add the repository migration to
`supabase_migrations.schema_migrations`. One bounded control-plane metadata row
was therefore recorded after successful application:

```text
VERSION=20260826002000
NAME=pr_m3_sec_04a_consolidated_security_corrective
CREATED_BY=PR-M3-SEC-04B
STATEMENT_COUNT=1
EXACT_STATEMENT_MATCH=true
IDEMPOTENCY_KEY=pr-m3-sec-04b:20260826002000:8de35022cdc9fae1e2c9493d1d315c3cee5b062c
```

This ledger reconciliation is migration-control metadata, not business-domain
DML. It prevents an accepted and already-applied migration from being treated
as pending by a future migration runner.

## Postcondition matrix

| Contract | Result |
| --- | --- |
| 9 target relations exist | PASS |
| RLS enabled on 9/9 | PASS |
| Zero policies on 9/9 | PASS |
| `anon` table privileges absent on 9/9 | PASS |
| `authenticated` table privileges absent on 9/9 | PASS |
| `service_role` CRUD preserved on 9/9 | PASS |
| 5 target functions remain `SECURITY DEFINER` | PASS |
| `anon`/`authenticated` execution absent on 5/5 | PASS |
| `service_role` execution preserved on 5/5 | PASS |
| Intentional resolver/helper/business RPC grants preserved | PASS |
| Client grants absent from future `postgres/public` defaults | PASS |
| Business row count invariant | PASS — `2 → 2` |
| Migration ledger exact statement match | PASS |

The connector rejected direct transaction/`SET ROLE` probe statements at the
transport argument boundary. No database statement from those probes ran. The
negative-access proof is instead established for every target by PostgreSQL's
`has_table_privilege` and `has_function_privilege` catalogs, combined with the
unchanged RLS/policy posture.

## Mutation accounting

```text
BUSINESS_ROW_DML=0
MIGRATION_CONTROL_METADATA_ROWS=1
POLICY_WRITES=0
FUNCTION_BODY_WRITES=0
TABLE_STRUCTURE_WRITES=0
AUTH_WRITES=0
STORAGE_WRITES=0
TENANT_WRITES=0
MEMBERSHIP_WRITES=0
DOMAIN_WRITES=0
PROVIDER_WRITES=0
SECRET_WRITES=0
DEPLOY=false
PRODUCTION_PUBLISH=false
PRODUCTION_CUTOVER=false
PR_105_MERGE=false
```

## Preserved invariants

- Same-Backend identity and protected tenant fingerprint.
- Server-authoritative tenant, authorization and commercial decisions.
- RLS deny-by-default posture.
- `service_role`/`postgres` required access.
- Public hostname resolution.
- Accepted authenticated business RPCs and RLS helpers.
- Auth, Storage, tenant, membership, domain and impersonation boundaries.
- No external Supabase fallback or parallel backend.
- Forward-only recovery; insecure grants are not a rollback option.
- PR #105 remains a separate draft/unmerged BCR track.

## Terminal decision

```text
PR_M3_SEC_04B_STATE=Accepted
PR_M3_SEC_04B_RESULT=PASS_SEC04B_TERMINAL
LVR_01_PREDECESSOR_INTERLOCK=SATISFIED
NEXT_GATE=LVR-01_CAPABILITY_PREFLIGHT_AND_PRIVATE_VARIANT_REBASELINE_PLAN
NEXT_GATE_MODE=PLANNING_ONLY/READ_ONLY
NEXT_GATE_AUTHORIZED=false
```

`LVR-01` remains a separate gate and requires specific Owner authorization.
No private variant, rebaseline, production publication or backend change is
authorized by this terminal evidence.
