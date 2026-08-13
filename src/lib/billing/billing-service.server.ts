// BCR-01 — provider-agnostic billing orchestration. Server-only.
//
// Order is deliberate: trusted tenant authorization happens before every
// tenant-scoped commercial action. Price/customer/provider identities are
// resolved server-side; no client amount/currency/provider reference/URL is
// accepted as authority.

import { randomUUID } from "node:crypto";
import {
  BILLING_RETURN_PATHS,
  type BillingAuthorizationContext,
  type BillingCheckoutSession,
  type BillingHostedInvoice,
  type BillingPortalSession,
  type BillingProviderCode,
  type TenantBillingSnapshot,
} from "@/lib/billing/billing-contracts";
import { resolveBillingProvider } from "@/lib/billing/billing-port.server";
import {
  bindTenantProviderCustomer,
  getTenantBillingSnapshot,
  getTenantName,
  getTenantProviderMapping,
  resolveBillingCatalogPrice,
} from "@/lib/billing/billing-repository.server";import {
  bindChargeProviderInvoice,
  getTenantChargeIntent,
} from "@/lib/billing/billing-charge-repository.server";

export const ACTIVE_BILLING_PROVIDER: BillingProviderCode = "stripe";

export class BillingServiceError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingServiceError";
    this.code = code;
  }
}

const PRODUCTION_HOSTS = new Set([
  "realone.com.br",
  "www.realone.com.br",
  "mrrod.com.br",
  "www.mrrod.com.br",
]);
const DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1"]);

function requirePublicBaseUrl(): string {
  const raw =
    process.env.BCR01_PUBLIC_BASE_URL ??
    process.env.PUBLIC_SITE_URL ??
    process.env.APP_URL;
  if (!raw) throw new BillingServiceError("bcr01_public_base_url_absent");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BillingServiceError("bcr01_public_base_url_invalid");
  }

  const hostAllowed =
    PRODUCTION_HOSTS.has(url.hostname) || DEVELOPMENT_HOSTS.has(url.hostname);
  const protocolAllowed =
    url.protocol === "https:" ||
    (url.protocol === "http:" && DEVELOPMENT_HOSTS.has(url.hostname));

  if (!hostAllowed || !protocolAllowed || url.username || url.password) {
    throw new BillingServiceError("bcr01_public_base_url_not_allowed");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function returnUrl(kind: "success" | "cancel" | "portal"): string {
  const base = requirePublicBaseUrl();
  const suffix = new URL(BILLING_RETURN_PATHS.admin_billing, `${base}/`);
  suffix.searchParams.set("billing", kind);
  return suffix.toString();
}

function requireOperation(
  authorization: BillingAuthorizationContext,
  expected: BillingAuthorizationContext["operation"],
): void {
  if (authorization.operation !== expected) {
    throw new BillingServiceError("bcr01_billing_operation_context_mismatch");
  }
}

async function ensureProviderCustomerRef(tenantId: string): Promise<string> {
  const existing = await getTenantProviderMapping(
    tenantId,
    ACTIVE_BILLING_PROVIDER,
  );
  if (
    existing?.providerCustomerRef &&
    (existing.status === "draft" || existing.status === "linked")
  ) {
    return existing.providerCustomerRef;
  }
  if (existing && existing.status !== "draft" && existing.status !== "linked") {
    throw new BillingServiceError("bcr01_provider_mapping_not_operable");
  }

  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);
  const identity = await provider.ensureCustomer({
    tenantId,
    tenantName: await getTenantName(tenantId),
    // Stable server-owned key makes retries converge on one provider customer.
    idempotencyKey: `bcr01:customer:${tenantId}`,
  });

  const mapping = await bindTenantProviderCustomer({
    tenantId,
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerCustomerRef: identity.providerCustomerRef,
  });

  if (!mapping.providerCustomerRef) {
    throw new BillingServiceError("bcr01_provider_customer_binding_missing");
  }
  return mapping.providerCustomerRef;
}

