# PR-M2 — CRM Operational Workflow Functional Completion — Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = CRM Operational Workflow Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = 05429293174dcdafc6967396caaedb26217ebb8c
CODE_HEAD = 45669c9ed30b01304499ec15be105362eca47699
FINAL_HEAD = resolved by the final exact-head Release Gate metadata after this evidence commit
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

`FINAL_HEAD` is intentionally resolved by the post-evidence exact-head workflow metadata. A commit cannot truthfully contain its own not-yet-created SHA; no self-referential value is fabricated in this document.

## 1. Scope executed

The increment established a canonical tenant-scoped operational CRM workflow for the domain that exists in the repository:

```text
leads
seven-state lifecycle
unique default pipeline
pipeline stages
stage transitions
member and team assignment
global / team / own scopes
qualification
tasks and follow-ups
append-only operational timeline
human notes
tenant tag catalog
lead tags
original and latest attribution
won / lost / reopen / archive
duplicate candidate diagnostics
optimistic concurrency
idempotency
server-side reports and diagnostics
functional UI states
```

The repository has no canonical contacts or opportunities aggregate. Those domains were not invented by this increment.

```text
CONTACT_MODEL = absent / not invented
OPPORTUNITY_MODEL = absent / not invented
AUTOMATIC_LEAD_MERGE = false
DUPLICATE_MODEL = exact candidate diagnostics + explicit merge review required
```

## 2. Execution delta

```text
COMMITS_CREATED_BEFORE_EVIDENCE = 23
FILES_CHANGED_BEFORE_EVIDENCE = 14
MIGRATIONS_CREATED = 1
DEPENDENCY_VERSION_CHANGES = 0
BUN_LOCK_CHANGED = false
```

Files changed by the increment before this evidence commit:

```text
package.json
run-pr-m2-crm-operational-workflow-functional-completion-specs.ts
run-pr-m2-crm-report-authority-specs.ts
scripts/verify-release.mjs
src/components/pipeline/CrmOperationsPanel.tsx
src/components/pipeline/LeadDetail.tsx
src/lib/api/admin.functions.ts
src/lib/api/leads-crm.functions.ts
src/lib/api/tenant-crm-authority.server.ts
src/lib/api/tenant-crm-compat.functions.ts
src/lib/api/tenant-crm-management.functions.ts
src/lib/api/tenant-crm.functions.ts
src/lib/crm/crm-registry.ts
supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql
```

Ancestry comparison:

```text
BASE = 05429293174dcdafc6967396caaedb26217ebb8c
HEAD = 45669c9ed30b01304499ec15be105362eca47699
STATUS = ahead
AHEAD_BY = 23
BEHIND_BY = 0
```

## 3. CRM model before

At `INITIAL_HEAD`, the repository contained:

```text
LEAD_TABLE = present
LEAD_STATUS_DOMAIN = novo / conversando / visita / proposta / ganho / perdido / descartado
LEAD_VERSION = present
LEGACY_STATUS_HISTORY = present
LEGACY_ACTIVITY_TABLE = present
DISCARD_REASON_CATALOG = present
LOST_REASON_CATALOG = present
TEAM_TABLES = present
PTW01_PUBLIC_WRITER = present
```

The direct audit also confirmed the following functional gaps:

```text
CANONICAL_CRM_MODULE = absent
EFFECTIVE_TAC_CRM_AUTHORITY = absent
PIPELINE_TABLE = absent
PIPELINE_STAGE_TABLE = absent
TASK_MODEL = absent
CANONICAL_TIMELINE = absent
TAG_CATALOG = absent
LEAD_TAG_RELATIONSHIP = absent
CRM_IDEMPOTENCY_LEDGER = absent
TEAM_SCOPE_RESOURCE_FILTER = absent
OWN_SCOPE_RESOURCE_FILTER = absent
CANONICAL_AGGREGATE = absent
EXACT_DUPLICATE_DIAGNOSTICS = absent
FUNCTIONAL_OPERATIONS_PANEL = absent
```

The legacy LSH-01 transition runtime remained preserved for regression history, but active administrative CRM access still contained role-derived compatibility paths and did not expose the complete operational workflow.

