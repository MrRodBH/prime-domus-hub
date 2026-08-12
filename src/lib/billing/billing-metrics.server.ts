// BCR-01 — read-only billing metrics and commercial observability.
// Test-mode data is never presented as production realized revenue.

import type { BillingProviderCode } from "@/lib/billing/billing-contracts";
import { BillingRepositoryError } from "@/lib/billing/billing-repository.server";

export type BillingMetricsSnapshot = {
  readonly mode: "test";
  readonly providerCode: BillingProviderCode;
  readonly generatedAt: string;
  readonly subscriptionCounts: Readonly<Record<string, number>>;
  readonly billingEventCounts: Readonly<Record<string, number>>;
  readonly providerMappingCounts: Readonly<Record<string, number>>;
  readonly realizedRevenueMinor: null;
  readonly realizedRevenueEvidence: "not_materialized_by_bcr01";
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
    const key = typeof value === "string" && value.length > 0 ? value : "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Global control-plane visibility only; no tenant mutation or revenue inference. */
export async function getBillingMetricsSnapshot(): Promise<BillingMetricsSnapshot> {
  const db = await admin();

  const [subscriptions, events, mappings, provider] = await Promise.all([
    db.from("tenant_subscriptions").select("status"),
    db.from("billing_events").select("processing_status"),
    db.from("tenant_billing_provider_mappings").select("status"),
    db
      .from("billing_provider_definitions")
      .select("code, status, metadata")
      .eq("code", "stripe"),
  ]);

  if (subscriptions.error || events.error || mappings.error || provider.error) {
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
    throw new BillingRepositoryError("bcr01_billing_metrics_test_mode_not_proven");
  }

  return {
    mode: "test",
    providerCode: "stripe",
    generatedAt: new Date().toISOString(),
    subscriptionCounts: countByStatus(subscriptions.data, "status"),
    billingEventCounts: countByStatus(events.data, "processing_status"),
    providerMappingCounts: countByStatus(mappings.data, "status"),
    realizedRevenueMinor: null,
    realizedRevenueEvidence: "not_materialized_by_bcr01",
  };
}
