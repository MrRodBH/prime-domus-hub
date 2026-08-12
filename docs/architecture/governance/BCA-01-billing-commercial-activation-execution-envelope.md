# BCA-01 — Billing & Commercial Activation Execution Envelope

## Status

**Planning / frozen principal envelope — implementation not started**

```text
STAGE_ID = BCA-01
AUDITED_BASELINE_MAIN = aaada121aafff1f6ab0bb2452603b20fcd76fc8f
ARCHITECTURE = BCA-01 Billing & Commercial Activation Impact Analysis
SELECTED_STRATEGY = Strategy A — Stripe hosted Checkout/Portal behind BillingProvider
INITIAL_PROVIDER = stripe
PRINCIPAL_IMPLEMENTATION_PROMPT_BUDGET = 0/2 consumed
CONSOLIDATED_CORRECTIVE_BUDGET = available only after principal audit
THIRD_IMPLEMENTATION_PROMPT = prohibited
IMPLEMENTATION_STARTED = false
REAL_MONEY_CHARGE = prohibited
PRODUCTION_CUTOVER = false
PRM3 = blocked
```

This envelope freezes the first BCA-01 implementation. It does not itself implement billing, provision secrets, create Stripe objects, mutate the Same-Backend or charge any customer.

---

## 1. Preconditions

Before principal implementation starts, executor must revalidate:

1. `main` is descendant of the planning merge and has no conflicting BCA-01 runtime implementation;
2. DCA-02 remains terminal Accepted and is not reopened;
3. existing commercial schema is unchanged from the planning audit or any drift is explicitly impact-analyzed;
4. provider catalog remains free of unreviewed provider definitions;
5. real RM Prime tenant still has zero provider mapping and no unexpected commercial subscription;
6. harness residue is still deterministically identifiable;
7. no Stripe secret exists in repository/client code.

Any unsafe divergence is fail-closed and must stop principal mutation before partial billing activation.

---

## 2. Principal implementation outcome

Principal implementation must deliver an executable **Stripe test-mode billing cell** that exercises the accepted RM Prime commercial domain without production charging.

Required delivered capabilities:

```text
COM-017 = dedicated billing authorization boundary
COM-013 = Stripe adapter behind BillingProvider
COM-014 = hosted subscription Checkout
COM-015 = signed/idempotent Stripe webhook ingestion
COM-016 = hosted Customer Portal session
COM-019 = provider-confirmed billing visibility / realized metrics foundation
```

It must also deliver:

- deterministic harness-residue cleanup/preparation;
- provider-agnostic commercial price and provider-price identity mapping;
- subscription lifecycle mapping and reconciliation;
- audit/diagnostic evidence;
- tenant billing surface and Super Admin billing visibility consistent with authority;
- dedicated regression runner integrated into Release Gate.

---

## 3. FILES_ALLOWED — principal implementation

Only the following paths may be created or modified by the principal implementation unless an Impact Analysis correction explicitly changes this frozen list before implementation starts.

### Dependency / release integration

```text
package.json
bun.lock
scripts/verify-release.mjs
```

### Database / generated server schema

```text
supabase/migrations/20260812190000_bca_01_billing_commercial_activation.sql
src/integrations/supabase/types.ts
```

### Billing runtime

```text
src/lib/billing/billing-contracts.ts
src/lib/billing/billing-port.server.ts
src/lib/billing/billing-authorization.server.ts
src/lib/billing/billing-repository.server.ts
src/lib/billing/billing-service.server.ts
src/lib/billing/billing-webhook.server.ts
src/lib/billing/billing-reconciliation.server.ts
src/lib/billing/billing-metrics.server.ts
src/lib/billing/stripe-adapter.server.ts
```

### Routes / UI surfaces

```text
src/routes/api/internal/billing-checkout.ts
src/routes/api/internal/billing-portal.ts
src/routes/api/public/hooks/stripe.ts
src/routes/_authenticated.admin.billing.tsx
src/routes/_authenticated.super.control-plane.tsx
```

### Existing control plane

```text
src/lib/super-admin/platform-operations-registry.ts
```

### Deterministic tests

```text
run-bca-01-billing-commercial-activation-specs.ts
```

### BCA-01 evidence

```text
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bca-01-billing-commercial-activation-implementation-evidence.md
```

No other file is allowed in the principal implementation.

If generated TanStack routing requires `src/routeTree.gen.ts` to change as a deterministic generated artifact, that file may be regenerated only by the canonical build/tooling and must be reported separately as generated output. No hand edit is allowed.

