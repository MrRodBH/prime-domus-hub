# BCA-01 — Billing & Commercial Activation Impact Analysis

## Status

**Architecture First — Accepted for planning proposal / implementation not started**

```text
STAGE_ID = BCA-01
STAGE_NAME = Billing & Commercial Activation
AUDITED_BASELINE_MAIN = aaada121aafff1f6ab0bb2452603b20fcd76fc8f
PREDECESSOR = DCA-02
PREDECESSOR_TERMINAL_STATE = Accepted with Non-Blocking Backlog
PREDECESSOR_TERMINAL_PR = #100
DCA01_REOPEN = prohibited
PRM3_STARTED = false
BCA01_IMPLEMENTATION_STARTED = false
PRODUCTION_BILLING_ACTIVATION = false
REAL_CHARGE_EXECUTED = false
```

This Impact Analysis resolves the successor gate from the GitHub-audited `main` after DCA-02 terminal acceptance. It preserves the Product Owner sequence recorded in `PR-M2-product-owner-execution-decisions.md`:

```text
PR-M2 → DCA → BCA-01 → PR-M3
```

The current `FINITE_ROADMAP_EXECUTION_MAP.md` contains historical pre-DCA-02 stage-state text. That historical status text does not supersede the more recent DCA-02 terminal evidence merged by PR #100. The sequence authority remains binding; therefore BCA-01 is the current roadmap stage.

---

## 1. Binding architectural authorities

BCA-01 inherits without reopening:

- `ARCHITECTURE_CONSTITUTION.md`;
- `SECURITY_ARCHITECTURE.md`;
- IA-006 — SaaS Commercial Platform;
- ADR-005 — Commercial Domain;
- ADR-006 — Billing Provider Abstraction;
- F4.0 — Role Reconciliation / Membership Role Audit;
- SCP-001 through SCP-012 — all Accepted;
- Phase 4 Closing Review — Accepted;
- PR-M2 Product Owner Execution Decisions;
- DCA-02 terminal provider proof — Accepted with Non-Blocking Backlog.

The following rules remain mandatory:

1. server is the only authority for tenant, commercial state and billing mutations;
2. client-supplied tenant IDs, headers, paths, provider customer IDs, provider subscription IDs, price IDs or metadata are never authorization authority;
3. `x-tenant-id` is transport only and must be revalidated server-side;
4. no commercial authorization derives from `tenant_role`, `is_owner`, `has_role(auth.uid(),'admin')`, provider metadata or client state alone;
5. provider-specific behavior stays behind the accepted `BillingProvider` abstraction;
6. external billing events are verified, normalized and made idempotent before domain effects;
7. no heuristic provider-object adoption, `ORDER BY/LIMIT 1`, best-effort tenant resolution or fallback provider selection;
8. all ambiguity fails closed;
9. no production billing cutover or real monetary charge is implied by repository implementation acceptance.

---

## 2. BCA-01 Product Owner scope

The binding Product Owner decision defines BCA-01 as the mandatory commercial activation stage before PR-M3. Its required functional order is preserved:

1. billing/commercial administration authorization boundary;
2. real billing provider;
3. operational subscription lifecycle;
4. checkout;
5. idempotent provider webhooks;
6. customer billing portal;
7. payment reconciliation and lifecycle transitions;
8. realized MRR/revenue metrics;
9. commercial status, audit and diagnostics;
10. coherent tenant and Super Admin surfaces.

Mapped commercial requirements remain:

```text
COM-017 = billing/commercial admin authorization foundation
COM-013 = real billing provider integration
COM-014 = checkout
COM-015 = provider webhooks and lifecycle ingestion
COM-016 = customer billing portal
COM-019 = realized MRR/revenue metrics
```

BCA-01 does not authorize PR-M3 and does not start homologation.

---

## 3. Existing accepted commercial foundation

The repository already materializes provider-agnostic commercial state.

### 3.1 Commercial domain

Existing SCP-001 tables:

