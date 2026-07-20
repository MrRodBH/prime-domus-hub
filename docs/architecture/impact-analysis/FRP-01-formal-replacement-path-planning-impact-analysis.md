# FRP-01 — Formal Replacement-Path Planning Gate — Impact Analysis

## STAGE_ID
FRP-01

## TYPE
Planning / Impact Analysis / Principal Planning / Final Corrective Planning / Final External Audit

## STATUS
Rejected — Terminal

- `FRP01_STARTED = true`
- `FRP01_PRINCIPAL_PROMPT_CONSUMED = true`
- `FRP01_CORRECTIVE_PROMPT_CONSUMED = true`
- `FRP01_REMAINING_IMPLEMENTATION_BUDGET = 0/2`
- `FRP01_FINAL_EXTERNAL_AUDIT_ACCEPTED = false`
- `FRP01_ADDITIONAL_IMPLEMENTATION_PROMPT_AUTHORIZED = false`
- `FRP01_BUDGET_REOPENING_AUTHORIZED = false`
- Not declared: `Accepted`, `Implementation Complete`, `Ready for Implementation`, `Successor Authorized`.

## FINAL EXTERNAL AUDIT DECISION — TERMINAL REJECTION

- **Audited HEAD:** `c5b67ba80131a8ba9d64fbe6f4ff36e248996ca3`.
- **Decision:** `FRP_01_STATE = Rejected`; `FRP_01_TERMINAL = true`;
  `FINAL_EXTERNAL_AUDIT_ACCEPTED = false`;
  `READY_FOR_FINAL_EXTERNAL_AUDIT = false`;
  `NEXT_STAGE_AUTHORIZED = none`.
- **Budget exhaustion:** principal prompt consumed; final corrective
  prompt consumed; `FRP01_REMAINING_IMPLEMENTATION_BUDGET = 0/2`;
  no third implementation prompt authorized; budget reopening not
  authorized.
- **Blocking findings preserved (not backlog):**
  1. `ROADMAP_FRP01_STATE_CONFLICT = true` — the finite roadmap
     simultaneously recorded FRP-01 as "Ready for Final External
     Audit / corrective consumed / 0/2" and as "Ready for External
     Audit / corrective not consumed / 1/2 / consumed 1".
  2. `ROADMAP_FRP01_BUDGET_CONFLICT = true` — coexisting budget
     values `0/2` and `1/2` for the same stage.
  3. `ROADMAP_LSR02_SUCCESSOR_STATE_STALE = true` — the LSR-02
     Execution Envelope still asserted "Formal replacement-path
     planning gate — not started" after FRP-01 was executed and
     rejected.
  4. `BOOTSTRAP_ADMIN_ELIGIBILITY_DESCRIPTION_INACCURATE = true` —
     the surface matrix described bootstrap eligibility as read from
     "env / admin flags"; the actual runtime derives eligibility
     from a count query on `public.user_roles` where `role = 'admin'`.
  5. `PORTAL_DLQ_RETRY_SIGNED_WEBHOOK_CLASSIFICATION_INACCURATE = true` —
     the surface matrix labelled `portal-dlq-retry` as
     "SIGNED/SCHEDULED INVOCATION"; the actual runtime accepts
     `apikey == SUPABASE_PUBLISHABLE_KEY` or
     `x-cron-secret == CRON_SECRET`, with no cryptographic webhook
     signature verification present.
- **Successor authorization:** none. `RRS01_STARTED = false`;
  `PTA01_STARTED = false`; `MOC01_STARTED = false`;
  `RHV01_STARTED = false`; `LSV03_STARTED = false`. No boundary
  defined in the historical planning below is accepted by this stage.
- **Definition-of-done outcome:** `FRP01_DEFINITION_OF_DONE_MET = false`.
- **Artifact status:** all planning content below is retained solely
  as rejected technical history; it is not accepted, not executable,
  and not transferable to any successor stage. It creates no
  authority and no obligation.
- **Terminal-stage preservation:** `LSR_01_STATE = Superseded`;
  `LSR_02_STATE = Rejected`. No terminal stage is reopened by this
  reconciliation.

## HISTORICAL REJECTED PLANNING — NON-AUTHORITATIVE

