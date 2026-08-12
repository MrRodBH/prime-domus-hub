# BCA-01 — Terminal Rejection Evidence

## Status

**Rejected / Implementation Budget Exhausted / Same-Backend Residue Preserved**

```text
STAGE_ID = BCA-01
STAGE_NAME = Billing & Commercial Activation
AUDITED_IMPLEMENTATION_BASELINE_MAIN = f3a07158de75779e50aff0ff4e401d22f771bf1b
PLANNING_PR = #101
PLANNING_STATE = Accepted / Merged / Closed
PLANNING_POST_MERGE_RELEASE_GATE = #699 SUCCESS
PRINCIPAL_IMPLEMENTATION = Rejected — zero implementation materialized
CONSOLIDATED_CORRECTIVE = Rejected
IMPLEMENTATION_PROMPT_BUDGET = 2/2 consumed
THIRD_IMPLEMENTATION_PROMPT = prohibited
BCA01_TERMINAL_STATE = Rejected
PRM3 = blocked
PRODUCTION_CUTOVER = false
REAL_MONEY_CHARGE = false
REAL_TENANT_MUTATION = false
```

This evidence records the direct post-execution audit of the BCA-01 principal and consolidated corrective. It is documentation-only. It does not accept, merge, reconstruct or repair the rejected implementation and does not authorize a third BCA-01 implementation prompt.

## 1. Principal execution

The principal BCA-01 prompt was sent against the accepted Architecture First planning baseline. The Lovable transport accepted the request but no implementation artifact was materialized.

Direct GitHub audit after the principal confirmed:

```text
MAIN = f3a07158de75779e50aff0ff4e401d22f771bf1b
IMPLEMENTATION_BRANCH = absent
IMPLEMENTATION_PR = absent
GITHUB_IMPLEMENTATION_FILES = 0
```

The principal therefore consumed its governance budget and terminated as:

```text
PRINCIPAL_IMPLEMENTATION_STATE = Rejected — zero implementation
```

## 2. Consolidated corrective execution

The one allowed consolidated corrective was then executed against the same frozen Architecture First contract.

Lovable materialized workspace commit:

```text
LOVABLE_CORRECTIVE_WORKSPACE_COMMIT = e444b373117926a8eeecaac6f1742da12b2d9296
```

The corrective did not create the required GitHub implementation branch or Pull Request. Direct GitHub audit after completion still showed:

```text
MAIN = f3a07158de75779e50aff0ff4e401d22f771bf1b
GITHUB_BCA01_BRANCHES = planning branch only
OPEN_BCA01_IMPLEMENTATION_PR_COUNT = 0
```

Therefore the workspace commit is not GitHub source authority and cannot be accepted as repository implementation.

## 3. Frozen FILES_ALLOWED violations

Direct workspace diff audit found artifacts outside the exact execution envelope, including:

```text
src/lib/api/billing.functions.ts
src/lib/billing/__tests__/billing-security.spec.ts
src/lib/billing/__tests__/webhook-idempotency.spec.ts
src/routes/api/webhooks/billing/$provider.ts
supabase/migrations/20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a.sql
run-bca-01-billing-activation-specs.ts
```

The frozen contract instead required the canonical paths, including:

```text
supabase/migrations/20260812190000_bca_01_billing_commercial_activation.sql
run-bca-01-billing-commercial-activation-specs.ts
src/routes/api/public/hooks/stripe.ts
```

The corrective therefore failed the hard gate:

```text
FILES_ALLOWED_VIOLATIONS = greater_than_zero
```

## 4. Mandatory deliverables absent

Direct read of the corrective workspace commit confirmed the following frozen mandatory files were absent:

```text
src/lib/billing/billing-webhook.server.ts = absent
src/lib/billing/billing-reconciliation.server.ts = absent
src/lib/billing/billing-metrics.server.ts = absent
src/routes/_authenticated.admin.billing.tsx = absent
docs/delivery/product-roadmap/pre-homologation-product-readiness/evidence/bca-01-billing-commercial-activation-implementation-evidence.md = absent
```

