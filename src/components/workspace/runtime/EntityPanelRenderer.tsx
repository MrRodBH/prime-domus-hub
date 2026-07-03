// EntityPanelRenderer — Fase 6 · Bloco 4 · Etapa 4.3.3.
import { usePanelResolver } from "@/components/workspace/tenant/TenantContext";
import type { PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const resolver = usePanelResolver();
  const Component = resolver.resolve(props.panelId);
  return <Component {...props} />;
}
