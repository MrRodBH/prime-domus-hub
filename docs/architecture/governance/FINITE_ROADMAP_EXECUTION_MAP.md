# FINITE ROADMAP EXECUTION MAP — RM Prime SaaS

**Authority:** derived from
`docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md`
(materialization commit `c1141448fd3c36ef7ae8ff60613c383673fde0d6`).

This document is the single finite, auditable execution map for the
remaining roadmap until homologation and production. No new stage may
start without a frozen Execution Envelope registered here. No stage
may exceed two implementation prompts (principal + corrective).

---

## 1. Finite sequence

| # | Stage | State |
|---|---|---|
| 1 | PR-PH.0 | Accepted |
| 2 | PR-M1 | Superseded |
| 3 | LSO-01 | Rejected / Closed |
| 4 | LSH-01 | Accepted / Closed |
| 5 | LSV-01 | Superseded (terminal · FINAL_CORRECTIVE_EXECUTED = true · REMAINING_IMPLEMENTATION_BUDGET = 0) |
| 6 | LSV-02 | Superseded (terminal · principal prompt consumed with fail-closed abort before fixtures · final corrective consumed for factual reconciliation and terminalization · REMAINING_IMPLEMENTATION_BUDGET = 0 · zero database/Auth/Storage/cron mutations · findings preserved as mandatory inputs for future formal replanning only — NOT transferred to any successor · evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsv-02-principal-prompt-abort-report.md` and `docs/architecture/impact-analysis/LSV-02-same-backend-homologation-cell-execution-envelope-impact-analysis.md`) |
| 7 | LSR-01 | Planned — Execution Envelope Ready for External Audit · LSR-01 implementation not started · principal prompt not consumed · corrective prompt not consumed · REMAINING_IMPLEMENTATION_BUDGET = 2/2 · envelope: `docs/architecture/impact-analysis/LSR-01-lsv-02-closure-recovery-roadmap-reconciliation-impact-analysis.md` |
| 8 | LSV-03 | Planned — Blocked by LSR-01 and by future formally approved replacement path · Execution Envelope required before implementation · no deliverables auto-transferred from LSV-02 · no external Supabase target required or recommended · Same-Backend strategy NOT permanently unavailable (HG-14 not triggered) |
| 9 | LSV-04 | Planned — Blocked by LSV-03 |
| 10 | RDA-01 | Planned — Blocked by LSV-04 |
| 11 | RC-01 | Planned — Blocked by RDA-01 |
| 12 | PR-M2 | Planned — Blocked by RC-01 |
| 13 | PR-M3 | Planned — Blocked by PR-M2 |
| 14 | TH-M1 | Planned — Blocked by PR-M3 |
| 15 | TH-M2 | Planned — Blocked by TH-M1 |
| 16 | Homologação | Blocked by TH-M2 |
| 17 | Produção | Blocked until homologation acceptance |

Historical stages 1–4 preserved without reopening. LSV-01 legacy Lotes
A / B / C are historical only; not executable next steps.

---

## 2. Execution Envelopes

Each future stage requires its Execution Envelope frozen before any
implementation prompt is issued. Envelopes below are initial and
binding; details still undefined are recorded explicitly as
"Execution Envelope required before implementation."

### 2.1 LSV-02 — Live Identity & Tenant Context Verification (Same-Backend Homologation Cell)

- **OBJECTIVE:** execute live identity, real-session, Tenant Context,
  impersonation and forged-header probes inside an isolated
  Homologation Cell running on the current pre-homologation primary
  backend. Full contract lives in
  `docs/architecture/impact-analysis/LSV-02-same-backend-homologation-cell-execution-envelope-impact-analysis.md`.
- **PREDECESSOR:** LSV-01 — Superseded (terminal).
- **ENTRY_GATE:** Homologation Cell Eligibility Preflight approved
  (pre-homologation status, zero real clients/tenants/subscriptions/
  leads/media/users/personal data, controlled write window, explicit
  operator authorization, recovery/backup mechanism in place). If any
  criterion fails, LSV-02 fails closed and reverts to Blocked External;
  the external non-production Supabase project remains as optional
  fallback.
- **DELIVERABLES:** hard guards (HG-01..HG-14); protected baseline
  registry (RM Prime tenant + preexisting protected entities pinned by
  canonical ID); minimum two synthetic tenants (RM Prime HML A and RM
  Prime HML B, authority in generated IDs); synthetic Auth users,
  memberships, roles, imóveis, leads, events and Storage objects; per-
  run fixture manifest; live probes; deterministic manifest-based
  teardown; residue scan; persisted evidence artifact.
- **MINIMUM_EVIDENCE:** `eligibility_preflight_passed=true`,
  `protected_baseline_registered=true`,
  `synthetic_tenants_created >= 2`, `real_sessions_acquired > 0`,
  `forged_header_denial_verified=true`,
  `tenant_context_smoke_failed = 0`,
  `rm_prime_tenant_preserved=true`,
  `protected_baseline_changed=false`, `orphaned_fixtures = 0`,
  `residue_scan_passed=true`, `evidence_persisted=true`.
- **EXTERNAL_DEPENDENCIES:** none mandatory — a second Supabase project
  is no longer required. External non-production project
  `rm-prime-lsv-nonprod` remains preserved as optional fallback.
  Operational dependencies: recovery/backup mechanism and controlled
  maintenance window.
- **HARD_GUARDS (frozen):** HG-01 explicit same-backend homologation
  mode; HG-02 exact project-ref lock; HG-03 pre-homologation
  eligibility preflight; HG-04 protected tenant registry by ID; HG-05
  synthetic-only fixtures bound to `run_id`; HG-06 two-tenant minimum;
  HG-07 no preexisting object mutation; HG-08 no destructive global
  operation (DROP DATABASE/SCHEMA/TABLE, TRUNCATE, unscoped deletes,
  open cascade, prefix-only cleanup, DB reset, prod copy/restore all
  forbidden); HG-09 maintenance window; HG-10 cleanup always in
  finally; HG-11 residue zero; HG-12 protected baseline unchanged;
  HG-13 fail-closed on any ambiguity; HG-14 permanent disablement
  after real-operation start.
- **FIXTURE_MANIFEST:** single per-run manifest containing `run_id`,
  start timestamp, baseline HEAD, redacted project ref, protected RM
  Prime tenant ID and other protected entity IDs, synthetic tenant IDs,
  synthetic Auth user IDs, membership and role identifiers, imóvel and
  lead IDs, auxiliary record IDs, exact Storage bucket and paths,
  expected object counts per category, creation state, cleanup state,
  removed and residual counts per category, final teardown outcome.
  Manifest is created before the first fixture, updated
  deterministically, persisted atomically, is the sole teardown
  authority, and contains no passwords, JWTs, keys, tokens or full
  emails. Objects absent from the manifest cannot be deleted by
  teardown.
- **DETERMINISTIC_TEARDOWN:** manifest-based; validates `run_id`,
  project ref and manifest; confirms every ID to remove belongs to the
  run and none belongs to the protected registry; stops test clients
  and sessions; removes exact Storage objects, child records, leads,
  imóveis, events, auxiliary objects, memberships, synthetic roles,
  synthetic Auth users and finally synthetic tenants; persists cleanup
  outcome; runs residue scan; fails on any residue. Ordering respects
  real domain dependencies; generic cascade is not assumed safe;
  compensating cleanup and explicit evidence are required when
  operations cannot share a transaction. The RM Prime tenant is never
  part of the deletion set.
- **RESIDUE_SCAN:** proves zero remaining synthetic tenants, Auth
  users, memberships, roles, imóveis, leads, events, Storage objects,
  auxiliary records tied to `run_id`, orphan references and manifest-
  registered rows; protected counts match baseline; RM Prime tenant
  present and unchanged; preexisting memberships and data preserved.
  Required output includes `fixtures_created`, `fixtures_cleaned`,
  `orphaned_fixtures`, `protected_baseline_changed`,
  `rm_prime_tenant_preserved`, `residue_scan_passed`, with acceptance
  criteria `fixtures_cleaned == fixtures_created`,
  `orphaned_fixtures == 0`, `protected_baseline_changed == false`,
  `rm_prime_tenant_preserved == true`, `residue_scan_passed == true`.
- **ENVIRONMENT_GUARD_STRATEGY:** principal prompt must preserve the
  existing generic protection over the primary backend; must not turn
  the primary backend into a generic remote target; may introduce a
  specific and restricted Same-Backend Homologation Cell mode gated by
  simultaneous satisfaction of all hard guards; must reject execution
  triggered by mere environment-variable changes; must not allow the
  operator to self-declare production as staging; must not rely solely
  on project ref or target name; must also validate factual database
  eligibility and the protected-entity registry. Exact guard
  implementation is deferred to the principal prompt; these
  requirements are frozen here.
- **OUT_OF_SCOPE:** full authorization matrix; full RLS matrix; full
  grants matrix; atomicity; rollback of Lead operations; concurrency;
  migration changes; RLS changes; grant changes; LSH-01 accepted
  runtime edits; use of real data; post-real-operation execution.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 2 (principal: fail-closed abort before fixtures; final
  corrective: factual reconciliation and terminalization — no runtime
  mutations). REMAINING_IMPLEMENTATION_BUDGET = 0.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **FINAL_STATE:** Superseded (terminal). Live identity and Tenant
  Context proofs transferred to LSV-03's Execution Envelope, to be
  executed against an authorized non-production target once the
  Same-Backend Homologation Cell strategy is no longer eligible.
- **SUCCESSOR:** LSV-03 (remains blocked by the terminalization of
  LSV-02 and by the availability of an authorized non-production
  target).

### 2.2 LSV-03 — Lead Authorization, RLS, Grants & Impersonation Verification

- **OBJECTIVE:** operationally prove Lead authorization, RLS, grants,
  cross-tenant isolation and impersonation matrices under real JWTs.
- **PREDECESSOR:** LSV-02 — Superseded (terminal).
- **DELIVERABLES:** full Lead operation matrix under real sessions;
  RLS matrix per identity; grants matrix; cross-tenant probes;
  canonical 7-scenario impersonation matrix; live evidence artifact;
  live identity, real-session, Tenant Context, impersonation and
  forged-header proofs transferred from the superseded LSV-02
  Execution Envelope.
- **MINIMUM_EVIDENCE:** Execution Envelope required before
  implementation.
- **EXTERNAL_DEPENDENCIES:** authorized non-production Supabase
  target (the external non-production project `rm-prime-lsv-nonprod`
  remains preserved as the canonical fallback; Same-Backend
  Homologation Cell strategy is permanently unavailable per HG-14).
- **OUT_OF_SCOPE:** atomicity; rollback; concurrency; migrations; RLS
  or grant changes; LSH-01 runtime edits.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** LSV-04.

### 2.3 LSV-04 — Lead Transaction Integrity & Final Acceptance

- **OBJECTIVE:** prove atomicity of `create_manual_lead`, rollback
  under intermediate failures, concurrency behavior, absence of
  orphan audit rows and finalize Lead security acceptance.
- **PREDECESSOR:** LSV-03 — Accepted.
- **DELIVERABLES:** atomic lead + audit event proofs; rollback
  probes; concurrency probes; residue verification; final acceptance
  package.
- **MINIMUM_EVIDENCE:** Execution Envelope required before
  implementation.
- **EXTERNAL_DEPENDENCIES:** same authorized non-production target.
- **OUT_OF_SCOPE:** migrations; RLS or grant changes; LSH-01 runtime
  edits; new stages beyond LSV closure.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** RDA-01.

### 2.4 RDA-01 — Role-Aware Dashboard & Decision Intelligence

- **STATE:** Planned — Blocked by LSV-04.
- **OBJECTIVE / DELIVERABLES / MINIMUM_EVIDENCE / EXTERNAL_DEPENDENCIES /
  OUT_OF_SCOPE / SUCCESSOR:** Execution Envelope required before
  implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.

### 2.5 RC-01 — Regression & Consolidation

- **STATE:** Planned — Blocked by RDA-01.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** PR-M2.

### 2.6 PR-M2 — Public Tenant Authority, White Label, CMS, Domains & Onboarding

- **STATE:** Planned — Blocked by RC-01.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** PR-M3.

### 2.7 PR-M3 — Product Quality, Operational Readiness & Closing Review

- **STATE:** Planned — Blocked by PR-M2.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** TH-M1.

### 2.8 TH-M1 — Homologation Provisioning & Full Validation

- **STATE:** Planned — Blocked by PR-M3.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** TH-M2.

### 2.9 TH-M2 — Defect Resolution, Regression & Production Gate

- **STATE:** Planned — Blocked by TH-M1.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** Homologação.

### 2.10 Homologação

- **STATE:** Blocked by TH-M2.

### 2.11 Produção

- **STATE:** Blocked until homologation acceptance.

---

## 3. Binding rules

- No stage may begin without a frozen Execution Envelope registered
  here.
- No stage may exceed the declared PROMPT_BUDGET (max 2).
- Legacy LSV-01 Lotes A / B / C are historical only and cannot be
  used as active execution units.
- Terminal states are exhaustive: Accepted, Accepted with Non-Blocking Backlog, Blocked External, Rejected, Superseded. No other closing state is permitted.
- Historical accepted states (Fase 2, Fase 3, Fase 4, PR-PH.0,
  LSH-01) are not reopened by this map.
