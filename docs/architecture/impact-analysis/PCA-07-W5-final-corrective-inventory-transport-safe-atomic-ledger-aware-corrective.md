# PCA-07 W5 — final corrective inventory transport-safe corrective

## Decision

`SOURCE_MAIN = 72cffa66686fd1de26cd48da688814b2c636dfe1`

`SOURCE_TREE = d6f3df55f0d1ae24cc21c14ffa4bae8ab374c7a5`

The Lovable-managed read-only preflight requalified all eight canonical W5
migrations for six ordered atomic envelopes. Blind replay is forbidden. This
change is repository-only and does not mutate the canonical backend.

## Compatibility and atomic boundary

PostgreSQL 17.6 exposes every required relation, type and function signature.
The apparent empty tenant manifest was a session-GUC observation; with the exact
Owner-authorized UUID and SHA-256 configured it resolves to exactly one tenant.
The obsolete `cms_pages.current_version_id` predicate exists only in migration
`20260730050000` and is corrected by `20260730053000`. Those migrations and the
intervening Marketing activation are therefore inseparable inside one atomic
envelope. A stop can never expose the transient CMS definition.

The remaining sources form five bounded dependency-ordered envelopes. Their
executable projections preserve byte-identical semantics: only outer source
transactions are removed and SQL is compacted by a deterministic
literal-preserving scanner. All eight canonical files and hashes remain intact.

`CANONICAL_MIGRATION_MUTATION = false`

## Ledger, security and negative boundary

Every envelope configures the exact one-UUID manifest, validates W1–W4 and the
completed W5 prefix, executes its source projection, records the exact transport
query through `current_query()`, and verifies the physical/data/RLS/ACL state
before commit. The largest generated envelope is 56,220 bytes.

Postflight requires 15 W5 tables with RLS, no effective `anon` or
`authenticated` table/function access, required `service_role` privileges, 17
new function signatures, the final CMS predicate, Marketing adapter hardening,
storage provenance and an unchanged tenant/portal/storage baseline. Data API
exposure is proven from ACLs rather than inferred from table creation.

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`ROADMAP_SITE_UPDATED = false`

`PR_105_MUTATION = false`
