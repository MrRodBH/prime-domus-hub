# HRC-01 — Homologation Readiness Closure Impact Analysis

## Status

**Planning — Ready for Direct External Audit**

```text
STAGE_ID = HRC-01
STAGE_NAME = Homologation Readiness Closure
STAGE_TYPE = planning and documentation only
CURRENT_MAIN_BASELINE = f9326691f561b958c2a4ed7230dd5bf6059a8df4
HISTORICAL_HVP01_PLANNING_HEAD = 3735d1543a6e6be93fb452a96e258237e781644f
UNAUTHORIZED_DRIFT_COMMIT = 9617cdb8e930376b9a30c1054362ef1c052cdea5
REJECTION_RECORD_COMMIT = f9326691f561b958c2a4ed7230dd5bf6059a8df4
HRC01_PRINCIPAL_PROMPT_CONSUMED = true
HRC01_CORRECTIVE_PROMPT_CONSUMED = true
HRC01_REMAINING_PROMPT_BUDGET = 0/2
HRI01_STARTED = false
HRI01_AUTHORIZED = false
LIVE_EXECUTION_AUTHORIZED = false
PASSIVE_BLOCKED_EXTERNAL_ALLOWED = false
```

---

## 1. Purpose

HRC-01 is the documentary closure stage that supersedes HVP-01 as the active
readiness authority. It preserves HVP-01 fail-closed evidence as historical
input, records the toolchain drift reversal executed in this stage, and
defines an internally resolvable path to controlled homologation without any
passive `Blocked External` posture.

HRC-01 does not implement runtime, migrations, workflows, mutations,
fixtures or session acquisition. Implementation is the responsibility of
HRI-01, which remains not authorized.

---

## 2. Authority and baseline

```text
CURRENT_MAIN_BASELINE = f9326691f561b958c2a4ed7230dd5bf6059a8df4
HISTORICAL_HVP01_PLANNING_HEAD = 3735d1543a6e6be93fb452a96e258237e781644f
UNAUTHORIZED_DRIFT_COMMIT = 9617cdb8e930376b9a30c1054362ef1c052cdea5
```

The unauthorized drift commit modified `package.json` and `bun.lock` outside
any authorized envelope:

```text
@lovable.dev/vite-tanstack-config          2.7.6 → 2.7.7
@lovable.dev/vite-plugin-dev-server-bridge 1.1.1 → 1.2.1
```

Both files were restored exactly from the audited historical HEAD
`3735d154...` in this stage, using `git show` — no manual edit, no
dependency update, no lockfile regeneration. Post-restoration verification:

```text
PACKAGE_JSON_EXACTLY_RESTORED = true
BUN_LOCK_EXACTLY_RESTORED = true
TOOLCHAIN_DRIFT_REVERSED = true
```

The drift commit remains in history as evidence and is not rewritten.

---

## 3. Protected baseline facts

```text
SUPABASE_PROJECT_REF                    = stmcnvzuzlyqammyycxj
RM_PRIME_TENANT_ID                      = 9664d189-4a12-4caa-8243-dc73383447e6
PROTECTED_RESIDUE_TENANT_COUNT          = 73
HISTORICAL_ORDERED_MD5                  = 3ece053ddbdfce5161380ec38824ea91
CURRENT_73_REGISTRY_SHA256              = 33f7142d5b8fff00c97cf1cd1909e6c7c60611b957e16a6b5b43c4c67f2a65a3
PROTECTED_FULL_REGISTRY_SHA256          = e646564079e1f8d15e0dec45cf5694e2ba36c6199370b30e0dc14a34c1edaaa3
PROTECTED_STORAGE_REGISTRY_SHA256       = 2e7951428c58c6cd5be36e800c21964b775a2c74fc6a11f7b01aaacb447de8bd
```

Operational classification:

```text
EXTERNAL_CUSTOMER_TENANTS               = 0
EXTERNAL_USERS                          = 0
LEADS                                   = 0
FORM_SUBMISSIONS                        = 0
IMOVEIS                                 = 0
MEDIA_LIBRARY_ROWS                      = 0
BILLING_EVENTS                          = 0

AUTH_USERS                              = 4
RM_PRIME_MEMBERSHIPS                    = 4

INTERNAL_RESIDUE_SUBSCRIPTIONS          = 65
REAL_COMMERCIAL_SUBSCRIPTIONS           = 0

STORAGE_BUCKETS                         = 3
PROTECTED_STORAGE_OBJECTS               = 22
PROTECTED_STORAGE_TOTAL_BYTES           = 15826788
```

Identity of protected objects is by canonical ID only. Name, slug, e-mail,
prefix and heuristic descriptors are not authority.

---

## 4. Semantics of dependencies — no passive external waiting

`Blocked External` is preserved only as historical security evidence. It is
prohibited as an active posture for any HRC-01, HRI-01, VSP-01 or LSV-03
dependency. Every dependency must carry:

