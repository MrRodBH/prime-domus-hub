# PSG-01 — Public Surface Security Inventory

## Status

**Preflight-amended planning inventory — ready for direct external audit; no runtime change**

```text
STAGE_ID = PSG-01
CURRENT_MAIN_BASELINE = 443b537aa68d007b729aba37ee87d6cc1f62e344
CANONICAL_ISSUE = 4
ORIGINAL_PLANNING_PR = 44
ORIGINAL_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
IMPLEMENTATION_PR = 46
IMPLEMENTATION_PR_STATE = Closed — Unmerged
RUNTIME_IMPLEMENTATION_APPLIED = false
IMPLEMENTATION_FINAL_DIFF_FILES = 0
PREFLIGHT_PLANNING_AMENDMENT_AUTHORIZED = true
PREFLIGHT_PLANNING_AMENDMENT_STATE = Ready for Direct External Audit
IMPLEMENTATION_RESUME_AUTHORIZED = false
PLANNING_ONLY = true
LOVABLE_AUTHORIZED = false
```

---

## 1. Inventory method

This inventory was produced by direct inspection of the current GitHub `main`, generated schema types, accepted predecessor evidence and the direct final audit finding on planning PR #44.

Classification:

```text
DIRECT_FINDING = proven by current repository content
SCHEMA_FINDING = proven by current generated database types
HYPOTHESIS = requires implementation preflight or external operator evidence
HISTORICAL_CONTEXT = informative only; not current runtime authority
```

No Lovable report, runtime patch, migration, database write or inferred historical branch content was used as current authority.

The corrected inventory adds public catalog, city, neighborhood and property-detail surfaces that were directly proven but absent from the rejected planning HEAD.

The accepted inventory was merged through PR #44. Direct implementation preflight on PR #46 later proved an omitted anonymous bootstrap server function and unresolved DLQ caller/test assumptions. PR #46 was closed unmerged with zero final file diff. This amendment records those findings without changing runtime.

---

## 2. Privileged and operational entrypoints

### 2.1 Public bootstrap-admin

```text
FILE = src/routes/api/public/bootstrap-admin.ts
ROUTE = POST /api/public/bootstrap-admin
CLASSIFICATION = DIRECT_FINDING
```

Observed flow:

```text
anonymous JSON email/password
→ supabaseAdmin
→ count global admin roles
→ auth.admin.listUsers/createUser(email_confirm=true)
→ insert user_roles(role=admin)
```

Security properties:

```text
AUTHENTICATED_OPERATOR_REQUIRED = false
DEDICATED_SECRET_REQUIRED = false
REQUEST_SIGNATURE_REQUIRED = false
PRIVATE_NETWORK_BOUNDARY_PROVEN = false
SERVICE_ROLE_USED = true
PRIVILEGED_IDENTITY_CREATION = true
GLOBAL_ADMIN_ROLE_CREATION = true
```

Generated route evidence:

```text
FILE = src/routeTree.gen.ts
BOOTSTRAP_ROUTE_REGISTERED = true
MANUAL_EDIT_ALLOWED = false
```

Planning consequence:

```text
DEFAULT_IMPLEMENTATION = delete public route
REPLACEMENT_PUBLIC_ROUTE = prohibited
OPERATOR_RUNBOOK = required
CALLER_PREFLIGHT = resolved — no first-party caller
```

### 2.1.1 Anonymous bootstrapAdmin server function

```text
FILE = src/lib/api/admin.functions.ts
SYMBOL = bootstrapAdmin
SURFACE = createServerFn POST
AUTH_MIDDLEWARE = absent
SERVICE_ROLE_USED = true
AUTH_USER_CREATION = true
GLOBAL_ADMIN_ROLE_CREATION = true
FIRST_PARTY_REFERENCES = definition only
CLASSIFICATION = DIRECT_FINDING
```

Amended consequence:

```text
IMPLEMENTATION = delete bootstrapAdmin export only
OTHER_ADMIN_FUNCTIONS = immutable
PUBLIC_OR_SERVER_FN_REPLACEMENT = prohibited
OPERATOR_ONLY_RUNBOOK = required
```

### 2.2 Portal DLQ retry

```text
FILE = src/routes/api/public/hooks/portal-dlq-retry.ts
ROUTE = POST /api/public/hooks/portal-dlq-retry
CLASSIFICATION = DIRECT_FINDING
```

Current accepted credentials:

