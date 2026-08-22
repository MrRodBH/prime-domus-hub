# DCA-02-BL1 — Explicit Provider Orphan Recovery Impact Analysis

## Decision

The first recovery surface is diagnostic/dry-run only. It resolves the domain, tenant, generation, provider account and zone from server-owned persistence; performs one exact-hostname provider GET as collision evidence; validates every returned immutable provider object ID; and authorizes no action.

```text
MODE = diagnostic_dry_run_only
GLOBAL_SUPER_ADMIN = exact_server_verified
CLIENT_AUTHORITY = false
HOSTNAME_AUTHORITY = false
PROVIDER_METADATA_AUTHORITY = false
AUTOMATIC_ADOPTION = false
PROVIDER_WRITES = 0
DATABASE_WRITES = 0
```

The client may submit only `domain_id`. Hostname, tenant, generation, account, zone, provider object ID, metadata and action are prohibited request authority. The server-owned hostname is used only to obtain a candidate set. A later action must name one exact object ID from accepted evidence under a separate provider-write envelope.

## Deterministic outcomes

| Provider candidates | Persisted binding | Result | Action |
|---:|---|---|---|
| 0 | none/claimed | `no_candidate` | none |
| 1 | none/claimed | `orphan_candidate_single` | none; exact ID evidence only |
| >1 | any | `ambiguous_candidates` | fail closed |
| 1 | same exact bound ID | `already_bound` | none |
| 0 | exact bound ID | `bound_object_missing` | fail closed |
| 1 | different bound ID | `binding_candidate_conflict` | fail closed |
| any | ambiguous binding | `binding_state_unresolved` | fail closed |

No branch retries provider create, falls back to manual execution, binds, adopts, updates, cleans up or deletes. The dry-run evidence digest and correlation ID are deterministic for the same server/provider snapshot.

## Audit and data handling

Each completed provider read produces a structured `dca02_provider_orphan_dry_run` audit event in runtime logs and returns the same sanitized event to the authenticated Super Admin. It contains exact non-secret object IDs, cardinality, generation and evidence SHA-256. It contains no bearer token, credential reference/value, cookies or raw provider metadata. `persisted=false` is explicit because this gate prohibits database mutation.

## Scope and rollback

The eleven-file allowlist is exact. `bun.lock`, migrations, provider adapter/port, webhook, Stripe, secrets and database policy remain unchanged. Rollback is at most one audited repository revert. No provider compensation exists because this gate performs GET-only diagnostics and was not live-invoked during qualification.
