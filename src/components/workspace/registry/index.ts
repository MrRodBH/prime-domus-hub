// Registry System — superfície pública (Fase 6 · Bloco 4 · Etapa 4.1.b + 4.2).
//
// Contrato invariante:
//   Descriptor → Workspace → Runtime → Registry → Component → Render
//
// Nenhum consumidor externo pode importar arquivos internos deste módulo;
// tudo passa por este barrel.

export { ViewRegistry, registerView } from "./ViewRegistry";
export { PanelRegistry, registerPanel } from "./PanelRegistry";
export { DialogRegistry, registerDialog } from "./DialogRegistry";
export { ActionRegistry, registerAction } from "./ActionRegistry";
export { RegistryIndex } from "./RegistryIndex";
export { RegistryResolutionError } from "./errors";
export { freezeRegistries, isFrozen, RegistryFrozenError } from "./freeze";
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
