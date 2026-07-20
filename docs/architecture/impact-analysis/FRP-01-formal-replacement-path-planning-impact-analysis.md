# FRP-01 — Formal Replacement-Path Planning Gate — Impact Analysis

## STAGE_ID
FRP-01

## TYPE
Planning / Impact Analysis / Finite Roadmap Materialization

## STATUS
Ready for External Audit

- `FRP01_STARTED = true`
- `FRP01_PRINCIPAL_PROMPT_CONSUMED = true`
- `FRP01_CORRECTIVE_PROMPT_CONSUMED = false`
- `FRP01_REMAINING_IMPLEMENTATION_BUDGET = 1/2`
- Not declared: `Accepted`, `Implementation Complete`, `Ready for Implementation`, `Successor Authorized`.

## AUTHORITY
Derived from `docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md`
and preserved by
`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`.
Bound by the architectural invariants restated in Section
"TENANT_AUTHORITY_IMPACT".

## BASELINE_HEAD
`cc6d212691aad2dcba2baa32a39689c45fd9919a` (branch `main` at the
observed working ref). This IA reads only the repository at that HEAD;
no historical report is treated as an authority above the current
repository content.

## OBJECTIVE
Materialize a finite, auditable and architecturally governed sequence
to replace the failed path composed by LSV-02, LSR-01 and LSR-02,
without implementing anything in this stage. The FRP-01 planning
must:

- plan a replacement for the rejected TanStack Start registration
  stability solution;
- plan the correction of tenant authority on public writers;
- plan a global maintenance boundary and operational controls;
- plan an inventory and control layer for cron, queues, webhooks,
  triggers and outbound integrations;
- plan the acquisition of the Auth administrative evidence still
  missing;
- plan safe recovery and Storage preparation for future live
  execution;
- plan a live homologation verification under the Same-Backend
  Homologation Cell;
- define an objective condition for the future unblocking of LSV-03.

## PREDECESSOR
LSR-02 — Rejected (terminal · principal + final corrective consumed ·
`REMAINING_IMPLEMENTATION_BUDGET = 0/2` · budget reopening not
authorized · new implementation prompt not authorized).

## CURRENT_STATE_FINDINGS
- LSR-01 = `Superseded (terminal)`; LSR-02 = `Rejected (terminal)`;
  LSV-03 = `Planned — Blocked`.
- Strategy B artifacts from the rejected LSR-02 remain physically
  present at HEAD:
  - `src/tanstack-start-register.d.ts`
  - the LSR-02-scoped Vite plugin and bidirectional type
    assertions in `vite.config.ts`
  - the generated `src/routeTree.gen.ts` with its currently observed
    footer state.
  These artifacts are rejected technical history and are NOT an
  accepted architectural baseline.
- Public writer surfaces present at HEAD (identified from
  `src/routes/api/public/` and `src/lib/api/`):
  - `src/routes/api/public/portal-leads.ts`
  - `src/routes/api/public/feeds.$portal.$token.ts`
  - `src/routes/api/public/bootstrap-admin.ts`
  - `src/routes/api/public/hooks/` (webhook handlers)
  - `src/lib/api/forms.functions.ts`
  - `src/lib/api/campaigns.functions.ts`
  - `src/lib/api/leads-crm.functions.ts`
  - `src/lib/api/portals.functions.ts`
- Public tables whose writer path must be re-audited:
  - `public.leads`
  - `public.form_submissions`
  - `public.cms_campaign_public_events` (canonical name; the
    variant `public.cms_campaign_events` is NOT to be used without
    prior verification).
- Two migrations at HEAD reference outbound HTTP / pg_net /
  cron-related surfaces and require a full inventory under MOC-01:
  - `supabase/migrations/20260616204333_email_infra.sql`
  - `supabase/migrations/20260616204617_email_infra.sql`
- Preexisting internal test residue: 73 tenants matching
  `scp0121_*` — classified as
  `PREEXISTING_INTERNAL_TEST_RESIDUE`. Not scheduled for removal by
  this stage.
- RM Prime tenant remains the Protected Baseline; must be
  preserved through every future stage.

