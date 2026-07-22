# PSG-01 — Public Surface Security Gate Impact Analysis

## Status

**Planning Accepted and Merged — implementation pending explicit authorization**

```text
STAGE_ID = PSG-01
PREDECESSOR = PTW-01 Accepted
BASELINE_MAIN = 55e0a7b95aedd767c605bceb1ea84999ecf08145
CANONICAL_ISSUE = 4
AUTHORIZED_EXECUTOR = GitHub-native
PSG01_PLANNING_PR = 44
PSG01_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
PSG01_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PLANNING_ONLY = true
IMPLEMENTATION_AUTHORIZED = false
IMPLEMENTATION_STARTED = false
PLANNING_MERGE_AUTHORIZED = false
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
MAX_ACTIVE_PLANNING_PRS = 1
```

---

## 1. Purpose

PSG-01 is the Architecture First gate for public privileged entrypoints, public operational entrypoints, persisted public content execution, persisted public destinations, residual public tenant reads and server-function CSRF protection before controlled homologation.

This document freezes the implementation envelope. It does not implement, patch, migrate, grant, revoke, sanitize, delete or otherwise change runtime behavior.

PSG-01 is not a reopening of PTH-01, PTR-01, PPR-GN-01 or PTW-01. Historical terminal or accepted classifications remain unchanged. Findings below describe the audited current `main` and define a new bounded security outcome.

The correction incorporated after direct audit of planning HEAD `9fb1e1c903702b3f4f07ced1715c01e4edbd4cf8` adds the directly proven public catalog/property-read surfaces previously omitted from the inventory and future implementation envelope.

The corrected Architecture First planning was accepted and merged through PR #44. That documentation-only merge did not start or authorize implementation.

---

## 2. Authority and predecessor state

Authority order:

1. audited GitHub `main` at `0f23e4198cf7caf1ad046a32b861f4397994a607`;
2. binding delivery map;
3. accepted PTW-01 final evidence;
4. canonical issue #4;
5. direct final audit finding recorded on PR #44;
6. this corrected planning document after direct audit and merge.

Predecessor and planning state:

```text
PTW01_IMPLEMENTATION_STATE = Accepted
PTW01_IMPLEMENTATION_MERGED = true
PTW01_IMPLEMENTATION_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a
PTW01_IMPLEMENTATION_MERGE_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
CURRENT_MAIN = 0f23e4198cf7caf1ad046a32b861f4397994a607
PSG01_PLANNING_STATE = Accepted
PSG01_PLANNING_MERGED = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
LOVABLE_AUTHORIZED = false
```

---

## 3. Security objectives

PSG-01 must establish all of the following as one coherent public-surface boundary:

1. no anonymous HTTP authority may create a privileged administrative identity or role;
2. no publishable or public credential may authorize an operational replay endpoint;
3. persisted HTML must be sanitized by one pinned server-side policy before public execution;
4. persisted `href`, `src`, iframe and embed destinations must be validated by explicit policy before public DTO serialization;
5. custom TanStack Start configuration must install an explicit server-function CSRF boundary;
6. intentionally public server routes must remain separately reachable and must not acquire accidental browser-only CSRF semantics;
7. residual public blog, menu, launch, catalog, city, neighborhood and property-detail reads must be bound to accepted Host-derived tenant authority;
8. Storage signing and service-role access for public reads may begin only after accepted tenant and resource authority;
9. public DTOs must be tenant-free and destination-safe;
10. all security decisions must fail closed on absence, malformed input, ambiguity, unsupported protocol, unsupported destination, foreign tenant, missing tenant or missing server configuration.

---

## 4. Directly proven findings

### 4.1 Anonymous bootstrap-admin authority

`src/routes/api/public/bootstrap-admin.ts` currently exposes a public `POST` route that:

- accepts `email` and `password` from an unauthenticated request body;
- imports and uses `supabaseAdmin`;
- checks whether any global `admin` role exists;
- creates and confirms a Supabase Auth user when necessary;
- inserts a global `admin` role.

