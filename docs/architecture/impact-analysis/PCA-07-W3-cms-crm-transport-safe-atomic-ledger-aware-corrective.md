# PCA-07 W3 — CMS/CRM transport-safe corrective

## Decision

`SOURCE_MAIN = 65e11c80c22f61929de340606be558cf26012f45`

`SOURCE_TREE = cb206ef3ceb61c49f2e731e716fdf8ee62e1a561`

The read-only Lovable-managed preflight requalified W3 as conditionally executable
only through two ordered migration-local atomic envelopes: CMS must commit and pass
its postflight before CRM can start. Blind replay is forbidden.

This change is repository-only. It does not call Lovable, Supabase, a provider, or
deployment infrastructure and it does not mutate the canonical backend.

## Live incompatibilities and projections

The canonical backend is PostgreSQL 17.6. The W3 CRM source contains five UUID
aggregates written as `min(id)`, but PostgreSQL does not expose `min(uuid)` here.
Each occurrence is deterministically projected to the first member of
`array_agg(id ORDER BY id)`, preserving the prior `count(*)` ambiguity guard.

The active administrative function is
`transition_lead_status(uuid,text,integer,uuid,jsonb)`; the CRM ACL statement named
the absent `bigint` overload. The executable projection changes only that signature.

Both source migrations are compacted by a literal-preserving SQL scanner. Quoted
strings and dollar-quoted bodies retain their content, while comments and redundant
whitespace are removed. The canonical migration files and their hashes are never
edited: `CANONICAL_MIGRATION_MUTATION = false`.

## Atomic and ledger-aware boundary

CMS and CRM each receive exactly one `BEGIN`/`COMMIT` boundary. Preflight, source
projection, ledger insertion, and postflight share that transaction. The ledger
stores the exact transport query through `current_query()` and derives its
idempotency key from the same bytes. CRM also records corrective version
`20260829145000` in the same transaction.

Replay requires an empty target ledger, an exact one-UUID manifest, exact W1/W2
prerequisites, PostgreSQL 17, expected target data counts, absent later waves, and
the protected tenant/portal/storage baseline. Any mismatch raises `P0001` and rolls
back the active envelope.

## Security and negative boundary

Postflight requires RLS, denial of effective client access, `service_role` access,
expected catalog counts, and deterministic CMS/CRM data backfills. New API exposure
is not inferred from table creation and remains explicitly denied by migration ACLs.

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`ROADMAP_SITE_UPDATED = false`

`PR_105_MUTATION = false`