```text
commercial_plans
commercial_entitlement_definitions
commercial_plan_entitlements
tenant_subscriptions
tenant_entitlements
```

`tenant_subscriptions` is tenant-scoped and supports the accepted internal statuses:

```text
trialing
active
past_due
suspended
canceled
internal
demo
```

No provider-specific column exists in the domain model.

### 3.2 Provider abstraction persistence

Existing SCP-002 tables:

```text
billing_provider_definitions
tenant_billing_provider_mappings
billing_events
billing_event_transitions
```

The canonical idempotency authority is:

```text
(provider_code, provider_event_id)
```

External references are opaque and provider-specific SDK types do not leak into the commercial domain.

### 3.3 Existing runtime enforcement

Phase 4 already provides server-only commercial read/enforcement boundaries and the atomic seat-limit path. BCA-01 must integrate with those existing authoritative states rather than create a second entitlement or subscription decision path.

### 3.4 Super Admin control-plane boundary

The current `platform-operations-registry.ts` explicitly records:

```text
billing_visibility.executionState = blocked_by_BCA01
SUPER_CONTROL_PLANE_CONTRACT.billingMutation = deferred_to_BCA01
```

BCA-01 therefore owns activation of billing visibility/mutation semantics inside the existing control-plane model. A parallel commercial admin path is prohibited.

---

## 4. Same-Backend preflight — factual data state

Direct read-only audit of the Same-Backend before any BCA-01 mutation produced:

```text
billing_provider_definitions = 0
billing_provider_mappings = 0
billing_events = 0
billing_event_transitions = 0
commercial_plans = 5
tenant_subscriptions = 65
```

Classification established:

```text
HARNESS_PLANS = 5/5
HARNESS_SUBSCRIPTIONS = 65/65
NON_HARNESS_PLANS = 0
NON_HARNESS_SUBSCRIPTIONS = 0
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
```

All existing plans use `scp0121_plan_*` codes and `name = 'harness'`. All 65 subscriptions belong to tenants named `SCP-012.0.2.1 harness`.

The real RM Prime tenant remains commercially untouched:

```text
REAL_TENANT_ID = 9664d189-4a12-4caa-8243-dc73383447e6
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
```

### 4.1 Consequence

BCA-01 has no real-customer migration requirement at entry. However, the Phase 4 harness residue must not be interpreted as realized revenue, active customers, MRR or provider-linked subscriptions.

### 4.2 Mandatory harness-residue gate

Before any real provider data, BCA-01 implementation must execute one deterministic cleanup/isolation mechanism with all of the following properties:

- preflight exact cardinalities are asserted;
- only tenants proven by the canonical SCP-012.0.2.1 fixture identity are eligible;
- only plans matching the exact accepted harness identity are eligible;
- all dependent fixture rows are enumerated before deletion;
- unexpected non-harness commercial rows fail closed;
- the real tenant ID is explicitly protected;
- post-cleanup cardinalities are audited;
- no suffix-only or broad wildcard delete is accepted;
- cleanup is a one-time controlled preparation, not runtime behavior.

No harness data is deleted by this planning stage.

---

## 5. Initial provider selection

ADR-006 intentionally deferred final initial-provider selection to the real integration stage. BCA-01 is that stage.

### 5.1 Strategies evaluated

#### Strategy A — Stripe hosted billing surfaces + RM Prime server adapter

Use Stripe as the first real provider while preserving the provider-agnostic domain:

- Stripe Billing / Subscriptions;
- Stripe Checkout hosted flow;
- Stripe Customer Portal hosted flow;
- Stripe webhook verification and normalized event ingestion;
- opaque provider references persisted only in accepted provider mappings/price mappings;
- all tenant and commercial authority remains in RM Prime server-side boundaries.

**Advantages**

- strongest fit for recurring B2B SaaS;
- mature subscription lifecycle, hosted Checkout and Customer Portal;
- explicit webhook/event model;
- avoids custom card-handling surface in RM Prime;
- minimizes PCI-facing application scope;
- preserves future Hotmart/Kiwify adapters.

