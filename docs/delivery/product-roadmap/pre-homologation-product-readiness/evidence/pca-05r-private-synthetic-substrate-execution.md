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

## Full R2–R4 rehearsal reconciliation

```text
RESULT=FAIL_CLOSED_INERT_RESIDUAL_CELL
SOURCE_MAIN=5be7cc0e46e9b6e1a43d2f81db2484e4b8aa2d22
SOURCE_TREE=8cc23df208948c64cc8ccda08d2233480b4e356b
PRIVATE_CELL_ID=8690cd64-9761-4c12-a3da-f7d7edd5714f
PRIVATE_CELL_VISIBILITY=private
PRIVATE_CELL_PUBLISHED=false
SUBSTRATE=103/103_SUCCESS
STRUCTURAL_WAVES=W1-W6_SUCCESS
SYNTHETIC_TENANTS=2
AUTH_USERS_PURGED=2/2
TENANT_SCOPED_RESIDUE=0
OWNER_PROJECT_DELETION_REQUIRED=true
```

The protected corrective chain continued through PRs #151–#157. Every
corrective changed only the synthetic builder/contracts; all 17 migration
source hashes remained immutable. The final clean cell proved, per tenant:
one configuration, one default pipeline, seven stages, four marketing
connectors/versions/mappings, three tracking connectors/versions, 36 event
bindings and one consent configuration. Authorized replay was idempotent;
unknown hash/tenant/authorization failed closed; an injected transaction fault
left zero residue. Under `authenticated`, tenant A observed one own membership
and zero tenant-B rows. All tenant-scoped tables had RLS and all
`SECURITY DEFINER` routines had configured search paths.

Final purge removed every row for the two reserved tenant UUIDs and both Auth
users. No deploy, DNS, provider, Same-Backend, production or PR #105 mutation
occurred. The remaining private/unpublished Lovable project must be deleted
manually by the Owner; PCA-05R is not `ACCEPTED` until direct deletion evidence.

## Definitive Owner teardown and terminal acceptance

```text
TERMINAL_RESULT=ACCEPTED
TERMINAL_DATE=2026-08-27
PRIVATE_CELL_ID=8690cd64-9761-4c12-a3da-f7d7edd5714f
OWNER_DELETION_CONFIRMED=true
DIRECT_LOVABLE_LOOKUP=404_PROJECT_NOT_FOUND
PRIVATE_CELL_RESIDUE=0
OWNER_PROJECT_DELETION_REQUIRED=false
PCA_05R_STATUS=ACCEPTED
PCA_06_AUTO_START_AUTHORIZED=false
```

The Owner completed the irreversible Lovable project deletion and supplied the
confirmation flow evidence. A subsequent direct authenticated lookup of the
exact project ID returned `404 project_not_found`; the private project, preview
and managed backend are therefore no longer addressable. Combined with the
pre-deletion purge proof above, the residual-cell boundary is closed and
PCA-05R reaches terminal `ACCEPTED`.

This acceptance proves only the R2-R4 synthetic schema, tenant and security
rehearsal contracted by PCA-05R. It does not prove R1 backup/PITR
recoverability, does not waive DCA-02-BL2, and does not authorize PCA-06,
Same-Backend writes, provider mutation, deployment or PR #105 mutation.
