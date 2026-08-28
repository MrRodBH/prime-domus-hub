# Evidência PCA-07R2 — W1 forensic forward-only ledger reconciliation

```text
GATE=PCA-07R2R2_W1_EMBEDDED_SOURCE_BYTE_IDENTITY_CORRECTIVE_REPOSITORY_IMPLEMENTATION
SOURCE_MAIN=37eb8ecec801eeb9e3eb78758ac54de2d7925389
SOURCE_TREE=a7a1bd4741227baeb045b0befad18924f4c31c43
BRANCH=agent/pca-07r2r2-w1-embedded-source-byte-identity-corrective
CORRECTIVE_VERSION=20260828160617
CORRECTIVE_TOP_LEVEL_STATEMENTS=1
PCA07R2R2_PRIOR_CORRECTIVE_SHA256=58d79794ebf4aab1f417f0e27edefa0022038d0669aadcdfefee9a7a30e46d11
PCA07R2R2_CORRECTIVE_SHA256=4be66ebfd62ce55da1f9923d8e131a78d849e5b8f946d00d5f37851698c50ccb
PCA07R2R2_PRIOR_CORRECTIVE_BYTES=77171
PCA07R2R2_CORRECTIVE_BYTES=77169
PCA07R2R2_PREFIX_BYTE=10
PCA07R2R2_LIFECYCLE_LITERAL_OBSERVED_BYTES=20254
PCA07R2R2_ACCESS_LITERAL_OBSERVED_BYTES=30314
PCA07R2R2_TARGET_LEDGER_ROWS_AFTER_FAILURE=0
PCA07R2R2_LOVABLE_APPLICATION_RESULT=FAIL_CLOSED_P0001
W1_SOURCE_BYTES=50566
PRIOR_DUPLICATED_SOURCE_LOWER_BOUND_BYTES=101132
W1_LEDGER_ROWS_OBSERVED=0
W1_FUNCTIONS_OBSERVED=11
W1_INDEXES_VALID_READY=5
W1_CONSTRAINTS_NOT_VALID=2
W1_RLS_RELATIONS=7
W1_CLIENT_TABLE_EXPOSURES=0
PRODUCT_TABLES_PRESENT=0
PRODUCT_TABLES_MISSING=45
PRODUCT_COLUMNS_PRESENT=2
PRODUCT_COLUMNS_MISSING=55
W2_W6_EXECUTED=false
W1_REPLAY=false
BLIND_MIGRATION_REPAIR=false
SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PROVIDER_MUTATION=false
DEPLOY=false
ROADMAP_SITE_UPDATE=false
PR_105_MUTATION=false
RESULT=EMBEDDED_SOURCE_BYTE_IDENTITY_CORRECTIVE_MATERIALIZED_NOT_EXECUTED
```

## Deterministic inputs

| Version | Source SHA-256 | Bytes | Corrective action |
|---:|---|---:|---|
| `20260728165000` | `8f0ea65dd452caee8828f3acee5b8f0808ad269b98b89fef720d9a2985118bd8` | 20,253 | attest and reconstruct exact ledger row |
| `20260728180000` | `3a143962333bfd467ef4a4911c46401c8f9980cfb19cb7535ed7c8445f8f806e` | 30,313 | attest and reconstruct exact ledger row |

The generator fails on input byte/hash drift, derives all 11 expected `prosrc`
hashes directly from the canonical W1 files and embeds both sources exactly once.
The generated statement contains no dynamic execution of either source.

## Preserved live invariants

```text
TENANTS=74
PROTECTED_RESIDUES=73
PROTECTED_RESIDUE_MD5=3ece053ddbdfce5161380ec38824ea91
PORTAL_CONNECTORS=444
PROTECTED_RESIDUE_PORTAL_CONNECTORS=438
RETAINED_PORTAL_SENSITIVE_FIELDS=888
STORAGE_OBJECTS=22
STORAGE_BYTES=15826788
COMMERCIAL_RLS=9/9
COMMERCIAL_CLIENT_EXPOSURES=0
RESTRICTED_FUNCTIONS_CLIENT_DENIED=5/5
QUARANTINE_EXACT=4/4
```

No secret value, customer payload, Auth identity or Storage object content is
copied into this evidence. Values above are aggregate preservation contracts.

## Atomicity proof encoded in the artifact

- one top-level `DO` statement;
- W1 sources are evidence variables, not executable SQL;
- every catalog/data/ledger assertion precedes the first insert;
- the two historical rows and the PCA-07R2 corrective attestation are inserted
  together using the six-column ledger contract observed on the canonical
  Lovable-managed backend;
- an already exact three-row state is a verified no-op, while partial or
  divergent history fails closed;
- exact historical statement hashes are rechecked before statement completion;
- any error rolls back all three ledger inserts.

Live execution remains unauthorized by this evidence.

## PCA-07R2R CI-scope corrective

```text
PCA07R2R_RELEASE_GATE_886=FAIL_CLOSED_SCOPE_COUPLING
PCA07R2R_FAILED_STEP=PCA05R_PRIVATE_SYNTHETIC_REHEARSAL_ENVELOPE
PCA07R2R_ROOT_CAUSE=PCA05R_CLOSURE_MAPPED_TO_BROAD_PCA05R_SELECTOR
PCA07R2R_CORRECTIVE=INDEPENDENT_PCA05R_CLOSURE_SELECTOR
PCA07R2R_MIGRATION_SQL_CHANGED=false
PCA07R2R_SAME_BACKEND_WRITES=0
PCA07R2R_LOVABLE_CALLS=0
```

The failed run did not identify a schema or product defect. It exposed a CI
classification collision that skipped the dedicated PCA-07R2 step after the
legacy exact-diff guard failed. The corrective preserves that legacy guard and
decouples only its activation path.

## PCA-07R2R2 embedded-source identity evidence

The first authorized Lovable-managed application transported the prior
corrective byte-for-byte but PostgreSQL rejected its lifecycle literal before
the first insert. The prior SQL itself was canonical; both embedded variables
contained one additional LF immediately after their opening delimiter.

Read-only diagnostics proved that removing only the first byte produced the
exact lifecycle and access source lengths and SHA-256 values listed above. The
target ledger remained `0/3`. The generator now emits zero prefix bytes and the
regression extracts each produced literal to assert exact value, byte length
and hash equality. Neither immutable W1 source file changed, and no live retry
is authorized by this evidence.
