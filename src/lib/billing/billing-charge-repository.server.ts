// BCR-01 — provider-agnostic persistence boundary for non-recurring charges.
//
// This module consumes only server-owned charge identity. It never derives
// tenant authority from provider objects or client-supplied financial fields.
// Generated Supabase types intentionally lag the repository-first BCR schema;
// the narrow untyped bridge is removed after BCR-P5 schema application + regen.

import type {
  BillingChargeLifecycleApplication,
  BillingChargeStatus,
  BillingProviderCode,
  CommercialChargeIntent,
  CommercialChargeItem,
  NonRecurringChargeType,
} from "@/lib/billing/billing-contracts";

export class BillingChargeRepositoryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingChargeRepositoryError";
    this.code = code;
  }
}

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function one(rows: Row[] | null | undefined, code: string): Row {
  if (!rows || rows.length !== 1) throw new BillingChargeRepositoryError(code);
  return rows[0];
}

function optionalOne(
  rows: Row[] | null | undefined,
  ambiguousCode: string,
): Row | null {
  if (!rows || rows.length === 0) return null;
  if (rows.length !== 1) throw new BillingChargeRepositoryError(ambiguousCode);
  return rows[0];
}

function record(value: unknown, code: string): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BillingChargeRepositoryError(code);
  }
  return value as Row;
}

function text(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BillingChargeRepositoryError(code);
  }
  return value;
}

function uuid(value: unknown, code: string): string {
  const parsed = text(value, code);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      parsed,
    )
  ) {
    throw new BillingChargeRepositoryError(code);
  }
  return parsed;
}

function integer(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value)) throw new BillingChargeRepositoryError(code);
  return value as number;
}

function chargeType(value: unknown): NonRecurringChargeType {
  if (
    value !== "setup" &&
    value !== "milestone" &&
    value !== "customization" &&
    value !== "on_demand"
  ) {
    throw new BillingChargeRepositoryError("bcr01_charge_type_invalid");
  }
  return value;
}

function chargeStatus(value: unknown): BillingChargeStatus {
  if (
    value !== "draft" &&
    value !== "open" &&
    value !== "paid" &&
    value !== "failed" &&
    value !== "void" &&
    value !== "refunded"
  ) {
    throw new BillingChargeRepositoryError("bcr01_charge_status_invalid");
  }
  return value;
}

function sanitizeDatabaseError(
  message: string | undefined,
  fallback: string,
): string {
  if (!message) return fallback;
  const match = message.match(/bcr01_[a-z0-9_]+/i);
  return match ? match[0].toLowerCase() : fallback;
}

function mapItem(row: Row): CommercialChargeItem {
  return {
    itemId: uuid(row.id, "bcr01_charge_item_id_invalid"),
    linePosition: integer(
      row.line_position,
      "bcr01_charge_item_position_invalid",
    ),
    description: text(
      row.description,
      "bcr01_charge_item_description_invalid",
    ),
    quantity: integer(row.quantity, "bcr01_charge_item_quantity_invalid"),
    unitAmountMinor: integer(
      row.unit_amount_minor,
      "bcr01_charge_item_unit_amount_invalid",
    ),
    amountTotalMinor: integer(
      row.amount_total_minor,
      "bcr01_charge_item_total_invalid",
    ),
  };
}

export async function getTenantChargeIntent(
  tenantId: string,
  chargeIntentId: string,
  providerCode: BillingProviderCode = "stripe",
): Promise<CommercialChargeIntent> {
  const db = await admin();

  const chargeResult = await db
    .from("commercial_charge_intents")
    .select(
      "id, tenant_id, charge_type, status, currency, amount_total_minor, idempotency_key, correlation_ref",
    )
    .eq("id", chargeIntentId)
    .eq("tenant_id", tenantId);
  if (chargeResult.error) {
    throw new BillingChargeRepositoryError("bcr01_charge_read_failed");
  }
  const charge = one(chargeResult.data, "bcr01_charge_not_unique_for_tenant");

  const itemResult = await db
    .from("commercial_charge_items")
    .select(
      "id, charge_intent_id, line_position, description, quantity, unit_amount_minor, amount_total_minor",
    )
    .eq("charge_intent_id", chargeIntentId)
    .order("line_position", { ascending: true });
  if (itemResult.error) {
    throw new BillingChargeRepositoryError("bcr01_charge_items_read_failed");
  }
  if (!itemResult.data || itemResult.data.length === 0) {
    throw new BillingChargeRepositoryError("bcr01_charge_items_absent");
  }
  const items = (itemResult.data as Row[]).map(mapItem);
  if (new Set(items.map((item) => item.linePosition)).size !== items.length) {
    throw new BillingChargeRepositoryError("bcr01_charge_item_position_ambiguous");
  }

  const computedTotal = items.reduce(
    (sum, item) => sum + item.amountTotalMinor,
    0,
  );
  const persistedTotal = integer(
    charge.amount_total_minor,
    "bcr01_charge_amount_invalid",
  );
  if (computedTotal !== persistedTotal) {
    throw new BillingChargeRepositoryError("bcr01_charge_total_mismatch");
  }

  const mappingResult = await db
    .from("billing_charge_provider_mappings")
    .select(
      "charge_intent_id, provider_code, provider_invoice_ref, status",
    )
    .eq("charge_intent_id", chargeIntentId)
    .eq("provider_code", providerCode);
  if (mappingResult.error) {
    throw new BillingChargeRepositoryError(
      "bcr01_charge_provider_mapping_read_failed",
    );
  }
  const mapping = optionalOne(
    mappingResult.data,
    "bcr01_charge_provider_mapping_cardinality_ambiguous",
  );

  return {
    chargeIntentId: uuid(charge.id, "bcr01_charge_id_invalid"),
    tenantId: uuid(charge.tenant_id, "bcr01_charge_tenant_id_invalid"),
    chargeType: chargeType(charge.charge_type),
    status: chargeStatus(charge.status),
    currency: text(charge.currency, "bcr01_charge_currency_invalid"),
    amountTotalMinor: persistedTotal,
    idempotencyKey: text(
      charge.idempotency_key,
      "bcr01_charge_idempotency_invalid",
    ),
    correlationRef:
      typeof charge.correlation_ref === "string" ? charge.correlation_ref : null,
    items,
    providerInvoiceRef: mapping?.provider_invoice_ref ?? null,
    providerStatus: mapping ? chargeStatus(mapping.status) : null,
  };
}