```text
PUBLIC_BOOTSTRAP_ADMIN_ROUTE_PRESENT = true
PUBLIC_BOOTSTRAP_ADMIN_CREATES_AUTH_USER = true
PUBLIC_BOOTSTRAP_ADMIN_CREATES_ADMIN_ROLE = true
PUBLIC_BOOTSTRAP_ADMIN_OPERATOR_AUTHORITY = false
```

### 4.2 Portal DLQ replay accepts a publishable credential

`src/routes/api/public/hooks/portal-dlq-retry.ts` currently accepts either:

```text
apikey == SUPABASE_PUBLISHABLE_KEY
OR
x-cron-secret == CRON_SECRET
```

A publishable key is not an operational authorization secret. The accepted PTW-01 replay business path is otherwise preserved and must not be duplicated or redesigned by PSG-01.

```text
DLQ_REPLAY_PUBLISHABLE_KEY_AUTH = true
DLQ_REPLAY_DEDICATED_SECRET_REQUIRED = true
DLQ_REPLAY_BUSINESS_MUTATION_OWNER = PTW-01
```

### 4.3 Custom Start configuration lacks explicit CSRF middleware

`src/start.ts` defines a custom Start instance with function and request middleware but does not install `createCsrfMiddleware()`.

The required boundary is server-function-specific:

```text
createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn"
})
```

A permissive missing-origin bypass is prohibited.

```text
CUSTOM_START_CONFIGURATION = true
SERVER_FUNCTION_CSRF_MIDDLEWARE_PRESENT = false
PUBLIC_SERVER_ROUTES_REQUIRE_SEPARATE_AUTHORITY = true
```

### 4.4 Persisted HTML executes without a pinned sanitizer

Direct public execution exists in:

- `CmsPageRenderer.tsx`: CMS rich-text block `d.html`;
- `blog.$slug.tsx`: `post.conteudo`;
- `lancamentos.$slug.tsx`: `d.descricao`.

All three use `dangerouslySetInnerHTML` with persisted content and no shared sanitizer boundary.

```text
PERSISTED_HTML_SANITIZER_PRESENT = false
PERSISTED_HTML_POLICY_PINNED = false
RAW_CMS_PAGE_HTML_EXECUTION = true
RAW_BLOG_HTML_EXECUTION = true
RAW_LAUNCH_HTML_EXECUTION = true
```

### 4.5 Persisted URL and embed destinations are not centrally constrained

Proven consumers include:

- CMS hero background, image, gallery, CTA and video blocks;
- blog cover image and HTML-contained links/images;
- launch video, images and document links;
- property video/tour embeds, cover, gallery and broker image;
- contact map iframe;
- site branding images, footer links and social links;
- website menu links;
- institutional CTA and hero image.

`src/lib/embed-url.ts` recognizes several providers but returns the original URL for an unknown host. Therefore an unknown destination can reach an iframe.

`src/lib/public-page-contract.ts` validates persisted URLs only as strings. `src/lib/api/catalogo.functions.ts` similarly serializes property destinations before any central server-side destination policy.

```text
CENTRAL_PUBLIC_URL_POLICY_PRESENT = false
UNKNOWN_EMBED_DESTINATION_DENIED = false
PROTOCOL_RELATIVE_DESTINATION_DENIED = false
UNSAFE_PROTOCOL_DENIED_BY_SHARED_POLICY = false
```

### 4.6 Residual public menu reads are global

`listarMenuPublico` uses a global anonymous client, has no Host tenant resolution and no `tenant_id` equality.

```text
PUBLIC_MENU_HOST_BOUND = false
PUBLIC_MENU_TENANT_FILTER = false
PUBLIC_MENU_ROW_TENANT_POST_VALIDATION = false
```

### 4.7 Residual public blog reads are global

Public blog list and categories use a global anonymous client. Public post detail uses `supabaseAdmin`, global `slug` and `maybeSingle()` without Host tenant authority.

```text
PUBLIC_BLOG_LIST_HOST_BOUND = false
PUBLIC_BLOG_CATEGORY_HOST_BOUND = false
PUBLIC_BLOG_DETAIL_HOST_BOUND = false
PUBLIC_BLOG_DETAIL_CARDINALITY_EXPLICIT = false
```