## REJECTED_PATH_ANALYSIS
- LSV-02 (Superseded — terminal): fail-closed abort before fixtures;
  zero DB/Auth/Storage/cron mutations; findings preserved only as
  inputs for future formal replanning and NOT auto-transferred.
- LSR-01 (Superseded — terminal): failed persistence verification
  and fail-closed corrective; TanStack Start register footer
  oscillation not resolved within its frozen scope.
- LSR-02 (Rejected — terminal): Strategy B implementation retained
  as rejected technical history. Blocking findings preserved:
  `CONTROLLED_DEV_REQUIRED_NOT_EXECUTED`,
  `COMPILER_FILE_LIST_NOT_PROVEN`,
  `CYCLE_COMPOSITE_DIGEST_NOT_PROVEN`,
  `PARTIAL_FOOTER_FAIL_CLOSED_NOT_FULLY_IMPLEMENTED`,
  `CONFLICTING_CURRENT_STATES_PRESENT`.
- No claim, digest or evidence produced under LSV-02, LSR-01 or
  LSR-02 is inherited automatically by any FRP-01 successor.

## REPLACEMENT_PATH_DECISIONS
- The replacement of the rejected registration stability solution is
  the exclusive responsibility of RRS-01. FRP-01 does not correct,
  remove, rollback or re-approve Strategy B.
- The correction of tenant authority on public writers is the
  exclusive responsibility of PTA-01.
- The maintenance boundary and inventory of cron/queues/webhooks/
  triggers/outbound integrations is the exclusive responsibility of
  MOC-01.
- The future live homologation verification is the exclusive
  responsibility of RHV-01, always under the Same-Backend
  Homologation Cell; external Supabase is prohibited as canonical
  fallback (`EXTERNAL_SUPABASE_CANONICAL_FALLBACK = prohibited`,
  `HG_14_TRIGGERED = false`).
- LSV-03 remains blocked until RHV-01 is accepted AND the
  replacement path (RRS-01 → PTA-01 → MOC-01 → RHV-01) is formally
  accepted end-to-end.

## FINITE_STAGE_SEQUENCE
1. FRP-01 — Formal Replacement-Path Planning Gate (this stage).
2. RRS-01 — Registration Runtime Stabilization Replacement.
3. PTA-01 — Public Tenant Authority Hardening.
4. MOC-01 — Maintenance & Operational Control Boundary.
5. RHV-01 — Replacement Homologation Verification.
6. LSV-03 — Lead Authorization, RLS, Grants & Impersonation
   Verification (remains `Planned — Blocked` until RHV-01
   acceptance + formal acceptance of the full replacement path).

Each successor stage requires its own frozen Execution Envelope
before any implementation prompt.

## STAGE_BOUNDARIES

### RRS-01 — Registration Runtime Stabilization Replacement
- **Objective:** finite, deterministic solution for TanStack Start
  module augmentation, replacing the rejected Strategy B.
- **Predecessor:** FRP-01 accepted.
- **Problem solved:** register footer oscillation between generator
  paths (dev vs build); single-source guarantee of
  `declare module '@tanstack/react-start'` Register interface.
- **Deliverables:** single canonical source; explicit treatment of
  rejected artifacts (retention, controlled replacement or
  rollback); deterministic proof across generation, typecheck,
  build and a harness-owned `vite dev` instance; fail-closed
  behavior for partial or unknown footer permutations.
- **Areas affected:** `src/routeTree.gen.ts` generation path;
  `vite.config.ts`; `src/tanstack-start-register.d.ts`;
  `tsconfig.json`; `package.json`; `bun.lock`.
- **Potentially allowed:** replacement of the rejected declaration
  file, controlled rewrite of the LSR-02 Vite plugin, adjustments
  to include lists.
- **Expressly forbidden:** DB/Auth/Storage/cron/RLS/grants/policies
  changes; migrations; runtime feature changes; automatic reuse of
  LSR-02 claims; skipping compiler file-list proof; skipping the
  composite digest.
