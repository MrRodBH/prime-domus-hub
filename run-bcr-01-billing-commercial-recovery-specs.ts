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
const stripSqlLineComments = (value: string) =>
  value.replace(/^\s*--.*$/gm, "");

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
const hybrid = read(
  "supabase/migrations/20260812212000_bcr_01_hybrid_billing.sql",
);
const authorization = read("src/lib/billing/billing-authorization.server.ts");
const requestContext = read("src/lib/billing/billing-request-context.server.ts");
const contracts = read("src/lib/billing/billing-contracts.ts");
const repository = read("src/lib/billing/billing-repository.server.ts");
const chargeRepository = read(
  "src/lib/billing/billing-charge-repository.server.ts",
);
const service = read("src/lib/billing/billing-service.server.ts");
const port = read("src/lib/billing/billing-port.server.ts");
const stripe = read("src/lib/billing/stripe-adapter.server.ts");
const webhook = read("src/lib/billing/billing-webhook.server.ts");
const reconciliation = read("src/lib/billing/billing-reconciliation.server.ts");
const metrics = read("src/lib/billing/billing-metrics.server.ts");
const checkoutRoute = read("src/routes/api/internal/billing-checkout.ts");
const invoiceRoute = read("src/routes/api/internal/billing-invoice.ts");
const chargesRoute = read("src/routes/api/internal/billing-charges.ts");
const portalRoute = read("src/routes/api/internal/billing-portal.ts");
const reconcileRoute = read("src/routes/api/internal/billing-reconcile.ts");
const webhookRoute = read(
  "src/routes/api/public/hooks/billing-stripe-webhook.ts",
);
const tenantUi = read("src/routes/_authenticated.admin.billing.tsx");
const pkg = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
};

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
  hardening.includes(
    "20260812192006_0d1477a8-4e56-4fde-a4e0-9bb6cfba394a",
  ),
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
for (const fn of [
  "bcr01_create_commercial_charge",
  "bcr01_bind_charge_provider_invoice",
  "bcr01_apply_provider_invoice_observation",
]) {
  ok(hybrid.includes(fn), `hybrid migration must materialize ${fn}`);
}

ok(
  hardening.includes("FROM PUBLIC, anon, authenticated") &&
    hardening.includes("TO service_role") &&
    terminal.includes("FROM PUBLIC, anon, authenticated") &&
    terminal.includes("TO service_role") &&
    hybrid.includes("FROM PUBLIC, anon, authenticated") &&
    hybrid.includes("TO service_role"),
  "BCR mutation RPCs must be service-role-only",
);
ok(
  hardening.includes("DROP FUNCTION IF EXISTS public.bca01_reserve_billing_event") &&
    hardening.includes(
      "DROP FUNCTION IF EXISTS public.bca01_apply_provider_subscription_state",
    ),
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
  hardening.includes(
    "ON CONFLICT (provider_code, provider_event_id) DO NOTHING",
  ) && hardening.includes("bcr01_billing_event_payload_conflict"),
  "verified provider events must be idempotent and payload-conflict safe",
);

for (const chargeType of [
  "setup",
  "milestone",
  "customization",
  "on_demand",
]) {
  ok(
    contracts.includes(`"${chargeType}"`) && hybrid.includes(`'${chargeType}'`),
    `hybrid billing must retain ${chargeType} charge type`,
  );
}

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
  "billing HTTP context must revalidate tenant transport through canonical resolver",
);

ok(
  checkoutRoute.includes(
    'parseExactJsonObject(request, ["planPriceId"])',
  ),
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
  portalRoute.includes("parseExactJsonObject(request, [])"),
  "portal must reject all client identity fields",
);
ok(
  reconcileRoute.includes(
    'parseExactJsonObject(request, ["chargeIntentId"])',
  ),
  "reconciliation may accept only internal chargeIntentId",
);
for (const forbidden of [
  "tenantId",
  "providerCustomerRef",
  "providerSubscriptionRef",
  "providerInvoiceRef",
  "providerPaymentRef",
  "amount",
  "currency",
]) {
  ok(
    !reconcileRoute.includes(`body.${forbidden}`),
    `reconciliation must not trust client ${forbidden}`,
  );
}