## 4. CRM model after

```text
CRM_SCHEMA_VERSION = 1
TENANT_CRM_AUTHORITY = server_only
CLIENT_TENANT_AUTHORITY = false
CLIENT_ACTOR_AUTHORITY = false
CLIENT_ROLE_AUTHORITY = false
CLIENT_SCOPE_AUTHORITY = false
CLIENT_ASSIGNMENT_AUTHORITY = false
CLIENT_PIPELINE_AUTHORITY = false
CLIENT_STAGE_AUTHORITY = false
CLIENT_TRANSITION_AUTHORITY = false
SUPER_ADMIN_IMPERSONATION_REQUIRED = true
HAS_ROLE_TENANT_AUTHORITY = false
USER_ROLES_TENANT_AUTHORITY = false
TENANT_DEFAULT = false
HEURISTIC_FALLBACK = false
DUAL_RUNTIME = false
ORDER_BY_LIMIT_1_AUTHORITY = false
AMBIGUOUS_CARDINALITY = fail_closed
```

## 5. Closed registries

File:

```text
src/lib/crm/crm-registry.ts
```

Registry inventory:

```text
LEAD_STATUS_REGISTRY = 7 definitions
LEAD_TRANSITION_REGISTRY = 13 definitions
QUALIFICATION_REGISTRY = 4 definitions
TASK_TYPE_REGISTRY = 6 definitions
TASK_STATUS_REGISTRY = 4 definitions
ACTIVITY_TYPE_REGISTRY = 21 definitions
ASSIGNMENT_STRATEGY_REGISTRY = 3 definitions
LOSS_REASON_REGISTRY = tenant catalog reference contract
CRM_UI_STATE_REGISTRY = at least 35 functional states
```

Lead statuses:

```text
novo
conversando
visita
proposta
ganho
perdido
descartado
```

Unknown statuses, task types, task statuses, assignment strategies and transitions fail closed.

## 6. Lead lifecycle and transition graph

The canonical graph materializes only transitions supported by the existing seven-state domain:

```text
novo → conversando
novo → descartado
conversando → visita
conversando → proposta
conversando → descartado
visita → conversando
visita → proposta
visita → descartado
proposta → conversando
proposta → ganho
proposta → perdido
perdido → novo
descartado → novo
```

Contracts:

```text
WON = terminal close from proposta, gerenciar permission required
LOST = terminal close from proposta, active tenant loss reason required
DISCARDED = terminal archive from supported states, active tenant discard reason required
REOPEN = explicit transition to novo, bounded note required
NOOP_TRANSITION = denied
UNKNOWN_TRANSITION = denied
TERMINAL_DIRECT_EDIT = denied
STATUS_AND_STAGE_POINTER = updated atomically
HISTORY_AND_AUDIT = same transaction
```

## 7. Pipeline model

Migration:

```text
supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql
```

Tables:

```text
crm_pipelines
crm_pipeline_stages
```

The migration creates one explicit `sales_default` pipeline per tenant and exactly one stage per canonical status. Partial unique indexes enforce one active default pipeline and unique status/position per pipeline.

```text
DEFAULT_PIPELINE_CARDINALITY = exactly 1
DEFAULT_STAGE_CARDINALITY = exactly 1 per canonical status
AMBIGUOUS_DEFAULT = abort
AMBIGUOUS_STAGE = abort
PIPELINE_ID_NOT_NULL = true after deterministic backfill
STAGE_ID_NOT_NULL = true after deterministic backfill
```

`crm_bind_lead_pipeline_trigger` binds every new PTW-01 lead to the unique explicit default pipeline and matching stage. It does not select the first row or use ordering as authority. A 0/N configuration aborts.

Pipeline state management is global-scope-only. The active default pipeline cannot be deactivated, and a pipeline with active leads cannot be deactivated silently.

## 8. Authority and scope enforcement

Files:

```text
src/lib/api/tenant-crm-authority.server.ts
src/lib/api/tenant-crm.functions.ts
src/lib/api/tenant-crm-management.functions.ts
```

Authority chain:

```text
requireTenant trusted context
+ requireTenantScopedAuthority
+ resolveEffectiveTenantPermission
+ module = crm
+ action
+ effective scope
+ resource assignment/team relationship
```

Scope model:

```text
GLOBAL = all CRM resources in the tenant
TEAM = actor-assigned leads, leads assigned to members sharing an active team, or leads assigned to an actor team
OWN = leads assigned explicitly to the actor
```

Target validation:

```text
MEMBER_TARGET_GLOBAL = active tenant membership required
MEMBER_TARGET_TEAM = active membership + shared active team required
MEMBER_TARGET_OWN = actor only
TEAM_TARGET_GLOBAL = active tenant team required
TEAM_TARGET_TEAM = actor membership in target active team required
TEAM_TARGET_OWN = denied
```

Owner receives tenant root authority through Tenant Access Control. Super Admin receives tenant-scoped authority only through explicit impersonation.

## 9. Aggregate and concurrency

Canonical aggregate:

```text
LeadAggregate {
  lead
  pipeline
  stage
  tasks
  tags
  activities
  rowVersion
}
```

Concurrency model:

```text
LEAD_OCC = leads.version
TASK_OCC = crm_lead_tasks.row_version
PIPELINE_OCC = crm_pipelines.row_version
STALE_VERSION = crm_version_conflict
SILENT_OVERWRITE = false
RESOURCE_LOCK = SELECT ... FOR UPDATE
```

Idempotency model:

```text
LEDGER = crm_idempotency
KEY_SCOPE = tenant + actor + idempotency_key
REQUEST_HASH = operation payload hash
RETRY_SAME_PAYLOAD = returns stored response
RETRY_DIFFERENT_PAYLOAD = crm_idempotency_conflict
CONCURRENT_SAME_KEY = serialized with pg_advisory_xact_lock
```

## 10. Assignment model

Canonical assignment operations:

```text
manual_member
manual_team
unassigned
```

Guarantees:

```text
TENANT_MEMBER_ACTIVE = required
TEAM_ACTIVE = required
TEAM_RELATIONSHIP = revalidated server-side
CLIENT_SCOPE = ignored / prohibited
FALLBACK_OWNER = false
FIRST_MEMBER_FALLBACK = false
ROUND_ROBIN_HEURISTIC = absent
FROM_ASSIGNMENT = captured before mutation
TO_ASSIGNMENT = explicit validated intent
ASSIGNMENT_HISTORY = append-only
ASSIGNMENT_AUDIT = atomic
```

The final correction preserves `from_user_id` and `from_team_id` before updating the lead, preventing post-update values from being recorded as the origin assignment.

## 11. Task and follow-up model

Table:

```text
crm_lead_tasks
```

Task types:

```text
follow_up
call
meeting
visit
proposal_review
other
```

Task states:

```text
open
in_progress
completed
cancelled
```

Supported transitions:

```text
open → in_progress / completed / cancelled
in_progress → completed / cancelled
completed → open with explicit reason
cancelled → open with explicit reason
```

Task parent, scope, assignee eligibility, due date, type, status and row version are revalidated server-side. Notifications remain internal intents; no provider is called.

## 12. Timeline and notes

Tables:

```text
crm_lead_events
crm_lead_assignments
```

Events are server-generated and append-only. UPDATE and DELETE are rejected by triggers.

Catalogued event types include:

```text
lead_created
lead_updated
lead_assigned
lead_reassigned
lead_unassigned
stage_changed
status_changed
qualification_changed
task_created
task_started
task_completed
task_cancelled
task_reopened
note_added
contact_attempt_recorded
tags_changed
source_corrected
won
lost
reopened
archived
```

Human notes are bounded, sanitized and distinct from system events. Tenant and actor are server-derived.

## 13. Tags and attribution

Tables:

```text
crm_tags
crm_lead_tags
```

Contracts:

```text
TAG_TENANT_OWNERSHIP = required
TAG_DUPLICATE_KEY = denied
TAG_DUPLICATE_NAME = denied
UNKNOWN_TAG_IMPLICIT_CREATION = denied
TAG_CATALOG_MANAGEMENT = global scope only
LEAD_TAG_SET = atomic + OCC + audit
```

