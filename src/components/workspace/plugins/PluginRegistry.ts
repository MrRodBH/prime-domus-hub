// PluginRegistry — Fase 6 · Bloco 4 · Etapa 4.4 §4.
//
// Registry EXCLUSIVO para plugins. NÃO é Registry de View/Panel/Dialog/Action.
// Mantém apenas { manifest, module }. Não conhece tenant, resolution,
// snapshot, workspace ou renderers (Hard Gate 4).
import type { PluginEntry, PluginManifest, PluginModule } from "./PluginManifest";

export class PluginAlreadyRegisteredError extends Error {
  constructor(id: string) {
    super(`[PluginRegistry] plugin já registrado: ${id}`);
    this.name = "PluginAlreadyRegisteredError";
  }
}

export class PluginNotFoundError extends Error {
  constructor(id: string) {
    super(`[PluginRegistry] plugin não encontrado: ${id}`);
    this.name = "PluginNotFoundError";
  }
}

export interface PluginRegistry {
  register(manifest: PluginManifest, module: PluginModule): void;
  unregister(id: string): void;
  get(id: string): PluginEntry;
  has(id: string): boolean;
  list(): ReadonlyArray<PluginEntry>;
}

export function createPluginRegistry(): PluginRegistry {
  const entries = new Map<string, PluginEntry>();

  const api: PluginRegistry = {
    register(manifest, module) {
      if (entries.has(manifest.id)) {
        throw new PluginAlreadyRegisteredError(manifest.id);
      }
      entries.set(manifest.id, Object.freeze({ manifest, module }));
    },
    unregister(id) {
      if (!entries.delete(id)) throw new PluginNotFoundError(id);
    },
    get(id) {
      const e = entries.get(id);
      if (!e) throw new PluginNotFoundError(id);
      return e;
    },
    has(id) {
      return entries.has(id);
    },
    list() {
      return Object.freeze([...entries.values()]);
    },
  };

  return Object.freeze(api);
}
