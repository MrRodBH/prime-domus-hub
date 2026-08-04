# PR-M2 — Analytics, Tracking & Conversion Events Functional Completion — Execution Evidence

## Status

```text
STAGE = PR-M2 — Functional Completion
INCREMENT = Analytics, Tracking & Conversion Events Functional Completion
EXECUTION_MODEL = ChatGPT GitHub-native
INITIAL_HEAD = 1e8917e1f0858da7ec1f9aa1cc5e7ff425a6b444
CODE_HEAD = 5161fa9eedc5144f9e7cc4ab113afe9555a2076d
FINAL_HEAD = resolved by the final exact-head Release Gate metadata after this evidence commit
PULL_REQUEST = 60
PR_STATE = open / draft
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
LOVABLE_EXECUTED = false
```

`FINAL_HEAD` is intentionally resolved from the post-evidence GitHub Actions metadata. A commit cannot truthfully contain its own not-yet-created SHA, and this evidence does not fabricate a self-reference.

## 1. Scope executed

The increment established one tenant-scoped analytics and tracking authority for:

```text
closed provider registry
closed event registry
versioned provider configuration
versioned event bindings
versioned consent configuration
Host-derived public snapshot
consent-aware browser runtime
SPA navigation tracking
Meta Pixel browser adapter
Google Analytics 4 browser adapter
Google Tag Manager governance boundary
sanitized diagnostics
strict Content Security Policy origins
legacy Meta and Configuration Center cutover
functional administrative UI
exact-head deterministic Release Gate coverage
```

No arbitrary tenant JavaScript, HTML, endpoint, module path or provider source URL is accepted.

## 2. Execution delta before evidence

```text
COMMITS_CREATED_BEFORE_EVIDENCE = 25
FILES_CHANGED_BEFORE_EVIDENCE = 16
MIGRATIONS_CREATED = 1
DEPENDENCY_VERSION_CHANGES = 0
BUN_LOCK_CHANGED = false
MANAGED_MIGRATION_APPLIED = false
DEPLOY_EXECUTED = false
EXTERNAL_PROVIDER_LIVE_VERIFICATION = false
```

Ancestry comparison:

```text
BASE = 1e8917e1f0858da7ec1f9aa1cc5e7ff425a6b444
HEAD = 5161fa9eedc5144f9e7cc4ab113afe9555a2076d
STATUS = ahead
AHEAD_BY = 25
BEHIND_BY = 0
```

Files changed before this evidence commit:

```text
package.json
run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts
scripts/verify-release.mjs
src/components/site/PublicTrackingRuntime.tsx
src/components/workspace/contexts.ts
src/lib/api/meta.functions.ts
src/lib/api/tenant-tracking-authority.server.ts
src/lib/api/tenant-tracking.functions.ts
src/lib/tracking/public-tracking-runtime.ts
src/lib/tracking/tracking-consent.ts
src/lib/tracking/tracking-contracts.ts
src/lib/tracking/tracking-registry.ts
src/routes/__root.tsx
src/routes/_authenticated.admin.tracking.tsx
src/server.ts
supabase/migrations/20260730010000_pr_m2_analytics_tracking_conversion_events.sql
```

## 3. Pre-implementation findings

Direct repository inspection confirmed two parallel public tracking paths:

```text
hardcoded Google Analytics identifier in the public root
inline Meta Pixel bootstrap in the public root
```

The legacy Meta server function also retained:

```text
legacy site_settings configuration
inline conversions API token storage
real graph.facebook.com CAPI request
success-shaped external response
```

These paths were not accepted as a canonical tenant-scoped runtime because they bypassed one closed provider registry, explicit consent, versioned bindings and deterministic fail-closed governance.

## 4. Closed provider registry

File:

```text
src/lib/tracking/tracking-registry.ts
```

Provider keys:

```text
META_PIXEL
GOOGLE_ANALYTICS
GOOGLE_TAG_MANAGER
```

Each provider definition declares:

```text
provider key
human display name
required or extensible capability class
schema version
identifier type and validation pattern
runtime mode
exact script origins
exact connect origins
exact image origins
consent category
supported event keys
closed payload contract
PII contract
SSR contract
SPA navigation contract
CSP contract
nonce contract
diagnostics contract
availability state
rollback contract
```

Unknown providers and invalid identifiers fail closed.

Factual provider availability:

```text
META_PIXEL = preview_ready / publishable after valid identifier and consent
GOOGLE_ANALYTICS = preview_ready / publishable after valid identifier and consent
GOOGLE_TAG_MANAGER = csp_blocked / configurable reference only / not publishable
```