- **Migrations potentially needed:** none.
- **RLS/grants/policies impact:** none.
- **Tests required:** compiler file-list proof; composite
  deterministic digest of
  `src/routeTree.gen.ts`, canonical source,
  `vite.config.ts`, `package.json`, `bun.lock`; cycles A/B under
  build + build:dev + harness-owned `vite dev`; fail-closed
  footer-permutation proof.
- **Evidence:** signed evidence JSON persisted under
  `docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/`.
- **External dependencies:** none.
- **Preliminary DoD:** `tanstack_start_register_source_count = 1`;
  `duplicate_module_augmentation = false`;
  `controlled_dev_proof = true`;
  `compiler_file_list_proof = true`;
  `cycle_composite_digest_proof = true`;
  `partial_footer_fail_closed_proof = true`.
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Terminal states:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **Successor:** PTA-01.

### PTA-01 — Public Tenant Authority Hardening
- **Objective:** enforce server-authoritative tenant resolution on
  every public writer/reader for `public.leads`,
  `public.form_submissions`,
  `public.cms_campaign_public_events`.
- **Predecessor:** RRS-01 accepted.
- **Problem solved:** client/header/path acting as tenant authority
  on public writer surfaces; tenant spoofing risk on unauthenticated
  paths.
- **Deliverables:** canonical server-side tenant origin per public
  writer; RLS/grants/policies review and, where required, updated
  server functions; fail-closed handling of missing/ambiguous
  tenant; cross-tenant negative tests.
- **Areas affected:**
  `src/routes/api/public/portal-leads.ts`,
  `src/routes/api/public/feeds.$portal.$token.ts`,
  `src/routes/api/public/bootstrap-admin.ts`,
  `src/routes/api/public/hooks/`,
  `src/lib/api/forms.functions.ts`,
  `src/lib/api/campaigns.functions.ts`,
  `src/lib/api/leads-crm.functions.ts`,
  `src/lib/api/portals.functions.ts`,
  RLS/grants/policies for the three public tables,
  `src/lib/tenant.server.ts` domain resolution.
- **Potentially allowed:** new server functions; migrations for
  RLS/grants/policies/functions; controlled schema adjustments if
  strictly required by the tenant boundary.
- **Expressly forbidden:** client-side tenant authority; header
  authority; path authority; default tenant; ORDER BY / LIMIT 1 /
  heuristic tenant selection; Storage authority delegated to client;
  cron/queue changes.
- **Migrations potentially needed:** RLS policies, grants and
  server-side helper functions for the three public tables.
- **RLS/grants/policies impact:** likely revision required (exact
  scope to be frozen in the PTA-01 Execution Envelope).
- **Tests required:** cross-tenant negative probes; forged-header /
  forged-payload probes; anonymous writer probes; server-authority
  parity tests.
- **Evidence:** persisted evidence JSON with per-writer
  attribution proofs.
- **External dependencies:** none.
- **Preliminary DoD:** `SERVER_IS_SOLE_TENANT_AUTHORITY = true`
  proven for each writer; `HEADER_TENANT_AUTHORITY = false`;
  `PATH_TENANT_AUTHORITY = false`; `CLIENT_TENANT_AUTHORITY = false`;
  anonymous writer defects on `public.leads` (and the other two
  tables) resolved or explicitly re-classified with authorized
  evidence.
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Terminal states:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **Successor:** MOC-01.

### MOC-01 — Maintenance & Operational Control Boundary
- **Objective:** deliver a coordinated maintenance and operational
  control boundary across frontend, public pages, server functions,
  Edge Functions, cron, queues, webhooks, triggers, outbound
  integrations and `net.http_post` calls.
- **Predecessor:** PTA-01 accepted.
- **Problem solved:** absence of a coordinated fail-closed
  maintenance window during critical operations (including future
  RHV-01 execution); missing complete inventory of cron/queues/
  webhooks/triggers/outbound integrations.
- **Deliverables:** complete inventory of the existing
  jobs/integrations (starting from
  `supabase/migrations/20260616204333_email_infra.sql`,
  `supabase/migrations/20260616204617_email_infra.sql` and any
  other outbound surfaces discovered);
  controlled activation/deactivation mechanism; observability;
  fail-closed behavior for public writer paths during maintenance;
  documented operator runbook.
