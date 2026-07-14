# PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Accepted  
**Namespace:** Product Roadmap · Pre-Homologation Product Readiness  
**Baseline repository inspected:** `ba98f2ba41bb5a3dcb8f05b3d2398126982d3ae4`  
**Correction mode:** direct repository-grounded documentary consolidation  
**Runtime changes in PR-PH.0:** none

---

## 1. Decision

PR-PH.0 is accepted as the canonical planning and evidence gate between the closed SaaS Commercial Platform phase and product implementation for homologation.

The former execution sequence of twelve PR-PH stages and six TH stages is no longer an executable chain. Those identifiers remain only as historical workstream traceability. Execution is consolidated into five macrogates:

1. **PR-M1 — Workspace Authority & Revenue Operations Finalization**;
2. **PR-M2 — Public Tenant Authority, White Label, CMS, Domains & Onboarding Finalization**;
3. **PR-M3 — Product Quality, Operational Readiness & Closing Review**;
4. **TH-M1 — Homologation Provisioning & Full Validation**;
5. **TH-M2 — Defect Resolution, Regression & Production Gate**.

Binding sequence:

```text
PR-PH.0 Accepted
  → PR-M1
  → PR-M2
  → PR-M3
  → TH-M1
  → TH-M2
  → Production authorization decision
```

No PR-PH.x, TH-xxx or macro-internal workstream may create a separately approved substage, patch stage or documentation-only gate.

---

## 2. Scope of this analysis

This artifact:

- locks the current repository evidence required for implementation;
- removes contradictory and stale planning statements;
- establishes one authority and one cutover owner for each product domain;
- consolidates all remaining implementation into five macro executions;
- defines deterministic gates, tests, evidence and reporting requirements;
- preserves permanent architectural invariants;
- does not modify application runtime, schema, migrations, RLS, grants, dependencies or generated files.

---

## 3. Permanent architectural invariants

Every macro execution shall preserve all of the following:

1. The client is never an authority.
2. The server is the single authority for tenant, authorization and commercial decisions.
3. `x-tenant-id` is transport only.
4. No implicit tenant, default tenant, fallback tenant, heuristic or `LIMIT 1` authority is permitted.
5. Unknown, ambiguous or unauthorized tenant resolution fails closed.
6. Super Admin accesses tenant-scoped resources only under explicit server-validated impersonation.
7. Membership authorization, `tenant_role`, global `app_role`, RBAC and commercial entitlement are separate domains.
8. `tenant_role` is not broad functional or commercial authorization.
9. Commercial entitlement never replaces membership authorization.
10. RLS cannot be relaxed to compensate for missing application boundaries.
11. Direct client reads of protected commercial or tenant-scoped authorities remain prohibited.
12. No dual path, compatibility fallback or competing runtime authority may survive a cutover.
13. Storage paths supplied by the client are not trusted authorities.
14. Signed URLs are not primary authorization.
15. Cardinality is explicit: zero, one and N are handled deterministically.
16. Runtime claims require direct repository or executable evidence.

---

## 4. Repository evidence lock

### 4.1 CRM and Kanban

Observed authorities:

- `/admin/pipeline` renders `PipelinePage` and is the current connected operational CRM surface.
- `/admin/leads-workspace` renders an independent `EntityWorkspace` lead surface and is a concurrent candidate authority.
- `/admin/leads` is a compatibility redirect to `/admin/pipeline`; it is not a third functional authority.
- `adminListarLeads`, `adminAtualizarLead` and `criarLeadManual` live in `src/lib/api/admin.functions.ts`.
- `descartarLead`, `perderLead`, `listarLeadsDescartados` and `reabrirLead` live in `src/lib/api/leads-crm.functions.ts`.

Canonical status semantics:

```text
novo → conversando → visita → proposta → ganho | perdido
                                      ↘ descartado
```

Exact persisted values:

```text
novo
conversando
visita
proposta
ganho
perdido
descartado
```

Rules:

