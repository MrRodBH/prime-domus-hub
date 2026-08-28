# PCA-07R2 — W1 forensic forward-only ledger reconciliation

## 1. CTDD decision

```text
GATE = PCA-07R2R2_W1_EMBEDDED_SOURCE_BYTE_IDENTITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 37eb8ecec801eeb9e3eb78758ac54de2d7925389
SOURCE_TREE = a7a1bd4741227baeb045b0befad18924f4c31c43
AUTHORITY = PROTECTED_GITHUB_MAIN_ONLY
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
INCIDENT = LOVABLE_MANAGED_APPLICATION_FAIL_CLOSED_EMBEDDED_SOURCE_PREFIX_LF
RESULT = EMBEDDED_SOURCE_BYTE_IDENTITY_CORRECTIVE_MATERIALIZED_NOT_EXECUTED
```

PCA-07R retry returned `INVALID_ARGUMENT`, but read-only postflight proved that
W1 DDL persisted while versions `20260728165000` and `20260728180000` remained
absent from `supabase_migrations.schema_migrations`. This is a committed-wave
transport divergence. W1 cannot be replayed and W2-W6 cannot start while
physical state and ledger disagree.

The first Lovable-managed PCA-07R2 application later reached PostgreSQL with
the canonical 77,171-byte statement and failed before the first ledger insert
with `P0001: PCA-07R2 lifecycle source identity mismatch`. Read-only forensic
postflight proved the target ledger remained `0/3`.

At that incident stage, the exact transport root cause was not asserted. The prior envelope carried
50,566 source bytes and duplicated those bodies for ledger persistence, creating
a lower bound of 101,132 bytes before wrapper and postflight SQL. This is a
material risk indicator, not proof of a connector size limit.

## 2. Accepted live state

Lovable-managed `SELECT` inspection established:

- 11 W1 functions with expected ownership, volatility, `SECURITY DEFINER` or
  invoker mode, source-body hashes and client/service ACLs;
- 2 nullable UUID tenant columns, 2 `NOT VALID` checks, 2 cascade FKs, 5 valid
  and ready indexes, no legacy two-column uniqueness and no incompatible
  `user_roles` trigger;
- RLS enabled on all 7 W1 relations, zero client table exposure and complete
  `service_role` CRUD;
- zero tenant assignments in `rbac_profiles` and `user_profiles`;
- 45 product tables and the remaining 55 product columns still absent;
- zero product ledger rows and zero W6 orchestrator functions; and
- exact preservation of tenants, portal credentials, Storage, orphan hashes,
  commercial quarantine and SEC-04B posture.

These observations qualify W1 as structurally present. They do not independently
authorize live ledger writes or semantic adoption of any other migration.

## 3. Corrective architecture

The generated migration
`20260828160617_pca_07r2_w1_forensic_forward_only_ledger_reconciliation.sql`
contains one top-level PostgreSQL `DO` statement. PostgreSQL executes that
statement as one transaction. The two W1 source files are embedded once each as
text evidence and are never passed to dynamic `EXECUTE`.

Before writing, the statement fail-closes on:

1. database, user and PostgreSQL-major identity;
2. exact W1 source SHA-256 and byte lengths;
3. absence of every W2-W6 PCA product ledger version and either zero target
   rows or the three byte-exact target rows for a transport-safe retry;
4. source-derived `pg_proc.prosrc` hashes, signatures, ownership, volatility,
   search paths and function ACLs;
5. W1 columns, FKs, checks, indexes, removed legacy objects, RLS and table ACLs;
6. exact tenant UUID and protected baseline cardinalities/checksums;
7. exact orphan and Storage aggregates;
8. absence of all W2-W6 tables, remaining columns and W6 functions.

Only after every assertion passes does the same statement insert, when absent:

- `20260728165000` with the exact lifecycle source bytes;
- `20260728180000` with the exact access-control source bytes; and
- `20260828160617` with `current_query()` as the forensic corrective
  attestation.

The insert uses the six-column ledger contract observed on the canonical
Lovable-managed backend: `version`, `statements`, `name`, `created_by`,
`idempotency_key` and `rollback`. All three rows carry explicit PCA-07R2
provenance, deterministic idempotency keys and empty rollback arrays. The
statement verifies the historical names, metadata and statement hashes plus the
corrective statement hash before completion. Any exception rolls back all three
inserts. If all three rows already exist exactly, the `DO` is a verified no-op;
partial or divergent history fails closed.

