// ActionResolver — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.2.
//
// Resolve `ActionDefinition` do snapshot. A EXECUÇÃO segue delegada ao
// `ActionExecutor` (mantendo a fronteira resolução × execução), acessível
// via método `execute` como conveniência tipada.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type { ActionDefinition } from "@/components/workspace/registry/ActionRegistry";
import type { ActionContext } from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { Resolver } from "../ResolverRegistry";

export class ActionResolver implements Resolver<"action", ActionDefinition> {
  readonly kind = "action" as const;
  constructor(private readonly snapshot: RegistrySnapshot) {
    Object.freeze(this);
  }
  resolve(id: string): ActionDefinition {
    return this.snapshot.actionRegistry.getStrict(id);
  }
  exists(id: string): boolean {
    return this.snapshot.actionRegistry.exists(id);
  }
  execute(id: string, ctx: ActionContext): Promise<void> {
    return executeActionById(this.snapshot, id, ctx);
  }
}

export function createActionResolver(snapshot: RegistrySnapshot): ActionResolver {
  return new ActionResolver(snapshot);
}
