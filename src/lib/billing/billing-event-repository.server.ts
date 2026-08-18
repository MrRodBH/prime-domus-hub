// BCR-01 — event-ledger persistence decomposition of billing-repository.
// Server-only; no provider SDK/HTTP or tenant authorization lives here.

import type {
  BillingEventReservation,
  BillingProviderCode,
  NormalizedBillingEventType,
} from "@/lib/billing/billing-contracts";
import {
  BillingRepositoryError,
  sanitizeBillingDatabaseError,
} from "@/lib/billing/billing-repository.server";

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  // BCR-local bridge until the P5 Same-Backend schema is regenerated into
  // src/integrations/supabase/types.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

function requireObject(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BillingRepositoryError(code);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new BillingRepositoryError(code);
  }
  return value;
}

function requireUuid(value: unknown, code: string): string {
  const text = requireString(value, code);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    throw new BillingRepositoryError(code);
  }
  return text;
}

function reservationFromRpc(value: unknown): BillingEventReservation {
  const data = requireObject(value, "bcr01_event_reservation_response_invalid");
  return {
    reserved: data.reserved === true,
    duplicate: data.duplicate === true,
    eventId: requireUuid(data.eventId, "bcr01_event_reservation_id_invalid"),
    processingStatus: requireString(
      data.processingStatus,
      "bcr01_event_reservation_status_invalid",
    ),
  };
}

export async function reserveReconciliationBillingEvent(input: {
  providerCode: BillingProviderCode;
  providerEventId: string;
  eventType: NormalizedBillingEventType;
  payloadHash: string;
  payloadSanitized: Record<string, unknown>;
  occurredAt: string | null;
}): Promise<BillingEventReservation> {
  const db = await admin();
  const result = await db.rpc("bcr01_reserve_reconciliation_event", {
    _provider_code: input.providerCode,
    _provider_event_id: input.providerEventId,
    _event_type: input.eventType,
    _payload_hash: input.payloadHash,
    _payload_sanitized: input.payloadSanitized,
    _occurred_at: input.occurredAt,
  });

  if (result.error) {
    throw new BillingRepositoryError(
      sanitizeBillingDatabaseError(
        result.error.message,
        "bcr01_reconciliation_event_reservation_failed",
      ),
    );
  }
  return reservationFromRpc(result.data);
}

export async function markBillingEventTerminal(input: {
  eventId: string;
  toStatus: "processed" | "ignored" | "failed" | "reconciled";
  reason: string;
}): Promise<{ changed: boolean; eventId: string; processingStatus: string }> {
  const db = await admin();
  const result = await db.rpc("bcr01_mark_billing_event_terminal", {
    _event_id: input.eventId,
    _to_status: input.toStatus,
    _reason: input.reason,
  });
  if (result.error) {
    throw new BillingRepositoryError(
      sanitizeBillingDatabaseError(
        result.error.message,
        "bcr01_event_terminalization_failed",
      ),
    );
  }

  const data = requireObject(result.data, "bcr01_event_terminal_response_invalid");
  return {
    changed: data.changed === true,
    eventId: requireUuid(data.eventId, "bcr01_event_terminal_id_invalid"),
    processingStatus: requireString(
      data.processingStatus,
      "bcr01_event_terminal_status_invalid",
    ),
  };
}
