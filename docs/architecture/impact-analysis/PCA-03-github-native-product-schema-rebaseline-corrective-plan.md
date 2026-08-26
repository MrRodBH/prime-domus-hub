# PCA-03 — GitHub-native Product Schema Rebaseline Corrective Plan

## 1. Terminal scope of this materialization

```text
GATE = PCA-03_GITHUB_NATIVE_PRODUCT_SCHEMA_REBASELINE_CORRECTIVE_PLAN_MATERIALIZATION
STATUS = PLANNING_MATERIALIZED_AWAITING_PROTECTED_MERGE
AUDITED_MAIN = d0632f471942bd638a57555ed5af63c5567e263b
AUDITED_TREE = 4bcf9e0c5ff655f48a63d92b2e60057a7f9f9dae
REPOSITORY = MrRodBH/prime-domus-hub
BASE_BRANCH = main
CODE_MUTATION = false
LOVABLE_AGENT_CALLS = false
BACKEND_MUTATION = false
PROVIDER_MUTATION = false
PR_105_MUTATION = false
PRODUCTION_PUBLISH = false
```

This document converts the read-only PCA-02 findings into a GitHub-native
Architecture First corrective plan. It does not authorize migration
application, ledger repair, schema/DML changes, provider activation, Lovable
execution, deployment, production cutover or mutation of PR #105.

GitHub `main` is the final technical authority. Lovable-origin plans and
`.lovable/plan.md` are historical/non-authorizing unless their exact content
is independently audited and accepted in `main`.

## 2. Revalidated control-plane state

| Control | Audited state |
|---|---|
| GitHub `main` | `d0632f471942bd638a57555ed5af63c5567e263b` |
| Git tree | `4bcf9e0c5ff655f48a63d92b2e60057a7f9f9dae` |
| PR #105 | open / draft / unmerged; excluded from this plan |
| Issue #107 | open; ARCH-12F-02 and deferred execution moments remain governed there |
| Issue #116 | open; BCR runtime remains deferred upstream and non-blocking for provider-agnostic PR-M3 |
| Same-Backend identity | Supabase project ref `stmcnvzuzlyqammyycxj` |
| Protected RM Prime tenant | `9664d189-4a12-4caa-8243-dc73383447e6` |
| Lovable private variant | blocked external; not an execution cell for this plan |

## 3. PCA-02 factual parity snapshot

The live facts below were collected read-only during PCA-02 on 2026-08-26.
PCA-03 does not reapply or mutate them.

### 3.1 Repository-to-backend gap

- 16 PR-M2 migrations exist in `main` and are absent from the current
  Same-Backend migration ledger.
- Their expected structural effect is 45 new tables and 57 new columns on
  existing tables.
- All 45 expected new tables and all 57 expected columns were absent from the
  live schema at the PCA-02 snapshot.
- All 36 prerequisite legacy tables existed and had RLS enabled.
- Required enums/types, extensions and prerequisite functions existed.
- 15 of the 16 migrations contain explicit `BEGIN/COMMIT`; the tenant
  lifecycle migration does not and therefore cannot be applied without an
  explicit transactional correction.
- Secure default privileges from PR-M3-SEC-04A were present: no default table
  grants to `anon/authenticated` and no default function execute grants to
  `PUBLIC/anon/authenticated`.

### 3.2 Canonical PR-M2 migration order

| Order | Version | Unit | Main structural effect |
|---:|---|---|---|
| 1 | `20260728165000` | tenant lifecycle | lifecycle/bootstrap contract; requires explicit transaction |
| 2 | `20260728180000` | tenant access | tenant binding on RBAC/user profiles |
| 3 | `20260728233000` | configuration | configuration versioning/backfill |
| 4 | `20260729103000` | portals | 5 tables plus connector/export/job bindings |
| 5 | `20260729183000` | CMS workflow | 5 version/template tables plus CMS bindings |
| 6 | `20260729211500` | CRM workflow | 8 pipeline/event/task/tag/idempotency tables |
| 7 | `20260729233000` | marketing ingestion | 7 connector/mapping/event/import tables |
| 8 | `20260730010000` | tracking | 5 connector/binding/diagnostic/consent tables |
| 9 | `20260730043000` | consolidated corrective | 10 upload/contact/calendar/CRM operational tables |
| 10 | `20260730050000` | CMS inventory | 3 testimonial/block/schedule tables |
| 11 | `20260730051500` | marketing adapter activation | adapter contract correction |
| 12 | `20260730053000` | marketing/CMS hardening | actor/authority and hardening corrections |
| 13 | `20260730060000` | Super control plane | 2 incident/support tables |
| 14 | `20260730100000` | upload consumers | upload-target consumer contracts |
| 15 | `20260730101000` | launch save | transactional project launch contract |
| 16 | `20260803183000` | Storage/CRM corrective | tenant provenance and attachment correction |