- `ganho` is the positive commercial result.
- `perdido` is a negative commercial result and the database trigger requires the prior state `proposta`.
- `descartado` is operational removal with a mandatory reason and history in `lead_descartes`.
- `descartarLead` does not write `descartado_at` in TypeScript; `tg_leads_enforce_status_flow` sets it in the database.
- `reabrirLead` resets to `novo`; it does not restore a previous status.
- `fechado` and `arquivado` are not distinct observed persisted lead states.
- `listarLeadsDescartados` contains an existing alternate SELECT fallback after query failure. This violates the permanent no-fallback invariant and must be removed in PR-M1.
- `criarLeadManual` writes with `supabaseAdmin`. PR-M1 must prove deterministic server-derived `tenant_id` before the service-role insert or replace the write boundary.

PR-M1 owns the single CRM authority decision, cutover, fallback removal, authorization enforcement, stage history, concurrency behavior and tests.

### 4.2 Dashboard

Observed dashboard authority:

- route: `src/routes/_authenticated.admin.index.tsx`;
- server boundary: `src/lib/api/dashboard.functions.ts`;
- sales and VGV are based on `status = 'ganho'`;
- pipeline and dashboard alert thresholds currently diverge;
- role scoping is implemented through global role checks and lead ownership filters, but requires reconciliation with the accepted authorization matrix produced in PR-M1;
- KPI formulas, timezone boundaries, empty states, drill-down and deterministic tests are incomplete.

Dashboard finalization occurs only after CRM authority and authorization are accepted inside PR-M1.

### 4.3 Authorization authorities

The following domains are separate and must never be merged implicitly:

| Domain | Current authority | Required treatment |
|---|---|---|
| Tenant membership eligibility | `membership_status` and tenant middleware | only `active` participates in tenant operation |
| Tenant classification | `tenant_role` | classification only; not broad authorization |
| Global functional roles | `user_roles`, `app_role`, `has_role` | inventory and reduce to explicit operation rules |
| Fine-grained CMS/RBAC | `rbac_*`, `has_permission`, `has_cms_permission` | retain explicit action and scope contracts |
| Commercial availability | commercial feature and limit boundaries | never substitutes membership authorization |
| Super Admin | `is_super_admin` plus explicit impersonation | no tenant-scoped bypass without impersonation |

Persisted domains observed:

```text
membership_status: active | invited | suspended | revoked
tenant_role: owner | admin | manager | broker | captador | secretaria | viewer
```

PR-M1 must produce one accepted operation-level authorization matrix and apply it to the workspace, CRM and dashboard. Generic values such as `admin/owner`, `tenant-scoped`, `RLS ✓`, `has_role` or “audited” are not valid evidence by themselves.

### 4.4 Public tenant resolution

`src/lib/portal-engine.server.ts` is an outbound real-estate portal connector engine. It is not and must not become a host resolver.

The observed public tenant helpers are in `src/lib/tenant.server.ts`:

- `resolveTenantByHost(host)`;
- `publicSupabaseForTenant(tenantId)`.

Current defects:

1. the root public loader does not obtain and pass the request host into the tenant resolution chain;
2. `obterSiteSettings()` calls `publicClient()` without tenant transport;
3. `publicSupabaseForTenant()` is not connected to the public settings call chain;
4. `resolveTenantByHost()` contains `FALLBACK_TENANT_SLUG = 'rm-prime'` and returns that tenant when no host authority is resolved;
5. the default tenant behavior violates fail-closed, no-fallback and no-heuristics rules;
6. public RLS behavior must be tested with a valid server-derived `x-tenant-id`, an unknown host and cross-tenant fixtures.

Binding decision:

- unknown hosts return no tenant authority and fail closed;
- local development and preview hosts require explicit environment configuration or a separately validated development-only mapping, never a production implicit tenant;
- PR-M2 owns removal of the runtime default, connection of `host → tenantId → public Supabase context → site_settings`, and negative isolation tests;
- PR-M2 creates one public resolution authority consumed by website rendering, branding and custom-domain lifecycle;
- no second resolver is permitted.

### 4.5 White label and public CMS

Current persistence authorities include:

```text
site_settings
site_settings_versions
cms_pages
blog_posts
cms_forms
cms_campaigns
media_library
media_usage
```

The names `pages`, `posts`, `forms`, `campaigns`, `media`, `discard_reasons` and wildcard objects such as `site_settings*` are not valid physical table evidence.

