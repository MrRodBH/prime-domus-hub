// RegistryIndex — Read-Only Lookup Layer (Fase 6 · Bloco 4 · Etapa 4.2 §4.1).
//
// Camada intermediária de leitura que centraliza lookups pelos quatro
// registries independentes. Contrato invariante:
//
//   • NÃO executa lógica
//   • NÃO transforma dados
//   • NÃO agrega comportamento
//   • NÃO orquestra
//   • NÃO cruza registries (cross-registry lookup é proibido — §2/§6)
//
// Existe apenas para: (a) oferecer uma superfície única de leitura para
// ferramentas de diagnóstico e para o runtime, e (b) tornar explícito que
// os quatro registries são silos independentes.
//
// Cada acessor delega diretamente ao registry canônico — sem cache próprio,
// sem estado. O cache real é o `Map` interno de cada registry (O(1)).
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
