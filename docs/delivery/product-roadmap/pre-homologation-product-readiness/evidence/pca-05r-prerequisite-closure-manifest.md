# PCA-05R — Prerequisite closure manifest evidence

```text
GATE=PCA-05R_GITHUB_NATIVE_PREREQUISITE_CLOSURE_MANIFEST_IMPLEMENTATION
STATUS=FAIL_CLOSED_SYNTHETIC_SUBSTRATE_BUNDLE_REQUIRED
REPOSITORY_MIGRATIONS=131
PREREQUISITE_CANDIDATES=105
PCA04_REHEARSAL_MIGRATIONS=17
EXCLUDED_AFTER_PRELUDE=9
WHOLE_FILE_REPLAY_BLOCKERS=3
PREREQUISITE_WITHOUT_EXPLICIT_TRANSACTION=104
MIGRATION_FILE_MUTATION=false
LOVABLE_AGENT_CALLS=false
BACKEND_MUTATION=false
SAME_BACKEND_MUTATION=false
PROVIDER_MUTATION=false
DEPLOY=false
PR_105_MUTATION=false
```

Every prerequisite candidate is recorded with path, SHA-256, byte count,
transaction state, DML indicator, duplicate-byte relation, hazards and binding
disposition. The manifest rejects raw historical replay and requires a separate
rehearsal-only synthetic substrate bundle before any Lovable project or database
may be created.