`buildBrandingCss` is currently a local, non-exported function in `src/routes/__root.tsx`. PR-M2 may connect tenant-safe settings to rendering. PR-M3 owns final extraction or test-boundary treatment required for deterministic UX and accessibility tests.

The page-builder block catalog observed is:

```text
hero
richtext
image
gallery
video
cta
form
features
faq
spacer
```

Schema, editor and public renderer parity exists for these types, but dedicated block tests are missing. `richtext`, `video.embed_url` and `cta.botao_href` require formal sanitization or allowlists before homologation.

### 4.6 Custom domains

Custom-domain lifecycle is distinct from host resolution.

PR-M2 may introduce `tenant_domains` only after an impact decision and must provide:

- global uniqueness and anti-takeover controls;
- ownership verification by DNS/TXT;
- deterministic state machine;
- canonical and redirect behavior;
- SSL/provisioning integration boundary;
- suspension and removal behavior;
- tenant-scoped RLS and server-only mutation boundaries;
- audit events and negative takeover tests.

The lifecycle consumes the single public resolver implemented in the same macro. It does not create another resolver.

### 4.7 Onboarding and configuration

A unified onboarding and configuration center is not currently authoritative. Configuration is distributed across multiple admin surfaces.

PR-M2 owns a single configuration experience after tenant resolution, authorization, white label, CMS and domain boundaries are established. Tenant selection and Super Admin impersonation must remain separate from onboarding state.

### 4.8 Test tooling and operational evidence

Current documentation mentions commands that are not fully reproducible from pinned repository dependencies. Before a macro depends on a harness, the macro must pin and document it.

Known requirements:

- `tsx` executor must be pinned or replaced by a repository script using pinned tooling;
- Python Playwright must have a versioned dependency manifest and installation command;
- the E2E base environment variable is `QA_BASE_URL`;
- accessibility tooling must be selected, pinned and invoked by a repository script;
- Vitest or any equivalent unit runner must be pinned and scripted before being a gate;
- command, exit code, pass/fail/skip counts and skip justification must be captured;
- remote migration, RLS, grant, backup and restore state cannot be inferred from repository files alone.

---

## 5. Macro execution model

### 5.1 Permanent execution rule

Each macro is one execution and one external audit gate. Internal workstreams are not stages and do not receive independent statuses.

Every macro prompt must include, in the same execution:

```text
preflight
repository inspection
impact decisions
implementation
migrations/RLS/grants when required
runtime cutover
positive tests
negative tests
boundary tests
cleanup fail-closed
documentation reconciliation
roadmap reconciliation
minimal evidence capsule
Ready for External Audit
```

Prohibited outcomes:

- creating `PR-M1.1`, `PR-M2.1`, `TH-M1.1` or equivalent;
- postponing an ordinary implementation defect to a new stage;
- creating a stage only to change status, documentation or roadmap wording;
- retaining old and new authorities simultaneously without a bounded deprecation contract;
- producing a full repository dump in the chat report.

A macro may stop only for a real external blocker: unavailable credential, destructive decision requiring owner authorization, inaccessible provider, missing product decision or unsafe architectural conflict.

---

## 6. PR-M1 — Workspace Authority & Revenue Operations Finalization

**Absorbed historical workstreams:** PR-PH.1, PR-PH.2, PR-PH.3, PR-PH.4.

### 6.1 Objective

Deliver one canonical tenant workspace, one operation-level authorization model, one CRM/Kanban authority and one role-aware decision dashboard.

### 6.2 Mandatory execution order

1. inventory and canonicalize workspace routes, navigation, labels, redirects and aliases;
2. define and apply the operation-level authorization matrix;
3. prove membership, role, RBAC, entitlement and impersonation separation;
4. select the single CRM surface and execute the functional cutover;
5. remove the discarded-leads fallback and every surviving CRM dual path;
6. prove deterministic tenant derivation for service-role writes;
7. implement stage history, concurrency behavior and rollback rules;
8. canonicalize alert thresholds and server-side formulas;
9. finalize the role-aware dashboard over the accepted CRM authority;
10. execute unit, integration, E2E, security and negative-authorization tests;
11. reconcile documentation and roadmap.

### 6.3 Hard gates

