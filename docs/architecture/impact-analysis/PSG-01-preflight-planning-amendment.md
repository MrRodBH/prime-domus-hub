# PSG-01 — Preflight Planning Amendment

## Status

**Ready for Direct External Audit — implementation resume not authorized**

```text
STAGE_ID = PSG-01
AMENDMENT_ID = PSG-01-PPA
CURRENT_MAIN_BASELINE = 443b537aa68d007b729aba37ee87d6cc1f62e344
CANONICAL_ISSUE = 4
AUTHORIZED_EXECUTOR = GitHub-native
AMENDMENT_BRANCH = agent/psg-01-preflight-planning-amendment
AMENDMENT_AUTHORIZED = true
AMENDMENT_STATE = Ready for Direct External Audit
AMENDMENT_MERGE_AUTHORIZED = false
IMPLEMENTATION_RESUME_AUTHORIZED = false
LOVABLE_AUTHORIZED = false
```

---

## 1. Trigger and terminal implementation-attempt state

```text
ORIGINAL_PLANNING_PR = 44
ORIGINAL_PLANNING_HEAD = 32ddbcf46e26cdf67ba0c1a4284b374341bb4892
ORIGINAL_PLANNING_MERGE_HEAD = 0f23e4198cf7caf1ad046a32b861f4397994a607
IMPLEMENTATION_PR = 46
IMPLEMENTATION_HEAD = dda7ca8a074afffe9d8edd89eb57000444dc77dd
IMPLEMENTATION_PR_STATE = Closed — Unmerged
RUNTIME_IMPLEMENTATION_APPLIED = false
FINAL_CHANGED_FILES = 0
```

Direct full-repository preflight stopped implementation before runtime edits. Temporary inspection instrumentation was reverted before PR #46 was closed.

---

## 2. Direct finding — second anonymous bootstrap authority

```text
FILE = src/lib/api/admin.functions.ts
SYMBOL = bootstrapAdmin
SURFACE = createServerFn({ method: "POST" })
AUTH_MIDDLEWARE = absent
INPUT = anonymous email/password
SERVICE_ROLE = supabaseAdmin
AUTH_USER_CREATION = true
EMAIL_CONFIRMATION = true
GLOBAL_ADMIN_ROLE_INSERT = true
FIRST_PARTY_REFERENCE_COUNT_EXCLUDING_DEFINITION = 0
```

Deleting only the public route would leave an anonymous application-runtime authority capable of provisioning a confirmed Auth user and global admin role.

### Decision

```text
src/routes/api/public/bootstrap-admin.ts = delete
src/lib/api/admin.functions.ts::bootstrapAdmin = delete
replacement public route = prohibited
replacement server function = prohibited
replacement deploy-secret endpoint = prohibited
operator-only provisioning = required
```

`src/lib/api/admin.functions.ts` may change only through exact deletion of the `bootstrapAdmin` export. All remaining code is immutable.

---

## 3. Direct finding — portal DLQ caller and transport evidence

Current authentication:

```text
apikey == SUPABASE_PUBLISHABLE_KEY
OR
x-cron-secret == CRON_SECRET
```

Repository-wide evidence:

```text
PRODUCTION_SCHEDULER_DEFINITION = absent
APPLICATION_RUNTIME_CALLER = absent
PG_CRON_HTTP_CALL_TARGETING_ROUTE = absent
DEPLOYMENT_WORKFLOW_CALLER = absent
LEGACY_QA_CALLER = tests/portals/test_public_endpoints.py
NEGATIVE_SECURITY_CALLER = tests/security/test_tenant_isolation.py
PTW_STRUCTURAL_AUTH_ASSERTION = src/lib/__tests__/public-tenant-writer-authority.spec.ts
EXTERNAL_SCHEDULER_IDENTITY = unproven
EXTERNAL_SCHEDULER_SUPPORTED_HEADER = unproven
```

Neither legacy test is scheduler authority. They must be reconciled narrowly when PSG-01 changes authentication.

### Decision

```text
SECRET_ENV = PORTAL_DLQ_RETRY_SECRET
TRANSPORT = Authorization: Bearer
PARSER = exactly one bearer credential
COMPARISON = constant-time equal-length digest comparison
MISSING_SERVER_SECRET = deny all
PUBLISHABLE_KEY_AUTH = prohibited
CRON_SECRET_AUTH = prohibited
X_CRON_SECRET_HEADER = prohibited
QUERY_OR_BODY_SECRET = prohibited
REPOSITORY_SCHEDULER_CREATION = prohibited
PTW_REPLAY_BUSINESS_PATH_CHANGE = prohibited
```

