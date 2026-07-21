# PPR-GN-01 — PUBLIC PAGE GITHUB-NATIVE COMPLETION

## Status

**Planning-only — pending Release Gate and external audit**

```text
STAGE_ID = PPR-GN-01
BASELINE_HEAD = 2c55f8f70ab6560a3929d60542b49d9157c35f5a
PREDECESSOR = PSC-01 Accepted
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
MAX_PARALLEL_IMPLEMENTATION_PRS = 1
IMPLEMENTATION_STARTED = false
```

---

## 1. Decision context

PPR-01 PR #33 was closed unmerged after two failed Release Gate runs. Its prior terminalization relied on applying a Lovable-specific prompt budget to direct GitHub-native work.

The product owner explicitly clarified that prompt-count budgets apply only to Lovable interactions.

PPR-GN-01 replaces the obsolete process envelope. It does not reopen PR #33, does not merge its branch and does not treat rejected code as accepted authority.

All implementation must be re-derived from the audited `main`.

---

## 2. Objective

Complete the public CMS page read contract so that it:

- uses only server-owned tenant authority;
- preserves inherited PTR structural compatibility;
- handles query cardinality explicitly as 0/1/N;
- validates the returned tenant before exposing data;
- returns a serializable typed DTO without `tenant_id`;
- validates CMS blocks and SEO data;
- removes route-level unsafe casts;
- removes the RM Prime hardcoded canonical fallback;
- passes the complete inherited and new Release Gate suites.

---

## 3. Audited `main` baseline

### 3.1 Existing accepted behavior

`src/lib/api/pages.functions.ts` already:

- accepts only `{ slug }` through an inline strict validator;
- calls `requirePublicTenantFromRequest()`;
- queries `cms_pages` using `.eq("tenant_id", tenant.id)` before slug equality;
- enforces `status = published`;
- propagates database errors.

These production shapes are mandatory inherited compatibility contracts:

```ts
.inputValidator((d) => z.object({ slug: z.string().min(1) }).strict().parse(d))
.eq("tenant_id", tenant.id)
```

They MUST remain materially and textually present because the accepted PTR regression suite verifies them.

### 3.2 Remaining defects

The current public page function:

- uses `maybeSingle()`;
- does not read at most two rows to distinguish zero, one and ambiguous cardinality;
- returns an unvalidated Supabase row;
- exposes `tenant_id` in the returned contract;
- does not validate blocks or SEO before serialization.

The current public page route:

- casts the returned page shape locally;
- casts SEO locally;
- casts blocks to `CmsBlock[]`;
- uses `https://rmprimeimoveis.com.br/p/...` as a cross-tenant canonical fallback.

---

## 4. Architecture impact

### 4.1 Tenant authority

No new tenant source is introduced.

```text
SERVER_REQUEST_HOST_AUTHORITY = required
CLIENT_TENANT_INPUT = prohibited
HEADER_TENANT_AUTHORITY = prohibited
PATH_TENANT_AUTHORITY = prohibited
DEFAULT_TENANT = prohibited
```

The accepted tenant object must remain available through the query callback and through response post-validation.

### 4.2 Cardinality

The public query must read at most two rows:

```text
0 rows = null
1 row = validate and return DTO
2 rows = fail closed as ambiguous
```

`maybeSingle()`, `single()`, `ORDER BY ... LIMIT 1` and heuristic selection are prohibited.

### 4.3 Serialization

The route-facing object must contain only JSON-serializable values and must exclude `tenant_id`.

CMS blocks and SEO must be parsed through explicit schemas before return.

### 4.4 Database, RLS and grants

No database, migration, RLS, grant, policy or SQL change is authorized by this stage.

The stage verifies and hardens the server read contract only.

---

## 5. Implementation design

### 5.1 Shared page contract

Create:

```text
src/lib/public-page-contract.ts
```

Responsibilities:

- define `CmsBlock` schema and type;
- define public SEO schema and type;
- define public row schema containing `tenant_id`;
- define public DTO excluding `tenant_id`;
- define typed contract errors;
- implement pure 0/1/N parsing;
- enforce response tenant equality;
- load rows only after the tenant object is resolved;
- pass the same accepted tenant object to the query callback;
- validate the response using the same `tenant.id`.

The loader must use a contract equivalent to:

```ts
export type PublicPageTenantIdentity = { id: string };

export async function loadPublicPageForRequest(
  requireTenant: () => Promise<PublicPageTenantIdentity>,
  fetchRows: (
    tenant: PublicPageTenantIdentity,
  ) => Promise<readonly unknown[] | null | undefined>,
): Promise<PublicPageDto | null>;
```

### 5.2 Production server function

Update only the public page block in:

```text
src/lib/api/pages.functions.ts
```

Mandatory shape:

```ts
export const obterPaginaPublica = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1) }).strict().parse(d))
  .handler(async ({ data }) =>
    loadPublicPageForRequest(
      requirePublicTenantFromRequest,
      async (tenant) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("cms_pages")
          .select("tenant_id, id, slug, titulo, descricao, seo, blocks, published_at")
          .eq("tenant_id", tenant.id)
          .eq("slug", data.slug)
          .eq("status", "published")
          .limit(2);

        if (error) throw new Error(error.message);
        return rows;
      },
    ),
  );
```

Functional equivalents are allowed only when both inherited structural assertions remain satisfied.

