// ViewRegistry — resolução O(1) de views por ID.
// Fase 6 · Bloco 4 · Etapa 4.1.b + hardening 4.2 (§2/§5/§7).
//
// REGRA MÁXIMA: o núcleo NÃO instancia componentes — SÓ resolve IDs.
// Proibido: switch por viewId, fallback heurístico, resolveByContext,
// resolveSmart, autoResolve, cross-registry lookup.
import { RegistryResolutionError } from "./errors";
import { isFrozen, RegistryFrozenError } from "./freeze";
import type { ViewComponent } from "./types";

const registry = new Map<string, ViewComponent>();

export const ViewRegistry = {
  register(viewId: string, component: ViewComponent): void {
    if (isFrozen()) throw new RegistryFrozenError("ViewRegistry", viewId);
    registry.set(viewId, component);
  },
  /** Lookup O(1). Fail-fast se ausente. */
  resolve(viewId: string): ViewComponent {
    const c = registry.get(viewId);
    if (!c) throw new RegistryResolutionError("ViewRegistry", viewId);
    return c;
  },
  /** Alias explícito de `resolve` — §7 “Separation of Concern por lookup”. */
  getStrict(viewId: string): ViewComponent {
    return this.resolve(viewId);
  },
  exists(viewId: string): boolean {
    return registry.has(viewId);
  },
  has(viewId: string): boolean {
    return registry.has(viewId);
  },
  /** Debug only — não usar em runtime crítico (§5.1). */
  list(): string[] {
    return Array.from(registry.keys());
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
  /** Builder-only — consumido pelo snapshot; nunca leia em runtime. */
  __entries(): ReadonlyMap<string, ViewComponent> {
    return registry;
  },
};

export function registerView(viewId: string, component: ViewComponent): void {
  ViewRegistry.register(viewId, component);
}
