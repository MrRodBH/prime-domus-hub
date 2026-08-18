// BCR-01 — read-only billing metrics and commercial observability.
// Test-mode data is never presented as production realized revenue.

import type {
  BillingProviderCode,
  NonRecurringChargeType,
} from "@/lib/billing/billing-contracts";
import { BillingRepositoryError } from "@/lib/billing/billing-repository.server";

export type BillingMetricsSnapshot = {
  readonly mode: "test";
  readonly providerCode: BillingProviderCode;
  readonly generatedAt: string;
  readonly recurring: {
    readonly subscriptionCounts: Readonly<Record<string, number>>;
    readonly productionRealizedRevenueMinor: null;
  };
  readonly nonRecurring: {
    readonly chargeCounts: Readonly<Record<string, number>>;
    readonly chargeTypeCounts: Readonly<Record<NonRecurringChargeType, number>>;
    readonly testModePaidAmountMinorByChargeType: Readonly<
      Record<NonRecurringChargeType, number>
    >;
    readonly testModePaidAmountMinor: number;
    readonly productionRealizedRevenueMinor: null;
  };
  readonly billingEventCounts: Readonly<Record<string, number>>;
  readonly providerMappingCounts: Readonly<Record<string, number>>;
  readonly revenueSemantics:
    "test_mode_observation_only_production_realized_revenue_not_claimed";
};

async function admin() {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  // BCR-local bridge until P5 regenerates the accepted Same-Backend schema.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

function countByStatus(
  rows: Array<{ status?: unknown; processing_status?: unknown }> | null,
  field: "status" | "processing_status",
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    const value = row[field];
    const key =
      typeof value === "string" && value.length > 0 ? value : "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const CHARGE_TYPES: readonly NonRecurringChargeType[] = [
  "setup",
  "milestone",
  "customization",
  "on_demand",
];

function emptyChargeTypeRecord(): Record<NonRecurringChargeType, number> {
  return {
    setup: 0,
    milestone: 0,
    customization: 0,
    on_demand: 0,
  };
}

function requireChargeType(value: unknown): NonRecurringChargeType {
  if (
    value !== "setup" &&
    value !== "milestone" &&
    value !== "customization" &&
    value !== "on_demand"
  ) {
    throw new BillingRepositoryError("bcr01_billing_metrics_charge_type_invalid");
  }
  return value;
}

function requireMinorAmount(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new BillingRepositoryError("bcr01_billing_metrics_amount_invalid");
  }
  return value as number;
}

/** Global control-plane visibility only; no tenant mutation or revenue inference. */
export async function getBillingMetricsSnapshot(): Promise<BillingMetricsSnapshot> {
  const db = await admin();

  const [subscriptions, charges, events, mappings, provider] =
    await Promise.all([
      db.from("tenant_subscriptions").select("status"),
      db
        .from("commercial_charge_intents")
        .select("charge_type, status, amount_total_minor"),
      db.from("billing_events").select("processing_status"),
      db.from("tenant_billing_provider_mappings").select("status"),
      db
        .from("billing_provider_definitions")
        .select("code, status, metadata")
        .eq("code", "stripe"),
    ]);

  if (
    subscriptions.error ||
    charges.error ||
    events.error ||
    mappings.error ||
    provider.error
  ) {
    throw new BillingRepositoryError("bcr01_billing_metrics_read_failed");
  }
  if (!provider.data || provider.data.length !== 1) {
    throw new BillingRepositoryError("bcr01_billing_metrics_provider_ambiguous");
  }

  const stripe = provider.data[0];
  if (
    stripe.status !== "enabled" ||
    !stripe.metadata ||
    typeof stripe.metadata !== "object" ||
    Array.isArray(stripe.metadata) ||
    stripe.metadata.authorized_mode !== "test"
  ) {
    throw new BillingRepositoryError(
      "bcr01_billing_metrics_test_mode_not_proven",
    );
  }

  const chargeTypeCounts = emptyChargeTypeRecord();
  const paidByType = emptyChargeTypeRecord();

  for (const row of charges.data ?? []) {
    const type = requireChargeType(row.charge_type);
    chargeTypeCounts[type] += 1;
    if (row.status === "paid") {
      paidByType[type] += requireMinorAmount(row.amount_total_minor);
    }
  }

  // Preserve all four dimensions even when zero so the metric contract cannot
  // silently collapse an unused commercial charge type.
  for (const type of CHARGE_TYPES) {
    if (!(type in chargeTypeCounts) || !(type in paidByType)) {
      throw new BillingRepositoryError(
        "bcr01_billing_metrics_charge_type_dimension_missing",
      );
    }
  }

  const testModePaidAmountMinor = CHARGE_TYPES.reduce(
    (sum, type) => sum + paidByType[type],
    0,
  );

  return {
    mode: "test",
    providerCode: "stripe",
    generatedAt: new Date().toISOString(),
    recurring: {
      subscriptionCounts: countByStatus(subscriptions.data, "status"),
      productionRealizedRevenueMinor: null,
    },
    nonRecurring: {
      chargeCounts: countByStatus(charges.data, "status"),
      chargeTypeCounts,
      testModePaidAmountMinorByChargeType: paidByType,
      testModePaidAmountMinor,
      productionRealizedRevenueMinor: null,
    },
    billingEventCounts: countByStatus(events.data, "processing_status"),
    providerMappingCounts: countByStatus(mappings.data, "status"),
    revenueSemantics:
      "test_mode_observation_only_production_realized_revenue_not_claimed",
  };
}
