// SCP-008 — Commercial Feature Key Catalog Materialization & Server Validation.
// Deterministic specs for catalog integrity, lookup helpers, and the
// catalog gate consumed by SCP-006's getCommercialFeatureDecision.

import {
  COMMERCIAL_FEATURE_CATALOG,
  assertCommercialFeatureCatalogIntegrity,
  evaluateFeatureCatalogGate,
  getCommercialFeatureCatalogItem,
  isCommercialFeatureCataloged,
} from "@/lib/api/commercial/feature-catalog";
import {
  decideCommercialFeature,
  normalizeFeatureKey,
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

function health(status: TenantBillingHealth["status"]): TenantBillingHealth {
  return {
    tenantId: TENANT,
    status,
    reasons: [],
    lastBillingEventAt: null,
    hasProviderMapping: false,
  };
}

const FORBIDDEN_NAMESPACES = ["stripe", "hotmart", "kiwify"];
const FORBIDDEN_TERMS = ["webhook", "checkout", "customer_portal", "customer-portal"];
const TENANT_SPECIFIC_HINTS = ["tenant_", "tenant-", "tenant."];
const PLAN_SPECIFIC_HINTS = ["plan_", "plan-", "plan."];

const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "catalog integrity passes",
    run: async () => {
      assertCommercialFeatureCatalogIntegrity();
    },
  },
  {
    name: "no duplicate keys",
    run: async () => {
      const seen = new Set<string>();
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        assert(!seen.has(item.key), `dup: ${item.key}`);
        seen.add(item.key);
      }
    },
  },
  {
    name: "every key is compatible with normalizeFeatureKey",
    run: async () => {
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        const normalized = normalizeFeatureKey(item.key);
        assert(normalized === item.key, `not stable under normalize: ${item.key}`);
      }
    },
  },
  {
    name: "no forbidden provider namespace anywhere",
    run: async () => {
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        const segs = item.key.split(/[.:_-]/);
        for (const ns of FORBIDDEN_NAMESPACES) {
          assert(!segs.includes(ns), `forbidden ns in ${item.key}: ${ns}`);
        }
      }
    },
  },
  {
    name: "no billing runtime terms (webhook/checkout/customer portal)",
    run: async () => {
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        for (const t of FORBIDDEN_TERMS) {
          assert(!item.key.includes(t), `forbidden term in ${item.key}: ${t}`);
        }
      }
    },
  },
  {
    name: "no tenant-specific keys",
    run: async () => {
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        for (const h of TENANT_SPECIFIC_HINTS) {
          assert(!item.key.startsWith(h), `tenant-specific: ${item.key}`);
        }
      }
    },
  },
  {
    name: "no plan-specific keys",
    run: async () => {
      for (const item of COMMERCIAL_FEATURE_CATALOG) {
        for (const h of PLAN_SPECIFIC_HINTS) {
          assert(!item.key.startsWith(h), `plan-specific: ${item.key}`);
        }
      }
    },
  },
  {
    name: "isCommercialFeatureCataloged('crm.pipeline') === true",
    run: async () => {
      assert(isCommercialFeatureCataloged("crm.pipeline") === true, "expected true");
      const item = getCommercialFeatureCatalogItem("crm.pipeline");
      assert(item !== null && item.domain === "crm", "expected item");
    },
  },
  {
    name: "isCommercialFeatureCataloged for unknown key === false",
    run: async () => {
      assert(isCommercialFeatureCataloged("unknown.feature") === false, "expected false");
      assert(getCommercialFeatureCatalogItem("unknown.feature") === null, "expected null");
    },
  },
  {
    name: "syntactically valid but non-cataloged key returns not_evaluated / none",
    run: async () => {
      const k = normalizeFeatureKey("some.uncataloged.key");
      const d = evaluateFeatureCatalogGate({ tenantId: TENANT, featureKey: k });
      assert(d !== null, "expected decision");
      assert(d!.allowed === false, "denied");
      assert(d!.reason === "not_evaluated", `reason: ${d!.reason}`);
      assert(d!.source === "none", `source: ${d!.source}`);
      assert(d!.tenantId === TENANT && d!.featureKey === k, "identity preserved");
    },
  },
  {
    name: "cataloged key passes gate and follows normal SCP-006 decision",
    run: async () => {
      const k = "crm.pipeline";
      assert(
        evaluateFeatureCatalogGate({ tenantId: TENANT, featureKey: k }) === null,
        "gate must be null for cataloged",
      );
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: k,
        snapshot: snap([{ key: k, value: true, source: "plan", effective: true }]),
        billing: health("healthy"),
      });
      assert(d.allowed === true && d.reason === "entitled", "entitled");
    },
  },
  {
    name: "reserved-status feature stays a pure catalog concern — no provider/billing side effect",
    run: async () => {
      const reserved = COMMERCIAL_FEATURE_CATALOG.find((i) => i.status === "reserved");
      assert(reserved !== undefined, "expected reserved item");
      // Gate returns null (cataloged), and pure decide never touches
      // a provider — spec asserts DTO shape stays sanitized.
      const d = decideCommercialFeature({
        tenantId: TENANT,
        featureKey: reserved!.key,
        snapshot: snap([]),
        billing: health("healthy"),
      });
      const json = JSON.stringify(d);
      assert(!/provider/i.test(json), "no provider leak");
      assert(!/webhook|checkout|customer/i.test(json), "no billing runtime leak");
    },
  },
  {
    name: "gate DTO stays sanitized (5-field whitelist, no leaks)",
    run: async () => {
      const d = evaluateFeatureCatalogGate({
        tenantId: TENANT,
        featureKey: "not.in.catalog",
      });
      assert(d !== null, "decision");
      const keys = Object.keys(d!).sort().join(",");
      assert(
        keys === "allowed,featureKey,reason,source,tenantId",
        `DTO keys: ${keys}`,
      );
      const json = JSON.stringify(d);
      assert(!/provider|payload|idempotency|raw|hash|customer|subscription/i.test(json), "no leaks");
    },
  },
];

export async function runCommercialFeatureCatalogSpecs(): Promise<{
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
