// BCR-01 — provider-agnostic billing contracts.
//
// Isomorphic-safe vocabulary only: no provider SDK, secret, database or HTTP
// authority lives in this module.

export const BILLING_PROVIDER_CODES = ["stripe"] as const;
export type BillingProviderCode = (typeof BILLING_PROVIDER_CODES)[number];

export const BILLING_SUBSCRIPTION_STATES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "canceled",
] as const;
export type BillingSubscriptionState =
  (typeof BILLING_SUBSCRIPTION_STATES)[number];

export const NORMALIZED_BILLING_EVENT_TYPES = [
  "CheckoutCompleted",
  "SubscriptionCreated",
  "SubscriptionUpdated",
  "SubscriptionCanceled",
  "InvoicePaid",
  "InvoicePaymentFailed",
  "TrialEnding",
  "ChargeRefunded",
  "Unknown",
] as const;
export type NormalizedBillingEventType =
  (typeof NORMALIZED_BILLING_EVENT_TYPES)[number];

export type BillingOperation = "view" | "checkout" | "portal" | "reconcile";

/** Produced only after trusted server tenant resolution + billing authorization. */
export type BillingAuthorizationContext = {
  readonly tenantId: string;
  readonly actorUserId: string;
  readonly actorKind: "owner" | "super_admin";
  readonly operation: BillingOperation;
  readonly authority:
    | "active_tenant_owner"
    | "explicit_super_admin_impersonation";
};

/** Public checkout intent: internal catalog identity only. */
export type BillingCheckoutIntent = {
  readonly planPriceId: string;
  readonly returnContext: "admin_billing";
};

export type BillingCheckoutSession = {
  readonly providerSessionId: string;
  readonly redirectUrl: string;
};

export type BillingPortalSession = {
  readonly redirectUrl: string;
};

export type ProviderCustomerIdentity = {
  readonly providerCustomerRef: string;
};

export type ProviderSubscriptionObservation = {
  readonly providerSubscriptionRef: string;
  readonly providerCustomerRef: string;
  readonly providerPriceRef: string;
  readonly subscriptionState: BillingSubscriptionState;
  readonly requiresReconciliation: boolean;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly canceledAt: string | null;
  readonly observedAt: string;
};

export type NormalizedBillingEvent = {
  readonly providerCode: BillingProviderCode;
  readonly providerEventId: string;
  readonly eventType: NormalizedBillingEventType;
  readonly occurredAt: string | null;
  readonly payloadHash: string;
  readonly payloadSanitized: Record<string, unknown>;
  readonly providerCustomerRef: string | null;
  readonly providerSubscriptionRef: string | null;
  readonly providerPriceRef: string | null;
  readonly subscriptionState: BillingSubscriptionState | null;
  readonly requiresReconciliation: boolean;
  readonly currentPeriodStart: string | null;
  readonly currentPeriodEnd: string | null;
  readonly canceledAt: string | null;
};

export type BillingCatalogPrice = {
  readonly planId: string;
  readonly planCode: string;
  readonly planName: string;
  readonly planPriceId: string;
  readonly priceCode: string;
  readonly currency: string;
  readonly unitAmountMinor: number;
  readonly billingInterval: "month" | "year";
  readonly intervalCount: number;
  readonly providerCode: BillingProviderCode;
  readonly providerPriceRef: string;
};

export type TenantProviderMapping = {
  readonly mappingId: string;
  readonly tenantId: string;
  readonly providerCode: BillingProviderCode;
  readonly status: "draft" | "linked" | "disabled" | "archived";
  readonly providerCustomerRef: string | null;
  readonly providerSubscriptionRef: string | null;
  readonly subscriptionId: string | null;
};

export type BillingEventReservation = {
  readonly reserved: boolean;
  readonly duplicate: boolean;
  readonly eventId: string;
  readonly processingStatus: string;
};

export type BillingLifecycleApplication = {
  readonly applied: boolean;
  readonly reason?: string;
  readonly tenantId?: string;
  readonly subscriptionId?: string;
  readonly mappingId?: string;
  readonly planId?: string;
  readonly planPriceId?: string;
  readonly internalStatus?: BillingSubscriptionState;
  readonly eventStatus: string;
};

export type TenantBillingSnapshot = {
  readonly tenantId: string;
  readonly subscription: {
    readonly id: string;
    readonly planId: string | null;
    readonly status: string;
    readonly statusReason: string | null;
    readonly currentPeriodStart: string | null;
    readonly currentPeriodEnd: string | null;
  } | null;
  readonly plan: {
    readonly id: string;
    readonly code: string;
    readonly name: string;
  } | null;
  readonly provider: {
    readonly code: BillingProviderCode;
    readonly status: string;
    readonly linked: boolean;
  } | null;
};

export const BILLING_WEBHOOK_TOLERANCE_SECONDS = 300;

/** Return destinations are server-owned allowlist entries, never client URLs. */
export const BILLING_RETURN_PATHS = {
  admin_billing: "/admin/billing",
} as const;

export function isBillingProviderCode(
  value: unknown,
): value is BillingProviderCode {
  return (
    typeof value === "string" &&
    (BILLING_PROVIDER_CODES as readonly string[]).includes(value)
  );
}

export function assertPlanPriceId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error("bcr01_invalid_plan_price_intent");
  }
  return value;
}
