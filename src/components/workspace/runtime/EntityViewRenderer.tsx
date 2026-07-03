// EntityViewRenderer — Fase 6 · Bloco 4 · Etapa 4.3 §11.
//
// Renderer 100% context-driven: resolve a view no snapshot do tenant atual.
// Nenhum acesso a registry global (§5.3).
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const { snapshot } = useTenantContext();
  const Component = snapshot.resolveView(viewId);
  return <Component {...props} />;
}
