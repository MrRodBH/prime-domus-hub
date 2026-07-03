// EntityViewRenderer — renderer genérico de visualização (Etapa 4.1.b §5.1).
//
// REGRA: não interpreta descriptor. Recebe viewId + props neutros e resolve
// via ViewRegistry. Fail-fast se o ID não estiver registrado.
import { ViewRegistry, type ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const Component = ViewRegistry.resolve(viewId);
  return <Component {...props} />;
}