Attribution model:

```text
ORIGINAL_ATTRIBUTION = backfilled and preserved
LATEST_ATTRIBUTION = separate mutable audited projection
MANUAL_SOURCE_CORRECTION = explicit server operation
UTM_GCLID_FBCLID_REFERRER = data only, never authorization
```

## 14. Deduplication model

```text
NORMALIZED_EMAIL = deterministic lower/trim
NORMALIZED_PHONE = deterministic numeric normalization
CANDIDATE_MATCH = exact email or exact phone
FUZZY_MATCH_AUTHORITY = false
AUTOMATIC_MERGE = false
MERGE_PRIMITIVE = absent
MERGE_STATE = merge_review_required
CROSS_TENANT_CANDIDATE = denied
```

The existing schema does not safely support transactional relationship merge and rollback across every related domain. The increment therefore implements diagnostics only and does not claim automatic merge completion.

## 15. Public writer preservation

```text
PUBLIC_TENANT_AUTHORITY = Host_derived
PUBLIC_CLIENT_TENANT_AUTHORITY = false
PUBLIC_LEAD_WRITER = existing PTW-01 canonical boundary
SECOND_PUBLIC_WRITER = false
PUBLIC_ASSIGNMENT_AUTHORITY = false
```

The CRM migration does not create or grant a second public writer. The pipeline-binding trigger applies the unique explicit pipeline/stage configuration to PTW-01 inserts without accepting tenant, pipeline or stage authority from the public payload.

## 16. Cutover and compatibility

Active administrative exports now route through:

```text
src/lib/api/tenant-crm-compat.functions.ts
src/lib/api/tenant-crm.functions.ts
```

Compatibility boundaries:

```text
ADMIN_LEAD_LIST = canonical scoped server function
ADMIN_ASSIGNEE_LIST = canonical scoped server function
ADMIN_PROPERTY_LIST = tenant-scoped server read
MANUAL_LEAD_CREATE = canonical service-role primitive
LEGACY_VALUE_UPDATE = scoped aggregate read + exact-version canonical primitive
STATUS_TRANSITIONS = canonical service-role primitive
REPORTS = canonical scoped server data
PERFORMANCE_INSIGHT = deterministic server recomputation
EXTERNAL_AI_PROVIDER = removed from this boundary
```

No compatibility boundary performs direct Lead INSERT/UPDATE, reads `user_roles`, calls `has_role`, or accepts tenant/scope authority from the client.

## 17. Functional UI states

Files:

```text
src/components/pipeline/CrmOperationsPanel.tsx
src/components/pipeline/LeadDetail.tsx
```

The existing lead detail now exposes:

```text
qualification
member assignment and unassignment
task creation
open / overdue / completed / cancelled task states
task completion / cancellation / reopen
human note creation
tag selection and save
exact duplicate diagnostics
timeline events
conflict and retry states
```

Every successful state is shown only after server confirmation. OCC conflicts are surfaced and trigger a deterministic refresh path. The change does not perform PR-M3 visual redesign.

## 18. Database, RLS, grants and RPC ACL

```text
RLS_FINAL = enabled on all new CRM tables
PUBLIC_TABLE_ACCESS = revoked
ANON_TABLE_ACCESS = revoked
AUTHENTICATED_DIRECT_TABLE_ACCESS = revoked
SERVICE_ROLE_TABLE_ACCESS = allowed
PUBLIC_RPC_EXECUTE = revoked
ANON_RPC_EXECUTE = revoked
AUTHENTICATED_ADMIN_RPC_EXECUTE = revoked
SERVICE_ROLE_RPC_EXECUTE = allowed
LEGACY_AUTHENTICATED_TRANSITION_RPC = revoked
HTTP_IN_TRANSACTION = false
EXTERNAL_PROVIDER_IN_TRANSACTION = false
```

This state is proved structurally in the repository. The migration was not applied to the managed live backend in this execution.

## 19. Deterministic tests

Commands exercised by the Release Gate include:

