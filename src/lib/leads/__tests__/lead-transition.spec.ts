// PR-M1 — Boundary specs for transitionLead (framework-agnostic).
// Deterministic; no live DB. No `as unknown as`, no `any`.

import {
  transitionLead,
  mapRpcError,
  LeadTransitionError,
  LEAD_TRANSITION_ERROR_CODES,
  LeadTransitionInputSchema,
  type LeadTransitionRpcClient,
  type PostgrestLikeError,
} from "@/lib/leads/lead-transition.server";

type RpcResult = { data: unknown; error: PostgrestLikeError | null };

function fakeClient(result: RpcResult): LeadTransitionRpcClient {
  return {
    rpc: (_fn, _args) => Promise.resolve(result),
  };
}

const validInput = {
  leadId: "11111111-1111-1111-1111-111111111111",
  toStatus: "conversando" as const,
  expectedVersion: 3,
};

type Case = { name: string; run: () => Promise<void> };
const cases: Case[] = [];
const add = (name: string, run: () => Promise<void>): void => {
  cases.push({ name, run });
};

function expect(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

/**
 * Determines whether `fn` throws. The sentinel error is NEVER caught here
 * — it is thrown AFTER `fn` returns, so the surrounding `catch` cannot
 * swallow it (fixes the previous false-positive pattern).
 */
function expectThrows(fn: () => unknown, message: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

async function expectRejects(
  fn: () => Promise<unknown>,
  message: string,
): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error(message);
}

// --- Input schema ---
add("schema: accepts valid payload", async () => {
  LeadTransitionInputSchema.parse(validInput);
});
add("schema: rejects invalid uuid", async () => {
  expectThrows(
    () => LeadTransitionInputSchema.parse({ ...validInput, leadId: "nope" }),
    "invalid uuid not rejected",
  );
});
add("schema: rejects invalid status", async () => {
  expectThrows(
    () => LeadTransitionInputSchema.parse({ ...validInput, toStatus: "bogus" }),
    "invalid status not rejected",
  );
});
add("schema: rejects negative version", async () => {
  expectThrows(
    () =>
      LeadTransitionInputSchema.parse({ ...validInput, expectedVersion: -1 }),
    "negative version not rejected",
  );
});
add("schema: rejects invalid reasonId", async () => {
  expectThrows(
    () =>
      LeadTransitionInputSchema.parse({ ...validInput, reasonId: "not-uuid" }),
    "invalid reasonId not rejected",
  );
});
add("schema: rejects metadata with disallowed key", async () => {
  expectThrows(
    () =>
      LeadTransitionInputSchema.parse({
        ...validInput,
        metadata: { hacked: "yes" },
      }),
    "disallowed metadata key not rejected",
  );
});
add("schema: rejects metadata note above length limit", async () => {
  expectThrows(
    () =>
      LeadTransitionInputSchema.parse({
        ...validInput,
        metadata: { note: "x".repeat(2001) },
      }),
    "oversized note not rejected",
  );
});
add("schema: rejects metadata source above length limit", async () => {
  expectThrows(
    () =>
      LeadTransitionInputSchema.parse({
        ...validInput,
        metadata: { source: "x".repeat(201) },
      }),
    "oversized source not rejected",
  );
});

// --- Error mapping ---
for (const msg of LEAD_TRANSITION_ERROR_CODES) {
  if (msg === "rpc_contract_violation" || msg === "unknown_error") continue;
  add(`map: exact '${msg}' -> ${msg}`, async () => {
    const err = mapRpcError({ message: msg });
    expect(err.code === msg, `expected ${msg}, got ${err.code}`);
  });
}
add("map: 'version_conflict: stale version' -> version_conflict", async () => {
  const err = mapRpcError({ message: "version_conflict: stale version" });
  expect(err.code === "version_conflict", `got ${err.code}`);
});
add("map: 'invalid_transition: from novo to ganho' -> invalid_transition", async () => {
  const err = mapRpcError({
    message: "invalid_transition: from novo to ganho",
  });
  expect(err.code === "invalid_transition", `got ${err.code}`);
});
add("map: unknown pg message -> unknown_error", async () => {
  const err = mapRpcError({ message: "some random pg boom" });
  expect(err.code === "unknown_error", `got ${err.code}`);
});
add("map: unrelated message with colon -> unknown_error", async () => {
  const err = mapRpcError({ message: "duplicate key value: whatever" });
  expect(err.code === "unknown_error", `got ${err.code}`);
});

// --- Boundary happy path ---
add("transitionLead: returns typed result", async () => {
  const client = fakeClient({
    data: {
      lead_id: validInput.leadId,
      from_status: "novo",
      to_status: "conversando",
      reason_type: "advance",
      version: 4,
    },
    error: null,
  });
  const res = await transitionLead(client, validInput);
  expect(res.fromStatus === "novo", "fromStatus");
  expect(res.toStatus === "conversando", "toStatus");
  expect(res.reasonType === "advance", "reasonType");
  expect(res.version === 4, "version");
});

// --- Boundary error paths ---
add("transitionLead: contract violation on bad payload", async () => {
  const client = fakeClient({ data: { junk: true }, error: null });
  let caught: unknown;
  try {
    await transitionLead(client, validInput);
  } catch (e) {
    caught = e;
  }
  expect(
    caught instanceof LeadTransitionError &&
      caught.code === "rpc_contract_violation",
    `expected rpc_contract_violation`,
  );
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
    const client = fakeClient({
      data: null,
      error: { message: msg, code },
    });
    let caught: unknown;
    try {
      await transitionLead(client, validInput);
    } catch (e) {
      caught = e;
    }
    expect(
      caught instanceof LeadTransitionError,
      `not a LeadTransitionError`,
    );
    if (caught instanceof LeadTransitionError) {
      expect(caught.code === msg, `expected ${msg}, got ${caught.code}`);
      expect(caught.pgCode === code, `pgCode mismatch`);
    }
  });
}

// --- Async rejection helper self-check (used implicitly by the suite) ---
add("expectRejects: catches thrown rejection", async () => {
  await expectRejects(async () => {
    throw new Error("boom");
  }, "expectRejects failed to detect a rejection");
});

// --- Harness failure detection (self-test). Runs LAST, opt-in via env. ---
// When LEAD_TRANSITION_HARNESS_SELFTEST=1, add one deliberately-failing case
// so the caller can prove the runner reports failed>0 and a non-zero exit.
if (process.env.LEAD_TRANSITION_HARNESS_SELFTEST === "1") {
  add("HARNESS SELFTEST (must fail)", async () => {
    expect(false, "deliberate failure to validate the runner");
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
