# PTW-01 — Final Implementation Acceptance

## Status

**Accepted — implementation merged and reconciled**

```text
STAGE_ID = PTW-01
PLANNING_STATE = Accepted
IMPLEMENTATION_STATE = Accepted
FINAL_EXTERNAL_AUDIT = Accepted
IMPLEMENTATION_PR = 42
IMPLEMENTATION_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a
IMPLEMENTATION_MERGE_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
IMPLEMENTATION_MERGED = true
CANONICAL_ISSUE = 16
EXECUTOR = GitHub-native
LOVABLE_AUTHORIZED = false
```

## 1. Merge evidence

PR #42 was merged only after direct final GitHub audit acceptance and an immediate pre-merge gate confirming the exact PR head, unchanged `main`, mergeability, zero blocking reviews, zero unresolved review threads and a successful Release Gate.

The merge used expected-head protection:

```text
EXPECTED_HEAD_SHA = 312bcc329deaf6f10447aa821833d62dba2e854a
MERGE_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
PR_STATE_AFTER_MERGE = closed
PR_MERGED = true
```

Direct post-merge comparison confirmed:

```text
MAIN_HEAD = 82b1ead61e8edde6b70454b758c4b51ccded9a4f
MAIN_EQUALS_MERGE_HEAD = true
IMPLEMENTATION_HEAD_IS_ANCESTOR = true
COMMITS_AFTER_IMPLEMENTATION_HEAD = 1 merge commit
CONCURRENT_POST_MERGE_DRIFT = false
```

## 2. Accepted implementation scope

The accepted implementation changed exactly 20 files within the frozen PTW-01 envelope:

```text
package.json
run-public-tenant-writer-authority-specs.ts
run-public-tenant-writer-sql-structural-specs.ts
scripts/verify-release.mjs
src/lib/__tests__/public-tenant-writer-authority.spec.ts
src/lib/__tests__/public-tenant-writer-sql-structural.spec.ts
src/lib/api/campaigns.functions.ts
src/lib/api/catalogo.functions.ts
src/lib/api/forms.functions.ts
src/lib/api/meta.functions.ts
src/lib/public-writers/portal-writer.server.ts
src/lib/public-writers/public-campaign-writer.server.ts
src/lib/public-writers/public-lead-writer.server.ts
src/lib/public-writers/public-writer-authority.server.ts
src/routes/anuncie.tsx
src/routes/api/public/feeds.$portal.$token.ts
src/routes/api/public/hooks/portal-dlq-retry.ts
src/routes/api/public/portal-leads.ts
src/routes/contato.tsx
supabase/migrations/20260721190000_ptw_01_public_writer_dml_hardening.sql
```

No dependency version, lockfile, workflow definition, generated route tree, Auth, Storage, accepted LSH boundary, `create_manual_lead`, tenant middleware or public tenant resolver was altered outside the accepted envelope.

Exactly one PTW-01 migration exists.

## 3. Accepted runtime authority

The merged implementation establishes:

- Host-derived tenant authority before service-role access for public site leads, forms, campaign events and Meta CAPI;
- exact 0/1/N cardinality and explicit post-validation of tenant-scoped rows;
- tenant-bound validation of property, launch, broker, form, fields, campaign, Meta settings and portal operations;
- explicit `tenant_id` in tenant-scoped writes;
- one shared public lead writer across direct site, form, immediate portal and DLQ replay paths;
- one portal mutation path for immediate ingestion and replay;
- connector authority by `portal_slug + token`, with inactive and ambiguous connectors denied;
- feed behavior that distinguishes zero total links from existing noneligible links and fails closed on ambiguous link state;
- removal of direct anonymous campaign-event DML while preserving authenticated and server-side behavior.

## 4. Same-backend SQL evidence

A Rodolfo-authorized, read-only audit against the homologation-bound Supabase backend established:

```text
EXACT_LEGACY_POLICY_NAME = events_public_insert
DIRECT_PUBLIC_TABLE_GRANTS = none
ANON_DIRECT_GRANTS = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
AUTHENTICATED_DIRECT_GRANTS = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
SERVICE_ROLE_DIRECT_GRANTS = DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
SANDBOX_EXEC_DIRECT_GRANTS = INSERT, SELECT
```

The accepted migration:

- drops only `events_public_insert` using `DROP POLICY IF EXISTS`;
- revokes `INSERT`, `UPDATE`, `DELETE` and `TRUNCATE` only from `anon`;
- does not revoke from `PUBLIC`;
- creates no compensating grant;
- preserves `authenticated`, `service_role`, `postgres`, `sandbox_exec`, `events_admin_read` and `tenant_isolation`;
- is idempotent for first, repeated and already-hardened execution;
- fails closed on additional unexpected anonymous/PUBLIC INSERT policies.

Read-only evidence references:

```text
PR_42_EVIDENCE_COMMENT = 5038605726
ISSUE_16_EVIDENCE_COMMENT = 5038609396
```

## 5. Release Gate evidence

```text
RELEASE_GATE_RUN = 29866481241
RELEASE_GATE_JOB = 88755888278
RELEASE_GATE_CONCLUSION = success
ARTIFACT_ID = 8509468989
ARTIFACT_DIGEST = sha256:269182b91d0b242a7117505d3414cdd879b9bb2b567f76cb5b71410bb711ca82
ARTIFACT_HEAD = 312bcc329deaf6f10447aa821833d62dba2e854a
RELEASE_GATE_ARTIFACT_UPLOADED = true
```

```text
PTC01 = 10 passed, 0 failed
PTR01 = 7 passed, 0 failed
PSC01 = 11 passed, 0 failed
PPR_GN_01 = 13 passed, 0 failed
PTW01_AUTHORITY = 14 passed, 0 failed
PTW01_SQL_STRUCTURAL = 8 passed, 0 failed
LSH01_UNIT = 22 passed, 0 failed
LSH01_RUNTIME = 15 passed, 0 failed
LSH01_STRUCTURAL = 27 passed, 0 failed
LSH01_SQL_STRUCTURAL = 17 passed, 0 failed
TYPECHECK = success
BUILD = success
BUILD_DEV = success
DETERMINISTIC_ROUTE_TREE = success
```

## 6. Final governance decision

```text
PTW01_IMPLEMENTATION_STATE = Accepted
PTW01_IMPLEMENTATION_MERGED = true
PTW01_FINAL_EXTERNAL_AUDIT = Accepted

PSG01_PLANNING_AUTHORIZED = true
PSG01_IMPLEMENTATION_AUTHORIZED = false
MAX_ACTIVE_PSG01_PLANNING_PRS = 1

LOVABLE_AUTHORIZED = false
```

The only authorized next action is Architecture First planning for PSG-01. No PSG-01 runtime, migration, RLS, grant or security implementation is authorized by this acceptance record.
