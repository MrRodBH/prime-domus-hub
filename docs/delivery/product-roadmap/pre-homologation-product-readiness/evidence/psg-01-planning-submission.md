# PSG-01 — Planning Submission

## Status

**Preflight Planning Amendment Submitted — ready for direct external audit**

```text
STAGE_ID = PSG-01
CURRENT_MAIN_BASELINE = 443b537aa68d007b729aba37ee87d6cc1f62e344
CANONICAL_ISSUE = 4
ORIGINAL_PLANNING_PR = 44
ORIGINAL_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
FAILED_IMPLEMENTATION_PR = 46
FAILED_IMPLEMENTATION_PR_STATE = Closed — Unmerged
FAILED_IMPLEMENTATION_HEAD = dda7ca8a074afffe9d8edd89eb57000444dc77dd
RUNTIME_IMPLEMENTATION_APPLIED = false
FINAL_IMPLEMENTATION_DIFF_FILES = 0
AMENDMENT_BRANCH = agent/psg-01-preflight-planning-amendment
AMENDMENT_AUTHORIZED = true
AMENDMENT_STATE = Ready for Direct External Audit
IMPLEMENTATION_RESUME_AUTHORIZED = false
PLANNING_ONLY = true
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

---

## 1. Submission purpose

This submission packages the PSG-01 preflight planning amendment required after the first authorized implementation attempt stopped fail-closed.

It contains no runtime, dependency, lockfile, migration, RLS, grant, Auth, Storage, public-writer, workflow or generated-route change.

The amendment incorporates the omitted `src/lib/api/admin.functions.ts::bootstrapAdmin` anonymous privileged server function, resolves deletion without runtime replacement, records the absence of a repository-owned portal DLQ scheduler, reconciles stale QA/PTW authentication assertions, adds the required portal-DLQ operator runbook and expands `FILES_ALLOWED` narrowly.

PR #46 is closed unmerged with zero final changed files. Direct audit acceptance, protected merge of the amendment and a new explicit product-owner implementation authorization remain separate required decisions.

---

## 2. Planning authority

```text
docs/architecture/impact-analysis/
PSG-01-public-surface-security-gate-impact-analysis.md      # accepted original authority
PSG-01-preflight-planning-amendment.md                    # binding superseding delta

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-public-surface-security-inventory.md
```

The accepted original Impact Analysis remains normative except where the preflight amendment explicitly supersedes bootstrap, DLQ caller/transport, `FILES_ALLOWED`, evidence, Definition of Done and next-action statements.

The inventory is the direct-evidence record supporting the planning decisions.

---

## 3. Direct findings submitted for audit

```text
PUBLIC_BOOTSTRAP_ADMIN_ROUTE_PRESENT = true
PUBLIC_BOOTSTRAP_ADMIN_OPERATOR_AUTHORITY = false

DLQ_REPLAY_PUBLISHABLE_KEY_AUTH = true
DLQ_REPLAY_DEDICATED_SECRET = false

CUSTOM_START_CONFIGURATION = true
SERVER_FUNCTION_CSRF_MIDDLEWARE_PRESENT = false

RAW_CMS_PAGE_HTML_EXECUTION = true
RAW_BLOG_HTML_EXECUTION = true
RAW_LAUNCH_HTML_EXECUTION = true
SERVER_SIDE_HTML_SANITIZER_PRESENT = false

CENTRAL_PUBLIC_URL_POLICY_PRESENT = false
UNKNOWN_EMBED_DESTINATION_DENIED = false

PUBLIC_MENU_HOST_BOUND = false
PUBLIC_BLOG_HOST_BOUND = false
PUBLIC_LAUNCH_HOST_BOUND = false

PUBLIC_CATALOG_LIST_HOST_BOUND = false
PUBLIC_CITY_COLLECTION_HOST_BOUND = false
PUBLIC_NEIGHBORHOOD_COLLECTION_HOST_BOUND = false

PUBLIC_PROPERTY_DETAIL_HOST_BOUND = false
PUBLIC_PROPERTY_DETAIL_TENANT_FILTER = false
PUBLIC_PROPERTY_DETAIL_CARDINALITY_EXPLICIT = false
PUBLIC_PROPERTY_DETAIL_USES_MAYBE_SINGLE = true