- one canonical route per function;
- one CRM authority;
- no runtime fallback or dual path;
- no client-derived authorization;
- no service-role write without deterministic tenant provenance;
- every protected operation has explicit membership and functional authorization evidence;
- Super Admin tenant-scoped behavior is tested only through explicit impersonation;
- every KPI has source, formula, role scope, timezone and deterministic test;
- all test tooling used by the macro is pinned.

### 6.4 Definition of Done

PR-M1 is complete only when workspace, authorization, CRM, Kanban and dashboard are connected, tested and accepted together. The historical PR-PH.1–PR-PH.4 workstreams are then marked absorbed/completed, not individually accepted as execution gates.

---

## 7. PR-M2 — Public Tenant Authority, White Label, CMS, Domains & Onboarding Finalization

**Absorbed historical workstreams:** PR-PH.5, PR-PH.6, PR-PH.7, PR-PH.8, PR-PH.9.

### 7.1 Objective

Deliver one fail-closed public tenant authority and complete tenant-safe white label, public website, CMS, page builder, landing pages, custom-domain lifecycle, onboarding and configuration center.

### 7.2 Mandatory execution order

1. remove the `rm-prime` runtime default and every implicit tenant fallback;
2. connect request host to the single server-side public tenant resolver;
3. connect resolved tenant context to public Supabase reads;
4. prove `site_settings` tenant isolation with positive, unknown-host and cross-tenant tests;
5. consolidate workspace and public branding authority without overlapping fields;
6. formalize public navigation, menus, SEO, sitemap, robots, preview, publish, versions and scheduling;
7. sanitize and test all page-builder blocks;
8. implement landing-page templates, forms, UTM/origin/campaign capture, consent and thank-you behavior;
9. implement custom-domain lifecycle consuming the same resolver;
10. implement onboarding and a unified configuration center;
11. execute security, XSS, domain takeover, RLS and tenant-isolation tests;
12. reconcile documentation and roadmap.

### 7.3 Hard gates

- unknown host fails closed;
- no production default tenant;
- one host-resolution authority;
- no public read without server-derived tenant transport;
- one authority per branding field;
- no unsanitized rich HTML or unrestricted embed/href input;
- no custom-domain takeover path;
- no client-side domain verification authority;
- no onboarding/impersonation state conflation;
- all test tooling used by the macro is pinned.

### 7.4 Definition of Done

PR-M2 is complete only when multiple hosts deterministically render isolated tenant data and branding, CMS and landing flows are safe, domains are lifecycle-managed, and onboarding/configuration operate through the accepted authorities. Historical PR-PH.5–PR-PH.9 are then marked absorbed/completed.

---

## 8. PR-M3 — Product Quality, Operational Readiness & Closing Review

**Absorbed historical workstreams:** PR-PH.10, PR-PH.11, PR-PH.12.

### 8.1 Objective

Complete product-wide UX consistency, accessibility, responsive behavior, environment readiness, observability, operational procedures and the final pre-homologation closing review.

### 8.2 Mandatory execution order

1. reconcile design tokens, themes, spacing, typography and component states;
2. validate responsive behavior across critical routes and supported viewports;
3. meet WCAG AA requirements for contrast, keyboard, focus, semantics and forms;
4. select and pin accessibility and visual test tooling;
5. validate environment variables, secrets, build and deployment configuration;
6. implement or validate health checks, structured logs, error reporting, tracing and alerts;
7. validate rate limits, cron jobs, webhooks, e-mail, WhatsApp and analytics boundaries;
8. version runbooks for incident response, rollback, support and tenant operations;
9. execute backup and restore evidence in the target environment;
10. validate LGPD retention, export, deletion and unsubscribe procedures;
11. reexecute every critical suite from PR-M1 and PR-M2;
12. perform one closing review and issue the Product Readiness decision.

### 8.3 Hard gates

- no critical route fails responsive or keyboard operation;
- no unresolved critical/high accessibility defect;
- no unpinned test harness used as evidence;
- no missing environment or secret classified as production-required;
- migration, RLS and grants verified against the target environment;
- backup and restore evidence exists;
- rollback and incident runbooks are executable;
- all critical suites are reexecuted, with no silent skips;
- PR-M3 itself contains the closing review; no separate PR-PH.12 execution is created.

### 8.4 Definition of Done

PR-M3 is Accepted only when the product is formally authorized to enter homologation. Historical PR-PH.10–PR-PH.12 are then marked absorbed/completed.

