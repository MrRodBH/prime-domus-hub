// EntityPanelRenderer — Fase 6 · Bloco 4 · Etapa 4.3.2.
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const { resolver } = useTenantContext();
  const Component = resolver.resolve("panel", props.panelId);
  return <Component {...props} />;
}
