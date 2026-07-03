// EntityPanelRenderer — hospeda painéis opacos (Etapa 4.1.b §5.2).
import { PanelRegistry, type PanelProps } from "@/components/workspace/registry";

export function EntityPanelRenderer(props: PanelProps) {
  const Component = PanelRegistry.resolve(props.panelId);
  return <Component {...props} />;
}
