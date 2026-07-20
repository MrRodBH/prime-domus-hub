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
| 8 | LSR-02 | Rejected — terminal · principal prompt consumed · final corrective prompt consumed · REMAINING_IMPLEMENTATION_BUDGET = 0/2 · final external audit accepted = false · Strategy B implementation retained as rejected technical history · no additional implementation prompt authorized · blocking findings preserved (controlled_dev_required_not_executed, compiler_file_list_not_proven, cycle_composite_digest_not_proven, partial_footer_fail_closed_not_fully_implemented, conflicting_current_states_present_before_reconciliation) · successor: Formal replacement-path planning gate — not started · envelope: `docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md` · evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json` |
| 9 | LSV-03 | Planned — Blocked by LSR-02 and by future formally approved replacement path · Execution Envelope required before implementation · no deliverables auto-transferred from LSV-02 or LSR-01 · no external Supabase target required or recommended · Same-Backend strategy NOT permanently unavailable (HG-14 not triggered) |
| 10 | LSV-04 | Planned — Blocked by LSV-03 |
| 11 | RDA-01 | Planned — Blocked by LSV-04 |
| 12 | RC-01 | Planned — Blocked by RDA-01 |
| 13 | PR-M2 | Planned — Blocked by RC-01 |
| 14 | PR-M3 | Planned — Blocked by PR-M2 |
| 15 | TH-M1 | Planned — Blocked by PR-M3 |
| 16 | TH-M2 | Planned — Blocked by TH-M1 |
| 17 | Homologação | Blocked by TH-M2 |
| 18 | Produção | Blocked until homologation acceptance |

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

### 2.2 LSR-02 — TanStack Start Registration Stability & LSR-01 Terminal Reconciliation

- **STATE:** Planned / Ready for External Audit. Execution Envelope
  planning materialized. LSR-02 not started.
- **OBJECTIVE:** establish a single, deterministic and persistent source
  for the TanStack Start module augmentation, stable across all real
  development and build sequences, without modifying functional routes.
- **PREDECESSOR:** LSR-01 — Superseded (terminal · principal consumed ·
  corrective consumed · remaining budget 0/2 · corrective failed
  closed · register stability not resolved).
- **DELIVERABLES:** frozen Execution Envelope
  (`docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md`);
  future selection of exactly one of Strategy A (canonical stable
  footer), Strategy B (dedicated stable declaration file), optionally
  combined with Strategy C (minimum proven dependency alignment);
  concurrency diagnostic table; two full independent test cycles;
  evidence artifact.
- **FILES_ALLOWED:** frozen to nine paths (see impact analysis).
  `FUTURE_ADDENDUM_ALLOWED = false`.
- **MINIMUM_EVIDENCE:** `tanstack_start_register_source_count = 1`,
  `duplicate_module_augmentation = false`,
  `type_registration_stable = true`, `cycle_a_success = true`,
  `cycle_b_success = true`, `full_sequence_diff = 0`,
  `typecheck_passed = true`, `build_dev_passed = true`,
  `build_passed = true`, `functional_route_diff = 0`,
  `files_outside_allowed = 0`, `evidence_artifact_valid = true`.
- **EXTERNAL_DEPENDENCIES:** none.
- **HARD_GUARDS:** no manual edits to `src/routeTree.gen.ts`; no
  functional route changes; no runtime behavior change; no
  migrations / RLS / grants / policies / Auth / Storage / cron / DB
  changes.
- **OUT_OF_SCOPE:** LSV-03; LSV-04; `CLIENT_TENANT_AUTHORITY`;
  maintenance mode; tenant fixtures; Auth harness; Storage; DB;
  migrations; RLS; grants; policies; cron; queues; `net.http_post`;
  external Supabase; functional route changes; reopening of LSR-01.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0. `REMAINING_IMPLEMENTATION_BUDGET = 2/2`.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Blocked External · Rejected · Superseded.
- **SUCCESSOR:** formal replacement-path planning gate. LSR-02
  conclusion does NOT auto-start LSV-03.

### 2.3 LSV-03 — Lead Authorization, RLS, Grants & Impersonation Verification

- **STATE:** Planned — Blocked by LSR-02 and by a future formally
  approved replacement path.
- **OBJECTIVE:** preserve the historical objective of LSV-03 without
  automatically absorbing the scope of LSV-02 or LSR-01.
- **PREDECESSOR:** a replacement path formally planned and accepted
  after LSR-02.
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