`docs/runbooks/portal-dlq-retry.md` must define secret generation, deployment configuration, scheduler bearer transport, rotation and negative verification. HVP-01 must require operator evidence before replay is considered enabled.

---

## 4. Amended implementation FILES_ALLOWED

### Newly added

```text
src/lib/api/admin.functions.ts                            # delete bootstrapAdmin export only
src/lib/__tests__/public-tenant-writer-authority.spec.ts   # DLQ auth assertion only
tests/portals/test_public_endpoints.py                    # DLQ auth case only
docs/runbooks/portal-dlq-retry.md
```

### Existing relevant entries preserved

```text
src/routes/api/public/bootstrap-admin.ts                  # deletion only
src/routes/api/public/hooks/portal-dlq-retry.ts          # authentication boundary only
src/lib/operational-route-auth.server.ts                 # new dedicated auth module
docs/runbooks/initial-admin-bootstrap.md
src/routeTree.gen.ts                                     # generated consequence only
```

### Immutability

```text
admin.functions.ts → only bootstrapAdmin deletion
PTW authority spec → only DLQ auth assertion
portal QA test → only DLQ auth case
DLQ route → authentication boundary only
PTW business replay path → unchanged
repository scheduler/provider/workflow creation → prohibited
```

---

## 5. Required executable evidence

```text
bootstrap route absent
bootstrapAdmin server function absent
remaining admin.functions.ts code preserved
no replacement privileged bootstrap surface
initial-admin runbook present
portal-DLQ runbook present
missing/wrong/malformed/legacy credentials denied
correct dedicated bearer accepted
service role imported only after auth
legacy QA publishable-key success removed
PTW connector/replay assertions preserved
repository scheduler created = false
```

The planning amendment itself remains documentation-only. The existing Release Gate must prove repository integrity and deterministic generation on the exact amendment HEAD without workflow changes.

---

## 6. Explicit prohibitions

This amendment does not authorize:

- runtime implementation;
- migrations, schema, RLS, grants, functions or triggers;
- Auth configuration or Storage changes;
- tenant resolver, middleware or impersonation changes;
- scheduler, `pg_cron`, queue, provider or workflow creation;
- PTW replay business changes;
- non-bootstrap changes in `admin.functions.ts`;
- replacement bootstrap endpoint or server function;
- Lovable execution;
- merge before direct audit acceptance.

---

## 7. Definition of Done

```text
SECOND_BOOTSTRAP_AUTHORITY_INVENTORIED = true
BOOTSTRAP_ROUTE_DECISION = delete
BOOTSTRAP_SERVER_FN_DECISION = delete
BOOTSTRAP_RUNTIME_REPLACEMENT = prohibited
ADMIN_FUNCTIONS_IMMUTABILITY_EXPLICIT = true

DLQ_REPOSITORY_SCHEDULER_EVIDENCE = absent
DLQ_EXTERNAL_SCHEDULER_NOT_ASSUMED = true
DLQ_DEDICATED_BEARER_DECISION = frozen
DLQ_UNCONFIGURED_FAIL_CLOSED = true
DLQ_OPERATOR_RUNBOOK_REQUIRED = true
DLQ_HOMOLOGATION_ENABLEMENT_REQUIRES_OPERATOR_EVIDENCE = true
PTW_AUTH_ASSERTION_RECONCILIATION_SCOPED = true
LEGACY_QA_AUTH_RECONCILIATION_SCOPED = true

FILES_ALLOWED_AMENDED = true
RUNTIME_FILES_CHANGED = 0
DEPENDENCIES_CHANGED = 0
LOCKFILE_CHANGED = 0
MIGRATIONS_CHANGED = 0
RLS_GRANTS_CHANGED = 0
AUTH_STORAGE_CHANGED = 0
WORKFLOW_CHANGED = 0
LOVABLE_USED = false
RELEASE_GATE_GREEN = required
DIRECT_EXTERNAL_AUDIT = required
IMPLEMENTATION_RESUME_AUTHORIZED = false
```

---

## 8. Submission decision

```text
AMENDMENT_STATE = Ready for Direct External Audit
AMENDMENT_MERGE_AUTHORIZED = false
IMPLEMENTATION_RESUME_AUTHORIZED = false
NEXT_ACTION = direct audit of exact PR diff, reviews, Release Gate and artifact
```

Only after direct audit acceptance and protected merge may the product owner issue a new explicit PSG-01 implementation authorization.
