// PanelRegistry — resolução de painéis analíticos por ID (§3.1.B).
import { RegistryResolutionError } from "./errors";
import type { PanelComponent } from "./types";

const registry = new Map<string, PanelComponent>();

export const PanelRegistry = {
  register(id: string, component: PanelComponent): void {
    registry.set(id, component);
  },
  resolve(id: string): PanelComponent {
    const c = registry.get(id);
    if (!c) throw new RegistryResolutionError("PanelRegistry", id);
    return c;
  },
  has(id: string): boolean {
    return registry.has(id);
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
};

export function registerPanel(id: string, component: PanelComponent): void {
  PanelRegistry.register(id, component);
}
