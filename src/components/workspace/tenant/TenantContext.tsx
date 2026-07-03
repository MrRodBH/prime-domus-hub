// TenantContext — Fase 6 · Bloco 4 · Etapa 4.3.4 §4.3.
//
// PATCH 4.3.4 (RESOLUTION GRAPH LOCKDOWN): o context expõe um
// `ResolutionGraph` IMUTÁVEL construído uma única vez por tenant. Não há
// mais `ResolverRegistry`, `getResolver`, nem qualquer superfície mutável
// de resolução. Renderers e plugins consomem `resolutionGraph.<kind>`.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  createRegistrySnapshot,
  type RegistrySnapshot,
} from "@/components/workspace/registry/snapshot";
import {
  createResolutionGraph,
  type ResolutionGraph,
  type ViewResolver,
  type PanelResolver,
  type DialogResolver,
  type ActionResolver,
} from "@/components/workspace/resolution/ResolutionGraph";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import { getDefaultSnapshotSource } from "@/components/workspace/bootstrap";
import type { ActionContext } from "@/components/workspace/registry/types";

export type TenantContextValue = Readonly<{
  tenantId: string;
  snapshot: RegistrySnapshot;
  resolutionGraph: ResolutionGraph;
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
    const resolutionGraph = createResolutionGraph(snapshot);
    return Object.freeze({
      tenantId: tid,
      snapshot,
      resolutionGraph,
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
        "Fase 6 · Bloco 4 · Etapa 4.3.4: runtime é context-driven.",
    );
  }
  return v;
}

/** Acesso ao grafo imutável — único caminho autorizado de resolução runtime. */
export function useResolutionGraph(): ResolutionGraph {
  return useTenantContext().resolutionGraph;
}

// Atalhos por nó do grafo (leitura pura — sem string dispatch, sem mutação).
export function useViewResolver(): ViewResolver {
  return useResolutionGraph().view;
}
export function usePanelResolver(): PanelResolver {
  return useResolutionGraph().panel;
}
export function useDialogResolver(): DialogResolver {
  return useResolutionGraph().dialog;
}
export function useActionResolver(): ActionResolver {
  return useResolutionGraph().action;
}
