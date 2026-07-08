// F3.4.1 — Tests for tenant-attacher header resolution.
// Framework-agnostic, mesmo padrão de tenant-selection-state.spec.ts.
import { resolveTenantTransportHeader } from "@/integrations/supabase/tenant-attacher";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const IMP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const SEL = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "no impersonation + no selection → {}",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: null,
        selectedTenantId: null,
      });
      assert(Object.keys(h).length === 0, "empty headers");
    },
  },
  {
    name: "impersonation only → uses impersonation",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: IMP,
        selectedTenantId: null,
      });
      assert(h["x-tenant-id"] === IMP, "imp header");
      assert(Object.keys(h).length === 1, "single header");
    },
  },
  {
    name: "selection only → uses selection",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: null,
        selectedTenantId: SEL,
      });
      assert(h["x-tenant-id"] === SEL, "sel header");
      assert(Object.keys(h).length === 1, "single header");
    },
  },
  {
    name: "impersonation + selection → impersonation wins",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: IMP,
        selectedTenantId: SEL,
      });
      assert(h["x-tenant-id"] === IMP, "imp wins");
      assert(Object.keys(h).length === 1, "never combined");
    },
  },
  {
    name: "empty selection string is falsy → {}",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: null,
        selectedTenantId: "" as unknown as string,
      });
      assert(Object.keys(h).length === 0, "empty ignored");
    },
  },
  {
    name: "empty impersonation + valid selection → uses selection",
    run: async () => {
      const h = resolveTenantTransportHeader({
        impersonationTenantId: "" as unknown as string,
        selectedTenantId: SEL,
      });
      assert(h["x-tenant-id"] === SEL, "falls through to selection");
    },
  },
  {
    name: "never combines two headers",
    run: async () => {
      for (const c of [
        { impersonationTenantId: IMP, selectedTenantId: SEL },
        { impersonationTenantId: IMP, selectedTenantId: null },
        { impersonationTenantId: null, selectedTenantId: SEL },
        { impersonationTenantId: null, selectedTenantId: null },
      ]) {
        const h = resolveTenantTransportHeader(c);
        assert(Object.keys(h).length <= 1, "at most one header");
      }
    },
  },
];

export async function runTenantAttacherSpecs(): Promise<{
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