### 3.3 Bidirectional migration-ledger drift

The backend ledger is neither a simple prefix nor an exact copy of GitHub:

- four recent versions match GitHub exactly;
- four live versions are semantically equivalent to GitHub migrations but
  use shifted timestamps;
- one DCA entry includes an execution-only manifest prelude in addition to
  the repository migration;
- four BCA/BCR migrations exist only in the live ledger:
  `20260812192006`, `20260813174908`, `20260813175027` and
  `20260814001323`;
- the four live-only entries were recorded by a Lovable API identity and are
  not accepted as GitHub authority merely because they exist physically;
- no inspected recent live ledger entry carries a recorded rollback array.

Therefore neither `supabase db push` nor `migration repair` is currently
admissible. A repair changes history metadata; it does not prove that the
physical schema matches the repository contract.

### 3.4 Protected data and residues

| Invariant | PCA-02 snapshot |
|---|---:|
| Total tenants | 74 |
| Protected `scp0121_*` tenants | 73 |
| Protected registry checksum | `3ece053ddbdfce5161380ec38824ea91` |
| Portal connectors owned by protected residues | 438 |
| Total portal connectors | 444 |
| Protected historical subscriptions in LSV-02 evidence | 65 |
| Current protected subscriptions | 0 |
| Current commercial plans/subscriptions/entitlements/billing events | 0 |

The 73 `scp0121_*` objects are
`PREEXISTING_INTERNAL_TEST_RESIDUE`, not disposable fixtures. They must never
be selected, provisioned, changed or deleted by prefix, display name, broad
query or inferred status. The unexplained commercial count change from 65 to
0 is protected-baseline drift requiring independent reconciliation; PCA-03
does not infer a cause.

### 3.5 Integrity and reversibility blockers

1. The original PR-M2 seeds target every row in `public.tenants`; applying
   them would provision the 73 protected residues and is prohibited.
2. The portal migration would hash and then null `feed_token` and
   `webhook_secret` on 444 connectors: 888 one-way field erasures without a
   recoverable rollback value.
3. `lead_discard_reasons` and `deal_lost_reasons` each contain 1,386 rows
   referencing 198 deleted tenant IDs; neither table has a tenant foreign key.
4. The current tenant bootstrap path does not prove deterministic creation of
   configuration, CRM pipeline, marketing and tracking baselines for future
   tenants.
5. Empty commercial tables do not authorize deletion or adoption of the four
   live-only BCA/BCR migrations.
6. Schema existence alone is insufficient: RLS, ACL, function execution,
   ownership, data backfill and migration ledger must converge together.

## 4. Binding decision

```text
ORIGINAL_16_MIGRATIONS_EXECUTION_READY = false
BLANKET_TENANT_BACKFILL_ALLOWED = false
PORTAL_SECRET_NULL_CUTOVER_ALLOWED = false
BLIND_MIGRATION_REPAIR_ALLOWED = false
LIVE_ONLY_BCA_BCR_ADOPTION_ALLOWED = false
PROTECTED_RESIDUE_MUTATION_ALLOWED = false
SAME_BACKEND_EXECUTION_AUTHORIZED = false
```

The 16 migrations remain historical implementation inputs, but their current
form is not a safe Same-Backend execution package. The corrective repository
implementation must preserve their accepted product contracts while replacing
unsafe blanket DML, non-transactional behavior and irreversible credential
cutover.

## 5. Corrective target architecture

### 5.1 Immutable parity manifest

A future GitHub implementation gate must create a machine-readable parity
manifest containing, for every repository and live migration:

- repository version, path and SHA-256;
- live ledger version, statement SHA-256 and creator metadata;
- classification: `EXACT`, `SEMANTIC_ALIAS`, `REPO_ONLY`,
  `LIVE_ONLY_QUARANTINED` or `DIVERGENT`;
- expected objects, columns, constraints, RLS, grants and functions;
- approved convergence action and postflight query;
- rollback class and owner authorization reference.

