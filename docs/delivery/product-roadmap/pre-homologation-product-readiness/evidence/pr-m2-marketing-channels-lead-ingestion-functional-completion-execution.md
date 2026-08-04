# PR-M2 — Marketing Channels, Campaign Attribution & Automatic Lead Ingestion Functional Completion — Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = Marketing Channels, Campaign Attribution & Automatic Lead Ingestion Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = e3700a05435ad745e1ace3cbd819ede254b3078a
CODE_HEAD = 09889e882c329cd86d783b2e55e2b76f93e5a6ea
FINAL_HEAD = resolved by the final exact-head Release Gate metadata after this evidence commit
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

`FINAL_HEAD` is intentionally resolved from the post-evidence GitHub Actions metadata. A commit cannot truthfully contain its own not-yet-created SHA, and this evidence does not fabricate a self-reference.

## 1. Scope executed

The increment established the tenant-scoped functional foundation for:

```text
closed marketing channel registry
HYBRID operation mode
Meta Ads connector contract
Google Ads connector contract
manual lead ingestion
existing PTW-01 website-form relationship
versioned connector configuration
credential references without inline secrets
versioned closed field mappings
campaign attribution
ad-set attribution
ad attribution
UTM attribution
gclid and fbclid data capture
sanitized payload provenance
payload idempotency
replay-window signature primitive
manual CSV/XLSX preview and execution
formula rejection
row-level outcomes
exact duplicate diagnostics
canonical CRM lead creation
initial CRM history
unique default pipeline placement
ingestion ledger and attempts
retry contract
operational diagnostics
functional administrative UI
```

Real Meta Ads and Google Ads adapters were not present in the repository and were not invented.

```text
META_ADS_AUTOMATED_ADAPTER = adapter_not_implemented
GOOGLE_ADS_AUTOMATED_ADAPTER = adapter_not_implemented
META_ADS_EXTERNAL_EXECUTION = false
GOOGLE_ADS_EXTERNAL_EXECUTION = false
FAKE_PROVIDER_SUCCESS = false
```

## 2. Execution delta before evidence

```text
COMMITS_CREATED_BEFORE_EVIDENCE = 17
FILES_CHANGED_BEFORE_EVIDENCE = 11
MIGRATIONS_CREATED = 1
DEPENDENCY_VERSION_CHANGES = 0
BUN_LOCK_CHANGED = false
```

Files changed before this evidence commit:

```text
package.json
run-pr-m2-marketing-channels-lead-ingestion-functional-completion-specs.ts
scripts/verify-release.mjs
src/components/workspace/contexts.ts
src/lib/api/tenant-marketing-authority.server.ts
src/lib/api/tenant-marketing.functions.ts
src/lib/marketing/marketing-channel-registry.ts
src/lib/marketing/marketing-ingestion.server.ts
src/lib/marketing/marketing-provider-ingestion.server.ts
src/routes/_authenticated.admin.marketing.tsx
supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql
```

Ancestry comparison:

```text
BASE = e3700a05435ad745e1ace3cbd819ede254b3078a
HEAD = 09889e882c329cd86d783b2e55e2b76f93e5a6ea
STATUS = ahead
AHEAD_BY = 17
BEHIND_BY = 0
```

## 3. Marketing model before

The direct repository audit confirmed the following reusable foundations:

```text
FORM_SUBMISSIONS_UTM = present
FORM_SUBMISSIONS_GCLID = present
FORM_SUBMISSIONS_FBCLID = present
FORM_SUBMISSIONS_PAGE_AND_REFERRER = present
LEADS_ORIGINAL_ATTRIBUTION = present
LEADS_LATEST_ATTRIBUTION = present
LEADS_NORMALIZED_EMAIL = present
LEADS_NORMALIZED_PHONE = present
CRM_IDEMPOTENCY = present
CRM_UNIQUE_DEFAULT_PIPELINE = present
CRM_STATUS_STAGE_BINDING = present
PTW01_PUBLIC_WRITER = present
AUDIT_LOG = present
```

The audit also confirmed the functional gaps:

```text
CLOSED_MARKETING_CHANNEL_REGISTRY = absent
TENANT_MARKETING_CONNECTOR_MODEL = absent
META_ADS_ADAPTER = absent
GOOGLE_ADS_ADAPTER = absent
CREDENTIAL_REFERENCE_BOUNDARY = absent
VERSIONED_MARKETING_MAPPING = absent
INGESTION_PROVENANCE_LEDGER = absent
MARKETING_PAYLOAD_IDEMPOTENCY = absent
MANUAL_IMPORT_JOB_MODEL = absent
MANUAL_IMPORT_ROW_MODEL = absent
AUTOMATIC_PROVIDER_TENANT_MAPPING = absent
PROVIDER_SIGNATURE_RUNTIME = absent
MARKETING_DIAGNOSTICS = absent
MARKETING_OPERATIONS_UI = absent
```

