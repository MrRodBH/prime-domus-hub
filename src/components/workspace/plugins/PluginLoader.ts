// PluginLoader — Fase 6 · Bloco 4 · Etapa 4.4 §2 + §6 (Dynamic Module Loader).
//
// Responsabilidades:
//   • localizar plugins (via loader source injetado)
//   • validar Manifest (fail-fast)
//   • validar apiVersion + dependências
//   • carregar módulo (assíncrono)
//   • registrar no PluginRegistry
//
// NÃO executa lógica de plugin.
// NÃO registra Views/Panels/Dialogs/Actions.
// NÃO conhece ResolutionGraph, Snapshot, Registry base, ActionExecutor
// ou Bootstrap (Hard Gates 1, 3, 6, 7).
//
// Dynamic Module Loading: NESTA ETAPA nenhum código remoto é carregado.
// Apenas a infraestrutura (contrato `PluginSource`) é preparada.
import {
  validateManifest,
  PluginValidationError,
  SUPPORTED_API_VERSIONS,
} from "./PluginValidator";
import type { PluginManifest, PluginModule } from "./PluginManifest";
import type { PluginRegistry } from "./PluginRegistry";

export class PluginLoadError extends Error {
  constructor(public readonly pluginId: string, message: string) {
    super(`[PluginLoader] ${pluginId}: ${message}`);
    this.name = "PluginLoadError";
  }
}

/**
 * Fonte de plugins. Nesta etapa, `resolveModule` só carrega plugins
 * conhecidos localmente. Carregamento remoto entra em fase futura.
 */
export interface PluginSource {
  listManifests(): Promise<ReadonlyArray<unknown>>;
  resolveModule(manifest: PluginManifest): Promise<PluginModule>;
}

export interface PluginLoader {
  loadAll(registry: PluginRegistry): Promise<ReadonlyArray<PluginManifest>>;
  loadOne(registry: PluginRegistry, rawManifest: unknown): Promise<PluginManifest>;
}

function validateDependencies(
  manifest: PluginManifest,
  registry: PluginRegistry,
): void {
  for (const depId of Object.keys(manifest.dependencies)) {
    if (!registry.has(depId)) {
      throw new PluginLoadError(
        manifest.id,
        `dependência ausente: "${depId}" (registre-a antes)`,
      );
    }
  }
}

export function createPluginLoader(source: PluginSource): PluginLoader {
  async function loadOne(
    registry: PluginRegistry,
    raw: unknown,
  ): Promise<PluginManifest> {
    let manifest: PluginManifest;
    try {
      manifest = validateManifest(raw);
    } catch (err) {
      if (err instanceof PluginValidationError) throw err;
      throw new PluginLoadError("<unknown>", (err as Error).message);
    }

    if (!SUPPORTED_API_VERSIONS.includes(manifest.apiVersion)) {
      throw new PluginLoadError(
        manifest.id,
        `apiVersion "${manifest.apiVersion}" não suportada`,
      );
    }

    validateDependencies(manifest, registry);

    const module = await source.resolveModule(manifest);
    if (!module || typeof module !== "object") {
      throw new PluginLoadError(manifest.id, "módulo inválido");
    }

    registry.register(manifest, module);
    return manifest;
  }

  return Object.freeze({
    loadOne,
    async loadAll(registry) {
      const raws = await source.listManifests();
      const loaded: PluginManifest[] = [];
      for (const raw of raws) {
        loaded.push(await loadOne(registry, raw));
      }
      return Object.freeze(loaded);
    },
  });
}