- **Areas affected:** frontend maintenance surface; public route
  guards; server functions; Edge Functions; cron; queues;
  webhooks; triggers; outbound HTTP.
- **Potentially allowed:** new server-side maintenance switch;
  observability hooks; migrations strictly required for the
  boundary.
- **Expressly forbidden:** unbounded runtime feature changes;
  changes to LSH-01 accepted runtime edits; DB/Auth/Storage
  changes outside the maintenance surface; introduction of
  external Supabase.
- **Migrations potentially needed:** limited to the maintenance
  boundary primitives.
- **RLS/grants/policies impact:** limited to enforcing fail-closed
  writes during maintenance windows.
- **Tests required:** activation/deactivation probes; write
  denial probes during maintenance; observability probes;
  inventory coverage proof.
- **Evidence:** inventory manifest + persisted evidence JSON.
- **External dependencies:** none.
- **Preliminary DoD:** complete inventory persisted;
  activation/deactivation proven; fail-closed public writers
  proven during maintenance; observability proven.
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Terminal states:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **Successor:** RHV-01.

### RHV-01 — Replacement Homologation Verification
- **Objective:** execute live identity, real-session, tenant
  context, impersonation and forged-header probes under the
  Same-Backend Homologation Cell, replacing the failed LSV-02
  outcome.
- **Predecessor:** MOC-01 accepted.
- **Problem solved:** absence of live verification of the
  replacement path.
- **Deliverables:** eligibility preflight confirmation; Protected
  Baseline registry (RM Prime tenant + preexisting protected
  entities); synthetic fixtures; real sessions; tenant context
  probes; forged-header probes; impersonation probes;
  deterministic teardown; residue scan; Auth aggregate evidence;
  cron/queue inventory confirmation; latest restore point
  confirmed; separate Storage physical backup where applicable;
  persisted evidence JSON.
- **Areas affected:** live backend under controlled maintenance
  window; Auth; Storage; cron; server functions; harness code.
- **Potentially allowed:** live probes strictly within the
  Same-Backend Homologation Cell.
- **Expressly forbidden:** use of real data; removal of RM Prime
  tenant; removal of the 73 `scp0121_*` residue tenants;
  external Supabase as canonical fallback; permanent HG-14
  disablement outside real operation.
- **Migrations potentially needed:** none (may become required
  only if PTA-01/RRS-01 aftermath demands it — to be re-planned).
- **RLS/grants/policies impact:** none new; verifies the state
  established by PTA-01.
- **Tests required:** live probes per the LSV-02 hard-guard
  matrix (HG-01..HG-14 preserved); Auth aggregate evidence;
  residue scan.
- **Evidence:** persisted evidence JSON with per-probe attribution.
- **External dependencies:** Operator authorization; controlled
  maintenance window; recovery/backup mechanism verified.
- **Preliminary DoD:** `eligibility_preflight_passed = true`;
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
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Terminal states:** Accepted · Accepted with Non-Blocking Backlog ·
  Superseded · Rejected · Blocked External.
- **Successor:** LSV-03 (unblocking condition: RHV-01 accepted AND
  full replacement path RRS-01 → PTA-01 → MOC-01 → RHV-01
  formally accepted).

## TENANT_AUTHORITY_IMPACT
Invariants preserved and re-affirmed:
- `SERVER_IS_SOLE_TENANT_AUTHORITY = true`
- `CLIENT_TENANT_AUTHORITY = false`
- `HEADER_TENANT_AUTHORITY = false`
- `PATH_TENANT_AUTHORITY = false`
- `x-tenant-id` is transport only and must be revalidated
  server-side.
- No default tenant; no ORDER BY / LIMIT 1 / heuristic tenant
  selection; fail-closed on absence or ambiguity.
- Super Admin without explicit impersonation does not access
  tenant-scoped resources.
FRP-01 makes no code change; PTA-01 will materialize the actual
enforcement.

## MAINTENANCE_BOUNDARY_IMPACT
No maintenance boundary is introduced by FRP-01. The full boundary
is deferred to MOC-01. Until MOC-01 is accepted, no coordinated
fail-closed maintenance mode exists for public writers or
outbound integrations.

