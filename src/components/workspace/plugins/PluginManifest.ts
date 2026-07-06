// PluginManifest — Fase 6 · Bloco 4 · Etapa 4.4 §1.
//
// Contrato DECLARATIVO de plugin. Sem lógica. Sem execução.
// Nenhum acoplamento com Registry, Snapshot, ResolutionGraph, Executor
// ou Bootstrap — este arquivo NÃO importa nada do runtime do Workspace.
//
// Architectural Governance Rule: este módulo é infraestrutura pura para
// plugins e não altera qualquer camada arquitetural existente.

/** Capabilities declaráveis por plugin (declarativo — não executa). */
export type PluginCapability =
  | "view"
  | "panel"
  | "dialog"
  | "action";

/** Permissões declaráveis. Enforcement é responsabilidade do host. */
export type PluginPermission =
  | "read:entities"
  | "write:entities"
  | "execute:actions"
  | "read:featureFlags";

/**
 * Manifest de plugin — 100% declarativo.
 *
 * A `apiVersion` deve casar com a versão suportada pelo host (ver
 * `PluginValidator.SUPPORTED_API_VERSIONS`).
 */
export type PluginManifest = Readonly<{
  id: string;
  version: string;
  apiVersion: string;
  displayName: string;
  description: string;
  author: string;
  capabilities: ReadonlyArray<PluginCapability>;
  featureFlags: ReadonlyArray<string>;
  entrypoint: string;
  permissions: ReadonlyArray<PluginPermission>;
  dependencies: Readonly<Record<string, string>>;
}>;

/** Módulo carregado. O host NUNCA executa `activate` sem sandbox. */
export type PluginModule = Readonly<{
  activate?: (ctx: unknown) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}>;

/** Entrada composta mantida no PluginRegistry. */
export type PluginEntry = Readonly<{
  manifest: PluginManifest;
  module: PluginModule;
}>;