## 4. Why this is not blind migration repair

No CLI `migration repair`, status-only mark, W1 replay, object creation,
backfill, deletion or history rewrite occurs. The ledger reconstruction is
conditional on a complete source-to-catalog and protected-data attestation.
The corrective creates no product capability and adopts no live-only commercial
artifact.

The reconstruction and corrective attestation are self-contained and retry-safe
across the Lovable boundary. The future execution gate must use a
Lovable-managed single-statement database boundary that does not independently
autogenerate a competing ledger row. Future W2-W6 execution must use
transport-safe, migration-local atomic envelopes and must not return to the
duplicated wave bundle pattern.

## 5. Failure contract

| Condition | Required outcome |
|---|---|
| Any precondition mismatch | zero ledger writes |
| Connector rejects/truncates before PostgreSQL parse | zero ledger writes |
| Any assertion or insert fails inside `DO` | all three inserts roll back |
| Connector returns error after execution | read-only postflight before any retry |
| Partial or mismatched ledger postflight | stop; no W2-W6 and no blind repair |
| Exact three-row ledger plus invariant postflight | W1 reconciled; W2 still requires a separate gate |

## 6. Negative boundary

```text
SAME_BACKEND_READS = 0
SAME_BACKEND_WRITES = 0
MIGRATION_LEDGER_WRITES = 0
LOVABLE_CALLS = 0
DIRECT_SUPABASE_CALLS = 0
W1_REPLAY = false
W2_W6_EXECUTION = false
PROVIDER_MUTATION = false
DEPLOY = false
ROADMAP_SITE_UPDATE = false
PR_105_MUTATION = false
```

This repository implementation does not execute the corrective. Publication,
protected PR merge and a separately authorized Lovable-managed live preflight
and application remain mandatory successors.

## 7. Ordered successors

1. publish the isolated branch and open a draft PR;
2. audit exact head, diff, tests, protection and protected merge;
3. reconcile post-merge `main` read-only;
4. authorize PCA-07R2 Lovable-managed forensic reconciliation application;
5. start W2 only after exact live postflight and a new Owner gate.

No successor is authorized by this document.

## 8. PCA-07R2R release-gate scope corrective

Release Gate run `886` on draft PR `#166` failed before the PCA-07R2 step. The
scope classifier mapped a change to the PCA-05R prerequisite-closure test onto
the broader `pca_05r` selector. That selector intentionally runs the private
synthetic rehearsal envelope, whose exact-diff guard correctly rejects a later
PCA-07R2 change set.

The repository corrective introduces `pca_05r_closure` as an independent
selector. Changes to the closure test activate only that selector; the closure
step executes when either the historical `pca_05r` suite or the independent
closure selector is active. The private envelope, substrate and wave steps
remain bound only to `pca_05r`. Static regression assertions enforce this
classification and prevent the Closure path from reactivating the private
envelope.

This is CI-scope decoupling only. It does not change the corrective SQL, W1
sources, manifest, live state, Lovable authority or any backend invariant.

## 9. PCA-07R2R2 embedded-source byte-identity corrective

The Lovable transport preserved the prior canonical statement exactly: 77,171
bytes and SHA-256
`58d79794ebf4aab1f417f0e27edefa0022038d0669aadcdfefee9a7a30e46d11`.
The defect was repository-local. The generator placed a newline between each
opening dollar-quote delimiter and the corresponding W1 source. Consequently,
the lifecycle and access literals were respectively 20,254 and 30,314 bytes,
each with an unexpected first byte `10`, while their asserted sources were
20,253 and 30,313 bytes.

Removing only that prefix LF from each generated boundary recovers the exact
canonical W1 hashes. PCA-07R2R2 therefore joins each opening delimiter directly
to its source without changing either immutable W1 migration. The regenerated
corrective is 77,169 bytes with SHA-256
`4be66ebfd62ce55da1f9923d8e131a78d849e5b8f946d00d5f37851698c50ccb`.

The generator and dedicated regression now extract both embedded literals and
require full string equality, byte length and SHA-256 identity against the W1
files. Occurrence-only checks are no longer sufficient. This repository gate
does not retry the Lovable application and performs zero Same-Backend writes.
