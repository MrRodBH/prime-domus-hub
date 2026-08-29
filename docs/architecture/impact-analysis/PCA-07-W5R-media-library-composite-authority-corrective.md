# PCA-07 W5R — media library composite authority corrective

## Decision

`SOURCE_MAIN = 68a52813f0c482f4b6fad51bb0a6a534a8d11a0e`

`SOURCE_TREE = acc28526a0aada765067afb92228b4c477ef3bbf`

The W5 core envelope committed successfully. The following CMS/Marketing envelope failed through Lovable with `INVALID_ARGUMENT`; read-only reconciliation proved `TOTAL_TRANSACTION_ROLLBACK`: no target ledger row, table, function or column survived.

## Root cause and correction

PostgreSQL rejected the CMS foreign key to `media_library(tenant_id,id)` because that referenced column set had no unique authority. The live duplicate count for the pair is zero. W5R deterministically injects `CREATE UNIQUE INDEX IF NOT EXISTS ux_media_library_tenant_id_id ON public.media_library (tenant_id,id)` into the executable projection of migration `20260730050000`, before the dependent CMS table is created.

All eight canonical migrations remain byte-identical. The failed three-migration capability remains one atomic envelope, preventing exposure of the transient CMS predicate. Preflight requires the index absent; postflight requires it present, unique, valid and non-partial. Blind replay is forbidden; retry starts at envelope 2 because envelope 1 is already committed and reconciled.

`CANONICAL_MIGRATION_MUTATION = false`

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`PR_105_MUTATION = false`