```text
RESOLUTION_OWNER
RESOLUTION_STAGE
RESOLUTION_SCOPE
INTERNAL_REMEDIATION_PATH
ENTRY_GATE
EXIT_GATE
NEXT_EXECUTABLE_ACTION
```

`NEXT_ACTION = await external evidence` is not permitted.

---

## 5. Internal resolutions — planning only

### 5.1 Release Gate — self-evidencing

Preserve the current release-gate contract in
`.github/workflows/release-gate.yml`:

```text
pull_request → main
push → main
bun install --frozen-lockfile
bun run verify:release
```

HRI-01 must add, without altering existing triggers:

```text
workflow_dispatch with required expected_sha input
checkout of the exact SHA (no ref fallback)
strict comparison of checked-out SHA to expected_sha
run of verify:release
capture of: artifact ID, artifact digest, run ID, job ID, conclusion
automatic evidence comment on the canonical issue
retention consistent with existing 14-day artifact retention
```

`RESOLUTION_OWNER = HRI-01`.
`INTERNAL_REMEDIATION_PATH = self-evidencing workflow_dispatch job`.
`EXIT_GATE = release-gate artifact SHA + issue comment recorded`.

### 5.2 Maintenance Boundary — server-authoritative

State machine (server-owned only):

```text
NORMAL       → default operational state
PREPARING    → snapshot / evidence pre-freeze
ACTIVE       → mutations, cron, PGMQ, net.http_post, webhooks, mail suspended
RESTORING    → post-verification restoration
FAILED_CLOSED → any ambiguity fails closed
```

Client, header, path or client-selected tenant may not carry maintenance
authority. Any ambiguity yields:

```text
PUBLIC_WRITES_ALLOWED     = false
OUTBOUND_EFFECTS_ALLOWED  = false
```

`RESOLUTION_OWNER = HRI-01`.
`INTERNAL_REMEDIATION_PATH = server-derived boundary read at every writer + async worker`.
`EXIT_GATE = negative tests proving ambiguity fails closed`.

### 5.3 Public writers — inventory and controls

Canonical writer contracts must be enumerated by reading the repository. The
authoritative table names to inspect are:

```text
public.leads
public.form_submissions
public.cms_campaign_events
public.cms_campaign_public_events
```

The canonical name between `cms_campaign_events` and
`cms_campaign_public_events` must be resolved by direct repository
inspection in HRI-01 (both migration and server writer references), not
assumed here.

Every writer must:

1. derive tenant server-side (`requirePublicTenantFromRequest`);
2. read the Maintenance Boundary before mutation;
3. reject any client-supplied `tenant_id`;
4. carry a negative test proving direct anonymous REST bypass is blocked;
5. log without PII.

`RESOLUTION_OWNER = HRI-01`.
`EXIT_GATE = negative REST bypass suite green + PII-free log audit`.

### 5.4 Async outbound controls

Async surfaces to gate during `ACTIVE`:

```text
portal-dlq-retry
cron.job entries
pgmq queues
email_queue_wake
email_queue_dispatch
net.http_post
portal webhooks
outbound emails
```

While `ACTIVE`:

```text
CRON_SIDE_EFFECT_ALLOWED   = false
PGMQ_CONSUMPTION_ALLOWED   = false
NET_HTTP_POST_ALLOWED      = false
WEBHOOK_DISPATCH_ALLOWED   = false
OUTBOUND_EMAIL_ALLOWED     = false
```

Enforcement is a server-side boundary check inside each dispatcher; no
scheduler pause is required.

`RESOLUTION_OWNER = HRI-01`.
`EXIT_GATE = negative tests proving no outbound effects fire during ACTIVE`.

### 5.5 Capability-isolated recovery

HRI-01 executor must be technically incapable of:

- updating any preexisting row;
- deleting any preexisting row;
- altering protected users or memberships;
- altering settings, versions or domain of the protected tenant;
- altering any of the 22 protected Storage objects;
- deleting any ID not present in the current `run_id` manifest.

Design pattern:

```text
NO_PREEXISTING_MUTATION_CAPABILITY_BOUNDARY
PROTECTED_RECOVERY_BUNDLE (ID-scoped, deterministic, atomic)
```

`RESOLUTION_OWNER = HRI-01`.
`EXIT_GATE = executor capability test refuses updates/deletes on any
preexisting protected ID`.

### 5.6 Protected baseline preservation

Registry by canonical ID for:

- RM Prime tenant;
- four Auth users;
- four memberships;
- settings and versions;
- domain records;
- 73 residue tenants (`PROTECTED_RESIDUE`, not fixtures, never targeted by
  name / slug / prefix);
- 22 Storage objects across 3 buckets with exact paths and byte counts;
- hashes above.