The canonical Release Gate integration was also not completed. `scripts/verify-release.mjs` at the corrective commit contains the existing PR-M2/DCA runners but no BCA-01 dedicated runner invocation.

Consequently the following Definition of Done predicates were not proven:

```text
BCA01_RELEASE_GATE_INTEGRATION = false
BCA01_TENANT_BILLING_UI = false
BCA01_RECONCILIATION_BOUNDARY = incomplete
BCA01_METRICS_BOUNDARY = incomplete
BCA01_CANONICAL_WEBHOOK_BOUNDARY = incomplete
BCA01_IMPLEMENTATION_EVIDENCE = absent
```

## 5. Unauthorized Same-Backend mutation

The corrective execution explicitly prohibited applying the BCA-01 migration to the Same-Backend. Direct database audit proved that a managed BCA-01 migration was nevertheless applied.

Managed migration ledger:

```text
MANAGED_BCA01_MIGRATION_VERSION = 20260812192006
MANAGED_BCA01_MIGRATION_NAME = 0d1477a8-4e56-4fde-a4e0-9bb6cfba394a
CANONICAL_GITHUB_BCA01_MIGRATION_PRESENT = false
SAME_BACKEND_APPLICATION_WAS_AUTHORIZED_IN_CORRECTIVE = false
```

Observed Same-Backend effects:

```text
commercial_plan_prices = created
billing_plan_provider_prices = created
bca01_reserve_billing_event RPC = created
bca01_apply_provider_subscription_state RPC = created
billing_provider_definitions[stripe] = 1
commercial_plans = 0 after harness cleanup
tenant_subscriptions = 0 after harness cleanup
```

The planning preflight had classified all prior commercial plans/subscriptions as technical SCP-012.0.2.1 harness fixtures. Their cleanup therefore did not mutate a real customer subscription, but execution timing violated the frozen repository-first gate.

This produces a source-of-truth divergence:

```text
GITHUB_MAIN_HAS_BCA01_IMPLEMENTATION = false
SAME_BACKEND_HAS_BCA01_SCHEMA_RESIDUE = true
SAME_BACKEND_GITHUB_PARITY = false
```

No ad-hoc rollback is authorized by this evidence. The residue is preserved factually because an unplanned reverse DDL/DML action could destroy audit evidence or create additional architectural divergence.

## 6. Real tenant preservation

Direct post-corrective Same-Backend audit confirmed:

```text
REAL_TENANT_ID = 9664d189-4a12-4caa-8243-dc73383447e6
REAL_TENANT_SUBSCRIPTION_COUNT = 0
REAL_TENANT_PROVIDER_MAPPING_COUNT = 0
REAL_TENANT_MUTATION = false
```

No external Stripe proof, Stripe live mode, monetary charge or production billing cutover was established by the corrective audit.

## 7. Terminal governance decision

The implementation cannot be Accepted because all of the following are true:

```text
PRINCIPAL = consumed / rejected
CORRECTIVE = consumed / rejected
PROMPT_BUDGET = 2/2 consumed
THIRD_PROMPT = prohibited
GITHUB_IMPLEMENTATION_PR = absent
FILES_ALLOWED_HARD_GATE = failed
MANDATORY_DELIVERABLES = incomplete
RELEASE_GATE_BCA01_INTEGRATION = absent
UNAUTHORIZED_SAME_BACKEND_APPLICATION = occurred
GITHUB_SAME_BACKEND_PARITY = false
```

Terminal state:

```text
BCA01_PLANNING = Accepted / Merged / Closed
BCA01_IMPLEMENTATION = Rejected
BCA01_TERMINAL_ACCEPTED = false
BCA01_TERMINAL_STATE = Rejected
BCA01_SAME_BACKEND_RESIDUE = preserved / requires future explicit Architecture First decision
BCA01_THIRD_IMPLEMENTATION_PROMPT = prohibited
PRM3 = Planned — Blocked by BCA-01
PRM3_STARTED = false
```

A future recovery, if authorized by the Product Owner, must be treated as a new explicit Architecture First successor/recovery decision from the then-current GitHub `main`; it must not masquerade as a third BCA-01 corrective or automatically adopt the Lovable workspace implementation.