No timestamp alias may be declared equivalent from its name alone. Statement
normalization, physical schema inspection and dependency comparison are
mandatory.

### 5.2 Structural DDL separated from tenant DML

Corrective migrations must separate:

1. global structural objects, constraints, RLS and grants;
2. tenant-specific baseline provisioning;
3. existing-tenant backfill;
4. credential migration/cutover;
5. legacy cleanup.

This separation prevents a safe DDL release from implicitly changing every
tenant or erasing credentials.

### 5.3 Explicit tenant product-provisioning authority

A server-owned, transaction-bound and idempotent provisioning orchestrator
must become the only authority for creating a tenant's product baseline. It
must be invoked by the canonical tenant bootstrap flow and must fail closed on
partial or ambiguous state.

Existing-tenant backfill requires an exact immutable ID manifest approved by
the Owner. Prefixes, names, timestamps, empty metadata and broad
`WHERE tenant_id IN (SELECT id FROM tenants)` selection are forbidden.
The 73 protected residues and the protected RM Prime tenant remain excluded
until separately and explicitly authorized by exact ID.

### 5.4 Reversible portal-credential transition

The original hash-and-null operation must be replaced by a staged contract:

1. add verifier/reference structures while retaining legacy values;
2. move custody to the approved secret provider/reference model;
3. prove every consumer uses the reference and rotation path;
4. rotate/revoke old credentials;
5. erase legacy values only in a separate Owner-authorized destructive gate.

A verifier hash is authentication evidence, not a backup. No stage may claim
rollback if the original secret cannot be restored or rotated.

### 5.5 Live-only commercial quarantine

The four live-only BCA/BCR migrations remain physically observed but
non-authoritative. A later commercial architecture gate must classify each
object/function as:

- compatible and adoptable through a new forward GitHub migration;
- conflicting and converged through a new forward corrective migration; or
- unused and removable only after dependency/data proof and separate
  authorization.

PR #105 remains open/draft/unmerged and cannot be used as an implicit source
of truth for this classification.

### 5.6 Orphan-data reconciliation

The two reason catalogs require an independent data-integrity gate:

1. snapshot counts and deterministic hashes;
2. classify the 198 missing tenant IDs without name/prefix inference;
3. prove whether rows are tenant-owned data or reusable catalog templates;
4. quarantine/reassign/delete only under an exact manifest;
5. add the chosen referential-integrity contract in a forward migration;
6. prove zero cross-tenant exposure and deterministic cascade behavior.

No orphan row is changed by PCA-03.

## 6. Controlled execution sequence

### Gate R0 — repository corrective implementation

- Materialize corrected migrations and parity-manifest tooling in an isolated
  GitHub branch.
- Do not connect to or mutate Same-Backend.
- Prove exact file allowlist, tests, lint/build and migration static checks.
- Preserve PR #105 byte-identical.

### Gate R1 — isolated restore-cell qualification

- Use a private data-isolated clone/restore cell, never a Lovable preview that
  shares Same-Backend.
- Prove backup/PITR restore, project identity, Auth/Storage isolation and
  complete teardown.
- Re-run the parity manifest against the cell.
- Fail closed if no isolated execution cell is available.

### Gate R2 — structural wave rehearsal

Apply only corrected structural DDL in exact timestamp order:

| Wave | Versions |
|---|---|
| W1 lifecycle/access | `20260728165000`, `20260728180000` |
| W2 configuration/portals | `20260728233000`, `20260729103000` |
| W3 CMS/CRM | `20260729183000`, `20260729211500` |
| W4 marketing/tracking | `20260729233000`, `20260730010000` |
| W5 consolidation | remaining eight versions through `20260803183000` |

Each file must have an explicit transaction boundary and deterministic
preflight/postflight. Credential erasure and tenant blanket seeds are excluded.

### Gate R3 — exact-manifest tenant provisioning rehearsal

- Exercise future-tenant bootstrap on synthetic tenants in the isolated cell.
- Exercise existing-tenant backfill only for exact synthetic IDs in the run
  manifest.
- Prove idempotency, atomicity, unique default pipeline/stage, configuration,
  CRM, marketing, tracking and teardown.
- Prove the protected registry is absent from the mutation manifest.

### Gate R4 — Same-Backend impact requalification

