// EntityActionRunner — Fase 6 · Bloco 4 · Etapa 4.3.
//
// Despachante genérico context-driven: resolve+executa uma ação DENTRO do
// snapshot do tenant. Nenhum acesso global — `snapshot` vem sempre do
// `TenantContext` do call site.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { ActionContext } from "@/components/workspace/registry";

export async function runEntityAction(
  snapshot: RegistrySnapshot,
  actionId: string,
  ctx: ActionContext,
): Promise<void> {
  await executeActionById(snapshot, actionId, ctx);
}
