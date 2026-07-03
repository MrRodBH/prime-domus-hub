// RegistryIndex — Fase 6 · Bloco 4 · Etapa 4.3.1 §2/§5.
//
// PATCH 4.3.1: RESTAURADO como camada runtime obrigatória.
// Papel: read-only dependency façade sobre as 4 instâncias de registry
// isoladas por um Snapshot. NÃO tem lógica, NÃO decide, NÃO executa,
// NÃO faz fallback, NÃO faz caching. Apenas expõe leitura estruturada.
//
// Consumido por: Renderers, Plugins, DevTools, Debug UI.
import type { ViewRegistryInstance } from "./ViewRegistry";
import type { PanelRegistryInstance } from "./PanelRegistry";
import type { DialogRegistryInstance } from "./DialogRegistry";
import type {
  ActionRegistryInstance,
  ActionDefinition,
} from "./ActionRegistry";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
} from "./types";
import type { RegistrySnapshot } from "./snapshot";

export type ViewFacade = Readonly<{
  resolve: (id: string) => ViewComponent;
  exists: (id: string) => boolean;
  list: () => string[];
}>;
export type PanelFacade = Readonly<{
  resolve: (id: string) => PanelComponent;
  exists: (id: string) => boolean;
  list: () => string[];
}>;
export type DialogFacade = Readonly<{
  resolve: (id: string) => DialogComponent;
  exists: (id: string) => boolean;
  list: () => string[];
}>;
export type ActionFacade = Readonly<{
  resolve: (id: string) => ActionDefinition;
  exists: (id: string) => boolean;
  list: () => string[];
}>;

export class RegistryIndex {
  readonly view: ViewFacade;
  readonly panel: PanelFacade;
  readonly dialog: DialogFacade;
  readonly action: ActionFacade;

  constructor(
    views: ViewRegistryInstance,
    panels: PanelRegistryInstance,
    dialogs: DialogRegistryInstance,
    actions: ActionRegistryInstance,
  ) {
    this.view = Object.freeze({
      resolve: (id: string) => views.resolve(id),
      exists: (id: string) => views.exists(id),
      list: () => views.list(),
    });
    this.panel = Object.freeze({
      resolve: (id: string) => panels.resolve(id),
      exists: (id: string) => panels.exists(id),
      list: () => panels.list(),
    });
    this.dialog = Object.freeze({
      resolve: (id: string) => dialogs.resolve(id),
      exists: (id: string) => dialogs.exists(id),
      list: () => dialogs.list(),
    });
    this.action = Object.freeze({
      resolve: (id: string) => actions.getStrict(id),
      exists: (id: string) => actions.exists(id),
      list: () => actions.list(),
    });
    Object.freeze(this);
  }
}

/** Helper: constrói o índice a partir de um snapshot isolado. */
export function createRegistryIndex(snapshot: RegistrySnapshot): RegistryIndex {
  return new RegistryIndex(
    snapshot.viewRegistry,
    snapshot.panelRegistry,
    snapshot.dialogRegistry,
    snapshot.actionRegistry,
  );
}
