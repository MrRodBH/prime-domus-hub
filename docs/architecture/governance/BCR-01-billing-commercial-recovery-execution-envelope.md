# BCR-01 — Billing Commercial Recovery Execution Envelope

## Status

**Frozen proposal — becomes executable only after protected merge and successful post-merge Release Gate**

```text
STAGE_ID = BCR-01
OBJECTIVE = restore GitHub/Same-Backend billing parity and complete test-mode commercial activation
PREDECESSOR = BCA-01 / Rejected
AUDITED_BASELINE_MAIN = ed844dc664ad2b7ea100bf544ea7cf21ab8946d2
COMPLEXITY_CLASS = L
LOVABLE_MAX_MATERIALIZED_PACKETS = 6
LOVABLE_MAX_CORRECTIVE_PACKETS = 3
SUCCESSOR = PR-M3
```

---

## 1. Frozen objective

Recover from the terminally Rejected BCA-01 without reopening it, preserve the already-applied managed migration as historical fact, restore repository/database parity through forward-only change, and deliver one provider-agnostic server-authoritative Stripe test-mode billing path sufficient to unblock PR-M3.

No live billing, real money or production cutover is authorized.

---

## 2. Preconditions

Before implementation packet execution:

```text
MAIN = exact post-planning merge SHA
PLANNING_PR = merged
PLANNING_POST_MERGE_RELEASE_GATE = success
BCA01_TERMINAL_STATE = Rejected
MANAGED_MIGRATION_20260812192006 = present
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
STRIPE_PROVIDER_MODE = test
```

Any factual mismatch stops implementation and requires audit.

---

## 3. Global invariants

```text
SERVER_IS_SOLE_TENANT_AUTHORITY = true
CLIENT_TENANT_AUTHORITY = false
PROVIDER_METADATA_TENANT_AUTHORITY = false
HEADER_TENANT_AUTHORITY = false
FAIL_FAST = true
FAIL_CLOSED = true
NO_HEURISTIC_MAPPING = true
NO_DEFAULT_PROVIDER = true
NO_ORDER_BY_LIMIT_1_AUTHORITY = true
SUPER_ADMIN_WITHOUT_EXPLICIT_BOUNDARY_TENANT_MUTATION = prohibited
SAME_BACKEND_HOMOLOGATION_CELL = binding
EXTERNAL_SUPABASE_FALLBACK = prohibited
DUAL_BILLING_RUNTIME_PATH = prohibited
```

---

## 4. Global FILES_ALLOWED

The implementation stage may change only the following paths unless an exact generated-file allowance is triggered by an authorized build:

```text
package.json
bun.lock
supabase/migrations/20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a.sql
supabase/migrations/20260812*_bcr_01_*.sql
src/integrations/supabase/types.ts
src/lib/billing/**
src/routes/api/internal/billing-*.ts
src/routes/api/public/hooks/billing-stripe-webhook.ts
src/routes/_authenticated.admin.billing.tsx
src/routes/_authenticated.super.control-plane.tsx
src/lib/platform-operation-registry.ts
src/routeTree.gen.ts
run-bcr-01-billing-commercial-recovery-specs.ts
scripts/verify-release.mjs
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bcr-01-billing-commercial-recovery-implementation-evidence.md
```

Rules:

- `src/lib/billing/**` is allowed only for the canonical billing module; no parallel `src/lib/api/billing*` path.
- `src/routeTree.gen.ts` is generated-only.
- `src/integrations/supabase/types.ts` may change only as a deterministic consequence of BCR schema; unrelated regeneration drift is prohibited.
- `package.json`/`bun.lock` may change only for Stripe server SDK and exact BCR test/release wiring; unrelated toolchain upgrades are prohibited.
- migration wildcard permits only forward migrations whose filename contains `bcr_01` and whose purpose is within this envelope.

Any required path outside this set is `NEW_SCOPE` unless it is a deterministic generated artifact expressly allowed by the audit before mutation.

---

## 5. Migration authority

### 5.1 Historical managed migration reconstruction

The exact managed ledger migration MUST be reconstructed at:

```text
supabase/migrations/20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a.sql
```

Its SQL content MUST represent the statements already recorded in `supabase_migrations.schema_migrations` for version `20260812192006`. This file is parity evidence and MUST NOT be edited to silently change the historical database action.

```text
RECONSTRUCTION_DATABASE_DDL = false
RECONSTRUCTION_DATABASE_DML = false
```

### 5.2 Forward hardening

Any correction of the historical residue MUST use a new forward BCR migration. It MAY:

- enforce immutable/replacement price semantics;
- add explicit price retirement/version metadata when required;
- establish canonical service-role-only billing RPCs;
- retire/drop or revoke obsolete `bca01_*` runtime RPC paths after replacement is proven;
- preserve RLS deny-by-default application behavior;
- preserve explicit service-only write boundaries.

