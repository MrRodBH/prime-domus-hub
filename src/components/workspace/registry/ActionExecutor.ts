// ActionExecutor — Fase 6 · Bloco 4 · Etapa 4.3 §8.
//
// Separação obrigatória: o registry APENAS resolve; a execução é
// responsabilidade desta camada. Isso remove o acoplamento resolve↔execute
// que existia em `ActionRegistry.execute()` na 4.2.
//
// Regra (§8.2): "Registry nunca executa. Apenas resolve."
import type { RegistrySnapshot } from "./snapshot";
import type { ActionContext, ActionHandler } from "./types";

/** Executa um handler já resolvido — forma pura, sem tocar registry. */
export async function executeAction(
  handler: ActionHandler,
  ctx: ActionContext,
): Promise<void> {
  await handler(ctx);
}

/**
 * Resolve + executa dentro de um snapshot explícito. Nenhum acesso global —
 * tudo passa por `snapshot`, atendendo §3 (proibição de singleton) e §11
 * (fluxo runtime obrigatório).
 */
export async function executeActionById(
  snapshot: RegistrySnapshot,
  actionId: string,
  ctx: ActionContext,
): Promise<void> {
  const handler = snapshot.resolveAction(actionId);
  await handler(ctx);
}
