// EntityPanelRenderer — context-driven (Fase 6 · Etapa 4.3).
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const { snapshot } = useTenantContext();
  const Component = snapshot.resolvePanel(props.panelId);
  return <Component {...props} />;
}
