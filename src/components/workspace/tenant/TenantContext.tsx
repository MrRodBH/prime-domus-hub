// TenantContext — Fase 6 · Bloco 4 · Etapa 4.3.1 §2.2.
//
// PATCH 4.3.1: o context expõe DUAS camadas obrigatórias:
//   • `snapshot`      → container passivo (registries isolados por tenant)
//   • `registryIndex` → read-only façade runtime (RESTAURADA)
//
// Runtime NUNCA consulta o snapshot como resolver. Toda leitura passa por
// `registryIndex`. Toda execução passa por `ActionExecutor`.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  createRegistrySnapshot,
  type RegistrySnapshot,
} from "@/components/workspace/registry/snapshot";
import {
  RegistryIndex,
  createRegistryIndex,
} from "@/components/workspace/registry/RegistryIndex";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import { getDefaultSnapshotSource } from "@/components/workspace/bootstrap";
import type { ActionContext } from "@/components/workspace/registry/types";

export type TenantContextValue = Readonly<{
  tenantId: string;
  snapshot: RegistrySnapshot;
  registryIndex: RegistryIndex;
  featureFlags: Readonly<Record<string, boolean>>;
  /** Atalho conveniente — executor puro, opera sobre o snapshot do tenant. */
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
    const registryIndex = createRegistryIndex(snapshot);
    return Object.freeze({
      tenantId: tid,
      snapshot,
      registryIndex,
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
        "Fase 6 · Bloco 4 · Etapa 4.3.1: runtime é 100% context-driven.",
    );
  }
  return v;
}

/** Helper §5.4 — resolve via RegistryIndex (nunca via snapshot direto). */
export function resolveWithinTenant<T>(
  ctx: TenantContextValue,
  kind: "view" | "panel" | "dialog" | "action",
  id: string,
): T {
  switch (kind) {
    case "view":
      return ctx.registryIndex.view.resolve(id) as unknown as T;
    case "panel":
      return ctx.registryIndex.panel.resolve(id) as unknown as T;
    case "dialog":
      return ctx.registryIndex.dialog.resolve(id) as unknown as T;
    case "action":
      return ctx.registryIndex.action.resolve(id) as unknown as T;
  }
}
