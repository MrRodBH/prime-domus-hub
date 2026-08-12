# BCR-01 — Billing Commercial Recovery Impact Analysis

## Status

**Architecture First — proposed recovery successor of terminally Rejected BCA-01**

```text
STAGE_ID = BCR-01
STAGE_NAME = Billing Commercial Recovery
AUDITED_BASELINE_MAIN = ed844dc664ad2b7ea100bf544ea7cf21ab8946d2
PREDECESSOR = BCA-01
PREDECESSOR_STATE = Rejected
BCA01_REOPEN = prohibited
PRM3_STARTED = false
RECOVERY_MODE = forward_only
COMPLEXITY_CLASS = L
LOVABLE_MAX_MATERIALIZED_PACKETS = 6
LOVABLE_MAX_CORRECTIVE_PACKETS = 3
```

BCR-01 is a new recovery stage, not a third BCA-01 corrective and not a decimal substage. Its purpose is to reconcile the documented GitHub/Same-Backend divergence and complete the original billing/commercial activation objective under the active evidence-qualified execution governance.

---

## 1. Binding authorities

BCR-01 inherits without reopening:

- `ARCHITECTURE_CONSTITUTION.md`;
- `SECURITY_ARCHITECTURE.md`;
- IA-006, ADR-005 and ADR-006;
- accepted Phase 4 commercial foundations;
- BCA-01 accepted planning architecture;
- `bca-01-terminal-rejection-evidence.md`;
- `LOVABLE_EVIDENCE_QUALIFIED_EXECUTION_GOVERNANCE_AMENDMENT.md`;
- `GITHUB_NATIVE_EXECUTION_GOVERNANCE_AMENDMENT.md`;
- `CAPABILITY_PREFLIGHT_AND_CI_SCOPE_GOVERNANCE_AMENDMENT.md`.

The Product Owner sequence remains:

```text
PR-M2 → DCA → BCA/BCR recovery → PR-M3
```

PR-M3 remains blocked until BCR-01 reaches an accepting terminal state.

---

## 2. Current factual divergence

Direct GitHub audit proves that `main` contains BCA-01 planning and terminal rejection evidence but no accepted BCA implementation.

Direct Same-Backend read-only audit on 2026-08-12 proves:

```text
MANAGED_MIGRATION_VERSION = 20260812192006
MANAGED_MIGRATION_NAME = 0d1477a8-4e56-4fde-a4e0-9bb6cfba394a
commercial_plan_prices = present
billing_plan_provider_prices = present
bca01_reserve_billing_event = present
bca01_apply_provider_subscription_state = present
billing_provider_definitions[stripe] = enabled / test
commercial_plans = 0
tenant_subscriptions = 0
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
```

The Product Owner has clarified that the SaaS remains in development, with no real customers, real billing revenue or production users. Existing commercial/storage records are development simulations or test fixtures. This lowers data-loss impact but does not weaken source-of-truth, authorization or audit requirements.

---

## 3. Direct audit of the applied managed migration

The managed ledger exposes the exact SQL statements for version `20260812192006`. The applied migration performed:

1. guarded deletion of the known SCP-012.0.2.1 commercial harness;
2. creation of `commercial_plan_prices`;
3. creation of `billing_plan_provider_prices`;
4. RLS enablement on both tables with no application policies;
5. revocation from `anon` and `authenticated` and service-role grants;
6. non-secret Stripe provider registration in test mode;
7. creation of service-role-only event reservation and provider lifecycle RPCs.

Current read-only privilege audit confirms:

```text
NEW_PRICE_TABLES_RLS = enabled
NEW_PRICE_TABLES_POLICY_COUNT = 0
ANON_RPC_EXECUTE = false
AUTHENTICATED_RPC_EXECUTE = false
SERVICE_ROLE_RPC_EXECUTE = true
```

The managed maintenance role `sandbox_exec` is a platform maintenance-plane identity with `BYPASSRLS`; it is not an RM Prime application principal and MUST NOT become runtime authorization authority.

---

## 4. Recovery strategy decision

### Strategy A — destructive rollback and reapplication

**Rejected.** Reverse DDL/DML would erase factual evidence, may create migration-ledger divergence and is unnecessary because there is no real-customer data to recover.

### Strategy B — ignore Same-Backend residue and implement a second schema path