ok(
  invoiceRoute.includes(
    'parseExactJsonObject(request, ["chargeIntentId"])',
  ) &&
    invoiceRoute.includes(
      'resolveAuthorizedBillingRequest(\n            request,\n            "invoice"',
    ),
  "one-time invoice route must accept only internal chargeIntentId after server authorization",
);
for (const forbidden of [
  "tenantId",
  "providerCustomerRef",
  "providerInvoiceRef",
  "amount",
  "currency",
  "items",
  "returnUrl",
]) {
  ok(
    !invoiceRoute.includes(`body.${forbidden}`),
    `one-time invoice route must not trust client ${forbidden}`,
  );
}
ok(
  chargesRoute.includes(
    'resolveAuthorizedBillingRequest(\n            request,\n            "view"',
  ) &&
    chargesRoute.includes("listTenantChargeIntents(") &&
    !chargesRoute.includes("providerInvoiceRef:"),
  "tenant charge visibility must be server-authorized and sanitized",
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
  verifyIndex >= 0 &&
    normalizeIndex > verifyIndex &&
    reserveIndex > normalizeIndex,
  "signature verification must precede normalization and persistence",
);

ok(
  pkg.dependencies?.stripe === "22.5.0",
  "official Stripe SDK must be pinned exactly",
);
for (const token of [
  'import Stripe from "stripe"',
  "bcr01_stripe_live_secret_prohibited",
  "bcr01_stripe_test_secret_required",
  "bcr01_stripe_live_webhook_prohibited",
  "bcr01_stripe_live_object_prohibited",
  "stripe.webhooks.constructEvent(",
  "BILLING_WEBHOOK_TOLERANCE_SECONDS",
  "stripe.invoices.create(",
  "stripe.invoiceItems.create(",
  "stripe.invoices.finalizeInvoice(",
  "stripe.invoices.sendInvoice(",
  "stripe.invoices.retrieve(",
]) {
  ok(stripe.includes(token), `Stripe SDK hardening must retain ${token}`);
}
ok(
  stripe.includes("process.env.STRIPE_SECRET_KEY") &&
    stripe.includes("process.env.STRIPE_WEBHOOK_SECRET") &&
    !stripe.includes("STRIPE_SECRET_KEY_BCA01") &&
    !stripe.includes("STRIPE_WEBHOOK_SECRET_BCA01"),
  "Stripe runtime must use canonical BCR secret names only",
);
ok(
  !stripe.includes("https://api.stripe.com") &&
    !stripe.includes('createHmac("sha256"') &&
    !stripe.includes("timingSafeEqual("),
  "Stripe provider calls/signature verification must use the official SDK",
);

ok(
  port.includes("createStandaloneInvoice(") &&
    port.includes("retrieveInvoice("),
  "single BillingProvider port must expose subscription and standalone invoice capabilities",
);
ok(
  service.includes("BILLING_RETURN_PATHS.admin_billing") &&
    service.includes("bcr01:customer:${tenantId}"),
  "billing redirects and customer idempotency keys must remain server-owned",
);
ok(
  service.includes("getTenantChargeIntent(") &&
    service.includes("provider.createStandaloneInvoice({") &&
    service.includes("bindChargeProviderInvoice({"),
  "one-time collection must flow through BillingService, BillingProvider and persisted mapping",
);
ok(
  !service.includes("entitlement") &&
    !chargeRepository.includes("entitlement"),
  "one-time payment path must not mutate or couple entitlements",
);

ok(
  webhook.includes("getChargeByProviderInvoice({") &&
    webhook.includes("getProviderMappingBySubscription({") &&
    webhook.includes("bcr01_provider_invoice_mapping_ambiguous") &&
    webhook.includes("applyProviderInvoiceObservation({"),
  "invoice webhook lifecycle must route only through persisted mappings and fail on ambiguity",
);
for (const eventType of [
  "InvoicePaid",
  "InvoicePaymentFailed",
  "ChargeRefunded",
]) {
  ok(
    webhook.includes(`event.eventType === "${eventType}"`) ||
      webhook.includes(`case "${eventType}"`),
    `webhook must explicitly handle ${eventType}`,
  );
}

