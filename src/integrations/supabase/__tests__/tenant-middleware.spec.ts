// Tenant Middleware — Unit Test Specification (framework-agnostic)
//
// Cobre a lógica determinística de `resolveTenantContext`:
//   • IA-001 §12.2 — algoritmo base de cardinalidade + impersonação.
//   • F3.2 — Server-Side Tenant Selection — seleção explícita via
//     x-tenant-id validada contra membership_status = 'active'.
//
// Conforme "Unit Testing Policy for Core Deterministic Logic"
// (ROADMAP §Governance Hardening Layer): mock-based, sem dependência de
// runner (Vitest/Jest), executável por qualquer runner futuro.

import {
  resolveTenantContext,
  type TenantContext,
} from "@/integrations/supabase/tenant-middleware";
import type {
  TenantMembership,
  TenantRepository,
} from "@/integrations/supabase/tenant-repository";

// ---------- mock repository ----------
function makeRepo(opts: {
  memberships?: TenantMembership[];
  existing?: string[];
  activeMemberships?: Array<{ userId: string; tenantId: string }>;
}): TenantRepository {
  return {
    async listByUser(): Promise<TenantMembership[]> {
      return opts.memberships ?? [];
    },
    async exists(tenantId: string): Promise<boolean> {
      return (opts.existing ?? []).includes(tenantId);
    },
    async userHasActiveMembership(userId: string, tenantId: string): Promise<boolean> {
      return (opts.activeMemberships ?? []).some(
        (m) => m.userId === userId && m.tenantId === tenantId,
      );
    },
  };
}

// ---------- micro assertion helpers (framework-agnostic) ----------
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}
async function expectThrows(fn: () => Promise<unknown>, matcher: RegExp, label: string) {
  try {
    await fn();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(matcher.test(m), `${label}: expected /${matcher.source}/, got "${m}"`);
    return;
  }
  throw new Error(`${label}: expected throw, got success`);
}

const USER = "11111111-1111-1111-1111-111111111111";
const T1 = "22222222-2222-2222-2222-222222222222";
const T2 = "33333333-3333-3333-3333-333333333333";
const T_ALHEIO = "44444444-4444-4444-4444-444444444444";

