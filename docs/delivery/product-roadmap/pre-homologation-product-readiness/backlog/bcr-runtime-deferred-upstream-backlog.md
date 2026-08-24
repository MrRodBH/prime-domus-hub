# BCR Runtime Deferred Upstream — Non-Blocking Backlog

## Classification

```text
BACKLOG_ID=BCR-RUNTIME-UPSTREAM-01
PRIORITY_FOR_PRM3=NON_BLOCKING
PRIORITY_FOR_COMMERCIAL_ACTIVATION=P0_BEFORE_COMMERCIAL_CUTOVER
SOURCE_PR=105
STATE=DEFERRED_UPSTREAM
OWNER_ACTION=NONE
```

## Open work

1. Qualify a stable, exact Wrangler release that supports
   `compatibility_date=2026-07-29` and proves the first request without retry,
   replay or a second GET.
2. Revalidate the upstream ProxyWorker correction using official Cloudflare,
   GitHub and npm evidence.
3. Rebase or reconstruct PR #105 from the then-current `main`; never merge its
   present divergent head.
4. Requalify Stripe SDK, lockfile, adapter, webhook, migrations,
   reconciliation and billing administration as one separately authorized
   commercial-runtime gate.
5. Execute provider/database/deployment proof only under a dedicated bounded
   envelope with rollback and no production cutover.

## Recheck triggers

- a new stable Wrangler release after `4.125.0`;
- merge and publication of an official no-retry ProxyWorker correction;
- scheduling of commercial activation or billing UI implementation;
- preparation of the release candidate before homologation.

## PR-M3 boundary

PR-M3 may use only the provider-agnostic commercial contracts already on
`main`. Checkout, portal, invoice, provider diagnostics and billing mutations
must remain explicitly unavailable. Frontend construction does not close this
backlog and this backlog does not block frontend construction.
