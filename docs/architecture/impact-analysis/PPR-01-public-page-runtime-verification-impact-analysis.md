# PPR-01 — Public Page Runtime Verification — Impact Analysis

## Status

**Ready for External Audit — planning only**

```text
STAGE_ID = PPR-01
BASELINE_HEAD = 871b5aa962e71cf3da5c585392f32b4cbca987e6
PREDECESSOR = PSC-01 Accepted
EXECUTOR = GitHub-native direct file edits
LOVABLE_AUTHORIZED = false
RUNTIME_CHANGES_IN_THIS_ANALYSIS = false
PRINCIPAL_IMPLEMENTATION_STARTED = false
PRINCIPAL_IMPLEMENTATION_CONSUMED = false
CORRECTIVE_IMPLEMENTATION_CONSUMED = false
REMAINING_IMPLEMENTATION_BUDGET = 2/2
```

---

## 1. Objective

Independently prove and, where necessary, correct the public CMS page read boundary so that:

- request Host remains the only tenant authority;
- client input contains only the page slug;
- lookup cardinality is explicit for 0, 1 and N rows;
- every returned row is revalidated against the server-resolved tenant;
- the public DTO is JSON-serializable and statically typed;
- `blocks` and `seo` are validated rather than returned as `unknown`;
- unknown Host, query failure, duplicate result and foreign-tenant response fail closed;
- page-route typecheck succeeds without unsafe casts.

PPR-01 is page-read scope only. It does not reopen PTR-01 and does not authorize public writers, settings, Meta, campaigns, CMS sanitization or operational-security work.

---

## 2. Current repository findings

### 2.1 Accepted predecessor

PSC-01 is accepted at runtime HEAD:

```text
e5032890c7cc44dd03990d4e462ec3b3bb723be0
```

Its acceptance evidence is merged at:

```text
871b5aa962e71cf3da5c585392f32b4cbca987e6
```

The following predecessor guarantees remain binding:

- public tenant authority derives from the server-owned request Host;
- unresolved authority fails closed;
- no default RM Prime tenant fallback exists;
- collection reads validate returned `tenant_id`;
- Release Gate persists complete execution evidence.

### 2.2 Current public page function

Current file:

```text
src/lib/api/pages.functions.ts
```

Observed public behavior:

- strict input contains only `slug`;
- `requirePublicTenantFromRequest()` is called before the query;
- query includes `tenant_id`, `slug` and `status = published` predicates;
- response includes `tenant_id`;
- current lookup uses `maybeSingle()`;
- response row is returned directly;
- `blocks` and `seo` originate from JSON columns and are not runtime-validated into a stable public contract.

### 2.3 Current public page route

Current file:

```text
src/routes/p/$slug.tsx
```

Observed route behavior:

- consumer sends only `slug`;
- absence of a row becomes `notFound()`;
- `head` locally casts the page shape;
- component locally casts `page.blocks as CmsBlock[]`;
- canonical URL is hardcoded to the RM Prime domain instead of deriving tenant-aware authority.

The hardcoded canonical URL is a page-read product correctness defect, but PPR-01 must not invent domain authority. The accepted correction is to omit a generated canonical fallback when no validated page-level canonical URL is present. A later domain-provisioning stage may establish canonical-domain generation.

### 2.4 Cardinality gap

`maybeSingle()` reports an error for multiple rows, but PPR-01 requires explicit, testable 0/1/N semantics under application control.

Required query behavior:

```text
read at most 2 matching rows
0 rows -> null / not found
1 same-tenant valid row -> accepted DTO
2 rows -> fail closed as ambiguity
foreign-tenant returned row -> fail closed
query error -> fail closed
```

No `ORDER BY`, `LIMIT 1`, first-row selection or heuristic resolution is permitted.

### 2.5 Runtime-contract gap

The public return type must not contain `unknown`, functions, class instances or database-only fields.

Required DTO characteristics:

- plain object;
- strings, booleans, nulls, arrays and plain nested objects only;
- no `tenant_id` returned;
- `blocks` validated as the supported discriminated block union;
- `seo` validated as a finite plain object;
- `JSON.stringify(dto)` succeeds;
- route consumes the DTO without local structural casts.

---

## 3. Authority and data-flow contract

```text
request Host
  -> requirePublicTenantFromRequest()
  -> accepted PublicTenantIdentity
  -> query cms_pages by tenant_id + slug + published
  -> retrieve at most two rows
  -> application cardinality check
  -> tenant_id response postcondition
  -> runtime schema validation
  -> strip tenant_id
  -> PublicPageDto | null
  -> route notFound or render
```

Prohibited authority sources:

```text
payload.tenantId
query-string tenant
x-tenant-id supplied by browser
route path as tenant authority
page slug as tenant authority
first row returned by database
hardcoded RM Prime tenant/domain fallback
```

---

## 4. Frozen implementation design

### 4.1 Shared public page contract

Create:

```text
src/lib/public-page-contract.ts
```

Responsibilities:

