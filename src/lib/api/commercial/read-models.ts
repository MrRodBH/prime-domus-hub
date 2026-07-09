// SCP-004 — Commercial Server Read Functions
//
// Pure derivation layer for commercial read models. This module is
// deliberately dependency-free (no supabase, no server-only imports)
// so it can be unit-tested deterministically and imported by both
// client-safe and server-only modules without pulling secrets into
// the client bundle.
//
// SCP-003 boundary reaffirmed here:
//   client → server-only read function → commercial read model → sanitized response
//
// Every field in the DTOs below is explicitly whitelisted. Nothing in
// this file exposes provider refs, raw payloads, payload hashes,
// idempotency keys or error messages.

// ============================================================
// Row shapes (subset of DB columns actually consumed here)
// ============================================================

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  status: string | null;
  status_reason: string | null;
  started_at: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  suspended_at: string | null;
}

export interface PlanRow {
  id: string;
  code: string | null;
  name: string | null;
  status: string | null;
}

export interface ProviderMappingRow {
  tenant_id: string;
  provider_code: string | null;
  status: string | null;
  subscription_id: string | null;
}

export interface TenantEntitlementRow {
  tenant_id: string;
  entitlement_key: string;
  source: string | null;
  value_bool: boolean | null;
  value_int: number | null;
  value_decimal: number | string | null;
  value_text: string | null;
  effective_from: string | null;
  effective_until: string | null;
}

export interface PlanEntitlementRow {
  plan_id: string;
  entitlement_key: string;
  value_bool: boolean | null;
  value_int: number | null;
  value_decimal: number | string | null;
  value_text: string | null;
}

export interface BillingEventLite {
  tenant_id: string;
  received_at: string | null;
  processing_status: string | null;
}

// ============================================================
// DTOs — sanitized outputs
// ============================================================

export interface TenantCommercialSummary {
  tenantId: string;
  plan: {
    id: string | null;
    code: string | null;
    name: string | null;
    status: string | null;
  };
  subscription: {
    status: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    canceledAt: string | null;
  };
  billingProvider: {
    providerCode: string | null;
    status: string | null;
    configured: boolean;
  };
}

export interface EntitlementSnapshotItem {
  key: string;
  value: boolean | number | string | null;
  source: "tenant" | "plan" | "default";
  effective: boolean;
}

export interface TenantEntitlementSnapshot {
  tenantId: string;
  entitlements: EntitlementSnapshotItem[];
}

export type BillingHealthStatus =
  | "unknown"
  | "healthy"
  | "attention_required"
  | "blocked";

export interface TenantBillingHealth {
  tenantId: string;
  status: BillingHealthStatus;
  reasons: string[];
  lastBillingEventAt: string | null;
  hasProviderMapping: boolean;
}

// NOTE (SCP-004.1): the commercial admin diagnostic surface remains a
// documented future item only. It is intentionally NOT implemented at
// runtime — no DTO type, no derivation helper, no server function. A
// dedicated commercial authorization surface is required before it can
// be reintroduced (see docs/architecture/commercial/SCP-003).

// ============================================================
// Derivation helpers
// ============================================================

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);
const ATTENTION_SUB_STATUSES = new Set(["past_due", "grace"]);
const BLOCKED_SUB_STATUSES = new Set(["suspended", "canceled", "unpaid"]);

function pickValue(row: {
  value_bool: boolean | null;
  value_int: number | null;
  value_decimal: number | string | null;
  value_text: string | null;
}): boolean | number | string | null {
  if (row.value_bool !== null && row.value_bool !== undefined) return row.value_bool;
  if (row.value_int !== null && row.value_int !== undefined) return row.value_int;
  if (row.value_decimal !== null && row.value_decimal !== undefined) {
    const n = typeof row.value_decimal === "string" ? Number(row.value_decimal) : row.value_decimal;
    return Number.isFinite(n) ? n : String(row.value_decimal);
  }
  if (row.value_text !== null && row.value_text !== undefined) return row.value_text;
  return null;
}

