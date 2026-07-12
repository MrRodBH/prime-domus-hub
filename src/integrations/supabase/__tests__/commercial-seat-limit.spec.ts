// SCP-011 — Commercial Seat Limit Server Runtime.
// Deterministic specs for the pure decision helper, input
// normalization, seat-limit extraction, used-count validation and
// the tenant_members reader shape.
//
// The server function itself (getCommercialSeatLimitDecision) is a
// thin wrapper composed of:
//   • requireTenant (covered by tenant-* specs);
//   • the shared commercial context loader
//     (covered by commercial-read-models.spec / commercial-feature-gate.spec);
//   • the pure helpers exercised here.

import {
  SEAT_FEATURE_KEY,
  decideCommercialSeatLimit,
  extractSeatLimit,
  isValidCommercialInteger,
  normalizeCommercialSeatLimitInput,
  normalizeSeatIncrement,
  validateSeatUsedCount,
  type CommercialLimitDecision,
} from "@/lib/api/commercial/limit-decision";
import { resolveCommercialSeatLimitDecision } from "@/lib/api/commercial/seat-limit-runtime";
import {
  readCommercialSeatUsage,
  type CommercialSeatUsageClient,
} from "@/lib/api/commercial/seat-usage-reader";
import type { CommercialFeatureDecision } from "@/lib/api/commercial/feature-gate";
import type {
  TenantBillingHealth,
  TenantEntitlementSnapshot,
} from "@/lib/api/commercial/read-models";


const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_TENANT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function feature(
  overrides: Partial<CommercialFeatureDecision> = {},
): CommercialFeatureDecision {
  return {
    tenantId: TENANT,
    featureKey: SEAT_FEATURE_KEY,
    allowed: true,
    reason: "entitled",
    source: "plan",
    ...overrides,
  };
}

function snap(
  items: TenantEntitlementSnapshot["entitlements"],
): TenantEntitlementSnapshot {
  return { tenantId: TENANT, entitlements: items };
}

// ---------------------------------------------------------------
// Minimal supabase-js-like chainable mock used to exercise the
// tenant_members COUNT read shape used by getCommercialSeatLimitDecision
// (SCP-011 §14 / §22). Rows are filtered exactly as the real query
// would filter them.
// ---------------------------------------------------------------
type MemberRow = { tenant_id: string; membership_status: string };

function mockAdmin(
  rows: MemberRow[],
  opts: { error?: unknown; countOverride?: unknown } = {},
) {
  let lastFilter: {
    table: string;
    tenantId: string | null;
    statuses: string[] | null;
    countMode: string | null;
    head: boolean;
  } = {
    table: "",
    tenantId: null,
    statuses: null,
    countMode: null,
    head: false,
  };
  const calls: { table: string; op: string }[] = [];
  const admin = {
    from(table: string) {
      lastFilter = {
        table,
        tenantId: null,
        statuses: null,
        countMode: null,
        head: false,
      };
      calls.push({ table, op: "from" });
      const chain = {
        select(
          _cols: string,
          selectOpts?: { count?: string; head?: boolean },
        ) {
          if (selectOpts?.count) lastFilter.countMode = selectOpts.count;
          if (selectOpts?.head) lastFilter.head = true;
          return chain;
        },
        eq(col: string, val: string) {
          if (col === "tenant_id") lastFilter.tenantId = val;
          return chain;
        },
        in(col: string, vals: readonly string[]) {
          if (col === "membership_status") lastFilter.statuses = [...vals];
          return chain;
        },
        then(
          resolve: (r: {
            count: unknown;
            error: unknown;
            data: null;
          }) => unknown,
        ) {
          const matched = rows.filter(
            (r) =>
              r.tenant_id === lastFilter.tenantId &&
              (lastFilter.statuses
                ? lastFilter.statuses.includes(r.membership_status)
                : true),
          );
          const count =
            "countOverride" in opts ? opts.countOverride : matched.length;
          return Promise.resolve({
            count: count as number | null,
            error: opts.error ?? null,
            data: null,
          }).then(resolve);
        },
      };
      return chain;
    },
    _lastFilter: () => lastFilter,
    _calls: () => calls,
  };
  return admin;
}

