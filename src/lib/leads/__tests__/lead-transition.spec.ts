// PR-M1 — Boundary specs for transitionLead (framework-agnostic).
// Deterministic; no live DB. Matches project unit-testing policy.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  transitionLead,
  mapRpcError,
  LeadTransitionError,
  LEAD_TRANSITION_ERROR_CODES,
  LeadTransitionInputSchema,
} from "@/lib/leads/lead-transition.server";

type RpcResult = {
  data: unknown;
  error:
    | { message: string; code?: string; details?: string; hint?: string }
    | null;
};

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

type Case = { name: string; run: () => Promise<void> };
function expect(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const cases: Case[] = [];
const add = (name: string, run: () => Promise<void>): void => {
  cases.push({ name, run });
};

// --- Input schema ---
add("schema: accepts valid payload", async () => {
  LeadTransitionInputSchema.parse(validInput);
});
add("schema: rejects invalid uuid", async () => {
  try {
    LeadTransitionInputSchema.parse({ ...validInput, leadId: "nope" });
    throw new Error("should have thrown");
  } catch {
    /* ok */
  }
});
add("schema: rejects invalid status", async () => {
  try {
    LeadTransitionInputSchema.parse({ ...validInput, toStatus: "bogus" });
    throw new Error("should have thrown");
  } catch {
    /* ok */
  }
});
add("schema: rejects negative version", async () => {
  try {
    LeadTransitionInputSchema.parse({ ...validInput, expectedVersion: -1 });
    throw new Error("should have thrown");
  } catch {
    /* ok */
  }
});

// --- Error mapping ---
for (const msg of LEAD_TRANSITION_ERROR_CODES) {
  if (msg === "rpc_contract_violation" || msg === "unknown_error") continue;
  add(`map: '${msg}' -> ${msg}`, async () => {
    const err = mapRpcError({ message: msg });
    expect(err.code === msg, `expected ${msg}, got ${err.code}`);
  });
}
add("map: unknown pg message -> unknown_error", async () => {
  const err = mapRpcError({ message: "some random pg boom" });
  expect(err.code === "unknown_error", `got ${err.code}`);
});

// --- Boundary happy path ---
add("transitionLead: returns typed result", async () => {
  const sb = fakeSupabase({
    data: {
      lead_id: validInput.leadId,
      from_status: "novo",
      to_status: "conversando",
      reason_type: "advance",
      version: 4,
    },
    error: null,
  });
  const res = await transitionLead(sb, validInput);
  expect(res.fromStatus === "novo", "fromStatus");
  expect(res.toStatus === "conversando", "toStatus");
  expect(res.reasonType === "advance", "reasonType");
  expect(res.version === 4, "version");
});

// --- Boundary error paths ---
add("transitionLead: contract violation on bad payload", async () => {
  const sb = fakeSupabase({ data: { junk: true }, error: null });
  try {
    await transitionLead(sb, validInput);
    throw new Error("should throw");
  } catch (e) {
    const err = e as LeadTransitionError;
    expect(err.code === "rpc_contract_violation", `got ${err.code}`);
  }
});

const rpcErrCases: Array<[string, string]> = [
  ["version_conflict", "P0001"],
  ["invalid_transition", "22023"],
  ["forbidden", "42501"],
  ["tenant_boundary_violation", "42501"],
  ["discard_reason_required", "22023"],
];
for (const [msg, code] of rpcErrCases) {
  add(`transitionLead: maps RPC '${msg}'`, async () => {
    const sb = fakeSupabase({ data: null, error: { message: msg, code } });
    try {
      await transitionLead(sb, validInput);
      throw new Error("should throw");
    } catch (e) {
      const err = e as LeadTransitionError;
      expect(err instanceof LeadTransitionError, "wrong type");
      expect(err.code === msg, `expected ${msg}, got ${err.code}`);
      expect(err.pgCode === code, `pgCode mismatch`);
    }
  });
}

export async function runLeadTransitionBoundarySpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      await c.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`  [FAIL] ${c.name}:`, (e as Error).message);
    }
  }
  return { passed, failed };
}