### 4.8 Residual public launch reads are global

Public launch statuses, amenities, list and detail use a global anonymous client. Detail resolves global `slug` with `maybeSingle()`, and child reads use only `project_id`.

```text
PUBLIC_LAUNCH_STATUS_HOST_BOUND = false
PUBLIC_LAUNCH_AMENITY_HOST_BOUND = false
PUBLIC_LAUNCH_LIST_HOST_BOUND = false
PUBLIC_LAUNCH_DETAIL_HOST_BOUND = false
PUBLIC_LAUNCH_DETAIL_CARDINALITY_EXPLICIT = false
PUBLIC_LAUNCH_CHILDREN_TENANT_BOUND = false
```

### 4.9 Residual public catalog and property reads are global

`src/lib/api/catalogo.functions.ts` contains four directly proven public-read surfaces:

```text
listarImoveis
listarCidades
listarBairros
obterImovel
```

The collection functions use a global anonymous client. They do not resolve tenant from Host, apply explicit `tenant_id` equality or post-validate each row against the accepted tenant.

`obterImovel` imports `supabaseAdmin`, resolves by global `slug + status`, uses `maybeSingle()`, and performs Storage signing before any accepted Host-derived tenant/resource authority. It serializes `video_url`, `tour_url`, cover and image destinations without central destination validation.

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

The same file also contains the accepted PTW public lead adapter. PSG-01 may modify only the public-read functions and directly required read-only helpers/DTO types. Public mutation semantics remain frozen.

```text
CATALOGO_PUBLIC_READ_SCOPE_ONLY = true
CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
```

### 4.10 Existing green PTR evidence does not cover these residuals

The current PTR structural suite checks site settings, Meta settings, CMS pages and campaigns. It does not execute or structurally inspect public blog, menu, launch, catalog, city, neighborhood or property-detail surfaces.

This is a PSG-01 current-main finding. It does not reopen or reclassify historical PTR-01.

```text
PTR01_HISTORICAL_STATE = unchanged
PSG01_CURRENT_MAIN_RESIDUAL_FINDING = true
PTR01_REOPENED = false
```

---

## 5. Hypotheses requiring implementation preflight

The following are not accepted facts and must be resolved before editing the corresponding surface:

1. whether any first-party or external caller still invokes `/api/public/bootstrap-admin`;
2. the exact scheduler/caller that invokes portal DLQ retry and the header format it can supply;
3. whether deployment uses additional trusted origins requiring explicit CSRF configuration;
4. whether persisted production content currently contains tags or providers outside the proposed allowlists;
5. whether any external menu destination requires a host-specific exception beyond generic HTTPS;
6. whether launch, blog, catalog or property consumers depend on the current raw DTO shape;
7. whether property/city/neighborhood tables require a narrower tenant-compatible relation strategy than generated types alone reveal;
8. whether any accepted signed-URL hostname requires an explicit deployment-derived media policy entry;
9. whether an existing sanitizer package is hidden in a transitive dependency — transitive availability is not accepted implementation authority.

Fail-closed preflight rule:

```text
UNRESOLVED_CALLER_PROVIDER_OR_SCHEMA_REQUIREMENT
→ stop the affected workstream
→ record the evidence
→ do not add a heuristic, tenant fallback or broad exception
```

---

## 6. Trust-boundary model

### 6.1 Privileged bootstrap

Current:

```text
anonymous HTTP body
→ public route
→ service role
→ Auth user creation
→ global admin role
```

Required:

```text
no public runtime bootstrap route
→ explicit operator runbook outside public application authority
→ audited operator action
```

### 6.2 Operational DLQ replay

Current:

```text
publishable key or shared cron header
→ public route
→ service role
→ DLQ reads and PTW replay mutation
```

Required:

```text
dedicated server-only operational secret
→ Authorization: Bearer <secret>
→ constant-time verification
→ accepted PTW replay path
```

### 6.3 Persisted content and destinations

Required:

```text
persisted tenant-scoped content
→ accepted tenant-bound public read
→ exact resource or tenant-scoped collection validation
→ server-side HTML sanitizer and destination policy
→ tenant-free safe DTO
→ renderer
```

Client-side sanitization alone is insufficient because SSR output must already be safe.

### 6.4 Server functions

Required:

```text
cross-site browser request
→ Start request middleware
→ CSRF origin decision
→ deny before serverFn handler
```

Intentional public server routes remain controlled by their own input, tenant, credential or signature boundary.

### 6.5 Unified public read authority

Required for blog, menu, launches, catalog, cities, neighborhoods and property detail:

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

No client-supplied tenant, default tenant, first-row authority, global anonymous authority, global slug or `maybeSingle()` authority is accepted.

---

## 7. Frozen implementation architecture

### 7.1 Bootstrap removal

Implementation must:

- prove no authorized first-party caller requires the route;
- delete `src/routes/api/public/bootstrap-admin.ts`;
- allow deterministic route-tree regeneration to remove the route;
- add an operator runbook for initial administrator provisioning;
- prohibit any replacement public service-role bootstrap endpoint.

If an active required caller is proven, implementation must stop and request re-planning.

### 7.2 Operational route authentication

Create one server-only boundary:

```text
src/lib/operational-route-auth.server.ts
```

Required contract:

- dedicated environment variable `PORTAL_DLQ_RETRY_SECRET`;
- standard `Authorization: Bearer` transport;
- strict parser with exactly one bearer credential;
- constant-time comparison over equal-length digests;
- missing or empty server secret denies every request;
- malformed, absent or incorrect credential returns generic unauthorized response;
- verification occurs before importing or invoking service-role dependencies;
- no fallback to `SUPABASE_PUBLISHABLE_KEY`, `CRON_SECRET`, query or body credentials.

### 7.3 Server-function CSRF

`src/start.ts` must install framework CSRF middleware in `requestMiddleware` for `serverFn` handlers.

Required constraints:

- preserve existing error middleware;
- preserve function middleware ordering unless direct framework evidence requires adjustment;
- do not set `allowRequestsWithoutOriginCheck` or equivalent bypass;
- do not hardcode production origins without deployment evidence;
- prove intentionally public server routes remain reachable through their own boundaries.

### 7.4 Public content security policy

Create one pure policy module:

```text
src/lib/public-content-security.ts
```

It owns typed decisions for:

- safe internal application paths;
- safe HTTPS navigation URLs;
- safe `mailto:` and `tel:` only in explicitly permitted contexts;
- safe public image/document sources;
- safe iframe/embed destinations;
- safe `target` and `rel` normalization;
- rejection of protocol-relative, credential-bearing and unsupported destinations.

Create one server-only sanitizer:

```text
src/lib/public-html-sanitizer.server.ts
```

Pin direct dependencies:

```text
sanitize-html = 2.17.5
@types/sanitize-html = 2.16.1
```

No sanitizer may be loaded from a CDN or inferred from a transitive dependency.

### 7.5 Pinned HTML policy

Allowed editorial tags are limited to:

```text
p, br, strong, em, b, i, u,
h2, h3, h4, h5, h6,
ul, ol, li, blockquote,
pre, code, hr,
table, thead, tbody, tr, th, td,
figure, figcaption,
img, a, span, sup, sub
```

Always prohibited:

```text
script, style, form, input, button, textarea, select,
object, embed, iframe, svg, math, template, noscript
```

Attribute rules:

- no `on*` attributes;
- no arbitrary `style`, `class` or `id`;
- anchors retain only normalized safe `href`, `title`, `target`, `rel`;
- images retain only normalized safe `src`, `alt`, `title`, `width`, `height`;
- protocol-relative URLs are denied;
- HTML comments are removed;
- external `_blank` links receive `noopener noreferrer`;
- sanitization is deterministic and idempotent.

### 7.6 Destination policy

Global deny list:

```text
javascript:, vbscript:, data:, blob:, file:,
protocol-relative //,
URLs containing username/password credentials,
malformed or control-character destinations
```

