// EntityDialogRenderer — Fase 6 · Bloco 4 · Etapa 4.3.1.
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const { registryIndex } = useTenantContext();
  const Component = registryIndex.dialog.resolve(dialogId);
  return <Component {...props} />;
}