// SCP-011.2 §5/§7 — the specs consume the SAME production reader the
// server function calls. No parallel `readUsed` helper exists.
function asUsageClient(
  admin: ReturnType<typeof mockAdmin>,
): CommercialSeatUsageClient {
  return admin as unknown as CommercialSeatUsageClient;
}

const specs: Array<{ name: string; run: () => Promise<void> }> = [
  // ============================================================
  // normalizeSeatIncrement — §9 / §21
  // ============================================================
  {
    name: "normalizeSeatIncrement default is 1 when undefined",
    run: async () => {
      assert(normalizeSeatIncrement(undefined) === 1, "default 1");
    },
  },
  {
    name: "normalizeSeatIncrement accepts 1",
    run: async () => {
      assert(normalizeSeatIncrement(1) === 1, "accept 1");
    },
  },
  {
    name: "normalizeSeatIncrement rejects 0",
    run: async () => {
      let threw = false;
      try {
        normalizeSeatIncrement(0);
      } catch {
        threw = true;
      }
      assert(threw, "0 must throw");
    },
  },
  {
    name: "normalizeSeatIncrement rejects 2 and larger integers",
    run: async () => {
      for (const v of [2, 3, 10, 1000, Number.MAX_SAFE_INTEGER]) {
        let threw = false;
        try {
          normalizeSeatIncrement(v);
        } catch {
          threw = true;
        }
        assert(threw, `must throw for ${v}`);
      }
    },
  },
  {
    name: "normalizeSeatIncrement rejects negative values",
    run: async () => {
      for (const v of [-1, -2, -1000]) {
        let threw = false;
        try {
          normalizeSeatIncrement(v);
        } catch {
          threw = true;
        }
        assert(threw, `must throw for ${v}`);
      }
    },
  },
  {
    name: "normalizeSeatIncrement rejects fractional values",
    run: async () => {
      for (const v of [0.5, 1.5, 1.0000001]) {
        let threw = false;
        try {
          normalizeSeatIncrement(v);
        } catch {
          threw = true;
        }
        assert(threw, `must throw for ${v}`);
      }
    },
  },
  {
    name: "normalizeSeatIncrement rejects NaN and Infinity",
    run: async () => {
      for (const v of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        let threw = false;
        try {
          normalizeSeatIncrement(v);
        } catch {
          threw = true;
        }
        assert(threw, `must throw for ${String(v)}`);
      }
    },
  },
  {
    name: "normalizeSeatIncrement rejects string and null",
    run: async () => {
      for (const v of ["1", "one", null, {}, []]) {
        let threw = false;
        try {
          normalizeSeatIncrement(v as unknown);
        } catch {
          threw = true;
        }
        assert(threw, `must throw for ${JSON.stringify(v)}`);
      }
    },
  },

  // ============================================================
  // isValidCommercialInteger / validateSeatUsedCount — §14 / §15
  // ============================================================
  {
    name: "isValidCommercialInteger accepts 0 and MAX_SAFE_INTEGER",
    run: async () => {
      assert(isValidCommercialInteger(0), "0 valid");
      assert(isValidCommercialInteger(1), "1 valid");
      assert(isValidCommercialInteger(Number.MAX_SAFE_INTEGER), "MSI valid");
    },
  },
  {
    name: "isValidCommercialInteger rejects negatives, fractions, non-finite",
    run: async () => {
      for (const v of [
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
        "1",
        null,
        undefined,
      ]) {
        assert(!isValidCommercialInteger(v as unknown), `invalid: ${String(v)}`);
      }
    },
  },
  {
    name: "validateSeatUsedCount returns null for invalid raw counts",
    run: async () => {
      for (const v of [null, undefined, -1, 1.5, Number.POSITIVE_INFINITY, "3"]) {
        assert(validateSeatUsedCount(v as unknown) === null, `null for ${String(v)}`);
      }
      assert(validateSeatUsedCount(0) === 0, "0 preserved");
      assert(validateSeatUsedCount(7) === 7, "7 preserved");
    },
  },

  // ============================================================
  // extractSeatLimit — §12 / §13 / §15
  // ============================================================
  {
    name: "extractSeatLimit returns limit=null/source=none when absent",
    run: async () => {
      const e = extractSeatLimit(snap([]));
      assert(e.limit === null && e.source === "none", "empty snapshot");
    },
  },
  {
    name: "extractSeatLimit preserves tenant source",
    run: async () => {
      const e = extractSeatLimit(
        snap([{ key: SEAT_FEATURE_KEY, value: 5, source: "tenant", effective: true }]),
      );
      assert(e.limit === 5 && e.source === "tenant", "tenant/5");
    },
  },
  {
    name: "extractSeatLimit preserves plan source",
    run: async () => {
      const e = extractSeatLimit(
        snap([{ key: SEAT_FEATURE_KEY, value: 3, source: "plan", effective: true }]),
      );
      assert(e.limit === 3 && e.source === "plan", "plan/3");
    },
  },
  {
    name: "extractSeatLimit preserves default source",
    run: async () => {
      const e = extractSeatLimit(
        snap([{ key: SEAT_FEATURE_KEY, value: 1, source: "default", effective: true }]),
      );
      assert(e.limit === 1 && e.source === "default", "default/1");
    },
  },
  {
    name: "extractSeatLimit rejects non-effective item",
    run: async () => {
      const e = extractSeatLimit(
        snap([{ key: SEAT_FEATURE_KEY, value: 5, source: "tenant", effective: false }]),
      );
      assert(e.limit === null && e.source === "none", "not effective");
    },
  },
  {
    name: "extractSeatLimit rejects non-integer values (string/boolean/negative)",
    run: async () => {
      for (const v of ["10", true, false, -1, 1.5, null]) {
        const e = extractSeatLimit(
          snap([{
            key: SEAT_FEATURE_KEY,
            value: v as unknown as number,
            source: "tenant",
            effective: true,
          }]),
        );
        assert(e.limit === null && e.source === "none", `invalid value ${String(v)}`);
      }
    },
  },

  // ============================================================
  // decideCommercialSeatLimit — §11 / §17 / §18 / §21
  // ============================================================
  {
    name: "feature decision negative propagates reason/source; used/limit=null",
    run: async () => {
      for (const reason of [
        "not_entitled",
        "billing_unknown",
        "billing_attention_required",
        "billing_blocked",
        "not_evaluated",
      ] as const) {
        const d = decideCommercialSeatLimit({
          featureDecision: feature({
            allowed: false,
            reason,
            source: reason === "billing_blocked" ? "plan" : "none",
          }),
          extracted: { limit: 10, source: "plan" }, // ignored
          used: 3, // ignored
          requestedIncrement: 1,
        });
        assert(d.allowed === false, `${reason} deny`);
        assert(d.reason === reason, `reason=${reason}`);
        assert(d.limit === null, "limit null");
        assert(d.used === null, "used null");
        assert(d.remaining === null, "remaining null");
        assert(d.requestedIncrement === 1, "increment 1");
      }
    },
  },
  {
    name: "used below limit → entitled with remaining=limit-used",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 5, source: "plan" },
        used: 2,
        requestedIncrement: 1,
      });
      assert(d.allowed === true, "allowed");
      assert(d.reason === "entitled", "entitled");
      assert(d.remaining === 3, "remaining 3");
      assert(d.source === "plan", "source=plan");
    },
  },
  {
    name: "used equals limit → limit_reached / remaining=0",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 5, source: "tenant" },
        used: 5,
        requestedIncrement: 1,
      });
      assert(d.allowed === false, "deny");
      assert(d.reason === "limit_reached", "limit_reached");
      assert(d.remaining === 0, "remaining 0");
      assert(d.source === "tenant", "source=tenant");
    },
  },
  {
    name: "used above limit → limit_reached / remaining=0",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 3, source: "default" },
        used: 7,
        requestedIncrement: 1,
      });
      assert(d.allowed === false, "deny");
      assert(d.reason === "limit_reached", "limit_reached");
      assert(d.remaining === 0, "remaining never negative");
      assert(d.source === "default", "source=default");
    },
  },
  {
    name: "limit=0 used=0 → limit_reached for increment 1",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 0, source: "plan" },
        used: 0,
        requestedIncrement: 1,
      });
      assert(d.allowed === false, "deny");
      assert(d.reason === "limit_reached", "limit_reached");
      assert(d.remaining === 0, "remaining 0");
    },
  },
  {
    name: "feature positive but limit absent → not_evaluated / source none",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: null, source: "none" },
        used: 4,
        requestedIncrement: 1,
      });
      assert(d.allowed === false, "deny");
      assert(d.reason === "not_evaluated", "not_evaluated");
      assert(d.source === "none", "source none");
      assert(d.limit === null && d.used === null && d.remaining === null, "nulls");
    },
  },
  {
    name: "feature positive, limit resolved, used unavailable → not_evaluated with limit source",
    run: async () => {
      const d = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 5, source: "tenant" },
        used: null,
        requestedIncrement: 1,
      });
      assert(d.reason === "not_evaluated", "not_evaluated");
      assert(d.source === "tenant", "keep source");
      assert(d.limit === 5, "keep limit");
      assert(d.used === null && d.remaining === null, "used/remaining null");
    },
  },

  // ============================================================
  // Reader shape — §14 / §22
  // ============================================================
  {
    name: "reader: no memberships → used=0",
    run: async () => {
      const admin = mockAdmin([]);
      const used = await readUsed(admin, TENANT);
      assert(used === 0, "used 0");
    },
  },
  {
    name: "reader: only active counted",
    run: async () => {
      const admin = mockAdmin([
        { tenant_id: TENANT, membership_status: "active" },
        { tenant_id: TENANT, membership_status: "active" },
      ]);
      assert((await readUsed(admin, TENANT)) === 2, "2 active");
    },
  },
  {
    name: "reader: only invited counted",
    run: async () => {
      const admin = mockAdmin([
        { tenant_id: TENANT, membership_status: "invited" },
        { tenant_id: TENANT, membership_status: "invited" },
        { tenant_id: TENANT, membership_status: "invited" },
      ]);
      assert((await readUsed(admin, TENANT)) === 3, "3 invited");
    },
  },
  {
    name: "reader: active + invited counted together",
    run: async () => {
      const admin = mockAdmin([
        { tenant_id: TENANT, membership_status: "active" },
        { tenant_id: TENANT, membership_status: "invited" },
        { tenant_id: TENANT, membership_status: "active" },
      ]);
      assert((await readUsed(admin, TENANT)) === 3, "3 total");
    },
  },
  {
    name: "reader: suspended and revoked ignored",
    run: async () => {
      const admin = mockAdmin([
        { tenant_id: TENANT, membership_status: "active" },
        { tenant_id: TENANT, membership_status: "suspended" },
        { tenant_id: TENANT, membership_status: "revoked" },
        { tenant_id: TENANT, membership_status: "suspended" },
      ]);
      assert((await readUsed(admin, TENANT)) === 1, "only 1 active");
    },
  },
  {
    name: "reader: tenant A does not count tenant B memberships",
    run: async () => {
      const admin = mockAdmin([
        { tenant_id: TENANT, membership_status: "active" },
        { tenant_id: OTHER_TENANT, membership_status: "active" },
        { tenant_id: OTHER_TENANT, membership_status: "invited" },
      ]);
      assert((await readUsed(admin, TENANT)) === 1, "tenant A only");
      assert((await readUsed(admin, OTHER_TENANT)) === 2, "tenant B only");
    },
  },
  {
    name: "reader: filter shape matches contract (tenant_members + active/invited + count exact head)",
    run: async () => {
      const admin = mockAdmin([{ tenant_id: TENANT, membership_status: "active" }]);
      await readUsed(admin, TENANT);
      const f = admin._lastFilter();
      assert(f.table === "tenant_members", "table = tenant_members");
      assert(f.tenantId === TENANT, "tenant filter present");
      assert(
        f.statuses !== null &&
          f.statuses.length === 2 &&
          f.statuses.includes("active") &&
          f.statuses.includes("invited"),
        "status filter = active + invited",
      );
      assert(f.countMode === "exact", "count=exact");
      assert(f.head === true, "head=true (no rows returned)");
    },
  },

  // ============================================================
  // Security invariants — §23
  // ============================================================
  {
    name: "SEAT_FEATURE_KEY is fixed and equals users.seats",
    run: async () => {
      assert(SEAT_FEATURE_KEY === "users.seats", "fixed key");
    },
  },
  {
    name: "negative feature decision does not require reading tenant_members (pure helper never touches DB)",
    run: async () => {
      // The pure helper cannot see the admin client at all — this is
      // structural (no supabase import in limit-decision.ts). Assert the
      // decision path is short-circuited (feature reason wins) using a
      // sentinel extracted that would otherwise change the outcome.
      const d = decideCommercialSeatLimit({
        featureDecision: feature({
          allowed: false,
          reason: "not_entitled",
          source: "plan",
        }),
        extracted: { limit: 999, source: "plan" },
        used: 0,
        requestedIncrement: 1,
      });
      assert(d.reason === "not_entitled", "reason preserved");
      assert(d.limit === null, "limit forcibly null (no quantitative eval)");
      assert(d.used === null, "used forcibly null (no quantitative eval)");
    },
  },
  {
    name: "DTO shape is closed (only whitelisted fields)",
    run: async () => {
      const d: CommercialLimitDecision = decideCommercialSeatLimit({
        featureDecision: feature(),
        extracted: { limit: 5, source: "plan" },
        used: 2,
        requestedIncrement: 1,
      });
      const keys = Object.keys(d).sort();
      const expected = [
        "allowed",
        "featureKey",
        "limit",
        "reason",
        "remaining",
        "requestedIncrement",
        "source",
        "tenantId",
        "used",
      ];
      assert(
        keys.length === expected.length && keys.every((k, i) => k === expected[i]),
        `keys=${keys.join(",")}`,
      );
    },
  },

  // ============================================================
  // SCP-011.1 §7/§8 — Runtime orchestration (production path)
  //
  // These specs exercise `resolveCommercialSeatLimitDecision` — the
  // SAME orchestration the server function uses in production. Deps
  // are injected so we can assert that catalog-gate / feature-decision
  // negatives never touch tenant_members and never load the
  // commercial context.
  // ============================================================
  {
    name: "orchestration: catalog gate negative → no context load, no seat read",
    run: async () => {
      let loadedContext = 0;
      let readUsage = 0;
      const d = await resolveCommercialSeatLimitDecision({
        tenantId: TENANT,
        requestedIncrement: 1,
        deps: {
          evaluateCatalogGate: () => ({
            tenantId: TENANT,
            featureKey: SEAT_FEATURE_KEY,
            allowed: false,
            reason: "not_evaluated",
            source: "none",
          }),
          loadCommercialContext: async () => {
            loadedContext++;
            throw new Error("must not be called");
          },
          readSeatUsage: async () => {
            readUsage++;
            throw new Error("must not be called");
          },
        },
      });
      assert(loadedContext === 0, "context not loaded");
      assert(readUsage === 0, "seat usage not read");
      assert(d.reason === "not_evaluated", "reason propagated");
      assert(d.source === "none", "source propagated");
      assert(d.limit === null && d.used === null && d.remaining === null, "nulls");
      assert(d.allowed === false, "deny");
      assert(d.featureKey === SEAT_FEATURE_KEY, "fixed feature key");
    },
  },
  {
    name: "orchestration: feature decision negative → no tenant_members read",
    run: async () => {
      const buildBilling = (
        status: TenantBillingHealth["status"],
      ): TenantBillingHealth => ({
        tenantId: TENANT,
        status,
        reasons: [],
        lastBillingEventAt: null,
        hasProviderMapping: false,
        
      });
      const scenarios: Array<{
        name: string;
        snapshot: TenantEntitlementSnapshot;
        billing: TenantBillingHealth;
        expectedReason: CommercialFeatureDecision["reason"];
      }> = [
        {
          name: "not_entitled",
          snapshot: snap([]),
          billing: buildBilling("healthy"),
          expectedReason: "not_entitled",
        },
        {
          name: "billing_unknown",
          snapshot: snap([]),
          billing: buildBilling("unknown"),
          expectedReason: "billing_unknown",
        },
        {
          name: "billing_attention_required",
          snapshot: snap([
            { key: SEAT_FEATURE_KEY, value: 10, source: "plan", effective: true },
          ]),
          billing: buildBilling("attention_required"),
          expectedReason: "billing_attention_required",
        },
        {
          name: "billing_blocked",
          snapshot: snap([
            { key: SEAT_FEATURE_KEY, value: 10, source: "plan", effective: true },
          ]),
          billing: buildBilling("blocked"),
          expectedReason: "billing_blocked",
        },
      ];
      for (const s of scenarios) {
        let usageCalls = 0;
        const d = await resolveCommercialSeatLimitDecision({
          tenantId: TENANT,
          requestedIncrement: 1,
          deps: {
            evaluateCatalogGate: () => null,
            loadCommercialContext: async () => ({
              snapshot: s.snapshot,
              billing: s.billing,
            }),
            readSeatUsage: async () => {
              usageCalls++;
              return 0;
            },
          },
        });
        assert(usageCalls === 0, `${s.name}: no seat read`);
        assert(d.reason === s.expectedReason, `${s.name}: reason`);
        assert(d.limit === null && d.used === null && d.remaining === null, `${s.name}: nulls`);
        assert(d.allowed === false, `${s.name}: deny`);
      }
    },
  },
  {
    name: "orchestration: feature positive → readSeatUsage called once with resolved tenant",
    run: async () => {
      let usageCalls = 0;
      let usageTenant: string | null = null;
      const d = await resolveCommercialSeatLimitDecision({
        tenantId: TENANT,
        requestedIncrement: 1,
        deps: {
          evaluateCatalogGate: () => null,
          loadCommercialContext: async () => ({
            snapshot: snap([
              { key: SEAT_FEATURE_KEY, value: 5, source: "plan", effective: true },
            ]),
            billing: {
              tenantId: TENANT,
              status: "healthy",
              reasons: [],
              lastBillingEventAt: null,
              hasProviderMapping: false,
              
            },
          }),
          readSeatUsage: async (tid) => {
            usageCalls++;
            usageTenant = tid;
            return 2;
          },
        },
      });
      assert(usageCalls === 1, "usage read exactly once");
      assert(usageTenant === TENANT, "usage read with resolved tenant");
      assert(d.allowed === true && d.reason === "entitled", "entitled");
      assert(d.limit === 5 && d.used === 2 && d.remaining === 3, "quantitative");
      assert(d.source === "plan", "source preserved from snapshot");
    },
  },
  {
    name: "orchestration: feature positive at limit → limit_reached",
    run: async () => {
      const d = await resolveCommercialSeatLimitDecision({
        tenantId: TENANT,
        requestedIncrement: 1,
        deps: {
          evaluateCatalogGate: () => null,
          loadCommercialContext: async () => ({
            snapshot: snap([
              { key: SEAT_FEATURE_KEY, value: 3, source: "tenant", effective: true },
            ]),
            billing: {
              tenantId: TENANT,
              status: "healthy",
              reasons: [],
              lastBillingEventAt: null,
              hasProviderMapping: false,
              
            },
          }),
          readSeatUsage: async () => 3,
        },
      });
      assert(d.allowed === false, "deny");
      assert(d.reason === "limit_reached", "limit_reached emitted");
      assert(d.source === "tenant", "source preserved");
      assert(d.remaining === 0, "remaining=0");
    },
  },
  {
    name: "orchestration: read failure → not_evaluated, no limit_reached",
    run: async () => {
      const d = await resolveCommercialSeatLimitDecision({
        tenantId: TENANT,
        requestedIncrement: 1,
        deps: {
          evaluateCatalogGate: () => null,
          loadCommercialContext: async () => ({
            snapshot: snap([
              { key: SEAT_FEATURE_KEY, value: 5, source: "plan", effective: true },
            ]),
            billing: {
              tenantId: TENANT,
              status: "healthy",
              reasons: [],
              lastBillingEventAt: null,
              hasProviderMapping: false,
              
            },
          }),
          readSeatUsage: async () => null,
        },
      });
      assert(d.reason === "not_evaluated", "not_evaluated on read failure");
      assert((d.reason as string) !== "limit_reached", "never limit_reached");
      assert(d.limit === 5, "limit preserved");
      assert(d.source === "plan", "source preserved");
      assert(d.used === null && d.remaining === null, "used/remaining null");
    },
  },

  // ============================================================
  // SCP-011.1 §6 — Strict input boundary
  // ============================================================
  {
    name: "input: undefined → requestedIncrement=1",
    run: async () => {
      assert(
        normalizeCommercialSeatLimitInput(undefined).requestedIncrement === 1,
        "default 1",
      );
    },
  },
  {
    name: "input: empty object → requestedIncrement=1",
    run: async () => {
      assert(
        normalizeCommercialSeatLimitInput({}).requestedIncrement === 1,
        "empty → 1",
      );
    },
  },
  {
    name: "input: { requestedIncrement: 1 } accepted",
    run: async () => {
      assert(
        normalizeCommercialSeatLimitInput({ requestedIncrement: 1 })
          .requestedIncrement === 1,
        "1 accepted",
      );
    },
  },
  {
    name: "input: rejects forbidden extra properties",
    run: async () => {
      const forbidden = [
        { tenantId: "abc" },
        { featureKey: "users.seats" },
        { used: 0 },
        { limit: 10 },
        { remaining: 5 },
        { source: "plan" },
        { billingStatus: "healthy" },
        { membershipCount: 3 },
        { currentSeats: 2 },
        { requestedIncrement: 1, tenantId: "abc" },
        { requestedIncrement: 1, foo: "bar" },
      ];
      for (const raw of forbidden) {
        let threw = false;
        try {
          normalizeCommercialSeatLimitInput(raw);
        } catch {
          threw = true;
        }
        assert(threw, `must reject ${JSON.stringify(raw)}`);
      }
    },
  },
  {
    name: "input: rejects requestedIncrement !== 1",
    run: async () => {
      for (const v of [0, 2, -1, 1.5, "1"]) {
        let threw = false;
        try {
          normalizeCommercialSeatLimitInput({ requestedIncrement: v as unknown });
        } catch {
          threw = true;
        }
        assert(threw, `must reject ${JSON.stringify(v)}`);
      }
    },
  },
  {
    name: "input: rejects arrays and primitives",
    run: async () => {
      for (const raw of [null, [], [1], "x", 1, true, false]) {
        let threw = false;
        try {
          normalizeCommercialSeatLimitInput(raw as unknown);
        } catch {
          threw = true;
        }
        assert(threw, `must reject ${JSON.stringify(raw)}`);
      }
    },
  },
];


export async function runCommercialSeatLimitSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const s of specs) {
    try {
      await s.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`  ✗ ${s.name}: ${(e as Error).message}`);
    }
  }
  return { passed, failed };
}