Navigation:

- internal links: normalized absolute application paths only;
- external links: HTTPS only;
- `mailto:` and `tel:` only where explicitly permitted;
- unknown schemes fail closed.

Image/document contexts:

- accepted signed HTTPS URLs and approved relative application assets;
- no arbitrary data URI or blob URI;
- invalid optional decorative media may be omitted;
- invalid required executable/navigation destinations deny the unsafe value.

Embed contexts use exact HTTPS host/path allowlists:

```text
www.youtube.com/embed/*
www.youtube-nocookie.com/embed/*
player.vimeo.com/video/*
my.matterport.com/show/*
kuula.co/share/*
www.google.com/maps/embed*
```

Equivalent hosts or paths are not accepted heuristically. Unknown providers return `null` or a stable policy error; raw fallback is prohibited.

### 7.7 Sanitization placement

Security must be applied before public DTO serialization whenever a server public-read boundary exists.

Required coverage:

- CMS page blocks and SEO destinations;
- blog HTML, cover image and metadata destinations;
- launch description, video, images and documents;
- site settings destinations used by Header, Footer, institutional CTA and contact map;
- menu URL output;
- property video, tour, cover, gallery, thumbnails and broker image.

Renderers may retain defensive typed checks but must not be the only authority.

### 7.8 Residual tenant-bound read remediation

#### Blog

- resolve tenant from Host before service-role use;
- list, categories and detail include `tenant_id` equality;
- detail uses `tenant_id + slug + published + limit(2)`;
- explicit 0/1/N and tenant post-validation;
- nested category and author rows must be tenant-compatible;
- no `maybeSingle()` authority and no global anonymous client.

#### Menu

- resolve tenant from Host;
- query visible items by `tenant_id`;
- post-validate every collection row;
- normalize destinations before DTO return;
- no global anonymous client.

#### Launches

- resolve tenant from Host for statuses, amenities, list and detail;
- detail uses `tenant_id + slug + published + limit(2)`;
- all child reads use `tenant_id + project_id`;
- nested status, city, neighborhood and broker rows must be tenant-compatible;
- signing/service-role access begins only after accepted tenant and project authority;
- no global anonymous client, global slug or `maybeSingle()` authority.

### 7.9 Catalog, cities, neighborhoods and property detail

#### Property catalog

```text
Host
→ accepted tenant
→ tenant_id equality
→ active-property filters
→ every-row tenant post-validation
→ safe media DTO
```

Prohibited:

- global anonymous client;
- tenant supplied by client;
- tenant default or heuristic;
- row without proven `tenant_id`;
- Storage signing before tenant authority;
- silent retention of unsafe media URL.

#### Cities and neighborhoods

```text
Host
→ accepted tenant
→ tenant_id equality
→ tenant-scoped collection
→ every-row tenant post-validation
→ tenant-free DTO
```

Property counts by neighborhood must use the accepted tenant.

#### Property detail

```text
strict { slug }
→ Host-derived tenant
→ tenant_id equality
→ slug equality
→ active status
→ limit(2)
→ explicit 0/1/N decision
→ tenant post-validation
→ nested tenant compatibility
→ Storage signing
→ destination-safe DTO
```

Prohibited:

```text
maybeSingle() as authority
global slug
service role before tenant authority
first-row selection
foreign or missing-tenant row
tenant_id in public DTO
```

#### Property destinations

Apply central policy before serialization of:

```text
video_url
tour_url
imagem_capa
imovel_imagens.url
imovel_imagens.thumb
corretor.foto_url
```

Unsafe or unknown video/tour destinations must not reach the renderer. Valid signed HTTPS media may be preserved. Optional invalid decorative media may be omitted. Raw fallback is prohibited.

---

## 8. Frozen implementation FILES_ALLOWED

### 8.1 New runtime/security modules

```text
src/lib/public-content-security.ts
src/lib/public-html-sanitizer.server.ts
src/lib/operational-route-auth.server.ts
```

### 8.2 Existing runtime surfaces

