# PR-M3-FVS5 — Authenticated Operations Read-Only Evidence

## Scope

- Authority: PR-M3-FVS4V.
- Base head: `915978b2658a4de35f13521365c68c148217c140`.
- Base tree: `f9c3bbf6c16831a6cdf38319ec69a4bb50da9086`.
- Branch: `agent/pr-m3-fvs5-authenticated-operations-read-only`.
- Tracking issue: #125.
- Deferred runtime backlog: #116.

## Frozen frontend contract

- The authenticated workspace retains one `WorkspaceShell`, one `Outlet`, `TenantSelectionGate`, and impersonation context.
- The browser consumes only eight existing GET server functions and projects their returned rows into presentation-only read models.
- URL state accepts only `section` and local text query `q`; tenant, role, scope, status, and commands are rejected.
- Contact creation, record changes, alert resolution, exports, uploads, communications, and all optimistic behavior remain unavailable.
- No dependency, provider, database, deployment, production, BCR, or lockfile mutation is included.

## Deterministic states

The implementation has explicit `COMPLETE`, `LOADING`, `EMPTY`, `DENIED`, `UNAVAILABLE`, and `ERROR` states. Failures never promote a successful operation or infer client authority.

## Verification matrix

- Exact twelve-path allowlist and byte-identical `bun.lock`.
- Eight GET-only functions, one complete snapshot, and zero mutation imports or controls.
- Read-model authority-field stripping and strict presentation URL schema.
- Accessible landmarks, names, `aria-live`, focus rings, keyboard navigation, and reduced-motion-safe effects.
- Responsive composition for 375×812, 768×1024, and 1440×900 without horizontal content overflow.
- Focused specs, security specs, typecheck, build, and `verify:release` are mandatory before remote publication.
- PR-M2, WRI-01, Release Gate, and the private Lovable 18-cell visual matrix must be terminally successful before merge.

## Operational boundaries

- `PROVIDER_WRITES=0`
- `DATABASE_WRITES=0`
- `DEPLOY=false`
- `PRODUCTION_CUTOVER=false`
- `LOVABLE_ROADMAP_UPDATE=false`
- `PR_105_MERGE=false`
