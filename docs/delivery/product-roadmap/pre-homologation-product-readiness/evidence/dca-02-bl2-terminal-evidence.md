# DCA-02-BL2 — Repository Proof Evidence

> **Current authority notice:** PR #161 remains historical evidence for a
> noncanonical direct connector. The binding RM Prime authority and successor
> are the Lovable-managed corrective recorded below.

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

## Lovable-managed authority rebaseline corrective

~~~text
CORRECTIVE_GATE = DCA-02-BL2_LOVABLE_MANAGED_AUTHORITY_REBASELINE_REPOSITORY_CORRECTIVE_IMPLEMENTATION
CORRECTIVE_SOURCE_MAIN = c1bfa87da8abaafbcdd3bbabf67be9ebdfa79069
CORRECTIVE_OBSERVED_AT_UTC = 2026-08-28T09:45:23Z
CANONICAL_LOVABLE_PROJECT_ID = 982b91d8-946d-4103-8eb3-40ddbaeedbf4
CANONICAL_SUPABASE_PROJECT_REF = stmcnvzuzlyqammyycxj
OWNER_SUPABASE_ACCESS = LOVABLE_ONLY
DIRECT_SUPABASE_MCP = false
SOURCE_PROJECT_AUTHORITY_VERIFIED = true
PUBLIC_TABLES = 81
PUBLIC_TABLES_WITH_RLS = 81
PG_CRON_INSTALLED = true
PG_NET_INSTALLED = true
CRON_ACTIVE_JOBS = 1
CRON_NETWORK_COMMAND_JOBS = 1
EXTERNAL_EFFECT_ROUTINE_CANDIDATES = 2
VAULT_SECRET_COUNT = 1
BACKUP_SCOPE_VERIFIED = false
PITR_ENABLED_VERIFIED = false
EXTERNAL_EFFECT_CONTAINMENT_PROVEN = false
EXACT_CLONE_COST_CONFIRMED = false
LOVABLE_SQL_READ_CALLS = 2
DATABASE_WRITES = 0
PROJECT_CREATION_CALLS = 0
RESTORE_CALLS = 0
CORRECTIVE_GATE_STATUS = ACCEPTED
RESTORE_QUALIFICATION = BLOCKED_EXTERNAL
PR_161_HISTORICAL_EVIDENCE_PRESERVED = true
PR_161_NEXT_GATE_SUPERSEDED = true
SUPERSEDED_NEXT_GATE = DCA-02-BL2_SUPABASE_PROJECT_AUTHORITY_REBIND_AND_READ_ONLY_PREFLIGHT_RETRY
NEXT_GATE = DCA-02-BL2_LOVABLE_MANAGED_RECOVERABILITY_STRATEGY_IMPACT_ANALYSIS
LIVE_RESTORE_AUTHORIZED = false
PROJECT_CREATION_AUTHORIZED = false
~~~

The direct connector failure from PR #161 remains factual only for the account
and organization observed there. It cannot require direct Supabase access from
the Owner or invalidate the exact Lovable-managed RM Prime backend. Live
restore remains blocked because backup/PITR/cost are not visible through the
admissible control plane and copied external-effect capability is not contained.

## R2 post-homologation recoverability rebaseline

~~~text
REBASELINE_GATE = DCA-02-BL2_R2_POST_HOMOLOGATION_PRE_PRODUCTION_DEFERRED_RECOVERABILITY_REBASELINE_REPOSITORY_IMPLEMENTATION
REBASELINE_SOURCE_MAIN = 64510f51b73557dab3cc8c514d3eafd957308ee2
REBASELINE_SOURCE_TREE = 45b26fcfa58c2556de08feb5d49dae319e5803e5
CLOUDFLARE_PAID_OR_ENTERPRISE_UPGRADE_BEFORE_HOMOLOGATION = not_planned
FULL_DATABASE_PITR_AS_DCA02_BL2_STRATEGY = superseded
SELECTED_STRATEGY = encrypted_external_generation_bound_ledger_snapshots
R2_SUBSCRIPTION_ENABLED = false
R2_LIST_BUCKETS_RESULT_CODE = 10042
R2_PROVIDER_IMPLEMENTATION = deferred_until_post_homologation
DCA02_TERMINAL_ACCEPTANCE_BLOCKED = false
PRM3_OR_FRONTEND_BLOCKED = false
CONTROLLED_TESTING_BLOCKED = false
FORMAL_HOMOLOGATION_BLOCKED = false
PRODUCTION_READINESS_BLOCKED_UNTIL_RECOVERY_PROOF = true
RPO_CEILING_SECONDS = 900
RTO_CEILING_SECONDS = 14400
CLOUDFLARE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
LOVABLE_AGENT_CALLS = 0
PRODUCTION_CUTOVER_ALLOWED = false
NEXT_GATE = DCA-02-BL2_R2_DEFERRED_RECOVERABILITY_REBASELINE_FINAL_AUDIT_AND_PROTECTED_MERGE
~~~

The full evidence and future R2 private-bucket, Bucket Lock, least-privilege
token, encryption, cost, snapshot, and recovery-cell contract are recorded in
`dca-02-bl2-r2-deferred-recoverability-rebaseline.md`. No external resource was
created and no previously accepted DCA-02 or PR-M3 authority was reopened.
