// EntityDialogRenderer — hospeda dialogs resolvidos por ID (Etapa 4.1.b §5.3).
//
// NÃO conhece action semantics — apenas resolve e injeta contexto.
import { DialogRegistry, type DialogRuntimeProps } from "@/components/workspace/registry";

export function EntityDialogRenderer({
  dialogId,
  ...props
}: { dialogId: string } & DialogRuntimeProps) {
  const Component = DialogRegistry.resolve(dialogId);
  return <Component {...props} />;
}
