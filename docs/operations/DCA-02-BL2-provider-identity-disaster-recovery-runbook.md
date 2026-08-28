# DCA-02-BL2 — Provider Identity Disaster Recovery Runbook

> **Current authority:** use the
> [R2 post-homologation recoverability rebaseline](../architecture/impact-analysis/DCA-02-BL2-r2-post-homologation-recoverability-rebaseline.md).
> The full-database PITR procedure is retained below as historical general-DR
> evidence and is not executable for the DCA-02-BL2 ledger.

## Purpose and boundary

This runbook defines deterministic recovery qualification for `public.domain_provider_bindings`. The current gate is repository-only and read-only.

```text
LIVE_DATABASE_RESTORE_ALLOWED = false
PRODUCTION_RESTORE_ALLOWED = false
PROVIDER_MUTATION_ALLOWED = false
AUTOMATIC_REBIND_ALLOWED = false
RPO_CEILING = 15 minutes
RTO_CEILING = 4 hours
```

## Required preflight evidence

Stop fail-closed unless all values are exact and attributable to the intended non-production environment:

1. environment/project identity;
2. official backup/PITR product state and retention window;
3. oldest and newest restorable points;
4. provider-documented restore granularity supporting an RPO no greater than 15 minutes;
5. timed isolated-restore evidence supporting an RTO no greater than 4 hours;
6. source database schema/version and migration ledger;
7. read-only count and SHA-256 manifest for `public.domain_provider_bindings`;
8. unique isolated target identifier and teardown owner.

Absence of any item is `FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED`.

## Canonical manifest

The manifest contains only server-owned identity fields:

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

Rows are serialized by exact scalar value with explicit separators and UTF-8 encoding, then hashed with SHA-256. Sorting exists only to make the manifest deterministic; it must never select or confer authority. Hostname and Custom Metadata are excluded.

## Current R2 snapshot procedure

This procedure is executable only after formal homologation and under separate
provider, backend-implementation, and recovery-drill authorizations.

1. Prove the exact Cloudflare account and activated R2 subscription.
2. Create one private Standard bucket with public URLs and custom domains off.
3. Configure and independently observe the approved native Bucket Lock before
   the first snapshot object is written.
4. Scope the exporter credential to Object Read & Write on that bucket only;
   keep bucket-configuration authority outside application runtime.
5. Export only the canonical manifest, schema version, row count, snapshot UTC,
   predecessor digest, and SHA-256 digest in encrypted form.
6. Observe the immutable object within 900 seconds of the ledger change or fail
   closed for production readiness.
7. For a recovery drill, issue a separate Object Read only credential and
   reconstruct only in an isolated Lovable-managed non-production cell.
8. Recompute cardinality and digest and prove RLS, grants, guard trigger, and
   SECURITY DEFINER boundaries within 14,400 seconds.
9. Revoke the drill reader and tear down the cell. Never promote the R2 object
   to runtime authority or perform provider mutation from snapshot content.

## Isolated restore procedure

This section is executable only under a future exact non-production restore envelope.

1. freeze the exact source snapshot and its UTC recovery point;
2. record source schema and ledger manifest hashes;
3. create a uniquely tagged isolated target with no routes, traffic, tenant access, webhooks, scheduled jobs, or provider credentials;
4. restore the frozen point;
5. independently recompute schema and ledger manifest hashes;
6. compare exact row cardinality and every identity tuple;
7. verify constraints, RLS, SELECT-only `service_role` table access, guard trigger, SECURITY DEFINER functions, and zero `anon`/`authenticated` EXECUTE;
8. run read-only reconciliation by persisted `custom_hostname_id` only if separately authorized;
9. classify any missing, duplicate, conflicting, or provider-mismatched row fail closed;
10. capture elapsed recovery time and prove the RPO/RTO ceilings;
11. tear down the isolated target and prove zero residual resource.

## Post-restore reconciliation

Reconciliation may compare only the restored tuple with an exact provider-object lookup by `custom_hostname_id`. It must never search by hostname to adopt an object. A mismatch produces an audited unresolved state; it does not create, bind, retry, clean, or delete anything.

## Failure classifications

```text
FAIL_CLOSED_BACKUP_SCOPE_UNVERIFIED
FAIL_CLOSED_RPO_CEILING_EXCEEDED
FAIL_CLOSED_RTO_CEILING_EXCEEDED
FAIL_CLOSED_MANIFEST_DIGEST_MISMATCH
FAIL_CLOSED_BINDING_MISSING
FAIL_CLOSED_BINDING_DUPLICATE
FAIL_CLOSED_PROVIDER_IDENTITY_CONFLICT
FAIL_CLOSED_SECURITY_BOUNDARY_DRIFT
FAIL_CLOSED_TEARDOWN_INCOMPLETE
```

## Evidence ledger

Persist exact source/target identifiers, recovery point, counts, hashes, timings, security-boundary checks, reconciliation results, teardown proof, actor, and UTC timestamps. Never persist secrets, tokens, provider credentials, or raw customer data.

## Rollback

Repository artifacts are reverted by at most one audited commit. A future isolated restore fixture must be torn down completely. Production and live provider state remain untouched; no compensating provider action exists in this read-only gate.

## Authorized execution-envelope addendum

The exact execution contract is
[the isolated non-production PITR restore execution envelope](../architecture/impact-analysis/DCA-02-BL2-isolated-non-production-pitr-restore-execution-envelope.md).

Historical full-database product boundaries are captured from the Supabase
[Database Backups](https://supabase.com/docs/guides/platform/backups) and
[Restore to a New Project](https://supabase.com/docs/guides/platform/clone-project)
documentation. The historical contract states: Restore to a New Project is the only admissible future mechanism for a whole-database exercise. It is not the
current DCA-02-BL2 ledger strategy. An in-place PITR restore remains prohibited.

The future target is database-only recovery evidence. Storage object bytes,
Edge Functions and non-database product configuration are outside the proven
scope. Enabled extensions, schedules, network-capable database code and
database-held secrets require pre-activation containment. Creating a target and
then disabling external effects is fail-open and prohibited.

This addendum does not activate either procedure. R2 remains disabled and its
activation is deferred until after formal homologation. Subscription checkout,
bucket/lock/token creation, Lovable-managed exporter implementation, recovery
cell creation, and any provider operation require separate Owner authorization.
The historical whole-database rule is unchanged: Project creation requires another explicit Owner authorization.