```text
apikey == SUPABASE_PUBLISHABLE_KEY
OR
x-cron-secret == CRON_SECRET
```

Current sequence:

```text
credential comparison
→ supabaseAdmin import
→ portal_sync_dlq selection
→ accepted PTW connector revalidation
→ accepted PTW ingestPortalLead
→ retry/resolution RPC
```

Security conclusion:

```text
PUBLISHABLE_KEY_IS_OPERATIONAL_SECRET = false
DEDICATED_OPERATIONAL_SECRET = absent
PTW_BUSINESS_REPLAY_PATH = accepted and frozen
PSG_AUTH_SCOPE = authentication boundary only
```

Repository caller evidence:

```text
PRODUCTION_SCHEDULER_DEFINITION = absent
FIRST_PARTY_RUNTIME_CALLER = absent
PG_CRON_HTTP_CALL_FOR_ROUTE = absent
DEPLOYMENT_WORKFLOW_CALLER = absent
LEGACY_QA_CALLER = tests/portals/test_public_endpoints.py
NEGATIVE_SECURITY_CALLER = tests/security/test_tenant_isolation.py
PTW_STRUCTURAL_AUTH_ASSERTION = src/lib/__tests__/public-tenant-writer-authority.spec.ts
EXTERNAL_SCHEDULER_IDENTITY = unproven
EXTERNAL_SCHEDULER_SUPPORTED_HEADER = unproven
SECRET_ROTATION_PROCEDURE = absent
```

Amended consequence:

```text
AUTH_IMPLEMENTATION = dedicated Authorization Bearer secret
UNCONFIGURED_ROUTE = deny all
REPOSITORY_SCHEDULER_CREATION = prohibited
OPERATOR_RUNBOOK = required
HOMOLOGATION_ENABLEMENT = blocked until operator evidence
LEGACY_QA_APIKEY_EXPECTATION = remove
PTW_REPLAY_BUSINESS_PATH = immutable
```

---

## 3. Server-function CSRF boundary

```text
FILE = src/start.ts
CLASSIFICATION = DIRECT_FINDING
```

Current Start instance:

```text
functionMiddleware = attachSupabaseAuth, attachTenantHeader
requestMiddleware = errorMiddleware
createCsrfMiddleware = absent
```

Required outcome:

```text
SERVER_FUNCTION_CSRF_MIDDLEWARE_PRESENT = true
CROSS_SITE_SERVER_FUNCTION_REQUEST_DENIED = true
PUBLIC_SERVER_ROUTES_NOT_ACCIDENTALLY_BLOCKED = true
```

Implementation preflight:

```text
ADDITIONAL_TRUSTED_ORIGINS = HYPOTHESIS
DEPLOYMENT_PROXY_ORIGIN_BEHAVIOR = HYPOTHESIS
```

Prohibited resolution:

```text
allowRequestsWithoutOriginCheck = false
permissive missing-origin bypass = false
```

---

## 4. Persisted HTML execution inventory

### 4.1 CMS dynamic pages

```text
PUBLIC_READ = src/lib/api/pages.functions.ts::obterPaginaPublica
CONTRACT = src/lib/public-page-contract.ts
CONSUMER = src/components/site/CmsPageRenderer.tsx
CLASSIFICATION = DIRECT_FINDING
```

Authority already accepted:

```text
HOST_TENANT_BOUND = true
TENANT_PLUS_SLUG = true
PUBLISHED_ONLY = true
LIMIT_2 = true
TENANT_POST_VALIDATION = true
TENANT_ID_EXCLUDED_FROM_DTO = true
```

Content-security gap:

```text
richtext.data.html = string only
renderer = dangerouslySetInnerHTML
server sanitizer = absent
```

Persisted destinations:

```text
hero.imagem_url → CSS background URL
hero.cta_href → anchor href
image.url → img src
gallery.imagens[].url → img src
video.embed_url → iframe src
cta.botao_href → anchor href
seo.canonical → canonical destination
seo.og_image → metadata image destination
```

### 4.2 Blog posts

```text
PUBLIC_READ = src/lib/api/blog.functions.ts::obterPostPublico
CONSUMER = src/routes/blog.$slug.tsx
CLASSIFICATION = DIRECT_FINDING
```

Current detail flow:

```text
global slug + status=publicado
→ supabaseAdmin
→ maybeSingle
→ raw conteudo
→ dangerouslySetInnerHTML
```