```text
src/start.ts
src/routes/api/public/bootstrap-admin.ts                  # deletion only
src/routes/api/public/hooks/portal-dlq-retry.ts          # authentication boundary only

src/lib/public-page-contract.ts
src/lib/api/blog.functions.ts
src/lib/api/lancamentos.functions.ts
src/lib/api/menu.functions.ts
src/lib/api/site.functions.ts
src/lib/api/catalogo.functions.ts                        # public-read functions only
src/lib/embed-url.ts

src/components/site/CmsPageRenderer.tsx
src/components/site/Header.tsx
src/components/site/Footer.tsx
src/routes/blog.$slug.tsx
src/routes/lancamentos.$slug.tsx
src/routes/imovel.$slug.tsx
src/routes/contato.tsx
src/routes/sobre.tsx
```

`src/lib/api/catalogo.functions.ts` is authorized only for:

```text
listarImoveis
listarCidades
listarBairros
obterImovel
public-read-only helpers and DTO types required by those functions
```

The following boundaries inside the same file are immutable:

```text
publicLeadSchema
enviarLead
requirePublicWriterTenantFromRequest
writePublicLead
PTW public mutation behavior
lead recipient authority
lead tenant authority
```

A consumer file may change only to consume a safe DTO or remove a raw fallback. Presence in `FILES_ALLOWED` is not permission for unrelated refactoring.

### 8.3 Generated consequence

```text
src/routeTree.gen.ts
```

May change only through deterministic generation caused by deleting bootstrap-admin. Manual edits are prohibited.

### 8.4 Tests and Release Gate

```text
src/lib/__tests__/public-surface-security.spec.ts
src/lib/__tests__/public-surface-tenant-read.spec.ts
run-public-surface-security-specs.ts
run-public-surface-tenant-read-specs.ts
package.json
bun.lock
scripts/verify-release.mjs
```

### 8.5 Operator documentation

```text
docs/runbooks/initial-admin-bootstrap.md
```

No other file is authorized without a direct finding and a new planning decision before implementation.

---

## 9. Explicitly prohibited implementation scope

PSG-01 must not:

- create or alter migrations;
- alter RLS, grants, functions, triggers or database schema;
- alter Supabase Auth configuration or Storage boundaries;
- modify tenant resolver, tenant middleware or impersonation;
- modify `src/lib/public-writers/*`;
- modify `publicLeadSchema`, `enviarLead`, `requirePublicWriterTenantFromRequest` or `writePublicLead`;
- change portal DLQ business selection, replay, retry or resolution semantics;
- change `create_manual_lead` or LSH boundaries;
- change email callbacks or delivery authorization;
- redesign CMS admin permissions, roles or publishing workflow;
- add a replacement public bootstrap endpoint;
- add wildcard embed hosts or protocol fallbacks;
- sanitize only on the client;
- silently preserve unsafe content when policy validation fails;
- use broad codemods;
- alter workflow definitions;
- manually edit generated routes;
- use Lovable.

---

## 10. Stable error and decision model

Implementation must define stable internal categories without leaking secrets or removed content:

```text
operator_route_unauthorized
operator_secret_unconfigured
csrf_origin_rejected
unsafe_html_removed
unsafe_navigation_destination
unsafe_media_destination
unsafe_embed_destination
public_content_invalid
public_resource_not_found
public_resource_ambiguous
public_resource_foreign_tenant
public_resource_missing_tenant
```

Operational-auth responses remain generic. Logs must not contain credential values or sanitized-out payload content.

---

## 11. Required executable evidence

### 11.1 Bootstrap

Prove:

- public bootstrap route absent;
- generated route tree contains no bootstrap route;
- no source imports or links to it;
- operator runbook exists and contains no secrets;
- no replacement service-role bootstrap HTTP route exists.

### 11.2 Operational DLQ authentication

Execute:

```text
missing environment secret → deny
missing Authorization → deny
wrong scheme → deny
multiple credentials → deny
wrong secret → deny
publishable key → deny
legacy x-cron-secret → deny
query/body secret → deny
correct dedicated bearer secret → accepted auth boundary
```

