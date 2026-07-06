// Tenant Middleware — Unit Test Specification (framework-agnostic)
//
// Cobre a lógica determinística de `resolveTenantContext` (IA-001 §12.2).
// Conforme "Unit Testing Policy for Core Deterministic Logic"
// (ROADMAP §Governance Hardening Layer):
//   • Testes de lógica determinística NÃO podem ser removidos por ausência
//     de runner. Este spec é mock-based, sem dependência de Vitest/Jest,
//     e executável por qualquer runner futuro (GA-04/GA-05) sem refactor.
//
// Como executar hoje: `tsgo` valida tipos; para rodar as asserções,
// importar `runTenantMiddlewareSpecs()` em um runner futuro OU em um
// script node ad-hoc:  `await runTenantMiddlewareSpecs()`.

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
}): TenantRepository {
  return {
    async listByUser(): Promise<TenantMembership[]> {
      return opts.memberships ?? [];
    },
    async exists(tenantId: string): Promise<boolean> {
      return (opts.existing ?? []).includes(tenantId);
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

// ---------- specs ----------
export const specs: Array<{ name: string; run: () => Promise<void> }> = [
  {
    name: "super-admin without impersonation resolves single membership",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: true,
        impersonateHeader: null,
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T1 && !ctx.impersonation, "single-membership");
    },
  },
  {
    name: "super-admin with valid impersonation uses header tenant",
    run: async () => {
      const ctx: TenantContext = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: true,
        impersonateHeader: T2,
        repo: makeRepo({ existing: [T2], memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T2 && ctx.impersonation === true, "impersonation ok");
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
  {
    name: "non super-admin sending x-tenant-id → Forbidden",
    run: async () => {
      await expectThrows(
        () =>
          resolveTenantContext({
            userId: USER,
            isSuperAdmin: false,
            impersonateHeader: T2,
            repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
          }),
        /Forbidden: impersonation not allowed/,
        "non-admin impersonation",
      );
    },
  },
  {
    name: "regular user with exactly 1 membership resolves it",
    run: async () => {
      const ctx = await resolveTenantContext({
        userId: USER,
        isSuperAdmin: false,
        impersonateHeader: null,
        repo: makeRepo({ memberships: [{ tenantId: T1 }] }),
      });
      assert(ctx.tenantId === T1 && !ctx.impersonation, "regular single");
    },
  },
  {
    name: "user with multiple memberships → explicit selection required",
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
        "multi-membership",
      );
    },
  },
  {
    name: "user with zero memberships → Forbidden",
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
        "no membership",
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
