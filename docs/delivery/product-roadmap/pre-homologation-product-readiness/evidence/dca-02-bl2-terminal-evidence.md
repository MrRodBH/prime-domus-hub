# DCA-02-BL2 — Repository Proof Evidence

```text
STAGE_ID = DCA-02-BL2
SOURCE_BACKLOG_ID = NB-DCA02-02
BASELINE_MAIN = e9176b4d3a8c4bac9c11c736d218313ec6273e8b
MODE = repository_planning_and_synthetic_proof
REPOSITORY_CONTRACT = implemented
EXACT_HEAD_REMOTE_GATES = pending_at_commit_materialization
LIVE_BACKUP_SCOPE_VERIFIED = false
LIVE_PITR_RESTORE_EXECUTED = false
PRODUCTION_RESTORE_EXECUTED = false
PROVIDER_API_CALLS = 0
PROVIDER_WRITES = 0
DATABASE_WRITES = 0
REAL_TENANT_MUTATION = 0
DEPLOY = false
MERGE = false
PRODUCTION_CUTOVER = false
RPO_CEILING = 15 minutes
RTO_CEILING = 4 hours
HEURISTIC_RECONSTRUCTION = prohibited
HOSTNAME_AUTHORITY = false
CUSTOM_METADATA_AUTHORITY = false
ORDER_BY_LIMIT_1_AUTHORITY = false
DCA-02-BL1_DIAGNOSTIC_NEXT = true
DCA-02-BL1_PROVIDER_WRITES = false
ROLLBACK = at_most_one_audited_revert
OWNER_ACTION = NONE
```

The exact-head runner proves deterministic in-memory reconstruction of the generation-bound provider-identity ledger, rejects missing/duplicate/conflicting identity, validates the canonical SHA-256 manifest, and locks the existing RLS/grant/guard-trigger/SECURITY DEFINER boundaries. This evidence does not claim a live backup or PITR restore. That action requires a separate exact non-production execution envelope.
