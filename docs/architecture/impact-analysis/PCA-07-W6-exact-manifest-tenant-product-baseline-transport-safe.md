# PCA-07 W6 — exact-manifest tenant product baseline

## Decision

`SOURCE_MAIN = 1e166099b54ad6414e5ba21444dab66787726380`

`SOURCE_TREE = 3d12751a50df491160850f6880dd104337fb1e3d`

W1–W5 are committed and reconciled. W6 is absent and all dependencies are compatible with PostgreSQL 17.6. The exact authorized tenant already has the complete 1/1 configuration, 1/7 sales pipeline, 4/4/4 Marketing and 3/3/36/1 Tracking baseline, so controlled invocation is idempotent.

## Atomic boundary

The canonical migration remains byte-identical. Its executable projection removes only the outer source transaction and applies deterministic literal-preserving compaction. One exact-manifest atomic envelope validates W1–W5, installs the three server-owned provisioning functions and future-tenant trigger, invokes the authorized orchestrator for exactly one UUID, records the exact transport query and completes postflight before commit.

The direct tenant provisioner remains denied to `service_role`; only the exact-manifest orchestrator receives service-role execute. Client roles remain denied. Blind replay is forbidden.

`CANONICAL_MIGRATION_MUTATION = false`

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`PR_105_MUTATION = false`
