# PTW-01 — PUBLIC TENANT-BOUND WRITERS IMPACT ANALYSIS

## Status

**Planning-only — pending Release Gate and direct external audit**

```text
STAGE_ID = PTW-01
BASELINE_MAIN = 87acb309c0102a096f65d0c420061012edb5899e
PREDECESSOR = PPR-GN-01 Accepted
CANONICAL_ISSUE = 16
DUPLICATE_ISSUE = 12 — Closed as duplicate
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
MAX_ACTIVE_IMPLEMENTATION_PRS = 1
IMPLEMENTATION_STARTED = false
IMPLEMENTATION_AUTHORIZED = false
PSG01_AUTHORIZED = false
```

This document authorizes no runtime, migration, RLS, grant, Auth, Storage or writer change until its planning PR is accepted through a green Release Gate and direct GitHub audit.

---

## 1. Decision context

PPR-GN-01 is Accepted and the public read boundaries required before PTW-01 are integrated.

Direct audit of `main` confirms that public tenant-scoped mutations still use five incompatible authority models:

1. no server tenant authority for direct public lead creation;
2. global form slug as implicit tenant authority;
3. client-controlled `tenantId` transported as `x-tenant-id` for campaign events;
4. global Meta settings lookup for public Conversions API events;
5. portal token lookup with implicit singleton semantics and duplicated immediate/replay writer logic.

These writers can perform service-role or anonymous writes. The current public write architecture therefore does not satisfy the binding invariant that the server is the sole authority for tenant selection and resource ownership.

PTW-01 must replace these paths with deterministic, explicit server boundaries without reopening the accepted authenticated Lead authorization work.

---

## 2. Objective

PTW-01 must establish a single, auditable authority model for public tenant-scoped mutations:

```text
Public Host request
        ↓
server-resolved PublicTenantIdentity
        ↓
server-side resource ownership validation
        ↓
explicit 0/1/N cardinality decision
        ↓
validated writer command
        ↓
service-role write with explicit tenant_id
```

Portal operations use a parallel credential-derived authority contract:

```text
portal_slug + token
        ↓
explicit connector 0/1/N resolution
        ↓
exactly one active connector
        ↓
accepted connector tenant identity
        ↓
server-side property/resource validation
        ↓
validated portal writer command
```

Required outcomes:

- public site leads are Host-bound;
- form reads and submissions are Host-bound;
- form-derived leads and submissions share the same accepted tenant object;
- campaign events are Host-bound and no longer accept client tenant authority;
- Meta CAPI credentials are Host-bound;
- portal connector authority has explicit zero/one/multiple handling;
- direct and code-based portal property references are tenant-bound;
- immediate portal lead ingestion and DLQ replay use the same writer;
- anonymous direct Data API insertion into campaign events is closed;
- existing authenticated Lead boundaries remain unchanged.

---

## 3. Audited current state