---

## 4. Database migration boundary

The single forward migration must own only the minimum BCA-01 persistence/privilege changes.

### 4.1 Harness cleanup gate

Before real BCA data materialization, the migration must assert the exact fixture universe expected from the planning audit.

Canonical preflight facts at planning time:

```text
HARNESS_PLAN_COUNT = 5
HARNESS_SUBSCRIPTION_COUNT = 65
NON_HARNESS_PLAN_COUNT = 0
NON_HARNESS_SUBSCRIPTION_COUNT = 0
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
```

Implementation must not simply hard-code deletion because those counts were once true. It must:

- classify by exact accepted fixture identity;
- assert there are no non-harness commercial rows that would be affected;
- protect real tenant ID `9664d189-4a12-4caa-8243-dc73383447e6` explicitly;
- remove fixture-dependent rows in FK-safe order or isolate them with an equally deterministic accepted mechanism;
- fail the transaction on ambiguity;
- report before/after cardinality.

### 4.2 New provider-agnostic price authority

Create:

```text
public.commercial_plan_prices
public.billing_plan_provider_prices
```

Required properties:

- UUID primary keys;
- FK to existing `commercial_plans`;
- normalized currency;
- integer minor-unit amount;
- positive interval count;
- explicit interval/status domains or CHECK constraints;
- no provider-specific columns in `commercial_plan_prices`;
- `billing_plan_provider_prices` stores provider code + opaque provider price ref;
- exact uniqueness preventing multiple active mappings for the same provider/internal price;
- RLS enabled;
- no `anon`/`authenticated` table grants;
- no secrets.

### 4.3 Provider catalog

Materialize only the non-secret Stripe provider definition required by BCA-01.

Provider definition must be idempotent and conflict-safe; an existing non-equivalent `stripe` row must fail closed rather than be overwritten blindly.

### 4.4 Event/lifecycle authority

Reuse existing `billing_events`, `billing_event_transitions`, `tenant_billing_provider_mappings` and `tenant_subscriptions` unless a narrowly required helper RPC is necessary for atomic idempotency/lifecycle mutation.

If helper RPCs are created:

- `SECURITY DEFINER` only when required;
- explicit `search_path`;
- minimal grants;
- tenant/provider/event cardinality revalidated inside transaction;
- no client execute grant;
- no dynamic SQL;
- no role-derived commercial authorization.

Do not create a second subscription ledger.

---

## 5. Dependency boundary

Stripe SDK is permitted as the only new provider SDK.

```text
ALLOWED_PROVIDER_DEPENDENCY = stripe
OTHER_PROVIDER_SDK = prohibited
```

The exact version must be pinned by the canonical package manager lockfile.

No payment SDK is allowed in client-only bundles. Stripe secret API usage is server-only.

---

## 6. BillingProvider port

`billing-port.server.ts` defines provider-agnostic operations required by BCA-01. Minimum capabilities:

```text
createCheckoutSession
createCustomerPortalSession
verifyWebhookSignature
parseNormalizedEvent
retrieveCustomer
retrieveSubscription
```

Provider port input is already-authorized/server-owned context. It must not resolve tenant from provider metadata.

`stripe-adapter.server.ts` is the only Stripe-specific runtime file. No `if (provider === 'stripe')` branches are allowed throughout the domain/service layer beyond one deterministic provider registry/factory selection point.

---

## 7. Runtime credential boundary

Server runtime reads credentials only through explicitly named environment bindings:

```text
STRIPE_SECRET_KEY_BCA01
STRIPE_WEBHOOK_SECRET_BCA01
```

No credential value is committed.

Principal repository implementation must function in deterministic fake/test suites when these credentials are absent. Any external Stripe test-mode proof is a separate operational step after repository merge and credential availability.

Production/live keys are prohibited in the principal implementation proof.

---

## 8. Authorization — exact boundary

`billing-authorization.server.ts` must expose one dedicated decision path for tenant billing management.

Required input:

```text
Trusted authenticated actor
Server-resolved tenant
Requested billing operation
```

Required output:

```text
allow with canonical actor/tenant context
or fail closed
```

It must not trust:

- client boolean capability;
- `tenant_role` alone;
- `is_owner` alone;
- `has_role(..., 'admin')` alone;
- provider metadata;
- URL tenant slug/ID alone;
- `x-tenant-id` without server revalidation.

