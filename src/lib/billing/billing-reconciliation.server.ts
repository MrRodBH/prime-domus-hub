// BCR-01 — explicit provider reconciliation through the canonical lifecycle.
// Server-only. Tenant/provider identity is resolved from persisted mapping.

import { createHash } from "node:crypto";
import type {
  BillingAuthorizationContext,
  BillingLifecycleApplication,
  ProviderSubscriptionObservation,
} from "@/lib/billing/billing-contracts";
import { resolveBillingProvider } from "@/lib/billing/billing-port.server";
import {
  applyProviderSubscriptionObservation,
  getTenantProviderMapping,
} from "@/lib/billing/billing-repository.server";
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

function canonicalObservationPayload(
  observation: ProviderSubscriptionObservation,
): Record<string, unknown> {
  // Intentionally excludes local observedAt from state identity. Re-running a
  // reconciliation against the exact same provider state converges on the same
  // synthetic event ID/hash instead of growing the ledger without state change.
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

function hashCanonicalPayload(payload: Record<string, unknown>): string {
  // Property insertion order is fixed by canonicalObservationPayload.
  return createHash("sha256")
    .update(JSON.stringify(payload), "utf8")
    .digest("hex");
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

  const payload = canonicalObservationPayload(observation);
  const payloadHash = hashCanonicalPayload(payload);
  const providerEventId = `reconcile:${mapping.providerSubscriptionRef}:${payloadHash}`;

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
