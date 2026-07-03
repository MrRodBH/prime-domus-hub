// EntityDialogRenderer — Fase 6 · Bloco 4 · Etapa 4.3.2.
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const { resolver } = useTenantContext();
  const Component = resolver.resolve("dialog", dialogId);
  return <Component {...props} />;
}
