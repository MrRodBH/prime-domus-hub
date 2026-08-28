# DCA-02-BL2 — R2 Post-Homologation Recoverability Rebaseline

## Authority and boundary

```text
GATE = DCA-02-BL2_R2_POST_HOMOLOGATION_PRE_PRODUCTION_DEFERRED_RECOVERABILITY_REBASELINE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 64510f51b73557dab3cc8c514d3eafd957308ee2
SOURCE_TREE = 45b26fcfa58c2556de08feb5d49dae319e5803e5
OBSERVED_AT_UTC = 2026-08-28T10:37:43Z
STATUS = REPOSITORY_IMPLEMENTED_AWAITING_EXACT_HEAD_GATES
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
DIRECT_SUPABASE_ACCESS_REQUIRED = false
R2_SUBSCRIPTION_ENABLED = false
R2_LIST_BUCKETS_RESULT = 10042_PLEASE_ENABLE_R2_THROUGH_DASHBOARD
CLOUDFLARE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
LOVABLE_AGENT_CALLS = 0
DEPLOY = false
MERGE = false
PRODUCTION_CUTOVER = false
```

This rebaseline is repository-only. It does not activate R2, complete a
checkout, create a bucket or token, configure a Worker binding, change the
Lovable-managed backend, execute SQL, restore a database, deploy code, or
authorize production.

## Binding historical decision and scheduling correction

The Owner decision remains binding:

```text
CLOUDFLARE_PAID_OR_ENTERPRISE_UPGRADE_BEFORE_HOMOLOGATION = not_planned
DCA02_TERMINAL_ACCEPTANCE_BLOCKED = false
PRM3_OR_FRONTEND_BLOCKED = false
CONTROLLED_TESTING_BLOCKED = false
FORMAL_HOMOLOGATION_BLOCKED = false
PRODUCTION_READINESS_BLOCKED_UNTIL_RECOVERY_PROOF = true
AUTHORIZED_EXECUTION_WINDOW = after_formal_homologation_and_before_production
```

`NB-DCA02-02` did not block the completed synthetic provider proof and does not
block provider-agnostic frontend work or controlled homologation. It remains a
mandatory pre-production integrity gate because loss of the only persisted
provider-object identity can otherwise make a safe delete, reconcile, or
recovery decision impossible.

## Superseded whole-database recovery assumption

The earlier full-database Restore-to-a-New-Project/PITR envelope is preserved as
historical general-database DR analysis. It is superseded as the execution
strategy for DCA-02-BL2 because:

1. backup/PITR state, restore control, and exact clone cost are unavailable
   through the Owner's canonical Lovable-only control plane;
2. the database contains active cron/network capability and Vault material, so
   a full clone cannot meet pre-activation external-effect containment;
3. DCA-02-BL2 owns one narrow asset, `public.domain_provider_bindings`, rather
   than Auth, Storage, Edge Functions, or the complete application database.

This rebaseline does not claim full-database, Auth, Storage-object, or platform
disaster recovery. Those remain separate architecture concerns.

## Selected post-homologation strategy

```text
SELECTED_STRATEGY = encrypted_external_generation_bound_ledger_snapshots
SNAPSHOT_MEDIUM = Cloudflare_R2_Standard_candidate
RUNTIME_AUTHORITY = public.domain_provider_bindings
SNAPSHOT_RUNTIME_AUTHORITY = false
SNAPSHOT_SCOPE = DCA02_identity_tuple_only
RPO_CEILING_SECONDS = 900
RTO_CEILING_SECONDS = 14400
EXPORTER_ACTIVATION = separately_authorized_future_gate
```

The canonical snapshot contains only these server-owned fields:

```text
tenant_id
provider_account_id
zone_id
domain_id
generation
custom_hostname_id
binding_state
identity_bound_at
```

The artifact also carries schema version, snapshot UTC, row count, canonical
SHA-256 digest, predecessor digest, and encryption metadata that contains no
key. Hostnames, customer payloads, secrets, provider credentials, and Custom
Metadata are excluded. Sorting is serialization only and never establishes
ownership.

The snapshot is append-only recovery evidence. Normal provisioning,
observation, reconciliation, and removal must never query R2 for authority.
When the database ledger is missing or ambiguous, provider mutation remains
fail-closed until an explicitly authorized recovery procedure completes.

## R2 control plane and immutability envelope

Official Cloudflare product boundaries are captured from:

