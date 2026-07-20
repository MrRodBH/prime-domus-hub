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
| 8 | LSR-02 | Rejected — terminal · principal prompt consumed · final corrective prompt consumed · REMAINING_IMPLEMENTATION_BUDGET = 0/2 · final external audit accepted = false · Strategy B implementation retained as rejected technical history · no additional implementation prompt authorized · blocking findings preserved (controlled_dev_required_not_executed, compiler_file_list_not_proven, cycle_composite_digest_not_proven, partial_footer_fail_closed_not_fully_implemented, conflicting_current_states_present_before_reconciliation) · successor: FRP-01 · envelope: `docs/architecture/impact-analysis/LSR-02-tanstack-start-registration-stability-impact-analysis.md` · evidence: `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/lsr-02-tanstack-start-registration-stability-execution.json` |
| 9 | FRP-01 | Ready for External Audit · principal prompt consumed · corrective prompt NOT consumed · REMAINING_IMPLEMENTATION_BUDGET = 1/2 · planning-only · zero code / migrations / RLS / grants / policies / Auth / Storage / cron changes · `FRP01_IMPLEMENTATION_CHANGES = false` · envelope: `docs/architecture/impact-analysis/FRP-01-formal-replacement-path-planning-impact-analysis.md` |
| 10 | RRS-01 | Planned — Blocked by FRP-01 · Execution Envelope required before implementation · `RRS01_STARTED = false` |
| 11 | PTA-01 | Planned — Blocked by RRS-01 · Execution Envelope required before implementation · `PTA01_STARTED = false` |
| 12 | MOC-01 | Planned — Blocked by PTA-01 · Execution Envelope required before implementation · `MOC01_STARTED = false` |
| 13 | RHV-01 | Planned — Blocked by MOC-01 · Execution Envelope required before implementation · `RHV01_STARTED = false` |
| 14 | LSV-03 | Planned — Blocked by RHV-01 and by formal end-to-end acceptance of the replacement path (RRS-01 → PTA-01 → MOC-01 → RHV-01) · Execution Envelope required before implementation · no deliverables auto-transferred from LSV-02, LSR-01 or LSR-02 · no external Supabase target required or recommended · Same-Backend strategy NOT permanently unavailable (HG-14 not triggered) · `LSV03_STARTED = false` |
| 15 | LSV-04 | Planned — Blocked by LSV-03 |
| 16 | RDA-01 | Planned — Blocked by LSV-04 |
| 17 | RC-01 | Planned — Blocked by RDA-01 |
| 18 | PR-M2 | Planned — Blocked by RC-01 |
| 19 | PR-M3 | Planned — Blocked by PR-M2 |
| 20 | TH-M1 | Planned — Blocked by PR-M3 |
| 21 | TH-M2 | Planned — Blocked by TH-M1 |
| 22 | Homologação | Blocked by TH-M2 |
| 23 | Produção | Blocked until homologation acceptance |

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

- **STATE:** Rejected — terminal. Final external audit decision.
  `LSR_02_STATE = Rejected`. `LSR_02_FINAL_STATE = Rejected`.
  `LSR_02_TERMINAL = true`. `PRINCIPAL_EXTERNAL_AUDIT_ACCEPTED = false`.
  `FINAL_EXTERNAL_AUDIT_ACCEPTED = false`.
  `READY_FOR_FINAL_EXTERNAL_AUDIT = false`.
  `NEW_IMPLEMENTATION_PROMPT_AUTHORIZED = false`.
  `BUDGET_REOPENING_AUTHORIZED = false`.
  Strategy B implementation (dedicated declaration
  `src/tanstack-start-register.d.ts` + scoped
  `lsr02:strip-tanstack-start-register-footer` Vite plugin +
  bidirectional static assertions in `vite.config.ts`) is retained
  in the repository as rejected technical history only; it is NOT
  an accepted deliverable and does NOT satisfy the LSR-02
  Definition of Done. Any real-execution outcome fields previously
  recorded (Cycle A / Cycle B digests, TOTAL_REGISTER_SOURCE_COUNT,
  route-tree SHA-256, FUNCTIONAL_ROUTE_DIFF) are historical
  observations, not audit-accepted results.
