// F3.5.1 — Testes de decisão do TenantSelectionGate + guarda estrutural
// contra <Outlet /> duplicado no WorkspaceShell.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveGateDecision } from "@/components/workspace/tenant/tenant-gate-decision";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const T1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const T2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "gate skip: super admin",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: true,
        impersonating: null,
        queryStatus: "success",
        activeIds: [T1, T2],
        selectedId: null,
      });
      assert(d.kind === "skip", "super admin bypasses gate");
    },
  },
  {
    name: "gate skip: impersonation",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: T1,
        queryStatus: "success",
        activeIds: [],
        selectedId: null,
      });
      assert(d.kind === "skip", "impersonation bypasses gate");
    },
  },
  {
    name: "gate loading blocks children",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "pending",
        activeIds: [],
        selectedId: T1,
      });
      assert(d.kind === "loading", "must not allow during loading");
    },
  },
  {
    name: "gate error blocks children",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "error",
        activeIds: [],
        selectedId: null,
      });
      assert(d.kind === "error", "must not allow on error");
    },
  },
  {
    name: "gate blocks: 0 active tenants",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "success",
        activeIds: [],
        selectedId: null,
      });
      assert(d.kind === "no-tenants", "must block on empty list");
    },
  },
  {
    name: "gate blocks: N tenants, no valid selection",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "success",
        activeIds: [T1, T2],
        selectedId: null,
      });
      assert(d.kind === "require-selection", "must require explicit selection");
    },
  },
  {
    name: "gate blocks: N tenants, stale selection",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "success",
        activeIds: [T1, T2],
        selectedId: "zzz-not-in-list",
      });
      assert(d.kind === "require-selection", "stale selection must not pass");
    },
  },
  {
    name: "gate allows: valid selection",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "success",
        activeIds: [T1, T2],
        selectedId: T1,
      });
      assert(d.kind === "allow", "must allow with valid selection");
    },
  },
  {
    name: "gate allows: exactly 1 tenant (auto-reconciled)",
    run: async () => {
      const d = resolveGateDecision({
        isSuper: false,
        impersonating: null,
        queryStatus: "success",
        activeIds: [T1],
        selectedId: T1,
      });
      assert(d.kind === "allow", "must allow single-tenant case");
    },
  },
  {
    name: "WorkspaceShell has exactly one <Outlet /> and it is inside TenantSelectionGate",
    run: async () => {
      const src = readFileSync(
        resolve(process.cwd(), "src/components/workspace/WorkspaceShell.tsx"),
        "utf8",
      );
      const outlets = (src.match(/<Outlet\s*\/>/g) ?? []).length;
      assert(outlets === 1, `expected exactly 1 <Outlet />, got ${outlets}`);
      // Verifica textualmente que o único <Outlet /> aparece entre a abertura
      // e o fechamento de <TenantSelectionGate ...>.
      const gateOpen = src.indexOf("<TenantSelectionGate");
      const gateClose = src.indexOf("</TenantSelectionGate>");
      const outletAt = src.indexOf("<Outlet />");
      assert(gateOpen >= 0 && gateClose > gateOpen, "TenantSelectionGate must wrap outlet");
      assert(
        outletAt > gateOpen && outletAt < gateClose,
        "<Outlet /> must be inside TenantSelectionGate",
      );
    },
  },
  {
    name: "TenantSwitcher disables query for Super Admin (isSuper=true)",
    run: async () => {
      const src = readFileSync(
        resolve(process.cwd(), "src/components/workspace/tenant/TenantSwitcher.tsx"),
        "utf8",
      );
      assert(
        /disabled\s*=\s*Boolean\(impersonating\)\s*\|\|\s*Boolean\(isSuper\)/.test(src),
        "disabled must combine impersonating || isSuper",
      );
      assert(/enabled:\s*!disabled/.test(src), "query.enabled must be !disabled");
    },
  },
  {
    name: "AppHeader does not render TenantSwitcher when isSuper without impersonation",
    run: async () => {
      const src = readFileSync(
        resolve(process.cwd(), "src/components/workspace/AppHeader.tsx"),
        "utf8",
      );
      assert(/!isSuper\s*\?/.test(src), "AppHeader must branch on !isSuper before TenantSwitcher");
      assert(
        /<TenantSwitcher[^/]*isSuper=\{isSuper\}/.test(src),
        "AppHeader must forward isSuper to TenantSwitcher",
      );
    },
  },
];

export async function runTenantGateSpecs(): Promise<{ passed: number; failed: number }> {
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
