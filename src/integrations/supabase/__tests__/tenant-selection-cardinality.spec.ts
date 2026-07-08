// F3.5 — Tenant Switcher UX — cardinality resolution tests.
import { resolveCardinalityAction } from "@/components/workspace/tenant/tenant-selection-cardinality";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const T1 = "11111111-1111-1111-1111-111111111111";
const T2 = "22222222-2222-2222-2222-222222222222";
const T3 = "33333333-3333-3333-3333-333333333333";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "0 tenants → none",
    run: async () => {
      const a = resolveCardinalityAction([], null);
      assert(a.kind === "none", "kind=none");
      const b = resolveCardinalityAction([], T1);
      assert(b.kind === "none", "still none even with stale selection");
    },
  },
  {
    name: "1 tenant + no selection → auto-select that one",
    run: async () => {
      const a = resolveCardinalityAction([T1], null);
      assert(a.kind === "auto-select", "kind");
      assert(a.kind === "auto-select" && a.tenantId === T1, "id");
    },
  },
  {
    name: "1 tenant + valid selection → keep",
    run: async () => {
      const a = resolveCardinalityAction([T1], T1);
      assert(a.kind === "keep" && a.tenantId === T1, "kept");
    },
  },
  {
    name: "N tenants + no selection → require-selection (no heuristic)",
    run: async () => {
      const a = resolveCardinalityAction([T1, T2, T3], null);
      assert(a.kind === "require-selection", "requires explicit");
      // proibido escolher o primeiro
      assert(!("tenantId" in a), "no tenantId leak");
    },
  },
  {
    name: "N tenants + valid selection → keep",
    run: async () => {
      const a = resolveCardinalityAction([T1, T2, T3], T2);
      assert(a.kind === "keep" && a.tenantId === T2, "kept");
    },
  },
  {
    name: "N tenants + stale selection (not in list) → require-selection",
    run: async () => {
      const a = resolveCardinalityAction([T1, T2], T3);
      assert(a.kind === "require-selection", "requires explicit");
    },
  },
  {
    name: "no auto-select when N>1 even if selection missing",
    run: async () => {
      const a = resolveCardinalityAction([T1, T2], null);
      assert(a.kind === "require-selection", "never auto");
    },
  },
];

export async function runTenantSelectionCardinalitySpecs(): Promise<{
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
      // eslint-disable-next-line no-console
      console.error(`✗ ${s.name}\n  ${e instanceof Error ? e.message : e}`);
    }
  }
  return { passed, failed };
}
