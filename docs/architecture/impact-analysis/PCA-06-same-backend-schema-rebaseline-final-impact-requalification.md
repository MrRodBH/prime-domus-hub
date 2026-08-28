# PCA-06 — Same-Backend Schema Rebaseline Final Impact Requalification

## 1. Authority and repository boundary

```text
GATE = PCA-06_SAME_BACKEND_SCHEMA_REBASELINE_FINAL_IMPACT_REQUALIFICATION_REPOSITORY_IMPLEMENTATION
STATUS = IMPLEMENTED_IN_ISOLATED_BRANCH_AWAITING_PROTECTED_PR
SOURCE_MAIN = 0221bd1f8dd1f0a3d00a52057af9b621a2764edd
SOURCE_TREE = d7112cd8407d3583b7af60745b367709f29a7d4f
OBSERVED_AT_UTC = 2026-08-28T12:30:51Z
REPOSITORY = MrRodBH/prime-domus-hub
BRANCH = agent/pca-06-same-backend-final-impact-requalification
PULL_REQUEST = 164
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
SAME_BACKEND_READ_MODE = SELECT_ONLY
SAME_BACKEND_MUTATION = false
DIRECT_SUPABASE_ACCESS = false
PROVIDER_MUTATION = false
DEPLOY = false
ROADMAP_UPDATE = false
PR_105_MUTATION = false
```

This repository implementation materializes the accepted PCA-06 read-only
facts and the bounded successor envelope. It does not execute SQL, apply a
migration, repair the ledger, select a tenant for backfill, change Auth or
Storage, call the Lovable agent, activate R2, deploy or authorize production.

GitHub `main` remains the final repository authority. The canonical database,
Auth and Storage authority remains the existing Lovable-managed Same-Backend;
direct Supabase credentials, CLI, dashboard, MCP or `service_role` custody by
the Owner are neither required nor authorized.

## 2. Accepted predecessor chain

| Predecessor | Terminal evidence | PCA-06 effect |
|---|---|---|
| PCA-04 | 17 corrected repository migrations, exact-manifest DML and retained portal credentials | immutable execution input |
| PCA-05R | R2-R4 structural/synthetic rehearsal accepted; private cell purged and deleted | rehearsal prerequisite satisfied |
| PR-M3-SEC-04B | accepted security corrective in the Same-Backend | ACL/RLS baseline preserved |
| DCA-02-BL2 R2 | recoverability deferred until post-homologation/pre-production | non-blocking for PCA-06, testing and homologation |

PCA-05R proves the package in an isolated synthetic cell. It does not replace
the live requalification below. DCA-02-BL2 remains mandatory before production
readiness but is not a dependency for provider-agnostic product schema work or
formal homologation.

## 3. Read-only evidence method

The live evidence was collected only through the authenticated Lovable project
database query boundary with `SELECT` statements. The inspection covered:

1. PostgreSQL/project identity and migration-ledger availability;
2. exact ledger versions, statement hashes, byte counts, creators,
   idempotency-key presence and rollback-array cardinality;
3. `information_schema` and PostgreSQL catalogs for expected tables, columns,
   RLS, policies, grants, functions and default privileges;
4. aggregate protected-baseline counts and deterministic ID checksums;
5. aggregate orphan counts and hashes; and
6. zero-content secret checks: only null/non-null cardinalities were read.

No portal token, webhook secret, customer payload, hostname, identity record or
row content was copied into the repository. The one failed relation-name probe
referenced a nonexistent table, executed no statement and was corrected by
catalog discovery before further reads.

## 4. Bidirectional migration-ledger result

### 4.1 PCA-04 product package

```text
REPOSITORY_PRODUCT_MIGRATIONS = 17
LIVE_LEDGER_MATCHES_FOR_PRODUCT_PACKAGE = 0
REPOSITORY_ONLY_PRODUCT_MIGRATIONS = 17
ENTRIES_AFTER_ACCEPTED_SEC04B = 0
BLIND_MIGRATION_REPAIR_ALLOWED = false
```

All 16 corrected historical PR-M2 migrations plus the PCA-04 exact-tenant
orchestrator remain absent from the live ledger. This is expected drift, not a
permission to execute or mark migrations as applied.