`cms_campaigns` remained a CMS/public-site campaign content model. It was not reclassified as an advertising-provider connector or attribution authority.

## 4. Channel registry after

File:

```text
src/lib/marketing/marketing-channel-registry.ts
```

Closed channel keys:

```text
META_ADS
GOOGLE_ADS
MANUAL_IMPORT
WEBSITE_FORM
```

Operation model:

```text
CHANNEL_OPERATION_MODE = HYBRID
MANUAL_MODE = supported through implemented import workflow
AUTOMATED_MODE = available only when the adapter is factual and ready
NO_FAKE_SUCCESS = true
```

Factual availability:

```text
META_ADS = adapter_not_implemented
GOOGLE_ADS = adapter_not_implemented
MANUAL_IMPORT = manual_ready
WEBSITE_FORM = automated_ready through existing PTW-01 public writer
```

Each registry entry declares:

```text
channel key
provider key
display name
operation mode
schema version
manual methods
automated methods
credential contract
signature contract
replay contract
payload ID contract
campaign/ad-set/ad contracts
UTM contract
field mapping contract
deduplication contract
lead writer contract
initial history contract
pipeline contract
diagnostics contract
availability state
rollback contract
```

Unknown channels, operation modes and schema versions fail closed.

## 5. Connector and tenant authority

Tables:

```text
tenant_marketing_connectors
tenant_marketing_connector_versions
```

Connector contract:

```text
tenant_id
channel_key
provider_account_reference
provider_form_reference
credential_reference
credential_version
credential_state
configuration_version
mapping_version
verification_state
availability_state
active
row_version
last_rotated_at
last_verified_at
last_error_code
```

Tenant resolution rules:

```text
ADMINISTRATIVE_TENANT = requireTenant trusted server context
AUTOMATIC_TENANT = server-owned connector ID mapping
BODY_TENANT_AUTHORITY = false
QUERY_TENANT_AUTHORITY = false
PROVIDER_PAYLOAD_TENANT_AUTHORITY = false
CAMPAIGN_NAME_TENANT_AUTHORITY = false
FIRST_CONNECTOR_AUTHORITY = false
TENANT_DEFAULT = false
ORDER_BY_LIMIT_1_AUTHORITY = false
```

Connector cardinality is explicit. Missing or ambiguous trusted mapping aborts rather than choosing a fallback.

## 6. Tenant Access Control

Files:

```text
src/lib/api/tenant-marketing-authority.server.ts
src/lib/api/tenant-marketing.functions.ts
```

Authority chain:

```text
requireTenant
+ requireTenantScopedAuthority
+ resolveEffectiveTenantPermission
+ accepted CRM commercial-lead module
+ requested action
+ global effective scope
```

```text
SERVER_IS_SOLE_TENANT_AUTHORITY = true
CLIENT_TENANT_AUTHORITY = false
CLIENT_ACTOR_AUTHORITY = false
CLIENT_ROLE_AUTHORITY = false
CLIENT_SCOPE_AUTHORITY = false
SUPER_ADMIN_IMPERSONATION_REQUIRED = true
HAS_ROLE_TENANT_AUTHORITY = false
USER_ROLES_TENANT_AUTHORITY = false
```

Configuration, credential-reference changes, mappings, imports, retries and diagnostics require a server-derived global scope. Owner root authority and explicit Super Admin impersonation continue through the accepted Tenant Access Control boundary.

## 7. Credential and signature contracts

```text
PLAINTEXT_PROVIDER_SECRET = prohibited
CREDENTIAL_STORAGE = reference only
CREDENTIAL_REFERENCE_FORMAT = credential://...
CREDENTIAL_VERSIONING = explicit
CREDENTIAL_ROTATION_AUDIT = explicit
SECRET_IN_DTO = false
SECRET_IN_DIAGNOSTICS = false
SECRET_IN_LOG = false
```

Files:

```text
src/lib/marketing/marketing-ingestion.server.ts
src/lib/marketing/marketing-provider-ingestion.server.ts
```