---

## 9. TH-M1 — Homologation Provisioning & Full Validation

**Absorbed historical workstreams:** TH-001, TH-002, TH-003, TH-004.

One execution shall:

1. validate the test plan and acceptance criteria;
2. provision or verify the homologation environment;
3. validate environment parity and data-isolation fixtures;
4. execute general automated and manual validation;
5. execute pilot-tenant homologation;
6. record defects with severity, evidence and owner;
7. establish the regression baseline.

TH-M1 does not create a separate report per suite or pilot cycle.

---

## 10. TH-M2 — Defect Resolution, Regression & Production Gate

**Absorbed historical workstreams:** TH-005, TH-006.

One execution shall:

1. correct all release-blocking defects;
2. execute complete regression;
3. repeat tenant-isolation and security validation;
4. validate critical performance and availability behavior;
5. validate observability, incident and rollback paths;
6. reconcile residual risk;
7. execute the Production Readiness Review;
8. issue the final production authorization decision.

No production release is authorized before TH-M2 Accepted.

---

## 11. Minimal Lovable evidence protocol

The Lovable chat response for a macro shall be a compact capsule, normally no more than 15–20 lines:

```text
STATUS:
BASELINE:
HEAD:
COMMITS:
FILES_CHANGED:
MIGRATIONS:
TYPECHECK:
TESTS:
SECURITY:
RLS_GRANTS:
ENVIRONMENT:
BLOCKERS:
KNOWN_LIMITATIONS:
ROADMAP_STATUS:
```

Prohibited chat output:

- full file contents;
- complete diffs;
- prompt repetition;
- file-by-file implementation narrative;
- large code excerpts;
- repository inventories already inspectable through GitHub.

Long-form technical evidence, when necessary, must be versioned in the repository. The external audit uses GitHub as its primary source.

---

## 12. External audit response protocol

External audit responses shall contain only:

1. synthesis;
2. verdict;
3. decisive blockers, if any;
4. next instruction.

If a macro is not approved, there may be at most one consolidated corrective execution. No micro-patch sequence is permitted.

---

## 13. Historical identifier mapping

| Historical identifier | New status | Executable owner |
|---|---|---|
| PR-PH.1–PR-PH.4 | absorbed workstreams; not independent gates | PR-M1 |
| PR-PH.5–PR-PH.9 | absorbed workstreams; not independent gates | PR-M2 |
| PR-PH.10–PR-PH.12 | absorbed workstreams; not independent gates | PR-M3 |
| TH-001–TH-004 | absorbed workstreams; not independent gates | TH-M1 |
| TH-005–TH-006 | absorbed workstreams; not independent gates | TH-M2 |

The historical identifiers remain searchable in commits and delivery records. They shall not be reused as executable prompts.

---

## 14. Current release blockers

The following are implementation blockers, not PR-PH.0 documentary blockers:

- concurrent CRM authorities;
- discarded-leads alternate query fallback;
- unproven tenant provenance in service-role manual lead creation;
- divergent CRM/dashboard alert thresholds;
- public host resolver disconnected from the rendering chain;
- unsafe `rm-prime` default tenant fallback;
- public settings flow not yet proven tenant-safe;
- page-builder sanitization and dedicated tests missing;
- custom-domain lifecycle absent;
- onboarding/configuration authority fragmented;
- test executors and accessibility tooling not fully pinned;
- remote migration, RLS, grants, backup and restore evidence pending.

These blockers are fully owned by PR-M1, PR-M2 and PR-M3 as defined above. They do not justify new planning stages.

---

## 15. PR-PH.0 closing decision

PR-PH.0 is **Accepted** because:

- the repository evidence required for execution is explicitly classified;
- false host-resolution and CRM claims are removed;
- the unsafe tenant fallback is identified as a mandatory runtime correction;
- physical table names and authority domains are reconciled;
- public host resolution and custom-domain lifecycle have distinct ownership;
- the twelve PR-PH and six TH stages are replaced by five executable macrogates;
- report and audit output are constrained to a minimal evidence protocol;
- no application runtime was changed by this documentary gate.

**Next executable gate:** PR-M1 — Workspace Authority & Revenue Operations Finalization.
