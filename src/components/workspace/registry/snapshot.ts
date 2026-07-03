// RegistrySnapshot — Fase 6 · Bloco 4 · Etapa 4.3.1 §3.
//
// PATCH 4.3.1: o Snapshot volta a ser um CONTAINER PASSIVO. Ele NÃO
// resolve, NÃO executa, NÃO decide — apenas isola instâncias de registry
// por tenant. Resolução runtime é feita pela `UnifiedResolutionLayer`.
import {
  createViewRegistry,
  type ViewRegistryInstance,
} from "./ViewRegistry";
import {
  createPanelRegistry,
  type PanelRegistryInstance,
} from "./PanelRegistry";
import {
  createDialogRegistry,
  type DialogRegistryInstance,
} from "./DialogRegistry";
import {
  createActionRegistry,
  type ActionRegistryInstance,
  type ActionDefinition,
} from "./ActionRegistry";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
  ActionHandler,
} from "./types";

export type RegistrySnapshot = Readonly<{
  tenantId: string;
  createdAt: number;
  viewRegistry: ViewRegistryInstance;
  panelRegistry: PanelRegistryInstance;
  dialogRegistry: DialogRegistryInstance;
  actionRegistry: ActionRegistryInstance;
}>;

export type RegistrySnapshotSource = Readonly<{
  views: ReadonlyMap<string, ViewComponent>;
  panels: ReadonlyMap<string, PanelComponent>;
  dialogs: ReadonlyMap<string, DialogComponent>;
  /** Aceita handlers puros (bootstrap) OU ActionDefinition (re-snapshot). */
  actions: ReadonlyMap<string, ActionHandler | ActionDefinition>;
}>;

/**
 * Cria um snapshot com instâncias de registry ISOLADAS por tenant e as
 * congela após seed. Nenhum lookup passa por este objeto — a resolução
 * runtime é responsabilidade da `UnifiedResolutionLayer`.
 */
export function createRegistrySnapshot(
  tenantId: string,
  source: RegistrySnapshotSource,
): RegistrySnapshot {
  const viewRegistry = createViewRegistry();
  const panelRegistry = createPanelRegistry();
  const dialogRegistry = createDialogRegistry();
  const actionRegistry = createActionRegistry();

  viewRegistry.__seed(source.views);
  panelRegistry.__seed(source.panels);
  dialogRegistry.__seed(source.dialogs);

  // Actions podem chegar como handler puro (bootstrap) ou como definition.
  const actionsMap = new Map<string, ActionDefinition>();
  for (const [id, v] of source.actions) {
    const handler = typeof v === "function" ? v : v.handler;
    actionsMap.set(id, Object.freeze({ id, handler }));
  }
  actionRegistry.__seed(actionsMap);

  viewRegistry.__freeze();
  panelRegistry.__freeze();
  dialogRegistry.__freeze();
  actionRegistry.__freeze();

  return Object.freeze({
    tenantId,
    createdAt: Date.now(),
    viewRegistry,
    panelRegistry,
    dialogRegistry,
    actionRegistry,
  });
}