All sections that follow (AUTHORITY, BASELINE_HEAD, OBJECTIVE,
PREDECESSOR, CURRENT_STATE_FINDINGS, REJECTED_PATH_ANALYSIS,
REPLACEMENT_PATH_DECISIONS, FINITE_STAGE_SEQUENCE,
FINAL CORRECTIVE RECONCILIATION and its subsections including
CAMPAIGN_EVENT_OBJECT_IDENTITY, PUBLIC_SURFACE_AUTHORITY_MATRIX,
PTA01_PRM2_SCOPE_RECONCILIATION, CURRENT_OPERATIONAL_SURFACE_INVENTORY,
FINAL_STAGE_BOUNDARIES, STAGE_BOUNDARIES and every stage-level
subsection thereafter) are classified as
`HISTORICAL REJECTED PLANNING · NON-AUTHORITATIVE`. They are preserved
only to trace the rejected reasoning and remain non-binding for every
current and future stage.

## AUTHORITY
Derived from `docs/architecture/governance/FINITE_DELIVERY_GOVERNANCE.md`
and preserved by
`docs/architecture/governance/FINITE_ROADMAP_EXECUTION_MAP.md`.
Bound by the architectural invariants restated in Section
"TENANT_AUTHORITY_IMPACT".

## BASELINE_HEAD
Principal baseline: `cc6d212691aad2dcba2baa32a39689c45fd9919a`.
Final corrective start HEAD: `452a0b173bd37caa44a7d158816bff8a49072919`.
This IA reads only the repository at the corrective HEAD; no
historical report is treated as an authority above the current
repository content.

## OBJECTIVE
Materialize a finite, auditable and architecturally governed sequence
to replace the failed path composed by LSV-02, LSR-01 and LSR-02,
and — under the final corrective — reconcile:
- the factual identity of the campaign-events schema object,
- the public-surface authority matrix (including the correct
  classification of `bootstrap-admin`),
- the PTA-01 × PR-M2 scope overlap,
- the operational inventory (extensions, queues, RPC wrappers, cron,
  Edge Function contract, outbound HTTP, duplicate-migration finding).

No implementation is performed in this stage.

## PREDECESSOR
LSR-02 — Rejected (terminal · principal + final corrective consumed ·
`REMAINING_IMPLEMENTATION_BUDGET = 0/2` · budget reopening not
authorized · new implementation prompt not authorized).

## CURRENT_STATE_FINDINGS
- LSR-01 = `Superseded (terminal)`; LSR-02 = `Rejected (terminal)`;
  LSV-03 = `Planned — Blocked`.
- Strategy B artifacts from the rejected LSR-02 remain physically
  present at HEAD (rejected technical history, NOT an accepted
  architectural baseline):
  - `src/tanstack-start-register.d.ts`
  - the LSR-02-scoped Vite plugin and bidirectional type
    assertions in `vite.config.ts`
  - `src/routeTree.gen.ts` in its currently observed state.
- Public writer / reader surfaces present at HEAD:
  - `src/routes/api/public/portal-leads.ts`
  - `src/routes/api/public/feeds.$portal.$token.ts`
  - `src/routes/api/public/bootstrap-admin.ts`
  - `src/routes/api/public/hooks/portal-dlq-retry.ts`
  - `src/lib/api/forms.functions.ts`
  - `src/lib/api/campaigns.functions.ts`
  - `src/lib/api/leads-crm.functions.ts`
  - `src/lib/api/portals.functions.ts`
- Public tables whose writer/reader path must be re-audited by PTA-01:
  - `public.leads`
  - `public.form_submissions`
  - `public.cms_campaign_events` (factual object — see
    `CAMPAIGN_EVENT_OBJECT_IDENTITY`).
- Two migration files anchor the email/queue/cron operational surface
  and require inventory under MOC-01:
  - `supabase/migrations/20260616204333_email_infra.sql`
  - `supabase/migrations/20260616204617_email_infra.sql`
  Both files carry byte-identical content
  (`DUPLICATE_MIGRATION_CONTENT_PRESENT = true`).
- Preexisting internal test residue: 73 tenants matching
  `scp0121_*` — classified as `PREEXISTING_INTERNAL_TEST_RESIDUE`.
  Not scheduled for removal by this stage.
- RM Prime tenant remains the Protected Baseline; must be preserved
  through every future stage.

## REJECTED_PATH_ANALYSIS
- LSV-02 (Superseded — terminal): fail-closed abort before fixtures;
  zero DB/Auth/Storage/cron mutations; findings preserved only as
  inputs for future formal replanning and NOT auto-transferred.
