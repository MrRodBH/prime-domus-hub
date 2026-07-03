// EntityDialogRenderer — Fase 6 · Bloco 4 · Etapa 4.3.4.
import { useResolutionGraph } from "@/components/workspace/tenant/TenantContext";
import type { DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const Component = useResolutionGraph().dialog.resolve(dialogId);
  return <Component {...props} />;
}