The detailed source inventory is recorded in:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
ptw-01-public-writer-authority-inventory.md
```

### 3.1 Direct public lead writer

`src/lib/api/catalogo.functions.ts::enviarLead`:

- does not resolve tenant from request Host;
- creates a service-role client directly;
- accepts `imovel_id`, `launch_project_id`, `origem` and `notificar_gestores` from the browser;
- resolves property, launch, broker, user and recipients without tenant equality;
- inserts a lead without an explicit server-proven `tenant_id`;
- queries contact settings by global key;
- is consumed by public contact, advertisement, property and launch surfaces.

### 3.2 Generic public forms

`src/lib/api/forms.functions.ts`:

- resolves form read and submission by global `slug + published`;
- uses `maybeSingle()` rather than explicit 0/1/N handling;
- derives tenant authority from the returned form row;
- performs service-role lead and submission writes;
- uses form configuration for notifications and webhooks.

### 3.3 Campaign event writer

`src/lib/api/campaigns.functions.ts::registrarEventoCampanha`:

- accepts optional client `tenantId`;
- converts it into an `x-tenant-id` header;
- writes through an anon client;
- does not prove campaign ownership or active state in the accepted tenant;
- does not explicitly persist a server-proven `tenant_id`.

### 3.4 Meta CAPI writer

`src/lib/api/meta.functions.ts::enviarEventoMetaCAPI`:

- does not resolve tenant from Host;
- reads pixel ID and token by global settings key with `maybeSingle()`;
- can send an event using another tenant's credentials.

### 3.5 Portal writers

`src/routes/api/public/portal-leads.ts` and `src/routes/api/public/feeds.$portal.$token.ts`:

- resolve connector by `portal_slug + feed_token` through `maybeSingle()`;
- have no explicit ambiguity branch;
- immediate portal lead ingestion filters code-based property lookup by tenant, but direct `imovel_id` lookup only by ID;
- feed generation performs operational writes after connector resolution.

`src/routes/api/public/hooks/portal-dlq-retry.ts`:

- duplicates lead construction and insertion;
- reuses queued `imovel_id` without tenant revalidation;
- must preserve its existing hook authentication in this stage.

---

## 4. Architectural invariants

The implementation must preserve all of the following:

```text
SERVER_TENANT_AUTHORITY = required
CLIENT_TENANT_AUTHORITY = prohibited
HEADER_TENANT_AUTHORITY = prohibited
PATH_TENANT_AUTHORITY = prohibited
DEFAULT_TENANT = prohibited
HEURISTIC_TENANT_SELECTION = prohibited
ORDER_BY_LIMIT_1_AUTHORITY = prohibited
FAIL_CLOSED_ON_AMBIGUITY = required
SERVICE_ROLE_AFTER_AUTHORITY_PROOF_ONLY = required
RESOURCE_TENANT_REVALIDATION = required
SINGLE_WRITER_PATH_PER_OPERATION = required
```

Additional rules:

- a client-provided resource ID is only an identifier, never proof of tenant ownership;
- a portal token is a credential transport, never a tenant ID;
- a form slug is an identifier inside a Host-resolved tenant, never global tenant authority;
- `x-tenant-id` must not be generated from public client payload;
- all service-role writes must assign `tenant_id` explicitly from accepted server context;
- zero rows, one row and multiple rows must be distinct outcomes wherever authority is resolved;
- no fallback to another tenant, global row or first row is allowed.

---

## 5. Target architecture

### 5.1 Shared authority module

Create:

```text
src/lib/public-writers/public-writer-authority.server.ts
```

Responsibilities:

- define `PublicWriterTenantIdentity { id: string }`;
- adapt `requirePublicTenantFromRequest()` without weakening it;
- expose pure cardinality helpers for 0/1/N row resolution;
- validate returned `tenant_id` against the accepted tenant;
- reject missing tenant identity and foreign rows;
- expose exact portal connector resolution by portal slug and token;
- preserve the accepted tenant/connector object by reference through downstream callbacks;
- define stable typed error codes.

Representative error domain:

```text
public_tenant_unresolved
resource_not_found
resource_ambiguous
resource_foreign_tenant
resource_missing_tenant_id
portal_connector_invalid
portal_connector_ambiguous
portal_connector_inactive
writer_input_invalid
```

No database write belongs in the authority module.

### 5.2 Shared public lead writer

Create:

```text
src/lib/public-writers/public-lead-writer.server.ts
```

Responsibilities:

- accept an already-proven tenant identity;
- validate optional property and launch identifiers within that tenant;
- resolve broker and assignment only within the same tenant;
- derive notification policy server-side;
- resolve managers/recipients only within the same tenant;
- insert `tenant_id` explicitly;
- expose one internal command used by:
  - direct site lead creation;
  - form-derived lead creation;
  - portal lead ingestion;
  - portal DLQ replay;
- return a typed result without exposing internal tenant authority to public clients.

The module must not call or alter the authenticated `create_manual_lead` RPC. Anonymous and authenticated Lead creation remain separate entry boundaries while sharing no duplicate authority assumptions.

### 5.3 Portal writer module

Create:

```text
src/lib/public-writers/portal-writer.server.ts
```

Responsibilities:

- resolve exactly one active connector;
- preserve connector ID, portal slug and tenant ID as a typed authority object;
- validate direct property ID and property code within the connector tenant;
- reject conflicting ID/code inputs;
- call the shared public lead writer for immediate ingestion and DLQ replay;
- construct tenant-bound feed property sets;
- perform connector, publication-state and sync-log writes using the same accepted authority;
- prevent a second portal lead insertion algorithm.

The module must not own HTTP hook authentication.

### 5.4 Campaign and Meta writer module

Create:

```text
src/lib/public-writers/public-campaign-writer.server.ts
```

Responsibilities:

- resolve Host tenant before campaign or Meta work;
- validate campaign by `tenant_id + campaign_id + active` with explicit cardinality;
- insert campaign events with explicit tenant ID through server-only credentials;
- resolve Meta integration and credential settings by `tenant_id + key` with explicit cardinality;
- post-validate tenant identity on settings rows;
- never accept tenant, pixel ID or token from public input;
- make authority/configuration failures observable without falling back to another tenant.

### 5.5 Route and API adapters

Existing public APIs remain transport adapters only. They must:

- validate bounded non-authoritative input;
- call the relevant shared boundary;
- avoid direct service-role business writes;
- avoid resource lookups that duplicate boundary logic;
- preserve public response contracts where safe;
- propagate authority failures consistently.

---

## 6. Surface-specific decisions

### 6.1 Direct site leads

`enviarLead` must:

- resolve Host tenant first;
- use a strict schema with no tenant field;
- remove `notificar_gestores` from public authority input;
- treat `origem` as bounded metadata only or derive it from an explicit server adapter;
- pass resource identifiers to the shared writer for tenant validation;
- never instantiate a second service-role writer path.

Consumer updates are required only where public input fields are removed or replaced. Contact and advertisement routes must stop sending `notificar_gestores`.

### 6.2 Forms

Both public form read and submission must use the same Host-bound resolution contract:

```text
tenant_id + slug + status=published + limit(2)
```

Outcomes:

```text
0 rows = unavailable/not found
1 row = post-validate and accept
N > 1 rows = ambiguity; fail closed
```

The accepted form identity must be reused for field lookup, lead creation, submission, notifications and webhook configuration.

### 6.3 Campaign events

Public input must contain only:

```text
campaign_id
tipo
rota?
session_id?
```

The server must:

- resolve Host tenant;
- validate exactly one active campaign in that tenant;
- insert event with explicit tenant ID;
- use server-only credentials;
- reject forged tenant payloads and ignore client tenant headers as authority.

### 6.4 Meta CAPI

The server must:

- resolve Host tenant;
- resolve each required settings row by `tenant_id + key + limit(2)`;
- reject ambiguity or foreign/missing tenant rows;
- send only with credentials proven for the same tenant;
- never choose a global or first settings row;
- preserve non-blocking page UX only after the authority decision; failures remain observable.

### 6.5 Portal connector cardinality

Connector resolution must read at most two rows:

```text
0 rows = invalid credential
1 inactive row = denied
1 active row = accepted
N > 1 rows = authority ambiguity; fail closed
```

No `.maybeSingle()`, `.single()`, `ORDER BY ... LIMIT 1` or first-row fallback may decide connector authority.

### 6.6 Portal property binding

- direct ID and code lookup must both include accepted connector tenant;
- if both are provided, they must identify the same property;
- zero property rows may produce a lead without a property only when the channel contract explicitly permits it;
- multiple property rows fail closed;
- foreign property IDs cannot influence broker, assignment, lead, logs or DLQ state.

### 6.7 Feed operational writes

Feed property queries, image/link reads, publication state, connector status and sync logs must all derive from the same accepted connector authority.

The existing zero-link behavior—publishing all active tenant properties when there are no explicit portal links—must be preserved only if explicitly proven in tests. Ambiguous or inconsistent link state must not trigger a fallback to all properties.

### 6.8 DLQ replay

- hook authentication remains unchanged and outside PTW-01;
- the replayed business mutation must call the same portal/public lead writer as the immediate endpoint;
- queued tenant ID must match the validated queue item contract;
- property is revalidated in that tenant;
- retry/resolution RPCs remain tied to the same queue item;
- duplicate business logic is removed.

---

## 7. Database, RLS and grants

### 7.1 Service-role boundaries

Most audited public writers already use service-role credentials. RLS cannot be claimed as the primary authorizer for those writes.

For these surfaces:

- application server validation is the primary boundary;
- `tenant_id` must be written explicitly;
- RLS remains defense-in-depth;
- no broad RLS rewrite is authorized.

### 7.2 Campaign-event anonymous DML

The legacy campaign event path uses an anon client and client-controlled tenant transport.

PTW-01 implementation must include exactly one migration dedicated to campaign-event DML hardening. Before changing grants or policies, the implementation must inspect the current names and effective state.

The migration may:

- revoke direct campaign-event INSERT/DML from `PUBLIC` and `anon` as required;
- remove only the legacy anonymous write policy proven to support this path;
- preserve authenticated admin reads/operations;
- preserve service-role server insertion;
- use explicit, idempotent SQL;
- include structural evidence of the final grants/policies.

The migration must not:

- change unrelated tables;
- broaden service-role grants;
- create permissive cross-tenant policies;
- alter authenticated manual Lead RPCs;
- alter tenant membership or impersonation contracts.

### 7.3 Accepted authenticated Lead boundary

The accepted `create_manual_lead` RPC, its grants, audit behavior and LSH/LSV evidence are outside PTW-01 and must remain unchanged.

---

## 8. Consumers and compatibility

Confirmed consumers:

| Boundary | Consumers |
|---|---|
| direct public lead | contact, advertise-property, property detail and launch detail routes |
| public forms | `CmsFormRenderer`, embedded through CMS page blocks |
| campaign events | `CampaignRenderer` impression/click/dismiss callbacks |
| Meta CAPI | contact, advertise-property, property, launch and public tracking surfaces |
| portal lead | external portal POST clients |
| portal feed | external portal/feed readers |
| DLQ replay | cron/operator trigger, with hook auth unchanged |

Compatibility rules:

- public response shapes should remain stable unless a security failure must be surfaced;
- removing client `tenantId` and `notificar_gestores` is required and is not considered backward compatibility debt;
- query cache keys must not incorporate client tenant IDs;
- external portal request schema must not gain a tenant field;
- accepted PTC/PTR/PSC/PPR-GN regressions must remain green.

---

## 9. FILES_ALLOWED for implementation

Exactly the following files may be created or modified in the future PTW-01 implementation PR.

### 9.1 New shared boundaries

```text
src/lib/public-writers/public-writer-authority.server.ts
src/lib/public-writers/public-lead-writer.server.ts
src/lib/public-writers/portal-writer.server.ts
src/lib/public-writers/public-campaign-writer.server.ts
```

### 9.2 Existing API and route adapters

```text
src/lib/api/catalogo.functions.ts
src/lib/api/forms.functions.ts
src/lib/api/campaigns.functions.ts
src/lib/api/meta.functions.ts
src/routes/api/public/portal-leads.ts
src/routes/api/public/feeds.$portal.$token.ts
src/routes/api/public/hooks/portal-dlq-retry.ts
src/routes/contato.tsx
src/routes/anuncie.tsx
```

`portal-dlq-retry.ts` may change only its replayed business mutation. Authentication and authorization of the hook request are frozen.

### 9.3 Executable evidence

```text
src/lib/__tests__/public-tenant-writer-authority.spec.ts
src/lib/__tests__/public-tenant-writer-sql-structural.spec.ts
run-public-tenant-writer-authority-specs.ts
run-public-tenant-writer-sql-structural-specs.ts
package.json
scripts/verify-release.mjs
```

### 9.4 Restricted migration

```text
supabase/migrations/<timestamp>_ptw_01_public_writer_dml_hardening.sql
```

Exactly one new migration is allowed. Its scope is limited to the campaign-event anonymous DML closure proven necessary by direct audit.

No additional file is authorized without an explicit scope amendment and direct audit finding.

---

## 10. Prohibitions

Do not:

- use Lovable;
- reopen PPR-01, PPR-GN-01, LSH-01, LSV-01 or LSV-02;
- modify `create_manual_lead` or its grants;
- modify Lead authorization/operations modules accepted by LSH-01;
- modify tenant middleware or public tenant resolver contracts;
- accept tenant ID from public payload, query, path or client-generated header;
- create tenant default or fallback;
- choose authority through `maybeSingle()`, `single()`, first row, ordering or limit one;
- retain duplicate immediate and replay Lead insertion algorithms;
- modify bootstrap-admin;
- modify hook authentication for portal DLQ retry;
- modify email provider callback/security routes;
- modify CMS renderer sanitization or URL allowlists;
- modify Storage;
- modify Auth;
- modify unrelated RLS, grants, policies, functions or tables;
- change dependency versions or `bun.lock`;
- modify GitHub workflow definitions;
- manually edit generated route files;
- use broad codemods;
- open parallel PTW-01 implementation PRs;
- start PSG-01.

---

## 11. Required executable evidence

### 11.1 Authority and direct lead tests

Prove:

1. unresolved/unknown Host prevents all direct public lead writes;
2. forged tenant payload is rejected;
3. forged client `x-tenant-id` has no authority effect;
4. accepted tenant object reaches resource validation and write unchanged;
5. lead receives explicit accepted tenant ID;
6. foreign property ID is denied;
7. foreign launch project ID is denied;
8. ambiguous property or launch project fails closed;
9. broker and assignment belong to the accepted tenant;
10. manager/contact recipients are tenant-bound;
11. public input cannot choose manager-notification policy.

### 11.2 Form tests

Prove:

1. form read/submission resolve Host tenant before query;
2. zero form rows returns unavailable;
3. one same-tenant published form is accepted;
4. multiple form rows fail as ambiguity;
5. foreign or missing tenant form row fails closed;
6. fields use accepted form identity;
7. form-derived lead and submission use the same tenant;
8. notification/webhook configuration comes from the accepted form only;
9. no service-role write occurs after failed form authority.

### 11.3 Campaign and Meta tests

Prove:

1. campaign event input rejects tenant fields;
2. Host tenant is resolved before campaign query;
3. zero/inactive/foreign/ambiguous campaign is denied;
4. event receives explicit accepted tenant ID;
5. direct anon client writer path is absent;
6. Meta integration and credential rows are tenant-bound;
7. zero/ambiguous/foreign Meta settings fail closed;
8. credentials from another tenant cannot be selected;
9. authority failures are observable and do not fall back.

### 11.4 Portal tests

Prove:

1. zero connector rows is invalid credential;
2. one active connector is accepted;
3. one inactive connector is denied;
4. multiple connector rows fail as ambiguity;
5. direct property ID includes connector tenant equality;
6. property code includes connector tenant equality;
7. conflicting ID/code is denied;
8. foreign property cannot influence broker or lead;
9. lead, sync log and DLQ entry share connector tenant;
10. immediate ingestion and replay call the same writer;
11. replay revalidates property inside queue tenant;
12. feed properties and operational writes share accepted connector authority;
13. ambiguous portal-link state cannot fall back to all properties.

### 11.5 SQL structural tests

Prove the restricted migration:

- is the only PTW migration;
- revokes the required campaign-event DML from `PUBLIC` and `anon`;
- removes only the identified legacy anonymous write policy;
- preserves service-role/server insertion;
- preserves authenticated admin behavior;
- does not touch unrelated tables, Lead RPCs or tenant membership functions;
- is idempotent and uses explicit object names.

### 11.6 Regression suites

The canonical Release Gate must execute and preserve:

```text
PTC-01
PTR-01
PSC-01
PPR-GN-01
LSH-01 Lead unit/runtime/structural/SQL suites
PTW-01 authority specs
PTW-01 SQL structural specs
```

All typecheck, build, build:dev and deterministic route-tree checks must remain green.

---

## 12. Definition of Done

```text
PUBLIC_SITE_LEAD_HOST_BOUND = true
PUBLIC_SITE_LEAD_EXPLICIT_TENANT = true
PUBLIC_SITE_LEAD_CLIENT_TENANT_INPUT = false
PUBLIC_SITE_LEAD_MANAGER_POLICY_CLIENT_CONTROL = false
PUBLIC_SITE_LEAD_RESOURCE_TENANT_REVALIDATED = true
PUBLIC_SITE_LEAD_RECIPIENTS_TENANT_BOUND = true