Prove service-role import and DLQ query are never reached on denial.

### 11.3 CSRF

Execute:

- same-origin serverFn accepted;
- cross-site serverFn denied;
- malformed or disallowed Origin denied;
- missing-origin behavior follows secure framework default;
- intentionally public server routes are not accidentally blocked;
- existing auth and tenant middleware remain active.

### 11.4 HTML sanitizer

Execute at minimum:

- script, event attribute, style/class/id removal;
- iframe/object/embed/svg/math removal;
- JavaScript/VBScript/data/blob/file/protocol-relative URL removal;
- safe editorial markup preservation;
- table/list/code preservation;
- external `_blank` rel normalization;
- deterministic repeated sanitization;
- comments removed;
- malformed nested markup handled without bypass.

### 11.5 URL and embed policy

Execute:

- safe relative internal path;
- safe HTTPS external link;
- mailto/tel only in allowed contexts;
- credential-bearing and control-character URLs denied;
- encoded JavaScript denied;
- exact allowed provider/host/path accepted;
- unknown host/path and HTTP embed denied;
- `toEmbedUrl` has no raw fallback;
- contact map, CMS video and property video/tour use the same policy authority.

### 11.6 Tenant-bound public reads

Execute 0/1/N, foreign and missing-tenant cases for:

- blog post detail, lists and categories;
- menu collection;
- launch detail, statuses, amenities, list and child collections;
- property catalog;
- city collection;
- neighborhood collection;
- property detail.

For `listarImoveis`, `listarCidades` and `listarBairros`, execute:

```text
unknown Host → deny before query
missing tenant → deny
foreign row → deny
mixed-tenant collection → deny
valid same-tenant collection → accept
tenant_id absent from DTO
```

For `obterImovel`, execute:

```text
0 rows → not found
1 same-tenant row → accepted
N rows → ambiguous and denied
foreign row → denied
missing tenant_id → denied
query error → fail closed
```

Prove structurally:

- Host failure precedes service-role use;
- tenant equality precedes slug/project equality;
- `limit(2)` is present for exact detail reads;
- `maybeSingle()` authority is absent;
- Storage signing occurs only after tenant/resource authority;
- child queries use accepted tenant and accepted parent;
- no global anonymous client remains in authorized public reads;
- sanitized DTOs contain no `tenant_id`.

### 11.7 Property destination security

Execute:

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

Prove unsafe values are removed or denied before public DTO serialization.

### 11.8 PTW preservation

Prove:

```text
publicLeadSchema unchanged
enviarLead authority unchanged
writePublicLead delegation preserved
CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
```

PTW authority and SQL structural suites must remain green.

### 11.9 Regression evidence

The Release Gate must execute:

```text
PTC-01
PTR-01
PSC-01
PPR-GN-01
PTW-01 authority
PTW-01 SQL structural
PSG-01 public-surface security
PSG-01 public-surface tenant reads
LSH-01 unit
LSH-01 runtime
LSH-01 structural
LSH-01 SQL structural
typecheck
build
build:dev
deterministic route-tree generation
```

---

## 12. Definition of Done

