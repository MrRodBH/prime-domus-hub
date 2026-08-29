# PCA-07 W2 — repository corrective evidence

```text
RESULT=IMPLEMENTED_NOT_EXECUTED
SOURCE_MAIN=2ea96b2710b382944d9dfdcb8cae78eebd238dcf
SOURCE_TREE=b6d79b650ce575bee546e66395f97bf7ebd0ace8
CORRECTIVE_VERSION=20260829110000
EXECUTION_ENVELOPES=2
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
