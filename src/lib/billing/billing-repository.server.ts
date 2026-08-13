// BCR-01 — single server-side persistence boundary for billing activation.
//
// The repository knows persistence, not Stripe and not HTTP. New BCR tables/RPCs
// are intentionally accessed behind this module while generated Supabase types
// still represent the pre-BCR main schema. The narrow untyped bridge MUST be
// removed once BCR-P5 applies the schema and regenerates types from Same-Backend.

import type {
  BillingCatalogPrice,
  BillingEventReservation,
  BillingLifecycleApplication,
  BillingProviderCode,
  BillingSubscriptionState,
  NormalizedBillingEventType,
  TenantBillingSnapshot,
  TenantProviderMapping,
} from "@/lib/billing/billing-contracts";

export class BillingRepositoryError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "BillingRepositoryError";
    this.code = code;
  }
}

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  // BCR-local schema bridge only. All callers receive validated domain DTOs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

// Quarantined pre-schema row shape. BCR-P5 removes this together with the
// admin() cast after Same-Backend schema application + deterministic type regen.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedDatabaseRow = Record<string, any>;

function requireSingleRow(
  rows: UntypedDatabaseRow[] | null | undefined,
  code: string,
): UntypedDatabaseRow {
  if (!rows || rows.length !== 1) throw new BillingRepositoryError(code);
  return rows[0];
}

function optionalSingleRow(
  rows: UntypedDatabaseRow[] | null | undefined,
  ambiguousCode: string,
): UntypedDatabaseRow | null {
  if (!rows || rows.length === 0) return null;
  if (rows.length !== 1) throw new BillingRepositoryError(ambiguousCode);
  return rows[0];
}

function requireDatabaseRecord(
  value: unknown,
  code: string,
): UntypedDatabaseRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BillingRepositoryError(code);
  }
  return value as UntypedDatabaseRow;
}

function asNonEmptyString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BillingRepositoryError(code);
  }
  return value;
}

function asUuid(value: unknown, code: string): string {
  const text = asNonEmptyString(value, code);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    throw new BillingRepositoryError(code);
  }
  return text;
}

function asInteger(value: unknown, code: string): number {
  if (!Number.isInteger(value)) throw new BillingRepositoryError(code);
  return value as number;
}

export function sanitizeBillingDatabaseError(
  message: string | undefined,
  fallback: string,
): string {
  if (!message) return fallback;
  const match = message.match(/bcr01_[a-z0-9_]+/i);
  return match ? match[0].toLowerCase() : fallback;
}

export async function resolveBillingCatalogPrice(
  planPriceId: string,
  providerCode: BillingProviderCode,
): Promise<BillingCatalogPrice> {
  const db = await admin();

  const priceResult = await db
    .from("commercial_plan_prices")
    .select(
      "id, plan_id, code, currency, unit_amount_minor, billing_interval, interval_count, status, retired_at",
    )
    .eq("id", planPriceId)
    .eq("status", "active")
    .is("retired_at", null);
  if (priceResult.error) {
    throw new BillingRepositoryError("bcr01_plan_price_read_failed");
  }
  const price = requireSingleRow(
    priceResult.data,
    "bcr01_active_plan_price_not_unique",
  );

  const planResult = await db
    .from("commercial_plans")
    .select("id, code, name, status")
    .eq("id", price.plan_id)
    .eq("status", "active");
  if (planResult.error) {
    throw new BillingRepositoryError("bcr01_plan_read_failed");
  }
  const plan = requireSingleRow(
    planResult.data,
    "bcr01_active_plan_not_unique",
  );

  const providerResult = await db
    .from("billing_provider_definitions")
    .select("code, status")
    .eq("code", providerCode)
    .eq("status", "enabled");
  if (providerResult.error) {
    throw new BillingRepositoryError("bcr01_provider_catalog_read_failed");
  }
  requireSingleRow(providerResult.data, "bcr01_provider_not_enabled");

  const providerPriceResult = await db
    .from("billing_plan_provider_prices")
    .select(
      "plan_price_id, provider_code, provider_price_ref, status, retired_at",
    )
    .eq("plan_price_id", planPriceId)
    .eq("provider_code", providerCode)
    .eq("status", "enabled")
    .is("retired_at", null);
  if (providerPriceResult.error) {
    throw new BillingRepositoryError("bcr01_provider_price_read_failed");
  }
  const providerPrice = requireSingleRow(
    providerPriceResult.data,
    "bcr01_enabled_provider_price_not_unique",
  );

  const billingInterval = asNonEmptyString(
    price.billing_interval,
    "bcr01_invalid_billing_interval",
  );
  if (billingInterval !== "month" && billingInterval !== "year") {
    throw new BillingRepositoryError("bcr01_invalid_billing_interval");
  }

  return {
    planId: asUuid(plan.id, "bcr01_invalid_plan_id"),
    planCode: asNonEmptyString(plan.code, "bcr01_invalid_plan_code"),
    planName: asNonEmptyString(plan.name, "bcr01_invalid_plan_name"),
    planPriceId: asUuid(price.id, "bcr01_invalid_plan_price_id"),
    priceCode: asNonEmptyString(price.code, "bcr01_invalid_price_code"),
    currency: asNonEmptyString(price.currency, "bcr01_invalid_currency"),
    unitAmountMinor: asInteger(
      price.unit_amount_minor,
      "bcr01_invalid_unit_amount",
    ),
    billingInterval,
    intervalCount: asInteger(
      price.interval_count,
      "bcr01_invalid_interval_count",
    ),
    providerCode,
    providerPriceRef: asNonEmptyString(
      providerPrice.provider_price_ref,
      "bcr01_invalid_provider_price_ref",
    ),
  };
}

