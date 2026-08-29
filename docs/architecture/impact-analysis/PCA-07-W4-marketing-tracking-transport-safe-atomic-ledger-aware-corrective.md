# PCA-07 W4 — Marketing/Tracking transport-safe corrective

## Decision

`SOURCE_MAIN = 81778245b814eaea0ff54e5333a73f88fd8af12c`

`SOURCE_TREE = 93af3337a2f8b957b0193a3ce288be9ed088d832`

The Lovable-managed read-only preflight requalified W4 for two ordered migration-local atomic envelopes.
Marketing must commit and pass its postflight
before Tracking can start. Blind replay is forbidden.

This change is repository-only. It does not call Lovable, Supabase, a provider,
or deployment infrastructure and it does not mutate the canonical backend.

## Compatibility result

The canonical backend is PostgreSQL 17.6. W4 has no UUID aggregate or function
signature incompatibility. Its executable projections preserve byte-identical semantics:
only the outer source transactions are removed and the remaining SQL
is compacted by a deterministic literal-preserving scanner.

The two canonical migration files and their hashes are never edited.
`CANONICAL_MIGRATION_MUTATION = false`.

## Atomic and ledger-aware boundary

Marketing and Tracking each receive exactly one `BEGIN`/`COMMIT` boundary.
Preflight, projected source, ledger insertion and postflight share that
transaction. The ledger stores the exact transport query through
`current_query()` and derives its idempotency key from those same bytes.

Replay requires the exact W1/W2/W3 ledgers, an exact one-UUID manifest,
PostgreSQL 17, empty W4 targets, absent later waves, expected W3 prerequisites
and the protected tenant/portal/storage baseline. Tracking additionally requires
the committed Marketing ledger and its complete physical postcondition.

## Security and negative boundary

Postflight requires RLS, denial of effective `anon` and `authenticated` access,
explicit `service_role` access, exact catalog counts and deterministic data
backfills. Data API exposure is verified from ACLs and is not inferred from table
creation. No provider call, credential acquisition or secret erasure occurs.

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`ROADMAP_SITE_UPDATED = false`

`PR_105_MUTATION = false`
