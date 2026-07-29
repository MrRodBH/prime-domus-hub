# PR-M2 — CRM Operational Workflow Functional Completion — Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = CRM Operational Workflow Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = 05429293174dcdafc6967396caaedb26217ebb8c
CODE_HEAD = 45669c9ed30b01304499ec15be105362eca47699
FINAL_HEAD = resolved by the final exact-head Release Gate metadata after this evidence correction commit
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

`FINAL_HEAD` is intentionally resolved from post-commit GitHub Actions metadata because a commit cannot contain its own SHA without creating a second SHA.

## 1. Execution delta

```text
COMMITS_CREATED_BEFORE_EVIDENCE = 23
FILES_CHANGED_BEFORE_EVIDENCE = 14
MIGRATIONS_CREATED = 1
DEPENDENCY_VERSION_CHANGES = 0
BUN_LOCK_CHANGED = false
```

Files changed before evidence:

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

```text
ANCESTRY_BASE = 05429293174dcdafc6967396caaedb26217ebb8c
ANCESTRY_HEAD = 45669c9ed30b01304499ec15be105362eca47699
ANCESTRY_STATUS = ahead
AHEAD_BY = 23
BEHIND_BY = 0
```

## 2. CRM model before and after

```text
CRM_MODEL_BEFORE =
lead table + seven statuses + version + legacy histories + reason catalogs + teams + PTW-01;
without canonical CRM module, TAC scopes, pipelines, tasks, canonical timeline, tags,
idempotency ledger, aggregate, duplicate diagnostics or operational panel

CRM_MODEL_AFTER =
server-only tenant CRM authority + closed registries + unique default pipeline + stages
+ global/team/own scopes + OCC + idempotency + assignment + tasks + append-only timeline
+ notes + tags + attribution + terminal transitions + duplicate diagnostics + functional UI
```

```text
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
CONTACT_MODEL = absent / not invented
OPPORTUNITY_MODEL = absent / not invented
```

## 3. Registries and lifecycle

