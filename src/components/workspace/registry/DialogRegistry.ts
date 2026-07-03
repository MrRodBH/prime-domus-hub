// DialogRegistry — resolução O(1) de dialogs por ID (hardening 4.2).
import { RegistryResolutionError } from "./errors";
import { isFrozen, RegistryFrozenError } from "./freeze";
import type { DialogComponent } from "./types";

const registry = new Map<string, DialogComponent>();

export const DialogRegistry = {
  register(id: string, component: DialogComponent): void {
    if (isFrozen()) throw new RegistryFrozenError("DialogRegistry", id);
    registry.set(id, component);
  },
  resolve(id: string): DialogComponent {
    const c = registry.get(id);
    if (!c) throw new RegistryResolutionError("DialogRegistry", id);
    return c;
  },
  getStrict(id: string): DialogComponent {
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
  __entries(): ReadonlyMap<string, DialogComponent> {
    return registry;
  },
};

export function registerDialog(id: string, component: DialogComponent): void {
  DialogRegistry.register(id, component);
}