PUBLIC_FORM_READ_HOST_BOUND = true
PUBLIC_FORM_SUBMISSION_HOST_BOUND = true
PUBLIC_FORM_CARDINALITY_EXPLICIT = true
PUBLIC_FORM_FOREIGN_ROW_DENIED = true
PUBLIC_FORM_LEAD_AND_SUBMISSION_SAME_TENANT = true
PUBLIC_FORM_CONFIG_TENANT_BOUND = true

PUBLIC_CAMPAIGN_EVENT_HOST_BOUND = true
PUBLIC_CAMPAIGN_EVENT_CLIENT_TENANT_INPUT = false
PUBLIC_CAMPAIGN_EVENT_CAMPAIGN_REVALIDATED = true
PUBLIC_CAMPAIGN_EVENT_EXPLICIT_TENANT = true
DIRECT_ANON_CAMPAIGN_EVENT_DML = false

PUBLIC_META_CAPI_HOST_BOUND = true
PUBLIC_META_CREDENTIAL_CARDINALITY_EXPLICIT = true
PUBLIC_META_FOREIGN_CREDENTIAL_DENIED = true
PUBLIC_META_CREDENTIAL_FALLBACK = false

PUBLIC_PORTAL_CONNECTOR_CARDINALITY_EXPLICIT = true
PUBLIC_PORTAL_INACTIVE_CONNECTOR_DENIED = true
PUBLIC_PORTAL_PROPERTY_TENANT_BOUND = true
PUBLIC_PORTAL_CONFLICTING_PROPERTY_REFERENCE_DENIED = true
PUBLIC_PORTAL_OPERATIONAL_WRITES_TENANT_BOUND = true
PUBLIC_PORTAL_IMMEDIATE_AND_REPLAY_SINGLE_WRITER = true
PUBLIC_PORTAL_REPLAY_PROPERTY_REVALIDATED = true

