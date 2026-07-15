// LSH-01 — Unit tests for the typed lead authorization boundary.
// Deterministic doubles only. No DB, no JWT, no fixtures.
// The operational multi-tenant/RLS proof belongs to LSV-01.

import {
  authorizeLeadOperation,
  decideOperationScope,
  LeadAuthorizationError,
  type LeadAppRole,
  type LeadAuthorizationRepository,
  type LeadOperation,
  type TypedSupabase,
} from "@/lib/leads/lead-authorization.server";

function makeRepo(overrides: Partial<LeadAuthorizationRepository> = {}): LeadAuthorizationRepository {
  return {
    resolveTenant: async () => "11111111-1111-1111-1111-111111111111",
    listActiveMemberships: async () => [{ id: "m1", membership_status: "active" }],
    listAppRoles: async (): Promise<ReadonlyArray<LeadAppRole>> => ["admin"],
    isSuperAdmin: async () => false,
    ...overrides,
  };
}

const dummySupabase = {} as TypedSupabase;

type Case = { name: string; run: () => Promise<void> };

function expectCode(err: unknown, code: LeadAuthorizationError["code"]): void {
  if (!(err instanceof LeadAuthorizationError)) throw new Error(`expected LeadAuthorizationError, got ${String(err)}`);
  if (err.code !== code) throw new Error(`expected code ${code}, got ${err.code}`);
}

async function shouldReject(fn: () => Promise<unknown>, code: LeadAuthorizationError["code"]): Promise<void> {
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
        () => authorizeLeadOperation({ supabase: dummySupabase, userId: "" }, "lead.list", makeRepo()),
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
                { id: "m1", membership_status: "active" },
                { id: "m2", membership_status: "active" },
              ],
            }),
          ),
        "membership_ambiguous",
      );
    },
  },
  {
    name: "operation forbidden for viewer → operation_forbidden",
    run: async () => {
      await shouldReject(
        () =>
          authorizeLeadOperation(
            { supabase: dummySupabase, userId: "u1" },
            "lead.create_manual",
            makeRepo({ listAppRoles: async () => [] as ReadonlyArray<LeadAppRole> }),
          ),
        "operation_forbidden",
      );
    },
  },
  {
    name: "admin → tenant_wide scope on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation({ supabase: dummySupabase, userId: "u1" }, "lead.list", makeRepo());
      if (d.scope !== "tenant_wide") throw new Error(`expected tenant_wide, got ${d.scope}`);
    },
  },
  {
    name: "corretor → own_assigned scope on lead.list",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
        "lead.list",
        makeRepo({ listAppRoles: async () => ["corretor"] }),
      );
      if (d.scope !== "own_assigned") throw new Error(`expected own_assigned, got ${d.scope}`);
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
    name: "admin can list_properties (tenant_wide)",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1" },
        "lead.list_properties",
        makeRepo(),
      );
      if (d.scope !== "tenant_wide") throw new Error(d.scope);
    },
  },
  {
    name: "workspace_action is unreachable for any role",
    run: async () => {
      for (const role of ["admin", "corretor", "gerente", "secretaria", "captador"] as LeadAppRole[]) {
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
    name: "decideOperationScope: admin gets tenant_wide on update_fields",
    run: async () => {
      const r = decideOperationScope("lead.update_fields", ["admin"]);
      if (!r.authorized || r.scope !== "tenant_wide") throw new Error(JSON.stringify(r));
    },
  },
  {
    name: "decideOperationScope: corretor gets own_assigned on update_fields",
    run: async () => {
      const r = decideOperationScope("lead.update_fields", ["corretor"]);
      if (!r.authorized || r.scope !== "own_assigned") throw new Error(JSON.stringify(r));
    },
  },
  {
    name: "decideOperationScope: unknown role denies create_manual",
    run: async () => {
      const r = decideOperationScope("lead.create_manual", ["secretaria"]);
      if (r.authorized) throw new Error("should be denied");
    },
  },
  {
    name: "impersonation flag is preserved in decision",
    run: async () => {
      const d = await authorizeLeadOperation(
        { supabase: dummySupabase, userId: "u1", impersonating: true },
        "lead.list",
        makeRepo(),
      );
      if (!d.impersonating) throw new Error("impersonation flag lost");
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
        const d = await authorizeLeadOperation({ supabase: dummySupabase, userId: "u1" }, op, makeRepo());
        if (d.operation !== op) throw new Error(`op mismatch: ${op}`);
      }
    },
  },
];

export async function runLeadAuthorizationSpecs(): Promise<{ passed: number; failed: number }> {
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
