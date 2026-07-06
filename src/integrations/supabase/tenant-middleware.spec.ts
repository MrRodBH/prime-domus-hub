import { describe, it, expect } from "vitest";
import { resolveTenantContext } from "./tenant-middleware";
import type { TenantRepository } from "./tenant-repository";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

function repoOf(memberships: string[], existing: string[] = []): TenantRepository {
  return {
    async listByUser() {
      return memberships.map((tenantId) => ({ tenantId }));
    },
    async exists(id: string) {
      return existing.includes(id);
    },
  };
}

describe("resolveTenantContext (IA-001 §12.2)", () => {
  it("super-admin sem impersonation e 1 membership → usa membership", async () => {
    const ctx = await resolveTenantContext({
      userId: "u1",
      isSuperAdmin: true,
      impersonateHeader: null,
      repo: repoOf([TENANT_A]),
    });
    expect(ctx).toEqual({
      tenantId: TENANT_A,
      userId: "u1",
      isSuperAdmin: true,
      impersonation: false,
    });
  });

  it("super-admin impersonando tenant válido → usa header", async () => {
    const ctx = await resolveTenantContext({
      userId: "u1",
      isSuperAdmin: true,
      impersonateHeader: TENANT_B,
      repo: repoOf([TENANT_A], [TENANT_B]),
    });
    expect(ctx.tenantId).toBe(TENANT_B);
    expect(ctx.impersonation).toBe(true);
  });

  it("super-admin impersonando tenant inexistente → erro", async () => {
    await expect(
      resolveTenantContext({
        userId: "u1",
        isSuperAdmin: true,
        impersonateHeader: TENANT_B,
        repo: repoOf([TENANT_A], []),
      }),
    ).rejects.toThrow("Invalid tenant");
  });

  it("não super-admin com header x-tenant-id → erro (ignora header)", async () => {
    await expect(
      resolveTenantContext({
        userId: "u1",
        isSuperAdmin: false,
        impersonateHeader: TENANT_B,
        repo: repoOf([TENANT_A], [TENANT_B]),
      }),
    ).rejects.toThrow("Forbidden: impersonation not allowed");
  });

  it("usuário comum com 1 membership → usa membership", async () => {
    const ctx = await resolveTenantContext({
      userId: "u1",
      isSuperAdmin: false,
      impersonateHeader: null,
      repo: repoOf([TENANT_A]),
    });
    expect(ctx.tenantId).toBe(TENANT_A);
    expect(ctx.impersonation).toBe(false);
    expect(ctx.isSuperAdmin).toBe(false);
  });

  it("usuário com múltiplas memberships → erro explícito (proibido escolher)", async () => {
    await expect(
      resolveTenantContext({
        userId: "u1",
        isSuperAdmin: false,
        impersonateHeader: null,
        repo: repoOf([TENANT_A, TENANT_B]),
      }),
    ).rejects.toThrow("Multiple tenant memberships. Tenant selection required.");
  });

  it("usuário sem membership → Forbidden", async () => {
    await expect(
      resolveTenantContext({
        userId: "u1",
        isSuperAdmin: false,
        impersonateHeader: null,
        repo: repoOf([]),
      }),
    ).rejects.toThrow("Forbidden: no tenant membership");
  });

  it("header com UUID malformado → Invalid tenant", async () => {
    await expect(
      resolveTenantContext({
        userId: "u1",
        isSuperAdmin: true,
        impersonateHeader: "not-a-uuid",
        repo: repoOf([TENANT_A], [TENANT_A]),
      }),
    ).rejects.toThrow("Invalid tenant");
  });
});