If the current repository lacks a semantically correct persisted billing permission, principal implementation must choose the narrowest server-owned policy consistent with existing configuration authority and document it in tests/evidence. It must not introduce a broad global admin shortcut.

Super Admin tenant billing mutation must remain a separate explicit global commercial operation with auditable target/reason, not hidden tenant impersonation.

---

## 9. Checkout route

Canonical route:

```text
POST /api/internal/billing-checkout
```

It accepts only minimum client intent, e.g. internal plan-price identifier and approved return context. The server resolves all provider identity.

Hard rules:

- auth required;
- tenant server-resolved;
- billing auth required;
- one eligible internal price;
- one enabled Stripe provider-price mapping;
- provider customer mapping created/reused server-side;
- `mode = subscription`;
- test mode in external proof;
- success redirect cannot mark subscription active.

Response contains only the hosted redirect URL/session transport data required by UI.

---

## 10. Customer Portal route

Canonical route:

```text
POST /api/internal/billing-portal
```

Hard rules:

- auth + server tenant + billing auth;
- exactly one enabled Stripe customer mapping;
- no client provider customer ref;
- return URL from server allowlist;
- no direct provider subscription mutation in client.

---

## 11. Stripe webhook route

Canonical route:

```text
POST /api/public/hooks/stripe
```

This route is public transport but not public authority.

Mandatory order:

```text
raw bytes
→ Stripe signature verification
→ timestamp-window validation
→ normalized event
→ idempotency reservation
→ persisted mapping resolution
→ lifecycle transition/reconciliation
→ sanitized audit
```

No JSON parser may mutate/reconstruct the body before signature verification.

The handler must return a deterministic success/no-op for verified duplicate events and reject invalid signatures without creating a domain effect.

---

## 12. Normalization and state mapping

ADR-006 event vocabulary remains unchanged.

Stripe-specific events may map to normalized events only inside the Stripe adapter/webhook normalization boundary.

Principal tests must freeze every Stripe subscription status used by the pinned SDK/API version into an explicit RM Prime policy. No provider state may default to `active`.

At minimum:

```text
trialing → trialing
active → active
past_due → past_due
canceled → canceled
```

All remaining statuses map explicitly to a non-active/reconciliation policy.

---

## 13. Idempotency / concurrency

A verified provider event must reserve `(provider_code, provider_event_id)` before commercial mutation.

Concurrent delivery of the same Stripe event must produce at most one domain transition.

Required database/runtime tests:

- duplicate sequential delivery;
- duplicate concurrent delivery;
- event ID reused with conflicting payload hash fails closed;
- out-of-order update triggers reconciliation rather than blind state regression;
- stale provider observation cannot overwrite a newer internally recorded provider state without explicit reconciliation rule.

---

## 14. Reconciliation boundary

`billing-reconciliation.server.ts` may retrieve only persisted provider identities from the mapping ledger.

Prohibited:

- searching provider by email and adopting the first result;
- searching subscriptions and choosing `ORDER BY/LIMIT 1`;
- provider metadata as sole tenant identity;
- client/operator-supplied provider ref as automatic authority;
- silent mapping repair.

Ambiguity becomes an explicit diagnostic/reconciliation failure.

---

## 15. Metrics boundary

`billing-metrics.server.ts` must separate:

- catalog MRR;
- provider-confirmed MRR;
- realized paid revenue;
- refunded/reversed value;
- past-due exposure.

Harness/test data must never enter realized metrics.

No client computes authoritative MRR or revenue.

---

## 16. UI boundary

### Tenant surface

`_authenticated.admin.billing.tsx` may display current plan/subscription, billing status and buttons to request server-created Checkout/Portal sessions.

It must not contain provider secrets, provider state-transition logic or authoritative eligibility calculations.

### Super Admin surface

Existing `_authenticated.super.control-plane.tsx` may surface BCA billing diagnostics/visibility. Tenant-scoped mutation remains governed by the explicit BCA global commercial operation; control-plane UI alone cannot authorize it.

---

## 17. Control-plane reconciliation

`platform-operations-registry.ts` may change `billing_visibility` from `blocked_by_BCA01` only when principal implementation tests establish the factual health sources and server boundary.

Do not claim external provider success merely because code exists.

```text
externalExecutionProof = not_implied_by_local_state
```

must remain true.

`billingMutation` must change from `deferred_to_BCA01` only to an explicit implemented server-authority description supported by the final principal code/tests.

---

## 18. Test runner