- LSR-01 (Superseded — terminal): failed persistence verification
  and fail-closed corrective; TanStack Start register footer
  oscillation not resolved within its frozen scope.
- LSR-02 (Rejected — terminal): Strategy B implementation retained
  as rejected technical history. Blocking findings preserved
  (`CONTROLLED_DEV_REQUIRED_NOT_EXECUTED`,
  `COMPILER_FILE_LIST_NOT_PROVEN`,
  `CYCLE_COMPOSITE_DIGEST_NOT_PROVEN`,
  `PARTIAL_FOOTER_FAIL_CLOSED_NOT_FULLY_IMPLEMENTED`,
  `CONFLICTING_CURRENT_STATES_PRESENT`).
- No claim, digest or evidence produced under LSV-02, LSR-01 or
  LSR-02 is inherited automatically by any FRP-01 successor.

## REPLACEMENT_PATH_DECISIONS
- The replacement of the rejected registration stability solution is
  the exclusive responsibility of RRS-01. FRP-01 does not correct,
  remove, rollback or re-approve Strategy B.
- The correction of tenant authority on public writers/readers for
  the three canonical tables is the exclusive responsibility of
  PTA-01 (see `PTA01_PRM2_SCOPE_RECONCILIATION`).
- The maintenance boundary and inventory of cron/queues/webhooks/
  triggers/outbound integrations is the exclusive responsibility of
  MOC-01 (see `CURRENT_OPERATIONAL_SURFACE_INVENTORY`).
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

---

## FINAL CORRECTIVE RECONCILIATION

This section is authoritative for the final corrective pass and
supersedes any earlier language in this document where they conflict.

### CAMPAIGN_EVENT_OBJECT_IDENTITY

Read-only inspection performed against the corrective HEAD across
`src/`, `supabase/migrations/**` and `docs/architecture/**`.

| Name | Kind | DDL source | In typed schema | Writers (runtime) | Readers (runtime) | Policies | Grants | Triggers | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| `public.cms_campaign_events` | TABLE | `supabase/migrations/20260701225508_2340a9ca-812b-40dc-8e27-142489b916fd.sql` (CREATE TABLE, INDEXES, GRANTS, RLS ENABLE, policies `tenant_isolation`, `events_public_insert`, `events_admin_read`); `supabase/migrations/20260702201546_e79ac817-1203-4fde-8640-a59790f0787b.sql` (updates `events_public_insert`); `supabase/migrations/20260707134301_34a52390-27a4-4640-9919-44da76f31e86.sql` (converts `tenant_isolation` to RESTRICTIVE) | Yes — `src/integrations/supabase/types.ts` (`Database["public"]["Tables"]["cms_campaign_events"]`) | `src/lib/api/campaigns.functions.ts::registrarEventoCampanha` (insert) | `src/lib/api/campaigns.functions.ts::metricasCampanha` (select `tipo` by `campaign_id`) | `tenant_isolation` (RESTRICTIVE, ALL, `get_current_tenant_id()`), `events_public_insert` (PERMISSIVE INSERT), `events_admin_read` (PERMISSIVE SELECT for admin roles) | `INSERT` to `anon, authenticated`; sequence USAGE to `anon, authenticated`; `SELECT` to `authenticated`; `ALL` to `service_role` | None declared in inspected DDL | Migrations above; typed schema; runtime writers/readers above |
| `public.cms_campaign_public_events` | INEXISTENT / UNVERIFIED | No CREATE TABLE, VIEW, FUNCTION or ALIAS found | No | None | None | None | None | None | Only prior FRP-01 planning language and a single historical footnote referred to this name |

Rules applied:
- No name declared canonical without both DDL and runtime alignment.
- Historical references are not treated as vigent facts.
- Object existence not inferred from documentation.

Resulting canonical bindings:

```
CURRENT_VERIFIED_CAMPAIGN_EVENT_OBJECT =
  public.cms_campaign_events

public.cms_campaign_public_events =
  UNVERIFIED_OR_STALE_REFERENCE
```

Every subsequent mention in this IA and in the finite roadmap uses
`public.cms_campaign_events`. PTA-01 will operate on this factual
object.

### PUBLIC_SURFACE_AUTHORITY_MATRIX

The matrix below is authoritative for FRP-01 planning. It does not
constitute an acceptance of the current behavior; PTA-01 owns the
hardening.