export async function getTenantProviderMapping(
  tenantId: string,
  providerCode: BillingProviderCode,
): Promise<TenantProviderMapping | null> {
  const db = await admin();
  const result = await db
    .from("tenant_billing_provider_mappings")
    .select(
      "id, tenant_id, provider_code, status, provider_customer_ref, provider_subscription_ref, subscription_id",
    )
    .eq("tenant_id", tenantId)
    .eq("provider_code", providerCode);
  if (result.error) {
    throw new BillingRepositoryError("bcr01_provider_mapping_read_failed");
  }

  const row = optionalSingleRow(
    result.data,
    "bcr01_provider_mapping_cardinality_ambiguous",
  );
  if (!row) return null;

  return {
    mappingId: asUuid(row.id, "bcr01_invalid_provider_mapping_id"),
    tenantId: asUuid(row.tenant_id, "bcr01_invalid_mapping_tenant_id"),
    providerCode,
    status: row.status,
    providerCustomerRef: row.provider_customer_ref ?? null,
    providerSubscriptionRef: row.provider_subscription_ref ?? null,
    subscriptionId: row.subscription_id ?? null,
  };
}

export async function bindTenantProviderCustomer(input: {
  tenantId: string;
  providerCode: BillingProviderCode;
  providerCustomerRef: string;
}): Promise<TenantProviderMapping> {
  const db = await admin();
  const result = await db.rpc("bcr01_bind_provider_customer", {
    _tenant_id: input.tenantId,
    _provider_code: input.providerCode,
    _provider_customer_ref: input.providerCustomerRef,
  });

  if (result.error) {
    throw new BillingRepositoryError(
      sanitizeBillingDatabaseError(
        result.error.message,
        "bcr01_provider_customer_binding_failed",
      ),
    );
  }

  const data = result.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new BillingRepositoryError(
      "bcr01_provider_customer_binding_response_invalid",
    );
  }

  const mapping = await getTenantProviderMapping(
    input.tenantId,
    input.providerCode,
  );
  if (
    !mapping ||
    mapping.providerCustomerRef !== input.providerCustomerRef
  ) {
    throw new BillingRepositoryError(
      "bcr01_provider_customer_binding_not_persisted",
    );
  }
  return mapping;
}

export async function reserveVerifiedBillingEvent(input: {
  providerCode: BillingProviderCode;
  providerEventId: string;
  eventType: NormalizedBillingEventType;
  payloadHash: string;
  payloadSanitized: Record<string, unknown>;
  occurredAt: string | null;
}): Promise<BillingEventReservation> {
  const db = await admin();
  const result = await db.rpc("bcr01_reserve_verified_billing_event", {
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
        "bcr01_event_reservation_failed",
      ),
    );
  }

  const data = requireDatabaseRecord(
    result.data,
    "bcr01_event_reservation_response_invalid",
  );

  return {
    reserved: data.reserved === true,
    duplicate: data.duplicate === true,
    eventId: asUuid(data.eventId, "bcr01_event_reservation_id_invalid"),
    processingStatus: asNonEmptyString(
      data.processingStatus,
      "bcr01_event_reservation_status_invalid",
    ),
  };
}

export async function applyProviderSubscriptionObservation(input: {
  eventId: string;
  providerCode: BillingProviderCode;
  providerCustomerRef: string;
  providerSubscriptionRef: string;
  providerPriceRef: string;
  internalState: BillingSubscriptionState;
  requiresReconciliation: boolean;
  providerObservedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
}): Promise<BillingLifecycleApplication> {
  const db = await admin();
  const result = await db.rpc(
    "bcr01_apply_provider_subscription_observation",
    {
      _event_id: input.eventId,
      _provider_code: input.providerCode,
      _provider_customer_ref: input.providerCustomerRef,
      _provider_subscription_ref: input.providerSubscriptionRef,
      _provider_price_ref: input.providerPriceRef,
      _internal_status: input.internalState,
      _requires_reconciliation: input.requiresReconciliation,
      _provider_observed_at: input.providerObservedAt,
      _current_period_start: input.currentPeriodStart,
      _current_period_end: input.currentPeriodEnd,
      _canceled_at: input.canceledAt,
    },
  );

  if (result.error) {
    throw new BillingRepositoryError(
      sanitizeBillingDatabaseError(
        result.error.message,
        "bcr01_lifecycle_apply_failed",
      ),
    );
  }

  const data = requireDatabaseRecord(
    result.data,
    "bcr01_lifecycle_response_invalid",
  );

  return {
    applied: data.applied === true,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    tenantId: typeof data.tenantId === "string" ? data.tenantId : undefined,
    subscriptionId:
      typeof data.subscriptionId === "string" ? data.subscriptionId : undefined,
    mappingId: typeof data.mappingId === "string" ? data.mappingId : undefined,
    planId: typeof data.planId === "string" ? data.planId : undefined,
    planPriceId:
      typeof data.planPriceId === "string" ? data.planPriceId : undefined,
    internalStatus:
      typeof data.internalStatus === "string"
        ? (data.internalStatus as BillingSubscriptionState)
        : undefined,
    eventStatus: asNonEmptyString(
      data.eventStatus,
      "bcr01_lifecycle_event_status_invalid",
    ),
  };
}

