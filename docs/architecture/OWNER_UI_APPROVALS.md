# Owner UI approvals — durable continuity

## Approval recorded 2026-09-08, Round56
Owner explicitly requested restoration of the approved lateral Super Admin menu, direct visible management entries, and documentation so future publications do not redesign it.

Approved reference: SaaS navigation in `src/components/demo/interactive/EmptyDemoWorkspace.tsx` (presentation reference only), and the owner instructions in Rounds49/53/56. Earlier implementation decisions in Rounds53/54 did not constitute owner approval of their changed navigation.

- Sidebar: dark petroleum #113b42, 272px expanded on desktop; visible text entries Dashboard, Tenants, Planos, Financeiro, Consumo, Observabilidade, DLQ, Suporte, in that order.
- Global management entries are direct siblings, not horizontal tabs or nested under Dashboard/Controle da plataforma. Mobile may use the existing drawer, with the same direct entries.
- Palette/surfaces: #f6f4ef, #fbfaf7 and #123f47. Existing Inter Tight and Cormorant Garamond font tokens; preserve the approved Recharts library and graph colors.
- Restore visibility without removing server role checks or explicit tenant selection. Global entries never implicitly choose a tenant.
- Plans and tenant data remain persistent; demonstration state is never operational storage. Missing backend features must have an explicit unavailable state, not fabricated metrics.
- Functional corrections, API integrations and deployments do not authorize a theme or navigation redesign. The latest explicit owner instruction takes precedence when it requests a specific change.

Cause of regression: Round53 applied palette to the legacy authenticated shell while retaining horizontal ContextTabs. Round54 reduced the global sidebar to one Dashboard link to avoid tenant-required route errors. That functional workaround violated the approved information architecture. Round56 restores direct global entries without undoing the tenant guard.

Verification: run-round-56-approved-navigation-specs.mjs and controlled DOM, plus prior applicable release tests. These prove navigation structure and behavior, not pixel-perfect browser acceptance. No claim of permanent cross-chat memory: this file and root AGENTS.md provide repository-backed instructions for subsequent work.

#229 support pending; #231 unmerged/undeployed; Round45 backlog; LSR02 Rejected — Terminal budget 0/2 remain unchanged.

Historical regression evolution: operational-context count is scoped to the unchanged CONTEXTS array (seven), not the separate global sidebar entries. Prior terminology restrictions remain on the operational surface; the owner-approved Tenants/DLQ labels in SUPER_NAVIGATION are checked by the exact eight-entry test. No permission or runtime gate is removed.

## Superseding owner decision — Round57
Super Admin must never enter a tenant workspace or impersonate a tenant. Former explicit-impersonation allowances are superseded. Tenant operations require a separate authorized tenant identity. Global administration retains company/plan management and aggregate operational metrics; company corrections follow owner-authorized support. Technical tenants remain in the database but must be excluded by explicit database classification before lists and aggregates. RM Prime Imóveis is a definitive real customer, never a synthetic fixture. Sidebar/header remain visible with independent content scrolling. Historical PCA-15R/backlogs are in scope only when direct prerequisites of this interface. Every owner-facing final response must end with an executable continuation instruction in a copyable prompt box.

## Owner clarification — Round58 (2026-09-08)
Zero plans and incomplete company data are the expected starting state, not missing owner input or proof of data loss. The owner will create real plans and complete the existing company through the working UI. Do not request commercial values as a prerequisite for delivering the interface or seed demonstration values.
The three previously identified non-Super tenant administrators were historical test accounts, not suggested operators. Their exact authorized accounts were removed; the real tenant and owner remain. Super Admin administers account deletion globally for every role, including Super Admin, without entering a tenant, implicit impersonation or assumed ownership transfer. Surface genuine provider/dependency failures; do not delete tenant business records to bypass referential integrity. Global user management is available on the SaaS dashboard; the eight approved sidebar entries retain their order and presentation.
A role or permission found in old code is implementation history, not evidence that the owner approved it. Global platform diagnostics/configuration must remain usable separately from the prohibition of tenant business operations.

## Owner clarification — Round59 (2026-09-08)
Super Admin CRUD is restricted to platform SaaS resources and platform accounts. It must not list, read, edit or delete tenant users. Tenant Admin CRUD stays inside its own tenant. Round58 Auth-wide listing/deletion was an incorrect interpretation and is superseded. Explicit platform role plus absence of any tenant membership/ownership is the current conservative account boundary; mixed and unclassified identities are excluded, never silently reclassified or transferred. The current Super Admin/tenant-owner identity may administer the platform but cannot manage its tenant-linked account through global account CRUD. Formal owner/team testing with a second tenant is a future step, not completed evidence. Do not update the roadmap without a new explicit owner authorization. Do not create plans or company data; those are entered by the owner through the platform.

## Owner request — website, domains and customer service (2026-09-10)
The owner confirmed a saved tenant and plan, then requested access to the documented website/CMS/domain functions and clarified that Super Admin support must serve customers. The eight global entries and their order remain; “Suporte” is clarified to “Atendimento aos clientes”. Global provider configuration is linked from the dashboard; tenant Domains is linked under Content, team access under Administration. These links do not change server authority. The website entry guides users to existing versioned editors and domain verification without inventing completion or creating commercial content. No new Super Admin is a prerequisite; the current Super Admin remains prohibited from tenant operation. Operational identity changes still require an explicit identity decision and are not performed by navigation changes.
