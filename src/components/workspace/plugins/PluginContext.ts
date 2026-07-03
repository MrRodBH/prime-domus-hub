// PluginContext — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.6.
//
// PATCH 4.3.3 (CRÍTICO): plugin NÃO recebe mais `resolve(kind, id)` genérico.
// Recebe métodos ESPECIALIZADOS por capability. Adicionar um novo kind
// exige adicionar um método explícito aqui — não expandir uma string dispatch.
import type { ViewComponent, PanelComponent, DialogComponent } from "@/components/workspace/registry/types";
import type { ActionDefinition } from "@/components/workspace/registry/ActionRegistry";
import type { ActionContext } from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { TenantContextValue } from "@/components/workspace/tenant/TenantContext";
import type { ViewResolver } from "@/components/workspace/resolution/resolvers/ViewResolver";
import type { PanelResolver } from "@/components/workspace/resolution/resolvers/PanelResolver";
import type { DialogResolver } from "@/components/workspace/resolution/resolvers/DialogResolver";
import type { ActionResolver } from "@/components/workspace/resolution/resolvers/ActionResolver";

export type PluginContext = Readonly<{
  tenantId: string;
  resolveView: (id: string) => ViewComponent;
  resolvePanel: (id: string) => PanelComponent;
  resolveDialog: (id: string) => DialogComponent;
  resolveAction: (id: string) => ActionDefinition;
  executeAction: (id: string, ctx: ActionContext) => Promise<void>;
  featureFlags: Readonly<Record<string, boolean>>;
  apiVersion: "4.3.3";
}>;

export function createPluginContext(tenant: TenantContextValue): PluginContext {
  const reg = tenant.resolverRegistry;
  const viewR = reg.getResolver("view") as unknown as ViewResolver;
  const panelR = reg.getResolver("panel") as unknown as PanelResolver;
  const dialogR = reg.getResolver("dialog") as unknown as DialogResolver;
  const actionR = reg.getResolver("action") as unknown as ActionResolver;

  return Object.freeze({
    tenantId: tenant.tenantId,
    resolveView: (id: string) => viewR.resolve(id),
    resolvePanel: (id: string) => panelR.resolve(id),
    resolveDialog: (id: string) => dialogR.resolve(id),
    resolveAction: (id: string) => actionR.resolve(id),
    executeAction: (id: string, ctx: ActionContext) =>
      executeActionById(tenant.snapshot, id, ctx),
    featureFlags: tenant.featureFlags,
    apiVersion: "4.3.3",
  });
}
