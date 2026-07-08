// F3.4 — Tenant Selection Local State — Unit Test Specification
// (framework-agnostic, mesmo padrão de impersonation-state.spec.ts)

import {
  clearSelectedTenantId,
  clearTenantSelectionOnServerRejection,
  getSelectedTenantId,
  isTenantSelectionRejection,
  reconcileSelection,
  setSelectedTenantId,
} from "@/integrations/supabase/tenant-selection-state";

function installStorageStub() {
  const map = new Map<string, string>();
  const stub: Storage = {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => {
      map.delete(k);
    },
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
  const g = globalThis as unknown as {
    window?: {
      localStorage: Storage;
      addEventListener: () => void;
      removeEventListener: () => void;
    };
    localStorage?: Storage;
  };
  const originalWindow = g.window;
  g.window = {
    localStorage: stub,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  g.localStorage = stub;
  return () => {
    g.window = originalWindow;
    delete g.localStorage;
  };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

const T1 = "11111111-1111-1111-1111-111111111111";
const T2 = "22222222-2222-2222-2222-222222222222";
const T3 = "33333333-3333-3333-3333-333333333333";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "set → get → clear roundtrip",
    run: async () => {
      const restore = installStorageStub();
      try {
        assert(getSelectedTenantId() === null, "starts empty");
        setSelectedTenantId(T1);
        assert(getSelectedTenantId() === T1, "reads back");
        clearSelectedTenantId();
        assert(getSelectedTenantId() === null, "cleared");
      } finally {
        restore();
      }
    },
  },
  {
    name: "setSelectedTenantId('') is a no-op (defensive)",
    run: async () => {
      const restore = installStorageStub();
      try {
        setSelectedTenantId("");
        assert(getSelectedTenantId() === null, "empty rejected");
      } finally {
        restore();
      }
    },
  },
  {
    name: "empty string persisted is treated as null (defensive)",
    run: async () => {
      const restore = installStorageStub();
      try {
        (globalThis as unknown as { localStorage: Storage }).localStorage.setItem(
          "selected_tenant_id",
          "",
        );
        assert(getSelectedTenantId() === null, "empty → null");
      } finally {
        restore();
      }
    },
  },
  {
    name: "reconcileSelection keeps tenant when in active list",
    run: async () => {
      const restore = installStorageStub();
      try {
        setSelectedTenantId(T1);
        const kept = reconcileSelection([T1, T2]);
        assert(kept === T1, "kept");
        assert(getSelectedTenantId() === T1, "still there");
      } finally {
        restore();
      }
    },
  },
  {
    name: "reconcileSelection clears tenant when not in active list",
    run: async () => {
      const restore = installStorageStub();
      try {
        setSelectedTenantId(T1);
        const kept = reconcileSelection([T2, T3]);
        assert(kept === null, "cleared");
        assert(getSelectedTenantId() === null, "storage cleared");
      } finally {
        restore();
      }
    },
  },
  {
    name: "reconcileSelection is no-op when no selection",
    run: async () => {
      const restore = installStorageStub();
      try {
        const kept = reconcileSelection([T1, T2]);
        assert(kept === null, "null in null out");
        // no fallback: never picks T1 or T2 automatically
      } finally {
        restore();
      }
    },
  },
  {
    name: "isTenantSelectionRejection matches server rejection messages",
    run: async () => {
      assert(
        isTenantSelectionRejection(new Error("Invalid tenant selection.")),
        "invalid",
      );
      assert(
        isTenantSelectionRejection(new Error("Tenant access denied.")),
        "denied",
      );
      assert(
        isTenantSelectionRejection(
          new Error("Forbidden: no tenant membership"),
        ),
        "no membership",
      );
      assert(
        isTenantSelectionRejection(
          new Error("Multiple tenant memberships. Tenant selection required."),
        ),
        "selection required",
      );
      assert(
        !isTenantSelectionRejection(new Error("network timeout")),
        "unrelated ignored",
      );
      assert(!isTenantSelectionRejection(null), "null safe");
    },
  },
  {
    name: "clearTenantSelectionOnServerRejection clears on match, keeps on miss",
    run: async () => {
      const restore = installStorageStub();
      try {
        setSelectedTenantId(T1);
        const cleared = clearTenantSelectionOnServerRejection(
          new Error("Tenant access denied."),
        );
        assert(cleared === true, "cleared");
        assert(getSelectedTenantId() === null, "storage cleared");

        setSelectedTenantId(T2);
        const cleared2 = clearTenantSelectionOnServerRejection(
          new Error("network glitch"),
        );
        assert(cleared2 === false, "not cleared");
        assert(getSelectedTenantId() === T2, "storage kept");
      } finally {
        restore();
      }
    },
  },
];

export async function runTenantSelectionStateSpecs(): Promise<{
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
