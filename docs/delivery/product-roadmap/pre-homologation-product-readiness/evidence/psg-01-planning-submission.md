# PSG-01 — Planning Submission

## Status

**Planning Accepted and Merged — implementation pending explicit authorization**

```text
STAGE_ID = PSG-01
BASELINE_MAIN = 55e0a7b95aedd767c605bceb1ea84999ecf08145
CANONICAL_ISSUE = 4
PLANNING_BRANCH = agent/psg-01-planning
REJECTED_PLANNING_HEAD = 9fb1e1c903702b3f4f07ced1715c01e4edbd4cf8
PSG01_PLANNING_PR = 44
PSG01_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PLANNING_ONLY = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
PSG01_PLANNING_MERGE_AUTHORIZED = false
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

---

## 1. Submission purpose

This submission packages the corrected Architecture First planning outcome for the Public Surface Security Gate.

It contains no runtime, dependency, lockfile, migration, RLS, grant, Auth, Storage, public-writer, workflow or generated-route change.

The correction resolves the final-audit blocker on PR #44 by adding the directly proven public catalog, city, neighborhood and property-detail surfaces to the inventory, trust-boundary model, future `FILES_ALLOWED`, required tests, Definition of Done and final audit criteria.

Planning merge and implementation authorization remain separate decisions. The accepted planning was merged through PR #44 at `0f23e4198cf7caf1ad046a32b861f4397994a607`; no implementation was started or authorized by that merge.

---

## 2. Planning authority

```text
docs/architecture/impact-analysis/
PSG-01-public-surface-security-gate-impact-analysis.md

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-public-surface-security-inventory.md
```

The Impact Analysis is normative for implementation scope, `FILES_ALLOWED`, prohibitions, tests, Definition of Done, fail-closed behavior and final audit criteria.

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

## 9. Planning scope integrity

The corrected planning PR must still change exactly these three documentation files:

```text
docs/architecture/impact-analysis/
PSG-01-public-surface-security-gate-impact-analysis.md

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-public-surface-security-inventory.md

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-planning-submission.md
```

Expected assertions:

```text
CHANGED_DOCUMENTS = 3
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

## 11. Corrected direct final audit checklist

The planning audit must confirm:

1. `main` remains at the audited baseline while the PR is open;
2. exactly one PSG-01 planning branch and PR exist;
3. exactly three documentation files changed;
4. every material finding is directly supported or labeled as hypothesis;
5. the implementation envelope covers the canonical issue families and all proven residual public-read surfaces;
6. `catalogo.functions.ts` is authorized only for the four public-read functions and directly required read-only helpers/DTO types;
7. `publicLeadSchema`, `enviarLead`, `writePublicLead` delegation and PTW writer modules remain explicitly frozen;
8. bootstrap removal does not authorize a replacement public service-role endpoint;
9. DLQ authentication cannot alter the accepted PTW business path;
10. CSRF planning preserves intentional public server routes;
11. HTML and destination policies are centralized, server-side and fail-closed;
12. property media, video and tour are validated before DTO serialization;
13. catalog, cities, neighborhoods and property detail are Host/tenant-bound with explicit collection or 0/1/N evidence;
14. service role and Storage signing occur only after authority;
15. exact sanitizer dependencies and lockfile impact are frozen;
16. `FILES_ALLOWED` is complete but does not authorize unrelated refactors;
17. migrations, RLS, grants, Auth, Storage boundaries and accepted writer boundaries remain prohibited;
18. Release Gate artifact is tied to the corrected final planning HEAD;
19. implementation remains unauthorized after planning audit.

---

## 12. Terminal planning state

```text
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PSG01_PLANNING_PR = 44
PSG01_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_PLANNING_MERGE_AUTHORIZED = false
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
NEXT_ACTION = explicit authorization for PSG-01 implementation execution
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

No implementation instruction is emitted by this submission.
