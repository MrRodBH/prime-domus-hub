# DCA-02-BL2 — Isolated Non-Production PITR Restore Execution Envelope

## Authority and exact boundary

~~~text
GATE = DCA-02-BL2_ISOLATED_NON_PRODUCTION_PITR_RESTORE_EXECUTION_ENVELOPE
SOURCE_MAIN = 2762376666044e4a7fa200ea5c7dd1b57c9a8e91
SOURCE_TREE = 0ae2179c94b1ead197c15a27939f85d3576f65c4
SOURCE_SAME_BACKEND_PROJECT_REF = stmcnvzuzlyqammyycxj
STATUS = DOCUMENTATION_AND_TEST_CONTRACT_ONLY
LIVE_RESTORE_AUTHORIZED = false
PROJECT_CREATION = false
SUPABASE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
SAME_BACKEND_MUTATION = false
CLOUDFLARE_PROVIDER_WRITES = 0
DEPLOY = false
PR_105_MUTATION = false
LOVABLE_AGENT_CALLS = false
~~~

The Owner authorization materializes the exact, fail-closed execution contract. It does not authorize a Supabase Dashboard action, Management API mutation, project creation, point-in-time restore, SQL statement, route, deploy, provider reconciliation, or teardown.

## Current provider facts that constrain the design

