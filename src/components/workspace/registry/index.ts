// Registry System — superfície pública (Fase 6 · Bloco 4 · Etapa 4.3.1).
//
// Camadas (patch 4.3.1):
//   Registry       → source of definitions (build-time)
//   RegistryIndex  → read-only façade runtime (obrigatória — não é debug!)
//   Snapshot       → container passivo por tenant (isola instâncias)
//   Executor       → execução pura (nunca dentro de registry/snapshot/index)
//
// Fluxo canônico runtime:
//   TenantContext → RegistrySnapshot (passivo) → RegistryIndex (ativo)
//                 → Renderer / Plugin → ActionExecutor
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

export {
  RegistryIndex,
  createRegistryIndex,
  type ViewFacade,
  type PanelFacade,
  type DialogFacade,
  type ActionFacade,
} from "./RegistryIndex";

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
