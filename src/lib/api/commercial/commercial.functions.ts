// SCP-004 — Commercial Server Read Functions
//
// Server-only entry points for the commercial read models planned in
// SCP-003. Every function:
//   • runs behind requireTenant (server-side tenant resolution, active
//     membership validated or explicit Super Admin impersonation);
//   • loads supabaseAdmin inside the handler body only (never at module
//     scope — the file is client-reachable via the router bundle);
//   • returns a sanitized DTO derived by pure helpers in ./read-models;
//   • performs read-only queries — no insert/update/upsert/delete/rpc.
//
// Hard boundaries preserved from SCP-003 (SCP3-G1..G8):
//   • no permissive RLS is created here;
//   • no billing_admin / commercial_admin / canManageTenantBilling;
//   • no provider integration, webhook, checkout or customer portal;
//   • no direct client read of commercial/billing tables;
//   • provider refs / raw payloads / payload hashes / idempotency keys
//     are NEVER exposed — see read-models DTO whitelist.

import { createServerFn } from "@tanstack/react-start";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  deriveAdminDiagnostic,
  deriveBillingHealth,
  deriveCommercialSummary,
  deriveEntitlementSnapshot,
  type CommercialAdminDiagnostic,
  type PlanEntitlementRow,
  type PlanRow,
  type ProviderMappingRow,
  type SubscriptionRow,
  type TenantBillingHealth,
  type TenantCommercialSummary,
  type TenantEntitlementRow,
  type TenantEntitlementSnapshot,
} from "./read-models";

// Priority order when several subscriptions exist for a tenant — the
// most operationally-relevant status wins. Deterministic, no LIMIT-based
// implicit selection.
const SUB_STATUS_PRIORITY = [
  "active",
  "trialing",
  "past_due",
  "grace",
  "suspended",
  "canceled",
  "unpaid",
];

function pickActiveSubscription(rows: SubscriptionRow[]): SubscriptionRow | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const ai = SUB_STATUS_PRIORITY.indexOf(a.status ?? "");
    const bi = SUB_STATUS_PRIORITY.indexOf(b.status ?? "");
    const ax = ai === -1 ? SUB_STATUS_PRIORITY.length : ai;
    const bx = bi === -1 ? SUB_STATUS_PRIORITY.length : bi;
    if (ax !== bx) return ax - bx;
    const at = a.started_at ? new Date(a.started_at).getTime() : 0;
    const bt = b.started_at ? new Date(b.started_at).getTime() : 0;
    return bt - at;
  });
  return sorted[0];
}

function pickPrimaryMapping(rows: ProviderMappingRow[]): ProviderMappingRow | null {
  if (rows.length === 0) return null;
  const active = rows.find((r) => r.status === "active");
  return active ?? rows[0];
}

// Async import keeps client.server out of the client bundle graph.
async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// -----------------------------------------------------------------
// 1) TenantCommercialSummary
// -----------------------------------------------------------------
export const getTenantCommercialSummary = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantCommercialSummary> => {
    const tenantId = context.tenant.tenantId;
    const admin = await loadAdmin();

    const subsRes = await admin
      .from("tenant_subscriptions")
      .select(
        "id, tenant_id, plan_id, status, status_reason, started_at, trial_ends_at, current_period_start, current_period_end, canceled_at, suspended_at",
      )
      .eq("tenant_id", tenantId);
    if (subsRes.error) throw new Error(subsRes.error.message);
    const subscription = pickActiveSubscription(
      (subsRes.data ?? []) as SubscriptionRow[],
    );

    let plan: PlanRow | null = null;
    if (subscription?.plan_id) {
      const planRes = await admin
        .from("commercial_plans")
        .select("id, code, name, status")
        .eq("id", subscription.plan_id)
        .maybeSingle();
      if (planRes.error) throw new Error(planRes.error.message);
      plan = (planRes.data as PlanRow | null) ?? null;
    }

    const mapRes = await admin
      .from("tenant_billing_provider_mappings")
      .select("tenant_id, provider_code, status, subscription_id")
      .eq("tenant_id", tenantId);
    if (mapRes.error) throw new Error(mapRes.error.message);
    const providerMapping = pickPrimaryMapping(
      (mapRes.data ?? []) as ProviderMappingRow[],
    );

    return deriveCommercialSummary({
      tenantId,
      subscription,
      plan,
      providerMapping,
    });
  });

