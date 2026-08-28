# PCA-06 — Same-Backend Final Impact Requalification Evidence

## Repository implementation

```text
GATE = PCA-06_SAME_BACKEND_SCHEMA_REBASELINE_FINAL_IMPACT_REQUALIFICATION_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN = 0221bd1f8dd1f0a3d00a52057af9b621a2764edd
SOURCE_TREE = d7112cd8407d3583b7af60745b367709f29a7d4f
OBSERVED_AT_UTC = 2026-08-28T12:30:51Z
BRANCH = agent/pca-06-same-backend-final-impact-requalification
PULL_REQUEST = 164
IMPLEMENTATION_MODE = repository_only
CANONICAL_BACKEND_AUTHORITY = LOVABLE_MANAGED_BACKEND_ONLY
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
SAME_BACKEND_MUTATION = false
PROVIDER_MUTATION = false
DEPLOY = false
ROADMAP_UPDATE = false
PR_105_MUTATION = false
```

## Read-only collection accounting

```text
LOVABLE_DATABASE_QUERY_MODE = SELECT_ONLY
DATABASE_DML = 0
DATABASE_DDL = 0
MIGRATION_LEDGER_WRITES = 0
AUTH_WRITES = 0
STORAGE_WRITES = 0
SECRET_VALUES_READ = 0
LOVABLE_AGENT_CALLS = 0
DIRECT_SUPABASE_CALLS = 0
```

One aggregate query referenced the nonexistent historical guess
`public.tenant_memberships` and failed at parse/planning with PostgreSQL
`42P01`; no statement or retry mutation ran. Catalog discovery established
`public.tenant_members` as the current relation before the bounded aggregate
checks continued.

## Ledger reconciliation

| Class | Count | Evidence |
|---|---:|---|
| PCA-04 product migrations absent/live repo-only | 17 | exact version lookup |
| `EXACT` repository/live statements | 4 | exact SHA-256 equality |
| `SEMANTIC_ALIAS` | 4 | whitespace-normalized body equality |
| execution-local prelude | 1 | exact prelude separated; repository body digest matched |
| `LIVE_ONLY_QUARANTINED` | 4 | exact live statement hashes refreshed |
| entries after `20260826002000` | 0 | bounded ledger count |

Every inspected live entry had one statement, an idempotency key and zero
recorded rollback statements. The four commercial live-only entries remain
non-authoritative. No version, statement body or ledger row was changed.

## Physical parity result

```text
POSTGRES_VERSION = 17.6
EXPECTED_TABLES = 45
PRESENT_TABLES = 0
MISSING_TABLES = 45
MISSING_TABLE_SET_SHA256 = a7ea2c4cb892fb3334706430ea6e649fe2f2434a29b3c604e5c84eaf5e84e1a6
EXPECTED_COLUMNS = 57
PRESENT_COLUMNS = 0
MISSING_COLUMNS = 57
MISSING_COLUMN_SET_SHA256 = c3fcd21f00af783569612197d1d351fcfa0226076e82246866daff561b8a8297
PARTIAL_WAVE_DETECTED = false
```

The expected sets were regenerated from the immutable PCA-04 historical files
and compared to live PostgreSQL catalogs. All 17 repository migration file
hashes remain those recorded by PCA-04.

## Protected-state evidence

| Check | Result |
|---|---:|
| tenants | 74 |
| protected RM Prime tenant | 1 |
| protected historical residues | 73 |
| protected-residue ordered ID MD5 | `3ece053ddbdfce5161380ec38824ea91` |
| protected-residue ordered ID SHA-256 | `a9c8f3fbcd4feff88dbc06330b121f00a08c7796a3b163dfda23a91450755e95` |
| portal connectors | 444 |
| protected-residue portal connectors | 438 |
| retained non-null portal sensitive fields | 888 |
| tenant subscriptions | 0 |

RM Prime remained at 4 memberships, 6 portal connectors, 4 brokers, 8 lead
origins, zero leads/properties/form submissions/campaign events and 22 Storage
objects totaling 15,826,788 bytes. Only counts were collected.

The integrity residue also remained observable:

| Relation | Orphan rows | Missing tenant IDs | Ordered row-ID MD5 |
|---|---:|---:|---|
| `lead_discard_reasons` | 1,386 | 198 | `862e725f8891430bb864021d3c3afe29` |
| `deal_lost_reasons` | 1,386 | 198 | `dc43bd9b59a63b20bc37b1fa127b4131` |

No row was selected by tenant prefix/name and no orphan content was read or
changed.

## Security reconciliation

```text
COMMERCIAL_RELATIONS_PRESENT = 9
COMMERCIAL_RELATIONS_WITH_RLS = 9
COMMERCIAL_POLICIES = 0
ANON_TABLE_EXPOSURES = 0
AUTHENTICATED_TABLE_EXPOSURES = 0
SERVICE_ROLE_TABLE_CRUD = 9
RESTRICTED_FUNCTIONS_PRESENT = 5
RESTRICTED_FUNCTIONS_DENIED_TO_PUBLIC_ANON_AUTHENTICATED = 5
RESTRICTED_FUNCTIONS_SERVICE_ROLE_EXECUTE = 5
FUTURE_DEFAULT_CLIENT_GRANTS = 0
```

This preserves the accepted PR-M3-SEC-04B posture and requires explicit ACL
and RLS postconditions in every later wave. No Data API exposure is inferred
from table creation.

## Terminal classification

```text
PCA06_RESULT = ACCEPTED_READ_ONLY_REQUALIFICATION
LEDGER_CLASSIFICATION_COMPLETE = true
PHYSICAL_GAP_STABLE = true
PROTECTED_BASELINE_STABLE = true
SECURITY_BASELINE_STABLE = true
PCA05R_TERMINAL_RESULT = ACCEPTED
R2_RECOVERABILITY = DEFERRED_NON_BLOCKING_UNTIL_POST_HOMOLOGATION_PRE_PRODUCTION
REPOSITORY_ENVELOPE = implemented
SAME_BACKEND_EXECUTION = not_authorized
ROLLBACK_BEFORE_MERGE = branch_or_pr_removal
ROLLBACK_AFTER_MERGE = audited_github_revert
NEXT_GATE = PCA-06_FINAL_AUDIT_AND_PROTECTED_MERGE
```

The later live executor must be Lovable-managed, use an immutable exact tenant
UUID manifest, apply W1-W6 transactionally, stop on first divergence and keep
credential erasure, commercial adoption, orphan repair, R2/provider changes,
deploy and PR #105 outside its scope.
