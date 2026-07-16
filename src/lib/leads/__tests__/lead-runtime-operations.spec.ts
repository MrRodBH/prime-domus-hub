// LSH-01 · Lote B — Runtime operations tests.
// Executam as MESMAS funções operacionais consumidas pelo runtime real,
// com dependências injetáveis (auth repo + gateway).

import {
  type LeadAuthorizationContext,
  type LeadAuthorizationRepository,
  type LeadAppRole,
  type LeadTenantContext,
  type TypedSupabase,
} from "@/lib/leads/lead-authorization.server";
import {
  type LeadOperationsDeps,
  type LeadOperationsGateway,
  createManualLeadAuthorized,
  listLeadAssigneesAuthorized,
  listLeadPropertiesAuthorized,
  listLeadsAuthorized,
  updateLeadFieldsAuthorized,
} from "@/lib/leads/lead-operations.server";

const TENANT = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";

function memberTenant(): LeadTenantContext {
  return { tenantId: TENANT, origin: "membership", isSuperAdmin: false };
}
function impersonationTenant(): LeadTenantContext {
  return { tenantId: TENANT, origin: "impersonation", isSuperAdmin: true };
}

function makeRepo(
  roles: ReadonlyArray<LeadAppRole>,
): LeadAuthorizationRepository {
  return {
    listActiveMemberships: async () => [
      { id: "m", membership_status: "active" },
    ],
    listAppRoles: async () => roles,
  };
}

interface GatewayCalls {
  listLeadsTenantWide: Array<{ tenantId: string }>;
  listLeadsOwnAssigned: Array<{ tenantId: string; actor: string }>;
  listCorretores: Array<{ tenantId: string }>;
  listImoveisLite: Array<{ tenantId: string }>;
  updateTenantWide: Array<{ tenantId: string; id: string }>;
  updateOwnAssigned: Array<{ tenantId: string; actor: string; id: string }>;
  createManualLead: number;
}

function makeGateway(
  overrides: Partial<LeadOperationsGateway> = {},
): { gateway: LeadOperationsGateway; calls: GatewayCalls } {
  const calls: GatewayCalls = {
    listLeadsTenantWide: [],
    listLeadsOwnAssigned: [],
    listCorretores: [],
    listImoveisLite: [],
    updateTenantWide: [],
    updateOwnAssigned: [],
    createManualLead: 0,
  };
  const gateway: LeadOperationsGateway = {
    async listLeadsTenantWide(tenantId) {
      calls.listLeadsTenantWide.push({ tenantId });
      return [];
    },
    async listLeadsOwnAssigned(tenantId, actor) {
      calls.listLeadsOwnAssigned.push({ tenantId, actor });
      return [];
    },
    async listCorretores(tenantId) {
      calls.listCorretores.push({ tenantId });
      return [];
    },
    async listImoveisLite(tenantId) {
      calls.listImoveisLite.push({ tenantId });
      return [];
    },
    async updateLeadTenantWide(tenantId, input) {
      calls.updateTenantWide.push({ tenantId, id: input.id });
      return { id: input.id };
    },
    async updateLeadOwnAssigned(tenantId, actor, input) {
      calls.updateOwnAssigned.push({ tenantId, actor, id: input.id });
      return { id: input.id };
    },
    async createManualLead() {
      calls.createManualLead += 1;
      return {};
    },
    ...overrides,
  };
  return { gateway, calls };
}

function commonDeps(
  roles: ReadonlyArray<LeadAppRole>,
  gateway: LeadOperationsGateway,
): LeadOperationsDeps {
  const authCtx: LeadAuthorizationContext = {
    supabase: {} as TypedSupabase,
    userId: USER,
    tenant: memberTenant(),
  };
  return { authCtx, authRepo: makeRepo(roles), gateway };
}

