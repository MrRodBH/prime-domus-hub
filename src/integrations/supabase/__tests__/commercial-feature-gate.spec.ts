// SCP-006 — Commercial Feature Gate Server Runtime.
// Deterministic specs for the pure decision helper and the input
// normalizer. The server function itself is exercised via these
// helpers — its handler is a thin wrapper that reuses the same pure
// derivation used by SCP-004 read models.

import {
  decideCommercialFeature,
  normalizeFeatureKey,
  type CommercialFeatureDecision,
} from "@/lib/api/commercial/feature-gate";
import type {
  TenantBillingHealth,
  TenantEntitlementSnapshot,
} from "@/lib/api/commercial/read-models";

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

function snap(
  items: TenantEntitlementSnapshot["entitlements"],
): TenantEntitlementSnapshot {
  return { tenantId: TENANT, entitlements: items };
}

function health(
  status: TenantBillingHealth["status"],
): TenantBillingHealth {
  return {
    tenantId: TENANT,
    status,
    reasons: [],
    lastBillingEventAt: null,
    hasProviderMapping: false,
  };
}

const REASONS: ReadonlyArray<CommercialFeatureDecision["reason"]> = [
  "entitled",
  "not_entitled",
  "limit_reached",
  "billing_unknown",
  "billing_attention_required",
  "billing_blocked",
  "not_evaluated",
];
const SOURCES: ReadonlyArray<CommercialFeatureDecision["source"]> = [
  "tenant",
  "plan",
  "default",
  "none",
];

const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "normalizeFeatureKey rejects missing input",
    run: async () => {
      let threw = false;
      try {
        normalizeFeatureKey(undefined);
      } catch {
        threw = true;
      }
      assert(threw, "undefined must throw");
    },
  },
  {
    name: "normalizeFeatureKey rejects empty string",
    run: async () => {
      let threw = false;
      try {
        normalizeFeatureKey("   ");
      } catch {
        threw = true;
      }
      assert(threw, "empty must throw");
    },
  },
  {
    name: "normalizeFeatureKey rejects non-string",
    run: async () => {
      let threw = false;
      try {
        normalizeFeatureKey(42 as unknown);
      } catch {
        threw = true;
      }
      assert(threw, "non-string must throw");
    },
  },
  {
    name: "normalizeFeatureKey rejects invalid characters",
    run: async () => {
      let threw = false;
      try {
        normalizeFeatureKey("bad key!!");
      } catch {
        threw = true;
      }
      assert(threw, "invalid chars must throw");
    },
  },
  {
    name: "normalizeFeatureKey trims and lowercases",
    run: async () => {
      const k = normalizeFeatureKey("  Reports.Export  ");
      assert(k === "reports.export", "normalized");
    },
  },
  {
    name: "feature found and effective → allow entitled with item.source",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "plan", effective: true },
        ]),
        billing: health("healthy"),
      });
      assert(d.allowed === true, "allowed");
      assert(d.reason === "entitled", "entitled");
      assert(d.source === "plan", "source=plan");
    },
  },
  {
    name: "feature found but not effective → deny not_entitled with item.source",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "tenant", effective: false },
        ]),
        billing: health("healthy"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "not_entitled", "not_entitled");
      assert(d.source === "tenant", "source=tenant");
    },
  },
  {
    name: "feature not found + billing healthy → deny not_entitled / none",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([]),
        billing: health("healthy"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "not_entitled", "not_entitled");
      assert(d.source === "none", "source=none");
    },
  },
  {
    name: "billing unknown + no entitlement → billing_unknown / none",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([]),
        billing: health("unknown"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "billing_unknown", "billing_unknown");
      assert(d.source === "none", "source=none");
    },
  },
  {
    name: "billing attention_required overrides even entitled feature",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "plan", effective: true },
        ]),
        billing: health("attention_required"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "billing_attention_required", "attention_required");
      assert(d.source === "plan", "source computed from item");
    },
  },
  {
    name: "billing blocked overrides even entitled feature",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "tenant", effective: true },
        ]),
        billing: health("blocked"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "billing_blocked", "billing_blocked");
      assert(d.source === "tenant", "source computed from item");
    },
  },
  {
    name: "source=default is preserved when item comes from default layer",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "default", effective: true },
        ]),
        billing: health("healthy"),
      });
      assert(d.source === "default", "source=default");
    },
  },
  {
    name: "value=false denies even when effective (explicit disable)",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: false, source: "tenant", effective: true },
        ]),
        billing: health("healthy"),
      });
      assert(d.allowed === false, "denied");
      assert(d.reason === "not_entitled", "not_entitled");
      assert(d.source === "tenant", "source preserved");
    },
  },
  {
    name: "decision DTO contains only whitelisted fields — no provider/payload/idempotency/raw leaks",
    run: async () => {
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: "reports",
        snapshot: snap([
          { key: "reports", value: true, source: "plan", effective: true },
        ]),
        billing: health("healthy"),
      });
      const keys = Object.keys(d).sort().join(",");
      assert(
        keys === "allowed,featureKey,reason,source,tenantId",
        `DTO keys unexpected: ${keys}`,
      );
      const json = JSON.stringify(d);
      assert(!/provider/i.test(json), "no provider leak");
      assert(!/payload/i.test(json), "no payload leak");
      assert(!/idempotency/i.test(json), "no idempotency leak");
      assert(!/raw/i.test(json), "no raw leak");
      assert(!/subscription/i.test(json), "no subscription raw leak");
      assert(!/customer/i.test(json), "no customer ref leak");
      assert(!/hash/i.test(json), "no hash leak");
      assert(!/error_message/i.test(json), "no error_message leak");
    },
  },
  {
    name: "decision reason is always a closed enum value",
    run: async () => {
      const cases: TenantBillingHealth["status"][] = [
        "healthy",
        "unknown",
        "attention_required",
        "blocked",
      ];
      for (const status of cases) {
        const d = decideCommercialFeature({
          tenantId: TENANT,
          featureKey: "reports",
          snapshot: snap([]),
          billing: health(status),
        });
        assert(REASONS.includes(d.reason), `reason enum: ${d.reason}`);
        assert(SOURCES.includes(d.source), `source enum: ${d.source}`);
        assert(typeof d.allowed === "boolean", "allowed boolean");
      }
    },
  },
];

export async function runCommercialFeatureGateSpecs(): Promise<{
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