### 5.3 Public route

Update:

```text
src/routes/p.$slug.tsx
```

Required behavior:

- consume the typed DTO directly;
- remove page, SEO and block casts;
- pass validated blocks directly to `CmsPageRenderer`;
- generate canonical and `og:url` only when a validated canonical is present;
- do not synthesize an RM Prime canonical for other tenants.

### 5.4 Executable evidence

Create:

```text
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
```

The suite must execute the same pure contract functions used by production.

Required executable cases:

1. tenant-resolution failure prevents the query;
2. query failure propagates;
3. accepted tenant object reaches the query callback unchanged;
4. the same `tenant.id` is reused for response post-validation;
5. zero rows returns `null`;
6. one same-tenant row returns a typed DTO;
7. multiple rows fail closed;
8. foreign-tenant row fails closed;
9. missing `tenant_id` fails closed;
10. malformed block fails closed;
11. malformed SEO fails closed;
12. DTO serializes and excludes `tenant_id`;
13. production source retains `.strict().parse(d)`;
14. production source retains `.eq("tenant_id", tenant.id)`;
15. production source uses `.limit(2)` and does not use `maybeSingle()`;
16. route contains no unsafe page/block casts or hardcoded RM Prime canonical.

---

## 6. FILES_ALLOWED

Exactly:

```text
src/lib/public-page-contract.ts
src/lib/api/pages.functions.ts
src/routes/p.$slug.tsx
src/lib/__tests__/public-page-runtime-verification.spec.ts
run-public-page-runtime-verification-specs.ts
package.json
scripts/verify-release.mjs
```

No additional runtime or documentation file may be added to the implementation PR without a new Impact Analysis decision.

---

## 7. Prohibitions

Do not:

- reopen or merge PR #33;
- copy its branch wholesale;
- alter settings, Meta or campaigns;
- alter forms, leads, campaign-event writers or portal writers;
- alter `CmsPageRenderer`;
- alter database, migrations, RLS, grants, policies or SQL;
- alter Auth or Storage;
- alter dependency versions or `bun.lock`;
- alter GitHub workflow definitions;
- manually edit generated route files;
- introduce client, header or path tenant authority;
- introduce tenant fallback, default or heuristic selection;
- use broad codemods;
- open parallel PPR-GN-01 implementation PRs;
- use Lovable.

---

## 8. Required execution sequence

Before the full Release Gate, run inherited structural suites immediately after the first production edit:

```text
bun run test:ptc-01
bun run test:ptr-01
bun run test:psc-01
```

This preflight is required specifically to prevent late discovery of known textual compatibility constraints.

Then run the canonical Release Gate, which must include PPR-GN-01 executable specs.

Every corrective commit requires a concrete failing log or audit finding.

---

## 9. Required evidence

```text
BUILD_DEV = success
BUILD = success
TYPECHECK_CYCLE_A = success
TYPECHECK_CYCLE_B = success
ROUTE_TREE_DIGEST_A = ROUTE_TREE_DIGEST_B = ROUTE_TREE_DIGEST_C
TANSTACK_REGISTER_AUTHORITY_COUNT = 1
GENERATED_ROUTE_TREE_MANUAL_EDIT = false
PTC01_SPECS = all passed
PTR01_REGRESSION_SPECS = all passed
PSC01_SPECS = all passed
PPR_GN_01_SPECS = all passed
RELEASE_GATE_ARTIFACT_UPLOADED = true
FILES_OUTSIDE_ALLOWED = 0
```

---

## 10. Definition of Done

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
HARD_CODED_RM_PRIME_CANONICAL_FALLBACK = false
PTR_TENANT_EQUALITY_SHAPE_PRESERVED = true
PTR_STRICT_INPUT_SHAPE_PRESERVED = true
EXECUTABLE_PAGE_CARDINALITY_PROOF = true
EXECUTABLE_CROSS_TENANT_PAGE_PROOF = true
DEPENDENCY_VERSION_CHANGE = false
LOCKFILE_CHANGE = false
DATABASE_RLS_GRANT_CHANGE = false
PUBLIC_WRITER_CHANGE = false
TYPECHECK_BUILD_RELEASE_GATE_GREEN = true
```

---

## 11. GitHub-native correction policy

```text
LOVABLE_PROMPT_BUDGET = 0
GITHUB_NATIVE_PROMPT_BUDGET = not_applicable
MAX_ACTIVE_IMPLEMENTATION_PRS = 1
SPECULATIVE_CORRECTIONS = prohibited
EVIDENCE_DRIVEN_CORRECTIONS = required
MERGE_BEFORE_FINAL_AUDIT = prohibited
```

Corrections may continue in the same implementation PR while they remain within this envelope and are justified by a terminal failing run or direct audit finding.

A scope-expanding correction requires re-planning rather than a hidden expansion.

---

## 12. Successor gate

Before this planning document is accepted:

```text
PPR_GN_01_IMPLEMENTATION_AUTHORIZED = false
PTW01_AUTHORIZED = false
```

After a green planning Release Gate and direct audit acceptance:

```text
PPR_GN_01_PLANNING_STATE = Accepted
PPR_GN_01_IMPLEMENTATION_AUTHORIZED = true
PTW01_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

PTW-01 may be authorized only after the PPR-GN-01 implementation is merged and accepted through direct audit.
