# PRM3-P0A — Frontend Entry Execution Envelope

## Authority

```text
EXECUTION_MODE=end-to-end
PRIORITY=0
BASE_MAIN=7a63501d8544228d9303952b05923d783ddd5062
BCR_RUNTIME=BCR_RUNTIME_DEFERRED_UPSTREAM
PR_105_MERGE=false
PROVIDER_WRITES=0
DATABASE_WRITES=0
DEPLOY=false
PRODUCTION_CUTOVER=false
LOVABLE_ROADMAP_UPDATE=false
```

## Accepted frontend authority

PR-M3 builds final presentation and operational UX over the accepted contracts
already present on `main`. The client may render sanitized state and submit
intents to server-owned functions, but it may not establish tenant, plan,
entitlement, limit, price, payment or provider identity.

The first PR-M3 slice must follow the existing mandatory order and own design
tokens, theme, spacing, typography, application shell and reusable UI states
before broad route-by-route redesign.

## Deferred commercial runtime

The following remain outside PR-M3 until a separate BCR recovery gate accepts
them:

- Stripe SDK and adapter;
- checkout, invoice and customer-portal mutations;
- signed billing webhook;
- BCR migrations, reconciliation and provider diagnostics;
- the PR #105 billing administration route;
- Wrangler/ProxyWorker first-request corrective proof.

Frontend affordances that depend on those capabilities must use an explicit
`unavailable` state. Retry, fake success, client-side entitlement inference and
provider calls are prohibited.

## Gate and rollback

The deterministic PRM3-P0A runner must prove:

1. provider-agnostic commercial contracts exist on `main`;
2. every commercial server function remains behind `requireTenant`;
3. the static catalog rejects provider and billing-runtime namespaces;
4. Stripe is absent from `main` dependencies;
5. PR #105 billing/runtime files are absent from `main`;
6. terminal evidence and non-blocking backlog are versioned;
7. PR-M3 is marked ready by the current roadmap authority;
8. Lovable roadmap mutation is not authorized by this gate.

If a gate fails before merge, correct it within the frozen allowlist. If the
failure cannot be corrected without runtime/provider scope, revert the single
commit and preserve PR-M3 entry through the provider-agnostic facade strategy.
No failed head may be merged.

## Successor

```text
NEXT_GATE=PR-M3_FRONTEND_CONSTRUCTION_FIRST_VERTICAL_SLICE
FIRST_SLICE=DESIGN_TOKENS_APP_SHELL_AND_DETERMINISTIC_UI_STATES
OWNER_ACTION_AFTER_EXECUTION=NONE
```