FORGED_TENANT_PAYLOAD_DENIED = true
FORGED_TENANT_HEADER_NO_AUTHORITY = true
SERVICE_ROLE_USED_ONLY_AFTER_AUTHORITY_PROOF = true
NO_TENANT_DEFAULT_OR_HEURISTIC = true
NO_ORDER_BY_LIMIT_1_AUTHORITY = true

CREATE_MANUAL_LEAD_CHANGED = false
LSH_BOUNDARY_CHANGED = false
DLQ_HOOK_AUTH_CHANGED = false
BOOTSTRAP_ADMIN_CHANGED = false
CMS_RENDERER_CHANGED = false
AUTH_CHANGED = false
STORAGE_CHANGED = false
UNRELATED_RLS_GRANT_CHANGE = false
DEPENDENCY_VERSION_CHANGE = false
LOCKFILE_CHANGE = false
WORKFLOW_DEFINITION_CHANGE = false
FILES_OUTSIDE_ALLOWED = 0

PTC01_REGRESSION_GREEN = true
PTR01_REGRESSION_GREEN = true
PSC01_REGRESSION_GREEN = true
PPR_GN_01_REGRESSION_GREEN = true
LSH01_REGRESSION_GREEN = true
PTW01_AUTHORITY_SPECS_GREEN = true
PTW01_SQL_STRUCTURAL_SPECS_GREEN = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
RELEASE_GATE_ARTIFACT_UPLOADED = true
```

---

## 13. Execution and successor gate

### 13.1 Planning acceptance

Before this Impact Analysis is accepted:

```text
PTW01_PLANNING_STATE = Pending External Audit
PTW01_IMPLEMENTATION_AUTHORIZED = false
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

After a green planning Release Gate and direct audit acceptance:

```text
PTW01_PLANNING_STATE = Accepted
PTW01_IMPLEMENTATION_AUTHORIZED = true
AUTHORIZED_EXECUTOR = GitHub-native
MAX_ACTIVE_IMPLEMENTATION_PRS = 1
PSG01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

### 13.2 Implementation control

The future implementation must:

1. start from the accepted planning merge head;
2. use one branch and one active implementation PR;
3. remain inside `FILES_ALLOWED`;
4. run inherited regressions before and after material writer changes;
5. apply only evidence-driven corrections in the same PR;
6. complete a green Release Gate and direct final GitHub audit before merge.

GitHub-native corrections are not limited by Lovable prompt count. Speculative corrections, parallel flows and silent scope expansion remain prohibited.

### 13.3 Successor

PTW-01 acceptance authorizes PSG-01 planning only after PTW-01 implementation is merged, reconciled and accepted through direct audit.