- **BLOCKING FINDINGS (preserved, non-authoritative for any
  successor):**
  1. `CONTROLLED_DEV_REQUIRED_NOT_EXECUTED` — Cycle B relied on
     canonical `build:dev` + `build` sequences driven from the
     current harness process instead of a separately controlled
     `vite dev` instance under harness authority, so stability
     under an authorized, harness-owned development process was
     not proven.
  2. `COMPILER_FILE_LIST_NOT_PROVEN` — inclusion of
     `src/tanstack-start-register.d.ts` in the compiler file list
     was asserted but not evidenced by a persisted, verifiable
     compiler file-list artifact.
  3. `CYCLE_COMPOSITE_DIGEST_NOT_PROVEN` — the required
     deterministic ordered-manifest digest covering
     `src/routeTree.gen.ts`, the selected canonical source,
     `vite.config.ts`, `package.json`, and `bun.lock` was not
     independently computed and evidenced.
  4. `PARTIAL_FOOTER_FAIL_CLOSED_NOT_FULLY_IMPLEMENTED` — the
     stripper handles known and loose footer shapes but does not
     fully cover every partial-footer permutation with a
     fail-closed proof.
  5. `CONFLICTING_CURRENT_STATES_PRESENT` — prior planning and
     execution documents recorded coexisting "not started",
     "started", and "ready for final audit" states, resolved by
     this reconciliation into the single terminal state
     `Rejected`.
- **PREDECESSOR:** LSR-01 — Superseded (terminal · principal consumed ·
  corrective consumed · remaining budget 0/2 · corrective failed
  closed · register stability not resolved).
- **DELIVERABLES:** none accepted. Strategy B code artifacts remain
  present as rejected technical history.
- **FILES_ALLOWED:** frozen to nine paths (see impact analysis).
  `FUTURE_ADDENDUM_ALLOWED = false`. This reconciliation writes
  only to authorized documentary and evidence paths within that
  set.
- **MINIMUM_EVIDENCE:** not satisfied. `tanstack_start_register_source_count = 1`
  and `duplicate_module_augmentation = false` were observed, but
  `controlled_dev`, `compiler_file_list_proof`, and
  `cycle_composite_digest` were not proven; therefore the
  Definition of Done is NOT met.
- **EXTERNAL_DEPENDENCIES:** none.
- **HARD_GUARDS:** no manual edits to `src/routeTree.gen.ts`; no
  functional route changes; no runtime behavior change; no
  migrations / RLS / grants / policies / Auth / Storage / cron / DB
  changes. This document-only reconciliation preserves all
  guards.
- **OUT_OF_SCOPE:** LSV-03; LSV-04; `CLIENT_TENANT_AUTHORITY`;
  maintenance mode; tenant fixtures; Auth harness; Storage; DB;
  migrations; RLS; grants; policies; cron; queues; `net.http_post`;
  external Supabase; functional route changes; reopening of
  LSR-01; any new implementation prompt for LSR-02.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 2. `REMAINING_IMPLEMENTATION_BUDGET = 0/2`. Budget
  reopening is not authorized.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Blocked External · Rejected · Superseded. Final state = `Rejected`.
- **SUCCESSOR:** Formal replacement-path planning gate — not
  started. Rejection of LSR-02 does NOT auto-start LSV-03 and does
  NOT auto-transfer any deliverable from LSR-01, LSV-02, or the
  rejected LSR-02 implementation.


### 2.3 FRP-01 — Formal Replacement-Path Planning Gate

- **STATE:** Ready for External Audit — planning-only.
  `FRP01_STARTED = true`;
  `FRP01_PRINCIPAL_PROMPT_CONSUMED = true`;
  `FRP01_CORRECTIVE_PROMPT_CONSUMED = false`;
  `FRP01_REMAINING_IMPLEMENTATION_BUDGET = 1/2`;
  `FRP01_IMPLEMENTATION_CHANGES = false`.
- **OBJECTIVE:** materialize a finite, auditable and architecturally
  governed sequence to replace the failed path composed by LSV-02,
  LSR-01 and LSR-02, without implementing anything in this stage.
- **PREDECESSOR:** LSR-02 — Rejected (terminal).
- **DELIVERABLES:** this Execution Envelope and its Impact Analysis
  (`docs/architecture/impact-analysis/FRP-01-formal-replacement-path-planning-impact-analysis.md`);
  finite replacement path RRS-01 → PTA-01 → MOC-01 → RHV-01;
  preliminary boundaries for each successor stage.
- **MINIMUM_EVIDENCE:** the Impact Analysis document and the
  updated finite roadmap. No JSON evidence artifact is produced
  by this planning stage.
