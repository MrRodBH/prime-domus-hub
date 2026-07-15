// PR-M1 — Boundary tests for transitionLead.
// Deterministic; no live DB. Validates contract mapping and error codes.

import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  transitionLead,
  mapRpcError,
  LeadTransitionError,
  LEAD_TRANSITION_ERROR_CODES,
  LeadTransitionInputSchema,
} from "../lead-transition.server";

type RpcResult = { data: unknown; error: { message: string; code?: string; details?: string; hint?: string } | null };

function fakeSupabase(result: RpcResult): SupabaseClient<Database> {
  return {
    rpc: async () => result,
  } as unknown as SupabaseClient<Database>;
}

const validInput = {
  leadId: "11111111-1111-1111-1111-111111111111",
  toStatus: "conversando" as const,
  expectedVersion: 3,
};

describe("LeadTransitionInputSchema", () => {
  it("accepts a well-formed payload", () => {
    expect(() => LeadTransitionInputSchema.parse(validInput)).not.toThrow();
  });
  it("rejects invalid uuid", () => {
    expect(() =>
      LeadTransitionInputSchema.parse({ ...validInput, leadId: "not-a-uuid" }),
    ).toThrow();
  });
  it("rejects invalid status", () => {
    expect(() =>
      LeadTransitionInputSchema.parse({ ...validInput, toStatus: "bogus" }),
    ).toThrow();
  });
  it("rejects negative version", () => {
    expect(() =>
      LeadTransitionInputSchema.parse({ ...validInput, expectedVersion: -1 }),
    ).toThrow();
  });
});

describe("mapRpcError", () => {
  const cases: Array<{ msg: string; code: (typeof LEAD_TRANSITION_ERROR_CODES)[number] }> = [
    { msg: "unauthenticated", code: "unauthenticated" },
    { msg: "tenant_unresolved", code: "tenant_unresolved" },
    { msg: "tenant_boundary_violation", code: "tenant_boundary_violation" },
    { msg: "no_active_membership", code: "no_active_membership" },
    { msg: "forbidden", code: "forbidden" },
    { msg: "lead_not_found", code: "lead_not_found" },
    { msg: "invalid_to_status", code: "invalid_to_status" },
    { msg: "invalid_transition", code: "invalid_transition" },
    { msg: "noop_transition", code: "noop_transition" },
    { msg: "version_conflict", code: "version_conflict" },
    { msg: "discard_reason_required", code: "discard_reason_required" },
    { msg: "invalid_discard_reason", code: "invalid_discard_reason" },
    { msg: "lost_reason_required", code: "lost_reason_required" },
    { msg: "invalid_lost_reason", code: "invalid_lost_reason" },
    { msg: "reason_id_not_allowed_for_transition", code: "reason_id_not_allowed_for_transition" },
  ];
  for (const c of cases) {
    it(`maps '${c.msg}' -> ${c.code}`, () => {
      expect(mapRpcError({ message: c.msg }).code).toBe(c.code);
    });
  }
  it("falls through to unknown_error", () => {
    expect(mapRpcError({ message: "random gibberish" }).code).toBe("unknown_error");
  });
});

describe("transitionLead", () => {
  const good = {
    lead_id: validInput.leadId,
    from_status: "novo",
    to_status: "conversando",
    reason_type: "advance",
    version: 4,
  };

  it("returns a typed result on valid RPC response", async () => {
    const sb = fakeSupabase({ data: good, error: null });
    const res = await transitionLead(sb, validInput);
    expect(res.leadId).toBe(good.lead_id);
    expect(res.fromStatus).toBe("novo");
    expect(res.toStatus).toBe("conversando");
    expect(res.reasonType).toBe("advance");
    expect(res.version).toBe(4);
  });

  it("throws rpc_contract_violation on malformed payload", async () => {
    const sb = fakeSupabase({ data: { junk: true }, error: null });
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "rpc_contract_violation",
    });
  });

  it("maps version_conflict RPC error", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "version_conflict", code: "P0001" } });
    await expect(transitionLead(sb, validInput)).rejects.toBeInstanceOf(LeadTransitionError);
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "version_conflict",
      pgCode: "P0001",
    });
  });

  it("maps invalid_transition", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "invalid_transition" } });
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("maps forbidden", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "forbidden", code: "42501" } });
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("maps tenant_boundary_violation", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "tenant_boundary_violation" } });
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "tenant_boundary_violation",
    });
  });

  it("maps discard_reason_required", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "discard_reason_required" } });
    await expect(transitionLead(sb, { ...validInput, toStatus: "descartado" }))
      .rejects.toMatchObject({ code: "discard_reason_required" });
  });

  it("maps unknown pg error", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "some random pg boom" } });
    await expect(transitionLead(sb, validInput)).rejects.toMatchObject({
      code: "unknown_error",
    });
  });
});