The repository now contains a generic server-only HMAC SHA-256 verification primitive with timestamp skew enforcement and constant-time comparison. It is not represented as the official Meta or Google verification algorithm.

```text
META_PROVIDER_SIGNATURE_ADAPTER = adapter_not_implemented
GOOGLE_PROVIDER_SIGNATURE_ADAPTER = adapter_not_implemented
GENERIC_SIGNATURE_FIXTURE_TESTED = true
INVALID_SIGNATURE = denied
EXPIRED_SIGNATURE = denied
```

The provider boundary is isolated in a `.server.ts` module so `node:crypto` and spreadsheet parsing do not enter the browser bundle.

## 8. Versioned closed field mapping

Table:

```text
tenant_marketing_field_mappings
```

Supported targets:

```text
name
email
phone
message
property_reference
source
campaign_id
campaign_name
adset_id
adset_name
ad_id
ad_name
utm_source
utm_medium
utm_campaign
utm_content
utm_term
gclid
fbclid
landing_url
referrer
provider_payload_id
```

Forbidden authority targets include:

```text
tenant
actor
assignment
pipeline
stage
```

The mapping is validated both by strict application schemas and by the service-role SQL primitive. Unknown mapping keys and malformed source paths are rejected. Each connector has one current mapping and an immutable version history.

## 9. Provenance and idempotency

Tables:

```text
tenant_marketing_ingestion_events
tenant_marketing_ingestion_attempts
```

Ledger fields include:

```text
tenant
connector
channel
provider payload ID
provider account/form references
campaign
ad set
ad
payload schema version
mapping version
payload hash
sanitized payload
received and verified timestamps
ingestion state
lead
duplicate candidates
error code
retry count and state
row version
```

Closed ingestion states:

```text
received
verification_failed
verified
mapping_failed
normalized
duplicate_detected
lead_created
lead_linked
rejected
retryable_failed
terminal_failed
```

Idempotency contract:

```text
KEY = connector + provider payload ID
SAME_KEY_SAME_HASH = stored deterministic result
SAME_KEY_DIFFERENT_HASH = marketing_payload_idempotency_conflict
PAYLOAD_WITHOUT_PROVIDER_ID = deterministic SHA-256 ID
CONCURRENT_SAME_KEY = serialized with pg_advisory_xact_lock
```

Attempts are append-only. UPDATE and DELETE are rejected by trigger.

## 10. Manual import workflow

Tables:

```text
tenant_marketing_manual_imports
tenant_marketing_manual_import_rows
```

Supported formats:

```text
CSV
XLSX
MANUAL_ROW
```

Workflow:

```text
client-selected file or manual content
→ server-side bounded parse
→ spreadsheet formula rejection
→ closed mapping
→ normalized preview
→ explicit validation result
→ persisted preview_ready job
→ transactional row processing
→ exact duplicate diagnostics
→ canonical CRM lead creation
→ row-level state
→ explicit completed / partial_success / failed result
```

Limits and safety:

```text
MAX_FILE_SIZE = 6 MB server parser limit
MAX_ROWS = 5000
MAX_COLUMNS = 64
FORMULA_EXECUTION = false
UNKNOWN_FIELD_FABRICATION = false
SILENT_PARTIAL_SUCCESS = false
FILE_BUCKET_PATH_AUTHORITY = not applicable; file is not persisted to client-selected storage
```

The source file itself is not persisted. Therefore no client bucket, path or filename becomes storage authority.

## 11. Canonical CRM insertion

The import primitive uses:

```text
public.create_tenant_crm_lead
```

Flow:

```text
server-authorized import
→ current connector and mapping
→ exact normalized duplicate lookup
→ tenant-scoped property resolution when declared
→ canonical CRM lead creation
→ original/latest attribution persistence
→ CRM lead version increment
→ source_corrected initial attribution event
→ ingestion ledger
→ audit log
```

Provider or import payloads cannot select:

```text
tenant
actor
assignee
team
pipeline
stage
```

The existing CRM trigger binds new leads to the unique explicit default pipeline and the stage matching the initial canonical status. Ambiguous pipeline or stage cardinality remains fail-closed.

## 12. Attribution model

```text
ORIGINAL_ATTRIBUTION = immutable initial marketing projection
LATEST_ATTRIBUTION = separate audited current projection
CAMPAIGN_ID_AND_NAME = data only
ADSET_ID_AND_NAME = data only
AD_ID_AND_NAME = data only
UTM = data only
GCLID = data only
FBCLID = data only
LANDING_URL = data only
REFERRER = data only
ATTRIBUTION_AUTHORIZATION = false
```

