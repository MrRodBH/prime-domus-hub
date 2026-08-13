// BCR-01 â€” explicit provider reconciliation through the canonical lifecycle.
// Server-only. Tenant/provider identity is resolved from persisted mapping.

import { createHash } from "node:crypto";
import type {
  BillingAuthorizationContext,
  BillingChargeLifecycleApplication,
  BillingLifecycleApplication,
  NormalizedBillingEventType,
  ProviderInvoiceObservation,
  ProviderSubscriptionObservation,
} from "@/lib/billing/billing-contracts";
import { resolveBillingProvider } from "@/lib/billing/billing-port.server";
import {
  applyProviderSubscriptionObservation,
  getTenantProviderMapping,
} from "@/lib/billing/billing-repository.server";
import {
  applyProviderInvoiceObservation,
  getTenantChargeIntent,
} from "@/lib/billing/billing-charge-repository.server";
import { reserveReconciliationBillingEvent } from "@/lib/billing/billing-event-repository.server";
import { ACTIVE_BILLING_PROVIDER } from "@/lib/billing/billing-service.server";

export class BillingReconciliationError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingReconciliationError";
    this.code = code;
  }
}

function requireReconcileAuthorization(
  authorization: BillingAuthorizationContext,
): void {
  if (authorization.operation !== "reconcile") {
    throw new BillingReconciliationError(
      "bcr01_reconciliation_operation_context_mismatch",
    );
  }
}

function canonicalSubscriptionObservationPayload(
  observation: ProviderSubscriptionObservation,
): Record<string, unknown> {
  return {
    providerSubscriptionRef: observation.providerSubscriptionRef,
    providerCustomerRef: observation.providerCustomerRef,
    providerPriceRef: observation.providerPriceRef,
    subscriptionState: observation.subscriptionState,
    requiresReconciliation: observation.requiresReconciliation,
    currentPeriodStart: observation.currentPeriodStart,
    currentPeriodEnd: observation.currentPeriodEnd,
    canceledAt: observation.canceledAt,
  };
}

function canonicalInvoiceObservationPayload(
  observation: ProviderInvoiceObservation,
): Record<string, unknown> {
  return {
    providerInvoiceRef: observation.providerInvoiceRef,
    providerCustomerRef: observation.providerCustomerRef,
    providerSubscriptionRef: observation.providerSubscriptionRef,
    providerPaymentRef: observation.providerPaymentRef,
    status: observation.status,
    amountPaidMinor: observation.amountPaidMinor,
    currency: observation.currency,
  };
}

function hashCanonicalPayload(payload: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex");
}

function reconciliationInvoiceEventType(
  observation: ProviderInvoiceObservation,
): NormalizedBillingEventType {
  switch (observation.status) {
    case "paid":
      return "InvoicePaid";
    case "failed":
      return "InvoicePaymentFailed";
    case "refunded":
      return "ChargeRefunded";
    case "open":
    case "void":
      return "Unknown";
  }
}

export async function reconcileTenantBilling(
  authorization: BillingAuthorizationContext,
): Promise<BillingLifecycleApplication> {
  requireReconcileAuthorization(authorization);

  const mapping = await getTenantProviderMapping(
    authorization.tenantId,
    ACTIVE_BILLING_PROVIDER,
  );
  if (
    !mapping ||
    mapping.status !== "linked" ||
    !mapping.providerCustomerRef ||
    !mapping.providerSubscriptionRef
  ) {
    throw new BillingReconciliationError(
      "bcr01_reconciliation_linked_provider_mapping_required",
    );
  }

  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);
  const observation = await provider.retrieveSubscription(
    mapping.providerSubscriptionRef,
  );

  if (
    observation.providerCustomerRef !== mapping.providerCustomerRef ||
    observation.providerSubscriptionRef !== mapping.providerSubscriptionRef
  ) {
    throw new BillingReconciliationError(
      "bcr01_reconciliation_provider_identity_mismatch",
    );
  }

  const payload = canonicalSubscriptionObservationPayload(observation);
  const payloadHash = hashCanonicalPayload(payload);
  const providerEventId =
    `reconcile:${mapping.providerSubscriptionRef}:${payloadHash}`;

  const reservation = await reserveReconciliationBillingEvent({
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerEventId,
    eventType: "SubscriptionUpdated",
    payloadHash,
    payloadSanitized: {
      source: "server_reconciliation",
      subscriptionState: observation.subscriptionState,
      providerSubscriptionRef: mapping.providerSubscriptionRef,
      providerPriceRef: observation.providerPriceRef,
    },
    occurredAt: observation.observedAt,
  });

  if (
    reservation.duplicate &&
    ["processed", "ignored", "reconciled"].includes(
      reservation.processingStatus,
    )
  ) {
    return {
      applied: false,
      reason: "already_terminal",
      tenantId: authorization.tenantId,
      subscriptionId: mapping.subscriptionId ?? undefined,
      mappingId: mapping.mappingId,
      eventStatus: reservation.processingStatus,
    };
  }

  return applyProviderSubscriptionObservation({
    eventId: reservation.eventId,
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerCustomerRef: mapping.providerCustomerRef,
    providerSubscriptionRef: mapping.providerSubscriptionRef,
    providerPriceRef: observation.providerPriceRef,
    internalState: observation.subscriptionState,
    requiresReconciliation: observation.requiresReconciliation,
    providerObservedAt: observation.observedAt,
    currentPeriodStart: observation.currentPeriodStart,
    currentPeriodEnd: observation.currentPeriodEnd,
    canceledAt: observation.canceledAt,
  });
}