`RESOLUTION_OWNER = HRC-01 (this stage) + HRI-01 (checks)`.

---

## 6. Product Experience Parallel Lane

```text
PRODUCT_EXPERIENCE_PLANNING_BLOCKED_BY_HVP01                     = false
PRODUCT_EXPERIENCE_PLANNING_BLOCKED_BY_HRC01                     = false
PRODUCT_EXPERIENCE_RUNTIME_IMPLEMENTATION_AUTHORIZED             = false
```

The parallel lane may plan (no runtime here):

- dashboard and "gestão à vista";
- dark analytical surfaces and chart library;
- tenant onboarding;
- users, profiles, roles and permissions;
- own-domain setup;
- site personalization and publication;
- portal connections and integration diagnostics.

No UI, no server function, no migration is created by HRC-01.

---

## 7. HRI-01 inventory — files to be touched (planning only)

HRI-01 must limit runtime changes to files that already exist and are
verified by direct repository inspection at HRI-01 entry. Non-exhaustive
inventory anchors, subject to HRI-01 read-only diagnostic before edit:

```text
Release Gate:
  .github/workflows/release-gate.yml

Public writers:
  src/lib/public-writers/public-lead-writer.server.ts
  src/lib/public-writers/public-campaign-writer.server.ts
  src/lib/public-writers/portal-writer.server.ts
  src/lib/public-writers/public-writer-authority.server.ts

Tenant authority:
  src/lib/tenant.server.ts
  src/lib/public-tenant-read-guards.ts
  src/lib/public-tenant-resolution-error.ts

Maintenance boundary (new module, path TBD in HRI-01):
  src/lib/maintenance-boundary.server.ts

Async controls:
  src/lib/portal-engine.server.ts
  src/lib/email/notify.server.ts
  supabase/migrations/*  (new migration; existing not altered)

Tests:
  src/lib/__tests__/public-*.spec.ts
  tests/**  (negative REST bypass and ACTIVE-state suites)

Evidence:
  docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/**

Governance:
  docs/architecture/governance/HRC-01-roadmap-reconciliation.md
  docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md
```

Every file above must be re-verified by HRI-01 before any edit. HRC-01 does
not modify any of them.

---

## 8. FILES_ALLOWED — HRC-01

```text
FILES_ALLOWED = [
  "package.json",
  "bun.lock",
  "docs/architecture/impact-analysis/HRC-01-homologation-readiness-closure-impact-analysis.md",
  "docs/architecture/governance/HRC-01-roadmap-reconciliation.md",
  "docs/architecture/impact-analysis/HVP-01-homologation-validation-preflight-impact-analysis.md",
  "docs/architecture/governance/HVP-01-roadmap-reconciliation.md",
  "docs/architecture/governance/DELIVERY_RECOVERY_EXECUTION_MAP_GITHUB_NATIVE_AMENDMENT.md",
  "docs/architecture/impact-analysis/README.md"
]
```

`package.json` and `bun.lock` are authorized exclusively for exact restoration
to their `3735d154...` content. No other change is permitted.

---

## 9. Prohibitions

Not altered by HRC-01:

```text
.github/workflows/release-gate.yml
src/**
supabase/**
tsconfig.json
vite.config.ts
components.json
.env
```

Not executed by HRC-01:

```text
migration, DDL, DML, INSERT, UPDATE, DELETE, UPSERT, MERGE, TRUNCATE,
DROP, ALTER, CREATE POLICY, GRANT, REVOKE,
workflow_dispatch, deployment, publish, database reset,
fixture creation, session acquisition,
Storage upload / delete, Auth mutation,
cron mutation, queue mutation, net.http_post, webhook, outbound email,
force push, destructive reset of main.
```

Commits `9617cdb8...` and `f9326691...` remain untouched as evidence.

---

## 10. Definition of Done

1. remote `main` equals `f9326691...`;
2. local branch is a valid descendant of the baseline;
3. no preexisting worktree drift before the edit set;
4. `package.json` byte-identical to `3735d154...`;
5. `bun.lock` byte-identical to `3735d154...`;
6. two HRC-01 documents created;
7. HVP-01 documents and delivery recovery amendment reconciled;
8. HVP-01 recorded as `Superseded — historical fail-closed evidence preserved`;
9. no passive `Blocked External` posture remains for any dependency;
10. every dependency carries an internal remediation path;
11. Product Experience Parallel Lane formalized;
12. HRI-01 files_allowed anchors defined;
13. HRI-01 stays not authorized;
14. no runtime, migration or workflow altered;
15. `git diff --check` passes;
16. `bun install --frozen-lockfile` passes;
17. `bun run verify:release` passes;
18. single, non-contradictory status heading;
19. terminal state records:

```text
HRC01_STATE = Planning — Ready for Direct External Audit
```

Not `Accepted`. Not homologation-eligible.