## CRON_QUEUE_WEBHOOK_OUTBOUND_IMPACT
Two migrations at HEAD reference email infrastructure /
outbound HTTP surfaces:
- `supabase/migrations/20260616204333_email_infra.sql`
- `supabase/migrations/20260616204617_email_infra.sql`
Full inventory of cron, queues, webhooks, triggers, `net.http_post`
callers and outbound integrations is deferred to MOC-01. FRP-01
records these anchors as mandatory inputs.
`UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` for any
integration not fully identified from the repository at BASELINE_HEAD.

## AUTH_EVIDENCE_IMPACT
The Auth administrative evidence still missing (aggregate
inventory of `auth.users`, provider configurations, session
policies) is not gathered by FRP-01. RHV-01 will produce it under
authorized operator supervision.
`UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE`.

## RECOVERY_AND_STORAGE_IMPACT
No recovery action, restore, backup or Storage change is executed
by FRP-01. RHV-01 must, prior to live execution:
- confirm the latest restore point;
- confirm the recovery/backup mechanism;
- arrange a separate Storage physical backup when applicable.
`UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` for the current
restore-point and Storage backup state.

## SAME_BACKEND_HOMOLOGATION_CONSTRAINTS
- `SAME_BACKEND_HOMOLOGATION_CELL = required`
- `EXTERNAL_SUPABASE_CANONICAL_FALLBACK = prohibited`
- `HG_14_TRIGGERED = false`
- Hard Guards HG-01..HG-14 remain frozen as defined in the LSV-02
  Impact Analysis and apply to RHV-01.
- RM Prime tenant remains Protected Baseline.
- 73 `scp0121_*` tenants remain classified as
  `PREEXISTING_INTERNAL_TEST_RESIDUE`; not scheduled for cleanup.

## FILES_ALLOWED
Exactly two paths:
- `docs/architecture/impact-analysis/FRP-01-formal-replacement-path-planning-impact-analysis.md`
- `docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`

`FUTURE_ADDENDUM_ALLOWED = false` for this stage.

## MIGRATIONS_ALLOWED
None (`MIGRATIONS_ADDED = 0`).

## RUNTIME_CHANGES_ALLOWED
None (`RUNTIME_CHANGED = false`).

## RLS_CHANGES_ALLOWED
None (`RLS_CHANGED = false`).

## GRANTS_CHANGES_ALLOWED
None (`GRANTS_CHANGED = false`).

## POLICY_CHANGES_ALLOWED
None (`POLICIES_CHANGED = false`).

## TESTS_REQUIRED
Documentary validations only:
1. `git diff --name-only` against BASELINE_HEAD returns exactly the
   two authorized files.
2. No duplicate stage IDs in the roadmap.
3. No conflicting current states for LSR-02.
4. No successor implementation authorization introduced.
5. No file outside `docs/` altered.
6. No terminal stage reopened.
7. No external Supabase introduced as fallback.
8. `scp0121_*` cleanup not planned.

## EVIDENCE_REQUIRED
This IA itself and the updated finite roadmap. No JSON evidence
artifact is produced by FRP-01 (a purely documentary planning
stage). Each future stage will produce its own persisted evidence
JSON.

## DEFINITION_OF_DONE
- `FRP01_IMPACT_ANALYSIS_CREATED = true`
- `FINITE_REPLACEMENT_PATH_MATERIALIZED = true`
- `RRS01_PLANNED = true`
- `PTA01_PLANNED = true`
- `MOC01_PLANNED = true`
- `RHV01_PLANNED = true`
- Each future stage documents: objective, predecessor,
  deliverables, boundaries, tests, evidence, prompt budget,
  terminal states, successor.
