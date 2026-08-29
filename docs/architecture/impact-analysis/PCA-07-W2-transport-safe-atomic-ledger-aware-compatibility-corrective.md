# PCA-07 W2 — transport-safe atomic ledger-aware compatibility corrective

## 1. CTDD decision

```text
GATE = PCA-07_W2_TRANSPORT_SAFE_ATOMIC_LEDGER_AWARE_COMPATIBILITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
STATUS = IMPLEMENTED_IN_ISOLATED_BRANCH_NOT_EXECUTED
SOURCE_MAIN = 2ea96b2710b382944d9dfdcb8cae78eebd238dcf
SOURCE_TREE = b6d79b650ce575bee546e66395f97bf7ebd0ace8
BRANCH = agent/pca-07-w2-transport-safe-atomic-ledger-aware-corrective
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
```

The accepted W2 read-only preflight proved that W1 is reconciled in the live
ledger, W2 remains physically and historically absent, and the protected data
baseline is unchanged. It also proved that the two canonical W2 files cannot be
sent unmodified to the Same-Backend. This gate therefore materializes a
repository-only application builder. It performs no backend read or write.

## 2. Blocking incompatibilities corrected

| Finding | Unsafe effect | Executable projection |
|---|---|---|
| configuration `jsonb_build_object` exceeds PostgreSQL `FUNC_MAX_ARGS=100` | configuration statement fails before commit | split into two objects joined with `||` |
| legacy Instagram value is a handle, while the target validator requires HTTPS | the one target snapshot fails validation | canonicalize the already-qualified handle to `https://instagram.com/<handle>`; any other non-HTTPS shape still fails preflight |
| `feed_token` and `webhook_secret` retain UUID-generating defaults | new rows can recreate plaintext credentials | drop both defaults while making the columns nullable |
| `portal_connectors_no_plaintext_credentials_check NOT VALID` conflicts with every one of the 444 retained connector rows | any later update of an existing connector can fail, including the credential-reference transition itself | defer the check until the separately authorized cutover has removed retained values |
| the canonical files do not write the Lovable-managed migration ledger | schema can commit without history | write and verify the corresponding ledger row inside each migration-local transaction |

The two canonical migration files remain byte-identical. Every projection is
derived in memory from an exact SHA-256-locked source and is recorded in the
versioned manifest. Portal secret erasure remains prohibited.

## 3. Migration-local atomic architecture

`scripts/build-pca-07-w2-transport-safe-corrective.mjs` returns two ordered SQL
queries for one exact tenant UUID and one Owner authorization reference:

1. **Configuration envelope** — session-local exact manifest, live preflight,
   projected configuration body, ledger insert for `20260728233000`, full
   catalog/data/ACL postflight, then `COMMIT`.
2. **Portal envelope** — requires the first ledger row and physical state,
   repeats the protected preflight, executes the projected portal body, writes
   `20260729103000` and corrective attestation `20260829110000`, verifies
   retained credentials, RLS, ACLs and empty operational ledgers, then `COMMIT`.

Each transport contains its migration source once. Ledger `statements[1]`
captures `current_query()` inside the same transaction, so the exact query
observed by PostgreSQL—including any transport suffix—is self-verifiable
without duplicating source bytes in the request.

An exception before `COMMIT` leaves both schema and the migration-local ledger
row uncommitted. If the connector response is ambiguous, the next action is a
read-only ledger/catalog reconciliation; blind replay is forbidden. A confirmed
configuration commit may precede a portal failure because each migration is an
independent, internally consistent forward-only boundary.

## 4. Exact-manifest and protected-data contract

The builder accepts UUIDs only; runtime SQL never selects a tenant by name,
slug, prefix, chronology or broad tenant query. It derives the deterministic
manifest hash and sets all three session-local W1 authority settings before
calling `prm2_rebaseline.authorized_tenant_ids()`.

Both envelopes stop on any drift from the accepted baseline: PostgreSQL 17,
exact W1 ledger `3/3`, 74 tenants, 444 portal connectors, 438 protected
connectors, 888 retained sensitive fields and Storage `22 / 15,826,788` bytes.
The configuration envelope additionally requires the exact legacy target shape;
the portal envelope requires 6 target connectors and zero legacy property/log
backfills.

## 5. Security and Data API contract

The projected sources preserve RLS and revoke client access on all three
configuration and nine portal relations. All 21 new functions remain denied to
`PUBLIC`, `anon` and `authenticated`, with explicit `service_role` execution.
Postflight checks effective `anon`/`authenticated` denial and complete
`service_role` CRUD/execute. No assumption is made that a `public` table is
automatically exposed by the Supabase Data API.

The plaintext-removal check is deferred, not abandoned. Its future gate must
first prove provider-reference rotation, rollback and removal of retained
values; only then may it validate and enforce the no-plaintext invariant.

## 6. Negative boundary

```text
SAME_BACKEND_READS = 0
SAME_BACKEND_WRITES = 0
MIGRATION_LEDGER_WRITES = 0
LOVABLE_CALLS = 0
DIRECT_SUPABASE_CALLS = 0
CANONICAL_MIGRATION_FILE_MUTATION = false
PORTAL_SECRET_ERASURE = false
PROVIDER_MUTATION = false
DEPLOY = false
ROADMAP_UPDATE = false
PR_105_MUTATION = false
```

Publication, draft PR, protected merge, post-merge reconciliation and the
Lovable-managed live application all require separate Owner gates.
