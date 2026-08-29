# PCA-07 W2 — repository corrective evidence

```text
RESULT=UUID_AUTHORITY_ASSERTION_CORRECTIVE_IMPLEMENTED_NOT_EXECUTED
SOURCE_MAIN=29bdcb5e2c643264c693a4d03bb8d52ea19577e6
SOURCE_TREE=90da0cb3aa040174f1b5261c8e7091cbe3cb43d3
CORRECTIVE_VERSION=20260829110000
EXECUTION_ENVELOPES=2
PCA07_W2R_PREFLIGHT_RESULT=FAIL_CLOSED_POSTGRES_42883
PCA07_W2R_SQLSTATE=42883
PCA07_W2R_CAUSE=UUID_MIN_MAX_AGGREGATES_UNAVAILABLE
PCA07_W2R_AUTHORITY_ASSERTION=EXACT_TOTAL_AND_FILTERED_TARGET_COUNT
PCA07_W2R_APPLICATION_WRITES=0
PCA07_W2R_POSTFLIGHT_LEDGER=0/3
PCA07_W2R_POSTFLIGHT_PHYSICAL=ABSENT
TRANSPORT_SOURCE_COPIES_PER_MIGRATION=1
CONFIGURATION_LEDGER_VERSION=20260728233000
PORTAL_LEDGER_VERSION=20260729103000
W1_LEDGER_PREREQUISITE=3/3_EXACT
W2_LIVE_LEDGER_BEFORE_IMPLEMENTATION=0/2
W2_LIVE_PHYSICAL_BEFORE_IMPLEMENTATION=ABSENT
```

Implemented projections:

- PostgreSQL 100-argument configuration split;
- legacy Instagram handle to canonical HTTPS URL;
- removal of both legacy portal credential defaults;
- deferral of the incompatible no-plaintext check until credential cutover;
- migration-local atomic ledger insert and postflight.

Accepted live preflight facts frozen as fail-closed guards:

```text
TENANTS=74
PORTAL_CONNECTORS=444
TARGET_PORTAL_CONNECTORS=6
PROTECTED_PORTAL_CONNECTORS=438
RETAINED_SENSITIVE_FIELDS=888
EXPECTED_VERIFIER_ROWS=12
EXPECTED_CONFIGURATION_SNAPSHOTS=1
STORAGE_OBJECTS=22
STORAGE_BYTES=15826788
```

```text
SAME_BACKEND_READS=0
SAME_BACKEND_WRITES=0
LOVABLE_CALLS=0
DIRECT_SUPABASE_CALLS=0
PORTAL_SECRET_ERASURE=false
PROVIDER_MUTATION=false
DEPLOY=false
ROADMAP_UPDATE=false
PR_105_MUTATION=false
```

No runtime SQL was materialized with a real tenant UUID and no application was
attempted. The builder requires that exact runtime input only after protected
merge and a separate Lovable-managed application authorization.

The later authorized Lovable-managed preflight materialized the runtime SQL in
memory for the exact RM Prime UUID, but PostgreSQL rejected the read-only
authority assertion before DDL/DML because `min(uuid)` is unavailable. A
read-only forensic postflight confirmed zero side effects. W2R removes only
those invalid aggregates and preserves the exact one-tenant contract through
total and filtered target counts.