It MUST NOT:

- recreate the deleted SCP harness;
- rewrite migration ledger history;
- delete or mutate real tenant commercial data;
- add authenticated/anon write policies;
- create a client-authoritative billing path.

Forward migration application to Same-Backend is prohibited until a dedicated audited step explicitly declares `DATABASE_DDL/DML = true`.

---

## 6. Canonical billing module

Required logical boundaries inside `src/lib/billing/**`:

```text
billing-contracts.ts
billing-port.server.ts
stripe-adapter.server.ts
billing-authorization.server.ts
billing-repository.server.ts
billing-service.server.ts
billing-webhook.server.ts
billing-reconciliation.server.ts
billing-metrics.server.ts
```

Additional files under `src/lib/billing/**` are permitted only when they decompose these exact responsibilities without creating a second API/domain path.

### 6.1 BillingProvider port

Provider-specific Stripe types MUST NOT leak into commercial domain contracts. External IDs remain opaque strings.

Required provider capabilities:

- hosted Checkout subscription session;
- hosted Customer Portal session;
- raw-body webhook verification/normalization;
- subscription retrieval/reconciliation.

### 6.2 Authorization

Checkout and portal operations MUST consume authenticated trusted actor context, server-resolved tenant and explicit billing-management authorization. Membership role alone is insufficient.

### 6.3 Repository

Repository operations MUST use explicit cardinality. No heuristic adoption, `ORDER BY/LIMIT 1` selection or metadata-based tenant inference.

---

## 7. Checkout contract

The client may express an internal plan/price intent only. The server MUST resolve:

1. authenticated actor;
2. tenant;
3. billing authorization;
4. exactly one eligible internal plan price;
5. exactly one enabled Stripe provider-price mapping;
6. provider customer mapping;
7. server-controlled success/cancel URLs from an allowlist.

Client input MUST NOT be authoritative for:

```text
tenant_id
provider_customer_ref
provider_subscription_ref
provider_price_ref
amount
currency
billing_interval
billing_authorization
return_url outside allowlist
```

Checkout redirect success MUST NOT activate subscription/entitlements.

---

## 8. Webhook contract

Canonical public route:

```text
src/routes/api/public/hooks/billing-stripe-webhook.ts
```

Required order:

```text
raw request bytes
→ Stripe signature verification
→ timestamp tolerance verification
→ normalized event
→ sanitized payload/hash
→ idempotency reservation
→ exact persisted provider mapping resolution
→ canonical lifecycle mutation
→ transition audit
```

Hard failures:

- missing/invalid signature;
- stale signature timestamp;
- payload hash conflict for duplicate provider event ID;
- missing/multiple provider mapping;
- unknown authoritative provider price where plan resolution is required;
- ambiguous lifecycle mapping.

Provider metadata is never tenant authority.

---

## 9. Lifecycle mapping

At minimum:

```text
stripe:trialing → trialing
stripe:active → active
stripe:past_due → past_due
stripe:canceled → canceled
```

Provider states that are not explicitly entitled MUST NOT map to `active`. `incomplete`, `incomplete_expired`, `unpaid`, `paused` and unknown states require explicit fail-closed treatment and/or reconciliation.

Entitlements follow accepted internal subscription state, never redirect/client state.

---

## 10. Portal contract

Portal session creation requires:

- authenticated actor;
- exact tenant;
- billing-management authorization;
- exactly one operable Stripe customer mapping;
- server-controlled return URL.

No client-supplied provider customer identity is trusted.

---

## 11. Reconciliation and metrics

Reconciliation MUST retrieve provider subscription state through the adapter and apply the same canonical internal lifecycle path as webhook processing.

Metrics MUST distinguish:

- configured catalog value;
- provider-confirmed active/past-due/canceled subscription state;
- realized revenue evidence when available;
- development/test-mode records from real production revenue.

BCR-01 MUST NOT present test-mode transactions as production realized revenue.

---

## 12. Product surfaces

### Tenant Admin

`_authenticated.admin.billing.tsx` MUST provide a coherent billing surface against canonical server APIs: current commercial status, plan/price information, checkout/portal actions where authorized, lifecycle state and safe diagnostics.

### Super Admin

The existing control-plane surface may expose global billing visibility and explicitly authorized platform operations. It MUST NOT silently gain tenant billing mutation by tenant role or unvalidated tenant input.

PR-M3 owns final visual/product refactor. BCR UI must be operationally coherent but does not expand into final design-system redesign.

---

## 13. Stripe SDK and secrets

At implementation time, use the current stable server-side `stripe` package. Package addition MUST NOT cause unrelated dependency upgrades.

```text
STRIPE_SECRET_KEY_BCA01 = server_secret_reference
STRIPE_WEBHOOK_SECRET_BCA01 = server_secret_reference
```

