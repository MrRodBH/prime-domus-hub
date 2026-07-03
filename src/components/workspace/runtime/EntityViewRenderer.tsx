// EntityViewRenderer — Fase 6 · Bloco 4 · Etapa 4.3.1 §5.
// Resolve via RegistryIndex (façade runtime), NUNCA via snapshot direto.
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const { registryIndex } = useTenantContext();
  const Component = registryIndex.view.resolve(viewId);
  return <Component {...props} />;
}
