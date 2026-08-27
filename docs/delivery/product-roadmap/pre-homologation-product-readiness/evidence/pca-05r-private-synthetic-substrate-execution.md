# PCA-05R — private synthetic substrate execution evidence

## Terminal result

```text
GATE=PCA-05R_LOVABLE_MEDIATED_PRIVATE_SYNTHETIC_SUBSTRATE_EXECUTION
RESULT=SUCCESS
EXECUTION_DATE=2026-08-27
EXECUTED_BLOCKS=103/103
BUNDLE_SHA256=b8b3436440dadc357675ddc299ca8adb41449378e0e2747c2ab1adf81ddcef4e
SOURCE_MAIN=42566d685f91ca8deebab3e1ed06d3d3524eea79
SOURCE_TREE=00038cfffa03a8e94d75dc641c67b3c3af1e2d11
PRIVATE_CELL_ID=15aeae79-a56f-47d3-a822-82ce05918780
PRIVATE_CELL_VISIBILITY=private
PRIVATE_CELL_PUBLISHED=false
```

## Protected corrective chain

- PR #148 established exact source-target parity for the 24-table tenantization source.
- The first clean-cell run stopped at block 62 because two provider-created email queue functions were absent; the failing transaction rolled back.
- PR #149 converted only those two hardening statements into presence-guarded REVOKEs and preserved the REVOKE when either optional function exists.
- PR #149 pre-merge gates: Release Gate #849 `SUCCESS`; PR-M2 #362 and #363 `SUCCESS`.
- PR #149 merged/closed by protected squash at `42566d685f91ca8deebab3e1ed06d3d3524eea79`.
- Post-merge Release Gate #850: `SUCCESS`.
- No migration file was changed by either corrective.

## Postflight structural reconciliation

| Evidence | Result |
|---|---:|
| PostgreSQL | 17.6 |
| Public tables | 67 |
| Public tables with RLS | 67 |
| Public functions | 33 |
| Public policies | 176 |
| Columns named `tenant_id` | 51 |
| Tenants | 0 |
| Auth users | 0 |
| Storage objects | 0 |
| Vault secrets | 0 |
| `pg_net` / `pg_cron` extensions | 0 |
| `net` / `cron` schemas | 0 |
| Migration ledger relation | absent |

The `pgmq` extension is present solely as the bundle's inert internal queue substrate. No queue worker, cron, network extension, tenant, user, object, secret, application traffic, deploy or publication was created.

## Exclusion proof

```text
SAME_BACKEND_MUTATION=false
PRODUCTION_DATABASE_MUTATION=false
MIGRATION_LEDGER_WRITE=false
GITHUB_MUTATION_BY_LOVABLE=false
PROVIDER_MUTATION=false
DEPLOY=false
DNS_MUTATION=false
PRODUCTION_CUTOVER=false
REAL_TENANT_DATA=0
PR_105_MUTATION=false
```

PR #105 remained closed, draft and unmerged at head `9d64c7ac6c1259652a70022db08583139cb368af`.
