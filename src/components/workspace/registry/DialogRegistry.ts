// DialogRegistry — resolução de dialogs contextuais por ID (§3.1.C).
import { RegistryResolutionError } from "./errors";
import type { DialogComponent } from "./types";

const registry = new Map<string, DialogComponent>();

export const DialogRegistry = {
  register(id: string, component: DialogComponent): void {
    registry.set(id, component);
  },
  resolve(id: string): DialogComponent {
    const c = registry.get(id);
    if (!c) throw new RegistryResolutionError("DialogRegistry", id);
    return c;
  },
  has(id: string): boolean {
    return registry.has(id);
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
};

export function registerDialog(id: string, component: DialogComponent): void {
  DialogRegistry.register(id, component);
}
