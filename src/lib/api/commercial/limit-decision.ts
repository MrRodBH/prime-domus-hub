// SCP-011 — Commercial Seat Limit Server Runtime.
//
// Pure, dependency-free helpers for the quantitative seat limit
// decision. This module is intentionally free of Supabase / server-only
// imports so it can be unit-tested deterministically and reused by
// both the runtime server function and specs.
//
// Hard boundaries preserved from SCP-010.x:
//   • Architecture First — DTO is closed and sanitized.
//   • Server-side authority only — this helper does NOT resolve tenant,
//     does NOT read the database, does NOT call a provider, does NOT
//     mutate state. It is a pure decision function.
//   • CommercialFeatureDecision precedes CommercialLimitDecision — this
//     helper REQUIRES a pre-computed feature decision and never
//     recomputes billing / entitlement precedence.
//   • No dual-path — the seat limit numeric value is extracted from the
//     same TenantEntitlementSnapshot already produced by the SCP-004
//     read model resolver; this file does NOT re-derive entitlements.
//   • No enforcement — SCP-011 is read-only. There is no lock, no
//     reservation, no atomic decrement here.

import type {
  CommercialFeatureDecision,
  CommercialFeatureDecisionReason,
  CommercialFeatureDecisionSource,
} from "./feature-gate";
import type { TenantEntitlementSnapshot } from "./read-models";

// ============================================================
// DTO — closed enums, sanitized output
// ============================================================

export type CommercialLimitDecisionReason = CommercialFeatureDecisionReason;
export type CommercialLimitDecisionSource = CommercialFeatureDecisionSource;

export interface CommercialLimitDecision {
  tenantId: string;
  featureKey: string;
  allowed: boolean;
  reason: CommercialLimitDecisionReason;
  source: CommercialLimitDecisionSource;
  limit: number | null;
  used: number | null;
  requestedIncrement: number;
  remaining: number | null;
}

// ============================================================
// Fixed feature key — never comes from the client
// ============================================================

export const SEAT_FEATURE_KEY = "users.seats" as const;

// ============================================================
// Input normalization for requestedIncrement
//
// Contract (SCP-011 §9):
//   • undefined → 1
//   • 1         → 1
//   • anything else (0, negative, fractional, NaN, Infinity, string,
//     null, out-of-range integer, other integers) → throw
// ============================================================

export function normalizeSeatIncrement(raw: unknown): number {
  if (raw === undefined) return 1;
  if (typeof raw !== "number") {
    throw new Error("Invalid requestedIncrement");
  }
  if (!Number.isFinite(raw)) {
    throw new Error("Invalid requestedIncrement");
  }
  if (!Number.isInteger(raw)) {
    throw new Error("Invalid requestedIncrement");
  }
  if (raw !== 1) {
    throw new Error("Invalid requestedIncrement");
  }
  return 1;
}

// ============================================================
// Strict public input boundary — SCP-011.1 §6
//
// Accepts ONLY:
//   • undefined
//   • {}                       → { requestedIncrement: 1 }
//   • { requestedIncrement: 1} → { requestedIncrement: 1 }
//
// Rejects null, arrays, primitives, and ANY property other than
// `requestedIncrement`. `tenantId`, `featureKey`, `used`, `limit`,
// `remaining`, `source`, `billingStatus`, `membershipCount`,
// `currentSeats` are structurally forbidden.
// ============================================================

export interface CommercialSeatLimitInput {
  requestedIncrement?: 1;
}

const ALLOWED_SEAT_INPUT_KEYS: ReadonlySet<string> = new Set([
  "requestedIncrement",
]);

export function normalizeCommercialSeatLimitInput(
  raw: unknown,
): { requestedIncrement: number } {
  if (raw === undefined) return { requestedIncrement: 1 };
  if (raw === null) throw new Error("Invalid input");
  if (typeof raw !== "object") throw new Error("Invalid input");
  if (Array.isArray(raw)) throw new Error("Invalid input");
  const keys = Object.keys(raw as Record<string, unknown>);
  for (const k of keys) {
    if (!ALLOWED_SEAT_INPUT_KEYS.has(k)) {
      throw new Error(`Unknown input property: ${k}`);
    }
  }
  const inc = normalizeSeatIncrement(
    (raw as { requestedIncrement?: unknown }).requestedIncrement,
  );
  return { requestedIncrement: inc };
}


