# BCR-01 — Billing Commercial Recovery Execution Envelope

## Status

**Frozen proposal — executable only after protected merge and successful post-merge Release Gate**

```text
STAGE_ID = BCR-01
OBJECTIVE = restore GitHub/Same-Backend billing parity and complete one test-mode hybrid commercial activation path
PREDECESSOR = BCA-01 / Rejected
AUDITED_BASELINE_MAIN = 1696c7d70373c1549f4464128e941f4a4776f1b0
COMPLEXITY_CLASS = L
LOVABLE_MAX_MATERIALIZED_PACKETS = 6
LOVABLE_MAX_CORRECTIVE_PACKETS = 3
SUCCESSOR = PR-M3
HYBRID_BILLING = explicit
MRR_PATH = subscriptions
NON_RECURRING_PATH = invoicing
FINAL_PLAN_CATALOG = deferred
```

---

## 1. Frozen objective

Recover from the terminally Rejected BCA-01 without reopening it, preserve the already-applied managed migration as historical fact, restore repository/database parity through forward-only change, and deliver **one provider-agnostic, server-authoritative Stripe test-mode billing architecture** that supports from its first accepted implementation both:

1. **Recurring MRR** — SaaS plans/subscriptions, hosted Checkout, Customer Portal, recurring invoices and lifecycle/revenue reconciliation.
2. **Non-recurring revenue** — `setup`, `milestone`, `customization` and `on_demand` charges, modeled internally and collected through Stripe Invoicing / Hosted Invoice Page.

The two revenue paths MUST converge on the same `BillingService` → `BillingProvider` boundary, the same verified/idempotent billing event ledger and the same reconciliation/audit posture. A second Stripe-specific business path is prohibited.

No live billing, real money or production cutover is authorized.

The final commercial plan catalog, plan names, entitlements and production prices are explicitly deferred. BCR-01 MUST NOT seed definitive SaaS Products/Prices merely to satisfy implementation completeness.

---

## 2. Preconditions

Before implementation packet execution:

```text
MAIN = exact post-hybrid-envelope merge SHA
HYBRID_ENVELOPE_PR = merged
HYBRID_ENVELOPE_POST_MERGE_RELEASE_GATE = success
BCA01_TERMINAL_STATE = Rejected
BCA01_REOPEN = prohibited
MANAGED_MIGRATION_20260812192006 = present in Same-Backend
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
STRIPE_PROVIDER_MODE = test
PRODUCTION_PLAN_CATALOG_DEFINED = false
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
STRIPE_AS_ENTITLEMENT_AUTHORITY = false
STRIPE_AS_PLAN_AUTHORITY = false
ONE_TIME_PAYMENT_MUTATES_ENTITLEMENTS_BY_DEFAULT = false
LIVE_STRIPE_SECRET = prohibited
REAL_MONEY_CHARGE = prohibited
```

Additional hybrid invariants:

- `commercial plan / entitlement` authority remains internal.
- `commercial price` authority remains internal and provider-agnostic.
- `billing charge` is distinct from plan, subscription and entitlement.
- Provider objects are consequences/references, not domain authority.
- A paid `setup`, `milestone`, `customization` or `on_demand` invoice MUST NOT activate, upgrade or otherwise mutate tenant entitlements unless a future separately accepted commercial rule explicitly links that charge to such an effect.
- No client may submit authoritative Stripe Customer, Subscription, Price, Invoice or Payment IDs.

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
src/lib/super-admin/platform-operations-registry.ts
src/routeTree.gen.ts
run-bcr-01-billing-commercial-recovery-specs.ts
scripts/verify-release.mjs
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bcr-01-billing-commercial-recovery-implementation-evidence.md
```

Rules:

- `src/lib/billing/**` is allowed only for the canonical billing module; no parallel `src/lib/api/billing*` path.
- `src/routeTree.gen.ts` is generated-only.
- `src/integrations/supabase/types.ts` may change only as a deterministic consequence of BCR schema; unrelated regeneration drift is prohibited.
- `package.json`/`bun.lock` may change only for the Stripe server SDK and exact BCR test/release wiring; unrelated toolchain upgrades are prohibited.
- migration wildcard permits only forward migrations whose filename contains `bcr_01` and whose purpose is within this envelope.
- the previously listed non-existent `src/lib/platform-operation-registry.ts` path is corrected to the factual canonical `src/lib/super-admin/platform-operations-registry.ts` path.

Any required path outside this set is `NEW_SCOPE` unless it is a deterministic generated artifact expressly allowed by audit before mutation.

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
- preserve explicit service-only write boundaries;
- add the minimum provider-agnostic persistence required for non-recurring charge intents, charge items and provider invoice references.

It MUST NOT:

- recreate the deleted SCP harness;
- rewrite migration ledger history;
- delete or mutate real tenant commercial data;
- add authenticated/anon write policies;
- create a client-authoritative billing path;
- add Stripe-specific columns to internal commercial tables;
- encode final plan names, final plan entitlements or production prices.

Forward migration application to Same-Backend is prohibited until a dedicated audited step explicitly declares `DATABASE_DDL/DML = true`.

### 5.3 Hybrid non-recurring persistence

The canonical provider-agnostic minimum is:

```text
commercial_charge_intents
commercial_charge_items
billing_charge_provider_mappings
```

Equivalent naming is permitted only if it preserves the same boundaries and does not introduce a second commercial authority path.

`commercial_charge_intents` MUST express at least:

```text
tenant_id
charge_type = setup | milestone | customization | on_demand
status
currency
amount_total_minor
idempotency_key
correlation_ref optional/opaque
metadata_sanitized
created_at / updated_at
```

`commercial_charge_items` MUST express server-owned line items and exact minor-unit totals. `billing_charge_provider_mappings` MUST bind an internal charge intent to opaque provider invoice/payment references with explicit cardinality.

No provider invoice reference may identify the tenant by itself.

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

- ensure/retrieve customer;
- hosted Checkout subscription session;
- hosted Customer Portal session;
- create/finalize/send standalone invoice for a server-owned non-recurring charge;
- retrieve provider invoice for reconciliation;
- raw-body webhook verification/normalization;
- subscription retrieval/reconciliation.

The provider port MUST model recurring and non-recurring operations as separate methods under the **same** provider interface.

### 6.2 Authorization

Checkout, portal, one-time invoice creation and explicit reconciliation operations MUST consume authenticated trusted actor context, server-resolved tenant and explicit billing-management authorization. Membership role alone is insufficient.

### 6.3 Repository

Repository operations MUST use explicit cardinality. No heuristic adoption, `ORDER BY/LIMIT 1` selection or metadata-based tenant inference.

---

## 7. Recurring MRR contract

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

The architecture MUST remain compatible with future flat-rate, per-seat and/or usage-based pricing. BCR-01 does not select the final commercial pricing model.

---

## 8. Non-recurring charge contract

Supported canonical charge types:

```text
setup
milestone
customization
on_demand
```

Creation order:

```text
authenticated tenant billing action
→ exact tenant + billing authorization
→ create/reserve internal charge intent idempotently
→ persist server-owned charge items
→ BillingService
→ BillingProvider
→ Stripe Invoice Items / Invoice
→ Hosted Invoice Page
→ provider webhook/reconciliation
→ internal charge status transition
```

Required rules:

- currency and amounts are server-owned integer minor units;
- client may not submit Stripe Invoice/Payment IDs;
- provider invoice metadata may carry sanitized correlation values but is never tenant authority;
- retries MUST reuse the same internal idempotency identity and MUST NOT create duplicate provider invoices;
- `invoice.paid` closes the internal charge as paid only after exact provider-invoice mapping;
- `invoice.payment_failed` may transition an open charge to failed/collection-required according to explicit policy;
- `charge.refunded` is reconciled/audited and MUST NOT silently mutate plan entitlements;
- Hosted Invoice Page is the default customer payment surface for non-recurring charges;
- one-time charges and subscription invoices may coexist for the same customer without conflating their domain identities.

No final tax-document/NFS-e implementation is part of BCR-01. Stripe Tax, when later enabled, does not replace Brazilian fiscal-document obligations.

---

## 9. Webhook contract

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
→ canonical recurring OR non-recurring lifecycle mutation
→ transition audit
```

Hard failures:

- missing/invalid signature;
- stale signature timestamp;
- payload hash conflict for duplicate provider event ID;
- missing/multiple provider mapping;
- unknown authoritative provider price where plan resolution is required;
- unknown provider invoice mapping where one-time charge resolution is required;
- ambiguous lifecycle mapping.

Provider metadata is never tenant authority.

The normalized vocabulary remains ADR-006 authoritative. `InvoicePaid`, `InvoicePaymentFailed` and `ChargeRefunded` MUST be routable deterministically either to subscription lifecycle semantics or to a non-recurring charge mapping based on persisted provider references, never heuristics.

---

## 10. Subscription lifecycle mapping

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

## 11. Portal contract

Portal session creation requires:

- authenticated actor;
- exact tenant;
- billing-management authorization;
- exactly one operable Stripe customer mapping;
- server-controlled return URL.

No client-supplied provider customer identity is trusted.

---

## 12. Reconciliation and metrics

Reconciliation MUST retrieve provider state through the adapter and apply the same canonical internal paths used by webhook processing.

It MUST support:

- subscription reconciliation by exact persisted provider subscription mapping;
- non-recurring invoice reconciliation by exact persisted provider invoice mapping;
- duplicate/out-of-order event handling;
- provider/local identity mismatch fail-closed behavior.

Metrics MUST distinguish:

- configured catalog value;
- recurring contracted MRR;
- provider-confirmed active/past-due/canceled subscription state;
- realized recurring revenue evidence;
- realized non-recurring revenue by `setup`, `milestone`, `customization`, `on_demand`;
- development/test-mode records from real production revenue.

BCR-01 MUST NOT present test-mode transactions as production realized revenue.

---

## 13. Product surfaces

### Tenant Admin

`_authenticated.admin.billing.tsx` MUST provide a coherent billing surface against canonical server APIs: current commercial status, plan/price information, checkout/portal actions where authorized, lifecycle state, non-recurring charge visibility and safe diagnostics.

The tenant UI MUST NOT expose provider identifiers as commercial authority and MUST NOT become a direct table writer.

### Super Admin

The existing control-plane surface may expose global billing visibility and explicitly authorized platform operations. It MUST NOT silently gain tenant billing mutation by tenant role or unvalidated tenant input.

PR-M3 owns final visual/product refactor. BCR UI must be operationally coherent but does not expand into final design-system redesign.

---

## 14. Stripe SDK, Tax and secrets

At implementation time, use a current stable server-side `stripe` package without unrelated dependency/toolchain upgrades.

Canonical runtime secret references:

```text
STRIPE_SECRET_KEY = server_secret_reference
STRIPE_WEBHOOK_SECRET = server_secret_reference
```

Rules:

- secret reads occur only server-side and at request/runtime time;
- the test-only BCR runtime MUST reject `sk_live_*`;
- no secret in GitHub, database metadata, logs or client bundle;
- the publishable key is not server authority and is not required for hosted Checkout/Hosted Invoice Page server creation;
- runtime without required test credential fails closed;
- test and live credentials are never mixed heuristically.

Stripe Tax may be integrated later where applicable, but BCR-01 MUST NOT equate a Stripe invoice with Brazilian NFS-e or other government-mandated fiscal documentation.

---

## 15. Execution packet map

### BCR-P1 — Parity reconstruction + hybrid envelope materialization

```text
EXECUTOR = GitHub-native preferred
REPOSITORY_WRITE = true
DATABASE_DDL = false
DATABASE_DML = false
EXTERNAL_PROVIDER_WRITE = false
SECRET_MUTATION = false
DEPLOY = false
```

Deliver exact historical migration reconstruction and hybrid-aware evidence/test scaffolding.

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

Deliver canonical billing core, recurring + non-recurring persistence contracts and reviewed forward hardening migration without applying it.

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

Deliver Stripe test-mode adapter, subscription Checkout, Hosted Invoice Page creation, internal routes, webhook, reconciliation and metrics.

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

Apply only the already-reviewed forward migration, verify exact parity and execute controlled Stripe test-mode proof without real money. Because final plans are not yet defined, any provider Product/Price used in proof MUST be synthetic/test-only and MUST NOT be adopted as production catalog authority.

### BCR-P6 — Reserved bounded packet

May be activated only when direct audit proves an unforeseen implementation dependency already inside this frozen objective. It cannot add scope or new architecture.

---

## 16. Evidence-qualified Lovable consumption

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

## 17. Required tests

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
- the four non-recurring charge types are represented provider-agnostically;
- non-recurring charge creation is idempotent and amount/currency are server-owned;
- provider invoice identity resolves only through persisted mapping;
- `InvoicePaid` can close a non-recurring charge without mutating subscription/entitlement state;
- recurring and non-recurring flows share the same `BillingProvider` boundary;
- no final plan catalog or production provider price is seeded;
- no unrelated dependency/toolchain drift;
- final Release Gate succeeds.

---

## 18. Evidence required

Canonical implementation evidence:

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bcr-01-billing-commercial-recovery-implementation-evidence.md
```

It MUST record:

- exact baseline/head/PR/merge SHAs;
- hybrid envelope merge SHA and Release Gate;
- packet ledger and Lovable consumption classifications;
- files changed;
- migrations reconstructed/created/applied;
- Same-Backend before/after parity;
- test and Release Gate results;
- Stripe mode and proof identity without secrets;
- recurring and non-recurring proof coverage;
- real-tenant cardinalities before/after;
- confirmation of no real charge/production cutover;
- confirmation that final SaaS plan catalog remains deferred unless separately accepted;
- terminal state and PR-M3 authorization result.

---

## 19. Definition of Done

```text
HYBRID_BILLING_EXPLICIT = true
HISTORICAL_MIGRATION_RECONSTRUCTED = true
FORWARD_HARDENING_REVIEWED_AND_APPLIED = true if required
SAME_BACKEND_GITHUB_PARITY = true
DUAL_BILLING_PATH = false
BILLING_AUTHORIZATION = proven
RECURRING_CHECKOUT_TEST_MODE = proven
PORTAL_TEST_MODE = proven
NON_RECURRING_INVOICE_TEST_MODE = proven
SETUP_CHARGE_PATH = proven
MILESTONE_CHARGE_PATH = proven
CUSTOMIZATION_CHARGE_PATH = proven
ON_DEMAND_CHARGE_PATH = proven
WEBHOOK_SIGNATURE = proven
WEBHOOK_IDEMPOTENCY = proven
TENANT_RESOLUTION = persisted_mapping_only
PROVIDER_INVOICE_RESOLUTION = persisted_mapping_only
SUBSCRIPTION_LIFECYCLE = deterministic
NON_RECURRING_LIFECYCLE = deterministic
ONE_TIME_ENTITLEMENT_COUPLING = false
RECONCILIATION = proven
METRICS = recurring_vs_non_recurring_and_test_vs_real_semantics_proven
TENANT_UI = operational
SUPER_ADMIN_VISIBILITY = operational
FINAL_PLAN_CATALOG = deferred_or_separately_accepted
RELEASE_GATE = success
REAL_MONEY_CHARGE = false
PRODUCTION_CUTOVER = false
```

Terminal states remain standard. PR-M3 starts only after direct terminal audit proves an accepting BCR state.
