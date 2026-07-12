// SCP-004 / SCP-004.1 — Commercial Server Read Functions
//
// Server-only entry points for the commercial read models planned in
// SCP-003. Every function:
//   • runs behind requireTenant (server-side tenant resolution with
//     active membership validated);
//   • loads supabaseAdmin inside the handler body only (never at module
//     scope — the file is client-reachable via the router bundle);
//   • returns a sanitized DTO derived by pure helpers in ./read-models;
//   • performs read-only queries — no insert/update/upsert/delete/rpc.
//
// Hard boundaries preserved from SCP-003 (SCP3-G1..G8):
//   • no permissive RLS is created here;
//   • no privileged commercial role is introduced;
//   • no provider integration, no external hook, no purchase flow;
//   • no direct client read of commercial/billing tables;
//   • provider refs / raw payloads / payload hashes / idempotency keys
//     are NEVER exposed — see read-models DTO whitelist.

import { createServerFn } from "@tanstack/react-start";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  deriveBillingHealth,
  deriveCommercialSummary,
  deriveEntitlementSnapshot,
  type PlanEntitlementRow,
  type PlanRow,
  type ProviderMappingRow,
  type SubscriptionRow,
  type TenantBillingHealth,
  type TenantCommercialSummary,
  type TenantEntitlementRow,
  type TenantEntitlementSnapshot,
} from "./read-models";
import {
  decideCommercialFeature,
  normalizeFeatureKey,
  type CommercialFeatureDecision,
} from "./feature-gate";
import { evaluateFeatureCatalogGate } from "./feature-catalog";
import {
  SEAT_FEATURE_KEY,
  decideCommercialSeatLimit,
  extractSeatLimit,
  normalizeSeatIncrement,
  validateSeatUsedCount,
  type CommercialLimitDecision,
} from "./limit-decision";

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
// 4) Commercial admin diagnostic — INTENTIONALLY NOT EXPOSED (SCP-004.1)
//
// The commercial admin diagnostic surface is a future item, not
// implemented at runtime in SCP-004. Reintroducing it requires a
// dedicated commercial authorization layer — it must not rely on
// tenant role, on has_role(auth.uid(), ...), or on super-user session
// hopping used as commercial governance. Documentation-only.
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// 5) SCP-006 — Commercial Feature Gate Server Runtime
//
// Deterministic server-side decision surface. Consumes the SCP-004
// read models (entitlement snapshot + billing health) and returns a
// sanitized `CommercialFeatureDecision`. Never mutates, never calls a
// provider, never exposes raw rows.
//
// Hard boundaries preserved from SCP-005:
//   • runs behind `requireTenant` — membership authorization always
//     precedes the entitlement decision (SCP5-G2);
//   • Super Admin has NO commercial bypass — impersonation still goes
//     through `requireTenant` and the same decision applies (SCP5-G2);
//   • no direct client read of commercial/billing tables (SCP5-G3);
//   • no billing enforcement side effect — `billing_blocked` denies
//     the feature only, no cancel/charge/provider call (SCP5-G4);
//   • no commercial admin surface, no provider integration (SCP5-G5/G6);
//   • allow/deny reasons are a closed enum (SCP5-G7).
// -----------------------------------------------------------------
export const getCommercialFeatureDecision = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: { featureKey: unknown }) => ({
    featureKey: normalizeFeatureKey(data?.featureKey),
  }))
  .handler(async ({ context, data }): Promise<CommercialFeatureDecision> => {
    const tenantId = context.tenant.tenantId;
    const featureKey = data.featureKey;

    // SCP-008 — catalog gate: non-cataloged keys short-circuit as
    // `not_evaluated` before any snapshot / billing read.
    const catalogGate = evaluateFeatureCatalogGate({ tenantId, featureKey });
    if (catalogGate) return catalogGate;

    // SCP-011 §12 (no dual-path): every commercial resolver — feature
    // gate and seat limit — funnels through the same context loader
    // below so tenant_subscriptions / tenant_entitlements /
    // commercial_plan_entitlements / tenant_billing_provider_mappings /
    // billing_events precedence is computed exactly once.
    const admin = await loadAdmin();
    const { snapshot, billing } = await loadTenantCommercialContext(
      admin,
      tenantId,
    );

    return decideCommercialFeature({
      tenantId,
      featureKey,
      snapshot,
      billing,
    });
  });

