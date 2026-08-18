// BCR-01 - provider-agnostic billing port. Server-only.

import type {
  BillingCheckoutSession,
  BillingHostedInvoice,
  BillingPortalSession,
  BillingProviderCode,
  NormalizedBillingEvent,
  ProviderCustomerIdentity,
  ProviderInvoiceObservation,
  ProviderSubscriptionObservation,
} from "@/lib/billing/billing-contracts";

export class BillingPortError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "BillingPortError";
    this.code = code;
  }
}

export type EnsureProviderCustomerInput = {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly idempotencyKey: string;
};

export type CreateCheckoutSessionInput = {
  readonly tenantId: string;
  readonly providerCustomerRef: string;
  readonly providerPriceRef: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly idempotencyKey: string;
};

export type CreateCustomerPortalSessionInput = {
  readonly providerCustomerRef: string;
  readonly returnUrl: string;
};

export type CreateStandaloneInvoiceInput = {
  readonly providerCustomerRef: string;
  readonly chargeIntentId: string;
  readonly currency: string;
  readonly items: readonly {
    readonly itemId: string;
    readonly description: string;
    readonly amountTotalMinor: number;
  }[];
  readonly idempotencyKey: string;
};

export type VerifiedProviderWebhook = {
  readonly providerEventId: string;
  readonly providerEventType: string;
  readonly occurredAt: string | null;
  readonly payload: unknown;
  readonly payloadHash: string;
};

export interface BillingProvider {
  readonly code: BillingProviderCode;

  ensureCustomer(
    input: EnsureProviderCustomerInput,
  ): Promise<ProviderCustomerIdentity>;

  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<BillingCheckoutSession>;

  createCustomerPortalSession(
    input: CreateCustomerPortalSessionInput,
  ): Promise<BillingPortalSession>;

  createStandaloneInvoice(
    input: CreateStandaloneInvoiceInput,
  ): Promise<BillingHostedInvoice>;

  verifyWebhook(
    rawBody: string,
    signatureHeader: string | null,
  ): Promise<VerifiedProviderWebhook>;

  normalizeWebhook(
    verified: VerifiedProviderWebhook,
  ): NormalizedBillingEvent;

  resolveInvoiceByPaymentRef(
    providerPaymentRef: string,
  ): Promise<string | null>;

  retrieveSubscription(
    providerSubscriptionRef: string,
  ): Promise<ProviderSubscriptionObservation>;

  retrieveInvoice(
    providerInvoiceRef: string,
  ): Promise<ProviderInvoiceObservation>;
}

const providerOverrides = new Map<BillingProviderCode, BillingProvider>();

/** Deterministic test seam; never a runtime provider-selection fallback. */
export function setBillingProviderOverride(
  code: BillingProviderCode,
  provider: BillingProvider | null,
): void {
  if (provider === null) providerOverrides.delete(code);
  else providerOverrides.set(code, provider);
}

/**
 * Single provider registry boundary. The initial implementation supports Stripe,
 * while commercial/domain contracts remain provider-agnostic under ADR-006.
 */
export async function resolveBillingProvider(
  code: BillingProviderCode,
): Promise<BillingProvider> {
  const override = providerOverrides.get(code);
  if (override) return override;

  if (code === "stripe") {
    const { createStripeBillingProvider } = await import(
      "@/lib/billing/stripe-adapter.server"
    );
    return createStripeBillingProvider();
  }

  throw new BillingPortError("bcr01_unknown_billing_provider");
}