| SURFACE | FUNCTION_OR_METHOD | PUBLIC_ACCESS | READS | WRITES | TARGET_OBJECTS | TENANT_SOURCE | CLIENT_CONTROLLED_INPUT | HEADER_USAGE | AUTHORITY_CLASSIFICATION | FUTURE_STAGE_OWNER | EVIDENCE_PATH |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Portal leads | `src/routes/api/public/portal-leads.ts` POST | anonymous | portal connector by token+portal; imóvel lookup | `public.leads` insert; `public.portal_sync_logs` inserts | `public.leads`, `public.portal_sync_logs`, `public.portal_connectors` | server-derived from connector matched by `(portal, token)` | portal path segment; token; lead payload; property external id | none required for tenant resolution | `PUBLIC_TENANT_WRITER — TOKEN-DERIVED SERVER AUTHORITY (must be hardened against spoofing, cardinality ambiguity, cross-tenant property association)` | PTA-01 | `src/routes/api/public/portal-leads.ts` |
| Portal feed | `src/routes/api/public/feeds.$portal.$token.ts` GET | anonymous | tenant-scoped read of `public.imoveis`, `public.imovel_imagens`, `public.imovel_portais` | updates `public.portal_connectors` (last_sync); writes `public.imovel_portais` sync state; inserts `public.portal_sync_logs` | `public.imoveis` (read), `public.imovel_imagens` (read), `public.imovel_portais` (read+write), `public.portal_connectors` (write), `public.portal_sync_logs` (write) | server-derived from connector matched by `(portal, token)` | portal path segment; token | none required for tenant resolution | `PUBLIC_READ_SURFACE_AND_OPERATIONAL_WRITER — TOKEN-DERIVED SERVER AUTHORITY` (NOT a pure reader) | PTA-01 | `src/routes/api/public/feeds.$portal.$token.ts` |
| Form submissions | `src/lib/api/forms.functions.ts` (public submit path) | anonymous (server function reachable without auth) | resolves form by `form_slug`; reads `tenant_id` from form row | inserts `public.form_submissions`; may create `public.leads` | `public.cms_forms` (read), `public.form_submissions` (write), `public.leads` (write) | derived server-side from form record found by `form_slug`; risk of global slug + cardinality + cross-tenant ambiguity | `form_slug`; submission payload | none | `PUBLIC_TENANT_WRITER — SLUG-DERIVED SERVER AUTHORITY (requires uniqueness+scope hardening)` | PTA-01 | `src/lib/api/forms.functions.ts` |
| Campaign events | `src/lib/api/campaigns.functions.ts::registrarEventoCampanha` | anonymous (no auth middleware) | none | insert into `public.cms_campaign_events` | `public.cms_campaign_events` | `tenantId` received from public input and forwarded to `publicClient(tenantId)`, which sets the `x-tenant-id` header consumed by RLS/`get_current_tenant_id()` | `campaign_id`, `tipo`, `rota`, `session_id`, `tenantId` | `x-tenant-id` set from client input (transport-level, not server authority) | `PUBLIC_TENANT_WRITER — CLIENT-DERIVED HEADER AUTHORITY (INVARIANT VIOLATION CANDIDATE)`; PTA-01 must replace with server-authoritative resolution and/or `campaign_id → tenant_id` join | PTA-01 | `src/lib/api/campaigns.functions.ts` (lines 179–221) |
| Portal DLQ retry | `src/routes/api/public/hooks/portal-dlq-retry.ts` | public webhook / cron caller | dequeues portal sync DLQ records | writes to `public.portal_sync_dlq`, `public.portal_sync_logs` | `public.portal_sync_dlq`, `public.portal_sync_logs`, `public.portal_connectors` | server-derived from DLQ record (connector reference) | webhook trigger payload / cron scheduler | none required for tenant resolution | `PUBLIC_OPERATIONAL_WEBHOOK — SHARED-SECRET INVOCATION` — the handler authorizes callers by matching `apikey == SUPABASE_PUBLISHABLE_KEY` or `x-cron-secret == CRON_SECRET`; no cryptographic webhook signature is verified. Prior "SIGNED/SCHEDULED INVOCATION" wording was inaccurate and is preserved only as rejected historical planning. Maintenance-gated by MOC-01. | MOC-01 (maintenance gating); PTA-01 does not adopt | `src/routes/api/public/hooks/portal-dlq-retry.ts` |
| Bootstrap admin | `src/routes/api/public/bootstrap-admin.ts` | anonymous | reads bootstrap eligibility from a count of `public.user_roles` rows with `role = 'admin'` (idempotent: no-op once at least one admin exists); prior "env / admin flags" wording was inaccurate and is preserved only as rejected historical planning | creates auth user via `supabaseAdmin.auth.admin.createUser`; grants administrative role | `auth.users` (via admin API); `public.user_roles` | not a per-tenant writer for `leads`/`form_submissions`/`cms_campaign_events` | bootstrap payload (`email`, `password`) | none | `PUBLIC_PRIVILEGED_AUTH_BOOTSTRAP_SURFACE` — NOT a tenant writer for the three PTA-01 tables; must NOT be silently absorbed by PTA-01; may be maintenance-gated by MOC-01; functional security correction requires a future authorized stage | Out of PTA-01 implementation scope; maintenance-gated by MOC-01 | `src/routes/api/public/bootstrap-admin.ts` |
| Leads CRM helpers | `src/lib/api/leads-crm.functions.ts` | authenticated | tenant-scoped lead reads | tenant-scoped lead writes | `public.leads` and related tables | server-authoritative (authenticated middleware + `get_current_tenant_id()`) | filter payloads | `x-tenant-id` treated as transport only, revalidated server-side | `AUTHENTICATED WRITER — SERVER AUTHORITY` (PTA-01 confirms invariants; no public-writer hardening required here) | PTA-01 (invariant confirmation) | `src/lib/api/leads-crm.functions.ts` |
| Portals admin helpers | `src/lib/api/portals.functions.ts` | authenticated | connector CRUD reads | connector CRUD writes | `public.portal_connectors` | server-authoritative (authenticated middleware) | connector payloads | `x-tenant-id` transport only | `AUTHENTICATED WRITER — SERVER AUTHORITY` | PTA-01 (invariant confirmation) | `src/lib/api/portals.functions.ts` |