ok(
  reconciliation.includes("getTenantProviderMapping(") &&
    reconciliation.includes('mapping.status !== "linked"') &&
    reconciliation.includes("applyProviderSubscriptionObservation({"),
  "recurring reconciliation must require persisted mapping and canonical lifecycle",
);
ok(
  reconciliation.includes(
    "observation.providerCustomerRef !== mapping.providerCustomerRef",
  ),
  "reconciliation must reject provider/local identity mismatch",
);
ok(
  reconciliation.includes("export async function reconcileTenantCharge(") &&
    reconciliation.includes("provider.retrieveInvoice(") &&
    reconciliation.includes("applyProviderInvoiceObservation({"),
  "non-recurring invoice reconciliation must reuse canonical invoice lifecycle",
);
ok(
  reconciliation.includes("bcr01_charge_reconciliation_amount_mismatch") &&
    reconciliation.includes("bcr01_charge_reconciliation_currency_mismatch"),
  "non-recurring reconciliation must fail closed on amount/currency mismatch",
);

for (const token of [
  "commercial_charge_intents",
  "chargeTypeCounts",
  "testModePaidAmountMinorByChargeType",
  "productionRealizedRevenueMinor: null",
  "test_mode_observation_only_production_realized_revenue_not_claimed",
]) {
  ok(
    metrics.includes(token),
    `hybrid metrics must retain explicit semantic token ${token}`,
  );
}

ok(
  !existsSync(resolve(root, "src/lib/api/billing")) &&
    !existsSync(resolve(root, "src/lib/api/billing.ts")),
  "BCR must not create an alternate billing API path",
);
ok(
  tenantUi.includes("getTenantCommercialSummary") &&
    tenantUi.includes("getTenantBillingHealth") &&
    tenantUi.includes("/api/internal/billing-charges") &&
    tenantUi.includes("/api/internal/billing-invoice"),
  "tenant billing UI must expose recurring and non-recurring server-owned flows",
);
ok(
  !tenantUi.includes('from("commercial_') &&
    !tenantUi.includes('from("billing_') &&
    !tenantUi.includes("providerCustomerRef") &&
    !tenantUi.includes("providerSubscriptionRef") &&
    !tenantUi.includes("providerPriceRef") &&
    !tenantUi.includes("providerInvoiceRef"),
  "tenant billing UI must not read commercial tables or expose provider identities",
);
ok(
  tenantUi.includes("Checkout indisponível sem preço ativo") &&
    tenantUi.includes("/api/internal/billing-portal") &&
    tenantUi.includes("/api/internal/billing-reconcile"),
  "tenant UI must fail closed without catalog price and use canonical mutation routes",
);
ok(
  tenantUi.includes("getImpersonationTenantId()") &&
    tenantUi.includes("resolveTenantTransportHeader({"),
  "Super Admin visibility remains tenant-scoped through explicit impersonation transport revalidated by server",
);
ok(
  repository.includes("type UntypedDatabaseRow = Record<string, any>") &&
    chargeRepository.includes("type Row = Record<string, any>"),
  "pre-schema billing bridges must stay explicitly quarantined until P5 type regeneration",
);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      assertions,
      historicalMigrationParityAnchored: true,
      forwardOnlyHardening: true,
      hybridBillingExplicit: true,
      clientBillingAuthority: false,
      billingAuthorizationServerOnly: true,
      persistedMappingTenantAuthority: true,
      persistedMappingInvoiceAuthority: true,
      webhookRawBodyVerifiedFirst: true,
      webhookIdempotencyConflictGuard: true,
      officialStripeSdkPinned: true,
      liveStripeAllowed: false,
      recurringReconciliationUsesCanonicalLifecycle: true,
      nonRecurringReconciliationUsesCanonicalLifecycle: true,
      oneTimeEntitlementCoupling: false,
      metricsRecurringVsNonRecurringSemantics: true,
      metricsTestVsRealSemantics: true,
      tenantUiCommercialTableAccess: false,
      tenantNonRecurringVisibility: true,
      superAdminRequiresExplicitImpersonation: true,
      realMoneyRequiredBySpecs: false,
    },
    null,
    2,
  ),
);
