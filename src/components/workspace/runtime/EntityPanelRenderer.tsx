// EntityPanelRenderer — Fase 6 · Bloco 4 · Etapa 4.3.4.
import { useResolutionGraph } from "@/components/workspace/tenant/TenantContext";
import type { PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const Component = useResolutionGraph().panel.resolve(props.panelId);
  return <Component {...props} />;
}