The initial attribution write increments the lead OCC version and emits a CRM history event in the same transaction as the ingestion result.

## 13. Deduplication model

```text
NORMALIZED_EMAIL = exact deterministic comparison
NORMALIZED_PHONE = exact deterministic comparison
CROSS_TENANT_CANDIDATE = denied
FUZZY_MATCH_AUTHORITY = false
AUTOMATIC_MERGE = false
MERGE_PRIMITIVE = absent
DUPLICATE_RESULT = duplicate_detected + candidate IDs + explicit review required
```

No lead relationship is silently merged or reassigned.

## 14. Database tenant integrity

Migration:

```text
supabase/migrations/20260729233000_pr_m2_marketing_channels_lead_ingestion.sql
```

The migration is additive and includes composite tenant foreign keys for:

```text
connector versions → connector + tenant
mappings → connector + tenant
ingestion events → connector + tenant
ingestion attempts → event + tenant
manual imports → connector/mapping + tenant
manual import rows → import/lead/event + tenant
```

The SQL runtime also enforces:

```text
extensions.digest = explicitly qualified
service-role mapping keys = closed
service-role prepared row shape = closed
property resolution cardinality = exactly one or abort
lead attribution update = OCC version increment
CRM attribution history = atomic
```

## 15. RLS, grants and RPC ACL

```text
RLS_FINAL = enabled on all seven marketing tables
PUBLIC_TABLE_ACCESS = revoked
ANON_TABLE_ACCESS = revoked
AUTHENTICATED_DIRECT_TABLE_ACCESS = revoked
SERVICE_ROLE_TABLE_ACCESS = allowed
PUBLIC_RPC_EXECUTE = revoked
ANON_RPC_EXECUTE = revoked
AUTHENTICATED_RPC_EXECUTE = revoked
SERVICE_ROLE_RPC_EXECUTE = allowed
HTTP_IN_TRANSACTION = false
NETWORK_EXTENSION_IN_TRANSACTION = false
```

These are repository and deterministic-test proofs. The migration was not applied to the managed backend in this execution.

## 16. Server functions

Administrative wrappers:

```text
listTenantMarketingChannels
listTenantMarketingConnectors
getTenantMarketingConnector
saveTenantMarketingConnectorDraft
publishTenantMarketingConnectorConfiguration
setTenantMarketingCredentialReference
listTenantMarketingMappings
saveTenantMarketingMapping
validateTenantMarketingMapping
previewTenantMarketingManualImport
createTenantMarketingManualImport
executeTenantMarketingManualImport
listTenantMarketingManualImports
getTenantMarketingManualImport
listTenantMarketingIngestionEvents
getTenantMarketingIngestionEvent
retryTenantMarketingIngestion
getTenantMarketingDiagnostics
```

Internal future-provider boundary:

```text
receiveMarketingProviderPayload
verifyMarketingProviderPayload
ingestVerifiedMarketingLead
```

The internal boundary is not exposed by a public route and remains fail-closed until factual provider adapters exist.

## 17. Functional UI

Files:

```text
src/routes/_authenticated.admin.marketing.tsx
src/components/workspace/contexts.ts
```

The Marketing operations center exposes:

```text
channel catalog
connector configuration
HYBRID mode
credential reference state
verification state
mapping editor
manual import preview
row validation
import jobs
partial success
created leads
duplicate rows
failed rows
ingestion ledger
retry availability
diagnostics
```

The route is placed under the existing `Distribuição` workspace context. The seven-context product invariant is preserved; no eighth area was introduced.

No PR-M3 visual redesign was executed.

## 18. PTW-01 preservation

```text
PUBLIC_FORM_WRITER = existing PTW-01 only
SECOND_PUBLIC_WRITER = false
WEBSITE_FORM_TENANT_AUTHORITY = host derived
MARKETING_BODY_TENANT_AUTHORITY = false
MARKETING_QUERY_TENANT_AUTHORITY = false
```

The marketing migration does not create or grant a second public lead writer. Website forms remain governed by the accepted PTW-01 boundary.

## 19. Deterministic tests

Commands exercised by the Release Gate include all public-surface, PTW-01, LSH-01 and previous PR-M2 regressions plus:

```text
bun run test:pr-m2:marketing-channels-lead-ingestion-functional-completion
bun run typecheck
bun run build:dev
bun run build
bun run verify:release
```

Factual result:

```text
PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPEC_ASSERTIONS = 237
PR_M2_MARKETING_CHANNELS_LEAD_INGESTION_SPECS = PASS
TYPECHECK_RESULT = success / exit code 0
BUILD_DEV_RESULT = success / exit code 0
BUILD_RESULT = success / exit code 0
ROUTE_GENERATION_RESULT = deterministic
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
ROUTE_TREE_SHA256 = 5dd67f1825f9f3f33f67133251c16829268d45a464303550a0d7297cc4070d16
PREVIOUS_PUBLIC_AND_PRM2_REGRESSIONS = passed
LSH01_REGRESSIONS = passed
PTW01_REGRESSIONS = passed
```

## 20. Code-head Release Gate

```text
CODE_HEAD = 09889e882c329cd86d783b2e55e2b76f93e5a6ea
RELEASE_GATE_RUN_ID = 30488501266
RELEASE_GATE_JOB_ID = 90700149441
EXPECTED_SHA = 09889e882c329cd86d783b2e55e2b76f93e5a6ea
CHECKED_OUT_SHA = 09889e882c329cd86d783b2e55e2b76f93e5a6ea
EXACT_HEAD_MATCH = true
MERGE_REF_USED = false
RESULT = success
ARTIFACT_ID = 8738750333
ARTIFACT_NAME = release-gate-09889e882c329cd86d783b2e55e2b76f93e5a6ea
ARTIFACT_DIGEST = sha256:dd9427983dadbaaee1b4221dae1befe8b9a44249b031936e7b77e852110d0a29
ARTIFACT_EXPIRED = false
```

Earlier successful code-head `31d7c2042e8585ccbf82a7796515e3813b744115` was superseded by the direct SQL hardening review. The authoritative code-head evidence is the later successful run above.

## 21. Final exact-head Release Gate contract

```text
FINAL_EXACT_HEAD_RELEASE_GATE = required after this evidence commit
FINAL_EXPECTED_SHA = branch HEAD created by this evidence commit
FINAL_CHECKED_OUT_SHA = must equal FINAL_EXPECTED_SHA
FINAL_MERGE_REF_USED = false
FINAL_RESULT = must be success
FINAL_ARTIFACT = required
PR_AFTER_GATE = open / draft / not merged
```

The authoritative final run, job, SHA and artifact identifiers are read from GitHub Actions after this document is committed. They are not guessed in advance.

## 22. Proof boundaries

```text
PROVED_BY_REPOSITORY = schema, registries, server boundaries, UI, RLS/grants and absence of provider calls
PROVED_BY_DETERMINISTIC_TEST = closed contracts, strict inputs, hashing, signature fixture, parsing, mapping, attribution and structural invariants
PROVED_BY_GITHUB_ACTIONS = exact checkout, regressions, typecheck, builds, route generation and artifact
NOT_EXECUTED_AGAINST_MANAGED_LIVE_BACKEND = true
NOT_EXECUTED_AGAINST_EXTERNAL_PROVIDER = true
NOT_EXECUTED_AGAINST_PUBLIC_PRODUCTION_TRAFFIC = true
```

## 23. Execution limits

```text
MANAGED_LIVE_BACKEND_MIGRATION_EXECUTED = false
MANAGED_LIVE_DATA_BACKFILL_EXECUTED = false
DEPLOY_EXECUTED = false
PUBLIC_PRODUCTION_TRAFFIC_TESTED = false
META_PROVIDER_EXECUTED = false
GOOGLE_PROVIDER_EXECUTED = false
EXTERNAL_PROVIDER_EXECUTED = false
WHATSAPP_PROVIDER_EXECUTED = false
EMAIL_PROVIDER_EXECUTED = false
BILLING_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
DCA01_STARTED = false
BCA01_STARTED = false
PRM3_STARTED = false
```

## 24. Next PR-M2 increment

The accepted RPD-01 inventory requires Meta Pixel and preserves Google Analytics and Google Tag Manager as extensible tracking capabilities. The current increment completed lead-channel ingestion and attribution but did not implement client tracking, conversion-event governance or tag delivery.

```text
NEXT_PRM2_INCREMENT = Analytics, Tracking, Conversion Events & Tag Governance Functional Completion
NEXT_INCREMENT_EXECUTED_IN_THIS_RUN = false
```

The next increment must first audit the real public/runtime rendering path, consent state, CSP/security boundary, tenant settings, canonical event taxonomy and current analytics scripts. It must not inject arbitrary tenant JavaScript, trust client tenant identity or report external delivery without a factual adapter and deterministic evidence.
