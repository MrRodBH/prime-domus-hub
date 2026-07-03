// RegistrySnapshot — Fase 6 · Bloco 4 · Etapa 4.3 §4.
//
// O registry deixa de ser uma superfície global consultada em runtime e passa
// a ser materializado como um SNAPSHOT IMUTÁVEL por contexto de execução
// (tenant, plugin sandbox, teste). O snapshot é o único artefato que o
// runtime consulta — o Map global dos registries vira apenas o "builder"
// consumido pela composition root (bootstrap).
//
// Invariantes (Instrução 4.3 §4.3):
//   • criado no bootstrap do tenant
//   • imutável após criação (Object.freeze + ReadonlyMap contract)
//   • não compartilhado entre tenants (nova instância por tenantId)
//   • nunca acessado diretamente fora do runtime context
//   • registry NÃO executa — apenas resolve (§8.2)
import { RegistryResolutionError } from "./errors";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
  ActionHandler,
} from "./types";

export type RegistrySnapshot = Readonly<{
  tenantId: string;
  createdAt: number;
  resolveView: (id: string) => ViewComponent;
  resolvePanel: (id: string) => PanelComponent;
  resolveDialog: (id: string) => DialogComponent;
  resolveAction: (id: string) => ActionHandler;
  hasView: (id: string) => boolean;
  hasPanel: (id: string) => boolean;
  hasDialog: (id: string) => boolean;
  hasAction: (id: string) => boolean;
  /** Debug-only — nunca usar em runtime crítico (§10). */
  __debug: Readonly<{
    viewIds: readonly string[];
    panelIds: readonly string[];
    dialogIds: readonly string[];
    actionIds: readonly string[];
  }>;
}>;

export type RegistrySnapshotSource = Readonly<{
  views: ReadonlyMap<string, ViewComponent>;
  panels: ReadonlyMap<string, PanelComponent>;
  dialogs: ReadonlyMap<string, DialogComponent>;
  actions: ReadonlyMap<string, ActionHandler>;
}>;

/**
 * Constrói um snapshot novo (Map interno próprio) a partir das declarações
 * do bootstrap. Cada chamada com tenantId distinto retorna instâncias de
 * Map distintas — atendendo §12.3 (mesmo id em tenants diferentes não
 * compartilha instância de container).
 */
export function createRegistrySnapshot(
  tenantId: string,
  source: RegistrySnapshotSource,
): RegistrySnapshot {
  const views = new Map(source.views);
  const panels = new Map(source.panels);
  const dialogs = new Map(source.dialogs);
  const actions = new Map(source.actions);

  const snap: RegistrySnapshot = Object.freeze({
    tenantId,
    createdAt: Date.now(),
    resolveView: (id) => {
      const c = views.get(id);
      if (!c) throw new RegistryResolutionError("ViewRegistry", id);
      return c;
    },
    resolvePanel: (id) => {
      const c = panels.get(id);
      if (!c) throw new RegistryResolutionError("PanelRegistry", id);
      return c;
    },
    resolveDialog: (id) => {
      const c = dialogs.get(id);
      if (!c) throw new RegistryResolutionError("DialogRegistry", id);
      return c;
    },
    resolveAction: (id) => {
      const h = actions.get(id);
      if (!h) throw new RegistryResolutionError("ActionRegistry", id);
      return h;
    },
    hasView: (id) => views.has(id),
    hasPanel: (id) => panels.has(id),
    hasDialog: (id) => dialogs.has(id),
    hasAction: (id) => actions.has(id),
    __debug: Object.freeze({
      viewIds: Object.freeze(Array.from(views.keys())),
      panelIds: Object.freeze(Array.from(panels.keys())),
      dialogIds: Object.freeze(Array.from(dialogs.keys())),
      actionIds: Object.freeze(Array.from(actions.keys())),
    }),
  });
  return snap;
}