PUBLIC_PROPERTY_DESTINATIONS_SERVER_VALIDATED = false
PUBLIC_PROPERTY_RAW_VIDEO_URL_SERIALIZED = true
PUBLIC_PROPERTY_RAW_TOUR_URL_SERIALIZED = true
PUBLIC_PROPERTY_RAW_MEDIA_URL_SERIALIZED = true
```

Blog, menu, launch, catalog, city, neighborhood and property-detail findings are current-main PSG-01 residuals. They do not reclassify or reopen historical PTR-01.

---

## 4. Corrected frozen implementation workstreams

```text
A. delete anonymous bootstrap-admin route and add operator runbook
B. dedicated bearer-secret boundary for portal DLQ retry
C. explicit TanStack Start serverFn CSRF middleware
D. pinned server-side HTML sanitization policy
E. central URL, media and embed destination policy
F. Host/tenant binding for blog, menu, launch, catalog, city, neighborhood and property reads
G. server-before-DTO security for property media, video and tour
H. executable negative security, tenant-read and PTW-preservation evidence
```

---

## 5. Frozen security decisions

### 5.1 Bootstrap

```text
DEFAULT = delete public route
PUBLIC_REPLACEMENT = prohibited
OPERATOR_RUNBOOK = required
ACTIVE_CALLER_AMBIGUITY = stop and re-plan
```

### 5.2 DLQ replay

```text
ENV = PORTAL_DLQ_RETRY_SECRET
TRANSPORT = Authorization: Bearer
COMPARISON = constant-time
PUBLISHABLE_KEY_AUTH = prohibited
LEGACY_X_CRON_SECRET = prohibited
BUSINESS_REPLAY_CHANGE = prohibited
```

### 5.3 CSRF

```text
createCsrfMiddleware serverFn filter = required
missing-origin permissive bypass = prohibited
public server routes = separately preserved
```

### 5.4 Persisted content

```text
sanitize-html = 2.17.5 exact
@types/sanitize-html = 2.16.1 exact
server-side sanitizer = required
client-only sanitizer = insufficient
iframe in rich text = prohibited
unsafe URL fallback = prohibited
```

### 5.5 Unified public reads

```text
Host
→ accepted tenant
→ explicit tenant equality
→ exact resource or tenant-scoped collection validation
→ destination and HTML policy
→ tenant-free safe DTO
→ renderer
```

Coverage:

```text
blog
menu
launches
property catalog
cities
neighborhoods
property detail
property media
property video
property tour
```

No global slug, global anonymous client, `maybeSingle()` authority, tenant fallback, first-row authority or client-supplied tenant is accepted.

### 5.6 Property catalog and detail

```text
listarImoveis/listarCidades/listarBairros
→ Host-derived tenant
→ tenant_id equality
→ every-row post-validation
→ tenant-free safe DTO