Derived flags:

```
BOOTSTRAP_ADMIN_CLASSIFIED_OUTSIDE_PTA_IMPLEMENTATION_SCOPE = true
CLIENT_CONTROLLED_TENANT_INPUTS_EXPLICIT = true
HEADER_AUTHORITY_RISKS_EXPLICIT = true
```

### PTA01_PRM2_SCOPE_RECONCILIATION

- PTA-01 remains the single stage responsible for Public Tenant
  Authority hardening across `public.leads`,
  `public.form_submissions` and `public.cms_campaign_events`,
  including RLS/grants/policies review, server-side tenant
  attribution, and forged-header / forged-payload / cross-tenant
  probes.
- `bootstrap-admin.ts` is expressly removed from PTA-01
  implementation scope. It may be maintenance-gated by MOC-01, but
  its functional security correction requires a future authorized
  stage.
- PR-M2 is reconciled to
  `PR-M2 — White Label, CMS, Domains & Onboarding`. It MUST NOT
  reopen Public Tenant Authority. PR-M2 may validate functional
  integration with the accepted PTA-01 boundary but may not
  redefine tenant authority, reopen RLS/grants/policies established
  by PTA-01, reimplement public writers, introduce alternative
  paths, fallbacks or heuristics.

```
PTA01_PRM2_SCOPE_OVERLAP = false
PRM2_PUBLIC_TENANT_AUTHORITY_REOPENING_ALLOWED = false
PUBLIC_TENANT_AUTHORITY_SCOPE = completed_exclusively_by_PTA_01
PR_M2_MUST_NOT_REOPEN_PTA_01 = true
```

### CURRENT_OPERATIONAL_SURFACE_INVENTORY

Read-only inventory anchored in versioned repository content. Items
marked `DYNAMIC_POST_MIGRATION_CONFIGURATION` are defined by the
versioned migration scripts as required post-migration steps; their
current administrative state on the running backend is
`CURRENT_ADMIN_STATE_UNKNOWN` (requires future authorized evidence
in MOC-01/RHV-01). Nothing here is executed by FRP-01.

Extensions (`VERSIONED_STATIC_DEFINITION`):
- `pg_net` (schema `extensions`) — `20260616204333_email_infra.sql:6`
- `pg_cron` — `20260616204333_email_infra.sql:8-10`
- `supabase_vault` — `20260616204333_email_infra.sql:12`
- `pgmq` — `20260616204333_email_infra.sql:13`

Queues (`VERSIONED_STATIC_DEFINITION` — `pgmq.create` idempotent):
- `auth_emails`
- `transactional_emails`

