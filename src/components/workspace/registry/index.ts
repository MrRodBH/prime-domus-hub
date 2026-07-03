// Registry System — superfície pública (Fase 6 · Bloco 4 · Etapa 4.3.2).
//
// Camadas (patch 4.3.2 — Unified Resolution Layer):
//   Registry                → source of definitions (build-time)
//   RegistrySnapshot        → container passivo por tenant (isola instâncias)
//   UnifiedResolutionLayer  → SINGLE runtime entrypoint (fora deste barrel)
//   ActionExecutor          → execução pura
//
// Fluxo canônico runtime:
//   TenantContext → RegistrySnapshot → UnifiedResolutionLayer
//                 → Renderer / Plugin / ActionExecutor
export {
  ViewRegistry, registerView, createViewRegistry,
  type ViewRegistryInstance,
} from "./ViewRegistry";
export {
  PanelRegistry, registerPanel, createPanelRegistry,
  type PanelRegistryInstance,
} from "./PanelRegistry";
export {
  DialogRegistry, registerDialog, createDialogRegistry,
  type DialogRegistryInstance,
} from "./DialogRegistry";
export {
  ActionRegistry, registerAction, createActionRegistry,
  type ActionRegistryInstance,
  type ActionDefinition,
} from "./ActionRegistry";

export { RegistryResolutionError } from "./errors";
export { freezeRegistries, isFrozen, RegistryFrozenError } from "./freeze";

export {
  createRegistrySnapshot,
  type RegistrySnapshot,
  type RegistrySnapshotSource,
} from "./snapshot";

export { executeAction, executeActionById } from "./ActionExecutor";

export type {
  ViewProps,
  PanelProps,
  DialogRuntimeProps,
  ActionContext,
  ViewComponent,
  PanelComponent,
  DialogComponent,
  ActionHandler,
} from "./types";

