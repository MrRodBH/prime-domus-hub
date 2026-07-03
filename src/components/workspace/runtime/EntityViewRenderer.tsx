// EntityViewRenderer — Fase 6 · Bloco 4 · Etapa 4.3.3.
// Consome o ViewResolver especializado (sem string dispatch).
import { useViewResolver } from "@/components/workspace/tenant/TenantContext";
import type { ViewProps } from "@/components/workspace/registry";

export function EntityViewRenderer({
  viewId,
  ...props
}: { viewId: string } & ViewProps) {
  const resolver = useViewResolver();
  const Component = resolver.resolve(viewId);
  return <Component {...props} />;
}