GTM remains catalogued as an extensibility contract, but cannot be activated. A remote GTM container can introduce unaudited tags and destinations outside the closed provider and event registry; therefore it is blocked in the registry, strict input validation, server publish function, administrative projection, public snapshot and browser loader.

## 5. Closed event registry

Canonical event keys:

```text
page_view
view_property
search_properties
filter_properties
submit_public_form
lead_created
contact_click
phone_click
whatsapp_click
email_click
campaign_view
conversion_confirmed
```

Each event defines:

```text
business meaning
allowed surfaces
allowed payload fields
required payload fields
provider mappings
consent category
resource validation contract
deduplication contract
diagnostics contract
```

Payload rules:

```text
UNKNOWN_FIELD = denied
DIRECT_PII = denied
TENANT_IDENTIFIER = denied
ACTOR_IDENTIFIER = denied
USER_IDENTIFIER = denied
LEAD_IDENTIFIER = denied
ARBITRARY_SCRIPT_OR_HTML = denied
QUERY_STRING_IN_PAGE_PATH = denied
FRAGMENT_IN_PAGE_PATH = denied
OVERSIZED_PAYLOAD = denied
```

`conversion_confirmed` represents an internally confirmed conversion event. It does not prove provider receipt or attribution.

## 6. Tenant and authorization authority

Administrative chain:

```text
requireTenant
→ requireTenantScopedAuthority
→ resolveEffectiveTenantPermission
→ accepted CMS configuration/version module
→ requested action
→ global effective scope
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

Public chain:

```text
request Host
→ accepted public tenant resolver
→ explicit tenant equality in connector, consent and binding reads
→ strict cardinality and cross-tenant checks
→ tenant-free public DTO
```

The client cannot select tenant through body, query, path or header fields in tracking operations.

## 7. Configuration and persistence model

Migration:

```text
supabase/migrations/20260730010000_pr_m2_analytics_tracking_conversion_events.sql
```

Tables:

```text
tenant_tracking_connectors
tenant_tracking_connector_versions
tenant_tracking_event_bindings
tenant_tracking_diagnostics
tenant_tracking_consent_configuration
```

Key properties:

```text
one connector per tenant and provider
explicit schema version
explicit configuration version
explicit event binding version
explicit row version
provider identifiers only; no provider secret
tenant + connector composite foreign keys
closed consent categories
closed provider keys
closed availability states
sanitized diagnostics
append-only diagnostic protection
```

Transactional service-role primitives:

```text
assert_tenant_tracking_authority
save_tenant_tracking_connector
save_tenant_tracking_event_bindings
save_tenant_tracking_consent_configuration
```

Mutations enforce optimistic concurrency and reject stale versions.

## 8. Consent model

Consent categories:

```text
ANALYTICS
MARKETING
```

Policy:

```text
MODE = opt_in
UNKNOWN_CONSENT = deny non-essential provider loading
ANALYTICS_CHOICE = explicit
MARKETING_CHOICE = explicit
POLICY_REVISION = versioned
PERSISTED_BROWSER_CHOICE = schema and policy revision bound
REVOCATION = removes provider runtimes and stops future dispatch
```

The public preference interface exposes:

```text
Somente essenciais
Aceitar analytics e marketing
```

No Meta or Google provider script is emitted by SSR before consent.

## 9. Public runtime and SPA navigation

Files:

```text
src/components/site/PublicTrackingRuntime.tsx
src/lib/tracking/public-tracking-runtime.ts
src/routes/__root.tsx
```

Runtime flow:

```text
Host-derived server snapshot
→ local consent resolution
→ closed connector and event binding selection
→ exact external script origin validation
→ one provider loader authority
→ closed payload validation
→ provider dispatch attempt
→ sanitized local result
```

The public root no longer contains:

```text
hardcoded G-BYVFRCL0VV
inline Meta Pixel script
obterMetaPixelId loader dependency
direct fbq navigation dispatch
direct gtag navigation dispatch
```

SPA navigation emits the canonical `page_view` event through the registry runtime.

Provider runtime behavior:

```text
DUPLICATE_PROVIDER_SAME_IDENTIFIER = idempotent
DUPLICATE_PROVIDER_DIFFERENT_IDENTIFIER = fail closed
SCRIPT_ORIGIN_MISMATCH = fail closed
GTM_RUNTIME_LOAD = prohibited
EXTERNAL_DELIVERY_PROVED = false
```

## 10. Legacy cutover

`src/lib/api/meta.functions.ts` is now compatibility-only:

```text
LEGACY_CONFIGURATION_WRITABLE = false
INLINE_CONVERSIONS_API_TOKEN_WRITABLE = false
GRAPH_FACEBOOK_REQUEST = false
FAKE_SUCCESS_RESPONSE = false
EXTERNAL_PROVIDER_CALLED = false
EXTERNAL_DELIVERY_PROVED = false
```

Legacy reads resolve the canonical `tenant_tracking_connectors` state.

The migration performs deterministic cutover support for published Configuration Center identifiers:

```text
ga4_measurement_id
google_tag_manager_container_id
meta_pixel_id
```

Invalid legacy identifiers fail closed and are recorded without persisting raw unsafe values in diagnostics.

## 11. Content Security Policy

File:

```text
src/server.ts
```

The response policy uses exact allowlisted origins for the implemented browser adapters.

```text
WILDCARD_SCRIPT_ORIGIN = false
WILDCARD_CONNECT_ORIGIN = false
WILDCARD_IMAGE_ORIGIN = false
UNSAFE_EVAL = false
ARBITRARY_TENANT_ORIGIN = false
INLINE_PROVIDER_BOOTSTRAP = false
FRAME_ANCESTORS = none
REFERRER_POLICY = strict-origin-when-cross-origin
X_CONTENT_TYPE_OPTIONS = nosniff
```

The existing framework hydration requirement still uses the explicit `unsafe-inline` script directive. Provider bootstraps themselves are external loader module operations and are not injected as tenant-authored inline code.

## 12. Functional administrative UI

Route:

```text
/admin/tracking
```

Workspace:

```text
Distribuição
```

The seven-workspace information architecture remains unchanged.

Functional states include:

```text
loading
empty
unconfigured
configured
preview_ready
active
consent_required
csp_blocked
failed
validation error
revision conflict
sanitized diagnostics
```

The interface supports:

```text
provider configuration
identifier validation
draft save
publish where permitted
disable
event binding management
consent policy revision
runtime preview without provider call
diagnostics refresh
health summary
```

GTM publication is visibly disabled and also rejected server-side.

## 13. RLS, grants and RPC ACL

```text
RLS_ENABLED_TABLE_COUNT = 5
PUBLIC_TABLE_ACCESS = revoked
ANON_TABLE_ACCESS = revoked
AUTHENTICATED_TABLE_ACCESS = revoked
SERVICE_ROLE_TABLE_ACCESS = explicit
PUBLIC_RPC_EXECUTE = revoked
ANON_RPC_EXECUTE = revoked
AUTHENTICATED_RPC_EXECUTE = revoked
SERVICE_ROLE_RPC_EXECUTE = explicit
DIRECT_BROWSER_MUTATION = false
```

No permissive tenant tracking RLS policy was added.

## 14. Diagnostics and external-proof boundary

Diagnostics store only sanitized operational metadata and error codes.

The increment does not claim:

```text
provider event received
provider conversion attributed
provider delivery verified
provider reporting reconciled
server-side CAPI delivered
```

Browser dispatch results are limited to local states such as:

```text
consent_required
inactive
csp_blocked
dispatch_attempted
failed
```

`dispatch_attempted` is not external delivery proof.

## 15. Deterministic specifications

File:

```text
run-pr-m2-analytics-tracking-conversion-events-functional-completion-specs.ts
```

Final hardened code-head result:

```text
ASSERTIONS = 393
RESULT = PASS
```

Coverage proves, among other contracts:

```text
provider cardinality = 3
event cardinality = 12
strict provider identifiers
strict client input schemas
arbitrary code rejection
PII rejection
consent opt-in behavior
public root cutover
one runtime component
Host-derived public snapshot
admin server authority
exact CSP origins
legacy Meta fail-closed behavior
functional UI and seven workspaces
five tracking tables
five RLS-enabled tracking tables
three mutation RPC families
GTM configurable but not activatable
GTM absent from the browser loader
no fake provider delivery claim
```

## 16. Release Gate chronology

Corrective cycles were executed as discrete commits. Failed runs were used diagnostically and were not represented as success.

```text
RUN 30491696133 / JOB 90710852662 = failure
  predecessor harness expected the historical two-route literal for Distribuição

RUN 30491804381 / JOB 90711218987 = failure
  new harness incorrectly treated trusted derived actorUserId as client input

RUN 30492008168 / JOB 90711900271 = failure
  new harness required duplicated provider display-name literals in JSX