DLQs (`VERSIONED_STATIC_DEFINITION`):
- `auth_emails_dlq`
- `transactional_emails_dlq`

RPC wrappers (`VERSIONED_STATIC_DEFINITION`) — all
`SECURITY DEFINER`, `EXECUTE` revoked from `PUBLIC` and granted to
`service_role` only:
- `public.enqueue_email(queue_name TEXT, payload JSONB)` — writes to `auth_emails` / `transactional_emails` (auto-creates queue on error).
- `public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)` — reads batch from queue.
- `public.delete_email(queue_name TEXT, message_id BIGINT)` — deletes message from queue.
- `public.move_to_dlq(source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB)` — moves message from source queue to DLQ.

Cron / outbound (`DYNAMIC_POST_MIGRATION_CONFIGURATION` — declared
as required post-migration steps in the trailing comments of
`20260616204333_email_infra.sql:291-302`; current administrative
state on the backend is `CURRENT_ADMIN_STATE_UNKNOWN`):
- Cron job `process-email-queue` (5-second interval; consumes
  `email_queue_service_role_key` from `vault.secrets`; triggers
  Edge Function `process-email-queue` via `net.http_post` when
  either queue has pending messages).
- Vault secret `email_queue_service_role_key`.
- Outbound mechanism: `net.http_post` targeting the
  `process-email-queue` Edge Function endpoint.

Edge Functions:
- `process-email-queue` — referenced by the versioned migration as
  the outbound target; no `supabase/functions/**` directory exists
  in the repository at HEAD, so the function source is
  `UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` (out-of-tree
  deployment). MOC-01 must reconcile.

Webhooks / operational hooks (versioned):
- `src/routes/api/public/hooks/portal-dlq-retry.ts` — public
  webhook / cron caller for portal DLQ retry (target: portal sync
  DLQ / logs; activation mechanism: external caller or scheduler;
  maintenance control required under MOC-01).

Webhooks / triggers / outbound integrations detailed matrix:

| NAME | TYPE | SOURCE_PATH | TARGET | AUTHENTICATION | TENANT_SCOPE | ACTIVATION_MECHANISM | MAINTENANCE_CONTROL_REQUIRED |
|---|---|---|---|---|---|---|---|
| `process-email-queue` | pg_cron job → `net.http_post` → Edge Function | `supabase/migrations/20260616204333_email_infra.sql` (post-migration comments) | Edge Function `process-email-queue` | vault-stored `service_role` key | not tenant-scoped (global email queue) | pg_cron schedule (5 s) | yes — MOC-01 |
| `enqueue_email` / `read_email_batch` / `delete_email` / `move_to_dlq` | SECURITY DEFINER RPC | `supabase/migrations/20260616204333_email_infra.sql:137-211` | pgmq queues | `service_role` (EXECUTE granted only to `service_role`) | not tenant-scoped at wrapper level | RPC invocation from Edge Function / server code | yes — MOC-01 |
| `portal-dlq-retry` | HTTP public webhook / cron target | `src/routes/api/public/hooks/portal-dlq-retry.ts` | `public.portal_sync_dlq`, `public.portal_sync_logs`, `public.portal_connectors` | webhook signature / cron caller (to be reconfirmed by MOC-01) | tenant derived from DLQ record | external caller or scheduler | yes — MOC-01 |
| Duplicate `email_infra` migrations | file-level duplicate | `supabase/migrations/20260616204333_email_infra.sql` + `supabase/migrations/20260616204617_email_infra.sql` | same objects | n/a | n/a | migration apply order | yes — MOC-01 (replay/idempotency review) |

Duplicate-migration finding:

```
EMAIL_INFRA_MIGRATION_FILES = 2
EMAIL_INFRA_DISTINCT_CONTENT_BLOBS = 1
DUPLICATE_MIGRATION_CONTENT_PRESENT = true
```

Neither file is removed nor corrected by FRP-01. MOC-01 must
evaluate replay impact, idempotency, traceability, need for
documentary reconciliation, and effectively applied backend state.

### FINAL_STAGE_BOUNDARIES

- RRS-01 authority: TanStack Start registration replacement only.
- PTA-01 authority: public tenant authority for `public.leads`,
  `public.form_submissions`, `public.cms_campaign_events` only.
  `bootstrap-admin.ts` is NOT part of PTA-01 implementation scope.
