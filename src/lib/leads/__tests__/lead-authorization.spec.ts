// LSH-01 · Lote B — Unit tests for the typed lead authorization boundary.
// Deterministic doubles only. No DB, no JWT, no fixtures.
// The operational multi-tenant/RLS proof belongs to LSV-01.

import {
  authorizeLeadOperation,
  buildLeadAuthorizationContext,
  decideOperationScope,
  deriveLeadTenantContext,
  mapTenantOrigin,
  LeadAuthorizationError,
  type LeadAppRole,
  type LeadAuthorizationContext,
  type LeadAuthorizationRepository,
  type LeadOperation,
  type LeadTenantContext,
  type TypedSupabase,
} from "@/lib/leads/lead-authorization.server";
import type { TenantContext } from "@/integrations/supabase/tenant-middleware";

const TENANT = "11111111-1111-1111-1111-111111111111";

function makeRepo(
  overrides: Partial<LeadAuthorizationRepository> = {},
): LeadAuthorizationRepository {
  return {
    listActiveMemberships: async () => [
      { id: "t:u", membership_status: "active" },
    ],
    listAppRoles: async (): Promise<ReadonlyArray<LeadAppRole>> => ["admin"],
    ...overrides,
  };
}

const dummySupabase = {} as TypedSupabase;

function memberTenant(): LeadTenantContext {
  return { tenantId: TENANT, origin: "membership", isSuperAdmin: false };
}
function impersonationTenant(): LeadTenantContext {
  return { tenantId: TENANT, origin: "impersonation", isSuperAdmin: true };
}

function makeCtx(
  tenant: LeadTenantContext = memberTenant(),
  userId = "u1",
): LeadAuthorizationContext {
  return { supabase: dummySupabase, userId, tenant };
}

type Case = { name: string; run: () => Promise<void> };

function expectCode(err: unknown, code: LeadAuthorizationError["code"]): void {
  if (!(err instanceof LeadAuthorizationError))
    throw new Error(`expected LeadAuthorizationError, got ${String(err)}`);
  if (err.code !== code)
    throw new Error(`expected code ${code}, got ${err.code}`);
}

async function shouldReject(
  fn: () => Promise<unknown>,
  code: LeadAuthorizationError["code"],
): Promise<void> {
  try {
    await fn();
  } catch (e) {
    expectCode(e, code);
    return;
  }
  throw new Error(`expected rejection with ${code}`);
}

