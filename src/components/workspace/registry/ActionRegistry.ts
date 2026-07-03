// ActionRegistry — RESOLVE-ONLY (Fase 6 · Bloco 4 · Etapa 4.3 §8).
//
// Mudança de contrato vs. 4.2: o registry NÃO executa mais. Execução vai
// para `ActionExecutor`. Isso desacopla resolução de execução e habilita
// o snapshot model (§4).
import { RegistryResolutionError } from "./errors";
import { isFrozen, RegistryFrozenError } from "./freeze";
import type { ActionHandler } from "./types";

const registry = new Map<string, ActionHandler>();

export const ActionRegistry = {
  register(actionId: string, handler: ActionHandler): void {
    if (isFrozen()) throw new RegistryFrozenError("ActionRegistry", actionId);
    registry.set(actionId, handler);
  },
  /** Resolve o handler — NÃO executa (§8.2). */
  resolve(actionId: string): ActionHandler {
    const h = registry.get(actionId);
    if (!h) throw new RegistryResolutionError("ActionRegistry", actionId);
    return h;
  },
  getStrict(actionId: string): ActionHandler {
    return this.resolve(actionId);
  },
  get(actionId: string): ActionHandler | undefined {
    return registry.get(actionId);
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
  /** Builder-only — consumido pelo snapshot; nunca leia em runtime. */
  __entries(): ReadonlyMap<string, ActionHandler> {
    return registry;
  },
};

export function registerAction(actionId: string, handler: ActionHandler): void {
  ActionRegistry.register(actionId, handler);
}