**Rejected.** It creates dual-path commercial authority and violates deterministic single-path architecture.

### Strategy C — forward canonicalization and hardening

**Selected.** BCR-01 SHALL:

1. reconstruct in GitHub, byte-for-byte in semantic SQL content, the already-applied managed migration using its exact ledger version/name;
2. treat that reconstructed migration as historical factual parity, not as automatic acceptance of the rejected workspace implementation;
3. add any required security/schema correction only through a later forward BCR-01 migration;
4. make the final runtime use one canonical billing path;
5. prove Same-Backend/GitHub parity after authorized forward migration application.

```text
BCR01_RECOVERY_STRATEGY = forward_canonicalization_and_hardening
ROLLBACK_OF_20260812192006 = prohibited
SECOND_SCHEMA_PATH = prohibited
EXACT_LEDGER_RECONSTRUCTION = required
FUTURE_CORRECTION = forward_migration_only
```

---

## 5. Applied SQL acceptance boundary

The exact historical SQL is safe to reconstruct as factual migration authority, but it is not sufficient by itself for final BCR acceptance.

The recovery MUST address these runtime-readiness gaps before merge of the completed implementation:

### 5.1 Price immutability/version semantics

Active commercial price identity MUST be deterministic. A price amount/currency/interval that has become active MUST NOT be silently edited in place. Price changes require replacement/version semantics and historical provider references must remain traceable.

A forward migration MAY add explicit retirement metadata and/or database-enforced immutability for active price authority.

### 5.2 Stage-specific legacy RPC surface

The historical `bca01_*` RPC names are migration residue and were never accepted as GitHub runtime authority. Final BCR runtime MUST expose one canonical service boundary. Any obsolete stage-specific RPC path must be removed or made non-executable to runtime roles by a reviewed forward migration so no dual billing mutation path remains.

### 5.3 Tenant resolution for provider events

Provider-event tenant identity MUST be resolved from persisted server-owned provider mappings with explicit cardinality. Final lifecycle mutation MUST NOT trust a tenant ID carried by provider metadata, client input or a public webhook payload.

For first subscription binding, the existing provider customer mapping created by the authorized checkout path is the required persisted correlation anchor. Missing or multiple mappings fail closed.

### 5.4 Provider price resolution

Checkout and lifecycle processing MUST resolve provider price refs through `billing_plan_provider_prices` and `commercial_plan_prices`. Client/provider metadata is never price authority.

---

## 6. Target runtime architecture

```text
Tenant billing action
  → requireSupabaseAuth
  → requireTenant / Trusted Actor Context
  → dedicated billing authorization policy
  → server-owned plan/price resolution
  → BillingService
  → BillingProvider port
  → Stripe adapter (test mode)
  → hosted Checkout / Customer Portal

Stripe webhook raw bytes
  → provider-specific public route
  → Stripe signature + timestamp verification
  → normalized event
  → idempotency reservation
  → exact provider mapping resolution
  → server-owned tenant/subscription/price resolution
  → one canonical lifecycle mutation boundary
  → transition audit / reconciliation
```

No redirect success page activates entitlements. Verified provider lifecycle evidence and internal commercial state remain authoritative.

---

## 7. Authorization invariants

BCR-01 preserves:

- membership role alone is not billing authority;
- tenant is resolved by the server before billing authorization;
- checkout and portal require an explicit billing-management capability/policy;
- Super Admin without explicit permitted control-plane operation or impersonation does not mutate tenant billing;
- no `canManageBilling`, tenant ID, customer ref, subscription ref, provider price ref, currency or amount from the client is trusted as authority;
- all ambiguous provider mappings fail closed;
- provider metadata can corroborate but never establish tenant identity.

---

## 8. Stripe mode and commercial safety

Initial provider remains Stripe under ADR-006 abstraction.

```text
INITIAL_PROVIDER = stripe
STRIPE_MODE = test_only
HOSTED_CHECKOUT = selected
HOSTED_CUSTOMER_PORTAL = selected
LIVE_SECRET = prohibited
REAL_MONEY_CHARGE = prohibited
PRODUCTION_BILLING_CUTOVER = prohibited
DOMAIN_PROVIDER_LOCK_IN = false
```

The server-side Stripe SDK may be added at the current stable supported version at implementation time, with no unrelated dependency/toolchain upgrades.