Content fields:

```text
blog_posts.conteudo = persisted HTML
blog_posts.imagem_capa = persisted destination
meta_title/meta_description = persisted metadata
```

### 4.3 Launch detail

```text
PUBLIC_READ = src/lib/api/lancamentos.functions.ts::obterLancamentoPublico
CONSUMER = src/routes/lancamentos.$slug.tsx
CLASSIFICATION = DIRECT_FINDING
```

Current execution:

```text
launch_projects.descricao → dangerouslySetInnerHTML
launch_projects.video_url → string replacement → iframe src
```

Additional destinations:

```text
signed images
signed PDFs
cover image
OG image
broker WhatsApp link
```

### 4.4 Property detail and catalog DTO

```text
PUBLIC_READ = src/lib/api/catalogo.functions.ts::obterImovel
CONSUMER = src/routes/imovel.$slug.tsx
CLASSIFICATION = DIRECT_FINDING
```

Current property detail authority:

```text
strict tenant authority = absent
supabaseAdmin import = before accepted tenant
selector = global slug + status=ativo
cardinality = maybeSingle
limit(2) = absent
tenant post-validation = absent
```

Persisted or derived destinations serialized by the server read:

```text
video_url
tour_url
imagem_capa
imovel_imagens.url
imovel_imagens.thumb
corretor.foto_url
```

Current destination behavior:

```text
server central policy = absent
Storage signing after accepted tenant = false
unknown embed denied before DTO = false
raw property media DTO = true
```

### 4.5 Sanitizer dependency state

```text
FILE = package.json
sanitize-html direct dependency = absent
@types/sanitize-html direct dependency = absent
CLASSIFICATION = DIRECT_FINDING
```

Planning decision:

```text
sanitize-html = 2.17.5 exact
@types/sanitize-html = 2.16.1 exact
server-side single policy = required
client-only sanitation = prohibited
```

---

## 5. Persisted destination inventory

### 5.1 Generic embed conversion

```text
FILE = src/lib/embed-url.ts
CLASSIFICATION = DIRECT_FINDING
```

Known transformations:

```text
YouTube
Vimeo
Matterport
Kuula
```

Unsafe fallback:

```text
unknown valid URL → original URL returned
```

Consumers include property video and tour iframes.

### 5.2 Contact map

```text
FILE = src/routes/contato.tsx
SOURCE = site_settings.pagina_contato.mapa_url
SINK = iframe src
CLASSIFICATION = DIRECT_FINDING
```

No shared host/path allowlist is applied.

### 5.3 Header and menu

```text
FILES:
- src/components/site/Header.tsx
- src/lib/api/menu.functions.ts
CLASSIFICATION = DIRECT_FINDING
```

Persisted sinks:

```text
website_menu_items.url → anchor href or router Link
website_menu_items.target → anchor target
site branding logo_url → img src
site contact WhatsApp → anchor href
```

### 5.4 Footer and social destinations

```text
FILE = src/components/site/Footer.tsx
CLASSIFICATION = DIRECT_FINDING
```

Observed normalization:

```text
http(s) → accepted unchanged
other nonempty value → https:// prefix
```

Persisted sinks:

```text
footer columns → href
Instagram/Facebook/LinkedIn → href
branding logo → img src
```

### 5.5 Institutional content

```text
FILE = src/routes/sobre.tsx
CLASSIFICATION = DIRECT_FINDING
```

Persisted sinks:

```text
pagina_sobre.hero_image_url → img src
pagina_sobre.cta_url → router destination cast
```

### 5.6 Property maps, media and embeds

```text
FILES:
- src/lib/api/catalogo.functions.ts
- src/lib/embed-url.ts
- src/routes/imovel.$slug.tsx
CLASSIFICATION = DIRECT_FINDING
```

Known internally constructed Google Maps URLs are deterministic. Property video/tour values depend on `toEmbedUrl`, whose unknown-host fallback is unsafe. Property cover, gallery and broker images are returned by the public read before any central destination policy.

Required ownership:

```text
primary authority = server public-read boundary
renderer checks = defensive only
raw fallback = prohibited
```

---

## 6. Residual public tenant-read inventory

### 6.1 Website menu

```text
FILE = src/lib/api/menu.functions.ts
TABLE = website_menu_items
CLASSIFICATION = DIRECT_FINDING + SCHEMA_FINDING
```

Current query:

```text
global anonymous client
→ visible=true
→ order
```

Missing:

```text
Host tenant resolution
tenant_id equality
collection tenant post-validation
safe URL output
```

### 6.2 Blog

```text
FILE = src/lib/api/blog.functions.ts
TABLES = blog_posts, blog_categorias
CLASSIFICATION = DIRECT_FINDING + SCHEMA_FINDING
```

Current public list/categories:

```text
global anonymous client
no tenant equality
```

Current public detail:

```text
supabaseAdmin
global slug
status=publicado
maybeSingle
```

### 6.3 Launches

```text
FILE = src/lib/api/lancamentos.functions.ts
CLASSIFICATION = DIRECT_FINDING + SCHEMA_FINDING
```

Current public reads:

```text
statuses = global anonymous
amenities = global anonymous
list = global anonymous
detail = global slug + maybeSingle
children = project_id only
```

Generated schema proves tenant identity on launch project and child tables used by the public detail flow.

### 6.4 Property catalog, cities and neighborhoods

```text
FILE = src/lib/api/catalogo.functions.ts
PUBLIC_FUNCTIONS:
- listarImoveis
- listarCidades
- listarBairros
CLASSIFICATION = DIRECT_FINDING + SCHEMA_FINDING
```

Current collection authority:

```text
global anonymous client
Host resolution = absent
tenant_id equality = absent
every-row tenant post-validation = absent
tenant_id excluded after validation = not proven
```

Additional proven behavior:

```text
listarImoveis signs or preserves property cover destinations
listarBairros calculates counts from a global active-property collection
listarCidades returns a global city collection
```

Required contract:

```text
Host
→ accepted tenant
→ tenant_id equality
→ tenant-scoped collection
→ every-row tenant post-validation
→ safe tenant-free DTO
```

### 6.5 Property detail

```text
FILE = src/lib/api/catalogo.functions.ts
PUBLIC_FUNCTION = obterImovel
CLASSIFICATION = DIRECT_FINDING + SCHEMA_FINDING
```

Current flow:

```text
strict { slug }
→ supabaseAdmin
→ global slug + status=ativo
→ maybeSingle
→ Storage signing
→ raw destination DTO
```

Missing:

```text
Host-derived tenant before service role
tenant_id equality
limit(2)
explicit 0/1/N
tenant post-validation
nested tenant compatibility
destination policy before DTO
```

Planning assertions:

```text
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

### 6.6 Existing PTR suite scope

```text
FILE = src/lib/__tests__/public-tenant-read-binding.spec.ts
CLASSIFICATION = DIRECT_FINDING
```

Current checks cover:

```text
required tenant helper
site settings
Meta settings
CMS page
campaign listing
campaign consumer
```

They do not cover blog, menu, launch, catalog, city, neighborhood or property-detail reads.

Governance interpretation:

```text
PTR01_HISTORICAL_STATE = unchanged
PSG01_CURRENT_MAIN_RESIDUAL_FINDING = true
PTR01_REOPENED = false
```

---

## 7. Accepted boundaries that PSG-01 must preserve

### 7.1 PTW-01

```text
src/lib/public-writers/* = frozen
shared public lead writer = frozen
portal immediate/replay business path = frozen
campaign-event DML hardening = frozen
```

PSG may modify only DLQ route authentication, not its business mutation.

`src/lib/api/catalogo.functions.ts` contains both public reads and the accepted lead mutation adapter. Future implementation authority is restricted to:

```text
listarImoveis
listarCidades
listarBairros
obterImovel
public-read-only helpers and DTO types required by those functions
```

Immutable inside the same file:

```text
publicLeadSchema
enviarLead
requirePublicWriterTenantFromRequest
writePublicLead
lead recipient authority
lead tenant authority
PTW public mutation behavior
```

### 7.2 PPR-GN-01

CMS page Host/tenant/cardinality authority remains accepted. PSG adds content sanitization and destination validation after authority; it does not replace the page tenant resolver.

### 7.3 LSH/Auth/Storage

```text
create_manual_lead = frozen
lead authorization boundaries = frozen
Supabase Auth configuration = frozen
Storage authorization and upload boundaries = frozen
```

Storage signing implementation inside authorized public read functions may be reordered only to occur after accepted tenant/resource authority. This does not authorize changes to Storage authorization, upload or bucket policy.

---

## 8. Preflight-amended privileged and operational envelope

```text
src/routes/api/public/bootstrap-admin.ts                  # deletion only
src/lib/api/admin.functions.ts                            # delete bootstrapAdmin export only
src/routes/api/public/hooks/portal-dlq-retry.ts          # authentication boundary only
src/lib/operational-route-auth.server.ts                 # new dedicated auth boundary
src/lib/__tests__/public-tenant-writer-authority.spec.ts   # DLQ auth assertion only
tests/portals/test_public_endpoints.py                    # DLQ auth case only
docs/runbooks/initial-admin-bootstrap.md
docs/runbooks/portal-dlq-retry.md
```

Immutability:

```text
admin.functions.ts non-bootstrap symbols = immutable
PTW replay business path = immutable
portal QA unrelated cases = immutable
repository scheduler/provider/workflow creation = prohibited
```

---

## 9. Proposed central boundaries

```text
src/lib/operational-route-auth.server.ts
→ dedicated bearer-secret parsing and constant-time verification

src/lib/public-content-security.ts
→ pure URL, destination, target and embed decisions

src/lib/public-html-sanitizer.server.ts
→ pinned server-side sanitizer policy
```

No route, API function or renderer may create a competing allowlist, fallback or heuristic.

---

## 10. Proposed implementation envelope summary

New files:

```text
src/lib/operational-route-auth.server.ts
src/lib/public-content-security.ts
src/lib/public-html-sanitizer.server.ts
src/lib/__tests__/public-surface-security.spec.ts
src/lib/__tests__/public-surface-tenant-read.spec.ts
run-public-surface-security-specs.ts
run-public-surface-tenant-read-specs.ts
docs/runbooks/initial-admin-bootstrap.md
```

Existing public-read files include:

```text
src/lib/public-page-contract.ts
src/lib/api/blog.functions.ts
src/lib/api/lancamentos.functions.ts
src/lib/api/menu.functions.ts
src/lib/api/site.functions.ts
src/lib/api/catalogo.functions.ts # public-read scope only
src/lib/embed-url.ts
```

Generated route-tree change is permitted only as a deterministic consequence of deleting bootstrap-admin.

---

## 11. Required future evidence additions

The PSG tenant-read suite must add executable coverage for:

```text
listarImoveis
listarCidades
listarBairros
obterImovel
```

Collections:

```text
unknown Host → deny before query
missing tenant → deny
foreign row → deny
mixed-tenant collection → deny
same-tenant collection → accept
tenant_id absent from DTO
```

Property detail:

```text
0 rows → not found
1 same-tenant row → accepted
N rows → ambiguous and denied
foreign row → denied
missing tenant_id → denied
query error → fail closed
```

Structural evidence:

```text
Host precedes service role
tenant equality precedes slug equality
limit(2) present
maybeSingle authority absent
Storage signing after tenant/resource authority
```

Destination evidence:

```text
safe signed HTTPS media accepted
safe approved relative asset accepted
unsafe protocols denied
protocol-relative denied
credential-bearing denied
unknown video/tour provider denied
HTTP embed denied
exact approved provider/path accepted
raw fallback absent
```

PTW preservation evidence:

```text
publicLeadSchema unchanged
enviarLead unchanged
writePublicLead delegation preserved
PTW authority green
PTW SQL structural green
```

---

## 12. Preflight-amended planning conclusion

```text
PSG01_SURFACE_INVENTORY_COMPLETE = true
SECOND_BOOTSTRAP_AUTHORITY_INVENTORIED = true
DLQ_REPOSITORY_CALLER_EVIDENCE_RECONCILED = true
PUBLIC_CATALOG_AND_PROPERTY_FINDINGS_INCLUDED = true
DIRECT_FINDINGS_SEPARATED_FROM_HYPOTHESES = true
CATALOGO_PUBLIC_READ_SCOPE_ONLY = true
CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
ORIGINAL_PLANNING_STATE = Accepted
ORIGINAL_PLANNING_MERGED = true
IMPLEMENTATION_PR = 46
IMPLEMENTATION_PR_STATE = Closed — Unmerged
RUNTIME_IMPLEMENTATION_APPLIED = false
PREFLIGHT_PLANNING_AMENDMENT_STATE = Ready for Direct External Audit
AMENDMENT_MERGE_AUTHORIZED = false
IMPLEMENTATION_RESUME_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

The next action is direct external audit of the exact amendment PR and Release Gate artifact. No implementation instruction is emitted by this inventory.