- [R2 get started](https://developers.cloudflare.com/r2/get-started/);
- [R2 authentication and token permissions](https://developers.cloudflare.com/r2/api/tokens/);
- [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/);
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/).

R2 requires a separately activated subscription. The current account returned
error `10042` before bucket enumeration, so no bucket or R2 token can be
qualified now. Activation is an Owner-controlled post-homologation provider
mutation and requires a separate gate with the checkout terms and account
billing state visible.

The future resource envelope must prove, before the first snapshot:

1. one private Standard-storage bucket with `r2.dev` and custom-domain public
   access disabled;
2. a native R2 Bucket Lock covering the snapshot prefix and preventing object
   deletion or overwrite for the approved retention period;
3. no lifecycle rule capable of shortening that retention;
4. an exporter credential with `Object Read & Write`, scoped to the one exact
   bucket, without account-admin or bucket-configuration permission;
5. a separate recovery-reader credential with `Object Read only`, issued only
   for an authorized drill;
6. bucket-configuration authority absent from application runtime and Lovable
   client code;
7. encryption in transit, R2 encryption at rest, and application-layer or
   SSE-C encryption whose key remains only in an approved server-side secret
   store;
8. exact audit proof that no key, token, hostname, or raw customer data entered
   GitHub, logs, browser payloads, or snapshot metadata.

R2's S3-compatible Object Read & Write scope is not a write-only capability.
The Bucket Lock and separation of configuration authority are therefore
mandatory compensating controls, not optional hardening.

## Cost qualification

At the documentation snapshot dated 2026-08-28, Standard storage includes a
monthly free tier of 10 GB-month, one million Class A operations, ten million
Class B operations, and free Internet egress. A 15-minute cadence produces at
most 2,880 scheduled snapshot writes in a 30-day month, before retries, and the
current one-row ledger is materially below the storage allowance.

```text
DOCUMENTED_PRICE_MODEL = qualified
PROJECTED_LEDGER_COST_WITHIN_STANDARD_FREE_TIER_USD = 0
EXACT_ACCOUNT_SUBSCRIPTION_COST_CONFIRMED = false
COST_OR_CHECKOUT_ACCEPTANCE = Owner_only_future_gate
```

The projection is not permission to activate the subscription and is not a
guarantee against future pricing or abnormal usage. The future activation gate
must re-read current pricing, checkout recurrence, currency, and account state.

## Export and recovery acceptance contract

The future exporter must be server-only and originate in the Lovable-managed
backend authority. A binding transaction must create durable export work, and
the external snapshot must become observable no later than 900 seconds after
the authoritative identity change. Snapshot failure never falls back to
hostname search, Custom Metadata, or a second runtime authority.

A recovery drill must reconstruct the ledger only in an isolated,
non-production Lovable-managed recovery cell with provider credentials,
routes, cron, outbound network effects, and real tenant traffic absent. It must
then prove exact row cardinality and digest, constraints, RLS, grants, guard
trigger, SECURITY DEFINER boundaries, and completion within 14,400 seconds.
Provider reconciliation, adoption, bind, cleanup, delete, production import,
or cutover remain separate operations.

## Fail-closed classifications

```text
DEFERRED_R2_NOT_ENABLED_BEFORE_PRODUCTION_WINDOW
FAIL_CLOSED_R2_SUBSCRIPTION_UNCONFIRMED
FAIL_CLOSED_R2_BUCKET_NOT_PRIVATE
FAIL_CLOSED_R2_BUCKET_LOCK_UNPROVED
FAIL_CLOSED_R2_TOKEN_OVERPRIVILEGED
FAIL_CLOSED_SNAPSHOT_ENCRYPTION_UNPROVED
FAIL_CLOSED_SNAPSHOT_SCOPE_EXPANDED
FAIL_CLOSED_SNAPSHOT_RPO_EXCEEDED
FAIL_CLOSED_MANIFEST_DIGEST_MISMATCH
FAIL_CLOSED_RECOVERY_RTO_EXCEEDED
FAIL_CLOSED_SECURITY_BOUNDARY_DRIFT
FAIL_CLOSED_COST_UNCONFIRMED
```

Before the post-homologation execution window, `R2_NOT_ENABLED` is an accepted
deferred state and cannot block PR-M3, testing, or formal homologation. At the
pre-production checkpoint the same condition is blocking and production must
remain fail-closed.

## Ordered successor gates

1. exact-head audit and protected merge of this repository rebaseline;
2. continue provider-agnostic product work, controlled tests, and formal
   homologation without activating R2;
3. after formal homologation, read-only revalidation of R2 pricing, checkout,
   account authority, and current product capabilities;
4. explicit Owner authorization for R2 subscription activation and exact
   private bucket/lock/token resource envelope;
5. separately authorized Lovable-managed exporter implementation;
6. isolated snapshot and recovery drill proving RPO/RTO and teardown;
7. terminal DCA-02-BL2 pre-production acceptance before production cutover.

No successor is automatically authorized by this document.
