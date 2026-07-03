// TenantContext — Fase 6 · Bloco 4 · Etapa 4.3.2.
//
// PATCH 4.3.2: RegistryIndex eliminado. O context expõe apenas:
//   • `snapshot`      → container passivo (registries isolados por tenant)
//   • `resolver`      → UnifiedResolutionLayer (única fonte de resolução)
//   • `executeAction` → atalho puro sobre o snapshot
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  createRegistrySnapshot,
  type RegistrySnapshot,
} from "@/components/workspace/registry/snapshot";
import {
  UnifiedResolutionLayer,
  createUnifiedResolutionLayer,
} from "@/components/workspace/resolution/UnifiedResolutionLayer";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import { getDefaultSnapshotSource } from "@/components/workspace/bootstrap";
import type { ActionContext } from "@/components/workspace/registry/types";

export type TenantContextValue = Readonly<{
  tenantId: string;
  snapshot: RegistrySnapshot;
  resolver: UnifiedResolutionLayer;
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
    const resolver = createUnifiedResolutionLayer(snapshot);
    return Object.freeze({
      tenantId: tid,
      snapshot,
      resolver,
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
        "Fase 6 · Bloco 4 · Etapa 4.3.2: runtime é 100% context-driven.",
    );
  }
  return v;
}

/** Helper — atalho tipado sobre o resolver do tenant. */
export function resolveWithinTenant<T>(
  ctx: TenantContextValue,
  kind: "view" | "panel" | "dialog" | "action",
  id: string,
): T {
  return ctx.resolver.resolve(kind, id) as unknown as T;
}
