// BCR-01 - canonical verified Stripe webhook orchestration. Server-only.
//
// Security order is fixed and tested:
// raw body -> provider signature/timestamp verification -> normalization ->
// idempotency reservation -> persisted mapping resolution -> lifecycle.
// Provider metadata, client input and webhook tenant fields are never authority.

import type {
  BillingChargeStatus,
  BillingLifecycleApplication,
  ProviderInvoiceObservation,
  BillingProviderCode,
  NormalizedBillingEvent,
} from "@/lib/billing/billing-contracts";
import {
  resolveBillingProvider,
  type BillingProvider,
} from "@/lib/billing/billing-port.server";
import {
  applyProviderSubscriptionObservation,
  getProviderMappingBySubscription,
} from "@/lib/billing/billing-repository.server";
import {
  applyProviderInvoiceObservation,
  getChargeByProviderInvoice,
} from "@/lib/billing/billing-charge-repository.server";
import { markBillingEventTerminal } from "@/lib/billing/billing-event-repository.server";
import { reserveVerifiedBillingEvent } from "@/lib/billing/billing-repository.server";

export class BillingWebhookError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingWebhookError";
    this.code = code;
  }
}

export type BillingWebhookResult = {
  readonly ok: true;
  readonly duplicate: boolean;
  readonly eventId: string;
  readonly eventStatus: string;
  readonly lifecycleApplied: boolean;
};

const TERMINAL_EVENT_STATUSES = new Set([
  "processed",
  "ignored",
  "reconciled",
]);

function requireLifecycleEvidence(event: NormalizedBillingEvent): {
  providerCustomerRef: string;
  providerSubscriptionRef: string;
  providerPriceRef: string;
  subscriptionState: NonNullable<NormalizedBillingEvent["subscriptionState"]>;
  providerObservedAt: string;
} {
  if (
    !event.providerCustomerRef ||
    !event.providerSubscriptionRef ||
    !event.providerPriceRef ||
    !event.subscriptionState ||
    !event.occurredAt
  ) {
    throw new BillingWebhookError(
      "bcr01_webhook_lifecycle_evidence_incomplete",
    );
  }
  return {
    providerCustomerRef: event.providerCustomerRef,
    providerSubscriptionRef: event.providerSubscriptionRef,
    providerPriceRef: event.providerPriceRef,
    subscriptionState: event.subscriptionState,
    providerObservedAt: event.occurredAt,
  };
}

function isSubscriptionLifecycleEvent(event: NormalizedBillingEvent): boolean {
  return (
    event.eventType === "SubscriptionCreated" ||
    event.eventType === "SubscriptionUpdated" ||
    event.eventType === "SubscriptionCanceled"
  );
}

function isProviderInvoiceLifecycleEvent(
  event: NormalizedBillingEvent,
): boolean {
  return (
    event.eventType === "InvoicePaid" ||
    event.eventType === "InvoicePaymentFailed" ||
    event.eventType === "ChargeRefunded"
  );
}

function targetChargeStatus(
  event: NormalizedBillingEvent,
): Exclude<BillingChargeStatus, "draft"> {
  switch (event.eventType) {
    case "InvoicePaid":
      return "paid";
    case "InvoicePaymentFailed":
      return "failed";
    default:
      throw new BillingWebhookError(
        "bcr01_provider_invoice_event_type_invalid",
      );
  }
}

async function terminalizeNoDirectLifecycleEffect(
  eventId: string,
  event: NormalizedBillingEvent,
  reasonOverride?: string,
): Promise<BillingWebhookResult> {
  const reason =
    reasonOverride ??
    (event.eventType === "Unknown"
      ? "bcr01_unhandled_provider_event"
      : "bcr01_event_no_direct_lifecycle_effect");
  const result = await markBillingEventTerminal({
    eventId,
    toStatus: "ignored",
    reason,
  });
  return {
    ok: true,
    duplicate: false,
    eventId,
    eventStatus: result.processingStatus,
    lifecycleApplied: false,
  };
}