**Risks**

- Brazilian fiscal document/tax workflows remain a separate concern;
- provider subscription states are richer than the internal status enum and require an explicit mapping policy;
- provider price identity needs a new deterministic server-owned mapping because no canonical plan-price/provider-price relation exists today.

#### Strategy B — Custom payment UI / Elements-first implementation

Implement a custom billing UI in RM Prime while using Stripe underneath.

**Rejected for BCA-01 initial activation.** It expands PCI/UX/error-handling surface before the core subscription lifecycle is proven and duplicates capabilities already available in hosted Checkout/Portal.

#### Strategy C — Hotmart or Kiwify as initial provider

Use a Brazilian creator/marketplace provider first.

**Deferred, not architecturally rejected.** Both remain valid future adapters under ADR-006. Their product model is less aligned with RM Prime's first-release B2B SaaS tenant subscription/control-plane requirements than Stripe.

### 5.2 Selected strategy

```text
BCA01_SELECTED_STRATEGY = Strategy A
INITIAL_PROVIDER = stripe
DOMAIN_PROVIDER_LOCK_IN = false
HOTMART_FUTURE_ADAPTER = allowed
KIWIFY_FUTURE_ADAPTER = allowed
CUSTOM_PAYMENT_UI_FIRST = rejected
HOSTED_CHECKOUT = selected
HOSTED_CUSTOMER_PORTAL = selected
```

Provider selection does not make Stripe IDs commercial authority; they remain external opaque identifiers bound to server-owned tenant/subscription state.

---

## 6. Target architecture

```text
Authenticated tenant action
  → requireSupabaseAuth
  → requireTenant / Trusted Actor Context
  → dedicated billing authorization boundary
  → server-owned plan/price resolution
  → BillingService
  → BillingProvider port
  → Stripe adapter
  → Stripe Checkout / Portal

Stripe webhook raw request
  → public provider-specific endpoint
  → exact Stripe adapter selected by route/server configuration
  → signature + timestamp verification over raw body
  → normalized billing event
  → idempotency reservation
  → deterministic provider mapping resolution
  → atomic commercial lifecycle transition
  → billing event transition audit
  → reconciliation when needed
```

There is one domain authority path. Webhooks do not bypass RM Prime commercial rules.

---

## 7. Billing authorization boundary — COM-017

BCA-01 must introduce an explicit server-only billing authorization capability.

### Required semantics

- membership role alone is insufficient;
- `owner`, `admin`, `agent`, `guest`, `is_owner` and global `admin` flags are not billing authority by themselves;
- tenant is resolved first by `requireTenant`;
- authorization consumes the Trusted Actor Context and one explicit billing capability/policy;
- authorization must be reusable by checkout and customer-portal creation;
- client never sends `canManageBilling = true` as trusted data;
- failure is 403/fail-closed;
- Super Admin global diagnostic visibility does not silently grant tenant billing mutation;
- any Super Admin commercial mutation must use the explicit global commercial operation contract defined by BCA-01, with audit reason and tenant target revalidation; it must not masquerade as tenant impersonation or trust `x-tenant-id`.

The implementation must not broaden historical membership grants.

---

## 8. Provider price identity gap

The current domain has plans and entitlements but no canonical money/interval/provider-price mapping suitable for real checkout.

Using `commercial_plans.metadata` or a client-provided Stripe `price_id` as checkout authority is prohibited.

### Required materialization

BCA-01 implementation must add provider-agnostic price persistence with two explicit layers:

```text
commercial_plan_prices
billing_plan_provider_prices
```

Minimum `commercial_plan_prices` authority:

```text
id
plan_id
currency
unit_amount_minor
billing_interval
billing_interval_count
status
version/effective period or immutable replacement semantics
metadata_sanitized
```

Minimum `billing_plan_provider_prices` authority:

