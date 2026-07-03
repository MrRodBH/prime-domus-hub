// PluginContext — Fase 6 · Bloco 4 · Etapa 4.3.4 §4.5.
//
// PATCH 4.3.4 (HARD LOCKDOWN): plugin recebe SOMENTE leitura do grafo
// imutável de resolução e um executor de action. Não pode:
//   • registrar resolvers
//   • alterar o grafo
//   • acessar o registry base
//   • criar novos "kinds"
import type { ActionContext } from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { TenantContextValue } from "@/components/workspace/tenant/TenantContext";
import type { ResolutionGraph } from "@/components/workspace/resolution/ResolutionGraph";

export type PluginContext = Readonly<{
  tenantId: string;
  resolutionGraph: ResolutionGraph;
  executeAction: (id: string, ctx: ActionContext) => Promise<void>;
  featureFlags: Readonly<Record<string, boolean>>;
  apiVersion: "4.3.4";
}>;

export function createPluginContext(tenant: TenantContextValue): PluginContext {
  return Object.freeze({
    tenantId: tenant.tenantId,
    resolutionGraph: tenant.resolutionGraph,
    executeAction: (id: string, ctx: ActionContext) =>
      executeActionById(tenant.snapshot, id, ctx),
    featureFlags: tenant.featureFlags,
    apiVersion: "4.3.4",
  });
}
