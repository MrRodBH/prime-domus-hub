// ViewRegistry — Fase 6 · Bloco 4 · Etapa 4.3.1.
//
// Papel: SOURCE OF DEFINITIONS. Não executa, não decide, não faz fallback.
// Cada instância é isolada — a bootstrap usa o singleton default; cada
// tenant recebe uma instância própria através do Snapshot (§3 do patch).
import { RegistryResolutionError } from "./errors";
import { isFrozen as isGlobalFrozen, RegistryFrozenError } from "./freeze";
import type { ViewComponent } from "./types";

export type ViewRegistryInstance = {
  register(viewId: string, component: ViewComponent): void;
  resolve(viewId: string): ViewComponent;
  getStrict(viewId: string): ViewComponent;
  exists(viewId: string): boolean;
  has(viewId: string): boolean;
  list(): string[];
  listIds(): string[];
  __entries(): ReadonlyMap<string, ViewComponent>;
  __seed(entries: ReadonlyMap<string, ViewComponent>): void;
  __freeze(): void;
};

export function createViewRegistry(opts?: { useGlobalFreeze?: boolean }): ViewRegistryInstance {
  const store = new Map<string, ViewComponent>();
  let localFrozen = false;
  const useGlobal = opts?.useGlobalFreeze ?? false;
  const guard = (id: string) => {
    if (localFrozen || (useGlobal && isGlobalFrozen()))
      throw new RegistryFrozenError("ViewRegistry", id);
  };
  const api: ViewRegistryInstance = {
    register(id, c) { guard(id); store.set(id, c); },
    resolve(id) {
      const c = store.get(id);
      if (!c) throw new RegistryResolutionError("ViewRegistry", id);
      return c;
    },
    getStrict(id) { return api.resolve(id); },
    exists(id) { return store.has(id); },
    has(id) { return store.has(id); },
    list() { return Array.from(store.keys()); },
    listIds() { return Array.from(store.keys()); },
    __entries() { return store; },
    __seed(entries) {
      if (localFrozen) throw new RegistryFrozenError("ViewRegistry", "__seed");
      for (const [k, v] of entries) store.set(k, v);
    },
    __freeze() { localFrozen = true; },
  };
  return api;
}

/** Default singleton usado pela composition root de bootstrap. */
export const ViewRegistry = createViewRegistry({ useGlobalFreeze: true });

export function registerView(viewId: string, component: ViewComponent): void {
  ViewRegistry.register(viewId, component);
}