export async function getTenantName(tenantId: string): Promise<string> {
  const db = await admin();
  const result = await db.from("tenants").select("id, nome").eq("id", tenantId);
  if (result.error) {
    throw new BillingRepositoryError("bcr01_tenant_read_failed");
  }
  const tenant = requireSingleRow(result.data, "bcr01_tenant_not_unique");
  return asNonEmptyString(tenant.nome, "bcr01_tenant_name_invalid");
}

export async function getTenantBillingSnapshot(
  tenantId: string,
  providerCode: BillingProviderCode = "stripe",
): Promise<TenantBillingSnapshot> {
  const db = await admin();

  const subscriptionResult = await db
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, status_reason, current_period_start, current_period_end",
    )
    .eq("tenant_id", tenantId)
    .in("status", ["trialing", "active", "past_due", "suspended", "internal", "demo"]);
  if (subscriptionResult.error) {
    throw new BillingRepositoryError("bcr01_subscription_read_failed");
  }
  const subscription = optionalSingleRow(
    subscriptionResult.data,
    "bcr01_current_subscription_cardinality_ambiguous",
  );

  let plan: TenantBillingSnapshot["plan"] = null;
  if (subscription?.plan_id) {
    const planResult = await db
      .from("commercial_plans")
      .select("id, code, name")
      .eq("id", subscription.plan_id);
    if (planResult.error) {
      throw new BillingRepositoryError("bcr01_subscription_plan_read_failed");
    }
    const row = requireSingleRow(
      planResult.data,
      "bcr01_subscription_plan_not_unique",
    );
    plan = {
      id: asUuid(row.id, "bcr01_invalid_subscription_plan_id"),
      code: asNonEmptyString(row.code, "bcr01_invalid_subscription_plan_code"),
      name: asNonEmptyString(row.name, "bcr01_invalid_subscription_plan_name"),
    };
  }

  const mapping = await getTenantProviderMapping(tenantId, providerCode);

  return {
    tenantId,
    subscription: subscription
      ? {
          id: asUuid(subscription.id, "bcr01_invalid_subscription_id"),
          planId: subscription.plan_id ?? null,
          status: asNonEmptyString(
            subscription.status,
            "bcr01_invalid_subscription_status",
          ),
          statusReason: subscription.status_reason ?? null,
          currentPeriodStart: subscription.current_period_start ?? null,
          currentPeriodEnd: subscription.current_period_end ?? null,
        }
      : null,
    plan,
    provider: mapping
      ? {
          code: providerCode,
          status: mapping.status,
          linked:
            mapping.status === "linked" &&
            Boolean(mapping.providerCustomerRef),
        }
      : null,
  };
}
export async function getProviderMappingBySubscription(input: {
  providerCode: BillingProviderCode;
  providerSubscriptionRef: string;
}): Promise<TenantProviderMapping | null> {
  const db = await admin();
  const result = await db
    .from("tenant_billing_provider_mappings")
    .select(
      "id, tenant_id, provider_code, status, provider_customer_ref, provider_subscription_ref, subscription_id",
    )
    .eq("provider_code", input.providerCode)
    .eq("provider_subscription_ref", input.providerSubscriptionRef);

  if (result.error) {
    throw new BillingRepositoryError(
      "bcr01_provider_subscription_mapping_read_failed",
    );
  }

  const row = optionalSingleRow(
    result.data,
    "bcr01_provider_subscription_mapping_cardinality_ambiguous",
  );
  if (!row) return null;

  return {
    mappingId: asUuid(row.id, "bcr01_invalid_provider_mapping_id"),
    tenantId: asUuid(row.tenant_id, "bcr01_invalid_mapping_tenant_id"),
    providerCode: input.providerCode,
    status: row.status,
    providerCustomerRef: row.provider_customer_ref ?? null,
    providerSubscriptionRef: row.provider_subscription_ref ?? null,
    subscriptionId: row.subscription_id ?? null,
  };
}
