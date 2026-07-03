// ViewRegistry — resolução de componentes de visualização por ID.
// Fase 6 · Bloco 4 · Etapa 4.1.b · Instrução Normativa §3.1.A / §7.
//
// REGRA MÁXIMA (§2.2): o núcleo NÃO instancia componentes — SÓ resolve IDs.
// Proibido: switch por viewId, fallback hardcoded, import de feature.
import { RegistryResolutionError } from "./errors";
import type { ViewComponent } from "./types";

const registry = new Map<string, ViewComponent>();

export const ViewRegistry = {
  register(viewId: string, component: ViewComponent): void {
    registry.set(viewId, component);
  },
  resolve(viewId: string): ViewComponent {
    const c = registry.get(viewId);
    if (!c) throw new RegistryResolutionError("ViewRegistry", viewId);
    return c;
  },
  has(viewId: string): boolean {
    return registry.has(viewId);
  },
  listIds(): string[] {
    return Array.from(registry.keys());
  },
};

export function registerView(viewId: string, component: ViewComponent): void {
  ViewRegistry.register(viewId, component);
}