const cases: Case[] = [
  {
    name: "unauthenticated → throws unauthenticated",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(memberTenant(), ""),
            "lead.list",
            makeRepo(),
          ),
        "unauthenticated",
      );
    },
  },
  {
    name: "tenant not resolved → tenant_not_resolved",
    run: async () => {
      const ctx: LeadAuthorizationContext = {
        supabase: dummySupabase,
        userId: "u1",
        // Empty tenantId simulates an unresolved tenant surface.
        tenant: { tenantId: "", origin: "membership", isSuperAdmin: false },
      };
      await shouldReject(
        () => authorizeLeadOperation(ctx, "lead.list", makeRepo()),
        "tenant_not_resolved",
      );
    },
  },
  {
    name: "membership missing → membership_missing",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(),
            "lead.list",
            makeRepo({ listActiveMemberships: async () => [] }),
          ),
        "membership_missing",
      );
    },
  },
  {
    name: "membership ambiguous (N>1) → membership_ambiguous",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(),
            "lead.list",
            makeRepo({
              listActiveMemberships: async () => [
                { id: "a", membership_status: "active" },
                { id: "b", membership_status: "active" },
              ],
            }),
          ),
        "membership_ambiguous",
      );
    },
  },
  {
    name: "Super Admin without impersonation → super_admin_requires_impersonation",
    run: async () => {
      const t: LeadTenantContext = {
        tenantId: TENANT,
        origin: "membership",
        isSuperAdmin: true,
      };
      await shouldReject(
        () => authorizeLeadOperation(makeCtx(t), "lead.list", makeRepo()),
        "super_admin_requires_impersonation",
      );
    },
  },
  {
    name: "Super Admin with impersonation → tenant_wide, no membership/role required",
    run: async () => {
      // Repo would fail if consulted (asserts membership is not required).
      const repo: LeadAuthorizationRepository = {
        listActiveMemberships: async () => {
          throw new Error("membership repo must not be consulted");
        },
        listAppRoles: async () => {
          throw new Error("role repo must not be consulted");
        },
      };
      const d = await authorizeLeadOperation(
        makeCtx(impersonationTenant()),
        "lead.list",
        repo,
      );
      if (d.scope !== "tenant_wide") throw new Error(d.scope);
      if (!d.isSuperAdmin) throw new Error("isSuperAdmin must be true");
      if (!d.impersonating) throw new Error("impersonating must be true");
      if (d.membershipKey !== null)
        throw new Error("membershipKey must be null");
      if (d.appRoles.length !== 0) throw new Error("appRoles must be empty");
    },
  },
  {
    name: "Super Admin impersonating cannot execute workspace_action",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(impersonationTenant()),
            "lead.workspace_action",
            makeRepo(),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "regular user with impersonation origin → operation_forbidden",
    run: async () => {
      const t: LeadTenantContext = {
        tenantId: TENANT,
        origin: "impersonation",
        isSuperAdmin: false,
      };
      await shouldReject(
        () => authorizeLeadOperation(makeCtx(t), "lead.list", makeRepo()),
        "operation_forbidden",
      );
    },
  },
  {
    name: "role denied → operation_forbidden (secretaria on create_manual)",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(),
            "lead.create_manual",
            makeRepo({ listAppRoles: async () => ["secretaria"] }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "captador denied on lead.list (fail-closed)",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(),
            "lead.list",
            makeRepo({ listAppRoles: async () => ["captador"] }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "admin (app_role) with membership origin is NOT Super Admin",
    run: async () => {
      const d = await authorizeLeadOperation(makeCtx(), "lead.list", makeRepo());
      if (d.isSuperAdmin)
        throw new Error("admin app_role must not imply super admin");
      if (d.impersonating) throw new Error("impersonating must remain false");
    },
  },
  {
    name: "admin → tenant_wide on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation(makeCtx(), "lead.list", makeRepo());
      if (d.scope !== "tenant_wide") throw new Error(d.scope);
    },
  },
  {
    name: "gerente → tenant_wide on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation(
        makeCtx(),
        "lead.list",
        makeRepo({ listAppRoles: async () => ["gerente"] }),
      );
      if (d.scope !== "tenant_wide") throw new Error(d.scope);
    },
  },
  {
    name: "corretor → own_assigned on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation(
        makeCtx(),
        "lead.list",
        makeRepo({ listAppRoles: async () => ["corretor"] }),
      );
      if (d.scope !== "own_assigned") throw new Error(d.scope);
    },
  },
  {
    name: "corretor cannot list_assignees",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            makeCtx(),
            "lead.list_assignees",
            makeRepo({ listAppRoles: async () => ["corretor"] }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "workspace_action is unreachable for any tenant-scoped role",
    run: async () => {
      for (const role of [
        "admin",
        "corretor",
        "gerente",
        "secretaria",
        "captador",
      ] as LeadAppRole[]) {
        await shouldReject(
          () =>
            authorizeLeadOperation(
              makeCtx(),
              "lead.workspace_action",
              makeRepo({ listAppRoles: async () => [role] }),
            ),
          "operation_forbidden",
        );
      }
    },
  },
  {
    name: "mapTenantOrigin collapses selection/single-membership to membership",
    run: async () => {
      if (mapTenantOrigin("selection") !== "membership")
        throw new Error("selection mapping");
      if (mapTenantOrigin("single-membership") !== "membership")
        throw new Error("single-membership mapping");
      if (mapTenantOrigin("impersonation") !== "impersonation")
        throw new Error("impersonation mapping");
    },
  },
  {
    name: "deriveLeadTenantContext preserves tenantId and Super Admin evidence",
    run: async () => {
      const middleware: TenantContext = {
        tenantId: TENANT,
        userId: "u1",
        isSuperAdmin: true,
        impersonation: true,
        origin: "impersonation",
      };
      const t = deriveLeadTenantContext(middleware);
      if (t.tenantId !== TENANT) throw new Error("tenantId");
      if (t.origin !== "impersonation") throw new Error("origin");
      if (!t.isSuperAdmin) throw new Error("isSuperAdmin");
    },
  },
  {
    name: "buildLeadAuthorizationContext ignores extraneous caller fields",
    run: async () => {
      const middleware: TenantContext = {
        tenantId: TENANT,
        userId: "u1",
        isSuperAdmin: false,
        impersonation: false,
        origin: "single-membership",
      };
      const ctx = buildLeadAuthorizationContext({
        supabase: dummySupabase,
        userId: "u1",
        tenant: middleware,
      });
      if (ctx.userId !== "u1") throw new Error("userId lost");
      if (ctx.tenant.origin !== "membership")
        throw new Error("origin not collapsed");
      if (ctx.tenant.isSuperAdmin) throw new Error("isSuperAdmin leaked");
      if ("impersonating" in (ctx as unknown as Record<string, unknown>))
        throw new Error("impersonating leaked into context");
    },
  },
  {
    name: "decideOperationScope: admin tenant_wide on update_fields",
    run: async () => {
      const r = decideOperationScope("lead.update_fields", ["admin"]);
      if (!r.authorized || r.scope !== "tenant_wide")
        throw new Error(JSON.stringify(r));
    },
  },
  {
    name: "decideOperationScope: corretor own_assigned on update_fields",
    run: async () => {
      const r = decideOperationScope("lead.update_fields", ["corretor"]);
      if (!r.authorized || r.scope !== "own_assigned")
        throw new Error(JSON.stringify(r));
    },
  },
  {
    name: "operation reflected in decision",
    run: async () => {
      const ops: LeadOperation[] = [
        "lead.list",
        "lead.list_assignees",
        "lead.list_properties",
        "lead.create_manual",
        "lead.update_fields",
      ];
      for (const op of ops) {
        const d = await authorizeLeadOperation(makeCtx(), op, makeRepo());
        if (d.operation !== op) throw new Error(`op mismatch: ${op}`);
      }
    },
  },
];

export async function runLeadAuthorizationSpecs(): Promise<{
  passed: number;
  failed: number;
}> {
  let passed = 0;
  let failed = 0;
  for (const c of cases) {
    try {
      await c.run();
      passed++;
    } catch (e) {
      failed++;
      console.error(`FAIL ${c.name}:`, e instanceof Error ? e.message : e);
    }
  }
  return { passed, failed };
}
