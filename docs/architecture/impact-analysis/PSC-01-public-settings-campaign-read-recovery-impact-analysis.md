# PSC-01 — Public Settings & Campaign Read Recovery — Impact Analysis

## Status

**Accepted — planning-only direct GitHub audit**

```text
STAGE_ID = PSC-01
BASELINE_HEAD = 6e12e0cd0306a4c0acdca92dcfe4b6e9cce5cf14
PREDECESSOR = PTR-01 Rejected — terminal
EXECUTOR = GitHub-native direct file edits
LOVABLE_AUTHORIZED = false
RUNTIME_CHANGES_IN_THIS_ANALYSIS = false
PLANNING_EXTERNAL_AUDIT_ACCEPTED = true
PLANNING_RELEASE_GATE_RUN = 29787748231
PLANNING_RELEASE_GATE_JOB = 88502851844
PLANNING_RELEASE_GATE_CONCLUSION = success
PSC01_IMPLEMENTATION_STARTED = false
```

---

## 1. Objective

Close the remaining fail-closed defects in public site settings, public Meta settings, root rendering and active campaign collection reads without reopening PTR-01 or entering page/writer scope.

PSC-01 is a reduced independent outcome. It does not accept or auto-transfer the rejected PTR-01 runtime. The current files are only the observed starting baseline.

---

## 2. Current repository findings

### 2.1 Accepted foundation

PTC-01 is accepted and provides:

- strict server-side Host normalization;
- no implicit RM Prime fallback tenant;
- explicit development/preview mapping only;
- exact Host/slug resolution;
- explicit zero/one/N tenant cardinality;
- `requirePublicTenantFromRequest()` as a fail-closed server helper.

### 2.2 Rejected PTR runtime physically present

Commit `a746e58bc2c48f0e20ddee62571c16ace809bbd8` physically changed public reads and passes the current Release Gate, but PTR-01 is rejected because its budget was exceeded and its behavioral Definition of Done was not met.

### 2.3 Root rendering still fails open

`src/routes/__root.tsx` catches and ignores errors from:

- `obterSiteSettings()`;
- `obterMetaPixelId()`.

When tenant authority cannot be resolved, the application can continue rendering RM Prime defaults.

```text
UNKNOWN_HOST_PUBLIC_READ_FUNCTION_THROWS = true
UNKNOWN_HOST_ROOT_RENDERING_DENIED = false
DEFAULT_BRANDING_AFTER_TENANT_FAILURE = true
```

### 2.4 Public Meta query errors are ignored

`obterMetaPixelId()` applies `tenant_id = resolved tenant`, but does not inspect the Supabase query error.

```text
PUBLIC_META_TENANT_FILTER_PRESENT = true
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = false
```

### 2.5 Collection reads lack executable response postconditions

Public settings and campaign queries contain explicit tenant predicates, but their current tests inspect source strings. They do not execute the production response guard against foreign-tenant rows.

```text
STRUCTURAL_TENANT_FILTER_SPECS = present
EXECUTABLE_COLLECTION_RESPONSE_GUARD = absent
RUNTIME_FOREIGN_TENANT_ROW_DENIAL_PROVEN = false
```

---

## 3. Architectural decision

PSC-01 shall preserve PTC-01 as the only Host-to-tenant authority and add a second fail-closed layer over collection results.

The boundary shall be:

```text
server request Host
  → accepted PTC-01 tenant resolution
  → explicit tenant predicate in database read
  → executable tenant-row postcondition
  → serializable public DTO
  → root rendering only after successful authority/data resolution
```

No client tenant field, `x-tenant-id`, fallback tenant, default tenant, heuristic or path value may become authority.

---

## 4. Required implementation decisions

### 4.1 Typed/isomorphic tenant-resolution error

A small isomorphic module may define a typed `PublicTenantResolutionError` and a stable discriminator.

Requirements:

- `tenant.server.ts` throws the typed error when request tenant authority is absent;
- `__root.tsx` may import only the isomorphic discriminator, not a server-only module;
- serialization/deserialization must preserve a stable error code when applicable;
- no runtime tenant data is exposed in the error.

### 4.2 Root fail-closed behavior

The root loader must not convert tenant-resolution or tenant-scoped settings failures into default RM Prime branding.

Requirements:

- unresolved tenant authority propagates to the root error boundary;
- public settings query errors propagate;
- public Meta query errors propagate;
- defaults may be used only after a valid tenant is resolved and the corresponding setting is legitimately absent;
- the root error boundary remains generic and must not leak tenant/database details.

### 4.3 Public Meta read

`obterMetaPixelId()` must:

- require the accepted request tenant;
- apply explicit tenant equality before key selection;
- select `tenant_id` with the value;
- throw on Supabase query error;
- reject any returned foreign-tenant row;
- return `{ pixel_id: null }` only for a successful, tenant-bound “no setting” result.

### 4.4 Public site settings collection

`obterSiteSettings()` must:

- require the accepted request tenant;
- retain explicit `tenant_id` equality;
- select `tenant_id, key, value`;
- throw on query error;
- execute an application response guard that rejects any row with a foreign tenant;
- remove `tenant_id` before hydration/return;
- preserve serializable return types.

### 4.5 Active campaign collection

`listarCampanhasAtivas()` must:

