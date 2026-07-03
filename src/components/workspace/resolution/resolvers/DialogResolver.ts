// DialogResolver — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.2.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type { DialogComponent } from "@/components/workspace/registry/types";
import type { Resolver } from "../ResolutionGraph";

export class DialogResolver implements Resolver<"dialog", DialogComponent> {
  readonly kind = "dialog" as const;
  constructor(private readonly snapshot: RegistrySnapshot) {
    Object.freeze(this);
  }
  resolve(id: string): DialogComponent {
    return this.snapshot.dialogRegistry.resolve(id);
  }
  exists(id: string): boolean {
    return this.snapshot.dialogRegistry.exists(id);
  }
}

export function createDialogResolver(snapshot: RegistrySnapshot): DialogResolver {
  return new DialogResolver(snapshot);
}