strict { slug }
→ Host-derived tenant
→ tenant_id + slug + active
→ limit(2)
→ explicit 0/1/N
→ nested tenant validation
→ Storage signing
→ destination-safe DTO
```

Service role and Storage signing must occur only after accepted tenant/resource authority.

### 5.7 PTW preservation inside catalogo.functions.ts

Future implementation may alter only:

```text
listarImoveis
listarCidades
listarBairros
obterImovel
public-read-only helpers and DTO types required by those functions
```

Immutable:

```text
publicLeadSchema
enviarLead
requirePublicWriterTenantFromRequest
writePublicLead
src/lib/public-writers/*
lead recipient authority
lead tenant authority
PTW public mutation behavior
```

```text
CATALOGO_PUBLIC_READ_SCOPE_ONLY = true
CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
```

---

## 6. Corrected implementation envelope highlights

The normative `FILES_ALLOWED` in the Impact Analysis now includes:

```text
src/lib/api/catalogo.functions.ts # public-read scope only
```

It does not authorize administrative or mutation refactoring.

Property destinations governed before public DTO serialization:

```text
video_url
tour_url
imagem_capa
imovel_imagens.url
imovel_imagens.thumb
corretor.foto_url
```

Unsafe or unknown executable destinations fail closed. Optional invalid decorative media may be omitted. Raw fallback is prohibited.

---

## 7. Required future executable evidence

### 7.1 Catalog collections

Execute for `listarImoveis`, `listarCidades` and `listarBairros`:

```text
unknown Host → deny before query
missing tenant → deny
foreign tenant row → deny
mixed-tenant collection → deny
valid same-tenant collection → accept
tenant_id absent from DTO
```

### 7.2 Property detail

```text
0 rows → not found
1 same-tenant row → accepted
N rows → ambiguous and denied
foreign tenant row → denied
missing tenant_id → denied
query error → fail closed
```

Structural proof:

```text
Host authority precedes service role
tenant equality precedes slug equality
limit(2) present
maybeSingle authority absent
Storage signing after tenant/resource authority
```

### 7.3 Property destinations

```text
safe signed HTTPS image → accepted
safe approved relative asset → accepted
javascript/data/blob/protocol-relative/credential-bearing URL → denied
unknown video provider → denied
unknown tour provider → denied
HTTP embed → denied
exact approved provider/path → accepted
raw fallback → absent
```

### 7.4 PTW preservation

```text
publicLeadSchema unchanged
enviarLead authority unchanged
writePublicLead delegation preserved
PTW authority suite green
PTW SQL structural suite green
```

---

## 8. Corrected Definition of Done additions

```text
PUBLIC_CATALOG_HOST_BOUND = true
PUBLIC_CATALOG_COLLECTION_TENANT_VALIDATED = true

PUBLIC_CITY_COLLECTION_HOST_BOUND = true
PUBLIC_CITY_COLLECTION_TENANT_VALIDATED = true

PUBLIC_NEIGHBORHOOD_COLLECTION_HOST_BOUND = true
PUBLIC_NEIGHBORHOOD_COLLECTION_TENANT_VALIDATED = true

PUBLIC_PROPERTY_DETAIL_HOST_BOUND = true
PUBLIC_PROPERTY_DETAIL_TENANT_FILTER = true
PUBLIC_PROPERTY_DETAIL_CARDINALITY_EXPLICIT = true
PUBLIC_PROPERTY_DETAIL_MAYBE_SINGLE_AUTHORITY = false

PUBLIC_PROPERTY_MEDIA_POLICY_SERVER_BOUND = true
PUBLIC_PROPERTY_RAW_VIDEO_URL_SERIALIZED = false
PUBLIC_PROPERTY_RAW_TOUR_URL_SERIALIZED = false
PUBLIC_PROPERTY_RAW_UNSAFE_MEDIA_SERIALIZED = false

CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
```

All previous Definition of Done assertions and prohibitions remain binding.

---

## 9. Preflight amendment scope integrity

The amendment PR must change exactly these four documentation files:

```text
docs/architecture/governance/DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/psg-01-public-surface-security-inventory.md
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/psg-01-planning-submission.md
docs/architecture/impact-analysis/PSG-01-preflight-planning-amendment.md
```

Expected assertions:

```text
CHANGED_DOCUMENTS = 4
PLANNING_RUNTIME_FILES_CHANGED = 0
PLANNING_MIGRATIONS_CHANGED = 0
PLANNING_RLS_GRANTS_CHANGED = 0
PLANNING_AUTH_STORAGE_CHANGED = 0
PLANNING_DEPENDENCY_LOCKFILE_CHANGED = 0
PLANNING_WORKFLOW_CHANGED = 0
PLANNING_GENERATED_ROUTE_CHANGED = 0
PLANNING_FILES_OUTSIDE_ALLOWED = 0
```

---

## 10. Required corrected planning Release Gate

The canonical Release Gate must remain fully green with all inherited checks:

```text
PTC-01
PTR-01
PSC-01
PPR-GN-01
PTW-01 authority
PTW-01 SQL structural
LSH-01 unit
LSH-01 runtime
LSH-01 structural
LSH-01 SQL structural
typecheck
build
build:dev
deterministic route-tree generation
```

No PSG runtime suite is expected in this planning-only PR.

The new artifact must be bound to the corrected final planning HEAD, not the rejected HEAD.

---

## 11. Preflight amendment direct final audit checklist

The planning audit must confirm:

1. `main` remains at `443b537aa68d007b729aba37ee87d6cc1f62e344` while the PR is open;
2. exactly one PSG-01 amendment branch and PR exist;
3. exactly four documentation files changed;
4. `bootstrapAdmin` is directly inventoried and its deletion decision is explicit;
5. no replacement public or server-function bootstrap authority is authorized;
6. non-bootstrap code in `admin.functions.ts` is explicitly immutable;
7. repository-owned DLQ scheduler evidence is correctly recorded as absent;
8. no external scheduler/provider is inferred;
9. dedicated bearer auth, unconfigured fail-closed behavior and operator runbook are frozen;
10. PTW replay business semantics remain immutable;
11. stale PTW and portal-QA auth assertions are narrowly reconciled in future implementation scope;
12. all original HTML, destination, CSRF and tenant-read planning remains binding;
13. `FILES_ALLOWED` includes only the four newly required implementation files plus the accepted envelope;
14. migrations, RLS, grants, Auth, Storage, scheduler and workflow changes remain prohibited;
15. Release Gate artifact is tied to the exact amendment HEAD;
16. no blocking review or unresolved thread exists;
17. implementation resume remains unauthorized after amendment audit.

---

## 12. Preflight amendment delta submitted for audit

### Direct findings

```text
PUBLIC_BOOTSTRAP_ADMIN_SERVER_FN_PRESENT = true
PUBLIC_BOOTSTRAP_ADMIN_SERVER_FN_AUTH_MIDDLEWARE = false
PUBLIC_BOOTSTRAP_ADMIN_SERVER_FN_FIRST_PARTY_CALLER = false
DLQ_REPLAY_REPOSITORY_PRODUCTION_SCHEDULER = absent
DLQ_REPLAY_FIRST_PARTY_RUNTIME_CALLER = absent
DLQ_REPLAY_LEGACY_QA_APIKEY_EXPECTATION = true
PTW_DLQ_LEGACY_AUTH_ASSERTION = true
```

### Frozen decisions

```text
BOOTSTRAP_PUBLIC_ROUTE = delete
BOOTSTRAP_ANONYMOUS_SERVER_FN = delete
BOOTSTRAP_RUNTIME_REPLACEMENT = prohibited
BOOTSTRAP_OPERATOR_ONLY_RUNBOOK = required

DLQ_SECRET_ENV = PORTAL_DLQ_RETRY_SECRET
DLQ_TRANSPORT = Authorization: Bearer
DLQ_PUBLISHABLE_KEY_AUTH = prohibited
DLQ_LEGACY_X_CRON_SECRET_AUTH = prohibited
DLQ_REPOSITORY_SCHEDULER_CREATION = prohibited
DLQ_UNCONFIGURED_ROUTE = deny all
DLQ_OPERATOR_RUNBOOK = required
DLQ_HOMOLOGATION_ENABLEMENT = operator evidence required
```

### Newly added FILES_ALLOWED

```text
src/lib/api/admin.functions.ts                            # delete bootstrapAdmin export only
src/lib/__tests__/public-tenant-writer-authority.spec.ts   # DLQ auth assertion only
tests/portals/test_public_endpoints.py                    # DLQ auth case only
docs/runbooks/portal-dlq-retry.md
```

### Scope integrity

```text
RUNTIME_FILES_CHANGED = 0
DEPENDENCIES_CHANGED = 0
LOCKFILE_CHANGED = 0
MIGRATIONS_CHANGED = 0
RLS_GRANTS_CHANGED = 0
AUTH_STORAGE_CHANGED = 0
WORKFLOW_CHANGED = 0
IMPLEMENTATION_RESUME_AUTHORIZED = false
```

---

## 13. Terminal amendment state

```text
ORIGINAL_PLANNING_STATE = Accepted
ORIGINAL_PLANNING_MERGED = true
FAILED_IMPLEMENTATION_PR = 46
FAILED_IMPLEMENTATION_PR_STATE = Closed — Unmerged
RUNTIME_IMPLEMENTATION_APPLIED = false
PREFLIGHT_PLANNING_AMENDMENT_AUTHORIZED = true
PREFLIGHT_PLANNING_AMENDMENT_STATE = Ready for Direct External Audit
AMENDMENT_MERGE_AUTHORIZED = false
IMPLEMENTATION_RESUME_AUTHORIZED = false
NEXT_ACTION = direct audit of exact amendment PR and Release Gate artifact
LOVABLE_AUTHORIZED = false
```

No implementation instruction is emitted by this submission.
