// ViewResolver — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.2.
//
// Resolver especializado por capability. NÃO conhece outros kinds.
// Consome exclusivamente `snapshot.viewRegistry`.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type { ViewComponent } from "@/components/workspace/registry/types";
import type { Resolver } from "../ResolutionGraph";

export class ViewResolver implements Resolver<"view", ViewComponent> {
  readonly kind = "view" as const;
  constructor(private readonly snapshot: RegistrySnapshot) {
    Object.freeze(this);
  }
  resolve(id: string): ViewComponent {
    return this.snapshot.viewRegistry.resolve(id);
  }
  exists(id: string): boolean {
    return this.snapshot.viewRegistry.exists(id);
  }
}

export function createViewResolver(snapshot: RegistrySnapshot): ViewResolver {
  return new ViewResolver(snapshot);
}
