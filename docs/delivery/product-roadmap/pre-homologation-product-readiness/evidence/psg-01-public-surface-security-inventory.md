# PSG-01 — Public Surface Security Inventory

## Status

**Audited planning inventory — no runtime change**

```text
STAGE_ID = PSG-01
BASELINE_MAIN = 55e0a7b95aedd767c605bceb1ea84999ecf08145
CANONICAL_ISSUE = 4
PLANNING_ONLY = true
IMPLEMENTATION_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

---

## 1. Inventory method

This inventory was produced by direct inspection of the current GitHub `main` and generated schema types.

Classification:

```text
DIRECT_FINDING = proven by current repository content
SCHEMA_FINDING = proven by current generated database types
HYPOTHESIS = requires implementation preflight or external operator evidence
HISTORICAL_CONTEXT = informative only; not current runtime authority
```

No Lovable report, runtime patch, migration, database write or inferred historical branch content was used as current authority.

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
CALLER_PREFLIGHT = required
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

Caller facts not proven by repository:

```text
SCHEDULER_IDENTITY = HYPOTHESIS
SCHEDULER_SUPPORTED_HEADER = HYPOTHESIS
SECRET_ROTATION_PROCEDURE = HYPOTHESIS
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

Issue #4 adds the explicit accepted planning requirement:

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

Persisted destinations reaching the renderer:

```text
hero.imagem_url → CSS background URL
hero.cta_href → anchor href
image.url → img src
gallery.imagens[].url → img src
video.embed_url → iframe src
cta.botao_href → anchor href
seo.canonical → canonical/og URL
seo.og_image → metadata image URL
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
launch_projects.descricao
→ dangerouslySetInnerHTML

launch_projects.video_url
→ string replacement watch?v=/embed/
→ iframe src
```

Additional destinations:

```text
signed images
signed PDFs
cover image
OG image
broker WhatsApp link
```

### 4.4 Sanitizer dependency state

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

No central destination policy is applied.

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

### 5.6 Property maps and embeds

```text
FILE = src/routes/imovel.$slug.tsx
CLASSIFICATION = DIRECT_FINDING
```

Known internally constructed Google Maps URLs are deterministic. Video/tour values depend on `toEmbedUrl`, whose unknown-host fallback is unsafe.

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

Generated schema proves:

```text
website_menu_items.tenant_id = string
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

Generated schema proves:

```text
blog_posts.tenant_id = string
blog_categorias.tenant_id = string
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

Generated schema proves tenant identity on:

```text
launch_projects
launch_statuses
launch_amenities
launch_project_amenities
launch_project_imagens
launch_pdfs
launch_payment_conditions
launch_units
```

### 6.4 Existing PTR suite scope

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

They do not cover blog, menu or launch reads. Therefore current green PTR evidence is not evidence that those residual surfaces are tenant-bound.

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
public writer authority modules = frozen
shared public lead writer = frozen
portal immediate/replay business path = frozen
campaign-event DML hardening = frozen
```

PSG may modify only the DLQ route authentication precondition, not its business mutation.

### 7.2 PPR-GN-01

CMS page Host/tenant/cardinality authority remains accepted. PSG adds content sanitization and destination validation after authority; it does not replace the page tenant resolver.

### 7.3 LSH/Auth/Storage

```text
create_manual_lead = frozen
lead authorization boundaries = frozen
Supabase Auth configuration = frozen
Storage authorization and upload boundaries = frozen
```

---

## 8. Proposed central boundaries

```text
src/lib/operational-route-auth.server.ts
→ dedicated bearer secret parsing and constant-time verification

src/lib/public-content-security.ts
→ pure URL, destination, target and embed decisions

src/lib/public-html-sanitizer.server.ts
→ pinned server-side sanitizer policy
```

No route or renderer may create a competing allowlist, fallback or heuristic.

---

## 9. Proposed implementation envelope summary

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

Existing runtime files are frozen in the Impact Analysis `FILES_ALLOWED` list. Generated route-tree change is permitted only as a deterministic consequence of deleting bootstrap-admin.

---

## 10. Planning conclusion

```text
PSG01_SURFACE_INVENTORY_COMPLETE = true
DIRECT_FINDINGS_SEPARATED_FROM_HYPOTHESES = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

The only permitted next action is direct audit of the PSG-01 planning PR.