```text
bun run test:ptc-01
bun run test:ptr-01
bun run test:psc-01
bun run test:ppr-gn-01
bun run test:ptw-01
bun run test:psg-01
bun run test:pr-m2:cms-authority
bun run test:pr-m2:dashboard-authority
bun run test:pr-m2:crm-report-authority
bun run test:pr-m2:property-admin-authority
bun run test:pr-m2:tenant-lifecycle
bun run test:pr-m2:tenant-access-control
bun run test:pr-m2:configuration-center
bun run test:pr-m2:portal-functional-completion
bun run test:pr-m2:cms-workflow-functional-completion
bun run test:pr-m2:crm-operational-workflow-functional-completion
bun run typecheck
bun run build:dev
bun run build
bun run verify:release
```

CRM workflow result:

```text
PR_M2_CRM_OPERATIONAL_WORKFLOW_SPEC_ASSERTIONS = 313
PR_M2_CRM_OPERATIONAL_WORKFLOW_SPECS = PASS
```

Release composite result:

```text
TYPECHECK_RESULT = success / exit code 0
BUILD_DEV_RESULT = success / exit code 0
BUILD_RESULT = success / exit code 0
ROUTE_GENERATION_RESULT = deterministic
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
ROUTE_TREE_SHA256 = 0dee5037df049ca88822c8830ecfdebd497351094df189036703848dc4265dd6
```

All preserved public-surface, PTW-01, LSH-01 and previous PR-M2 regressions reported `true` in the composite Release Gate output.

## 20. Code-head Release Gate

```text
CODE_HEAD = 45669c9ed30b01304499ec15be105362eca47699
RELEASE_GATE_RUN_ID = 30482620786
RELEASE_GATE_JOB_ID = 90680365230
EXPECTED_SHA = 45669c9ed30b01304499ec15be105362eca47699
CHECKED_OUT_SHA = 45669c9ed30b01304499ec15be105362eca47699
EXACT_HEAD_MATCH = true
MERGE_REF_USED = false
RESULT = success
ARTIFACT_ID = 8736411365
ARTIFACT_NAME = release-gate-45669c9ed30b01304499ec15be105362eca47699
ARTIFACT_DIGEST = sha256:9ff4db601e898b31f684d0f9b5a3c5bd2aac7a58bc3f6698e00af81ac35fe02a
ARTIFACT_EXPIRED = false
```

## 21. Final exact-head Release Gate contract

```text
FINAL_EXACT_HEAD_RELEASE_GATE = required after this evidence commit
FINAL_EXPECTED_SHA = the branch HEAD created by this evidence commit
FINAL_CHECKED_OUT_SHA = must equal FINAL_EXPECTED_SHA
FINAL_MERGE_REF_USED = false
FINAL_RESULT = must be success
FINAL_ARTIFACT = required
```

The authoritative post-evidence run, job, SHA and artifact identifiers are reported from GitHub Actions after this document is committed. They are not guessed in advance.

## 22. Limits

```text
MANAGED_LIVE_BACKEND_MIGRATION_EXECUTED = false
MANAGED_LIVE_DATA_BACKFILL_EXECUTED = false
DEPLOY_EXECUTED = false
PUBLIC_PRODUCTION_TRAFFIC_TESTED = false
EXTERNAL_PROVIDER_EXECUTED = false
ADS_PROVIDER_EXECUTED = false
WHATSAPP_PROVIDER_EXECUTED = false
EMAIL_PROVIDER_EXECUTED = false
BILLING_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
DCA01_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

## 23. Next PR-M2 increment

The accepted RPD-01 functional envelope identifies marketing and automatic lead ingestion as an outstanding PR-M2 capability after the currently completed tenant, portal, CMS and CRM foundations.

```text
NEXT_PRM2_INCREMENT = Marketing Channels, Campaign Attribution & Automatic Lead Ingestion Functional Completion
NEXT_INCREMENT_EXECUTED_IN_THIS_RUN = false
```

The next increment must preserve Host-derived tenant authority, provenance, source, campaign, ad, UTM, exact deduplication diagnostics, available-field mapping, initial history and deterministic placement in the accepted initial Kanban stage. Real provider execution remains outside this CRM increment.
