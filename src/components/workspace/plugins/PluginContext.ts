// PluginContext — Fase 6 · Bloco 4 · Etapa 4.3.2 §4.5.
//
// PATCH 4.3.2: plugin recebe APENAS o Unified resolver + executor + flags.
// Nunca recebe snapshot, nunca recebe registries, nunca recebe index.
import type {
  UnifiedResolutionLayer,
  ResolutionKind,
  ResolutionResult,
} from "@/components/workspace/resolution/UnifiedResolutionLayer";
import type { ActionContext } from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { TenantContextValue } from "@/components/workspace/tenant/TenantContext";

export type PluginContext = Readonly<{
  tenantId: string;
  resolve: <K extends ResolutionKind>(kind: K, id: string) => ResolutionResult<K>;
  executeAction: (id: string, ctx: ActionContext) => Promise<void>;
  featureFlags: Readonly<Record<string, boolean>>;
  apiVersion: "4.3.2";
}>;

export function createPluginContext(tenant: TenantContextValue): PluginContext {
  const resolver: UnifiedResolutionLayer = tenant.resolver;
  return Object.freeze({
    tenantId: tenant.tenantId,
    resolve: <K extends ResolutionKind>(kind: K, id: string) =>
      resolver.resolve(kind, id),
    executeAction: (id, ctx) => executeActionById(tenant.snapshot, id, ctx),
    featureFlags: tenant.featureFlags,
    apiVersion: "4.3.2",
  });
}