### 4.2 Requalified recent parity

| Classification | Repository version | Live version | Result |
|---|---:|---:|---|
| `EXACT` | `20260810220152` | `20260810220152` | exact statement SHA-256 |
| `EXACT` | `20260810220939` | `20260810220939` | exact statement SHA-256 |
| `EXACT` | `20260812133000` | `20260812133000` | exact statement SHA-256 |
| `EXACT` | `20260826002000` | `20260826002000` | exact statement SHA-256 |
| `SEMANTIC_ALIAS_WITH_EXECUTION_PRELUDE` | `20260804180000` | `20260811224106` | repository body matches after removing the exact session-local manifest prelude and whitespace normalization |
| `SEMANTIC_ALIAS` | `20260811234800` | `20260812014256` | whitespace-normalized body matches |
| `SEMANTIC_ALIAS` | `20260812143000` | `20260812141853` | whitespace-normalized body matches |
| `SEMANTIC_ALIAS` | `20260825213000` | `20260825213729` | whitespace-normalized body matches |

Exact live/repository hashes, byte counts and creator metadata are frozen in
the versioned PCA-04 parity manifest. An alias is evidence of semantic parity,
not permission to rewrite a live version or run `migration repair`.

### 4.3 Live-only commercial quarantine

Versions `20260812192006`, `20260813174908`, `20260813175027` and
`20260814001323` remain `LIVE_ONLY_QUARANTINED`, non-authoritative and outside
the PCA package. Each exists once, was recorded by the Lovable API identity,
has an idempotency key and has no rollback array. Their current statement
hashes are frozen in the manifest without copying statement bodies.

Empty commercial business tables do not authorize adoption, deletion,
rollback or import of these entries. PR #105 remains excluded as a repository
authority or convergence source.

## 5. Physical schema requalification

```text
POSTGRES_VERSION = 17.6
EXPECTED_PRODUCT_TABLES = 45
PRESENT_PRODUCT_TABLES = 0
MISSING_PRODUCT_TABLES = 45
EXPECTED_PRODUCT_COLUMNS = 57
PRESENT_PRODUCT_COLUMNS = 0
MISSING_PRODUCT_COLUMNS = 57
```

The expected sets were derived deterministically from the immutable 16
historical files and compared with the live catalog. Their ordered-set SHA-256
digests are stored in the manifest. The PCA-02 gap therefore remains complete;
no partial product-wave application or silent live adoption was detected.

## 6. Protected baseline and data-integrity residues

| Invariant | PCA-06 result |
|---|---:|
| Total tenants | 74 |
| Protected historical residues | 73 |
| Ordered protected-residue MD5 | `3ece053ddbdfce5161380ec38824ea91` |
| Total portal connectors | 444 |
| Protected-residue portal connectors | 438 |
| Retained sensitive portal fields | 888 |
| Tenant subscriptions | 0 |

The protected RM Prime baseline remains present with 4 memberships, 6 portal
connectors, 4 brokers and 8 lead origins; it has zero leads, properties, form
submissions and campaign events. Storage remains 22 objects / 15,826,788
bytes. These values are preservation postconditions, not a tenant mutation
manifest.

`lead_discard_reasons` and `deal_lost_reasons` still contain 1,386 orphan rows
each across 198 missing tenant IDs. PCA-06 records deterministic row-ID hashes
but does not classify, reassign, delete or constrain those rows. Any such data
repair remains an independent exact-manifest gate.

Tenant selection by prefix, name, status, chronology or a broad tenants query
is prohibited. The 73 residues remain outside every future product backfill.
The RM Prime tenant can enter a future exact-ID manifest only through a
separate explicit Owner authorization.

## 7. Security and Data API impact

The accepted SEC-04B boundary is unchanged:

```text
COMMERCIAL_RELATIONS_PRESENT_WITH_RLS = 9/9
COMMERCIAL_POLICIES = 0
ANON_TABLE_EXPOSURES = 0
AUTHENTICATED_TABLE_EXPOSURES = 0
SERVICE_ROLE_TABLE_CRUD = 9/9
RESTRICTED_FUNCTIONS_PRESENT = 5/5
RESTRICTED_FUNCTIONS_DENIED_TO_PUBLIC_ANON_AUTHENTICATED = 5/5
RESTRICTED_FUNCTIONS_SERVICE_ROLE_EXECUTE = 5/5
FUTURE_DEFAULT_CLIENT_GRANTS = 0
```