export async function reconcileTenantCharge(
  authorization: BillingAuthorizationContext,
  chargeIntentId: string,
): Promise<BillingChargeLifecycleApplication> {
  requireReconcileAuthorization(authorization);

  const charge = await getTenantChargeIntent(
    authorization.tenantId,
    chargeIntentId,
    ACTIVE_BILLING_PROVIDER,
  );
  if (!charge.providerInvoiceRef) {
    throw new BillingReconciliationError(
      "bcr01_charge_reconciliation_provider_invoice_required",
    );
  }

  const mapping = await getTenantProviderMapping(
    authorization.tenantId,
    ACTIVE_BILLING_PROVIDER,
  );
  if (
    !mapping ||
    (mapping.status !== "draft" && mapping.status !== "linked") ||
    !mapping.providerCustomerRef
  ) {
    throw new BillingReconciliationError(
      "bcr01_charge_reconciliation_customer_mapping_required",
    );
  }

  const provider = await resolveBillingProvider(ACTIVE_BILLING_PROVIDER);
  const observation = await provider.retrieveInvoice(
    charge.providerInvoiceRef,
  );

  if (
    observation.providerInvoiceRef !== charge.providerInvoiceRef ||
    observation.providerCustomerRef !== mapping.providerCustomerRef ||
    observation.providerSubscriptionRef !== null
  ) {
    throw new BillingReconciliationError(
      "bcr01_charge_reconciliation_provider_identity_mismatch",
    );
  }

  if (
    observation.currency &&
    observation.currency !== charge.currency
  ) {
    throw new BillingReconciliationError(
      "bcr01_charge_reconciliation_currency_mismatch",
    );
  }

  if (
    observation.status === "paid" &&
    observation.amountPaidMinor !== charge.amountTotalMinor
  ) {
    throw new BillingReconciliationError(
      "bcr01_charge_reconciliation_amount_mismatch",
    );
  }

  const payload = canonicalInvoiceObservationPayload(observation);
  const payloadHash = hashCanonicalPayload(payload);
  const providerEventId =
    `reconcile:invoice:${charge.providerInvoiceRef}:${payloadHash}`;

  const reservation = await reserveReconciliationBillingEvent({
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerEventId,
    eventType: reconciliationInvoiceEventType(observation),
    payloadHash,
    payloadSanitized: {
      source: "server_reconciliation",
      providerInvoiceRef: charge.providerInvoiceRef,
      chargeType: charge.chargeType,
      status: observation.status,
    },
    occurredAt: observation.observedAt,
  });

  if (
    reservation.duplicate &&
    ["processed", "ignored", "reconciled"].includes(
      reservation.processingStatus,
    )
  ) {
    return {
      applied: false,
      reason: "already_terminal",
      tenantId: authorization.tenantId,
      chargeIntentId: charge.chargeIntentId,
      chargeStatus: charge.status,
      eventStatus: reservation.processingStatus,
    };
  }

  return applyProviderInvoiceObservation({
    eventId: reservation.eventId,
    providerCode: ACTIVE_BILLING_PROVIDER,
    providerInvoiceRef: charge.providerInvoiceRef,
    providerPaymentRef: observation.providerPaymentRef,
    targetStatus: observation.status,
    providerObservedAt: observation.observedAt,
  });
}