The authoritative product references are the Supabase [Database Backups](https://supabase.com/docs/guides/platform/backups) and [Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project) documentation.

- The only admissible future mechanism is Dashboard Restore to a New Project, currently documented as Beta and dependent on a paid plan with physical backups.
- In-place PITR restore is prohibited because it mutates the source and introduces source downtime.
- The target is an independent database copy in the same region. Database schema, data, roles, permissions and Auth database records are in scope.
- Storage object bytes, Edge Functions and product configuration outside the database are not proven by a database clone. Storage metadata must never be represented as recovery of the object bytes.
- Enabled extensions and database-held secrets or encrypted values can carry executable or confidential capability into the target.
- A target clone can incur additional monthly cost; exact cost and recurrence must be shown to and confirmed by the Owner before the first provider mutation.
- A restored target cannot be assumed to be a complete Same-Backend replica and must not receive routes, real traffic, tenant access or provider credentials.

Provider documentation that recommends disabling external operations after restore does not meet this architecture's fail-closed containment rule. Post-creation remediation has a race window. The future execution must stop before project creation unless pre-activation containment is proven or the source inventory proves that no copied database capability can initiate an external effect.

## Recovery objectives

~~~text
RPO_CEILING_SECONDS = 900
RTO_CEILING_SECONDS = 14400
RPO_MEASUREMENT = observation_time_utc_minus_latest_recoverable_point_utc
RTO_MEASUREMENT = owner_confirmed_creation_start_utc_to_target_validation_complete_utc
OUTSIDE_CEILING = fail_closed
~~~

The selected recovery point must be within the provider-reported physical-backup/PITR window. If a point-in-time selection is required, PITR must be enabled and the selected point must be bounded by the reported earliest and latest recoverable timestamps. No marketing promise substitutes for exact environment evidence.

## Mandatory future preflight

All preflight actions are read-only. Each item requires actor, UTC timestamp, exact source project ref and raw-result digest without secrets.

### P0 — Source and backup scope

1. Bind the source to exact ref stmcnvzuzlyqammyycxj and record organization, plan, region and database version.
2. Obtain official backup state using an authorized read-only path, including physical-backup capability, PITR flag, earliest/latest recovery points and status.
3. Prove paid-plan eligibility and Dashboard availability of Restore to a New Project.
4. Select the intended UTC recovery point and prove RPO at or below 900 seconds.
5. Stop on absent, stale, ambiguous or contradictory values.

### P1 — Source stability and recovery manifest

1. Capture before-and-after read-only manifests around preflight.
2. Hash schema/version, migration ledger, row count and the canonical public.domain_provider_bindings manifest.
3. Include tenant_id, provider_account_id, zone_id, domain_id, generation, custom_hostname_id, binding_state and identity_bound_at.
4. Prove no source database write, no schema change and no identity drift occurred during preflight.
5. Sorting is serialization only and never confers ownership.

### P2 — Pre-activation containment

Inventory all database capabilities that could act after cloning, including:

- pg_cron jobs and queue consumers;
- pg_net, HTTP/database webhooks, triggers and functions capable of network calls;
- wrappers, foreign data wrappers and external integrations;
- Vault or other database-held secret material;
- extension-specific background activity;
- provider identifiers or credentials that could authorize Cloudflare or another system.

The only passing states are:

1. exact zero executable external-effect capabilities and zero copied secret/provider authority; or
2. an independently proven provider control that prevents every such effect before the target can become active.

A plan to create the clone and then disable jobs, webhooks, extensions or secrets is rejected. No exception is granted by a short expected delay.

### P3 — Owner cost and destructive-operation checkpoint

Before any provider mutation, present:

- exact source ref and proposed target label;
- selected recovery point and calculated RPO;
- estimated monthly and immediate cost, currency and recurrence;
- target data classification and isolation plan;
- teardown owner and maximum retention;
- the full preflight evidence digest.

A new explicit Owner authorization is required after these values are known. This envelope is not that authorization.

## Future execution sequence

Only a separately authorized gate may execute these steps.

1. Recheck P0–P3 immediately before mutation.
2. The Owner initiates Restore to a New Project in the Supabase Dashboard using the exact source and recovery point.
3. Never invoke an in-place restore endpoint and never restore over the source.
4. Record creation start UTC and the target project ref returned by the provider.
5. Prove source ref differs from target ref and source region equals target region.
6. Keep the target free of custom domains, routes, public application traffic, Edge Function deployment, schedules, outbound integrations and Cloudflare changes.
7. Complete target validation and record RTO. Stop if it exceeds 14400 seconds.

## Target validation

Read-only validation must prove:

- exact target identity and source/target separation;
- target schema, migration ledger, row cardinality and canonical manifest digest;
- uniqueness and exact generation-bound identity;
- constraints, RLS, grants, guard trigger and SECURITY DEFINER boundaries;
- zero anon/authenticated execution authority for DCA-02 privileged operations;
- no route, deploy, provider write or application cutover;
- explicit classification that Storage object bytes, Edge Functions and non-database Auth/Realtime configuration were not recovered by this database-only proof.

Optional live provider reconciliation is outside this gate. If later authorized, it is lookup-only by persisted custom_hostname_id. Hostname search, adoption, creation, rebind, cleanup and deletion remain prohibited.

## Teardown and terminal acceptance

The isolated target contains real restored data and must be treated as confidential. The Owner deletes the entire target through the provider control plane after evidence capture. Row deletion, schema mutation or ad hoc sanitization is not a substitute for target deletion.

Terminal acceptance requires direct proof that the exact target project no longer exists, the teardown timestamp, actor, target ref digest and zero residual route/deploy/provider association. Until then:

~~~text
LIVE_BACKUP_SCOPE_VERIFIED = false
LIVE_PITR_RESTORE_EXECUTED = false
DCA_02_BL2_LIVE_RESTORE_ACCEPTED = false
~~~

## Mandatory failure classifications

~~~text
FAIL_CLOSED_RESTORE_TO_NEW_UNAVAILABLE
FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED
FAIL_CLOSED_PHYSICAL_BACKUP_REQUIRED
FAIL_CLOSED_PITR_WINDOW_INVALID
FAIL_CLOSED_EXTERNAL_EFFECT_CONTAINMENT_UNPROVED
FAIL_CLOSED_COST_UNCONFIRMED
FAIL_CLOSED_SOURCE_TARGET_IDENTITY_COLLISION
FAIL_CLOSED_RPO_CEILING_EXCEEDED
FAIL_CLOSED_RTO_CEILING_EXCEEDED
FAIL_CLOSED_MANIFEST_DIGEST_MISMATCH
FAIL_CLOSED_STORAGE_OBJECT_SCOPE_UNPROVED
FAIL_CLOSED_SECURITY_BOUNDARY_DRIFT
FAIL_CLOSED_TEARDOWN_INCOMPLETE
~~~

Any failure preserves the source and provider state unchanged and requires Owner review.

## Ordered authorization gates

1. final audit and protected merge of this repository envelope;
2. separately authorized, read-only provider preflight and cost discovery;
3. Owner review of exact preflight evidence and explicit project-creation authorization;
4. isolated Restore to a New Project execution;
5. read-only post-restore validation;
6. Owner teardown and direct absence proof;
7. terminal DCA-02-BL2 acceptance.

PCA-06, DCA-02-BL1 provider writes, production restore, production cutover and PR #105 remain outside this sequence.
