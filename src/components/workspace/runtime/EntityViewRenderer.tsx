// EntityViewRenderer — Fase 6 · Bloco 4 · Etapa 4.3.2.
// Resolve via UnifiedResolutionLayer (única fonte de resolução runtime).
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const { resolver } = useTenantContext();
  const Component = resolver.resolve("view", viewId);
  return <Component {...props} />;
}
