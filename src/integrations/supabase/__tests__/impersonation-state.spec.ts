// Impersonation Local State — Unit Test Specification (framework-agnostic)
//
// Cf. Patch 2.3.1 — Impersonation Local State Cleanup.
// Segue a Unit Testing Policy: mock-based, sem dependência de runner.

import {
  clearImpersonationOnServerRejection,
  clearImpersonationTenantId,
  getImpersonationTenantId,
  isImpersonationRejection,
  setImpersonationTenantId,
  subscribeImpersonation,
} from "@/integrations/supabase/impersonation-state";

// ---------- micro storage stub ----------
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
    window?: { localStorage: Storage; addEventListener: () => void; removeEventListener: () => void };
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

const T1 = "22222222-2222-2222-2222-222222222222";

export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "set → get → clear roundtrip",
    run: async () => {
      const restore = installStorageStub();
      try {
        assert(getImpersonationTenantId() === null, "starts empty");
        setImpersonationTenantId(T1);
        assert(getImpersonationTenantId() === T1, "reads back");
        clearImpersonationTenantId();
        assert(getImpersonationTenantId() === null, "cleared");
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
          "impersonate_tenant_id",
          "",
        );
        assert(getImpersonationTenantId() === null, "empty → null");
      } finally {
        restore();
      }
    },
  },
  {
    name: "subscribe fires on set and clear",
    run: async () => {
      const restore = installStorageStub();
      try {
        let hits = 0;
        const unsub = subscribeImpersonation(() => {
          hits++;
        });
        setImpersonationTenantId(T1);
        clearImpersonationTenantId();
        unsub();
        setImpersonationTenantId(T1); // must not fire after unsub
        assert(hits === 2, `expected 2 hits, got ${hits}`);
      } finally {
        restore();
      }
    },
  },
  {
    name: "isImpersonationRejection matches known server errors",
    run: async () => {
      assert(isImpersonationRejection(new Error("Forbidden")), "forbidden");
      assert(isImpersonationRejection(new Error("Invalid tenant")), "invalid tenant");
      assert(isImpersonationRejection(new Error("Tenant not found")), "not found");
      assert(
        isImpersonationRejection(new Error("Impersonation not allowed")),
        "not allowed",
      );
      assert(!isImpersonationRejection(new Error("Network error")), "unrelated");
      assert(!isImpersonationRejection(null), "null safe");
    },
  },
  {
    name: "clearImpersonationOnServerRejection only clears on match + present state",
    run: async () => {
      const restore = installStorageStub();
      try {
        assert(
          clearImpersonationOnServerRejection(new Error("Forbidden")) === false,
          "no-op when empty",
        );
        setImpersonationTenantId(T1);
        assert(
          clearImpersonationOnServerRejection(new Error("Network error")) === false,
          "unrelated error → keep",
        );
        assert(getImpersonationTenantId() === T1, "state kept");
        assert(
          clearImpersonationOnServerRejection(new Error("Forbidden")) === true,
          "matched → cleared",
        );
        assert(getImpersonationTenantId() === null, "state cleared");
      } finally {
        restore();
      }
    },
  },
];

export async function runImpersonationStateSpecs(): Promise<{ passed: number; failed: number }> {
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