Existing secret names may be retained for compatibility with the accepted BCA architecture; secret values are never committed or echoed.

Runtime without required test credential fails closed. Live keys are prohibited.

---

## 14. Execution packet map

### BCR-P1 — Parity reconstruction

```text
EXECUTOR = GitHub-native preferred
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

Deliver exact historical migration reconstruction and parity tests/evidence scaffolding only.

### BCR-P2 — Core + forward hardening

```text
EXECUTOR = GitHub-native preferred
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

Deliver canonical billing core and reviewed forward hardening migration without applying it.

### BCR-P3 — Stripe runtime

```text
EXECUTOR = GitHub-native or bounded Lovable Agent packet
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

Deliver Stripe test-mode adapter, internal routes, webhook, reconciliation and metrics.

### BCR-P4 — Product surfaces

```text
EXECUTOR = Lovable Agent preferred
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

Deliver tenant billing UI and Super Admin visibility only against the frozen canonical backend contracts.

### BCR-P5 — Same-Backend and controlled provider proof

```text
EXECUTOR = authorized database/provider connector paths
REPOSITORY_WRITE = evidence_only_if_required
DATABASE_DDL = true only for audited forward BCR migration
DATABASE_DML = true only for synthetic/test fixtures explicitly created by this packet
EXTERNAL_PROVIDER_WRITE = test_mode_only
SECRET_MUTATION = only if a missing test credential must be provisioned through its authorized custodian
DEPLOY = test/homologation only if required by proof
```

Apply only the already-reviewed forward migration, verify exact parity and execute controlled Stripe test-mode proof without real money.

### BCR-P6 — Reserved bounded packet

May be activated only when direct audit proves an unforeseen implementation dependency already inside this frozen objective. It cannot add scope or new architecture.

---

## 15. Evidence-qualified Lovable consumption

For every Lovable invocation:

```text
TRANSPORT_NOT_ACCEPTED → 0 packet consumed
ACCEPTED_NO_MATERIALIZATION + directly proven zero durable effects → 0 packet consumed
ANY_DURABLE_IMPLEMENTATION_MATERIALIZATION → 1 materialized packet consumed
OUT_OF_SCOPE_DURABLE_MUTATION → consumes packet + fails compliance
```

Do not duplicate/resend an accepted execution whose terminal state is not yet known.

Correctives require exact audited observations and have a hard ceiling of three.

---

## 16. Required tests

A dedicated runner is mandatory:

```text
run-bcr-01-billing-commercial-recovery-specs.ts
```

It MUST be wired into `scripts/verify-release.mjs` and prove, at minimum:

- exact historical migration presence/content anchors;
- no alternate billing API path;
- client cannot choose tenant/provider refs/amount/currency;
- authorization boundary is server-only;
- price/provider mapping cardinality;
- raw-body webhook verification precedes persistence/domain effect;
- idempotency conflict/duplicate behavior;
- provider mapping tenant resolution fail-closed;
- lifecycle mapping and non-active treatment for ambiguous states;
- reconciliation uses canonical lifecycle path;
- legacy `bca01_*` runtime path is not concurrently executable after hardening;
- no live Stripe configuration is required by CI;
- no unrelated dependency/toolchain drift;
- final Release Gate succeeds.

---

## 17. Evidence required

Canonical implementation evidence:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bcr-01-billing-commercial-recovery-implementation-evidence.md
```

It MUST record:

- exact baseline/head/PR/merge SHAs;
- packet ledger and Lovable consumption classifications;
- files changed;
- migrations reconstructed/created/applied;
- Same-Backend before/after parity;
- test and Release Gate results;
- Stripe mode and proof identity without secrets;
- real-tenant cardinalities before/after;
- confirmation of no real charge/production cutover;
- terminal state and PR-M3 authorization result.

---

## 18. Definition of Done

```text
HISTORICAL_MIGRATION_RECONSTRUCTED = true
FORWARD_HARDENING_REVIEWED_AND_APPLIED = true if required
SAME_BACKEND_GITHUB_PARITY = true
DUAL_BILLING_PATH = false
BILLING_AUTHORIZATION = proven
CHECKOUT_TEST_MODE = proven
PORTAL_TEST_MODE = proven
WEBHOOK_SIGNATURE = proven
WEBHOOK_IDEMPOTENCY = proven
TENANT_RESOLUTION = persisted_mapping_only
LIFECYCLE = deterministic
RECONCILIATION = proven
METRICS = test_vs_real_semantics_proven
TENANT_UI = operational
SUPER_ADMIN_VISIBILITY = operational
RELEASE_GATE = success
REAL_MONEY_CHARGE = false
PRODUCTION_CUTOVER = false
```

Terminal states remain standard. PR-M3 starts only after direct terminal audit proves an accepting BCR state.
