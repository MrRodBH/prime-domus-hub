// SCP-012.0.2.1 §16 — Pure unit specs for the seat-limit RPC validator.
// No DB access; exercises validateSeatDecisionResponse semantically.

import { validateSeatDecisionResponse } from "@/lib/api/commercial/seat-limit-rpc-contract";

const TID = "00000000-0000-0000-0000-000000000001";
const INC = 1;

type Case = { name: string; input: unknown; shouldThrow: boolean };

function base(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TID,
    featureKey: "users.seats",
    allowed: false,
    reason: "billing_unknown",
    source: "none",
    limit: null,
    used: null,
    requestedIncrement: 1,
    remaining: null,
    ...overrides,
  };
}

const CASES: Case[] = [
  { name: "canonical entitled", input: base({ allowed: true, reason: "entitled", source: "tenant", limit: 10, used: 3, remaining: 7 }), shouldThrow: false },
  { name: "canonical limit_reached", input: base({ reason: "limit_reached", source: "plan", limit: 10, used: 10, remaining: 0 }), shouldThrow: false },
  { name: "canonical billing_unknown", input: base(), shouldThrow: false },
  { name: "canonical billing_attention_required", input: base({ reason: "billing_attention_required", source: "tenant" }), shouldThrow: false },
  { name: "canonical billing_blocked", input: base({ reason: "billing_blocked", source: "plan" }), shouldThrow: false },
  { name: "canonical not_entitled with source=plan", input: base({ reason: "not_entitled", source: "plan" }), shouldThrow: false },
  { name: "canonical not_evaluated form A", input: base({ reason: "not_evaluated", source: "none" }), shouldThrow: false },
  { name: "canonical not_evaluated form B", input: base({ reason: "not_evaluated", source: "tenant", limit: 5 }), shouldThrow: false },

  { name: "missing field", input: (() => { const b = base(); delete (b as Record<string, unknown>).remaining; return b; })(), shouldThrow: true },
  { name: "unknown field", input: { ...base(), extra: 1 }, shouldThrow: true },
  { name: "tenant mismatch", input: base({ tenantId: "00000000-0000-0000-0000-000000000999" }), shouldThrow: true },
  { name: "featureKey mismatch", input: base({ featureKey: "wrong" }), shouldThrow: true },
  { name: "unknown reason", input: base({ reason: "bogus" }), shouldThrow: true },
  { name: "unknown source", input: base({ source: "bogus" }), shouldThrow: true },
  { name: "allowed=false + entitled", input: base({ allowed: false, reason: "entitled", source: "tenant", limit: 10, used: 3, remaining: 7 }), shouldThrow: true },
  { name: "allowed=true + billing_blocked", input: base({ allowed: true, reason: "billing_blocked", source: "plan" }), shouldThrow: true },
  { name: "entitled with wrong remaining", input: base({ allowed: true, reason: "entitled", source: "tenant", limit: 10, used: 3, remaining: 6 }), shouldThrow: true },
  { name: "entitled used+increment > limit", input: base({ allowed: true, reason: "entitled", source: "tenant", limit: 5, used: 5, remaining: 0 }), shouldThrow: true },
  { name: "entitled with source=none", input: base({ allowed: true, reason: "entitled", source: "none", limit: 10, used: 3, remaining: 7 }), shouldThrow: true },
  { name: "limit_reached still fits", input: base({ reason: "limit_reached", source: "plan", limit: 100, used: 50, remaining: 0 }), shouldThrow: true },
  { name: "limit_reached with remaining!=0", input: base({ reason: "limit_reached", source: "plan", limit: 10, used: 10, remaining: 1 }), shouldThrow: true },
  { name: "billing_unknown with source=tenant", input: base({ reason: "billing_unknown", source: "tenant" }), shouldThrow: true },
  { name: "not_entitled carrying limit", input: base({ reason: "not_entitled", source: "plan", limit: 10 }), shouldThrow: true },
  { name: "NaN in limit", input: base({ reason: "not_evaluated", source: "tenant", limit: NaN }), shouldThrow: true },
  { name: "Infinity in limit", input: base({ reason: "not_evaluated", source: "tenant", limit: Number.POSITIVE_INFINITY }), shouldThrow: true },
  { name: "decimal in limit", input: base({ reason: "not_evaluated", source: "tenant", limit: 3.14 }), shouldThrow: true },
  { name: "negative in limit", input: base({ reason: "not_evaluated", source: "tenant", limit: -1 }), shouldThrow: true },
  { name: "limit > MAX_SAFE_INTEGER", input: base({ reason: "not_evaluated", source: "tenant", limit: Number.MAX_SAFE_INTEGER + 1 }), shouldThrow: true },
  { name: "limit == MAX_SAFE_INTEGER (allowed)", input: base({ allowed: true, reason: "entitled", source: "tenant", limit: Number.MAX_SAFE_INTEGER, used: 0, remaining: Number.MAX_SAFE_INTEGER }), shouldThrow: false },
  { name: "requestedIncrement mismatch", input: base({ requestedIncrement: 2 }), shouldThrow: true },
  { name: "array input", input: [], shouldThrow: true },
  { name: "null input", input: null, shouldThrow: true },
];

export async function runCommercialSeatRpcContractSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const c of CASES) {
    let threw = false;
    let err: unknown = null;
    try {
      validateSeatDecisionResponse(c.input, TID, INC);
    } catch (e) {
      threw = true;
      err = e;
    }
    const ok = threw === c.shouldThrow;
    if (ok) {
      passed += 1;
    } else {
      failed += 1;
      console.error(
        `  ✗ ${c.name}: shouldThrow=${c.shouldThrow}, threw=${threw}`,
        err instanceof Error ? err.message : "",
      );
    }
  }
  return { passed, failed };
}