- **EXTERNAL_DEPENDENCIES:** none.
- **HARD_GUARDS (preserved and re-affirmed):**
  `SERVER_IS_SOLE_TENANT_AUTHORITY = true`;
  `CLIENT_TENANT_AUTHORITY = false`;
  `HEADER_TENANT_AUTHORITY = false`;
  `PATH_TENANT_AUTHORITY = false`;
  `SAME_BACKEND_HOMOLOGATION_CELL = required`;
  `EXTERNAL_SUPABASE_CANONICAL_FALLBACK = prohibited`;
  `HG_14_TRIGGERED = false`;
  RM Prime tenant preserved as Protected Baseline;
  73 `scp0121_*` tenants preserved as
  `PREEXISTING_INTERNAL_TEST_RESIDUE` (no cleanup planned).
- **OUT_OF_SCOPE:** implementation of any successor stage;
  correction / removal / rollback of Strategy B artifacts; any
  code, migration, RLS, grants, policies, Auth, Storage, cron
  or runtime change; new Vite dev server; harness live execution;
  tenant / user creation; auto-transfer of LSV-02 / LSR-01 /
  LSR-02 deliverables; introduction of external Supabase as
  canonical fallback.
- **FILES_ALLOWED:** exactly two paths — this map and the FRP-01
  Impact Analysis. `FUTURE_ADDENDUM_ALLOWED = false`.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 1 (principal). `FRP01_REMAINING_BUDGET = 1/2`.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **SUCCESSOR:** RRS-01 (`Planned — Blocked by FRP-01`). Not
  started by this stage.

### 2.4 RRS-01 — Registration Runtime Stabilization Replacement

- **STATE:** Planned — Blocked by FRP-01. `RRS01_STARTED = false`.
- **OBJECTIVE:** finite, deterministic replacement for the rejected
  Strategy B; single canonical source for the TanStack Start
  `Register` module augmentation.
- **PREDECESSOR:** FRP-01 accepted.
- **DELIVERABLES (preliminary):** single canonical source of
  augmentation; explicit treatment of rejected Strategy B
  artifacts (retention, controlled replacement or rollback);
  compiler file-list proof; composite deterministic digest of
  `src/routeTree.gen.ts` + canonical source + `vite.config.ts` +
  `package.json` + `bun.lock`; cycles A/B under build, build:dev
  and a harness-owned `vite dev` instance; fail-closed footer
  permutation proof.
- **AREAS AFFECTED (preliminary):** `src/routeTree.gen.ts`
  generator path; `vite.config.ts`; canonical augmentation source
  (currently `src/tanstack-start-register.d.ts` as rejected
  history); `tsconfig.json`; `package.json`; `bun.lock`.
- **EXPRESSLY FORBIDDEN:** DB / Auth / Storage / cron / RLS /
  grants / policies / triggers changes; migrations; runtime
  feature changes; automatic reuse of LSR-02 claims; skipping
  compiler file-list proof; skipping composite digest.
- **MIGRATIONS POTENTIALLY NEEDED:** none.
- **RLS / GRANTS / POLICIES IMPACT:** none.
- **TESTS REQUIRED (preliminary):** compiler file-list proof;
  composite digest; cycles A/B across three generator drivers;
  partial-footer fail-closed proof.
- **EVIDENCE:** persisted evidence JSON under
  `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/`.
- **EXTERNAL DEPENDENCIES:** none.
- **DEFINITION OF DONE (preliminary):**
  `tanstack_start_register_source_count = 1`;
  `duplicate_module_augmentation = false`;
  `controlled_dev_proof = true`;
  `compiler_file_list_proof = true`;
  `cycle_composite_digest_proof = true`;
  `partial_footer_fail_closed_proof = true`.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **SUCCESSOR:** PTA-01.

### 2.5 PTA-01 — Public Tenant Authority Hardening

- **STATE:** Planned — Blocked by RRS-01. `PTA01_STARTED = false`.
- **OBJECTIVE:** enforce server-authoritative tenant resolution
  across every public writer/reader for `public.leads`,
  `public.form_submissions` and `public.cms_campaign_public_events`
  (canonical name).
- **PREDECESSOR:** RRS-01 accepted.
- **DELIVERABLES (preliminary):** canonical server-side tenant
  origin per public writer; RLS/grants/policies review and
  required migrations; fail-closed handling of missing/ambiguous
  tenant; cross-tenant negative tests; forged-header /
  forged-payload probes.