RUN 30492150103 / JOB 90712373508 = failure
  TypeScript detected one implicit-any diagnostic row parameter

RUN 30492377850 / JOB 90713112963 = success
  first complete code gate before critical GTM governance review

CRITICAL_POST_GATE_REVIEW = GTM could still be activated below the UI layer
CORRECTION = registry + schema + admin projection + publish + snapshot + loader fail-closed enforcement

RUN 30493168724 / JOB 90715787040 = success
  hardened final code-head exact checkout
```

## 17. Hardened code-head Release Gate

```text
CODE_HEAD = 5161fa9eedc5144f9e7cc4ab113afe9555a2076d
RUN_ID = 30493168724
JOB_ID = 90715787040
CONCLUSION = success
EXACT_HEAD_CHECKOUT = true
MERGE_REF_CHECKOUT = false
TYPECHECK_EXIT_CODE = 0
BUILD_DEV_EXIT_CODE = 0
BUILD_EXIT_CODE = 0
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
CYCLE_COMPOSITE_DIGEST_STABLE = true
ROUTE_TREE_SHA256 = d3effd5cd4dcd719535bb39a003872761a132a94dbf308e41aed1779f3f6968d
```

Artifact:

```text
ARTIFACT_ID = 8740610255
ARTIFACT_NAME = release-gate-5161fa9eedc5144f9e7cc4ab113afe9555a2076d
ARTIFACT_DIGEST = sha256:2a720ab41203856258ae80f30697161e49f377869b22e36da040fc744b995a4f
ARTIFACT_EXPIRED = false
ARTIFACT_EXPIRES_AT = 2026-08-12T21:42:24Z
```

All preserved regression groups reported true, including:

```text
public tenant context
public tenant reads
public settings and campaign recovery
public page runtime
PTW-01 public writers
public surface security
public surface tenant reads
CMS tenant authority
Dashboard tenant authority
CRM report authority
property administration authority
tenant lifecycle
tenant access control
Configuration Center
Portal functional completion
CMS workflow functional completion
CRM operational workflow functional completion
Marketing Channels and Lead Ingestion functional completion
lead authorization, runtime, structural and SQL specifications
```

## 18. Definition of Done result

```text
CLOSED_PROVIDER_REGISTRY = true
CLOSED_EVENT_REGISTRY = true
TENANT_SCOPED_CONFIGURATION = true
VERSIONED_EVENT_BINDINGS = true
VERSIONED_CONSENT_CONFIGURATION = true
HOST_DERIVED_PUBLIC_SNAPSHOT = true
CONSENT_REQUIRED_BEFORE_NONESSENTIAL_LOAD = true
SSR_PROVIDER_BOOTSTRAP = false
SPA_NAVIGATION_TRACKING = true
DIRECT_PII_EXPORT = false
ARBITRARY_TENANT_JAVASCRIPT = false
CLIENT_TENANT_AUTHORITY = false
SUPER_ADMIN_IMPERSONATION_REQUIRED = true
GTM_RUNTIME_ACTIVATION = false
GTM_GOVERNANCE_STATE = csp_blocked
LEGACY_META_NETWORK_CALL = false
FAKE_PROVIDER_DELIVERY = false
CSP_WILDCARDS = false
RLS_AND_GRANTS_STRUCTURALLY_ENFORCED = true
ADMIN_UI_FUNCTIONAL = true
SEVEN_WORKSPACES_PRESERVED = true
TYPECHECK = pass
BUILD_DEV = pass
BUILD = pass
RELEASE_GATE = pass
```

## 19. Explicit non-execution

```text
MIGRATION_APPLIED_TO_MANAGED_BACKEND = false
EXTERNAL_META_EVENT_SENT = false
EXTERNAL_GOOGLE_EVENT_SENT = false
PRODUCTION_TRAFFIC_TESTED = false
DEPLOY_EXECUTED = false
DCA_01_EXECUTED = false
BCA_01_EXECUTED = false
PR_M3_EXECUTED = false
MERGE_EXECUTED = false
AUTO_MERGE_ENABLED = false
```

## 20. State after code implementation

```text
ANALYTICS_TRACKING_CONVERSION_EVENTS_FUNCTIONAL_COMPLETION_STATE = Ready for exact-head evidence gate
PRM2_MERGE_AUTHORIZED = false
NEXT_INCREMENT_STARTED = false
```

The final architectural acceptance remains dependent on the evidence commit, its exact-head Release Gate and direct GitHub audit.