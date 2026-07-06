// FeatureFlagService — Fase 6 · Bloco 4 · Etapa 4.4 §5.
//
// Serviço tenant-scoped que resolve:
//   Tenant → Feature Flags → Plugin habilitado?
//
// Hard Gate 2: Feature Flags apenas ligam/desligam funcionalidades.
// Jamais alteram Resolution, Registry, Snapshot ou Executor.
//
// Este módulo NÃO conhece Views, Panels, ResolutionGraph ou Snapshot.
import type { PluginManifest } from "./PluginManifest";

export interface FeatureFlagService {
  readonly tenantId: string;
  isFlagEnabled(flag: string): boolean;
  isPluginEnabled(manifest: PluginManifest): boolean;
  flags(): Readonly<Record<string, boolean>>;
}

export function createFeatureFlagService(
  tenantId: string,
  flags: Readonly<Record<string, boolean>>,
): FeatureFlagService {
  const frozen = Object.freeze({ ...flags });

  return Object.freeze({
    tenantId,
    isFlagEnabled(flag: string): boolean {
      return frozen[flag] === true;
    },
    /**
     * Plugin habilitado ⇔ TODAS as flags declaradas em `manifest.featureFlags`
     * estão ativas para o tenant. Plugin sem flags ⇒ sempre habilitado.
     */
    isPluginEnabled(manifest: PluginManifest): boolean {
      if (manifest.featureFlags.length === 0) return true;
      return manifest.featureFlags.every((f) => frozen[f] === true);
    },
    flags(): Readonly<Record<string, boolean>> {
      return frozen;
    },
  });
}