// -----------------------------------------------------------------
// Shared commercial context loader — server-only, module-scope.
//
// SCP-011 §12: this helper is the ONLY authoritative resolver for the
// pair `(TenantEntitlementSnapshot, TenantBillingHealth)`. Both
// getCommercialFeatureDecision and getCommercialSeatLimitDecision go
// through it, so no parallel commercial path can appear.
// It performs read-only queries only; there is no mutation, provider
// call, webhook, checkout or admin surface here.
// -----------------------------------------------------------------
async function loadTenantCommercialContext(
  admin: Awaited<ReturnType<typeof loadAdmin>>,
  tenantId: string,
): Promise<{
  snapshot: TenantEntitlementSnapshot;
  billing: TenantBillingHealth;
}> {
  const subsRes = await admin
    .from("tenant_subscriptions")
    .select(
      "id, tenant_id, plan_id, status, status_reason, started_at, trial_ends_at, current_period_start, current_period_end, canceled_at, suspended_at",
    )
    .eq("tenant_id", tenantId);
  if (subsRes.error) throw new Error(subsRes.error.message);
  const subs = (subsRes.data ?? []) as SubscriptionRow[];
  const subscription = pickActiveSubscription(subs);
  const activePlanId = subscription?.plan_id ?? null;

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

  const mapRes = await admin
    .from("tenant_billing_provider_mappings")
    .select("tenant_id, provider_code, status, subscription_id")
    .eq("tenant_id", tenantId);
  if (mapRes.error) throw new Error(mapRes.error.message);
  const providerMapping = pickPrimaryMapping(
    (mapRes.data ?? []) as ProviderMappingRow[],
  );

  // Only received_at + processing_status are read (SCP3-G2 boundary).
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
          received_at: (evRes.data[0] as { received_at: string | null })
            .received_at,
          processing_status: (
            evRes.data[0] as { processing_status: string | null }
          ).processing_status,
        }
      : null;

  const snapshot: TenantEntitlementSnapshot = deriveEntitlementSnapshot({
    tenantId,
    tenantEntitlements: (teRes.data ?? []) as TenantEntitlementRow[],
    planEntitlements,
    activePlanId,
  });
  const billing: TenantBillingHealth = deriveBillingHealth({
    tenantId,
    subscription,
    providerMapping,
    lastEvent,
  });
  return { snapshot, billing };
}

// -----------------------------------------------------------------
// 6) SCP-011 — Commercial Seat Limit Server Runtime
//
// Read-only, server-side, quantitative decision surface for the fixed
// feature key `users.seats`. Never accepts tenantId / featureKey /
// used / limit / remaining / source / billing status / membership
// count from the client. The feature key is fixed server-side.
//
// Hard boundaries preserved from SCP-010.x (SCP10-G1..):
//   • requireTenant is mandatory (server-side tenant resolution);
//   • Super Admin without impersonation is rejected by requireTenant
//     itself (no bypass, no client-selected tenant);
//   • Super Admin impersonating is subject to the same limit;
//   • CommercialFeatureDecision precedes CommercialLimitDecision;
//   • no dual-path — reuses loadTenantCommercialContext and the
//     SCP-004 derivation helpers to obtain the seat limit value;
//   • used is a server-side COUNT over public.tenant_members with
//     membership_status IN ('active', 'invited');
//   • no mutation, no lock, no reservation, no enforcement, no
//     provider call, no webhook, no admin surface.
// -----------------------------------------------------------------
export const getCommercialSeatLimitDecision = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => {
    const input = (data ?? {}) as { requestedIncrement?: unknown };
    return {
      requestedIncrement: normalizeSeatIncrement(input.requestedIncrement),
    };
  })
  .handler(async ({ context, data }): Promise<CommercialLimitDecision> => {
    const tenantId = context.tenant.tenantId;
    const featureKey = SEAT_FEATURE_KEY;
    const requestedIncrement = data.requestedIncrement;

    const admin = await loadAdmin();
    const { snapshot, billing } = await loadTenantCommercialContext(
      admin,
      tenantId,
    );

    // SCP-011 §11 — always compute the commercial decision first.
    const featureDecision = decideCommercialFeature({
      tenantId,
      featureKey,
      snapshot,
      billing,
    });

    // §11.1 — negative feature decision: DO NOT read tenant_members,
    // DO NOT recompute limits/billing/source. Propagate as-is.
    if (!featureDecision.allowed) {
      return decideCommercialSeatLimit({
        featureDecision,
        limit: null,
        used: null,
        requestedIncrement,
      });
    }

    // §12/§13 — extract the seat limit from the SAME snapshot used by
    // the feature decision. No parallel resolver.
    const { limit, source: limitSource } = extractSeatLimit(snapshot);

    // §14 — authoritative server-side count of consumed seats.
    // active consumes, invited reserves; suspended/revoked ignored.
    // role does not affect the count.
    let usedRaw: number | null = null;
    try {
      const countRes = await admin
        .from("tenant_members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .in("membership_status", ["active", "invited"]);
      if (countRes.error) {
        usedRaw = null;
      } else {
        usedRaw = countRes.count ?? null;
      }
    } catch {
      usedRaw = null;
    }
    const used = validateSeatUsedCount(usedRaw);

    const decision = decideCommercialSeatLimit({
      featureDecision,
      limit,
      used,
      requestedIncrement,
    });

    // The pure helper falls back to source `"none"` only when the
    // limit itself is unresolved (§18). When the limit IS resolved but
    // used is not, we preserve the resolved limit source explicitly.
    if (
      decision.reason === "not_evaluated" &&
      decision.limit !== null &&
      limitSource !== "none"
    ) {
      return { ...decision, source: limitSource };
    }
    if (decision.limit !== null && limitSource !== "none") {
      // Ensure the source we report matches the resolver used to obtain
      // the numeric limit (tenant/plan/default), not the feature source.
      return { ...decision, source: limitSource };
    }
    return decision;
  });
