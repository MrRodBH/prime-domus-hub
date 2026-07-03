// EntityPanelRenderer — Fase 6 · Bloco 4 · Etapa 4.3.1.
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const { registryIndex } = useTenantContext();
  const Component = registryIndex.panel.resolve(props.panelId);
  return <Component {...props} />;
}