```text
id
commercial_plan_price_id
provider_code
provider_price_ref
status
created_at
retired_at
```

Required invariants:

- amount uses integer minor units, never floating point;
- currency is explicit and normalized;
- one active provider price mapping per internal plan-price/provider tuple;
- provider price ref is opaque, unique inside provider scope and server-owned;
- checkout receives an internal plan/price intent and resolves the provider price server-side;
- client/provider metadata cannot substitute the mapping table;
- price changes create a new mapping/version; historical events retain old refs.

Exact schema naming may only change if the implementation Impact Analysis follow-up proves a simpler equivalent without weakening these invariants.

---

## 9. Provider catalog and secret authority

The provider catalog is currently empty. BCA-01 must explicitly register Stripe as an enabled provider through a forward migration or controlled seed with no secret values.

```text
provider_code = stripe
provider_type = external
status = enabled
```

Capabilities may declare hosted checkout, customer portal, subscriptions, webhooks and reconciliation.

Secrets remain environment/provider-secret-store authority only. Suggested runtime references:

```text
STRIPE_SECRET_KEY_BCA01
STRIPE_WEBHOOK_SECRET_BCA01
```

Rules:

- no secret in GitHub;
- no secret in provider catalog metadata;
- no secret in client bundle;
- publishable key is not sufficient server authority;
- test and live credentials are never mixed heuristically;
- runtime fails closed when required credential is absent.

---

## 10. Checkout — COM-014

Selected initial flow: Stripe Checkout in subscription mode.

Mandatory server behavior:

1. authenticate actor;
2. resolve tenant server-side;
3. enforce billing authorization;
4. resolve exactly one eligible internal commercial plan price;
5. resolve exactly one enabled Stripe provider-price mapping;
6. resolve or create the provider customer through server-owned mapping semantics;
7. create checkout session using server-resolved provider refs;
8. store only minimum sanitized correlation metadata;
9. return hosted checkout URL/session reference as transport result.

Prohibited:

- client-supplied Stripe customer ID;
- client-supplied Stripe subscription ID;
- client-supplied authoritative Stripe price ID;
- tenant resolution from Stripe metadata alone;
- direct subscription activation from checkout redirect/success page;
- entitlement mutation before verified provider lifecycle evidence.

A browser redirect is UX only; webhook/reconciliation remains authoritative for provider-confirmed state.

---

## 11. Webhooks — COM-015

A provider-specific public route is allowed only because authenticity is cryptographically established by the adapter before any domain effect.

Canonical first route:

```text
/api/public/hooks/stripe
```

The route must preserve raw request bytes for Stripe signature verification.

### Hard rules

- invalid/missing signature → reject before persistence/domain mutation;
- unacceptable timestamp window → reject;
- verified external event ID is idempotent by `(stripe, provider_event_id)`;
- duplicate verified event → deterministic no-op response;
- unknown events may be recorded as sanitized `Unknown`/ignored state but cannot mutate subscription state;
- external payload is never stored raw when it contains unnecessary PII/payment data;
- provider customer/subscription references resolve through persisted mappings with explicit cardinality;
- missing or multiple mappings fail closed and enter reconciliation/diagnostic state;
- event ordering conflicts are reconciled against provider state, never blindly replayed;
- webhook event metadata may corroborate correlation but is not tenant authority.

Normalized event vocabulary remains ADR-006 authoritative:

```text
CheckoutCompleted
SubscriptionCreated
SubscriptionUpdated
SubscriptionCanceled
InvoicePaid
InvoicePaymentFailed
TrialEnding
ChargeRefunded
Unknown
```

---

## 12. Subscription lifecycle mapping

Stripe lifecycle is richer than the current RM Prime enum. BCA-01 must freeze a deterministic mapping before runtime code merge.

Minimum target policy:

```text
Stripe trialing → RM Prime trialing
Stripe active → RM Prime active
Stripe past_due → RM Prime past_due
Stripe canceled → RM Prime canceled
```