- accept strict empty input only;
- require the accepted request tenant;
- retain explicit `tenant_id` equality;
- select `tenant_id` with campaign fields;
- throw on query error;
- execute the same tenant-row response guard;
- remove `tenant_id` before returning the public DTO;
- leave `registrarEventoCampanha` byte-for-byte outside PSC-01 scope except for unavoidable import placement with no behavioral change.

---

## 5. Executable evidence model

Source-string inspection is permitted only as a supplementary scope assertion. It cannot be reported as runtime isolation proof.

PSC-01 must add executable tests for production helpers used by the real read paths:

1. same-tenant collection rows are accepted;
2. a foreign-tenant row throws;
3. empty collection succeeds as an empty collection;
4. a tenant-bound missing Meta row returns null;
5. a foreign Meta row throws;
6. typed tenant-resolution failure is recognized after serialization-compatible reconstruction;
7. root policy propagates tenant/settings/Meta failures rather than returning defaults;
8. existing PTC-01 tests remain green.

Live database evidence is deferred to HVP-01; PSC-01 must nevertheless execute the exact application postcondition code used by production reads.

---

## 6. Frozen FILES_ALLOWED for the principal implementation

```text
src/lib/public-tenant-resolution-error.ts
src/lib/public-tenant-read-guards.ts
src/lib/tenant.server.ts
src/routes/__root.tsx
src/lib/api/site.functions.ts
src/lib/api/meta.functions.ts
src/lib/api/campaigns.functions.ts
src/lib/__tests__/public-settings-campaign-read-recovery.spec.ts
run-public-settings-campaign-read-recovery-specs.ts
package.json
scripts/verify-release.mjs
.github/workflows/release-gate.yml
```

Rules:

- `.github/workflows/release-gate.yml` may change only to persist complete success/failure evidence;
- `package.json` may change only to add the PSC-01 test command;
- no dependency version or lockfile change;
- no other path may change without a new Impact Analysis and explicit authorization.

---

## 7. Explicitly prohibited scope

Do not alter:

- `src/lib/api/pages.functions.ts`;
- public page routes or DTOs;
- forms or form submissions;
- campaign event mutation;
- portal lead/feed writers;
- bootstrap-admin;
- operational hooks/webhooks;
- CMS rendering/sanitization;
- migrations, SQL, RLS, grants or policies;
- Auth or Storage;
- dependencies or lockfiles;
- generated route files manually;
- PTW-01, PSG-01 or HVP-01;
- Lovable.

No broad codemod or workflow that writes application code is authorized.

---

## 8. Required commands and evidence

The principal PR must execute through the canonical Release Gate:

```text
bun install --frozen-lockfile
bun run build:dev
bun run typecheck
bun run build
bun run typecheck
bun run build:dev
bun run test:lsh-01:unit
bun run test:lsh-01:structural
bun run test:ptc-01
bun run test:psc-01
```

Required evidence:

- workflow run ID and job ID;
- complete command log persisted when connector output is insufficient;
- exit codes;
- PTC-01 pass count;
- PSC-01 pass count;
- stable route-tree digest and single TanStack Register authority;
- exact changed-file list;
- confirmation of zero files outside FILES_ALLOWED.

---

## 9. Definition of Done

```text
PUBLIC_SETTINGS_TENANT_BOUND = true
PUBLIC_SETTINGS_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_SETTINGS_FOREIGN_ROW_DENIED = true

PUBLIC_META_TENANT_BOUND = true
PUBLIC_META_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_META_FOREIGN_ROW_DENIED = true
PUBLIC_META_MISSING_ROW_RETURNS_NULL = true

PUBLIC_CAMPAIGN_READ_TENANT_BOUND = true
OPTIONAL_CLIENT_TENANT_INPUT_ON_CAMPAIGN_READ = false
PUBLIC_CAMPAIGN_QUERY_ERROR_FAILS_CLOSED = true
PUBLIC_CAMPAIGN_FOREIGN_ROW_DENIED = true

UNKNOWN_HOST_ROOT_DENIAL = true
DEFAULT_BRANDING_AFTER_TENANT_FAILURE = false
ROOT_SETTINGS_FAILURE_PROPAGATED = true
ROOT_META_FAILURE_PROPAGATED = true

COLLECTION_RETURN_CONTRACTS_SERIALIZABLE = true
EXECUTABLE_COLLECTION_RESPONSE_GUARD = true
STRUCTURAL_ONLY_TESTS_REPORTED_AS_RUNTIME_PROOF = false

PTC01_SPECS_REMAIN_GREEN = true
PSC01_SPECS_PASSED = true
TYPECHECK_PASSED = true
BUILD_DEV_PASSED = true
BUILD_PASSED = true
RELEASE_GATE_GREEN = true
FILES_OUTSIDE_ALLOWED = 0
DEPENDENCY_OR_LOCKFILE_CHANGE = false

PTR01_REOPENED = false
PTW01_STARTED = false
LOVABLE_USED = false
```

---

## 10. Prompt/PR budget and successor

```text
PSC01_PRINCIPAL_PR_BUDGET = 1
PSC01_CORRECTIVE_PR_BUDGET = 1
PSC01_MAX_IMPLEMENTATION_EXECUTIONS = 2
PSC01_PRINCIPAL_CONSUMED = false
PSC01_CORRECTIVE_CONSUMED = false
```

After the final audit, PSC-01 must receive one terminal state:

- `Accepted`;
- `Accepted with Non-Blocking Backlog`;
- `Rejected`;
- `Superseded`;
- `Blocked External`.

Only an accepted PSC-01 may authorize PPR-01. PTW-01 remains blocked.