export async function getAuthorizedTenantBillingSnapshot(
  authorization: BillingAuthorizationContext,
): Promise<TenantBillingSnapshot> {
  requireOperation(authorization, "view");
  return getTenantBillingSnapshot(
    authorization.tenantId,
    ACTIVE_BILLING_PROVIDER,
  );
}

export async function startBillingCheckout(
  authorization: BillingAuthorizationContext,
  planPriceId: string,
): Promise<BillingCheckoutSession> {
  requireOperation(authorization, "checkout");

  const price = await resolveBillingCatalogPrice(
    planPriceId,
    ACTIVE_BILLING_PROVIDER,
  );
  const customerRef = await ensureProviderCustomerRef(authorization.tenantId);
  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);

  return provider.createCheckoutSession({
    tenantId: authorization.tenantId,
    providerCustomerRef: customerRef,
    providerPriceRef: price.providerPriceRef,
    successUrl: returnUrl("success"),
    cancelUrl: returnUrl("cancel"),
    idempotencyKey: `bcr01:checkout:${authorization.tenantId}:${price.planPriceId}:${randomUUID()}`,
  });
}

export async function openBillingPortal(
  authorization: BillingAuthorizationContext,
): Promise<BillingPortalSession> {
  requireOperation(authorization, "portal");

  const mapping = await getTenantProviderMapping(
    authorization.tenantId,
    ACTIVE_BILLING_PROVIDER,
  );
  if (
    !mapping?.providerCustomerRef ||
    (mapping.status !== "draft" && mapping.status !== "linked")
  ) {
    throw new BillingServiceError("bcr01_provider_customer_identity_absent");
  }

  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);
  return provider.createCustomerPortalSession({
    providerCustomerRef: mapping.providerCustomerRef,
    returnUrl: returnUrl("portal"),
  });
}
export async function startBillingInvoice(
  authorization: BillingAuthorizationContext,
  chargeIntentId: string,
): Promise<BillingHostedInvoice> {
  requireOperation(authorization, "invoice");

  const charge = await getTenantChargeIntent(
    authorization.tenantId,
    chargeIntentId,
    ACTIVE_BILLING_PROVIDER,
  );

  if (
    charge.status === "paid" ||
    charge.status === "void" ||
    charge.status === "refunded"
  ) {
    throw new BillingServiceError("bcr01_charge_not_invoiceable");
  }

  const customerRef = await ensureProviderCustomerRef(authorization.tenantId);
  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);

  if (charge.providerInvoiceRef) {
    const observation = await provider.retrieveInvoice(
      charge.providerInvoiceRef,
    );
    if (
      observation.providerInvoiceRef !== charge.providerInvoiceRef ||
      observation.providerCustomerRef !== customerRef ||
      observation.providerSubscriptionRef !== null
    ) {
      throw new BillingServiceError(
        "bcr01_charge_provider_invoice_identity_mismatch",
      );
    }
    if (!observation.hostedInvoiceUrl) {
      throw new BillingServiceError(
        "bcr01_charge_provider_invoice_url_absent",
      );
    }
    return {
      providerInvoiceRef: observation.providerInvoiceRef,
      redirectUrl: observation.hostedInvoiceUrl,
    };
  }

  if (charge.status !== "draft") {
    throw new BillingServiceError(
      "bcr01_charge_without_provider_invoice_not_draft",
    );
  }

  const hostedInvoice = await provider.createStandaloneInvoice({
    providerCustomerRef: customerRef,
    chargeIntentId: charge.chargeIntentId,
    currency: charge.currency,
    items: charge.items.map((item) => ({
      itemId: item.itemId,
      description: item.description,
      amountTotalMinor: item.amountTotalMinor,
    })),
    idempotencyKey:
      `bcr01:charge:${charge.chargeIntentId}:${charge.idempotencyKey}`,
  });

  await bindChargeProviderInvoice({
    chargeIntentId: charge.chargeIntentId,
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerCustomerRef: customerRef,
    providerInvoiceRef: hostedInvoice.providerInvoiceRef,
  });

  return hostedInvoice;
}