```text
PUBLIC_BOOTSTRAP_ADMIN_ROUTE_PRESENT = false
PUBLIC_BOOTSTRAP_ADMIN_REPLACEMENT_ROUTE = false
INITIAL_ADMIN_OPERATOR_RUNBOOK_PRESENT = true

DLQ_REPLAY_PUBLISHABLE_KEY_AUTH = false
DLQ_REPLAY_LEGACY_CRON_HEADER_AUTH = false
DLQ_REPLAY_DEDICATED_BEARER_SECRET = true
DLQ_REPLAY_CONSTANT_TIME_COMPARISON = true
DLQ_REPLAY_FAILS_CLOSED_WHEN_UNCONFIGURED = true
DLQ_REPLAY_SERVICE_ROLE_AFTER_AUTH_ONLY = true
DLQ_REPLAY_BUSINESS_PATH_CHANGED = false

SERVER_FUNCTION_CSRF_MIDDLEWARE_PRESENT = true
CROSS_SITE_SERVER_FUNCTION_REQUEST_DENIED = true
PUBLIC_SERVER_ROUTES_NOT_ACCIDENTALLY_BLOCKED = true
CSRF_MISSING_ORIGIN_PERMISSIVE_BYPASS = false

SERVER_SIDE_HTML_SANITIZER_PRESENT = true
SANITIZER_DIRECT_VERSION_PINNED = true
SANITIZER_POLICY_SINGLE_AUTHORITY = true
RAW_PUBLIC_PERSISTED_HTML_EXECUTION = false
SANITIZATION_IDEMPOTENT = true

UNSAFE_PROTOCOL_DESTINATION_DENIED = true
PROTOCOL_RELATIVE_DESTINATION_DENIED = true
CREDENTIAL_BEARING_URL_DENIED = true
UNKNOWN_EMBED_DESTINATION_DENIED = true
EMBED_HOST_AND_PATH_ALLOWLIST_EXACT = true
EMBED_RAW_FALLBACK = false

PUBLIC_MENU_HOST_BOUND = true
PUBLIC_MENU_COLLECTION_TENANT_VALIDATED = true
PUBLIC_BLOG_HOST_BOUND = true
PUBLIC_BLOG_DETAIL_CARDINALITY_EXPLICIT = true
PUBLIC_BLOG_COLLECTIONS_TENANT_VALIDATED = true
PUBLIC_LAUNCH_HOST_BOUND = true
PUBLIC_LAUNCH_DETAIL_CARDINALITY_EXPLICIT = true
PUBLIC_LAUNCH_CHILDREN_TENANT_BOUND = true

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

CATALOGO_PUBLIC_READ_SCOPE_ONLY = true
CATALOGO_PUBLIC_WRITER_CHANGED = false
PTW_PUBLIC_WRITER_BOUNDARIES_CHANGED = false
DLQ_BUSINESS_MUTATION_CHANGED = false
TENANT_RESOLVER_CHANGED = false
AUTH_CONFIGURATION_CHANGED = false
STORAGE_BOUNDARIES_CHANGED = false
DATABASE_SCHEMA_CHANGED = false
RLS_GRANTS_CHANGED = false
WORKFLOW_DEFINITION_CHANGED = false
FILES_OUTSIDE_ALLOWED = 0

ALL_REQUIRED_REGRESSIONS_GREEN = true
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
RELEASE_GATE_ARTIFACT_UPLOADED = true
```

---

## 13. Final audit criteria

A future implementation may be accepted only after direct GitHub inspection proves:

1. exact baseline and one implementation PR;
2. all changed files are inside the accepted envelope;
3. bootstrap route absent without replacement public privileged route;
4. operational secret transport and constant-time verification exact;
5. PTW replay business logic unchanged;
6. CSRF middleware present and public server routes intentional;
7. sanitization occurs server-side under one pinned policy;
8. all URL/embed consumers use the central policy or receive already-safe DTOs;
9. blog, menu and launch reads are Host/tenant-bound with executable evidence;
10. `catalogo.functions.ts` changed only in `listarImoveis`, `listarCidades`, `listarBairros`, `obterImovel` and directly required read-only helpers/DTO types;
11. catalog, city, neighborhood and property-detail reads are Host/tenant-bound;
12. property detail uses `limit(2)`, explicit 0/1/N and no `maybeSingle()` authority;
13. service role and Storage signing occur only after accepted tenant/resource authority;
14. property media, video and tour are validated before DTO serialization with no raw fallback;
15. `publicLeadSchema`, `enviarLead`, `writePublicLead` delegation and PTW writer modules remain unchanged;
16. dependency and lockfile changes are limited to pinned sanitizer packages;
17. no migration, RLS, grant, Auth, Storage-boundary, workflow or unrelated runtime change exists;
18. Release Gate and artifact are tied to the exact implementation HEAD;
19. no blocking review or unresolved thread exists;
20. merge remains prohibited until explicit final audit acceptance.

---

## 14. Planning decision

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

The accepted planning envelope is binding. No implementation may begin until explicit authorization by the product owner.