`run-bca-01-billing-commercial-activation-specs.ts` is mandatory and must be added to `package.json` and `verify-release.mjs`.

Minimum suites:

```text
BCA01_AUTHORIZATION
BCA01_PRICE_IDENTITY
BCA01_PROVIDER_BOUNDARY
BCA01_CHECKOUT
BCA01_PORTAL
BCA01_WEBHOOK_SIGNATURE
BCA01_WEBHOOK_IDEMPOTENCY
BCA01_SUBSCRIPTION_LIFECYCLE
BCA01_RECONCILIATION
BCA01_HARNESS_CLEANUP_GUARDS
BCA01_METRICS_EXCLUDE_FIXTURES
BCA01_STRUCTURAL_SECURITY
```

No network access is required for repository CI; Stripe adapter must be injectable/fakeable at the port boundary.

---

## 19. Protected gates

Principal PR cannot merge unless all applicable checks pass on the exact HEAD:

```text
Release Gate = success
BCA-01 dedicated regression = success
TypeScript typecheck = success
Build = success
Existing DCA-01/DCA-02 regressions = success if Release Gate includes them
Existing PR-M2/commercial protected regressions = success
FILES_ALLOWED violations = 0
Secret scan = no Stripe secret value
```

Post-merge Release Gate on exact `main` is mandatory before Same-Backend managed application/external proof.

---

## 20. Same-Backend application gate

After protected merge only:

1. revalidate exact `main`;
2. dry-run/transaction-test migration where supported;
3. apply canonical forward migration through managed Same-Backend path;
4. audit schema, RLS, grants, RPC EXECUTE and harness cleanup result;
5. prove real tenant unchanged;
6. prove provider catalog contains exactly the accepted non-secret Stripe definition;
7. prove zero provider mappings/events exist unless a separate test fixture operation is explicitly executed.

Generated managed migration drift must never supersede GitHub canonical migration source.

---

## 21. External Stripe test-mode proof gate

This gate is subsequent to repository + Same-Backend acceptance and requires Stripe test credentials available through an authorized secret path.

Test proof must use a dedicated technical tenant, not the real RM Prime tenant.

Required external proof sequence:

```text
server-authorized checkout creation
→ Stripe test Checkout/session identity observed
→ verified webhook delivery or controlled signed fixture equivalent plus provider retrieval
→ internal mapping/subscription transition
→ duplicate delivery no-op
→ Customer Portal session creation
→ provider reconciliation by persisted IDs
→ test subscription cancellation/teardown
→ zero active technical provider objects or explicitly documented retained test object
→ real tenant unchanged
```

Live mode, real charge and real tenant commercial activation remain prohibited without a later explicit Product Owner decision.

---

## 22. Definition of Done — principal implementation

Principal is Accepted only when:

- all FILES_ALLOWED restrictions respected;
- harness residue handled deterministically;
- provider price authority materialized;
- Stripe provider registered without secret material;
- billing authorization is explicit and fail-closed;
- Stripe adapter exists only behind provider port;
- Checkout and Portal are server-authorized hosted flows;
- webhook raw-body signature verification is mandatory;
- idempotency/concurrency tests pass;
- lifecycle mapping is exhaustive/non-active by default;
- reconciliation uses persisted exact identities;
- metrics exclude fixtures and distinguish realized/provider-confirmed values;
- tenant and Super Admin surfaces respect authority;
- no production/live billing claim is made;
- exact-head protected gates pass;
- post-merge Same-Backend audit passes.

## 23. Stop conditions

Stop principal execution without unsafe continuation if:

- audited `main` diverges materially;
- non-harness commercial data appears unexpectedly;
- real tenant has acquired provider mapping/subscription outside this controlled stage;
- Stripe provider row exists with conflicting semantics;
- required schema change exceeds FILES_ALLOWED;
- authorization cannot be implemented without weakening existing tenant/security invariants;
- provider/webhook implementation would require client or metadata authority;
- secrets appear in source/history;
- migration cannot be made fail-closed and reversible at transaction boundary before merge.

## 24. Governance terminal

```text
PLANNING_GATE = this envelope
PRINCIPAL_IMPLEMENTATION = one protected execution
CORRECTIVE = at most one consolidated correction after direct GitHub audit
NO_ARTIFICIAL_SUBLOTS = true
PRM3_BEFORE_BCA01_TERMINAL_ACCEPTANCE = prohibited
REAL_MONEY_BEFORE_EXPLICIT_LIVE_DECISION = prohibited
```