- MOC-01 authority: maintenance switch, cron, queues, webhooks,
  triggers, outbound integrations, operational write blocking.
  MOC-01 may operationally block `bootstrap-admin.ts` during a
  maintenance window but does NOT thereby acquire authority to
  functionally correct its security posture.
- RHV-01 authority: live verification only. RHV-01 must NOT
  correct defects discovered during execution; it must fail closed
  and route findings through finite governance.
- PR-M2 authority: White Label, CMS, Domains & Onboarding —
  without Public Tenant Authority.

---

## STAGE_BOUNDARIES (preserved from principal planning)

### RRS-01 — Registration Runtime Stabilization Replacement
- **Objective:** finite, deterministic solution for TanStack Start
  module augmentation, replacing the rejected Strategy B.
- **Predecessor:** FRP-01 accepted.
- **Deliverables:** single canonical source; explicit treatment of
  rejected artifacts (retention, controlled replacement or
  rollback); deterministic proof across generation, typecheck,
  build and a harness-owned `vite dev` instance; fail-closed
  behavior for partial or unknown footer permutations.
- **Areas affected:** `src/routeTree.gen.ts` generation path;
  `vite.config.ts`; `src/tanstack-start-register.d.ts`;
  `tsconfig.json`; `package.json`; `bun.lock`.
- **Expressly forbidden:** DB/Auth/Storage/cron/RLS/grants/policies
  changes; migrations; runtime feature changes; automatic reuse of
  LSR-02 claims; skipping compiler file-list proof; skipping the
  composite digest.
- **Migrations potentially needed:** none.
- **RLS/grants/policies impact:** none.
- **Tests required:** compiler file-list proof; composite digest of
  `src/routeTree.gen.ts`, canonical source, `vite.config.ts`,
  `package.json`, `bun.lock`; cycles A/B under build + build:dev +
  harness-owned `vite dev`; fail-closed footer-permutation proof.
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
  `public.form_submissions` and `public.cms_campaign_events`.
- **Predecessor:** RRS-01 accepted.
- **Deliverables:** canonical server-side tenant origin per public
  writer; RLS/grants/policies review and, where required, updated
  server functions; fail-closed handling of missing/ambiguous
  tenant; cross-tenant negative tests.
- **Areas affected:**
  `src/routes/api/public/portal-leads.ts`,
  `src/routes/api/public/feeds.$portal.$token.ts`,
  `src/lib/api/forms.functions.ts`,
  `src/lib/api/campaigns.functions.ts`,
  `src/lib/api/leads-crm.functions.ts`,
  `src/lib/api/portals.functions.ts`,
  RLS/grants/policies for the three public tables,
  `src/lib/tenant.server.ts` domain resolution.
  `src/routes/api/public/bootstrap-admin.ts` and
  `src/routes/api/public/hooks/**` are explicitly out of PTA-01
  implementation scope.
- **Expressly forbidden:** client-side tenant authority; header
  authority; path authority; default tenant; ORDER BY / LIMIT 1 /
  heuristic tenant selection; Storage authority delegated to client;
  cron/queue changes; silent absorption of `bootstrap-admin.ts`.
- **Migrations potentially needed:** RLS policies, grants and
  server-side helper functions for the three public tables.
- **Tests required:** cross-tenant negative probes; forged-header /
  forged-payload probes; anonymous writer probes; server-authority
  parity tests.
- **Preliminary DoD:** `SERVER_IS_SOLE_TENANT_AUTHORITY = true`
  proven for each writer; `HEADER_TENANT_AUTHORITY = false`;
  `PATH_TENANT_AUTHORITY = false`;
  `CLIENT_TENANT_AUTHORITY = false`; anonymous writer defects on
  the three tables resolved or explicitly re-classified with
  authorized evidence.
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Successor:** MOC-01.

### MOC-01 — Maintenance & Operational Control Boundary
- **Objective:** deliver a coordinated maintenance and operational
  control boundary across frontend, public pages, server functions,
  Edge Functions, cron, queues, webhooks, triggers, outbound
  integrations and `net.http_post` calls, using the versioned
  inventory in `CURRENT_OPERATIONAL_SURFACE_INVENTORY` as its
  binding entry state.
- **Predecessor:** PTA-01 accepted.
- **Deliverables:** confirmation of the inventoried surfaces,
  their runtime administrative state (currently
  `CURRENT_ADMIN_STATE_UNKNOWN` for cron/vault); controlled
  activation/deactivation mechanism; observability; fail-closed
  behavior for public writer paths during maintenance; reconciled
  treatment of the duplicate `email_infra` migration; operator
  runbook.
