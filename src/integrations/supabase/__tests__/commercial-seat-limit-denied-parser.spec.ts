// SCP-012 — Unit tests for CommercialSeatLimitDeniedError + parser.

import {
  CommercialSeatLimitDeniedError,
  parseCommercialSeatLimitDeniedError,
} from "@/lib/api/commercial/membership-mutation-enforcement-error";

type Spec = { name: string; fn: () => void };
export const commercialSeatLimitDeniedSpecs: Spec[] = [];
function it(name: string, fn: () => void) {
  commercialSeatLimitDeniedSpecs.push({ name, fn });
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertThrows(fn: () => unknown, matcher: RegExp, label: string) {
  try {
    fn();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (!matcher.test(m)) throw new Error(`${label}: unexpected error ${m}`);
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

// -- non-commercial errors: parser returns null --

it("returns null when message does not match", () => {
  const r = parseCommercialSeatLimitDeniedError(
    { message: "Actor not authorized", details: null },
    TENANT,
  );
  assert(r === null, "expected null for non-commercial error");
});

it("returns null when error is not an object", () => {
  assert(parseCommercialSeatLimitDeniedError(null, TENANT) === null, "null err");
  assert(parseCommercialSeatLimitDeniedError("boom", TENANT) === null, "string err");
});

// -- DETAIL missing/invalid --

it("throws when DETAIL missing", () => {
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied" },
      TENANT,
    ),
    /missing DETAIL/,
    "missing DETAIL",
  );
});

it("throws when DETAIL is not JSON", () => {
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: "not-json{" },
      TENANT,
    ),
    /not valid JSON/,
    "invalid JSON",
  );
});

// -- semantic incoherence --

it("throws when tenant mismatch", () => {
  const bad = baseDecision({ tenantId: "22222222-2222-4222-8222-222222222222" });
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
      TENANT,
    ),
    /Tenant mismatch/,
    "tenant mismatch",
  );
});

it("throws when requestedIncrement != 1", () => {
  const bad = baseDecision({ requestedIncrement: 2 });
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
      TENANT,
    ),
    /requestedIncrement/,
    "increment mismatch",
  );
});

it("throws when allowed=true carried in denial DETAIL", () => {
  const bad = baseDecision({ allowed: true, reason: "entitled", used: 0, remaining: 3 });
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
      TENANT,
    ),
    /allowed|Incoherent/,
    "allowed=true denial",
  );
});

it("throws when reason invalid", () => {
  const bad = baseDecision({ reason: "weird_reason" });
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
      TENANT,
    ),
    /Invalid reason/,
    "invalid reason",
  );
});

it("throws when source invalid", () => {
  const bad = baseDecision({ source: "elsewhere" });
  assertThrows(
    () => parseCommercialSeatLimitDeniedError(
      { message: "commercial_seat_limit_denied", details: JSON.stringify(bad) },
      TENANT,
    ),
    /Invalid source/,
    "invalid source",
  );
});

// -- happy paths per reason --

it("returns CommercialSeatLimitDeniedError for limit_reached", () => {
  const dec = baseDecision();
  const r = parseCommercialSeatLimitDeniedError(
    { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
    TENANT,
  );
  assert(r instanceof CommercialSeatLimitDeniedError, "instance");
  assert(r!.code === "commercial_seat_limit_denied", "code");
  assert(r!.decision.reason === "limit_reached", "reason");
  assert(r!.decision.limit === 3 && r!.decision.used === 3, "quantitative");
});

it("returns CommercialSeatLimitDeniedError for billing_blocked", () => {
  const dec = baseDecision({
    reason: "billing_blocked",
    source: "tenant",
    limit: null,
    used: null,
    remaining: null,
  });
  const r = parseCommercialSeatLimitDeniedError(
    { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
    TENANT,
  );
  assert(r instanceof CommercialSeatLimitDeniedError, "instance");
  assert(r!.decision.reason === "billing_blocked", "reason");
});

it("returns CommercialSeatLimitDeniedError for billing_unknown", () => {
  const dec = baseDecision({
    reason: "billing_unknown",
    source: "none",
    limit: null,
    used: null,
    remaining: null,
  });
  const r = parseCommercialSeatLimitDeniedError(
    { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
    TENANT,
  );
  assert(r instanceof CommercialSeatLimitDeniedError, "instance");
});

it("returns CommercialSeatLimitDeniedError for not_entitled", () => {
  const dec = baseDecision({
    reason: "not_entitled",
    source: "none",
    limit: null,
    used: null,
    remaining: null,
  });
  const r = parseCommercialSeatLimitDeniedError(
    { message: "commercial_seat_limit_denied", details: JSON.stringify(dec) },
    TENANT,
  );
  assert(r instanceof CommercialSeatLimitDeniedError, "instance");
});