Secrets remain server-side environment/secret-store authority. No secret value is written to GitHub, database metadata, logs or client bundles.

---

## 9. Execution model

BCR-01 is complexity class `L`.

```text
LOVABLE_MAX_MATERIALIZED_PACKETS = 6
LOVABLE_MAX_CORRECTIVE_PACKETS = 3
TRANSPORT_FAILURE = no_budget_consumption
ACCEPTED_NO_MATERIALIZATION = no_budget_consumption_when_directly_proven
DURABLE_PARTIAL_MUTATION = consumes_budget
NEW_SCOPE = prohibited
NEW_ARCHITECTURAL_DECISION = replan
SAME_ROOT_CAUSE_LOOP = stop_or_replan
```

Executor routing:

- GitHub-native: migration reconstruction, forward hardening, security-critical server boundaries, deterministic tests and Release Gate wiring when feasible;
- Lovable: bounded UI/product integration packets and other explicitly frozen packets where it provides implementation advantage;
- Same-Backend mutation: only a packet/runbook that explicitly declares `DATABASE_DDL/DML = true` after repository audit;
- Stripe provider mutation: only separately authorized test-mode proof after repository/runtime readiness.

GitHub-native correction cycles follow evidence, not Lovable packet count.

---

## 10. Planned execution packets

The packet plan is frozen at a maximum of six materialized Lovable packets; GitHub-native work remains governed by its own amendment.

1. **Parity reconstruction** — exact managed migration reconstructed in GitHub; no database write.
2. **Commercial billing core** — canonical repository/authorization/service/provider contracts plus forward schema hardening; no provider write.
3. **Stripe test-mode runtime** — adapter, Checkout, Portal, webhook, lifecycle, reconciliation and metrics; no live mode.
4. **Billing product surfaces** — Tenant Admin billing UI and Super Admin billing visibility integrated with canonical server APIs.
5. **Same-Backend/release proof** — authorized forward migration application, deterministic tests, exact parity and controlled Stripe test-mode proof when capability/credentials are available.
6. **Reserved bounded implementation packet** — may be used only for an unforeseen internal dependency already inside the frozen BCR objective; it cannot introduce new scope.

Corrective packets are separate and require exact audited observations.

---

## 11. Definition of Done

BCR-01 may be `Accepted` only when all applicable predicates are proven:

```text
GITHUB_HAS_EXACT_MANAGED_MIGRATION_HISTORY = true
GITHUB_SAME_BACKEND_SCHEMA_PARITY = true
DUAL_BILLING_MUTATION_PATH = false
SERVER_TENANT_AUTHORITY = true
BILLING_AUTHORIZATION_BOUNDARY = proven
SERVER_OWNED_PRICE_RESOLUTION = proven
STRIPE_TEST_ADAPTER = proven
CHECKOUT_TEST_MODE = proven
CUSTOMER_PORTAL_TEST_MODE = proven
RAW_BODY_WEBHOOK_SIGNATURE_VERIFICATION = proven
WEBHOOK_IDEMPOTENCY = proven
PROVIDER_MAPPING_CARDINALITY = fail_closed
SUBSCRIPTION_LIFECYCLE = deterministic
RECONCILIATION = proven
REALIZED_METRICS_BOUNDARY = proven
TENANT_BILLING_UI = proven
SUPER_ADMIN_BILLING_VISIBILITY = proven
RELEASE_GATE = success
REAL_TENANT_MUTATION = false unless an explicit synthetic/test fixture contract replaces this predicate
REAL_MONEY_CHARGE = false
PRODUCTION_CUTOVER = false
```

Only then may PR-M3 be unblocked and planned from the newly audited `main`.

---

## 12. Out of scope

BCR-01 does not include:

- production Stripe activation;
- live money collection;
- Brazilian fiscal/tax-document implementation;
- Hotmart/Kiwify adapters;
- final SaaS visual redesign owned by PR-M3;
- formal homologation;
- production cutover;
- Cloudflare domain work already closed by DCA-02.

---

## 13. Successor

```text
SUCCESSOR = PR-M3 — Product UX Refactor, Final Interface and Operational Readiness
SUCCESSOR_ENTRY = BCR-01 Accepted or Accepted with Non-Blocking Backlog
PRM3_AUTO_START = allowed only under existing Product Owner end-to-end authorization and after direct terminal BCR audit
```
