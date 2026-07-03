// ActionExecutor — Fase 6 · Bloco 4 · Etapa 4.3.1 §4.2.
//
// Camada pura de execução. NÃO conhece tenant, NÃO acessa registry global.
// Resolve via snapshot (source of definitions isolada) e chama o handler.
import type { RegistrySnapshot } from "./snapshot";
import type { ActionContext, ActionHandler } from "./types";

export async function executeAction(
  handler: ActionHandler,
  ctx: ActionContext,
): Promise<void> {
  await handler(ctx);
}

export async function executeActionById(
  snapshot: RegistrySnapshot,
  actionId: string,
  ctx: ActionContext,
): Promise<void> {
  const def = snapshot.actionRegistry.getStrict(actionId);
  await def.handler(ctx);
}