- **AREAS AFFECTED (preliminary):**
  `src/routes/api/public/portal-leads.ts`,
  `src/routes/api/public/feeds.$portal.$token.ts`,
  `src/routes/api/public/bootstrap-admin.ts`,
  `src/routes/api/public/hooks/`,
  `src/lib/api/forms.functions.ts`,
  `src/lib/api/campaigns.functions.ts`,
  `src/lib/api/leads-crm.functions.ts`,
  `src/lib/api/portals.functions.ts`,
  RLS/grants/policies for the three public tables,
  `src/lib/tenant.server.ts`.
- **EXPRESSLY FORBIDDEN:** client / header / path tenant authority;
  default tenant; ORDER BY / LIMIT 1 / heuristic tenant
  selection; Storage authority delegated to client; cron / queue
  changes.
- **MIGRATIONS POTENTIALLY NEEDED:** RLS policies, grants,
  server-side helper functions for the three public tables.
- **RLS / GRANTS / POLICIES IMPACT:** likely revision required;
  exact scope frozen in the PTA-01 Execution Envelope.
- **TESTS REQUIRED (preliminary):** cross-tenant negative probes;
  forged-header / forged-payload probes; anonymous writer probes;
  server-authority parity tests.
- **EVIDENCE:** persisted evidence JSON with per-writer
  attribution proofs.
- **EXTERNAL DEPENDENCIES:** none.
- **DEFINITION OF DONE (preliminary):**
  `SERVER_IS_SOLE_TENANT_AUTHORITY = true` proven per writer;
  `HEADER_TENANT_AUTHORITY = false`;
  `PATH_TENANT_AUTHORITY = false`;
  `CLIENT_TENANT_AUTHORITY = false`;
  anonymous writer defects on `public.leads` (and the other two
  tables) resolved or explicitly re-classified with authorized
  evidence.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **SUCCESSOR:** MOC-01.

### 2.6 MOC-01 — Maintenance & Operational Control Boundary

- **STATE:** Planned — Blocked by PTA-01. `MOC01_STARTED = false`.
- **OBJECTIVE:** deliver a coordinated maintenance and operational
  control boundary across frontend, public pages, server
  functions, Edge Functions, cron, queues, webhooks, triggers,
  outbound integrations and `net.http_post` callers.
- **PREDECESSOR:** PTA-01 accepted.
- **DELIVERABLES (preliminary):** complete inventory of existing
  jobs/integrations (anchored by
  `supabase/migrations/20260616204333_email_infra.sql` and
  `supabase/migrations/20260616204617_email_infra.sql`);
  controlled activation / deactivation mechanism;
  observability; fail-closed behavior for public writer paths
  during maintenance; operator runbook.
- **AREAS AFFECTED (preliminary):** frontend maintenance surface;
  public route guards; server functions; Edge Functions; cron;
  queues; webhooks; triggers; outbound HTTP.
- **EXPRESSLY FORBIDDEN:** unbounded runtime feature changes;
  changes to LSH-01 accepted runtime edits; DB / Auth / Storage
  changes outside the maintenance surface; introduction of
  external Supabase.
- **MIGRATIONS POTENTIALLY NEEDED:** limited to the maintenance
  boundary primitives.
- **RLS / GRANTS / POLICIES IMPACT:** limited to enforcing
  fail-closed writes during maintenance windows.
- **TESTS REQUIRED (preliminary):** activation / deactivation
  probes; write-denial probes during maintenance; observability
  probes; inventory coverage proof.
- **EVIDENCE:** inventory manifest + persisted evidence JSON.
- **EXTERNAL DEPENDENCIES:** none.
- **DEFINITION OF DONE (preliminary):** complete inventory
  persisted; activation / deactivation proven; fail-closed public
  writers proven during maintenance; observability proven.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **SUCCESSOR:** RHV-01.

### 2.7 RHV-01 — Replacement Homologation Verification

- **STATE:** Planned — Blocked by MOC-01. `RHV01_STARTED = false`.
- **OBJECTIVE:** execute live identity, real-session, tenant
  context, impersonation and forged-header probes under the
  Same-Backend Homologation Cell, replacing the failed LSV-02
  outcome.
- **PREDECESSOR:** MOC-01 accepted.
- **DELIVERABLES (preliminary):** eligibility preflight
  confirmation; Protected Baseline registry (RM Prime tenant +
  preexisting protected entities); synthetic fixtures; real
  sessions; tenant context probes; forged-header probes;
  impersonation probes; deterministic teardown; residue scan;
  Auth aggregate evidence; cron / queue inventory confirmation;
  latest restore point confirmed; separate Storage physical
  backup where applicable; persisted evidence JSON.
