# PPR-01 — Public Page Runtime Verification — Impact Analysis

## Status

**Accepted — planning only**

```text
STAGE_ID = PPR-01
PLANNING_BASELINE_HEAD = 871b5aa962e71cf3da5c585392f32b4cbca987e6
PLANNING_HEAD_AUDITED = 03762599a1f14c02622da8c648abe0d5ee10e308
PLANNING_RELEASE_GATE_RUN = 29790961174
PLANNING_RELEASE_GATE_JOB = 88512462460
PLANNING_RELEASE_GATE_CONCLUSION = success
PREDECESSOR = PSC-01 Accepted
EXECUTOR = GitHub-native direct file edits
LOVABLE_AUTHORIZED = false
RUNTIME_CHANGES_IN_THIS_ANALYSIS = false
PPR01_IMPLEMENTATION_STARTED = false
PPR01_PRINCIPAL_CONSUMED = false
PPR01_CORRECTIVE_CONSUMED = false
PPR01_REMAINING_IMPLEMENTATION_BUDGET = 2/2
```

---

## 1. Objective

Prove and, where necessary, correct the public CMS page read boundary so that:

- request Host is the only tenant authority;
- client input contains only the page slug;
- lookup cardinality is explicit for 0, 1 and N rows;
- every returned row is revalidated against the server-resolved tenant;
- the public DTO is JSON-serializable and statically typed;
- `blocks` and `seo` are runtime-validated rather than exposed as `unknown`;
- unknown Host, query failure, duplicate result and foreign-tenant response fail closed;
- the route consumes the DTO without unsafe structural casts.

PPR-01 is page-read scope only. It does not reopen PTR-01 and does not authorize settings, Meta, campaigns, writers, CMS sanitization, database or operational-security changes.

---

## 2. Audited current state

### 2.1 Accepted predecessor

```text
PSC-01 runtime HEAD = e5032890c7cc44dd03990d4e462ec3b3bb723be0
PSC-01 acceptance HEAD = 871b5aa962e71cf3da5c585392f32b4cbca987e6
```

Binding predecessor guarantees:

- public tenant authority derives from the server-owned request Host;
- unresolved authority fails closed;
- no default RM Prime tenant fallback exists;
- the Release Gate persists complete execution evidence.

### 2.2 Public page function

Current file:

```text
src/lib/api/pages.functions.ts
```

Audited behavior:

- strict input contains only `slug`;
- tenant is resolved before the query;
- query includes `tenant_id`, `slug` and `status = published`;
- response includes `tenant_id`;
- current lookup uses `maybeSingle()`;
- response is returned directly;
- JSON `blocks` and `seo` are not converted into an explicit validated public contract.

### 2.3 Public page route

Current file:

```text
src/routes/p/$slug.tsx
```

Audited behavior:

- consumer sends only `slug`;
- missing row becomes `notFound()`;
- `head` locally casts the page and SEO shape;
- component casts `page.blocks as CmsBlock[]`;
- canonical URL falls back to a hardcoded RM Prime domain.

PPR-01 must not invent domain authority. When no validated page-level canonical URL exists, the route must omit a generated canonical fallback. Future domain provisioning may define tenant-aware canonical generation.

---

## 3. Mandatory authority and cardinality contract

```text
request Host
  -> requirePublicTenantFromRequest()
  -> accepted PublicTenantIdentity
  -> query cms_pages by tenant_id + slug + published
  -> retrieve at most two rows
  -> explicit 0/1/N cardinality check
  -> tenant_id response postcondition
  -> runtime schema validation
  -> strip tenant_id
  -> PublicPageDto | null
  -> route notFound or render
```

Required semantics:

```text
0 rows -> null / not found
1 valid same-tenant row -> accepted DTO
2 rows -> fail closed as ambiguity
foreign-tenant row -> fail closed
missing tenant_id -> fail closed
query error -> fail closed
```

Prohibited:

- payload/query/header tenant authority;
- page slug as tenant authority;
- `ORDER BY ... LIMIT 1` or first-row selection;
- heuristic or fallback resolution;
- hardcoded RM Prime tenant/domain fallback.

---

## 4. Frozen implementation design

### 4.1 Shared contract

Create:

```text
src/lib/public-page-contract.ts
```

Responsibilities:

1. explicit schemas and types for every supported `CmsBlock` variant;
2. explicit `PublicPageSeo` schema/type;
3. explicit `PublicPageDto`;
4. database-facing `PublicPageRow` with `tenant_id`;
5. pure cardinality, tenant-postcondition and schema validation;
6. dependency-injected loader used by production and executable tests.

Required boundary exports, or exact functional equivalents:

```text
CmsBlock
PublicPageSeo
PublicPageDto
PublicPageRow
parsePublicPageRows
loadPublicPageForRequest
```

The DTO must contain only JSON-safe plain values and must not return `tenant_id`.

### 4.2 Production function

Update:

```text
src/lib/api/pages.functions.ts
```

Required behavior:

- preserve admin CRUD unchanged;
- re-export public page types when required by existing consumers;
- preserve strict `{ slug }` input and reject unknown fields;
- resolve tenant before data access;
- query with explicit tenant, slug and published predicates;
- select tenant plus all public fields;
- read at most two rows;
- propagate query errors;
- use the shared loader/contract;
- return `PublicPageDto | null` only after validation.

### 4.3 Public route

Update:

```text
src/routes/p/$slug.tsx
```

Required behavior:

- no client tenant input;
- no `as CmsBlock[]` cast;
- no local page/SEO shape cast;
- missing page remains `notFound()`;
- render receives typed `page.blocks` directly;
- validated page canonical is used only when present;
- no hardcoded RM Prime canonical fallback;
- tenant/query failures reach the route error boundary.

### 4.4 Executable specifications

Create:

```text
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
```

Tests must execute the same contract functions used by production.

Mandatory cases:

1. tenant-resolution failure propagates and query callback is not called;
2. query failure propagates;
3. zero rows returns `null`;
4. one valid same-tenant row returns a typed DTO;
5. two rows fail closed as ambiguous;
6. a foreign-tenant row fails closed;
7. missing `tenant_id` fails closed;
8. malformed block data fails closed;
9. malformed SEO fails closed;
10. valid DTO survives JSON serialization/reconstruction;
11. returned DTO excludes `tenant_id`;
12. strict input rejects `tenantId` and unknown fields;
13. route consumes typed blocks without an unsafe cast;
14. hardcoded RM Prime canonical fallback is absent;
15. PTC-01, PTR regression and PSC-01 suites remain green.

Structural checks may prove wiring only. Runtime cardinality and cross-tenant claims require execution of production-shared contract functions.

---

## 5. FILES_ALLOWED — principal implementation

```text
src/lib/public-page-contract.ts
src/lib/api/pages.functions.ts
src/routes/p/$slug.tsx
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
package.json
scripts/verify-release.mjs
```

No workflow change is required because the Release Gate already uploads its full log.

```text
FILES_OUTSIDE_ALLOWED = prohibited
```

---

## 6. Explicit prohibitions

PPR-01 must not:

- alter site settings or Meta readers;
- alter campaign readers or campaign-event writers;
- alter forms, leads, portal routes or portal writers;
- alter `CmsPageRenderer` rendering/security behavior;
- sanitize rich text, embeds or links — owned by PSG-01;
- alter database schema, migrations, RLS, grants, policies or functions;
- alter Auth or Storage;
- alter dependency versions or `bun.lock`;
- alter TanStack registration or generated route files manually;
- add fallback tenant/domain logic;
- use broad codemods;
- start PTW-01, PSG-01 or HVP-01;
- invoke Lovable;
- create a parallel PPR-01 implementation flow.

---

## 7. Release Gate requirements

Add and execute:

```text
bun run test:ppr-01
```

The principal PR must prove:

```text
build:dev = success
build = success
typecheck = success
route-tree digest stable across configured cycles
PTC-01 specs = success
PTR regression specs = success
PSC-01 specs = success
PPR-01 specs = success
release-gate artifact upload = success
```

A green gate is necessary but not sufficient; final acceptance also requires direct patch audit against this envelope.

---

## 8. Definition of Done

```text
PUBLIC_PAGE_TENANT_BOUND = true
PUBLIC_PAGE_CLIENT_TENANT_INPUT = false
PUBLIC_PAGE_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_PAGE_ZERO_ROWS_RETURNS_NULL = true
PUBLIC_PAGE_ONE_ROW_ACCEPTED = true
PUBLIC_PAGE_N_ROWS_FAILS_CLOSED = true
PUBLIC_PAGE_FOREIGN_ROW_DENIED = true
PUBLIC_PAGE_MISSING_TENANT_ID_DENIED = true
PUBLIC_PAGE_DTO_SERIALIZABLE = true
PUBLIC_PAGE_BLOCKS_TYPED_AND_VALIDATED = true
PUBLIC_PAGE_SEO_TYPED_AND_VALIDATED = true
PUBLIC_PAGE_TENANT_ID_NOT_RETURNED = true
PUBLIC_PAGE_ROUTE_CAST_FREE = true
UNKNOWN_HOST_PUBLIC_PAGE_DENIAL = true
HARD_CODED_RM_PRIME_CANONICAL_FALLBACK = false
EXECUTABLE_PAGE_CARDINALITY_PROOF = true
EXECUTABLE_CROSS_TENANT_PAGE_PROOF = true
STRUCTURAL_ONLY_TEST_REPORTED_AS_RUNTIME_PROOF = false
FILES_OUTSIDE_ALLOWED = 0
DEPENDENCY_VERSION_CHANGE = false
LOCKFILE_CHANGE = false
DATABASE_RLS_GRANT_CHANGE = false
PUBLIC_WRITER_CHANGE = false
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

---

## 9. Budget and successor

At principal implementation start:

```text
PPR01_PRINCIPAL_CONSUMED = true
PPR01_CORRECTIVE_CONSUMED = false
PPR01_REMAINING_CORRECTIVE_BUDGET = 1
```

After principal external audit:

- `Accepted`: authorize PTW-01 planning only;
- blocking principal defect: permit one consolidated corrective;
- failed corrective or governance breach: assign a valid terminal state;
- no parallel implementation is permitted.

Until PPR-01 acceptance:

```text
PTW01_STARTED = false
PTW01_AUTHORIZED = false
PSG01_STARTED = false
LOVABLE_AUTHORIZED = false
```

---

## 10. Planning-gate decision

```text
PPR01_PLANNING_STATE = Accepted
PPR01_IMPLEMENTATION_STARTED = false
PPR01_PRINCIPAL_CONSUMED = false
PPR01_CORRECTIVE_CONSUMED = false
PPR01_REMAINING_IMPLEMENTATION_BUDGET = 2/2
NEXT_ACTION_AUTHORIZED = open one GitHub-native principal implementation PR
```