```text
CRM_SCHEMA_VERSION = 1
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

Statuses:

```text
novo
conversando
visita
proposta
ganho
perdido
descartado
```

Transitions:

```text
novo → conversando / descartado
conversando → visita / proposta / descartado
visita → conversando / proposta / descartado
proposta → conversando / ganho / perdido
perdido → novo
descartado → novo
```

```text
WON_MODEL = terminal close from proposta; gerenciar permission required
LOST_MODEL = terminal close from proposta; active tenant loss reason required
ARCHIVE_MODEL = explicit discarded transition; active tenant discard reason required
REOPEN_MODEL = explicit transition to novo; bounded note required
UNKNOWN_STATUS = fail_closed
UNKNOWN_TRANSITION = fail_closed
TERMINAL_DIRECT_EDIT = denied
STATUS_STAGE_HISTORY_AUDIT = atomic
```

## 4. Pipeline, scopes and aggregate

```text
PIPELINE_TABLE = crm_pipelines
STAGE_TABLE = crm_pipeline_stages
DEFAULT_PIPELINE_KEY = sales_default
DEFAULT_PIPELINE_CARDINALITY = exactly 1 active default per tenant
DEFAULT_STAGE_CARDINALITY = exactly 1 active stage per canonical status
AMBIGUOUS_PIPELINE_OR_STAGE = abort
PIPELINE_ID_NOT_NULL = true after deterministic backfill
STAGE_ID_NOT_NULL = true after deterministic backfill
PTW01_PIPELINE_BINDING = deterministic BEFORE INSERT trigger
FIRST_ROW_AUTHORITY = false
DEFAULT_PIPELINE_DEACTIVATION = denied
PIPELINE_WITH_ACTIVE_LEADS_DEACTIVATION = denied
```

Authority chain:

```text
requireTenant trusted context
+ requireTenantScopedAuthority
+ resolveEffectiveTenantPermission
+ module crm
+ action
+ effective scope
+ assignment/team relationship
```

```text
GLOBAL_SCOPE = all authorized CRM resources in tenant
TEAM_SCOPE = actor-assigned, active shared-team-member-assigned, or actor-team-assigned leads
OWN_SCOPE = leads assigned explicitly to actor
MEMBER_TARGET_GLOBAL = active tenant membership required
MEMBER_TARGET_TEAM = active membership + shared active team required
MEMBER_TARGET_OWN = actor only
TEAM_TARGET_GLOBAL = active tenant team required
TEAM_TARGET_TEAM = actor membership in target active team required
TEAM_TARGET_OWN = denied
```

```text
LEAD_AGGREGATE = lead + pipeline + stage + tasks + tags + activities + rowVersion
LEAD_OCC = leads.version
TASK_OCC = crm_lead_tasks.row_version
PIPELINE_OCC = crm_pipelines.row_version
STALE_VERSION = crm_version_conflict
SILENT_OVERWRITE = false
RESOURCE_LOCK = SELECT FOR UPDATE
```

## 5. Assignment, tasks, timeline, tags and attribution

```text
ASSIGNMENT_STRATEGIES = manual_member / manual_team / unassigned
ACTIVE_MEMBERSHIP_REQUIRED = true
ACTIVE_TEAM_REQUIRED = true
FALLBACK_OWNER = false
FIRST_MEMBER_FALLBACK = false
ROUND_ROBIN_HEURISTIC = absent
FROM_ASSIGNMENT_CAPTURED_BEFORE_MUTATION = true
ASSIGNMENT_HISTORY = append_only
ASSIGNMENT_AUDIT = atomic
```

```text
TASK_TABLE = crm_lead_tasks
TASK_TYPES = follow_up / call / meeting / visit / proposal_review / other
TASK_STATES = open / in_progress / completed / cancelled
TASK_PARENT_SCOPE_ASSIGNEE_REVALIDATED = true
TASK_REOPEN_REASON_REQUIRED = true
EXTERNAL_NOTIFICATION_PROVIDER = false
```

```text
TIMELINE_TABLE = crm_lead_events
ASSIGNMENT_HISTORY_TABLE = crm_lead_assignments
SYSTEM_EVENTS_APPEND_ONLY = true
HUMAN_NOTES_DISTINCT = true
CLIENT_SYSTEM_EVENT_AUTHORITY = false
NOTE_BOUNDED_AND_SANITIZED = true
TAG_CATALOG = crm_tags
LEAD_TAG_RELATIONSHIP = crm_lead_tags
TAG_TENANT_OWNERSHIP = required
TAG_DUPLICATION = denied
UNKNOWN_TAG_IMPLICIT_CREATION = denied
TAG_CATALOG_MANAGEMENT = global scope only
LEAD_TAG_SET = atomic + OCC + audit
ORIGINAL_ATTRIBUTION = preserved
LATEST_ATTRIBUTION = separate audited projection
MANUAL_SOURCE_CORRECTION = explicit server operation
UTM_GCLID_FBCLID_REFERRER_AUTHORITY = false
```

## 6. Idempotency and duplicate diagnostics

```text
IDEMPOTENCY_LEDGER = crm_idempotency
IDEMPOTENCY_SCOPE = tenant + actor + key
SAME_KEY_SAME_PAYLOAD = stored response
SAME_KEY_DIFFERENT_PAYLOAD = crm_idempotency_conflict
CONCURRENT_SAME_KEY = pg_advisory_xact_lock
NORMALIZED_EMAIL = deterministic lower/trim
NORMALIZED_PHONE = deterministic numeric normalization
DUPLICATE_CANDIDATE_MATCH = exact email or exact phone
FUZZY_MATCH_AUTHORITY = false
AUTOMATIC_MERGE = false
MERGE_PRIMITIVE = absent
MERGE_STATE = merge_review_required
CROSS_TENANT_CANDIDATE = denied
```

The repository does not support a safe transactional relationship merge and rollback across every related domain. The increment therefore implements diagnostics only.

## 7. PTW-01, cutover and UI

```text
PUBLIC_TENANT_AUTHORITY = Host_derived
PUBLIC_CLIENT_TENANT_AUTHORITY = false
PUBLIC_LEAD_WRITER = existing PTW-01 canonical boundary
SECOND_PUBLIC_WRITER = false
PUBLIC_ASSIGNMENT_AUTHORITY = false
PTW01_INITIAL_PIPELINE = unique explicit default pipeline
PTW01_INITIAL_STAGE = unique status-matching stage
PTW01_AMBIGUITY = abort
```

```text
ACTIVE_ADMIN_LIST = canonical scoped server function
ACTIVE_ASSIGNEE_LIST = canonical scoped server function
ACTIVE_PROPERTY_LIST = tenant-scoped server read
MANUAL_LEAD_CREATE = canonical service-role primitive
LEGACY_VALUE_UPDATE = scoped aggregate read + exact-version primitive
STATUS_TRANSITIONS = canonical service-role primitive
REPORTS = canonical scoped server data
PERFORMANCE_INSIGHT = deterministic server recomputation
EXTERNAL_AI_PROVIDER = removed
DIRECT_CLIENT_LEAD_MUTATION = false
ROLE_BASED_TENANT_AUTHORITY = removed
PARALLEL_CRM_RUNTIME = removed
```

Functional UI in `CrmOperationsPanel.tsx` and `LeadDetail.tsx` exposes qualification, assignment, task creation and transitions, notes, tags, duplicate diagnostics, timeline, conflict and retry states. Success is shown only after server confirmation. PR-M3 visual redesign was not executed.

## 8. RLS, grants and RPC ACL

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

These are repository and deterministic-test proofs. The migration was not applied to the managed live backend.

## 9. Tests and build

Release Gate commands include all public-surface, PTW-01, LSH-01 and previous PR-M2 regressions plus:

```text
bun run test:pr-m2:crm-report-authority
bun run test:pr-m2:crm-operational-workflow-functional-completion
bun run typecheck
bun run build:dev
bun run build
bun run verify:release
```

Factual result confirmed independently by code-head and post-evidence exact-head runs:

```text
PR_M2_CRM_OPERATIONAL_WORKFLOW_SPEC_ASSERTIONS = 386
PR_M2_CRM_OPERATIONAL_WORKFLOW_SPECS = PASS
TYPECHECK_RESULT = success / exit code 0
BUILD_DEV_RESULT = success / exit code 0
BUILD_RESULT = success / exit code 0
ROUTE_GENERATION_RESULT = deterministic
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
ROUTE_TREE_SHA256 = 0dee5037df049ca88822c8830ecfdebd497351094df189036703848dc4265dd6
PREVIOUS_PUBLIC_AND_PRM2_REGRESSIONS = passed
LSH01_REGRESSIONS = passed
PTW01_REGRESSIONS = passed
```

## 10. Code-head Release Gate

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

The first post-evidence gate on `aa4f07354c69b5fe2ddcf4f426e19efbeaf9b744` also passed and confirmed 386 assertions. It is superseded only because this factual evidence correction creates a new documentation HEAD requiring another exact-head gate.

## 11. Final exact-head gate contract

```text
FINAL_EXACT_HEAD_RELEASE_GATE = required after this evidence correction commit
FINAL_EXPECTED_SHA = evidence-correction branch HEAD
FINAL_CHECKED_OUT_SHA = must equal FINAL_EXPECTED_SHA
FINAL_MERGE_REF_USED = false
FINAL_RESULT = must be success
FINAL_ARTIFACT = required
PR_AFTER_GATE = open / draft / not merged
```

## 12. Limits

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

## 13. Next PR-M2 increment

```text
NEXT_PRM2_INCREMENT = Marketing Channels, Campaign Attribution & Automatic Lead Ingestion Functional Completion
NEXT_INCREMENT_EXECUTED_IN_THIS_RUN = false
```

The accepted RPD-01 envelope requires the next increment to preserve trusted tenant authority, provenance, source, campaign, ad, UTM, payload ID, deduplication/idempotency, available-field mapping, initial history and deterministic placement in the accepted initial Kanban stage. No real provider execution occurred in this CRM increment.
