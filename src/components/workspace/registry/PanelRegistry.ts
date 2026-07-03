// PanelRegistry — Fase 6 · Bloco 4 · Etapa 4.3.1. Source of definitions.
import { RegistryResolutionError } from "./errors";
import { isFrozen as isGlobalFrozen, RegistryFrozenError } from "./freeze";
import type { PanelComponent } from "./types";

export type PanelRegistryInstance = {
  register(id: string, c: PanelComponent): void;
  resolve(id: string): PanelComponent;
  getStrict(id: string): PanelComponent;
  exists(id: string): boolean;
  has(id: string): boolean;
  list(): string[];
  listIds(): string[];
  __entries(): ReadonlyMap<string, PanelComponent>;
  __seed(entries: ReadonlyMap<string, PanelComponent>): void;
  __freeze(): void;
};

export function createPanelRegistry(opts?: { useGlobalFreeze?: boolean }): PanelRegistryInstance {
  const store = new Map<string, PanelComponent>();
  let localFrozen = false;
  const useGlobal = opts?.useGlobalFreeze ?? false;
  const guard = (id: string) => {
    if (localFrozen || (useGlobal && isGlobalFrozen()))
      throw new RegistryFrozenError("PanelRegistry", id);
  };
  const api: PanelRegistryInstance = {
    register(id, c) { guard(id); store.set(id, c); },
    resolve(id) {
      const c = store.get(id);
      if (!c) throw new RegistryResolutionError("PanelRegistry", id);
      return c;
    },
    getStrict(id) { return api.resolve(id); },
    exists(id) { return store.has(id); },
    has(id) { return store.has(id); },
    list() { return Array.from(store.keys()); },
    listIds() { return Array.from(store.keys()); },
    __entries() { return store; },
    __seed(entries) {
      if (localFrozen) throw new RegistryFrozenError("PanelRegistry", "__seed");
      for (const [k, v] of entries) store.set(k, v);
    },
    __freeze() { localFrozen = true; },
  };
  return api;
}

export const PanelRegistry = createPanelRegistry({ useGlobalFreeze: true });

export function registerPanel(id: string, component: PanelComponent): void {
  PanelRegistry.register(id, component);
}
