// PanelResolver — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.2.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type { PanelComponent } from "@/components/workspace/registry/types";
import type { Resolver } from "../ResolverRegistry";

export class PanelResolver implements Resolver<"panel", PanelComponent> {
  readonly kind = "panel" as const;
  constructor(private readonly snapshot: RegistrySnapshot) {
    Object.freeze(this);
  }
  resolve(id: string): PanelComponent {
    return this.snapshot.panelRegistry.resolve(id);
  }
  exists(id: string): boolean {
    return this.snapshot.panelRegistry.exists(id);
  }
}

export function createPanelResolver(snapshot: RegistrySnapshot): PanelResolver {
  return new PanelResolver(snapshot);
}
