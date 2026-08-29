# PCA-07 W6R — prior-ledger canonical name authority corrective

## Decision

`SOURCE_MAIN = 6b5aae433460bcc91672c80d6a2c9b782099b984`

`SOURCE_TREE = 09251fe82f72404af75ce1f4fec3fe7f53575646`

The merged W6 envelope was submitted through Lovable and stopped during the W2 ledger preflight with `P0001`. Read-only reconciliation proved `TOTAL_TRANSACTION_ROLLBACK`: the W6 ledger row, three functions and trigger remain absent, while the W1–W5 ledger and protected business/storage baselines remain intact.

## Root cause and bounded correction

The W6 generator asserted five historical migration labels that are not the canonical names recorded by the transport-safe W2–W4 applications. W6R changes prior-ledger name assertions only. Versions, creators, exact statement hashes, idempotency keys, exact tenant manifest, DDL/DML projection, postflight, ACLs and ledger write remain unchanged.

The W6 generator retains historical mode as its default, preserving the original 27,413-byte envelope and SHA-256 evidence. W6R opts into canonical-name mode and deterministically produces 27,449 bytes with SHA-256 `58fc41803bee53b66612ee9677fc5a9f14f317f9d0e0ada78ad3297c248c079e`. The canonical migration remains byte-identical. Blind replay of the failed envelope is forbidden.

`CANONICAL_MIGRATION_MUTATION = false`

`SAME_BACKEND_WRITES = 0`

`DIRECT_SUPABASE_CALLS = 0`

`PROVIDER_MUTATION = false`

`DEPLOY = false`

`PR_105_MUTATION = false`
