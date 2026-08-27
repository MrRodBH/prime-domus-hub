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

## Isolated restore execution-envelope continuation

~~~text
ENVELOPE_GATE = DCA-02-BL2_ISOLATED_NON_PRODUCTION_PITR_RESTORE_EXECUTION_ENVELOPE
ENVELOPE_SOURCE_MAIN = 2762376666044e4a7fa200ea5c7dd1b57c9a8e91
ENVELOPE_SOURCE_TREE = 0ae2179c94b1ead197c15a27939f85d3576f65c4
ENVELOPE_STATUS = candidate_until_exact_head_checks_pass
LIVE_RESTORE_AUTHORIZED = false
PROJECT_CREATION = false
SUPABASE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
SAME_BACKEND_MUTATION = false
CLOUDFLARE_PROVIDER_WRITES = 0
PR_105_MUTATION = false
NEXT_GATE = DCA-02-BL2_FINAL_AUDIT_AND_PROTECTED_MERGE
~~~

The continuation adds only the executable contract and its deterministic
repository test. It preserves every prior statement that no live backup scope
has been verified and no PITR restore has been executed.

## Read-only provider preflight and cost discovery

~~~text
PREFLIGHT_GATE = DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY
PREFLIGHT_SOURCE_MAIN = e1ba6dc76d4ed60fa2b74d973a848b8604c9cd59
PREFLIGHT_OBSERVED_AT_UTC = 2026-08-27T21:20:34.581Z
SOURCE_PROJECT_AUTHORITY_VERIFIED = false
LIST_PROJECTS_COUNT = 0
DIRECT_PROJECT_LOOKUP_RESULT = permission_denied
CONNECTED_ORGANIZATION_PLAN = free
EXACT_RESTORE_TO_NEW_PROJECT_COST_DISCOVERED = false
BACKUP_SCOPE_VERIFIED = false
PITR_ENABLED_VERIFIED = false
EXTERNAL_EFFECT_CONTAINMENT_PROVEN = false
SUPABASE_WRITE_CALLS = 0
SQL_QUERY_CALLS = 0
PROJECT_CREATION_CALLS = 0
RESTORE_CALLS = 0
PREFLIGHT_STATUS = TERMINAL_FAIL_CLOSED_AUTHORITY_MISMATCH
NEXT_GATE = DCA-02-BL2_SUPABASE_PROJECT_AUTHORITY_REBIND_AND_READ_ONLY_PREFLIGHT_RETRY
~~~

The visible organization and generic project quote do not establish the plan,
backup state, PITR window or clone cost of the inaccessible source project.
Live restore and project creation remain prohibited.
