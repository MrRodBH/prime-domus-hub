// ActionRegistry — Fase 6 · Bloco 4 · Etapa 4.3.1 §4.
//
// Papel: SOURCE OF DEFINITIONS de ações. Armazena `ActionDefinition` e
// expõe handlers. NÃO executa (execução vive em ActionExecutor).
import { RegistryResolutionError } from "./errors";
import { isFrozen as isGlobalFrozen, RegistryFrozenError } from "./freeze";
import type { ActionHandler } from "./types";

export type ActionDefinition = Readonly<{
  id: string;
  handler: ActionHandler;
}>;

export type ActionRegistryInstance = {
  register(id: string, handler: ActionHandler): void;
  resolve(id: string): ActionDefinition;
  getStrict(id: string): ActionDefinition;
  get(id: string): ActionDefinition | undefined;
  exists(id: string): boolean;
  has(id: string): boolean;
  list(): string[];
  listIds(): string[];
  __entries(): ReadonlyMap<string, ActionDefinition>;
  __seed(entries: ReadonlyMap<string, ActionDefinition>): void;
  __freeze(): void;
};

export function createActionRegistry(opts?: { useGlobalFreeze?: boolean }): ActionRegistryInstance {
  const store = new Map<string, ActionDefinition>();
  let localFrozen = false;
  const useGlobal = opts?.useGlobalFreeze ?? false;
  const guard = (id: string) => {
    if (localFrozen || (useGlobal && isGlobalFrozen()))
      throw new RegistryFrozenError("ActionRegistry", id);
  };
  const api: ActionRegistryInstance = {
    register(id, handler) {
      guard(id);
      store.set(id, Object.freeze({ id, handler }));
    },
    resolve(id) {
      const d = store.get(id);
      if (!d) throw new RegistryResolutionError("ActionRegistry", id);
      return d;
    },
    getStrict(id) { return api.resolve(id); },
    get(id) { return store.get(id); },
    exists(id) { return store.has(id); },
    has(id) { return store.has(id); },
    list() { return Array.from(store.keys()); },
    listIds() { return Array.from(store.keys()); },
    __entries() { return store; },
    __seed(entries) {
      if (localFrozen) throw new RegistryFrozenError("ActionRegistry", "__seed");
      for (const [k, v] of entries) store.set(k, v);
    },
    __freeze() { localFrozen = true; },
  };
  return api;
}

export const ActionRegistry = createActionRegistry({ useGlobalFreeze: true });

export function registerAction(id: string, handler: ActionHandler): void {
  ActionRegistry.register(id, handler);
}
