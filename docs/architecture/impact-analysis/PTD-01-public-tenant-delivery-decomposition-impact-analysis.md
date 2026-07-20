# PTD-01 — Public Tenant Delivery Decomposition

## Status

**Accepted — planning-only direct GitHub audit**

**Baseline:** `c021db3cf3b693887e2832d4d6736a04b0d749fc`  
**Runtime changes:** none  
**Lovable interactions:** zero

---

## 1. Trigger

PTH-01 attempted to modify the complete public tenant boundary through one broad GitHub Actions codemod.

The principal codemod failed closed before commit because one exact source signature diverged. The single consolidated corrective also failed before codemod execution because its preparatory matcher expected one occurrence while the target text occurred twice in the codemod source.

Result:

```text
PTH_01_STATE = Rejected
PTH_01_TERMINAL = true
PTH01_PRINCIPAL_CONSUMED = true
PTH01_CORRECTIVE_CONSUMED = true
PTH01_REMAINING_BUDGET = 0/2
PTH01_CODE_MERGED = false
PTH01_MAIN_CHANGED = false
```

No third PTH-01 attempt is authorized. No branch artifact from PR #9 is accepted or automatically transferred.

---

## 2. Root cause

PTH-01 combined three independently testable outcomes:

1. request-host tenant context foundation;
2. tenant binding for public reads;
3. tenant binding for public writes and negative cross-tenant behavior.

It also used a generated broad codemod rather than direct file-level implementation. This increased pattern sensitivity and obscured the true delivery unit.

The rejected outcome does not invalidate the release-critical finding. It demonstrates that the stage was too broad for the selected execution mechanism.

---

## 3. Mandatory recovery decision

The remaining work is formally decomposed before further implementation.

The new executor contract is:

```text
EXECUTOR = Direct GitHub file changes
GITHUB_ACTIONS_CODEMOD = prohibited
LOVABLE = prohibited
```

Each stage owns one independent result and receives its own principal direct-file pull request plus at most one consolidated corrective pull request.

---

## 4. New finite sequence

```text
PTC-01 — Public Tenant Context Foundation
  → PTQ-01 — Public Tenant Query Binding
  → PTM-01 — Public Tenant Mutation Binding
  → PSG-01 — Public Surface Security Gate
  → HVP-01 — Homologation Validation Preflight
```

These are official stages with distinct outcomes, not sublots or decimal retries of PTH-01.

---

## 5. Stage boundaries

### 5.1 PTC-01 — Public Tenant Context Foundation

**Objective:** create one server-owned public tenant context derived from the request hostname.

**Files/areas:**

- pure hostname/cardinality contract;
- server request-host resolver;
- compatibility helper in `tenant.server.ts` without fallback authority;
- root route pre-resolution;
- deterministic tests and Release Gate wiring.

**Required behavior:**

- absent/invalid/unknown/ambiguous host fails closed;
- no `rm-prime` or other default tenant;
- local development requires explicit `PUBLIC_DEV_TENANT_SLUG`;
- client, `x-tenant-id`, pathname and query parameters are not authorities;
- active-state filtering may be added only when the canonical tenant status literal is proved from repository/schema evidence.

**Out of scope:** tenant filters in individual domain queries or mutations.

### 5.2 PTQ-01 — Public Tenant Query Binding

**Objective:** bind every public read to the accepted PTC-01 context.

**Owned surfaces:**

- site and Meta public settings;
- CMS pages and public form definitions;
- active campaign listing;
- catalog, cities, neighborhoods and property detail;
- blog posts and categories;
- launch status, amenities, listing and detail.

**Required behavior:** explicit `tenant_id = resolved tenant` on service-role reads; server-derived transport header only when required by accepted RLS; no client tenant parameter.

**Out of scope:** inserts, updates and operational/privileged endpoints.

### 5.3 PTM-01 — Public Tenant Mutation Binding

**Objective:** bind every public mutation to the accepted PTC-01 context and prove cross-tenant denial.

**Owned surfaces:**

- public lead creation;
- form submission and form-derived lead creation;
- campaign events;
- portal lead property association;
- token/slug/cardinality and forged-payload negative tests.

**Required behavior:** every service-role write receives tenant attribution from server-owned context; supplied resource IDs must be revalidated inside the same tenant.

**Out of scope:** bootstrap admin, DLQ hook authentication and CMS renderer security.

### 5.4 PSG-01 — Public Surface Security Gate

PSG-01 remains responsible for:

- anonymous privileged bootstrap;
- operational webhook/cron authentication;
- CMS HTML sanitization;
- iframe/embed allowlist;
- link and media URL safety.

It is blocked until PTM-01 is Accepted.

---

## 6. Evidence and budget

| Stage | Principal | Corrective | Executor |
|---|---:|---:|---|
| PTC-01 | 1 direct-file PR | max 1 | Direct GitHub connector |
| PTQ-01 | 1 direct-file PR | max 1 | Direct GitHub connector |
| PTM-01 | 1 direct-file PR | max 1 | Direct GitHub connector |
| PSG-01 | 1 direct-file PR | max 1 | GitHub-native, frozen by its own envelope |
| HVP-01 | evidence runbook | none as feature implementation | operator + GitHub evidence |

A failed corrective requires a terminal decision. The same material scope cannot be restarted under a renamed stage without another explicit decomposition or executor change.

---

## 7. Invariants

- server remains sole tenant authority;
- no fallback/default tenant;
- no client/header/path authority;
- fail closed on absence or ambiguity;
- no external Supabase canonical fallback;
- Same-Backend Homologation Cell preserved;
- accepted phases and terminal stages remain closed;
- Lovable budget remains zero for release-critical work.

---

## 8. Definition of Done

- PTH-01 terminal rejection recorded;
- no PTH code merged;
- public tenant work decomposed into three distinct outcomes;
- executor changed from broad codemod to direct file changes;
- PSG and HVP dependencies updated;
- next stage uniquely identified.

All criteria are satisfied.

---

## 9. Successor

```text
NEXT_STAGE_AUTHORIZED = PTC-01
AUTHORIZED_EXECUTOR = Direct GitHub file changes
LOVABLE_AUTHORIZED = false
```