- **Expressly forbidden:** unbounded runtime feature changes;
  changes to LSH-01 accepted runtime edits; DB/Auth/Storage
  changes outside the maintenance surface; introduction of
  external Supabase.
- **Tests required:** activation/deactivation probes; write
  denial probes during maintenance; observability probes;
  inventory coverage proof.
- **Prompt budget:** principal 1 · corrective 1 · absolute max 2 ·
  consumed 0.
- **Successor:** RHV-01.

### RHV-01 — Replacement Homologation Verification
- **Objective:** execute live identity, real-session, tenant
  context, impersonation and forged-header probes under the
  Same-Backend Homologation Cell, replacing the failed LSV-02
  outcome.
- **Predecessor:** MOC-01 accepted.
- **Expressly forbidden:** use of real data; removal of RM Prime
  tenant; removal of the 73 `scp0121_*` residue tenants;
  external Supabase as canonical fallback; permanent HG-14
  disablement outside real operation; correction of defects
  discovered during execution (must fail closed and route
  findings through finite governance).
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
- **Successor:** LSV-03.

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
is deferred to MOC-01, informed by
`CURRENT_OPERATIONAL_SURFACE_INVENTORY`. Until MOC-01 is accepted,
no coordinated fail-closed maintenance mode exists for public
writers or outbound integrations.

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
`UNKNOWN — REQUIRES FUTURE AUTHORIZED EVIDENCE` for current
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
1. `git diff --name-only` against the corrective START_HEAD returns
   exactly the two authorized files.
2. `CODE_FILES_CHANGED = 0` and `FILES_OUTSIDE_ALLOWED = 0`.
3. Global search for `cms_campaign_events` and
   `cms_campaign_public_events` reconciled against
   `CAMPAIGN_EVENT_OBJECT_IDENTITY`.
4. No duplicate stage IDs in the roadmap.
5. No conflicting current states.
6. No successor implementation authorization introduced.
7. No terminal stage reopened (LSR-01, LSR-02).
8. No external Supabase introduced as fallback.
9. `scp0121_*` cleanup not planned.
10. PR-M2 title reconciled and does not reopen PTA-01.

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
- `CAMPAIGN_EVENT_SCHEMA_IDENTITY_IS_FACTUAL = true`
- `RUNTIME_AND_SCHEMA_OBJECT_NAMES_RECONCILED = true`
- `PUBLIC_WRITER_AND_READER_MATRIX_COMPLETE = true`
- `CLIENT_CONTROLLED_TENANT_INPUTS_EXPLICIT = true`
- `HEADER_AUTHORITY_RISKS_EXPLICIT = true`
- `PTA01_HAS_SINGLE_CLEAR_AUTHORITY = true`
- `PRM2_DOES_NOT_REOPEN_PTA01 = true`
- `BOOTSTRAP_ADMIN_NOT_SILENTLY_ABSORBED_BY_PTA01 = true`
- `KNOWN_CRON_QUEUES_RPCS_WEBHOOKS_OUTBOUND_INVENTORIED = true`
- `UNKNOWN_USED_ONLY_FOR_NON_VERSIONED_ADMIN_STATE = true`
- `DUPLICATE_MIGRATION_CONTENT_PRESERVED_AS_FINDING = true`
- `LSR01_REMAINS_SUPERSEDED_TERMINAL = true`
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
- `FRP01_STATUS = Ready for Final External Audit`
- `FRP01_PRINCIPAL_CONSUMED = true`
- `FRP01_CORRECTIVE_CONSUMED = true`
- `FRP01_REMAINING_BUDGET = 0/2`
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
- Correction of `bootstrap-admin.ts` functional security posture.
- Removal or correction of the duplicate `email_infra` migration.

## EXTERNAL_DEPENDENCIES
None.

## PROMPT_BUDGET
Principal 1 · corrective 1 · absolute max 2. Consumed: 2
(principal + corrective). Remaining: 0/2.

## TERMINAL_STATES
Accepted · Accepted with Non-Blocking Backlog · Superseded ·
Rejected · Blocked External.

## SUCCESSOR
RRS-01 — Registration Runtime Stabilization Replacement
(`Planned — Blocked by FRP-01`). Not started by this stage.
