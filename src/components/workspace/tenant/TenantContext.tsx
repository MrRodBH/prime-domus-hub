// TenantContext — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.4.
//
// PATCH 4.3.3: eliminado o resolver central único. O context expõe:
//   • `snapshot`         → container passivo por tenant
//   • `resolverRegistry` → ResolverRegistry com resolvers built-in por capability
//   • `executeAction`    → conveniência sobre o ActionExecutor
//
// Renderers e plugins consomem resolvers ESPECIALIZADOS via este registry.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  createRegistrySnapshot,
  type RegistrySnapshot,
} from "@/components/workspace/registry/snapshot";
import {
  ResolverRegistry,
} from "@/components/workspace/resolution/ResolverRegistry";
import { createResolverRegistryForSnapshot } from "@/components/workspace/resolution/UnifiedResolutionLayer";
import type { ViewResolver } from "@/components/workspace/resolution/resolvers/ViewResolver";
import type { PanelResolver } from "@/components/workspace/resolution/resolvers/PanelResolver";
import type { DialogResolver } from "@/components/workspace/resolution/resolvers/DialogResolver";
import type { ActionResolver } from "@/components/workspace/resolution/resolvers/ActionResolver";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import { getDefaultSnapshotSource } from "@/components/workspace/bootstrap";
import type { ActionContext } from "@/components/workspace/registry/types";

export type TenantContextValue = Readonly<{
  tenantId: string;
  snapshot: RegistrySnapshot;
  resolverRegistry: ResolverRegistry;
  featureFlags: Readonly<Record<string, boolean>>;
  executeAction: (id: string, ctx: ActionContext) => Promise<void>;
}>;

const TenantCtx = createContext<TenantContextValue | null>(null);

export function TenantContextProvider({
  tenantId,
  featureFlags,
  children,
}: {
  tenantId: string | null;
  featureFlags?: Record<string, boolean>;
  children: ReactNode;
}) {
  const value = useMemo<TenantContextValue>(() => {
    const tid = tenantId ?? "__anonymous__";
    const snapshot = createRegistrySnapshot(tid, getDefaultSnapshotSource());
    const resolverRegistry = createResolverRegistryForSnapshot(snapshot);
    return Object.freeze({
      tenantId: tid,
      snapshot,
      resolverRegistry,
      featureFlags: Object.freeze({ ...(featureFlags ?? {}) }),
      executeAction: (id: string, ctx: ActionContext) =>
        executeActionById(snapshot, id, ctx),
    });
  }, [tenantId, featureFlags]);

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenantContext(): TenantContextValue {
  const v = useContext(TenantCtx);
  if (!v) {
    throw new Error(
      "[TenantContext] useTenantContext() chamado fora de <TenantContextProvider>. " +
        "Fase 6 · Bloco 4 · Etapa 4.3.3: runtime é context-driven.",
    );
  }
  return v;
}

// Helpers tipados — atalhos sobre resolvers especializados (sem dispatch por string).
export function useViewResolver(): ViewResolver {
  return useTenantContext().resolverRegistry.getResolver<unknown>("view") as unknown as ViewResolver;
}
export function usePanelResolver(): PanelResolver {
  return useTenantContext().resolverRegistry.getResolver<unknown>("panel") as unknown as PanelResolver;
}
export function useDialogResolver(): DialogResolver {
  return useTenantContext().resolverRegistry.getResolver<unknown>("dialog") as unknown as DialogResolver;
}
export function useActionResolver(): ActionResolver {
  return useTenantContext().resolverRegistry.getResolver<unknown>("action") as unknown as ActionResolver;
}
