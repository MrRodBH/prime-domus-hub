// SCP-006 — Commercial Feature Gate Server Runtime
//
// Pure deterministic decision helper. No supabase, no I/O, no mutation.
// Consumes ONLY the sanitized DTOs derived in SCP-004 (`read-models.ts`)
// and returns a sanitized `CommercialFeatureDecision`.
//
// Hard boundaries preserved from SCP-005 (SCP5-G1..SCP5-G8):
//   • decisions are server-side only (this helper is imported by a
//     server function; never wired to the browser);
//   • entitlements do NOT replace membership authorization — the caller
//     already ran `requireTenant` (which composes `requireSupabaseAuth`)
//     before invoking the gate;
//   • no direct client reads from commercial tables — the gate consumes
//     already-sanitized read models, never raw rows;
//   • no billing enforcement without explicit governance — a
//     `billing_blocked` reason denies the feature but does NOT trigger a
//     mutation, cancellation, provider call, or admin surface;
//   • no commercial admin surface, no provider runtime integration;
//   • deterministic allow/deny reasons — enums are closed and no free
//     string ever reaches the DTO.
//
// This file is dependency-free on purpose so it can be unit-tested
// deterministically and reused by the server function without pulling
// server-only imports into the client bundle.

import type {
  TenantBillingHealth,
  TenantEntitlementSnapshot,
} from "./read-models";

// ============================================================
// DTOs — closed enums, sanitized output
// ============================================================

export type CommercialFeatureDecisionReason =
  | "entitled"
  | "not_entitled"
  | "limit_reached"
  | "billing_unknown"
  | "billing_attention_required"
  | "billing_blocked"
  | "not_evaluated";

export type CommercialFeatureDecisionSource =
  | "tenant"
  | "plan"
  | "default"
  | "none";

export interface CommercialFeatureDecision {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason: CommercialFeatureDecisionReason;
  source: CommercialFeatureDecisionSource;
}

export interface CommercialFeatureDecisionInput {
  featureKey: string;
}

// ============================================================
// Input normalization
// ============================================================

const FEATURE_KEY_RE = /^[a-z0-9_.:-]{1,120}$/;

/**
 * Normalize a client-provided featureKey. Trims + lowercases + rejects
 * anything outside a conservative charset. Throws on invalid input; the
 * server function converts the throw into a controlled 4xx.
 *
 * The client NEVER sends `tenantId` as authority — the caller resolves
 * tenant server-side via `requireTenant` and passes only the sanitized
 * key here.
 */
export function normalizeFeatureKey(raw: unknown): string {
  if (typeof raw !== "string") {
    throw new Error("featureKey is required");
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0) {
    throw new Error("featureKey is required");
  }
  if (!FEATURE_KEY_RE.test(trimmed)) {
    throw new Error("Invalid featureKey");
  }
  return trimmed;
}

// ============================================================
// Deterministic decision
// ============================================================

/**
 * Deterministic feature-gate decision.
 *
 * Precedence (auditable, top-down, no heuristics, no fallbacks):
 *   1. billing.status === "blocked"             → deny billing_blocked
 *   2. billing.status === "attention_required"  → deny billing_attention_required
 *   3. entitlement found AND effective          → allow entitled
 *   4. entitlement found AND not effective      → deny not_entitled (source from item)
 *   5. billing.status === "unknown"             → deny billing_unknown (source none)
 *   6. otherwise                                → deny not_entitled (source none)
 *
 * Notes:
 *   • This helper is a feature-gate. It NEVER charges, cancels, calls a
 *     provider, or mutates state. `billing_blocked` here is a
 *     documental denial reason, not real billing enforcement (SCP5-G4).
 *   • `limit_reached` and `not_evaluated` are reserved enum members for
 *     future extensions; they are not produced by the current logic.
 */
export function decideCommercialFeature(input: {
  tenantId: string;
  featureKey: string;
  snapshot: TenantEntitlementSnapshot;
  billing: TenantBillingHealth;
}): CommercialFeatureDecision {
  const { tenantId, featureKey, snapshot, billing } = input;

  const item = snapshot.entitlements.find((e) => e.key === featureKey) ?? null;
  const itemSource: CommercialFeatureDecisionSource = item ? item.source : "none";

  // 1) Billing blocked wins over everything (deny, no side effects).
  if (billing.status === "blocked") {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "billing_blocked",
      source: itemSource,
    };
  }

  // 2) Billing attention_required → deny.
  if (billing.status === "attention_required") {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "billing_attention_required",
      source: itemSource,
    };
  }

  // 3) Entitlement found and effective → allow.
  if (item && item.effective) {
    // Guard: `value === false` explicitly disables the feature even
    // when effective. Any other value (true, number, string, null)
    // counts as entitled.
    if (item.value === false) {
      return {
        tenantId,
        featureKey,
        allowed: false,
        reason: "not_entitled",
        source: item.source,
      };
    }
    return {
      tenantId,
      featureKey,
      allowed: true,
      reason: "entitled",
      source: item.source,
    };
  }

  // 4) Entitlement found but not effective → deny (source from item).
  if (item && !item.effective) {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "not_entitled",
      source: item.source,
    };
  }

  // 5) No entitlement + billing unknown → billing_unknown.
  if (billing.status === "unknown") {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "billing_unknown",
      source: "none",
    };
  }

  // 6) Otherwise → not_entitled / none.
  return {
    tenantId,
    featureKey,
    allowed: false,
    reason: "not_entitled",
    source: "none",
  };
}