- `LSR02_REMAINS_REJECTED_TERMINAL = true`
- `LSR02_BUDGET_REMAINS_0_2 = true`
- `LSV03_REMAINS_BLOCKED = true`
- `SAME_BACKEND_HOMOLOGATION_CELL_PRESERVED = true`
- `EXTERNAL_SUPABASE_FALLBACK_PROHIBITED = true`
- `SERVER_TENANT_AUTHORITY_PRESERVED = true`
- `CODE_FILES_CHANGED = 0`
- `FILES_OUTSIDE_ALLOWED = 0`
- `DUPLICATE_STAGE_IDS = 0`
- `CONFLICTING_CURRENT_STATES = 0`
- `FRP01_STATUS = Ready for External Audit`
- `FRP01_PRINCIPAL_CONSUMED = true`
- `FRP01_CORRECTIVE_CONSUMED = false`
- `FRP01_REMAINING_BUDGET = 1/2`
- `NO_SUCCESSOR_STARTED = true`

## OUT_OF_SCOPE
- Implementation of RRS-01, PTA-01, MOC-01, RHV-01, LSV-03 or any
  successor.
- Correction, removal or rollback of Strategy B artifacts.
- New Vite dev server; harness live execution; tenant/user
  creation; DB/Auth/Storage/cron/RLS/grants/policies/triggers
  changes; restore or maintenance execution.
- Auto-transfer of any LSV-02 / LSR-01 / LSR-02 deliverable.
- Introduction of external Supabase as canonical fallback.

## EXTERNAL_DEPENDENCIES
None.

## PROMPT_BUDGET
Principal 1 · corrective 1 · absolute max 2. Consumed: 1
(principal). Remaining: 1/2.

## TERMINAL_STATES
Accepted · Accepted with Non-Blocking Backlog · Superseded ·
Rejected · Blocked External.

## SUCCESSOR
RRS-01 — Registration Runtime Stabilization Replacement
(`Planned — Blocked by FRP-01`). Not started by this stage.

## DECISÕES OBRIGATÓRIAS DA FRP-01 (objective answers)
- **Rejected LSR-02 artifacts physically present at HEAD:**
  `src/tanstack-start-register.d.ts`; the
  `lsr02:strip-tanstack-start-register-footer` plugin and
  bidirectional type assertions inside `vite.config.ts`; the
  generated `src/routeTree.gen.ts` in its currently observed state.
- **Risks while not replaced:** register footer oscillation between
  generator paths; hidden coupling with an unaccepted stripper;
  false sense of stability; risk of regression on any future
  route-tree touch.
- **Authoritative replacement/removal stage:** RRS-01.
- **Public writers accepting/deriving tenant today:**
  `src/routes/api/public/portal-leads.ts`,
  `src/routes/api/public/feeds.$portal.$token.ts`,
  `src/routes/api/public/hooks/*`,
  `src/lib/api/forms.functions.ts`,
  `src/lib/api/campaigns.functions.ts`,
  `src/lib/api/leads-crm.functions.ts`,
  `src/lib/api/portals.functions.ts`.
- **Where tenant authority must reside:** exclusively server-side,
  resolved from an authoritative source per writer
  (`SERVER_IS_SOLE_TENANT_AUTHORITY = true`); never from client,
  header (`x-tenant-id` is transport only), or path.
- **RLS policies and grants requiring future review:** those
  covering `public.leads`, `public.form_submissions` and
  `public.cms_campaign_public_events`; exact scope
  `UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` until PTA-01.
- **Public paths to block in maintenance:** all under
  `src/routes/api/public/**`; exact contract deferred to MOC-01.
- **Existing cron/queues/webhooks/triggers/outbound integrations:**
  anchored by `supabase/migrations/20260616204333_email_infra.sql`
  and `supabase/migrations/20260616204617_email_infra.sql`; full
  inventory `UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` until
  MOC-01.
- **Maintenance boundary coordination:** deferred to MOC-01.
- **Missing Auth evidence:** aggregate `auth.users` administrative
  inventory, provider configurations, session policies —
  `UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE`.
- **Recovery conditions before live execution:** confirmed latest
  restore point, verified recovery/backup mechanism, separate
  Storage physical backup where applicable — to be confirmed by
  RHV-01.
- **Same-Backend Homologation Cell preservation:** enforced across
  the whole replacement path; external Supabase remains
  prohibited as canonical fallback.
- **Objective condition to unblock LSV-03:** RHV-01 accepted AND
  formal end-to-end acceptance of RRS-01 → PTA-01 → MOC-01 →
  RHV-01.
