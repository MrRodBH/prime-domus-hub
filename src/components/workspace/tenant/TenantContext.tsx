// TenantContext — Fase 6 · Bloco 4 · Etapa 4.3 §5.
//
// Camada de isolamento por tenant. Toda função de runtime que precisar
// resolver componentes/ações DEVE consumir esta camada. Import direto de
// registry global (§5.3) é proibido a partir desta etapa.
//
// Contrato:
//   • cada tenant recebe seu próprio `RegistrySnapshot` (§4.3)
//   • runtime é 100% context-driven (§14)
//   • fail-fast se algum consumer ler `useTenantContext` fora do provider
import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import { getDefaultSnapshotSource } from "@/components/workspace/bootstrap";
import { createRegistrySnapshot } from "@/components/workspace/registry/snapshot";

export type TenantContextValue = Readonly<{
  tenantId: string;
  snapshot: RegistrySnapshot;
  /** Reservado para 4.4 — flags por tenant. */
  featureFlags: Readonly<Record<string, boolean>>;
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
  // Um snapshot novo por tenantId — nenhum Map é compartilhado entre
  // tenants (§4.3 + §12.3). `null` tenantId (usuário anônimo/SSR) recebe
  // snapshot próprio marcado como "anonymous" para não poluir isolamento.
  const value = useMemo<TenantContextValue>(() => {
    const tid = tenantId ?? "__anonymous__";
    const snapshot = createRegistrySnapshot(tid, getDefaultSnapshotSource());
    return Object.freeze({
      tenantId: tid,
      snapshot,
      featureFlags: Object.freeze({ ...(featureFlags ?? {}) }),
    });
  }, [tenantId, featureFlags]);

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenantContext(): TenantContextValue {
  const v = useContext(TenantCtx);
  if (!v) {
    throw new Error(
      "[TenantContext] useTenantContext() chamado fora de <TenantContextProvider>. " +
        "Fase 6 · Bloco 4 · Etapa 4.3 §5.2: runtime é 100% context-driven — " +
        "nenhum acesso a registry sem tenant context.",
    );
  }
  return v;
}

/** Helper explícito §5.4 — resolve componente/ação dentro do tenant. */
export function resolveWithinTenant<T>(
  ctx: TenantContextValue,
  kind: "view" | "panel" | "dialog" | "action",
  id: string,
): T {
  switch (kind) {
    case "view":
      return ctx.snapshot.resolveView(id) as unknown as T;
    case "panel":
      return ctx.snapshot.resolvePanel(id) as unknown as T;
    case "dialog":
      return ctx.snapshot.resolveDialog(id) as unknown as T;
    case "action":
      return ctx.snapshot.resolveAction(id) as unknown as T;
  }
}
