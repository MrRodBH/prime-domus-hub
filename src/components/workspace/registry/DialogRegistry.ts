// DialogRegistry — Fase 6 · Bloco 4 · Etapa 4.3.1. Source of definitions.
import { RegistryResolutionError } from "./errors";
import { isFrozen as isGlobalFrozen, RegistryFrozenError } from "./freeze";
import type { DialogComponent } from "./types";

export type DialogRegistryInstance = {
  register(id: string, c: DialogComponent): void;
  resolve(id: string): DialogComponent;
  getStrict(id: string): DialogComponent;
  exists(id: string): boolean;
  has(id: string): boolean;
  list(): string[];
  listIds(): string[];
  __entries(): ReadonlyMap<string, DialogComponent>;
  __seed(entries: ReadonlyMap<string, DialogComponent>): void;
  __freeze(): void;
};

export function createDialogRegistry(opts?: { useGlobalFreeze?: boolean }): DialogRegistryInstance {
  const store = new Map<string, DialogComponent>();
  let localFrozen = false;
  const useGlobal = opts?.useGlobalFreeze ?? false;
  const guard = (id: string) => {
    if (localFrozen || (useGlobal && isGlobalFrozen()))
      throw new RegistryFrozenError("DialogRegistry", id);
  };
  const api: DialogRegistryInstance = {
    register(id, c) { guard(id); store.set(id, c); },
    resolve(id) {
      const c = store.get(id);
      if (!c) throw new RegistryResolutionError("DialogRegistry", id);
      return c;
    },
    getStrict(id) { return api.resolve(id); },
    exists(id) { return store.has(id); },
    has(id) { return store.has(id); },
    list() { return Array.from(store.keys()); },
    listIds() { return Array.from(store.keys()); },
    __entries() { return store; },
    __seed(entries) {
      if (localFrozen) throw new RegistryFrozenError("DialogRegistry", "__seed");
      for (const [k, v] of entries) store.set(k, v);
    },
    __freeze() { localFrozen = true; },
  };
  return api;
}

export const DialogRegistry = createDialogRegistry({ useGlobalFreeze: true });

export function registerDialog(id: string, component: DialogComponent): void {
  DialogRegistry.register(id, component);
}