function superAdminDeps(
  gateway: LeadOperationsGateway,
  tenant: LeadTenantContext,
): LeadOperationsDeps {
  const authCtx: LeadAuthorizationContext = {
    supabase: {} as TypedSupabase,
    userId: USER,
    tenant,
  };
  // Repo throws if consulted — Super Admin path must not touch it.
  const authRepo: LeadAuthorizationRepository = {
    listActiveMemberships: async () => {
      throw new Error("membership repo must not be consulted");
    },
    listAppRoles: async () => {
      throw new Error("role repo must not be consulted");
    },
  };
  return { authCtx, authRepo, gateway };
}

function must(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

type Case = { name: string; run: () => Promise<void> };

const cases: Case[] = [
  {
    name: "listLeadsAuthorized · admin (membership) → tenant_wide filter",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await listLeadsAuthorized(commonDeps(["admin"], gateway));
      must(calls.listLeadsTenantWide.length === 1, "tenant_wide not called");
      must(calls.listLeadsOwnAssigned.length === 0, "own_assigned leaked");
      must(
        calls.listLeadsTenantWide[0].tenantId === TENANT,
        "tenant filter missing",
      );
    },
  },
  {
    name: "listLeadsAuthorized · corretor → own_assigned filter (tenant + actor)",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await listLeadsAuthorized(commonDeps(["corretor"], gateway));
      must(calls.listLeadsOwnAssigned.length === 1, "own_assigned not called");
      must(calls.listLeadsTenantWide.length === 0, "tenant_wide leaked");
      must(
        calls.listLeadsOwnAssigned[0].tenantId === TENANT &&
          calls.listLeadsOwnAssigned[0].actor === USER,
        "filters missing",
      );
    },
  },
  {
    name: "listLeadsAuthorized · Super Admin impersonating → tenant_wide, own_assigned not called",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await listLeadsAuthorized(superAdminDeps(gateway, impersonationTenant()));
      must(calls.listLeadsTenantWide.length === 1, "tenant_wide not called");
      must(calls.listLeadsOwnAssigned.length === 0, "own_assigned called");
    },
  },
  {
    name: "listLeadsAuthorized · Super Admin without impersonation → denied (gateway untouched)",
    run: async () => {
      const { gateway, calls } = makeGateway();
      let rejected = false;
      try {
        await listLeadsAuthorized(
          superAdminDeps(gateway, {
            tenantId: TENANT,
            origin: "membership",
            isSuperAdmin: true,
          }),
        );
      } catch {
        rejected = true;
      }
      must(rejected, "super admin without impersonation must be denied");
      must(
        calls.listLeadsTenantWide.length === 0 &&
          calls.listLeadsOwnAssigned.length === 0,
        "gateway must not be called",
      );
    },
  },
  {
    name: "listLeadAssigneesAuthorized · admin → listCorretores(tenant)",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await listLeadAssigneesAuthorized(commonDeps(["admin"], gateway));
      must(
        calls.listCorretores.length === 1 &&
          calls.listCorretores[0].tenantId === TENANT,
        "assignee call missing",
      );
    },
  },
  {
    name: "listLeadAssigneesAuthorized · corretor denied",
    run: async () => {
      const { gateway } = makeGateway();
      let rejected = false;
      try {
        await listLeadAssigneesAuthorized(commonDeps(["corretor"], gateway));
      } catch {
        rejected = true;
      }
      must(rejected, "corretor should be denied on list_assignees");
    },
  },
  {
    name: "listLeadPropertiesAuthorized · admin → tenant filter",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await listLeadPropertiesAuthorized(commonDeps(["admin"], gateway));
      must(
        calls.listImoveisLite.length === 1 &&
          calls.listImoveisLite[0].tenantId === TENANT,
        "properties tenant filter missing",
      );
    },
  },
  {
    name: "updateLeadFieldsAuthorized · admin → tenant_wide path",
    run: async () => {
      const { gateway, calls } = makeGateway();
      const r = await updateLeadFieldsAuthorized(
        commonDeps(["admin"], gateway),
        { id: "lead-1", observacoes: "x" },
      );
      must(r.ok && r.id === "lead-1", "return shape");
      must(calls.updateTenantWide.length === 1, "tenant_wide not called");
      must(calls.updateOwnAssigned.length === 0, "own_assigned leaked");
    },
  },
  {
    name: "updateLeadFieldsAuthorized · corretor → own_assigned path",
    run: async () => {
      const { gateway, calls } = makeGateway();
      await updateLeadFieldsAuthorized(commonDeps(["corretor"], gateway), {
        id: "lead-2",
      });
      must(calls.updateOwnAssigned.length === 1, "own_assigned not called");
      must(
        calls.updateOwnAssigned[0].actor === USER &&
          calls.updateOwnAssigned[0].tenantId === TENANT,
        "filters missing",
      );
    },
  },
  {
    name: "updateLeadFieldsAuthorized · zero rows updated → throws",
    run: async () => {
      const { gateway } = makeGateway({
        updateLeadTenantWide: async () => null,
      });
      let threw = false;
      try {
        await updateLeadFieldsAuthorized(commonDeps(["admin"], gateway), {
          id: "lead-x",
        });
      } catch {
        threw = true;
      }
      must(threw, "zero rows must throw");
    },
  },
  {
    name: "createManualLeadAuthorized · Super Admin without impersonation → RPC not called",
    run: async () => {
      let rpcCalled = false;
      const gateway = makeGateway().gateway;
      gateway.createManualLead = async () => {
        rpcCalled = true;
        return {};
      };
      try {
        await createManualLeadAuthorized(
          superAdminDeps(gateway, {
            tenantId: TENANT,
            origin: "membership",
            isSuperAdmin: true,
          }),
          { nome: "N" },
          () => {
            throw new Error("should not parse");
          },
        );
      } catch {
        /* expected */
      }
      must(!rpcCalled, "RPC must not be called for super admin without impersonation");
    },
  },
  {
    name: "createManualLeadAuthorized · Super Admin impersonating → RPC called",
    run: async () => {
      const valid = {
        id: "lead-sa",
        tenantId: TENANT,
        status: "novo" as const,
        version: 1,
        assignedTo: null,
        corretorId: null,
        imovelId: null,
        createdAt: new Date().toISOString(),
      };
      const { gateway } = makeGateway({
        createManualLead: async () => valid,
      });
      const r = await createManualLeadAuthorized(
        superAdminDeps(gateway, impersonationTenant()),
        { nome: "N" },
        (raw) => raw as typeof valid,
      );
      must(r.id === "lead-sa", "parsed result");
    },
  },
  {
    name: "createManualLeadAuthorized · secretaria denied → RPC not called",
    run: async () => {
      let rpcCalled = false;
      const gateway = makeGateway().gateway;
      gateway.createManualLead = async () => {
        rpcCalled = true;
        return {};
      };
      try {
        await createManualLeadAuthorized(
          commonDeps(["secretaria"], gateway),
          { nome: "N" },
          () => {
            throw new Error("should not parse");
          },
        );
      } catch {
        /* expected */
      }
      must(!rpcCalled, "RPC must not be called when authorization fails");
    },
  },
  {
    name: "createManualLeadAuthorized · rejects invalid RPC return",
    run: async () => {
      const { gateway } = makeGateway({
        createManualLead: async () => ({ bogus: true }),
      });
      let threw = false;
      try {
        await createManualLeadAuthorized(
          commonDeps(["admin"], gateway),
          { nome: "N" },
          () => {
            throw new Error("invalid rpc row");
          },
        );
      } catch {
        threw = true;
      }
      must(threw, "invalid RPC return must be rejected");
    },
  },
  {
    name: "createManualLeadAuthorized · accepts valid RPC return",
    run: async () => {
      const valid = {
        id: "lead",
        tenantId: TENANT,
        status: "novo" as const,
        version: 1,
        assignedTo: null,
        corretorId: null,
        imovelId: null,
        createdAt: new Date().toISOString(),
      };
      const { gateway } = makeGateway({
        createManualLead: async () => valid,
      });
      const r = await createManualLeadAuthorized(
        commonDeps(["admin"], gateway),
        { nome: "N" },
        (raw) => raw as typeof valid,
      );
      must(r.id === "lead" && r.status === "novo", "parsed result");
    },
  },
];

export async function runLeadRuntimeOperationsSpecs(): Promise<{
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
