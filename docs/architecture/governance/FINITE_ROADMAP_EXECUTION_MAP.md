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
| 6 | LSV-02 | Planned — Homologation Cell Eligibility Preflight Required |
| 7 | LSV-03 | Planned — Blocked by LSV-02 |
| 8 | LSV-04 | Planned — Blocked by LSV-03 |
| 9 | RDA-01 | Planned — Blocked by LSV-04 |
| 10 | RC-01 | Planned — Blocked by RDA-01 |
| 11 | PR-M2 | Planned — Blocked by RC-01 |
| 12 | PR-M3 | Planned — Blocked by PR-M2 |
| 13 | TH-M1 | Planned — Blocked by PR-M3 |
| 14 | TH-M2 | Planned — Blocked by TH-M1 |
| 15 | Homologação | Blocked by TH-M2 |
| 16 | Produção | Blocked until homologation acceptance |

Historical stages 1–4 preserved without reopening. LSV-01 legacy Lotes
A / B / C are historical only; not executable next steps.

---

## 2. Execution Envelopes

Each future stage requires its Execution Envelope frozen before any
implementation prompt is issued. Envelopes below are initial and
binding; details still undefined are recorded explicitly as
"Execution Envelope required before implementation."

### 2.1 LSV-02 — Live Identity & Tenant Context Verification

- **OBJECTIVE:** execute the identity, real-session and Tenant Context
  harness in an authorized non-production environment.
- **PREDECESSOR:** LSV-01 — Superseded (terminal).
- **DELIVERABLES:** isolated fixtures; real Supabase Auth users; real
  JWTs; independent clients (anonymous, common admin, Super Admin);
  explicit impersonation exercise; Tenant Context probe; forged-header
  probe; deterministic cleanup; live evidence artifact.
- **MINIMUM_EVIDENCE:** live run artifact with
  `production_guard_passed=true`, `real_sessions_acquired > 0`,
  `forged_header_denial_verified=true`,
  `tenant_context_smoke_failed = 0`, `orphaned_fixtures = 0`,
  `evidence_persisted = true`.
- **EXTERNAL_DEPENDENCIES:** authorized non-production Supabase
  project (anon key, service role, project ref added to allowlist).
- **OUT_OF_SCOPE:** full authorization matrix; full RLS matrix; full
  grants matrix; atomicity; rollback; concurrency; migrations; RLS or
  grant changes; LSH-01 runtime edits.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** LSV-03.

### 2.2 LSV-03 — Lead Authorization, RLS, Grants & Impersonation Verification

- **OBJECTIVE:** operationally prove Lead authorization, RLS, grants,
  cross-tenant isolation and impersonation matrices under real JWTs.
- **PREDECESSOR:** LSV-02 — Accepted.
- **DELIVERABLES:** full Lead operation matrix under real sessions;
  RLS matrix per identity; grants matrix; cross-tenant probes;
  canonical 7-scenario impersonation matrix; live evidence artifact.
- **MINIMUM_EVIDENCE:** Execution Envelope required before
  implementation.
- **EXTERNAL_DEPENDENCIES:** same authorized non-production target as
  LSV-02.
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
- Terminal states are exhaustive: Accepted, Superseded, Rejected,
  Blocked External. No other closing state is permitted.
- Historical accepted states (Fase 2, Fase 3, Fase 4, PR-PH.0,
  LSH-01) are not reopened by this map.
