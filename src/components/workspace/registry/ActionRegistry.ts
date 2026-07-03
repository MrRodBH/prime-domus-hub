// ActionRegistry — execução O(1) de ações declarativas por ID (hardening 4.2).
//
// Runtime-only resolution: o núcleo apenas roteia; o handler concreto
// (default = delegar a adapter.runAction) fica fora do core.
import { RegistryResolutionError } from "./errors";
import { isFrozen, RegistryFrozenError } from "./freeze";
import type { ActionContext, ActionHandler } from "./types";

const registry = new Map<string, ActionHandler>();

export const ActionRegistry = {
  register(actionId: string, handler: ActionHandler): void {
    if (isFrozen()) throw new RegistryFrozenError("ActionRegistry", actionId);
    registry.set(actionId, handler);
  },
  async execute(actionId: string, ctx: ActionContext): Promise<void> {
    const h = registry.get(actionId);
    if (!h) throw new RegistryResolutionError("ActionRegistry", actionId);
    await h(ctx);
  },
  getStrict(actionId: string): ActionHandler {
    const h = registry.get(actionId);
    if (!h) throw new RegistryResolutionError("ActionRegistry", actionId);
    return h;
  },
  exists(actionId: string): boolean {
    return registry.has(actionId);
  },
  has(actionId: string): boolean {
    return registry.has(actionId);
  },
  list(): string[] {
    return Array.from(registry.keys());
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
};

export function registerAction(actionId: string, handler: ActionHandler): void {
  ActionRegistry.register(actionId, handler);
}
