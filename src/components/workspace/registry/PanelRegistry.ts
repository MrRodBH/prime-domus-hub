// PanelRegistry — resolução O(1) de painéis por ID (hardening 4.2).
import { RegistryResolutionError } from "./errors";
import { isFrozen, RegistryFrozenError } from "./freeze";
import type { PanelComponent } from "./types";

const registry = new Map<string, PanelComponent>();

export const PanelRegistry = {
  register(id: string, component: PanelComponent): void {
    if (isFrozen()) throw new RegistryFrozenError("PanelRegistry", id);
    registry.set(id, component);
  },
  resolve(id: string): PanelComponent {
    const c = registry.get(id);
    if (!c) throw new RegistryResolutionError("PanelRegistry", id);
    return c;
  },
  getStrict(id: string): PanelComponent {
    return this.resolve(id);
  },
  exists(id: string): boolean {
    return registry.has(id);
  },
  has(id: string): boolean {
    return registry.has(id);
  },
  list(): string[] {
    return Array.from(registry.keys());
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
  __entries(): ReadonlyMap<string, PanelComponent> {
    return registry;
  },
};

export function registerPanel(id: string, component: PanelComponent): void {
  PanelRegistry.register(id, component);
}
