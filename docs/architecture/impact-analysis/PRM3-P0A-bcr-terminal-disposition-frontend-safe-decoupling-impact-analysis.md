# PRM3-P0A — BCR Terminal Disposition and Frontend-Safe Decoupling

## Decision

```text
STAGE=PRM3-P0A
PRIORITY=0
BASE_MAIN=7a63501d8544228d9303952b05923d783ddd5062
BASE_TREE=a176a619fede111510745459122cd11954690750
BCR_PR=105
BCR_HEAD=47084f55a6fb9277b8dd9e95b6b53671621f39a0
BCR_P8EL_R2=TERMINAL_FAIL_CLOSED_UPSTREAM_TIMEOUT
BCR_P8EL_R3=FAIL_CLOSED_NEW_SCOPE
BCR_RUNTIME=BCR_RUNTIME_DEFERRED_UPSTREAM
PR_105_MERGE=false
PRM3_ENTRY=AUTHORIZED_AFTER_THIS_GATE
LOVABLE_ROADMAP_UPDATE=false
```

The BCR terminal evidence is accepted as an upstream-bounded result. It does
not establish a safe Wrangler/ProxyWorker first-request proof and therefore
does not authorize merging PR #105. It also does not require the product UX
roadmap to remain idle: the frontend can be built against the provider-agnostic
commercial contracts already present on `main`.

## Repository evidence

`main` already contains the frontend-safe commercial boundary:

- `src/lib/api/commercial/read-models.ts` exposes sanitized tenant commercial,
  entitlement and billing-health DTOs without provider secrets or raw payloads;
- `src/lib/api/commercial/commercial.functions.ts` exposes server functions
  behind `requireTenant`;
- `src/lib/api/commercial/feature-catalog.ts` contains a closed,
  provider-independent feature catalog;
- `src/lib/api/commercial/feature-gate.ts` makes deterministic server-side
  allow/deny decisions;
- seat-limit contracts and membership mutation enforcement remain server-owned.

PR #105 is a separate provider-runtime implementation. Its delta adds the
Stripe SDK, billing adapter, webhook, internal billing routes, migrations,
runtime configuration and an operational billing UI. None of those artifacts
is required to begin the final product UX refactor, and none may be copied into
PR-M3.

## Dependency classification

| Dependency | Classification | PR-M3 rule |
|---|---|---|
| Commercial summary, plan and subscription status | available on `main` | consume sanitized server function only |
| Entitlement snapshot and feature decisions | available on `main` | client adapts UX; server remains authority |
| Seat limits and membership enforcement | available on `main` | preserve fail-closed server contract |
| Provider checkout, portal and invoice operations | BCR runtime deferred | unavailable state; no simulated success |
| Stripe adapter and signed webhook | BCR runtime deferred | prohibited in PR-M3 |
| BCR migrations and reconciliation jobs | BCR runtime deferred | prohibited in PR-M3 |
| PR #105 billing administration UI | BCR-coupled surface | do not copy; redesign only after runtime acceptance |

No provider-agnostic source extraction from PR #105 is required.

## Frontend contract freeze

```text
CLIENT_TENANT_AUTHORITY=false
CLIENT_PLAN_AUTHORITY=false
CLIENT_ENTITLEMENT_AUTHORITY=false
CLIENT_PRICE_AUTHORITY=false
CLIENT_PROVIDER_AUTHORITY=false
SERVER_READ_MODELS_REQUIRED=true
SERVER_FEATURE_GATE_REQUIRED=true
PROVIDER_SDK_IN_FRONTEND=false
BCR_UI_COPY_FROM_PR105=false
FRONTEND_CONTRACT_REGRESSION=0
```

Every PR-M3 surface must represent `loading`, `empty`, `denied`, `unavailable`
and `error` deterministically. A deferred billing action remains explicitly
unavailable; it is never hidden as an accidental omission and never reported
as successful.

## Risks and controls

| Risk | Control |
|---|---|
| UI grants a paid feature | server feature decision remains authoritative |
| UI assumes Stripe availability | provider actions remain unavailable until BCR runtime acceptance |
| PR #105 code contaminates frontend | deterministic gate rejects billing, Stripe, webhook and migration materialization |
| Historical roadmap text re-blocks PR-M3 | current P0 authority supersedes historical status snapshots |
| Upstream Wrangler remains unresolved | tracked as non-blocking commercial backlog with an explicit recheck trigger |

## Terminal decision

PRM3-P0A accepts the BCR terminal result as `Accepted with Non-Blocking
Backlog` for roadmap sequencing only. It does not accept the BCR runtime, merge
PR #105, execute a provider call, mutate the database, deploy or cut over
production. PR-M3 may start from the audited `main` after this gate is merged.
