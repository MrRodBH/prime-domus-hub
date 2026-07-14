# 121 — PR-PH.0 — Pre-Homologation Product Readiness Impact Analysis

**Status:** Accepted  
**Baseline:** `ba98f2ba41bb5a3dcb8f05b3d2398126982d3ae4`  
**Execution mode:** direct documentary correction through GitHub  
**Runtime modified:** no

## Evidence capsule

```text
STATUS: Accepted
BASELINE: ba98f2ba41bb5a3dcb8f05b3d2398126982d3ae4
BRANCH: agent/pr-ph0-macro-consolidation
FILES_CHANGED: canonical PR-PH.0 analysis; report 121; architectural roadmap
RUNTIME: unchanged
MIGRATIONS: unchanged
RLS_GRANTS: unchanged
DEPENDENCIES: unchanged
DECISION: PR-PH.1–12 and TH-001–006 are historical workstreams, not executable gates
NEW_GATES: PR-M1 → PR-M2 → PR-M3 → TH-M1 → TH-M2
NEXT_GATE: PR-M1 — Workspace Authority & Revenue Operations Finalization
HOMOLOGATION: Blocked until PR-M3 Accepted
PRODUCTION: Blocked until TH-M2 Accepted
```

## Decisive reconciliation

- Removed stale claims that `portal-engine.server.ts` resolves tenant hosts.
- Classified `resolveTenantByHost` as implemented but disconnected and identified the `rm-prime` default as a prohibited runtime fallback.
- Assigned fail-closed public resolution, tenant-safe `site_settings`, white label, CMS, page builder, domains and onboarding to PR-M2.
- Reconciled CRM function names and persisted status semantics.
- Preserved the discarded-leads alternate query and manual service-role write as explicit PR-M1 blockers.
- Replaced generic physical table references with repository-observed names.
- Consolidated twelve Product Readiness stages into PR-M1, PR-M2 and PR-M3.
- Consolidated six homologation stages into TH-M1 and TH-M2.
- Established a compact Lovable evidence capsule and prohibited full chat reports.
- Established one macro execution and one external audit per gate, with no microstages.

## Status

- Phase 4 — Closed / Accepted.
- PR-PH.0 — Accepted.
- PR-M1 — Planned; next executable gate.
- PR-M2 — Planned; blocked by PR-M1.
- PR-M3 — Planned; blocked by PR-M2.
- TH-M1 — Planned; blocked by PR-M3.
- TH-M2 — Planned; blocked by TH-M1.
- Homologation — Blocked until PR-M3 Accepted.
- Production authorization — Blocked until TH-M2 Accepted.