States such as `incomplete`, `incomplete_expired`, `unpaid`, `paused` or provider-side dispute/refund conditions must never be guessed into `active`. They require an explicit fail-closed mapping to a non-entitled internal state (`suspended`, `canceled` or no-current-subscription) as defined in the implementation envelope/tests.

Entitlements must be recomputed only from accepted internal subscription state, not directly from a client redirect or arbitrary webhook field.

---

## 13. Customer billing portal — COM-016

Selected initial flow: Stripe Customer Portal.

Portal session creation is server-side and requires:

- authenticated actor;
- exact tenant resolution;
- billing authorization;
- exactly one active Stripe customer mapping for the tenant;
- server-controlled return URL allowlist.

No client-provided provider customer ID is trusted.

---

## 14. Reconciliation

Webhook delivery is not assumed complete or ordered. BCA-01 requires a server-side reconciliation operation that:

- selects a tenant/provider mapping by exact internal identity;
- fetches provider state by persisted opaque refs;
- normalizes current provider state;
- compares it with internal subscription/mapping state;
- applies only allowed transitions;
- records a reconciled event/transition or explicit discrepancy;
- is idempotent and auditable;
- never scans provider objects and adopts one by heuristic hostname/email/order.

Automatic periodic scheduling may be deferred if an explicit on-demand Super Admin reconciliation operation exists for BCA-01 acceptance; no blind retry loop is allowed.

---

## 15. Revenue and MRR — COM-019

Historical harness subscriptions are excluded from realized revenue.

BCA-01 metrics must distinguish:

```text
catalog_price / theoretical MRR
provider-confirmed active recurring value
realized paid revenue
refunded/reversed revenue
past_due exposure
```

MRR must be derived from server-owned active subscription + commercial price state corroborated by provider reconciliation, not from the count of `tenant_subscriptions` rows alone.

Realized revenue must be based on verified normalized payment events/provider evidence. No fabricated revenue may be inferred from test fixtures or checkout-created sessions.

---

## 16. Test/live environment policy

Repository implementation must be provable without charging a real customer.

```text
BCA01_INITIAL_PROVIDER_MODE = Stripe test mode
REAL_MONEY_CHARGE = prohibited until separate explicit live activation decision
LIVE_SECRET_PROVISIONING = separate operational gate
PRODUCTION_CUTOVER = false during principal repository implementation
```

Test-mode external proof may use a dedicated technical billing tenant/fixture only. The real RM Prime tenant must remain unmodified until an explicitly authorized real-tenant commercial activation ceremony.

---

## 17. Data and privilege posture

New billing tables must preserve deny-by-default posture:

- RLS enabled;
- no `anon`/`authenticated` direct table mutation;
- server-only mutation via tightly scoped functions/repositories;
- grants audited explicitly, including `TRUNCATE`, `REFERENCES`, `TRIGGER` and function execute privileges;
- no direct client access to billing ledgers/provider mappings;
- PII and payment detail minimization enforced.

Any SECURITY DEFINER RPC must define explicit `search_path`, validate tenant/provider cardinality and expose only minimum grants.

---

## 18. Implementation strategy

BCA-01 shall be implemented as one principal Architecture First execution after this planning gate is Accepted/Merged.

### Principal implementation scope

- harness residue controlled cleanup/preparation;
- provider price model/mapping migration;
- Stripe provider catalog materialization;
- BillingProvider port + Stripe adapter;
- dedicated billing authorization boundary;
- checkout session server endpoint/service;
- customer portal server endpoint/service;
- Stripe raw-body webhook endpoint;
- normalized event/idempotency processing;
- subscription lifecycle/reconciliation;
- billing diagnostics and realized commercial metrics foundation;
- tests and Release Gate integration;
- platform operation registry reconciliation from `blocked_by_BCA01` to factual implemented state only after executable proof.

### Explicitly not included in principal repository implementation

