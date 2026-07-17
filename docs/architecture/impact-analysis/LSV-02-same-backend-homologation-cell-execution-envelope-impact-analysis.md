# LSV-02 — Same-Backend Homologation Cell Execution Envelope (Impact Analysis)

## Status

Ready for External Audit

**Type:** Execution Envelope revision — documentation and governance only.
**Scope:** LSV-02 — Live Identity & Tenant Context Verification.
**Predecessor:** LSV-01 — Superseded (terminal).
**Successor:** LSV-03 (remains blocked by LSV-02).
**Baseline HEAD (reference):** `f21677cc84be5c3ae4cf58e82edfc16cf2616bdc`
**Governance:**
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md` ·
`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`

This document is the frozen, binding contract for the LSV-02 Execution
Envelope. It replaces the previous mandatory dependency on a separate
non-production Supabase project with a conditional, gated
**Same-Backend Homologation Cell** strategy. It is a planning artifact
only: it does not start LSV-02, does not constitute a principal or
corrective prompt, does not consume prompt budget, does not execute
tests, does not create fixtures and does not alter database, code,
migrations, RLS, grants, runners or secrets.

---

## 1. Architectural decision

The RM Prime SaaS product does not require two databases to function.
The previously planned second Supabase project was an operational
isolation strategy, not an architectural requirement of the product.

LSV-02 may therefore be executed against the current primary backend
**only while that backend is in a proven pre-homologation condition**.
The isolation of the proof is achieved at the level of fixtures,
synthetic tenants, synthetic identities, per-run manifest and
deterministic teardown, not at the level of a separate project.

The external non-production Supabase project `rm-prime-lsv-nonprod`
(project ref `adxqbrfcqhnoierwhymj`) remains preserved as an optional
fallback and is not to be deleted, altered or used by this revision.

The Same-Backend Homologation Cell strategy is permanently prohibited
once the product enters real operation with clients or production data.

## 2. Protected Baseline — RM Prime tenant

The institutional RM Prime tenant is classified as
**Protected Baseline Tenant**. The Execution Envelope requires:

- the tenant's canonical ID to be identified before execution;
- the ID to be registered in a protected-entity list;
- the tenant record to never be updated or deleted by the harness;
- preexisting memberships to never be modified;
- preexisting leads, imóveis, contents, settings, domains and files to
  never be used as fixtures;
- none of the tenant's data to appear in the cleanup manifest;
- factual counts and invariants to be snapshotted before and after the
  run and compared for equality.

Name-based protection is insufficient. Protection uses the canonical
tenant ID and a factual baseline snapshot.

## 3. Homologation Cell composition

The cell contains, at minimum, two synthetic tenants: **RM Prime HML A**
and **RM Prime HML B**. These are human labels only; authority remains
in the IDs generated and registered by the harness.

- Tenant A represents the legitimate principal context.
- Tenant B is the adversarial context required for forged-header
  probes, cross-tenant isolation, impersonation proofs, Tenant Context
  validation and confirmation of absence of undue access.

Reducing LSV-02 to a single tenant is prohibited because it would
prevent operational proof of cross-tenant isolation.

The cell uses exclusively synthetic tenants, synthetic Auth users,
synthetic memberships, synthetic roles, synthetic imóveis, synthetic
leads, synthetic events and synthetic Storage objects.

## 4. Eligibility preflight (entry gate)

Execution is authorized only when a factual runbook proves **all** of:

1. product is still formally in pre-homologation;
2. no external customer tenants are in operation;
3. no real commercial subscriptions exist;
4. no real payments or billing events exist;
5. no real client leads exist;
6. no imóveis or media contain real client data;
7. no real external users are operating the system;
8. no real personal data would be affected;
9. public write traffic is suspended or controlled during the window;
10. explicit operator authorization is granted for the run;
11. a recovery/backup mechanism is in place prior to the run.

RM Prime's own internal data does not authorize using it as fixture; it
remains solely as protected, untouchable baseline. If any customer,
external tenant, real subscription, real lead, real user or real
personal datum is identified, the strategy **fails closed**, LSV-02
remains or returns to Blocked External, and the second isolated
environment becomes mandatory again. Classification cannot rest on
names, prefixes or assumptions.

## 5. Hard guards (frozen)

- **HG-01 Explicit mode** — execution requires an explicit,
  unambiguous same-backend homologation mode; absence fails before any
  write.
- **HG-02 Exact project lock** — the resolved project ref must match
  exactly the backend authorized for the Homologation Cell; missing,
  divergent or unresolved ref fails closed.
- **HG-03 Pre-homologation eligibility** — preflight approved before
  the principal prompt.
- **HG-04 Protected tenant registry** — RM Prime and any preexisting
  protected entities registered by ID.
- **HG-05 Synthetic-only fixtures** — every created object is bound to
  `run_id` and the manifest.
- **HG-06 Two-tenant minimum** — harness creates and uses at least two
  distinct synthetic tenants.
- **HG-07 No preexisting object mutation** — updating, reusing or
  deleting any preexisting object as part of the proof is forbidden.
- **HG-08 No destructive global operation** — `DROP DATABASE`,
  `DROP SCHEMA`, `DROP TABLE`, `TRUNCATE`, global deletes, unscoped
  open cascade, prefix-only textual cleanup, DB reset, and production
  copy/restore are all forbidden.
- **HG-09 Maintenance window** — concurrent external writes suspended
  or controlled during the run.
- **HG-10 Cleanup always** — teardown runs in a `finally` block (or
  equivalent), including on test failure.
- **HG-11 Residue zero** — the stage cannot be accepted if any fixture
  remains.
- **HG-12 Protected baseline unchanged** — RM Prime and protected
  entities proven unchanged.
- **HG-13 Fail closed** — any ambiguity about environment, tenant,
  authorship, baseline, manifest or cleanup halts execution.
- **HG-14 Post-production prohibition** — the strategy is permanently
  disabled once the product enters real operation.

## 6. Fixture manifest

A single manifest per execution, created before the first fixture and
updated deterministically and atomically. Contents (minimum):
`run_id`, start timestamp, baseline HEAD, redacted or non-secret
project ref identifier, protected RM Prime tenant ID, other protected
entity IDs, synthetic tenant IDs, synthetic Auth user IDs, membership
IDs/keys, synthetic role IDs, imóvel IDs, lead IDs, event and
auxiliary record IDs, exact Storage bucket and object paths, expected
object counts per category, creation state, cleanup state, per-category
removed count, per-category residual count, final teardown outcome.

The manifest is the sole authority of teardown. It never contains
passwords, JWTs, keys, tokens or full email addresses. Any object not
in the manifest cannot be deleted by teardown.

## 7. Deterministic manifest-based teardown

The teardown replaces any notion of "drop" with a manifest-scoped,
deterministic removal:

1. validate `run_id`;
2. validate project ref;
3. validate manifest;
4. confirm every ID to remove belongs to the run;
5. confirm no ID belongs to the protected registry;
6. stop test clients and sessions;
7. remove exact Storage objects;
8. remove child records created by the run;
9. remove leads, imóveis, events and auxiliary objects;
10. remove synthetic memberships and roles;
11. remove synthetic Auth users;
12. remove synthetic tenants;
13. persist the cleanup outcome;
14. run residue scan;
15. fail on any residue.

Order respects real domain dependencies. Generic cascade is not
assumed safe. When operations cannot participate in the same
transaction, compensating cleanup and explicit evidence are required.
The RM Prime tenant is never in the deletion set.

## 8. Residue scan

The residue scan proves zero remaining synthetic tenants, Auth users,
memberships, roles, imóveis, leads, events, Storage objects, auxiliary
records tied to `run_id`, orphan references and manifest-registered
rows; protected counts match baseline; RM Prime tenant present and
unchanged; preexisting memberships and data preserved.

Minimum required output: `fixtures_created`, `fixtures_cleaned`,
`orphaned_fixtures`, `protected_baseline_changed`,
`rm_prime_tenant_preserved`, `residue_scan_passed`.

Acceptance criteria:

- `fixtures_cleaned == fixtures_created`;
- `orphaned_fixtures == 0`;
- `protected_baseline_changed == false`;
- `rm_prime_tenant_preserved == true`;
- `residue_scan_passed == true`.

## 9. Environment guard strategy

The principal prompt must:

- preserve the existing generic protection over the primary backend;
- not turn the primary backend into a generic remote target;
- if needed, introduce a specific and restricted Same-Backend
  Homologation Cell mode;
- require simultaneous satisfaction of all hard guards;
- reject execution triggered by mere environment-variable changes;
- forbid operator self-declaration of production as staging;
- not rely solely on project ref or target name;
- additionally validate factual database eligibility and the
  protected-entity registry.

Exact guard implementation is deferred to the principal prompt. These
requirements are frozen here.

## 10. Execution Envelope (frozen)

- **OBJECTIVE:** execute live probes of identity, real session, Tenant
  Context, impersonation and forged headers inside an isolated
  Homologation Cell on the pre-homologation primary backend.
- **PREDECESSOR:** LSV-01 — Superseded.
- **ENTRY_GATE:** Homologation Cell Eligibility Preflight approved.
- **DELIVERABLES:** hard guards; protected baseline registry; two
  synthetic tenants; synthetic Auth identities; fixture manifest; live
  probes; deterministic teardown; residue scan; persisted evidence.
- **MINIMUM_EVIDENCE:** `eligibility_preflight_passed=true`,
  `protected_baseline_registered=true`,
  `synthetic_tenants_created >= 2`, `real_sessions_acquired > 0`,
  `forged_header_denial_verified=true`,
  `tenant_context_smoke_failed = 0`,
  `rm_prime_tenant_preserved=true`,
  `protected_baseline_changed=false`, `orphaned_fixtures = 0`,
  `residue_scan_passed=true`, `evidence_persisted=true`.
- **EXTERNAL_DEPENDENCIES:** no second Supabase project required.
  Backup/recovery mechanism and controlled window remain operational
  dependencies.
- **OUT_OF_SCOPE:** full authorization matrix; full RLS matrix; full
  grants matrix; atomicity; Lead operation rollback; concurrency;
  migration changes; RLS changes; grant changes; LSH-01 accepted
  runtime edits; real data; post-real-operation execution.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Blocked External · Rejected ·
  Superseded.
- **SUCCESSOR:** LSV-03.

## 11. State transition

LSV-02 transitions from
`Planned — Blocked External (authorized non-production Supabase target required)`
to
`Planned — Homologation Cell Eligibility Preflight Required`.

LSV-02 is not marked Ready for Execution, Executing, Accepted,
Superseded or Rejected by this revision. LSV-03 remains blocked by
LSV-02.

## 12. Budget accounting

- `LSV_02_STARTED = false`
- `LSV_02_PRINCIPAL_PROMPT_CONSUMED = false`
- `LSV_02_CORRECTIVE_PROMPT_CONSUMED = false`
- `LSV_02_REMAINING_IMPLEMENTATION_BUDGET = 2`

This documentation revision is not recorded as principal or corrective
execution.

## 13. Absolute out-of-scope of this revision

No edits to code, tests, runners, environment guard, allowlist or
denylist. No fixtures, tenants or users created. No changes to
database, Auth, Storage, migrations, RLS or grants. No live harness
run. No teardown or residue scan executed. No secrets used. The
external Supabase project is not removed. LSV-02 is not started and no
prompt budget is consumed.
