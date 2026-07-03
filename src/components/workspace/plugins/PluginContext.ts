// PluginContext — Fase 6 · Bloco 4 · Etapa 4.3.1 §6.
//
// PATCH 4.3.1: sandbox atualizado — plugin acessa `registryIndex`, nunca
// registries diretos. Snapshot exposto apenas como referência estrutural
// (não deve ser usado para resolução).
import type { RegistryIndex } from "@/components/workspace/registry/RegistryIndex";
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type { ActionContext } from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { TenantContextValue } from "@/components/workspace/tenant/TenantContext";

export type PluginContext = Readonly<{
  tenantId: string;
  registryIndex: RegistryIndex;
  snapshot: RegistrySnapshot;
  executeAction: (id: string, ctx: ActionContext) => Promise<void>;
  featureFlags: Readonly<Record<string, boolean>>;
  apiVersion: "4.3.1";
}>;

export function createPluginContext(tenant: TenantContextValue): PluginContext {
  return Object.freeze({
    tenantId: tenant.tenantId,
    registryIndex: tenant.registryIndex,
    snapshot: tenant.snapshot,
    executeAction: (id, ctx) => executeActionById(tenant.snapshot, id, ctx),
    featureFlags: tenant.featureFlags,
    apiVersion: "4.3.1",
  });
}