- **AREAS AFFECTED (preliminary):** live backend under controlled
  maintenance window; Auth; Storage; cron; server functions;
  harness code.
- **EXPRESSLY FORBIDDEN:** use of real data; removal of RM Prime
  tenant; removal of the 73 `scp0121_*` residue tenants;
  external Supabase as canonical fallback; permanent HG-14
  disablement outside real operation.
- **MIGRATIONS POTENTIALLY NEEDED:** none (may become required
  only if PTA-01 / RRS-01 aftermath demands it — to be
  re-planned in that case).
- **RLS / GRANTS / POLICIES IMPACT:** none new; verifies the
  state established by PTA-01.
- **TESTS REQUIRED (preliminary):** live probes per the LSV-02
  hard-guard matrix (HG-01..HG-14 preserved); Auth aggregate
  evidence; residue scan.
- **EVIDENCE:** persisted evidence JSON with per-probe attribution.
- **EXTERNAL DEPENDENCIES:** operator authorization; controlled
  maintenance window; recovery / backup mechanism verified.
- **DEFINITION OF DONE (preliminary):**
  `eligibility_preflight_passed = true`;
  `protected_baseline_registered = true`;
  `synthetic_tenants_created >= 2`;
  `real_sessions_acquired > 0`;
  `forged_header_denial_verified = true`;
  `tenant_context_smoke_failed = 0`;
  `rm_prime_tenant_preserved = true`;
  `protected_baseline_changed = false`;
  `orphaned_fixtures = 0`;
  `residue_scan_passed = true`;
  `evidence_persisted = true`.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **SUCCESSOR:** LSV-03 (unblocking condition: RHV-01 accepted
  AND formal end-to-end acceptance of RRS-01 → PTA-01 → MOC-01
  → RHV-01).

### 2.8 LSV-03 — Lead Authorization, RLS, Grants & Impersonation Verification

- **STATE:** Planned — Blocked by RHV-01 and by formal end-to-end
  acceptance of the replacement path (RRS-01 → PTA-01 → MOC-01 →
  RHV-01). `LSV03_STARTED = false`.
- **OBJECTIVE:** preserve the historical objective of LSV-03
  without automatically absorbing the scope of LSV-02, LSR-01 or
  LSR-02.
- **PREDECESSOR:** RHV-01 accepted plus formal acceptance of the
  full replacement path.
- **MINIMUM_EVIDENCE:** Execution Envelope required before
  implementation.
- **EXTERNAL_DEPENDENCIES:** unresolved by the current planning.
  No external Supabase project is required, recommended or
  designated as canonical fallback.
- **OUT_OF_SCOPE:** automatic transfer of LSV-02 / LSR-01 /
  LSR-02 deliverables; implementation; live tests; migrations;
  RLS changes; grant changes.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** LSV-04, remaining blocked.

### 2.9 LSV-04 — Lead Transaction Integrity & Final Acceptance

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

### 2.10 RDA-01 — Role-Aware Dashboard & Decision Intelligence

- **STATE:** Planned — Blocked by LSV-04.
- **OBJECTIVE / DELIVERABLES / MINIMUM_EVIDENCE / EXTERNAL_DEPENDENCIES /
  OUT_OF_SCOPE / SUCCESSOR:** Execution Envelope required before
  implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.

### 2.11 RC-01 — Regression & Consolidation

- **STATE:** Planned — Blocked by RDA-01.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** PR-M2.

### 2.12 PR-M2 — Public Tenant Authority, White Label, CMS, Domains & Onboarding

- **STATE:** Planned — Blocked by RC-01.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** PR-M3.

### 2.13 PR-M3 — Product Quality, Operational Readiness & Closing Review

- **STATE:** Planned — Blocked by PR-M2.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** TH-M1.

### 2.14 TH-M1 — Homologation Provisioning & Full Validation

- **STATE:** Planned — Blocked by PR-M3.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** TH-M2.

### 2.15 TH-M2 — Defect Resolution, Regression & Production Gate

- **STATE:** Planned — Blocked by TH-M1.
- Execution Envelope required before implementation.
- **PROMPT_BUDGET:** principal 1 · corrective 1 · absolute max 2.
- **TERMINAL_STATES:** Accepted · Superseded · Rejected ·
  Blocked External.
- **SUCCESSOR:** Homologação.

### 2.16 Homologação

- **STATE:** Blocked by TH-M2.

### 2.17 Produção

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
