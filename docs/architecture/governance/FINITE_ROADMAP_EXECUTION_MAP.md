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
| 7 | LSR-01 | Superseded (terminal · principal prompt consumed · corrective prompt consumed · REMAINING_IMPLEMENTATION_BUDGET = 0/2 · principal result: failed persistence verification · corrective result: failed closed · reason: stage could not stabilize TanStack Start registration within its frozen scope · successor: LSR-02 · envelope: `docs/architecture/impact-analysis/LSR-01-lsv-02-closure-recovery-roadmap-reconciliation-impact-analysis.md` · evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-01-closure-recovery-execution.json`) |
| 8 | LSR-02 | Planned / Ready for External Audit — Execution Envelope planning materialized · LSR-02 started: false · principal prompt consumed: false · corrective prompt consumed: false · REMAINING_IMPLEMENTATION_BUDGET = 2/2 · FILES_ALLOWED fully frozen (9 paths) · FUTURE_ADDENDUM_ALLOWED = false · envelope: `docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md` |
| 9 | LSV-03 | Planned — Blocked by LSR-02 and by future formally approved replacement path · Execution Envelope required before implementation · no deliverables auto-transferred from LSV-02 or LSR-01 · no external Supabase target required or recommended · Same-Backend strategy NOT permanently unavailable (HG-14 not triggered) |
| 10 | LSV-04 | Planned — Blocked by LSV-03 |
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
  criterion fails, LSV-02 fails closed and reverts to Blocked External.
  (HISTORICAL — NOT CURRENT AUTHORITY: the historical external
  non-production project `rm-prime-lsv-nonprod` / project ref
  `adxqbrfcqhnoierwhymj` is preserved only as historical registry; it is
  NOT a current fallback, NOT recommended, NOT required, and NOT a next
  step for any stage.)
- **DELIVERABLES:** hard guards (HG-01..HG-14); protected baseline
  registry (RM Prime tenant + preexisting protected entities pinned by
  canonical ID); minimum two synthetic tenants; synthetic Auth users,
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
- **EXTERNAL_DEPENDENCIES:** none mandatory. Operational dependencies:
  recovery/backup mechanism and controlled maintenance window.
  (HISTORICAL — NOT CURRENT AUTHORITY: prior references to any external
  Supabase project as fallback are preserved as historical registry
  only and carry no operational authority.)
- **HARD_GUARDS (frozen):** HG-01..HG-14 as defined in the LSV-02
  Impact Analysis. HG-14 permanent disablement applies only after real-
  operation start; HG-14 was NOT triggered by the LSV-02 abort.
- **OUT_OF_SCOPE:** full authorization matrix; full RLS matrix; full
  grants matrix; atomicity; rollback of Lead operations; concurrency;
  migration changes; RLS changes; grant changes; LSH-01 accepted
  runtime edits; use of real data; post-real-operation execution.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 2. REMAINING_IMPLEMENTATION_BUDGET = 0.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **FINAL_STATE:** Superseded (terminal). Findings preserved as
  mandatory inputs for future formal replanning only. No deliverables
  auto-transferred to any successor.
- **SUCCESSOR:** LSR-01 (documentary and generator-configuration
  closure recovery).

### 2.2 LSV-03 — Lead Authorization, RLS, Grants & Impersonation Verification

- **STATE:** Planned — Blocked by LSR-01 and by a future formally
  approved replacement path.
- **OBJECTIVE:** preserve the historical objective of LSV-03 without
  automatically absorbing the scope of LSV-02.
- **PREDECESSOR:** a replacement path formally planned and accepted
  after LSR-01.
- **MINIMUM_EVIDENCE:** Execution Envelope required before
  implementation.
- **EXTERNAL_DEPENDENCIES:** unresolved by the current planning. No
  external Supabase project is required, recommended or designated as
  canonical fallback.
- **OUT_OF_SCOPE:** automatic transfer of LSV-02 deliverables;
  implementation; live tests; migrations; RLS changes; grant changes;
  new Execution Envelope during LSR-01 planning.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** LSV-04, remaining blocked.

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
- **EXTERNAL_DEPENDENCIES:** unresolved by the current planning. No
  external Supabase project is required, recommended or designated as
  canonical fallback.
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