// ============================================================
// Integer validation helper
//
// SCP-011 §14/§15: valid limit AND valid used must be finite integers
// in [0, Number.MAX_SAFE_INTEGER]. Sentinels are forbidden.
// ============================================================

export function isValidCommercialInteger(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isFinite(n) &&
    Number.isInteger(n) &&
    n >= 0 &&
    n <= Number.MAX_SAFE_INTEGER
  );
}

// ============================================================
// Seat limit extraction — reuses the SCP-004 entitlement snapshot
//
// SCP-011 §12/§13: no dual-path resolver. We consume the snapshot
// produced by deriveEntitlementSnapshot (which already applies the
// tenant_entitlements → plan_entitlements precedence) and only pick
// the numeric users.seats value.
//
// Mapping of source (SCP-011 §13):
//   • snapshot item source is already the sanitized enum
//     `"tenant" | "plan" | "default"` produced by SCP-004 — we forward
//     it as-is.
//   • no item, item not effective, or invalid numeric value → source
//     collapses to `"none"` and limit becomes null (evaluator will
//     return `not_evaluated`).
// ============================================================

export interface ExtractedSeatLimit {
  limit: number | null;
  source: CommercialLimitDecisionSource;
}

export function extractSeatLimit(
  snapshot: TenantEntitlementSnapshot,
): ExtractedSeatLimit {
  const item =
    snapshot.entitlements.find((e) => e.key === SEAT_FEATURE_KEY) ?? null;
  if (!item) return { limit: null, source: "none" };
  if (!item.effective) return { limit: null, source: "none" };
  const v = item.value;
  if (!isValidCommercialInteger(v)) return { limit: null, source: "none" };
  return { limit: v, source: item.source };
}

// ============================================================
// Used-count validation helper
//
// SCP-011 §14: treat as read failure any of:
//   • null/undefined count
//   • negative count
//   • fractional count
//   • non-finite count
//   • count above Number.MAX_SAFE_INTEGER
// ============================================================

export function validateSeatUsedCount(raw: unknown): number | null {
  return isValidCommercialInteger(raw) ? raw : null;
}

// ============================================================
// Deterministic decision helper
//
// SCP-011 §16 / §17 / §18. Never accesses the database or the tenant
// resolver — the caller is responsible for producing every input.
// `remaining` represents the saldo BEFORE the future operation, since
// SCP-011 is read-only (no atomic reservation).
// ============================================================

export function decideCommercialSeatLimit(input: {
  featureDecision: CommercialFeatureDecision;
  extracted: ExtractedSeatLimit;
  used: number | null;
  requestedIncrement: number;
}): CommercialLimitDecision {
  const { featureDecision, extracted, used, requestedIncrement } = input;
  const tenantId = featureDecision.tenantId;
  const featureKey = featureDecision.featureKey;

  // §11.1 — Commercial (feature) decision negative → propagate as-is.
  // Do NOT re-read used/limit/billing here.
  if (!featureDecision.allowed) {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: featureDecision.reason,
      source: featureDecision.source,
      limit: null,
      used: null,
      requestedIncrement,
      remaining: null,
    };
  }

  const { limit, source } = extracted;

  // §18 — feature positive but limit unresolved → not_evaluated / none.
  if (!isValidCommercialInteger(limit)) {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "not_evaluated",
      source: "none",
      limit: null,
      used: null,
      requestedIncrement,
      remaining: null,
    };
  }

  // §18 — limit resolved but used unavailable → not_evaluated with
  // resolved source/limit; used remains null; NEVER emit limit_reached.
  if (!isValidCommercialInteger(used)) {
    return {
      tenantId,
      featureKey,
      allowed: false,
      reason: "not_evaluated",
      source,
      limit,
      used: null,
      requestedIncrement,
      remaining: null,
    };
  }

  // §17.1 — operation fits.
  if (used + requestedIncrement <= limit) {
    return {
      tenantId,
      featureKey,
      allowed: true,
      reason: "entitled",
      source,
      limit,
      used,
      requestedIncrement,
      remaining: Math.max(limit - used, 0),
    };
  }

  // §17.2 / §17.3 — limit reached (also covers already-above-limit).
  return {
    tenantId,
    featureKey,
    allowed: false,
    reason: "limit_reached",
    source,
    limit,
    used,
    requestedIncrement,
    remaining: 0,
  };
}