1. define explicit schemas/types for every supported `CmsBlock` variant;
2. define explicit `PublicPageSeo` schema/type;
3. define `PublicPageDto`;
4. define the database-facing `PublicPageRow` boundary with `tenant_id`;
5. implement pure cardinality and response validation;
6. implement a dependency-injected loader used by production and executable tests.

Required public exports:

```text
CmsBlock
PublicPageSeo
PublicPageDto
PublicPageRow
parsePublicPageRows
loadPublicPageForRequest
```

The precise names may vary only if the same boundaries remain explicit and testable.

### 4.2 Production page function

Update:

```text
src/lib/api/pages.functions.ts
```

Required behavior:

- re-export `CmsBlock` and public page types from the shared contract when needed by existing consumers;
- preserve admin CRUD behavior unchanged;
- preserve strict `{ slug }` input and reject unknown fields;
- call the shared dependency-injected loader;
- resolve tenant before executing the query;
- query `cms_pages` with explicit `tenant_id`, `slug`, `status = published`;
- select `tenant_id` plus all public DTO fields;
- read at most two rows;
- propagate query errors;
- return `PublicPageDto | null` only after cardinality, tenant and schema validation.

### 4.3 Public route

Update:

```text
src/routes/p/$slug.tsx
```

Required behavior:

- no client tenant input;
- no `as CmsBlock[]` cast;
- no local cast of page/SEO shape;
- missing page still produces `notFound()`;
- render receives typed `page.blocks` directly;
- use page-provided validated canonical URL only when present;
- do not generate a hardcoded RM Prime canonical URL for another tenant;
- unknown Host and page-query failures must reach the route error boundary.

### 4.4 Executable specifications

Create:

```text
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
```

The tests must invoke the same contract functions used by production.

Required executable cases:

1. tenant-resolution failure propagates and query callback is not called;
2. query failure propagates;
3. zero rows returns `null`;
4. exactly one valid same-tenant row returns a typed DTO;
5. two matching rows fail closed as ambiguous;
6. a foreign-tenant returned row fails closed;
7. missing `tenant_id` fails closed;
8. malformed block data fails closed;
9. malformed SEO fails closed;
10. valid DTO survives JSON serialization and reconstruction;
11. returned DTO excludes `tenant_id`;
12. strict page input rejects `tenantId` and unknown fields;
13. route consumes typed blocks without `as CmsBlock[]`;
14. no hardcoded RM Prime canonical fallback remains in the public page route;
15. existing PTC-01 and PSC-01 suites remain green.

Structural inspection may confirm wiring, but it cannot be reported as runtime cardinality or cross-tenant proof. Those claims require execution of the production-shared contract functions.

---

## 5. FILES_ALLOWED — principal implementation

Only the following paths may change in the PPR-01 principal PR:

```text
src/lib/public-page-contract.ts
src/lib/api/pages.functions.ts
src/routes/p/$slug.tsx
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
package.json
scripts/verify-release.mjs
```

No workflow change is required because `.github/workflows/release-gate.yml` already persists the complete gate log.

Files outside this list are prohibited.

---

## 6. Explicit prohibitions

PPR-01 must not:

- alter `src/lib/api/site.functions.ts`;
- alter `src/lib/api/meta.functions.ts`;
- alter campaign readers or campaign-event writers;
- alter forms, leads, portal routes or portal writers;
- alter `CmsPageRenderer` rendering/security behavior;
- sanitize rich text, embeds or links — owned by PSG-01;
- alter database schema, migrations, RLS, grants, policies or functions;
- alter Auth or Storage;
- alter dependency versions or `bun.lock`;
- alter TanStack registration or generated route files manually;
- add fallback tenant/domain logic;
- use `ORDER BY ... LIMIT 1` to resolve ambiguity;
- use broad codemods;
- start PTW-01, PSG-01 or HVP-01;
- invoke Lovable.

---

## 7. Release Gate requirements

Update the canonical release verifier to run:

```text
bun run test:ppr-01
```

The principal PR must prove:

```text
build:dev = success
build = success
typecheck = success
route-tree digest stable across all configured cycles
PTC-01 specs = success
PTR regression specs = success
PSC-01 specs = success
PPR-01 specs = success
release-gate artifact uploaded = success
```

A green gate proves only the commands and tests actually executed. Acceptance additionally requires direct patch audit against this Impact Analysis.

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
- principal defect with remaining budget: authorize one consolidated corrective;
- failed corrective or governance breach: terminalize with a valid terminal state;
- never create a parallel PPR-01 implementation flow.

Until PPR-01 is accepted:

```text
PTW01_STARTED = false
PTW01_AUTHORIZED = false
PSG01_STARTED = false
LOVABLE_AUTHORIZED = false
```

---

## 10. Planning-gate decision

```text
PPR01_PLANNING_READY_FOR_EXTERNAL_AUDIT = true
PPR01_IMPLEMENTATION_STARTED = false
PPR01_PRINCIPAL_CONSUMED = false
PPR01_CORRECTIVE_CONSUMED = false
PPR01_REMAINING_IMPLEMENTATION_BUDGET = 2/2
NEXT_ACTION_AFTER_PLANNING_ACCEPTANCE = open one GitHub-native principal implementation PR
```
