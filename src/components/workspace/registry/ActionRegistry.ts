// ActionRegistry — execução de ações declarativas por ID (§3.1.D).
//
// Runtime-only resolution: o núcleo apenas roteia; o handler concreto
// (default = delegar a adapter.runAction) fica fora do core.
import { RegistryResolutionError } from "./errors";
import type { ActionContext, ActionHandler } from "./types";

const registry = new Map<string, ActionHandler>();

export const ActionRegistry = {
  register(actionId: string, handler: ActionHandler): void {
    registry.set(actionId, handler);
  },
  async execute(actionId: string, ctx: ActionContext): Promise<void> {
    const h = registry.get(actionId);
    if (!h) throw new RegistryResolutionError("ActionRegistry", actionId);
    await h(ctx);
  },
  has(actionId: string): boolean {
    return registry.has(actionId);
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
};

export function registerAction(actionId: string, handler: ActionHandler): void {
  ActionRegistry.register(actionId, handler);
}