- Stripe live-mode charging;
- production secret values;
- charging the real RM Prime tenant;
- Hotmart/Kiwify adapter implementation;
- custom card capture UI;
- fiscal/NFS-e integration;
- PR-M3;
- production cutover.

---

## 19. Hard gates

```text
BCA1-G0 = exact GitHub main baseline and ancestry
BCA1-G1 = harness residue classified and deterministically cleaned/isolated
BCA1-G2 = explicit billing authorization; no role-derived shortcut
BCA1-G3 = Stripe behind BillingProvider abstraction
BCA1-G4 = internal price → provider price mapping server-owned
BCA1-G5 = Checkout cannot activate subscription directly
BCA1-G6 = raw-body webhook signature/timestamp verified before effect
BCA1-G7 = event idempotency before processing
BCA1-G8 = provider refs never client/metadata authority
BCA1-G9 = deterministic subscription state mapping, fail-closed on unknown states
BCA1-G10 = customer portal server-authorized
BCA1-G11 = reconciliation by persisted identity only
BCA1-G12 = no real-money/live production activation
BCA1-G13 = RLS/grants/SECURITY DEFINER privilege audit passes
BCA1-G14 = Release Gate and dedicated BCA-01 regression runner pass
BCA1-G15 = real tenant remains unchanged during technical/test proof
```

Failure of any gate blocks terminal BCA-01 acceptance.

---

## 20. Required test matrix

Minimum deterministic coverage:

### Authorization

- unauthenticated checkout denied;
- unresolved/ambiguous tenant denied;
- forged tenant transport denied;
- ordinary membership role cannot self-elevate billing authority;
- unauthorized tenant actor denied;
- authorized billing actor accepted;
- Super Admin diagnostic path does not imply tenant billing mutation.

### Price/provider resolution

- unknown plan price denied;
- inactive price denied;
- missing provider mapping denied;
- duplicate active provider mapping fails closed;
- client-supplied provider price ignored/rejected.

### Checkout/portal

- exactly one customer mapping reused idempotently;
- no client customer/subscription authority;
- return URL allowlist enforced;
- test mode only in repository proof.

### Webhook

- missing signature denied;
- invalid signature denied;
- stale timestamp denied;
- duplicate event no-op;
- unknown event ignored/sanitized;
- missing tenant/provider mapping fails closed;
- mapping ambiguity fails closed;
- out-of-order event invokes reconciliation contract;
- payload persistence excludes sensitive unnecessary fields.

### Lifecycle

- trialing/active/past_due/canceled exact mappings;
- every additional Stripe status has an explicit non-active policy;
- cancel does not delete membership;
- failed payment does not silently preserve active entitlement when policy says otherwise;
- refund/reversal is auditable.

### Harness residue

- exact expected fixture universe only;
- real tenant protected;
- unexpected non-harness row aborts cleanup;
- post-cleanup commercial fixture residue = 0 or explicitly retained isolated set by approved invariant.

---

## 21. Definition of Done — Architecture First gate

This planning gate is Accepted only when:

- successor resolution to BCA-01 is documented from current `main`;
- Strategy A / Stripe is explicitly selected under ADR-006;
- Same-Backend harness residue is factually recorded;
- real tenant zero-commercial-state entry is recorded;
- authorization, price identity, checkout, webhook, portal, reconciliation and revenue boundaries are explicit;
- test/live boundary is explicit;
- no implementation, secret or real billing mutation is performed by this planning document;
- execution envelope freezes the principal implementation boundary.

## 22. Terminal planning decision

```text
BCA01_IS_NEXT_STAGE = true
BCA01_ARCHITECTURE_FIRST = ready_for_protected_merge
BCA01_SELECTED_STRATEGY = Strategy A — Stripe hosted Checkout/Portal behind BillingProvider
BCA01_INITIAL_PROVIDER = stripe
BCA01_IMPLEMENTATION = not_started
BCA01_REAL_MONEY = false
BCA01_PRODUCTION_CUTOVER = false
PRM3 = blocked_by_BCA01_terminal_acceptance
```
