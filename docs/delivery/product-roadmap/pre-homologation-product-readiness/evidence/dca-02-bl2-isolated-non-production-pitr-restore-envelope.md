# DCA-02-BL2 — Isolated PITR Restore Envelope Evidence

## Materialized contract

~~~text
GATE = DCA-02-BL2_ISOLATED_NON_PRODUCTION_PITR_RESTORE_EXECUTION_ENVELOPE
SOURCE_MAIN = 2762376666044e4a7fa200ea5c7dd1b57c9a8e91
SOURCE_TREE = 0ae2179c94b1ead197c15a27939f85d3576f65c4
MODE = repository_execution_envelope_only
ENVELOPE_IMPLEMENTED = true
EXACT_HEAD_REMOTE_GATES = pending_at_commit_materialization
LIVE_BACKUP_SCOPE_VERIFIED = false
LIVE_PITR_RESTORE_EXECUTED = false
PROJECT_CREATION = false
SUPABASE_PROVIDER_WRITES = 0
DATABASE_WRITES = 0
SAME_BACKEND_MUTATION = false
CLOUDFLARE_PROVIDER_WRITES = 0
DEPLOY = false
PR_105_MUTATION = false
LOVABLE_AGENT_CALLS = false
RPO_CEILING_SECONDS = 900
RTO_CEILING_SECONDS = 14400
MERGE = false
OWNER_ACTION = FINAL_AUDIT_AND_PROTECTED_MERGE_REQUIRED
~~~

## Evidence produced by this gate

- an architecture execution envelope grounded in current official Supabase backup and clone behavior;
- preflight, creation, validation and teardown checkpoints with separate Owner authority;
- pre-activation external-effect containment;
- explicit database-only recovery scope;
- deterministic RPO/RTO and generation-bound manifest requirements;
- exact-diff and immutable-boundary regression coverage in the Release Gate.

No provider or database result is fabricated by this repository-only gate.

## Future live-execution evidence schema

A later gate must fill every field from direct evidence. Blank, unknown or inferred fields fail closed.

| Evidence field | Required value |
|---|---|
| source_project_ref | exact ref |
| target_project_ref | distinct exact ref |
| source_region / target_region | exact and equal |
| plan / physical_backup / PITR state | direct provider result |
| earliest / latest / selected recovery UTC | exact timestamps |
| observed RPO seconds | integer no greater than 900 |
| restore start / validated UTC | exact timestamps |
| observed RTO seconds | integer no greater than 14400 |
| source before/after manifest SHA-256 | equal |
| target manifest SHA-256 | equal to source |
| source/target schema and ledger SHA-256 | exact |
| external-effect inventory | zero or pre-activation containment proof |
| copied-secret/provider-authority inventory | zero or pre-activation containment proof |
| cost / currency / recurrence | exact Owner-confirmed values |
| Storage object-byte scope | explicitly not proven |
| route/deploy/provider writes | exact zero |
| teardown actor/time | exact |
| target absence proof | direct provider result |

## Current decision

~~~text
ENVELOPE_ACCEPTANCE = candidate_until_exact_head_checks_pass
LIVE_EXECUTION_AUTHORIZATION = not_granted
NEXT_GATE = DCA-02-BL2_FINAL_AUDIT_AND_PROTECTED_MERGE
POST_MERGE_NEXT_GATE = DCA-02-BL2_READ_ONLY_PROVIDER_PREFLIGHT_AND_COST_DISCOVERY
~~~
