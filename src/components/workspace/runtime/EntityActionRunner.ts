// EntityActionRunner — despachante genérico (Etapa 4.1.b §5.4).
//
// Recebe actionId + context e delega ao ActionRegistry. Nenhuma lógica de
// domínio: o handler concreto é registrado fora do core.
import { ActionRegistry, type ActionContext } from "@/components/workspace/registry";

export async function runEntityAction(
  actionId: string,
  ctx: ActionContext,
): Promise<void> {
  await ActionRegistry.execute(actionId, ctx);
}
