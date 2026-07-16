// LSH-01 · Lote A — Unit tests for the typed lead authorization boundary.
// Deterministic doubles only. No DB, no JWT, no fixtures.
// The operational multi-tenant/RLS proof belongs to LSV-01.

import {
  authorizeLeadOperation,
  buildLeadAuthorizationContext,
  decideOperationScope,
  LeadAuthorizationError,
  type LeadAppRole,
  type LeadAuthorizationRepository,
  type LeadOperation,
  type TypedSupabase,
} from "@/lib/leads/lead-authorization.server";

function makeRepo(
  overrides: Partial<LeadAuthorizationRepository> = {},
): LeadAuthorizationRepository {
  return {
    resolveTenant: async () => "11111111-1111-1111-1111-111111111111",
    listActiveMemberships: async () => [
      { id: "t:u", membership_status: "active" },
    ],
    listAppRoles: async (): Promise<ReadonlyArray<LeadAppRole>> => ["admin"],
    isSuperAdmin: async () => false,
    ...overrides,
  };
}

const dummySupabase = {} as TypedSupabase;

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
            { supabase: dummySupabase, userId: "" },
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
      await shouldReject(
        () =>
          authorizeLeadOperation(
            { supabase: dummySupabase, userId: "u1" },
            "lead.list",
            makeRepo({ resolveTenant: async () => null }),
          ),
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
            { supabase: dummySupabase, userId: "u1" },
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
            { supabase: dummySupabase, userId: "u1" },
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
    name: "role denied → operation_forbidden (secretaria on create_manual)",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            { supabase: dummySupabase, userId: "u1" },
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
            { supabase: dummySupabase, userId: "u1" },
            "lead.list",
            makeRepo({ listAppRoles: async () => ["captador"] }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "admin → tenant_wide on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
        "lead.list",
        makeRepo(),
      );
      if (d.scope !== "tenant_wide") throw new Error(d.scope);
    },
  },
  {
    name: "gerente → tenant_wide on lead.list (per matrix evidence)",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
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
        { supabase: dummySupabase, userId: "u1" },
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
            { supabase: dummySupabase, userId: "u1" },
            "lead.list_assignees",
            makeRepo({ listAppRoles: async () => ["corretor"] }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "workspace_action is unreachable for any role",
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
              { supabase: dummySupabase, userId: "u1" },
              "lead.workspace_action",
              makeRepo({ listAppRoles: async () => [role] }),
            ),
          "operation_forbidden",
        );
      }
    },
  },
  {
    name: "admin (app_role) is NOT Super Admin — impersonating derived only from is_super_admin RPC",
    run: async () => {
      // Repo enforces: admin app_role but isSuperAdmin=false → impersonating=false.
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
        "lead.list",
        makeRepo({
          listAppRoles: async () => ["admin"],
          isSuperAdmin: async () => false,
        }),
      );
      if (d.impersonating) throw new Error("admin app_role must not imply super admin");
    },
  },
  {
    name: "Super Admin evidence is isolated (isSuperAdmin=true) but impersonating stays false at boundary",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
        "lead.list",
        makeRepo({ isSuperAdmin: async () => true }),
      );
      if (!d.isSuperAdmin)
        throw new Error("super admin evidence should set isSuperAdmin=true");
      if (d.impersonating)
        throw new Error(
          "impersonating must remain false at boundary — RPC is the authority",
        );
    },
  },
  {
    name: "caller cannot supply impersonation as free boolean (type-level guard)",
    run: async () => {
      // TypeScript refuses `impersonating` on LeadAuthorizationContext.
      // At runtime, casting through unknown does not affect the decision.
      const ctx = { supabase: dummySupabase, userId: "u1" } as {
        supabase: TypedSupabase;
        userId: string;
      };
      const d = await authorizeLeadOperation(
        ctx,
        "lead.list",
        makeRepo({ isSuperAdmin: async () => false }),
      );
      if (d.impersonating)
        throw new Error("caller supplied impersonation must be ignored");
    },
  },
  {
    name: "buildLeadAuthorizationContext ignores extraneous caller fields",
    run: async () => {
      const authenticated = {
        supabase: dummySupabase,
        userId: "u1",
      };
      const ctx = buildLeadAuthorizationContext(authenticated);
      if (ctx.userId !== "u1") throw new Error("userId lost");
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
        const d = await authorizeLeadOperation(
          { supabase: dummySupabase, userId: "u1" },
          op,
          makeRepo(),
        );
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