Before any live write, repeat all PCA-02 read-only checks and require exact
Owner authorization for the resulting head, tree, migration hashes and
manifest. Any drift invalidates the execution package.

### Gate R5 — Same-Backend controlled application

Only after R0-R4 acceptance:

1. establish a maintenance/write-control window;
2. capture exact pre-state and restore-point evidence;
3. apply one corrected wave at a time;
4. commit only after wave-local postflight succeeds;
5. stop fail-closed on the first divergence;
6. provision only explicitly authorized exact tenant IDs;
7. keep portal credential deletion and commercial reconciliation outside this
   gate unless separately authorized.

## 7. Mandatory postflight matrix

A Same-Backend wave is acceptable only when all applicable checks pass:

- migration statement/version hashes equal the approved manifest;
- expected cumulative 45 tables and 57 columns exist with correct types,
  defaults, nullability, constraints and ownership;
- RLS is enabled on every tenant-scoped table;
- policies enforce server-owned tenant authority and fail closed on ambiguity;
- no unintended `anon/authenticated/PUBLIC` table, sequence or function
  grants exist;
- service-role-only functions have explicit execute ACL;
- no new rows or changed hashes exist for the 73 protected residues;
- protected registry count remains 73 and checksum remains
  `3ece053ddbdfce5161380ec38824ea91`;
- portal credential fields remain recoverable until their separate cutover;
- no new orphan tenant references are introduced;
- tenant bootstrap provisions exactly one complete baseline and is idempotent;
- ledger, physical schema and GitHub manifest agree bidirectionally;
- Auth, Storage and provider state are unchanged unless their own gate
  explicitly authorizes them.

## 8. Rollback and recovery contract

| Failure moment | Mandatory response |
|---|---|
| Before transaction commit | database transaction rollback; retain evidence |
| After a committed wave | new forward corrective migration; never rewrite live history |
| Ledger metadata mismatch | stop; do not run blind `migration repair` |
| Credential transition failure | retain/rotate legacy credential; do not null it |
| Protected-registry drift | stop immediately; no automated compensation |
| Catastrophic corruption | restore only from a previously proved backup/PITR point under separate Owner authorization |

Production `db reset`, destructive down migrations, heuristic cleanup,
unproved restore and silent history rewriting are prohibited.

Supabase's current migration guidance requires local and remote histories to
remain synchronized and recommends forward migrations for production
corrections:

- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/local-development/declarative-database-schemas

New tables must also receive explicit Data API grants where intended; they are
not assumed to be exposed automatically:

- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## 9. Definition of Done for the future implementation package

```text
PARITY_MANIFEST_COMPLETE = true
ALL_LIVE_LEDGER_ENTRIES_CLASSIFIED = true
PROTECTED_RESIDUE_SELECTION = zero
BLANKET_TENANT_DML = zero
IRREVERSIBLE_SECRET_ERASURE = zero
EXPLICIT_TRANSACTIONS = all_migrations
FUTURE_TENANT_PROVISIONING = deterministic_atomic_idempotent
ISOLATED_RESTORE_REHEARSAL = passed
ROLLBACK_RESTORE_PROOF = passed
PR_105_CHANGED = false
SAME_BACKEND_CHANGED = false_until_separate_gate
```

## 10. Ordered successor gates

1. `PCA-03_FINAL_AUDIT_AND_PROTECTED_MERGE`: audit this documentation PR,
   exact diff and checks; merge only after Owner authorization.
2. `PCA-04_GITHUB_NATIVE_PRODUCT_SCHEMA_REBASELINE_CORRECTIVE_IMPLEMENTATION`:
   materialize corrected migrations and parity tooling in GitHub only; backend
   remains read-only.
3. `PCA-05_ISOLATED_RESTORE_CELL_SCHEMA_REBASELINE_REHEARSAL`: execute the
   approved package only in a private data-isolated restore cell.
4. `PCA-06_SAME_BACKEND_SCHEMA_REBASELINE_FINAL_IMPACT_REQUALIFICATION`:
   re-audit exact live state and produce the live execution envelope.
5. A later explicit Owner gate may authorize wave-by-wave Same-Backend
   application; no prior gate implies that authorization.

## 11. PCA-03 terminal statement

PCA-03 materializes a corrective plan only. It does not declare the original
PR-M2 migrations safe, does not reconcile the live migration ledger, does not
adopt Lovable-origin commercial schema, does not alter protected tenants and
does not authorize Same-Backend execution.
