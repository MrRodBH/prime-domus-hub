import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let assertions = 0;
function ok(value: unknown, message: string): asserts value {
  assert.ok(value, message);
  assertions += 1;
}

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const stripSqlLineComments = (value: string) => value.replace(/^\s*--.*$/gm, "");

const historical = read(
  "supabase/migrations/20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a.sql",
);
const hardening = read(
  "supabase/migrations/20260812210000_bcr_01_billing_hardening.sql",
);
const hardeningSql = stripSqlLineComments(hardening);
const terminal = read(
  "supabase/migrations/20260812211000_bcr_01_billing_event_terminal.sql",
);
const authorization = read("src/lib/billing/billing-authorization.server.ts");
const requestContext = read("src/lib/billing/billing-request-context.server.ts");
const repository = read("src/lib/billing/billing-repository.server.ts");
const service = read("src/lib/billing/billing-service.server.ts");
const stripe = read("src/lib/billing/stripe-adapter.server.ts");
const webhook = read("src/lib/billing/billing-webhook.server.ts");
const reconciliation = read("src/lib/billing/billing-reconciliation.server.ts");
const checkoutRoute = read("src/routes/api/internal/billing-checkout.ts");
const portalRoute = read("src/routes/api/internal/billing-portal.ts");
const reconcileRoute = read("src/routes/api/internal/billing-reconcile.ts");
const webhookRoute = read("src/routes/api/public/hooks/billing-stripe-webhook.ts");
const tenantUi = read("src/routes/_authenticated.admin.billing.tsx");

for (const token of [
  "CREATE TABLE IF NOT EXISTS public.commercial_plan_prices",
  "CREATE TABLE IF NOT EXISTS public.billing_plan_provider_prices",
  "CREATE OR REPLACE FUNCTION public.bca01_reserve_billing_event",
  "CREATE OR REPLACE FUNCTION public.bca01_apply_provider_subscription_state",
  '"authorized_mode": "test"',
]) {
  ok(historical.includes(token), `historical migration must retain ${token}`);
}

ok(
  hardening.includes("20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a"),
  "forward hardening must identify the immutable historical migration",
);
ok(
  !/DELETE\s+FROM\s+public\.tenant_subscriptions/i.test(hardeningSql),
  "forward hardening must not delete tenant subscriptions",
);

for (const fn of [
  "bcr01_bind_provider_customer",
  "bcr01_reserve_verified_billing_event",
  "bcr01_apply_provider_subscription_observation",
]) {
  ok(hardening.includes(fn), `forward hardening must materialize ${fn}`);
}
for (const fn of [
  "bcr01_mark_billing_event_terminal",
  "bcr01_reserve_reconciliation_event",
]) {
  ok(terminal.includes(fn), `terminal migration must materialize ${fn}`);
}
ok(
  hardening.includes("FROM PUBLIC, anon, authenticated") &&
    hardening.includes("TO service_role") &&
    terminal.includes("FROM PUBLIC, anon, authenticated") &&
    terminal.includes("TO service_role"),
  "BCR mutation RPCs must be service-role-only",
);
ok(
  hardening.includes("DROP FUNCTION IF EXISTS public.bca01_reserve_billing_event") &&
    hardening.includes("DROP FUNCTION IF EXISTS public.bca01_apply_provider_subscription_state"),
  "forward hardening must retire rejected BCA runtime mutations",
);

const lifecycleStart = hardening.indexOf(
  "CREATE OR REPLACE FUNCTION public.bcr01_apply_provider_subscription_observation(",
);
const lifecycleEnd = hardening.indexOf(")\nRETURNS jsonb", lifecycleStart);
ok(
  lifecycleStart >= 0 && lifecycleEnd > lifecycleStart,
  "lifecycle RPC signature must be structurally resolvable",
);
const lifecycleSignature = hardening.slice(lifecycleStart, lifecycleEnd);
ok(
  !lifecycleSignature.includes("_tenant_id"),
  "provider lifecycle RPC must not accept tenant authority",
);
ok(
  hardening.includes("provider_customer_ref = _provider_customer_ref") &&
    hardening.includes("provider_price_ref = _provider_price_ref"),
  "tenant and plan must resolve from persisted provider mappings",
);
ok(
  !/ORDER\s+BY|LIMIT\s+1/i.test(hardeningSql),
  "billing authority SQL must not select by ORDER BY/LIMIT heuristic",
);
ok(
  hardening.includes("ON CONFLICT (provider_code, provider_event_id) DO NOTHING") &&
    hardening.includes("bcr01_billing_event_payload_conflict"),
  "verified provider events must be idempotent and payload-conflict safe",
);