// ---------- specs ----------
export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  // ============ Super Admin ============
  {
    name: "super-admin with valid impersonation → origin=impersonation",
    run: async () => {
      const ctx: TenantContext = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: true,
        impersonateHeader: T2,
        repo: makeRepo({ existing: [T2] }),
      });
      assert(ctx.tenantId === T2, "tenant");
      assert(ctx.impersonation === true, "impersonation flag");
      assert(ctx.origin === "impersonation", "origin");
    },
  },
  {
    name: "super-admin without impersonation → no tenant-scoped access",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: true,
            impersonateHeader: null,
            repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
          }),
        /Forbidden: no tenant membership/,
        "super-admin no header",
      );
    },
  },
  {
    name: "super-admin with invalid (non-uuid) impersonation → Invalid tenant",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: true,
            impersonateHeader: "not-a-uuid",
            repo: makeRepo({}),
          }),
        /Invalid tenant/,
        "invalid uuid",
      );
    },
  },
  {
    name: "super-admin with unknown tenant impersonation → Invalid tenant",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: true,
            impersonateHeader: T2,
            repo: makeRepo({ existing: [] }),
          }),
        /Invalid tenant/,
        "unknown tenant",
      );
    },
  },

  // ============ Usuário comum SEM header ============
  {
    name: "regular user with 0 active memberships → Forbidden",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: null,
            repo: makeRepo({ memberships: [] }),
          }),
        /Forbidden: no tenant membership/,
        "zero memberships",
      );
    },
  },
  {
    name: "regular user with exactly 1 active membership → origin=single-membership",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: null,
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T1, "tenant");
      assert(ctx.impersonation === false, "no impersonation");
      assert(ctx.origin === "single-membership", "origin");
    },
  },
  {
    name: "regular user with N active memberships and no header → selection required",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: null,
            repo: makeRepo({ memberships: [{ tenantId: T1 }, { tenantId: T2 }] }),
          }),
        /Multiple tenant memberships/,
        "N memberships",
      );
    },
  },
  {
    name: "empty impersonation header is treated as no header (single membership)",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: "",
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T1 && ctx.origin === "single-membership", "empty header");
    },
  },

  // ============ Usuário comum COM header (F3.2 core) ============
  {
    name: "regular user with N active memberships + valid header → origin=selection",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: T2,
        repo: makeRepo({
          memberships: [{ tenantId: T1 }, { tenantId: T2 }],
          activeMemberships: [
            { userId: USER, tenantId: T1 },
            { userId: USER, tenantId: T2 },
          ],
        }),
      });
      assert(ctx.tenantId === T2, "selected tenant");
      assert(ctx.impersonation === false, "no impersonation");
      assert(ctx.origin === "selection", "origin=selection");
      assert(ctx.isSuperAdmin === false, "not super admin");
    },
  },
  {
    name: "regular user with header for foreign tenant → Tenant access denied",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: T_ALHEIO,
            repo: makeRepo({
              memberships: [{ tenantId: T1 }],
              activeMemberships: [{ userId: USER, tenantId: T1 }],
            }),
          }),
        /Tenant access denied/,
        "foreign tenant",
      );
    },
  },
  {
    name: "regular user with malformed header → Invalid tenant selection",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: "not-a-uuid",
            repo: makeRepo({
              memberships: [{ tenantId: T1 }],
              activeMemberships: [{ userId: USER, tenantId: T1 }],
            }),
          }),
        /Invalid tenant selection/,
        "malformed header",
      );
    },
  },
  {
    name: "regular user with header for non-existent tenant → Tenant access denied",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: T2,
            repo: makeRepo({
              memberships: [{ tenantId: T1 }],
              activeMemberships: [{ userId: USER, tenantId: T1 }],
            }),
          }),
        /Tenant access denied/,
        "non-existent tenant",
      );
    },
  },

  // ============ Memberships não-ativas (invited/suspended/revoked) ============
  // O repositório de teses filtra por 'active' via activeMemberships;
  // memberships invited/suspended/revoked NÃO aparecem em listByUser nem
  // validam userHasActiveMembership. Simulamos ausência.
  {
    name: "user with only invited membership and header → Tenant access denied",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: T1,
            // invited: NÃO aparece em activeMemberships nem em memberships
            repo: makeRepo({ memberships: [], activeMemberships: [] }),
          }),
        /Tenant access denied/,
        "invited membership blocked",
      );
    },
  },
  {
    name: "user with only suspended membership and no header → Forbidden",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: null,
            repo: makeRepo({ memberships: [] }),
          }),
        /Forbidden: no tenant membership/,
        "suspended-only",
      );
    },
  },
  {
    name: "user with only revoked membership + header → Tenant access denied",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: T1,
            repo: makeRepo({ memberships: [], activeMemberships: [] }),
          }),
        /Tenant access denied/,
        "revoked blocked",
      );
    },
  },
  {
    name: "1 active + 1 suspended (only active surfaces) without header → resolves the active",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: null,
        // repo já filtra por active — só T1 aparece
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T1 && ctx.origin === "single-membership", "active-only");
    },
  },
  {
    name: "2 active + 1 suspended without header → selection required",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: null,
            repo: makeRepo({ memberships: [{ tenantId: T1 }, { tenantId: T2 }] }),
          }),
        /Multiple tenant memberships/,
        "2 active + suspended",
      );
    },
  },

  // ============ Isolamento origin ============
  {
    name: "regular user with valid header never receives origin=impersonation",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: T1,
        repo: makeRepo({
          memberships: [{ tenantId: T1 }],
          activeMemberships: [{ userId: USER, tenantId: T1 }],
        }),
      });
      assert(ctx.origin === "selection", "origin must be selection");
      assert(ctx.impersonation === false, "impersonation flag must be false");
    },
  },
  {
    name: "origin is derived server-side (not passed by caller)",
    run: async () => {
      // Não existe caminho na assinatura de resolveTenantContext para
      // receber `origin` do caller — garantia por construção.
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: null,
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(
        ctx.origin === "single-membership" ||
          ctx.origin === "selection" ||
          ctx.origin === "impersonation",
        "origin is a server-computed enum",
      );
    },
  },
];

export async function runTenantMiddlewareSpecs(): Promise<{ passed: number; failed: number }> {
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
