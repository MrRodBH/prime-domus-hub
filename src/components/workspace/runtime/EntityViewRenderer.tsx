// EntityViewRenderer — Fase 6 · Bloco 4 · Etapa 4.3.4.
// Único caminho autorizado: resolutionGraph.view.resolve(id).
import { useResolutionGraph } from "@/components/workspace/tenant/TenantContext";
import type { ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const Component = useResolutionGraph().view.resolve(viewId);
  return <Component {...props} />;
}