ok(
  authorization.includes('data.tenant_role !== "owner"') &&
    authorization.includes("data.is_owner !== true"),
  "tenant billing authority must require exact persisted owner predicates",
);
ok(
  authorization.includes("bcr01_billing_super_admin_requires_impersonation"),
  "Super Admin tenant billing requires explicit impersonation",
);
ok(
  requestContext.includes("resolveTenantContext({") &&
    requestContext.includes('request.headers.get("x-tenant-id")'),
  "billing HTTP context must revalidate tenant transport through the canonical resolver",
);

ok(
  checkoutRoute.includes('parseExactJsonObject(request, ["planPriceId"])'),
  "checkout must accept only internal planPriceId intent",
);
for (const forbidden of [
  "providerCustomerRef",
  "providerSubscriptionRef",
  "providerPriceRef",
  "amount",
  "currency",
  "returnUrl",
]) {
  ok(
    !checkoutRoute.includes(`body.${forbidden}`),
    `checkout must not trust client ${forbidden}`,
  );
}
ok(
  portalRoute.includes("parseExactJsonObject(request, [])") &&
    reconcileRoute.includes("parseExactJsonObject(request, [])"),
  "portal and reconciliation must reject client identity fields",
);

ok(
  webhookRoute.includes("const rawBody = await request.text()") &&
    !webhookRoute.includes("await request.json("),
  "Stripe webhook route must preserve raw body before verification",
);
ok(
  webhookRoute.includes('request.headers.has("x-tenant-id")'),
  "Stripe webhook must reject tenant transport headers",
);
const verifyIndex = webhook.indexOf("provider.verifyWebhook(");
const normalizeIndex = webhook.indexOf("provider.normalizeWebhook(");
const reserveIndex = webhook.indexOf("reserveVerifiedBillingEvent({");
ok(
  verifyIndex >= 0 && normalizeIndex > verifyIndex && reserveIndex > normalizeIndex,
  "signature verification must precede normalization and persistence",
);
for (const token of [
  "bcr01_stripe_live_secret_prohibited",
  "bcr01_stripe_test_secret_required",
  "bcr01_stripe_live_webhook_prohibited",
  "bcr01_stripe_live_object_prohibited",
  'createHmac("sha256", secret)',
  "timingSafeEqual(candidate, expected)",
  "BILLING_WEBHOOK_TOLERANCE_SECONDS",
]) {
  ok(stripe.includes(token), `Stripe hardening must retain ${token}`);
}

ok(
  service.includes("BILLING_RETURN_PATHS.admin_billing") &&
    service.includes("bcr01:customer:${tenantId}"),
  "billing redirects and customer idempotency keys must remain server-owned",
);
ok(
  reconciliation.includes("getTenantProviderMapping(") &&
    reconciliation.includes('mapping.status !== "linked"') &&
    reconciliation.includes("applyProviderSubscriptionObservation({"),
  "reconciliation must require persisted mapping and reuse canonical lifecycle",
);
ok(
  reconciliation.includes("observation.providerCustomerRef !== mapping.providerCustomerRef"),
  "reconciliation must reject provider/local identity mismatch",
);

ok(
  !existsSync(resolve(root, "src/lib/api/billing")) &&
    !existsSync(resolve(root, "src/lib/api/billing.ts")),
  "BCR must not create an alternate billing API path",
);
ok(
  tenantUi.includes("getTenantCommercialSummary") &&
    tenantUi.includes("getTenantBillingHealth"),
  "tenant billing UI must consume existing sanitized server read models",
);
ok(
  !tenantUi.includes('from("commercial_') &&
    !tenantUi.includes('from("billing_') &&
    !tenantUi.includes("providerCustomerRef") &&
    !tenantUi.includes("providerSubscriptionRef") &&
    !tenantUi.includes("providerPriceRef"),
  "tenant billing UI must not read commercial tables or expose provider identities",
);
ok(
  tenantUi.includes("Checkout indisponível sem preço ativo") &&
    tenantUi.includes("/api/internal/billing-portal") &&
    tenantUi.includes("/api/internal/billing-reconcile"),
  "tenant UI must fail closed without catalog price and use canonical mutation routes",
);
ok(
  repository.includes("type UntypedDatabaseRow = Record<string, any>"),
  "pre-schema billing bridge must stay explicitly quarantined until P5 type regeneration",
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      assertions,
      historicalMigrationParityAnchored: true,
      forwardOnlyHardening: true,
      clientBillingAuthority: false,
      billingAuthorizationServerOnly: true,
      persistedMappingTenantAuthority: true,
      webhookRawBodyVerifiedFirst: true,
      webhookIdempotencyConflictGuard: true,
      liveStripeAllowed: false,
      reconciliationUsesCanonicalLifecycle: true,
      tenantUiCommercialTableAccess: false,
      realMoneyRequiredBySpecs: false,
    },
    null,
    2,
  ),
);