Supabase now treats grants and RLS as independent Data API controls and is
rolling explicit opt-in for newly created `public` tables to all existing
projects on 2026-10-30. Every future wave must therefore prove explicit ACL
and RLS postconditions; accessibility must never be inferred from schema
creation or policies alone:

- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- https://supabase.com/docs/guides/api/securing-your-api

The PCA-04 package intentionally revokes client access and grants only the
server role for protected product tables/functions. A later UI capability must
continue through the accepted server-owned RPC/runtime boundary unless a new
Architecture First gate explicitly defines and tests a narrower Data API
surface.

## 8. Final impact decision

```text
PCA06_RESULT = ACCEPTED_READ_ONLY_REQUALIFICATION
LEDGER_CLASSIFICATION_COMPLETE = true
PHYSICAL_GAP_STABLE = true
PROTECTED_BASELINE_STABLE = true
SECURITY_BASELINE_STABLE = true
PCA05R_REHEARSAL_ACCEPTED = true
R2_RECOVERABILITY = DEFERRED_NON_BLOCKING_UNTIL_POST_HOMOLOGATION_PRE_PRODUCTION
REPOSITORY_EXECUTION_ENVELOPE_MATERIALIZED = true
SAME_BACKEND_EXECUTION_AUTHORIZED = false
```

PCA-06 removes the former connector-permission uncertainty and confirms that
the corrected package can advance to protected repository acceptance. It does
not turn stable drift into an automatic live write.

## 9. Controlled Same-Backend successor envelope

After this repository package is independently audited and merged, a separate
Owner gate may authorize the Lovable-managed application. Its mandatory order
is W1 through W6 exactly as recorded in the manifest.

Before the first write, the successor must revalidate:

1. exact current GitHub `main`, parity-manifest and all 17 file hashes;
2. zero newly applied PCA product migration versions;
3. exact 45-table/57-column missing-set digests;
4. protected tenant count, exact-ID registry checksum, connector counts and
   retained sensitive-field cardinality;
5. orphan counts/hashes, commercial quarantine and SEC-04B posture;
6. an explicit, immutable tenant UUID manifest with Owner authorization; and
7. a bounded maintenance/write-control window through Lovable only.

Each wave must execute in its own transaction, stop at the first divergence
and pass wave-local postflight before the next begins. Required postconditions
include object/type/constraint/owner parity, RLS, policies, ACL, function
execute grants, unchanged protected checksums, retained portal credentials,
no new orphan references, exact ledger statement identity and exact tenant
baseline cardinality.

No wave may include live-only commercial adoption, credential erasure, orphan
repair, provider/DNS/R2 mutation, deploy, production cutover or PR #105.

## 10. Failure and recovery contract

| Failure point | Required response |
|---|---|
| preflight mismatch | execute zero writes; requalify impact |
| failure before transaction commit | rollback that wave and retain evidence |
| failure after committed wave | stop; create a new forward corrective migration |
| ledger mismatch | do not use blind `migration repair` |
| protected-baseline drift | stop immediately; no automated compensation |
| portal credential divergence | retain values; do not null or overwrite |
| catastrophic corruption | recovery only under the separately accepted pre-production recoverability gate |

`db reset`, down migrations, history rewriting, prefix/name tenant selection,
heuristic cleanup and direct Supabase access remain prohibited.

## 11. Ordered successors

1. `PCA-06_FINAL_AUDIT_AND_PROTECTED_MERGE`: exact diff, tests, PR head,
   protection and merge audit for this repository package.
2. `PCA-07_LOVABLE_MANAGED_SAME_BACKEND_SCHEMA_REBASELINE_CONTROLLED_WAVE_APPLICATION`:
   separately authorized fail-closed live preflight and W1-W6 application.
3. Product verification and formal homologation may continue independently of
   deferred R2 recovery.
4. DCA-02-BL2 R2 recovery proof remains mandatory after homologation and
   before production readiness/cutover.

No successor is automatically authorized by this document.
