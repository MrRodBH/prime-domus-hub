# PSG-01 — Planning Submission

## Status

**Ready for Final External Audit after successful Release Gate**

```text
STAGE_ID = PSG-01
BASELINE_MAIN = 55e0a7b95aedd767c605bceb1ea84999ecf08145
CANONICAL_ISSUE = 4
PLANNING_BRANCH = agent/psg-01-planning
PLANNING_ONLY = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

---

## 1. Submission purpose

This submission packages the Architecture First planning outcome for the Public Surface Security Gate.

It contains no runtime, dependency, lockfile, migration, RLS, grant, Auth, Storage, public-writer, workflow or generated-route change.

The planning output freezes the implementation envelope and submits it for direct GitHub audit. Planning merge and implementation authorization remain separate decisions.

---

## 2. Planning authority

```text
docs/architecture/impact-analysis/PSG-01-public-surface-security-gate-impact-analysis.md

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
```

The blog/menu/launch findings are current-main PSG-01 residuals. They do not reclassify or reopen historical PTR-01.

---

## 4. Frozen implementation workstreams

```text
A. delete anonymous bootstrap-admin route and add operator runbook
B. dedicated bearer-secret boundary for portal DLQ retry
C. explicit TanStack Start serverFn CSRF middleware
D. pinned server-side HTML sanitization policy
E. central URL, media and embed destination policy
F. Host/tenant binding for public blog, menu and launch reads
G. executable negative security and tenant-read evidence
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

### 5.5 Public reads

```text
Host → tenant → tenant equality → 0/1/N or collection validation → safe DTO
```

No global slug, global anonymous client, `maybeSingle()` authority, tenant fallback or first-row authority is accepted.

---

## 6. Planning scope integrity

The planning PR must change exactly these three documentation files:

```text
docs/architecture/impact-analysis/PSG-01-public-surface-security-gate-impact-analysis.md

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-public-surface-security-inventory.md

docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/
psg-01-planning-submission.md
```

Expected planning assertions:

```text
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

## 7. Required planning Release Gate

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

No PSG runtime suite is expected in the planning-only PR.

---

## 8. Direct final audit checklist

The planning audit must confirm:

1. `main` remains at the audited baseline while the PR is open;
2. exactly one PSG-01 planning branch and one planning PR exist;
3. exactly three documentation files changed;
4. every material finding is directly supported or labeled as hypothesis;
5. the implementation envelope covers the four canonical issue families and the proven residual tenant-read surfaces;
6. bootstrap removal does not authorize a replacement public service-role endpoint;
7. DLQ authentication changes cannot alter the accepted PTW business path;
8. CSRF planning preserves intentional public server routes;
9. HTML and destination policies are centralized, server-side and fail-closed;
10. exact sanitizer dependencies and lockfile impact are frozen;
11. `FILES_ALLOWED` is complete but does not authorize unrelated refactors;
12. migrations, RLS, grants, Auth, Storage and accepted writer boundaries remain prohibited;
13. Release Gate artifact is tied to the final planning HEAD;
14. implementation remains unauthorized after planning audit.

---

## 9. Terminal planning state

```text
PSG01_PLANNING_STATE = Ready for Final External Audit
PSG01_IMPLEMENTATION_AUTHORIZED = false
PSG01_IMPLEMENTATION_STARTED = false
MERGE_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

No implementation instruction is emitted by this submission.