function isEffective(now: Date, from: string | null, until: string | null): boolean {
  const t = now.getTime();
  if (from) {
    const f = new Date(from).getTime();
    if (Number.isFinite(f) && t < f) return false;
  }
  if (until) {
    const u = new Date(until).getTime();
    if (Number.isFinite(u) && t > u) return false;
  }
  return true;
}

export function deriveCommercialSummary(input: {
  tenantId: string;
  subscription: SubscriptionRow | null;
  plan: PlanRow | null;
  providerMapping: ProviderMappingRow | null;
}): TenantCommercialSummary {
  const { tenantId, subscription, plan, providerMapping } = input;
  return {
    tenantId,
    plan: {
      id: plan?.id ?? null,
      code: plan?.code ?? null,
      name: plan?.name ?? null,
      status: plan?.status ?? null,
    },
    subscription: {
      status: subscription?.status ?? null,
      currentPeriodStart: subscription?.current_period_start ?? null,
      currentPeriodEnd: subscription?.current_period_end ?? null,
      trialEndsAt: subscription?.trial_ends_at ?? null,
      canceledAt: subscription?.canceled_at ?? null,
    },
    billingProvider: {
      providerCode: providerMapping?.provider_code ?? null,
      status: providerMapping?.status ?? null,
      configured: providerMapping !== null,
    },
  };
}

export function deriveEntitlementSnapshot(input: {
  tenantId: string;
  now?: Date;
  tenantEntitlements: TenantEntitlementRow[];
  planEntitlements: PlanEntitlementRow[];
  activePlanId: string | null;
}): TenantEntitlementSnapshot {
  const now = input.now ?? new Date();
  const map = new Map<string, EntitlementSnapshotItem>();

  // Plan-level entitlements (base layer).
  if (input.activePlanId) {
    for (const pe of input.planEntitlements) {
      if (pe.plan_id !== input.activePlanId) continue;
      map.set(pe.entitlement_key, {
        key: pe.entitlement_key,
        value: pickValue(pe),
        source: "plan",
        effective: true,
      });
    }
  }

  // Tenant-level entitlements override plan values.
  for (const te of input.tenantEntitlements) {
    const effective = isEffective(now, te.effective_from, te.effective_until);
    map.set(te.entitlement_key, {
      key: te.entitlement_key,
      value: pickValue(te),
      source: "tenant",
      effective,
    });
  }

  const entitlements = Array.from(map.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
  return { tenantId: input.tenantId, entitlements };
}

export function deriveBillingHealth(input: {
  tenantId: string;
  subscription: SubscriptionRow | null;
  providerMapping: ProviderMappingRow | null;
  lastEvent: BillingEventLite | null;
}): TenantBillingHealth {
  const reasons: string[] = [];
  const hasProviderMapping = input.providerMapping !== null;
  const subStatus = input.subscription?.status ?? null;

  let status: BillingHealthStatus = "unknown";
  if (!input.subscription) {
    reasons.push("no_subscription");
    status = "unknown";
  } else if (subStatus && ACTIVE_SUB_STATUSES.has(subStatus)) {
    status = "healthy";
  } else if (subStatus && ATTENTION_SUB_STATUSES.has(subStatus)) {
    status = "attention_required";
    reasons.push(`subscription_status:${subStatus}`);
  } else if (subStatus && BLOCKED_SUB_STATUSES.has(subStatus)) {
    status = "blocked";
    reasons.push(`subscription_status:${subStatus}`);
  } else {
    status = "unknown";
    if (subStatus) reasons.push(`subscription_status:${subStatus}`);
  }

  if (!hasProviderMapping) reasons.push("no_provider_mapping");

  return {
    tenantId: input.tenantId,
    status,
    reasons,
    lastBillingEventAt: input.lastEvent?.received_at ?? null,
    hasProviderMapping,
  };
}

// SCP-004.1: admin diagnostic helper removed from runtime — see note above.
