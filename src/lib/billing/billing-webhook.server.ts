// BCR-01 — canonical verified Stripe webhook orchestration. Server-only.
//
// Security order is fixed and tested:
// raw body -> provider signature/timestamp verification -> normalization ->
// idempotency reservation -> persisted mapping/price resolution -> lifecycle.
// Provider metadata, client input and webhook tenant fields are never authority.

import type {
  BillingLifecycleApplication,
  BillingProviderCode,
  NormalizedBillingEvent,
} from "@/lib/billing/billing-contracts";
import { resolveBillingProvider } from "@/lib/billing/billing-port.server";
import {
  applyProviderSubscriptionObservation,
  reserveVerifiedBillingEvent,
} from "@/lib/billing/billing-repository.server";
import { markBillingEventTerminal } from "@/lib/billing/billing-event-repository.server";

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
    throw new BillingWebhookError("bcr01_webhook_lifecycle_evidence_incomplete");
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

async function terminalizeNoDirectLifecycleEffect(
  eventId: string,
  event: NormalizedBillingEvent,
): Promise<BillingWebhookResult> {
  const reason =
    event.eventType === "Unknown"
      ? "bcr01_unhandled_provider_event"
      : "bcr01_event_no_direct_lifecycle_effect";
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
    throw new BillingWebhookError("bcr01_webhook_provider_normalization_mismatch");
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

  if (!isSubscriptionLifecycleEvent(event)) {
    const result = await terminalizeNoDirectLifecycleEffect(
      reservation.eventId,
      event,
    );
    return { ...result, duplicate: reservation.duplicate };
  }

  const evidence = requireLifecycleEvidence(event);
  let lifecycle: BillingLifecycleApplication;
  try {
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
  } catch (error) {
    // Leave a verified event non-terminal so a provider retry or explicit
    // reconciliation can retry after a transient/internal dependency is fixed.
    throw error;
  }

  return {
    ok: true,
    duplicate: reservation.duplicate,
    eventId: reservation.eventId,
    eventStatus: lifecycle.eventStatus,
    lifecycleApplied: lifecycle.applied,
  };
}
