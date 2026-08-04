# PR-M2 — CRM Operational Workflow — Canonical Evidence

## Status

```text
CANONICAL_EVIDENCE_STATE = Current
HISTORICAL_EVIDENCE_AUTHORITY = superseded
STAGE = PR-M2 — Functional Completion
INCREMENT = CRM Operational Workflow Functional Completion
CORRECTIVE_START_HEAD = be09b190996f512650331206898247a53004c8f8
CODE_HEAD = bound by the consolidated corrective exact-head Release Gate
EXECUTION_MODEL = ChatGPT GitHub-native
```

## Current functional scope

```text
CONTACT_MODEL = materialized
CALENDAR_MODEL = materialized
VISIT_MODEL = materialized
PROPOSAL_MODEL = materialized
ATTACHMENT_MODEL = materialized with uploadTargetId authority
ATTACHMENT_CONSUMER = atomic service-role-only SQL RPC
ATTACHMENT_LIST = tenant and lead scoped
ATTACHMENT_DOWNLOAD = signed from persisted durable path
ATTACHMENT_DELETE = attachment-id-only server boundary
ATTACHMENT_UI = CrmOperationsPanel
AUTOMATION_RULES = closed registry
COMMUNICATION_JOBS = fail-closed adapter state
SLA_POLICIES = materialized
ALERTS = materialized
MANUAL_IMPORT = idempotent and row-accounted
DETERMINISTIC_EXPORT = CSV / JSON with SHA-256
CONTACT_AUTOMATIC_MERGE = false
TENANT_AUTHORITY = canonical CRM server boundary
```

Current code and SQL:

- `src/lib/crm/crm-registry.ts`;
- `src/lib/crm/crm-functional-registry.ts`;
- `src/lib/api/tenant-crm-authority.server.ts`;
- `src/lib/api/tenant-crm-functional.functions.ts`;
- `src/routes/_authenticated.admin.crm-operacoes.tsx`;
- `src/components/pipeline/CrmOperationsPanel.tsx`;
- `supabase/migrations/20260729211500_pr_m2_crm_operational_workflow.sql`;
- `supabase/migrations/20260730043000_pr_m2_consolidated_final_corrective.sql`;
- `supabase/migrations/20260803183000_pr_m2_storage_provenance_and_crm_attachment_corrective.sql`.

The existing pipeline/OCC/idempotency/timeline authority is preserved. Communication jobs never claim delivery while an external adapter is absent.

## Verification

```text
TEST_COMMAND = bun run test:pr-m2:crm-operational-workflow-functional-completion
REPORT_TEST = bun run test:pr-m2:crm-report-authority
CONSOLIDATED_TEST = bun run test:pr-m2:consolidated-final-corrective
PROOF_BOUNDARY = repository + deterministic workflow/OCC/idempotency tests
```

## External limits

```text
MANAGED_MIGRATION_EXECUTED = false
EXTERNAL_EMAIL_EXECUTED = false
EXTERNAL_WHATSAPP_EXECUTED = false
EXTERNAL_SMS_EXECUTED = false
LIVE_SLA_JOB_EXECUTED = false
DEPLOY_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## Blocking correction verification contract

```text
CRM_ATTACHMENT_TARGET_ID_ONLY = true
CRM_ATTACHMENT_RAW_PATH_INPUT = false
CRM_ATTACHMENT_OBJECT_EXISTENCE_REQUIRED = true
CRM_ATTACHMENT_REPLAY_DENIED = true
CRM_ATTACHMENT_SERVICE_ROLE_ONLY = true
BF03_RESOLVED = true
EXACT_HEAD_GATE = required before audit rerun
```
