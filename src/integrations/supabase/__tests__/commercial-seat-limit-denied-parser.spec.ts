// SCP-012 — Unit tests for CommercialSeatLimitDeniedError + parser.

import {
  CommercialSeatLimitDeniedError,
  parseCommercialSeatLimitDeniedError,
} from "@/lib/api/commercial/membership-mutation-enforcement-error";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}
function expectThrows(fn: () => unknown, matcher: RegExp, label: string) {
  try {
    fn();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(matcher.test(m), `${label}: expected /${matcher.source}/, got "${m}"`);
    return;
  }
  throw new Error(`${label}: expected throw`);
}

const TENANT = "11111111-1111-4111-8111-111111111111";

function baseDecision(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: TENANT,
    featureKey: "users.seats",
    allowed: false,
    reason: "limit_reached",
    source: "tenant",
    limit: 3,
    used: 3,
    requestedIncrement: 1,
    remaining: 0,
    ...overrides,
  };
}

const specs: Array<{ name: string; run: () => void }> = [
  {
    name: "returns null when message does not match",
    run: () => {
      const r = parseCommercialSeatLimitDeniedError(
        { message: "Actor not authorized", details: null },
        TENANT,
      );
      assert(r === null, "expected null for non-commercial error");
    },
  },
  {
    name: "returns null when message merely contains the token as substring",
    run: () => {
      const wrappers = [
        "unexpected commercial_seat_limit_denied wrapper",
        "prefix commercial_seat_limit_denied",
        "commercial_seat_limit_denied suffix",
        "commercial_seat_limit_denied_other",
      ];
      for (const message of wrappers) {
        const r = parseCommercialSeatLimitDeniedError(
          { message, details: JSON.stringify(baseDecision()) },
          TENANT,
        );
        assert(r === null, `substring message must not be classified: "${message}"`);
      }
    },
  },
  {
    name: "returns null when error is not an object",
    run: () => {
      assert(parseCommercialSeatLimitDeniedError(null, TENANT) === null, "null err");
      assert(parseCommercialSeatLimitDeniedError("boom", TENANT) === null, "string err");
    },
  },
  {
    name: "throws when DETAIL missing",
    run: () =>
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied" },
          TENANT,
        ),
        /missing DETAIL/,
        "missing DETAIL",
      ),
  },
  {
    name: "throws when DETAIL is not JSON",
    run: () =>
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: "not-json{" },
          TENANT,
        ),
        /not valid JSON/,
        "invalid JSON",
      ),
  },
  {
    name: "throws when tenant mismatch",
    run: () => {
      const bad = baseDecision({ tenantId: "22222222-2222-4222-8222-222222222222" });
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
          TENANT,
        ),
        /Tenant mismatch/,
        "tenant mismatch",
      );
    },
  },
  {
    name: "throws when requestedIncrement != 1",
    run: () => {
      const bad = baseDecision({ requestedIncrement: 2 });
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
          TENANT,
        ),
        /requestedIncrement/,
        "increment",
      );
    },
  },
  {
    name: "throws when allowed=true carried in denial DETAIL",
    run: () => {
      const bad = baseDecision({ allowed: true, reason: "entitled", used: 0, remaining: 3 });
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
          TENANT,
        ),
        /allowed|Incoherent/,
        "allowed=true",
      );
    },
  },
  {
    name: "throws when reason invalid",
    run: () => {
      const bad = baseDecision({ reason: "weird_reason" });
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
          TENANT,
        ),
        /Invalid reason/,
        "invalid reason",
      );
    },
  },
  {
    name: "throws when source invalid",
    run: () => {
      const bad = baseDecision({ source: "elsewhere" });
      expectThrows(
        () => parseCommercialSeatLimitDeniedError(
          { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
          TENANT,
        ),
        /Invalid source/,
        "invalid source",
      );
    },
  },
  {
    name: "returns CommercialSeatLimitDeniedError for limit_reached",
    run: () => {
      const dec = baseDecision();
      const r = parseCommercialSeatLimitDeniedError(
        { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
        TENANT,
      );
      assert(r instanceof CommercialSeatLimitDeniedError, "instance");
      assert(r!.code === "commercial_seat_limit_denied", "code");
      assert(r!.decision.reason === "limit_reached", "reason");
      assert(r!.decision.limit === 3 && r!.decision.used === 3, "quantitative");
    },
  },
  {
    name: "returns CommercialSeatLimitDeniedError for billing_blocked",
    run: () => {
      const dec = baseDecision({
        reason: "billing_blocked", source: "tenant",
        limit: null, used: null, remaining: null,
      });
      const r = parseCommercialSeatLimitDeniedError(
        { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
        TENANT,
      );
      assert(r instanceof CommercialSeatLimitDeniedError, "instance");
      assert(r!.decision.reason === "billing_blocked", "reason");
    },
  },
  {
    name: "returns CommercialSeatLimitDeniedError for billing_unknown",
    run: () => {
      const dec = baseDecision({
        reason: "billing_unknown", source: "none",
        limit: null, used: null, remaining: null,
      });
      const r = parseCommercialSeatLimitDeniedError(
        { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
        TENANT,
      );
      assert(r instanceof CommercialSeatLimitDeniedError, "instance");
    },
  },
  {
    name: "returns CommercialSeatLimitDeniedError for not_entitled",
    run: () => {
      const dec = baseDecision({
        reason: "not_entitled", source: "none",
        limit: null, used: null, remaining: null,
      });
      const r = parseCommercialSeatLimitDeniedError(
        { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
        TENANT,
      );
      assert(r instanceof CommercialSeatLimitDeniedError, "instance");
    },
  },
];

export async function runCommercialSeatLimitDeniedParserSpecs(): Promise<{ passed: number; failed: number }> {
  let passed = 0;
  let failed = 0;
  for (const s of specs) {
    try {
      s.run();
      passed++;
    } catch (e) {
      failed++;
      // eslint-disable-next-line no-console
      console.error(`✗ ${s.name}\n  ${e instanceof Error ? e.message : e}`);
    }
  }
  return { passed, failed };
}
