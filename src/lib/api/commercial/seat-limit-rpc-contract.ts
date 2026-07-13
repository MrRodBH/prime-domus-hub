// SCP-012.0.2.1 §12 — Pure RPC response validator for the seat-limit
// authority (public.resolve_commercial_seat_decision).
//
// This module is intentionally free of any supabase / server-only /
// TanStack / React / route imports so it can be unit-tested and reused
// without pulling `client.server` into the client bundle. It contains
// no I/O.

import type { CommercialLimitDecision } from "./limit-decision";

// ============================================================
// Closed enums / whitelists — mirror the SQL resolver contract
// ============================================================

export const SEAT_RPC_ALLOWED_REASONS: ReadonlySet<string> = new Set([
  "entitled",
  "not_entitled",
  "limit_reached",
  "billing_unknown",
  "billing_attention_required",
  "billing_blocked",
  "not_evaluated",
]);

// SCP-012.0.2.1 §10 — `default` remains a reserved token in the DTO
// enum for forward compatibility; it is currently UNREACHABLE at
// runtime because no persisted producer materialises it. Precedence
// materialised in SQL is tenant > plan > none.
export const SEAT_RPC_ALLOWED_SOURCES: ReadonlySet<string> = new Set([
  "tenant",
  "plan",
  "default",
  "none",
]);

export const SEAT_RPC_ALLOWED_KEYS: ReadonlySet<string> = new Set([
  "tenantId",
  "featureKey",
  "allowed",
  "reason",
  "source",
  "limit",
  "used",
  "requestedIncrement",
  "remaining",
]);

// Reasons that MUST NOT carry quantitative fields (limit/used/remaining
// are structurally null). billing_unknown additionally requires source
// to be "none" (SCP-012.0.2.1 §12).
const NEGATIVE_COMMERCIAL_REASONS: ReadonlySet<string> = new Set([
  "not_entitled",
  "billing_unknown",
  "billing_attention_required",
  "billing_blocked",
]);

// ============================================================
// Primitive helpers
// ============================================================

export function isSeatCommercialInteger(v: unknown): v is number {
  return (
    typeof v === "number" &&
    Number.isFinite(v) &&
    Number.isInteger(v) &&
    v >= 0 &&
    v <= Number.MAX_SAFE_INTEGER
  );
}

export function isSeatCommercialIntegerOrNull(v: unknown): v is number | null {
  return v === null || isSeatCommercialInteger(v);
}

