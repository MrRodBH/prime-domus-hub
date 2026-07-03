// UnifiedResolutionLayer — Fase 6 · Bloco 4 · Etapa 4.3.2.
//
// SINGLE runtime entrypoint para resolução. Substitui RegistryIndex e
// qualquer variante de `snapshot.resolve*`. Consome APENAS o snapshot
// isolado por tenant. Não conhece tenant, não conhece plugin, não faz
// fallback, não faz cache.
//
// Regra de ouro: o `switch(kind)` abaixo é o ÚNICO switch de kind
// permitido em todo o runtime. Qualquer outra instância é violação.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
} from "@/components/workspace/registry/types";
import type { ActionDefinition } from "@/components/workspace/registry/ActionRegistry";

export type ResolutionKind = "view" | "panel" | "dialog" | "action";

export type ResolutionResult<K extends ResolutionKind> = K extends "view"
  ? ViewComponent
  : K extends "panel"
    ? PanelComponent
    : K extends "dialog"
      ? DialogComponent
      : K extends "action"
        ? ActionDefinition
        : never;

export class UnifiedResolutionLayer {
  constructor(private readonly snapshot: RegistrySnapshot) {
    Object.freeze(this);
  }

  resolve<K extends ResolutionKind>(kind: K, id: string): ResolutionResult<K> {
    switch (kind) {
      case "view":
        return this.snapshot.viewRegistry.resolve(id) as ResolutionResult<K>;
      case "panel":
        return this.snapshot.panelRegistry.resolve(id) as ResolutionResult<K>;
      case "dialog":
        return this.snapshot.dialogRegistry.resolve(id) as ResolutionResult<K>;
      case "action":
        return this.snapshot.actionRegistry.getStrict(id) as ResolutionResult<K>;
      default: {
        const _exhaustive: never = kind;
        throw new Error(`[UnifiedResolutionLayer] kind inválido: ${_exhaustive as string}`);
      }
    }
  }

  exists(kind: ResolutionKind, id: string): boolean {
    switch (kind) {
      case "view":
        return this.snapshot.viewRegistry.exists(id);
      case "panel":
        return this.snapshot.panelRegistry.exists(id);
      case "dialog":
        return this.snapshot.dialogRegistry.exists(id);
      case "action":
        return this.snapshot.actionRegistry.exists(id);
    }
  }
}

export function createUnifiedResolutionLayer(
  snapshot: RegistrySnapshot,
): UnifiedResolutionLayer {
  return new UnifiedResolutionLayer(snapshot);
}
