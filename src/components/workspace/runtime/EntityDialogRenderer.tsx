// EntityDialogRenderer — context-driven (Fase 6 · Etapa 4.3).
import { useTenantContext } from "@/components/workspace/tenant/TenantContext";
import type { DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const { snapshot } = useTenantContext();
  const Component = snapshot.resolveDialog(dialogId);
  return <Component {...props} />;
}