// ============================================================
// validateSeatDecisionResponse — SCP-012.0.2.1 §12
//
// Rejects:
//   • non-plain-objects, arrays, null;
//   • unknown fields (whitelist SEAT_RPC_ALLOWED_KEYS);
//   • wrong tenantId / featureKey / requestedIncrement;
//   • unknown reason / source;
//   • non-integer or out-of-range numeric fields;
//   • structural incoherence between reason and quantitative fields;
//   • semantic incoherence:
//       - allowed=true with reason != entitled;
//       - entitled without limit/used/remaining or with source=none;
//       - entitled with used+increment > limit;
//       - entitled with remaining != max(limit - used, 0);
//       - limit_reached without limit/used;
//       - limit_reached with used+increment <= limit;
//       - limit_reached with remaining != 0;
//       - billing_unknown with source != "none";
//       - not_entitled / billing_* carrying non-null limit/used/remaining;
//       - not_evaluated in any shape other than the two canonical forms:
//           A) allowed=false, source=none, limit/used/remaining=null;
//           B) allowed=false, source!=none, limit=integer,
//              used=null, remaining=null.
// ============================================================
export function validateSeatDecisionResponse(
  raw: unknown,
  expectedTenantId: string,
  expectedIncrement: number,
): CommercialLimitDecision {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid RPC response");
  }
  const r = raw as Record<string, unknown>;

  // Whitelist keys.
  for (const k of Object.keys(r)) {
    if (!SEAT_RPC_ALLOWED_KEYS.has(k)) {
      throw new Error(`Unexpected field: ${k}`);
    }
  }
  // Every whitelisted key must be present.
  for (const k of SEAT_RPC_ALLOWED_KEYS) {
    if (!(k in r)) throw new Error(`Missing field: ${k}`);
  }

  if (typeof r.tenantId !== "string" || r.tenantId.length === 0) {
    throw new Error("Invalid tenantId");
  }
  if (r.tenantId !== expectedTenantId) throw new Error("Tenant mismatch");
  if (r.featureKey !== "users.seats") throw new Error("Feature key mismatch");
  if (typeof r.allowed !== "boolean") throw new Error("Invalid allowed");
  if (typeof r.reason !== "string" || !SEAT_RPC_ALLOWED_REASONS.has(r.reason)) {
    throw new Error("Invalid reason");
  }
  if (typeof r.source !== "string" || !SEAT_RPC_ALLOWED_SOURCES.has(r.source)) {
    throw new Error("Invalid source");
  }
  if (!isSeatCommercialIntegerOrNull(r.limit)) throw new Error("Invalid limit");
  if (!isSeatCommercialIntegerOrNull(r.used)) throw new Error("Invalid used");
  if (!isSeatCommercialIntegerOrNull(r.remaining)) {
    throw new Error("Invalid remaining");
  }
  if (r.requestedIncrement !== expectedIncrement) {
    throw new Error("Invalid requestedIncrement");
  }

  // ---- Structural / semantic coherence per reason ----
  const reason = r.reason as string;
  const source = r.source as string;
  const allowed = r.allowed as boolean;
  const limit = r.limit as number | null;
  const used = r.used as number | null;
  const remaining = r.remaining as number | null;
  const increment = r.requestedIncrement as number;

  if (allowed === true && reason !== "entitled") {
    throw new Error("Incoherent allowed/reason");
  }

  if (reason === "entitled") {
    if (allowed !== true) throw new Error("Incoherent entitled allowed");
    if (source === "none") throw new Error("Incoherent entitled source");
    if (limit === null || used === null || remaining === null) {
      throw new Error("Incoherent entitled response");
    }
    if (used + increment > limit) {
      throw new Error("Incoherent entitled: used+increment exceeds limit");
    }
    const expectedRemaining = Math.max(limit - used, 0);
    if (remaining !== expectedRemaining) {
      throw new Error("Incoherent entitled remaining");
    }
  } else if (reason === "limit_reached") {
    if (allowed !== false) throw new Error("Incoherent limit_reached allowed");
    if (source === "none") throw new Error("Incoherent limit_reached source");
    if (limit === null || used === null) {
      throw new Error("Incoherent limit_reached response");
    }
    if (used + increment <= limit) {
      throw new Error("Incoherent limit_reached: still fits");
    }
    if (remaining !== 0) throw new Error("Incoherent limit_reached remaining");
  } else if (NEGATIVE_COMMERCIAL_REASONS.has(reason)) {
    if (allowed !== false) throw new Error("Incoherent negative allowed");
    if (limit !== null || used !== null || remaining !== null) {
      throw new Error("Incoherent negative quantitative fields");
    }
    if (reason === "billing_unknown" && source !== "none") {
      throw new Error("Incoherent billing_unknown source");
    }
  } else if (reason === "not_evaluated") {
    if (allowed !== false) throw new Error("Incoherent not_evaluated allowed");
    // Canonical forms:
    //  A) feature/limit not evaluable → source=none, limit=null, used=null, remaining=null;
    //  B) limit resolved but used unavailable → source!=none, limit=int, used=null, remaining=null.
    if (used !== null) throw new Error("Incoherent not_evaluated used");
    if (remaining !== null) {
      throw new Error("Incoherent not_evaluated remaining");
    }
    if (source === "none") {
      if (limit !== null) throw new Error("Incoherent not_evaluated form A");
    } else {
      if (!isSeatCommercialInteger(limit)) {
        throw new Error("Incoherent not_evaluated form B");
      }
    }
  } else {
    // Unreachable — reason whitelist already rejected everything else.
    throw new Error("Invalid reason");
  }

  return {
    tenantId: r.tenantId as string,
    featureKey: r.featureKey as string,
    allowed: allowed,
    reason: reason as CommercialLimitDecision["reason"],
    source: source as CommercialLimitDecision["source"],
    limit,
    used,
    requestedIncrement: increment,
    remaining,
  };
}
