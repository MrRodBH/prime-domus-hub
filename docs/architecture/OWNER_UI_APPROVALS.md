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