export async function listTenantChargeIntents(
  tenantId: string,
  providerCode: BillingProviderCode = "stripe",
): Promise<readonly CommercialChargeIntent[]> {
  const db = await admin();
  const result = await db
    .from("commercial_charge_intents")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (result.error) {
    throw new BillingChargeRepositoryError("bcr01_charge_list_failed");
  }
  const rows = (result.data ?? []) as Row[];
  return Promise.all(
    rows.map((row) =>
      getTenantChargeIntent(
        tenantId,
        uuid(row.id, "bcr01_charge_id_invalid"),
        providerCode,
      ),
    ),
  );
}

export async function bindChargeProviderInvoice(input: {
  chargeIntentId: string;
  providerCode: BillingProviderCode;
  providerCustomerRef: string;
  providerInvoiceRef: string;
}): Promise<void> {
  const db = await admin();
  const result = await db.rpc("bcr01_bind_charge_provider_invoice", {
    _charge_intent_id: input.chargeIntentId,
    _provider_code: input.providerCode,
    _provider_customer_ref: input.providerCustomerRef,
    _provider_invoice_ref: input.providerInvoiceRef,
  });
  if (result.error) {
    throw new BillingChargeRepositoryError(
      sanitizeDatabaseError(
        result.error.message,
        "bcr01_charge_provider_binding_failed",
      ),
    );
  }
  record(result.data, "bcr01_charge_provider_binding_response_invalid");
}

export async function getChargeByProviderInvoice(input: {
  providerCode: BillingProviderCode;
  providerInvoiceRef: string;
}): Promise<CommercialChargeIntent | null> {
  const db = await admin();
  const mappingResult = await db
    .from("billing_charge_provider_mappings")
    .select("charge_intent_id")
    .eq("provider_code", input.providerCode)
    .eq("provider_invoice_ref", input.providerInvoiceRef);
  if (mappingResult.error) {
    throw new BillingChargeRepositoryError(
      "bcr01_charge_provider_invoice_lookup_failed",
    );
  }
  const mapping = optionalOne(
    mappingResult.data,
    "bcr01_provider_invoice_mapping_cardinality_ambiguous",
  );
  if (!mapping) return null;

  const chargeId = uuid(
    mapping.charge_intent_id,
    "bcr01_provider_invoice_charge_id_invalid",
  );
  const chargeResult = await db
    .from("commercial_charge_intents")
    .select("tenant_id")
    .eq("id", chargeId);
  if (chargeResult.error) {
    throw new BillingChargeRepositoryError("bcr01_charge_read_failed");
  }
  const charge = one(
    chargeResult.data,
    "bcr01_provider_invoice_charge_not_unique",
  );
  return getTenantChargeIntent(
    uuid(charge.tenant_id, "bcr01_charge_tenant_id_invalid"),
    chargeId,
    input.providerCode,
  );
}

export async function applyProviderInvoiceObservation(input: {
  eventId: string;
  providerCode: BillingProviderCode;
  providerInvoiceRef: string;
  providerPaymentRef: string | null;
  targetStatus: Exclude<BillingChargeStatus, "draft">;
  providerObservedAt: string;
}): Promise<BillingChargeLifecycleApplication> {
  const db = await admin();
  const result = await db.rpc("bcr01_apply_provider_invoice_observation", {
    _event_id: input.eventId,
    _provider_code: input.providerCode,
    _provider_invoice_ref: input.providerInvoiceRef,
    _provider_payment_ref: input.providerPaymentRef,
    _target_status: input.targetStatus,
    _provider_observed_at: input.providerObservedAt,
  });
  if (result.error) {
    throw new BillingChargeRepositoryError(
      sanitizeDatabaseError(
        result.error.message,
        "bcr01_invoice_observation_apply_failed",
      ),
    );
  }
  const data = record(
    result.data,
    "bcr01_invoice_observation_response_invalid",
  );
  return {
    applied: data.applied === true,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    tenantId: typeof data.tenantId === "string" ? data.tenantId : undefined,
    chargeIntentId:
      typeof data.chargeIntentId === "string"
        ? data.chargeIntentId
        : undefined,
    chargeStatus:
      typeof data.chargeStatus === "string"
        ? chargeStatus(data.chargeStatus)
        : undefined,
    eventStatus: text(
      data.eventStatus,
      "bcr01_invoice_observation_event_status_invalid",
    ),
  };
}
