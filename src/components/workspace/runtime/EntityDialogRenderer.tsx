// EntityDialogRenderer — Fase 6 · Bloco 4 · Etapa 4.3.3.
import { useDialogResolver } from "@/components/workspace/tenant/TenantContext";
import type { DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const resolver = useDialogResolver();
  const Component = resolver.resolve(dialogId);
  return <Component {...props} />;
}
