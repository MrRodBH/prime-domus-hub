// RegistryIndex — DEBUG-ONLY TOOLING (Fase 6 · Bloco 4 · Etapa 4.3 §7).
//
// ATENÇÃO: NÃO IMPORTAR EM CÓDIGO DE PRODUTO / RUNTIME.
//
// A 4.3 removeu esta superfície do runtime porque virou uma "global
// cognitive surface" (§7). Continua aqui apenas para uso manual em
// ferramentas de diagnóstico (console de dev, scripts de auditoria).
// Runtime é 100% context-driven via `useTenantContext()` + snapshot.

import { ViewRegistry } from "./ViewRegistry";
import { PanelRegistry } from "./PanelRegistry";
import { DialogRegistry } from "./DialogRegistry";
import { ActionRegistry } from "./ActionRegistry";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
  ActionHandler,
} from "./types";

export const RegistryIndex = Object.freeze({
  view: Object.freeze({
    resolve: (id: string): ViewComponent => ViewRegistry.resolve(id),
    exists: (id: string): boolean => ViewRegistry.exists(id),
    /** Debug only. */
    list: (): string[] => ViewRegistry.list(),
  }),
  panel: Object.freeze({
    resolve: (id: string): PanelComponent => PanelRegistry.resolve(id),
    exists: (id: string): boolean => PanelRegistry.exists(id),
    list: (): string[] => PanelRegistry.list(),
  }),
  dialog: Object.freeze({
    resolve: (id: string): DialogComponent => DialogRegistry.resolve(id),
    exists: (id: string): boolean => DialogRegistry.exists(id),
    list: (): string[] => DialogRegistry.list(),
  }),
  action: Object.freeze({
    /** Handlers NÃO são "resolvidos" em componentes — usar `execute`. */
    exists: (id: string): boolean => ActionRegistry.exists(id),
    getStrict: (id: string): ActionHandler => ActionRegistry.getStrict(id),
    list: (): string[] => ActionRegistry.list(),
  }),
});

export type RegistryIndexT = typeof RegistryIndex;
