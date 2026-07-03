// Registry System — superfície pública (Fase 6 · Bloco 4).
//
// Contrato invariante (atualizado na 4.3):
//   TenantContext → RegistrySnapshot → RuntimeRenderer → resolve(id) → Component
//
// Regras 4.3:
//   • Registries expostos aqui são BUILDERS de bootstrap — NUNCA consultados
//     em runtime diretamente. Runtime lê apenas `RegistrySnapshot` via
//     `useTenantContext()`.
//   • `RegistryIndex` foi REMOVIDO desta superfície (§7). Continua disponível
//     como "debug-only tooling" em `./RegistryIndex` para inspeção manual —
//     nenhum código de produto deve importá-lo.
//   • `ActionRegistry.execute` foi REMOVIDO (§8). Execução vive em
//     `./ActionExecutor` e é chamada via snapshot.
export { ViewRegistry, registerView } from "./ViewRegistry";
export { PanelRegistry, registerPanel } from "./PanelRegistry";
export { DialogRegistry, registerDialog } from "./DialogRegistry";
export { ActionRegistry, registerAction } from "./ActionRegistry";

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
