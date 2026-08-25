# PR-M3-FVS6 — Authenticated Broker & Team Directory Read-Only Evidence

## Scope

- Authority: PR-M3-FVS5 terminal result / issue #127.
- Base head: `85941758aa5a56641b0ec8941747e8c8958798b5`.
- Base tree: `adabcab3c120d18ed498e336636ab3bb63b4aafe`.
- Branch: `agent/pr-m3-fvs6-authenticated-broker-team-directory-read-only`.
- Tracking issue: #127.
- Deferred BCR backlog: #116.

## Frozen frontend contract

- The authenticated workspace retains exactly one `WorkspaceShell`, one `Outlet`, `TenantSelectionGate`, impersonation context and existing navigation.
- The browser consumes only `adminListarCorretores` and `listTenantTeams`, both existing GET server functions.
- Returned rows are projected into presentation-only read models; `tenant_id`, `user_id`, leader IDs, profile scope/role authority, CPF, raw storage paths and membership arrays are not projected.
- URL presentation state accepts only `q`, `team` and `view`; tenant, role, scope, status and commands are rejected.
- Invitation, editing, file submission, assignment, activation and access changes remain explicitly unavailable.
- No dependency, provider, database, deployment, production, BCR or lockfile mutation is included.

## Deterministic states

The implementation exposes explicit `COMPLETE`, `LOADING`, `EMPTY`, `DENIED`, `UNAVAILABLE` and `ERROR` states. Read failures never simulate success or infer client authority.

## Presentation and accessibility

- Broker cards provide image fallbacks, accessible names, keyboard focus and deterministic selection state.
- Team context is a presentation-only local filter over server-returned relationships and member counts.
- Profile detail is strictly read-only and exposes inaccessible operations as unavailable rather than simulated controls.
- Responsive composition targets 375×812, 768×1024 and 1440×900 with `min-w-0`, adaptive grids and no material horizontal overflow.
- Motion is limited to `motion-safe` effects with `motion-reduce` fallbacks.
- Result counts and profile changes use polite live regions.

## Verification matrix

- Exact twelve-path allowlist and byte-identical `bun.lock`.
- Exactly one WorkspaceShell and one Outlet.
- Exactly two server-owned GET functions consumed by the read-model hook.
- Zero mutation imports, POST calls, uploads, optimistic behavior or provider SDKs in the slice.
- Strict `q`, `team`, `view` search schema with authority-bearing keys rejected.
- Read-model tests prove authority/private field stripping and deterministic filtering.
- FVS5 application/test/evidence contract is byte-identical to the base.
- Focused specs, PRM3-P0A security boundary, typecheck, production build and `verify:release` are mandatory.
- PR-M2, WRI-01 and Release Gate must be successful on the exact PR head.
- Private Lovable visual gate must record `PASS_EXACT_FILES` and 18/18 viewport/state cells before merge.

## Operational boundaries

- `PROVIDER_WRITES=0`
- `DATABASE_WRITES=0`
- `DEPLOY=false`
- `PRODUCTION_CUTOVER=false`
- `LOVABLE_PRODUCTION_PUBLISH=false`
- `LOVABLE_ROADMAP_UPDATE=false` during implementation and visual validation
- `PR_105_MERGE=false`

## Visual gate status

- Private Lovable preview: pending exact-head validation.
- Production publishing: prohibited.
- Roadmap update: only after terminal FVS6 execution under the Owner's explicit instruction dated 2026-08-25.