async function processProviderInvoiceLifecycle(input: {
  eventId: string;
  event: NormalizedBillingEvent;
  provider: BillingProvider;
}): Promise<BillingWebhookResult> {
  const { event, eventId, provider } = input;
  if (!event.occurredAt) {
    throw new BillingWebhookError(
      "bcr01_provider_invoice_lifecycle_evidence_incomplete",
    );
  }

  let providerInvoiceRef = event.providerInvoiceRef ?? null;
  let refundObservation: ProviderInvoiceObservation | null = null;

  if (event.eventType === "ChargeRefunded") {
    if (!event.providerPaymentRef) {
      throw new BillingWebhookError(
        "bcr01_refund_payment_reference_required",
      );
    }

    const resolvedInvoiceRef = await provider.resolveInvoiceByPaymentRef(
      event.providerPaymentRef,
    );
    if (!resolvedInvoiceRef) {
      throw new BillingWebhookError(
        "bcr01_refund_invoice_resolution_absent",
      );
    }
    if (
      providerInvoiceRef &&
      providerInvoiceRef !== resolvedInvoiceRef
    ) {
      throw new BillingWebhookError(
        "bcr01_refund_invoice_identity_mismatch",
      );
    }
    providerInvoiceRef = resolvedInvoiceRef;

    refundObservation = await provider.retrieveInvoice(
      providerInvoiceRef,
    );
    if (
      refundObservation.providerInvoiceRef !== providerInvoiceRef
    ) {
      throw new BillingWebhookError(
        "bcr01_refund_invoice_identity_mismatch",
      );
    }
  }

  if (!providerInvoiceRef) {
    throw new BillingWebhookError(
      "bcr01_provider_invoice_lifecycle_evidence_incomplete",
    );
  }

  const charge = await getChargeByProviderInvoice({
    providerCode: event.providerCode,
    providerInvoiceRef,
  });

  const providerSubscriptionRef =
    event.providerSubscriptionRef ??
    refundObservation?.providerSubscriptionRef ??
    null;

  const recurringMapping = providerSubscriptionRef
    ? await getProviderMappingBySubscription({
        providerCode: event.providerCode,
        providerSubscriptionRef,
      })
    : null;

  if (charge && recurringMapping) {
    throw new BillingWebhookError(
      "bcr01_provider_invoice_mapping_ambiguous",
    );
  }

  if (charge) {
    let targetStatus: Exclude<BillingChargeStatus, "draft">;
    let providerPaymentRef = event.providerPaymentRef ?? null;

    if (event.eventType === "ChargeRefunded") {
      if (
        !refundObservation ||
        (refundObservation.status !== "paid" &&
          refundObservation.status !== "refunded")
      ) {
        throw new BillingWebhookError(
          "bcr01_refund_invoice_observation_invalid",
        );
      }
      targetStatus = refundObservation.status;
      providerPaymentRef =
        refundObservation.providerPaymentRef ?? providerPaymentRef;
    } else {
      targetStatus = targetChargeStatus(event);
    }

    const lifecycle = await applyProviderInvoiceObservation({
      eventId,
      providerCode: event.providerCode,
      providerInvoiceRef,
      providerPaymentRef,
      targetStatus,
      providerObservedAt: event.occurredAt,
    });

    return {
      ok: true,
      duplicate: false,
      eventId,
      eventStatus: lifecycle.eventStatus,
      lifecycleApplied: lifecycle.applied,
    };
  }

  if (recurringMapping) {
    return terminalizeNoDirectLifecycleEffect(
      eventId,
      event,
      "bcr01_recurring_invoice_event_persisted_mapping_confirmed",
    );
  }

  throw new BillingWebhookError(
    "bcr01_provider_invoice_persisted_mapping_absent",
  );
}

export async function processBillingWebhook(input: {
  readonly providerCode: BillingProviderCode;
  readonly rawBody: string;
  readonly signatureHeader: string | null;
}): Promise<BillingWebhookResult> {
  if (input.providerCode !== "stripe") {
    throw new BillingWebhookError("bcr01_webhook_provider_unsupported");
  }
  if (!input.rawBody) {
    throw new BillingWebhookError("bcr01_webhook_raw_body_required");
  }

  const provider = await resolveBillingProvider(input.providerCode);

  // MUST happen before JSON parsing, normalization or persistence.
  const verified = await provider.verifyWebhook(
    input.rawBody,
    input.signatureHeader,
  );
  const event = provider.normalizeWebhook(verified);

  if (event.providerCode !== input.providerCode) {
    throw new BillingWebhookError(
      "bcr01_webhook_provider_normalization_mismatch",
    );
  }

  const reservation = await reserveVerifiedBillingEvent({
    providerCode: event.providerCode,
    providerEventId: event.providerEventId,
    eventType: event.eventType,
    payloadHash: event.payloadHash,
    payloadSanitized: event.payloadSanitized,
    occurredAt: event.occurredAt,
  });

  if (
    reservation.duplicate &&
    TERMINAL_EVENT_STATUSES.has(reservation.processingStatus)
  ) {
    return {
      ok: true,
      duplicate: true,
      eventId: reservation.eventId,
      eventStatus: reservation.processingStatus,
      lifecycleApplied: false,
    };
  }

  if (isProviderInvoiceLifecycleEvent(event)) {
    const result = await processProviderInvoiceLifecycle({
      eventId: reservation.eventId,
      event,
      provider,
    });
    return { ...result, duplicate: reservation.duplicate };
  }

  if (!isSubscriptionLifecycleEvent(event)) {
    const result = await terminalizeNoDirectLifecycleEffect(
      reservation.eventId,
      event,
    );
    return { ...result, duplicate: reservation.duplicate };
  }

  const evidence = requireLifecycleEvidence(event);
  let lifecycle: BillingLifecycleApplication;
  lifecycle = await applyProviderSubscriptionObservation({
    eventId: reservation.eventId,
    providerCode: event.providerCode,
    providerCustomerRef: evidence.providerCustomerRef,
    providerSubscriptionRef: evidence.providerSubscriptionRef,
    providerPriceRef: evidence.providerPriceRef,
    internalState: evidence.subscriptionState,
    requiresReconciliation: event.requiresReconciliation,
    providerObservedAt: evidence.providerObservedAt,
    currentPeriodStart: event.currentPeriodStart,
    currentPeriodEnd: event.currentPeriodEnd,
    canceledAt: event.canceledAt,
  });

  return {
    ok: true,
    duplicate: reservation.duplicate,
    eventId: reservation.eventId,
    eventStatus: lifecycle.eventStatus,
    lifecycleApplied: lifecycle.applied,
  };
}