// -----------------------------------------------------------------
// 2) TenantEntitlementSnapshot
// -----------------------------------------------------------------
export const getTenantEntitlementSnapshot = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantEntitlementSnapshot> => {
    const tenantId = context.tenant.tenantId;
    const admin = await loadAdmin();

    const subsRes = await admin
      .from("tenant_subscriptions")
      .select(
        "id, tenant_id, plan_id, status, status_reason, started_at, trial_ends_at, current_period_start, current_period_end, canceled_at, suspended_at",
      )
      .eq("tenant_id", tenantId);
    if (subsRes.error) throw new Error(subsRes.error.message);
    const activeSub = pickActiveSubscription(
      (subsRes.data ?? []) as SubscriptionRow[],
    );
    const activePlanId = activeSub?.plan_id ?? null;

    const teRes = await admin
      .from("tenant_entitlements")
      .select(
        "tenant_id, entitlement_key, source, value_bool, value_int, value_decimal, value_text, effective_from, effective_until",
      )
      .eq("tenant_id", tenantId);
    if (teRes.error) throw new Error(teRes.error.message);

    let planEntitlements: PlanEntitlementRow[] = [];
    if (activePlanId) {
      const peRes = await admin
        .from("commercial_plan_entitlements")
        .select(
          "plan_id, entitlement_key, value_bool, value_int, value_decimal, value_text",
        )
        .eq("plan_id", activePlanId);
      if (peRes.error) throw new Error(peRes.error.message);
      planEntitlements = (peRes.data ?? []) as PlanEntitlementRow[];
    }

    return deriveEntitlementSnapshot({
      tenantId,
      tenantEntitlements: (teRes.data ?? []) as TenantEntitlementRow[],
      planEntitlements,
      activePlanId,
    });
  });

// -----------------------------------------------------------------
// 3) TenantBillingHealth
// -----------------------------------------------------------------
export const getTenantBillingHealth = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<TenantBillingHealth> => {
    const tenantId = context.tenant.tenantId;
    const admin = await loadAdmin();

    const subsRes = await admin
      .from("tenant_subscriptions")
      .select(
        "id, tenant_id, plan_id, status, status_reason, started_at, trial_ends_at, current_period_start, current_period_end, canceled_at, suspended_at",
      )
      .eq("tenant_id", tenantId);
    if (subsRes.error) throw new Error(subsRes.error.message);
    const subscription = pickActiveSubscription(
      (subsRes.data ?? []) as SubscriptionRow[],
    );

    const mapRes = await admin
      .from("tenant_billing_provider_mappings")
      .select("tenant_id, provider_code, status, subscription_id")
      .eq("tenant_id", tenantId);
    if (mapRes.error) throw new Error(mapRes.error.message);
    const providerMapping = pickPrimaryMapping(
      (mapRes.data ?? []) as ProviderMappingRow[],
    );

    // Only received_at + processing_status are read. Provider refs,
    // payload_sanitized, payload_hash, idempotency_key, error_* are
    // NEVER selected — SCP-003 SCP3-G2 boundary.
    const evRes = await admin
      .from("billing_events")
      .select("tenant_id, received_at, processing_status")
      .eq("tenant_id", tenantId)
      .order("received_at", { ascending: false })
      .limit(1);
    if (evRes.error) throw new Error(evRes.error.message);
    const lastEvent =
      evRes.data && evRes.data.length > 0
        ? {
            tenant_id: tenantId,
            received_at: (evRes.data[0] as { received_at: string | null }).received_at,
            processing_status: (
              evRes.data[0] as { processing_status: string | null }
            ).processing_status,
          }
        : null;

    return deriveBillingHealth({
      tenantId,
      subscription,
      providerMapping,
      lastEvent,
    });
  });

// -----------------------------------------------------------------
// 4) CommercialAdminDiagnostic
//
// Diagnostic surface. Authorization strictly reuses the existing rule:
// Super Admin only accesses tenant-scoped data through an explicit
// impersonation header (context.tenant.impersonation === true, origin
// 'impersonation'). No new billing_admin / commercial_admin role is
// introduced; no membership row is required or altered.
// -----------------------------------------------------------------
export const getCommercialAdminDiagnostic = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<CommercialAdminDiagnostic> => {
    if (!context.tenant.isSuperAdmin || !context.tenant.impersonation) {
      throw new Error("Forbidden: super admin impersonation required");
    }
    const tenantId = context.tenant.tenantId;
    const admin = await loadAdmin();

    const subsRes = await admin
      .from("tenant_subscriptions")
      .select(
        "id, tenant_id, plan_id, status, status_reason, started_at, trial_ends_at, current_period_start, current_period_end, canceled_at, suspended_at",
      )
      .eq("tenant_id", tenantId);
    if (subsRes.error) throw new Error(subsRes.error.message);
    const subscription = pickActiveSubscription(
      (subsRes.data ?? []) as SubscriptionRow[],
    );

    const teCount = await admin
      .from("tenant_entitlements")
      .select("tenant_id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (teCount.error) throw new Error(teCount.error.message);

    const mapRes = await admin
      .from("tenant_billing_provider_mappings")
      .select("tenant_id, provider_code, status, subscription_id")
      .eq("tenant_id", tenantId);
    if (mapRes.error) throw new Error(mapRes.error.message);
    const providerMapping = pickPrimaryMapping(
      (mapRes.data ?? []) as ProviderMappingRow[],
    );

    const evCount = await admin
      .from("billing_events")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);
    if (evCount.error) throw new Error(evCount.error.message);

    return deriveAdminDiagnostic({
      tenantId,
      subscription,
      tenantEntitlementsCount: teCount.count ?? 0,
      providerMapping,
      billingEventsCount: evCount.count ?? 0,
    });
  });
