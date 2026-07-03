// ResolutionGraph — Fase 6 · Bloco 4 · Etapa 4.3.4 §4.1.
//
// PATCH 4.3.4 (RESOLUTION GRAPH LOCKDOWN):
//   • Grafo de resolução IMUTÁVEL, prebuilt no bootstrap por tenant.
//   • Nenhum register() em runtime. Nenhuma extensão dinâmica de kind.
//   • Plugins e renderers LEEM o grafo — nunca o modificam.
//
// Substitui integralmente `ResolverRegistry` + `UnifiedResolutionLayer` como
// mecanismos mutáveis. Este módulo é a ÚNICA fonte de dispatch runtime.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
} from "@/components/workspace/registry/types";
import type { ActionDefinition } from "@/components/workspace/registry/ActionRegistry";
import { createViewResolver, type ViewResolver } from "./resolvers/ViewResolver";
import { createPanelResolver, type PanelResolver } from "./resolvers/PanelResolver";
import { createDialogResolver, type DialogResolver } from "./resolvers/DialogResolver";
import { createActionResolver, type ActionResolver } from "./resolvers/ActionResolver";

/** Interface mínima de um resolver imutável. */
export interface Resolver<TKind extends string, TResult> {
  readonly kind: TKind;
  resolve(id: string, ctx?: unknown): TResult;
  exists(id: string): boolean;
}

/**
 * Grafo de resolução imutável por tenant.
 *
 * Regras (§2 Immutability Rule):
 *   • criado UMA vez, no bootstrap do tenant
 *   • congelado com Object.freeze
 *   • sem Map exposto, sem register(), sem extensão runtime
 */
export type ResolutionGraph = Readonly<{
  view: ViewResolver;
  panel: PanelResolver;
  dialog: DialogResolver;
  action: ActionResolver;
}>;

// Reexport tipos concretos dos nós — evita imports transversais em consumidores.
export type {
  ViewResolver,
  PanelResolver,
  DialogResolver,
  ActionResolver,
};
export type { ViewComponent, PanelComponent, DialogComponent, ActionDefinition };

/**
 * Cria o grafo de resolução para um snapshot. Único ponto de construção
 * autorizado — chamado exclusivamente pelo TenantContext no bootstrap.
 */
export function createResolutionGraph(snapshot: RegistrySnapshot): ResolutionGraph {
  // Cada resolver já é congelado em seu próprio construtor.
  return Object.freeze({
    view: createViewResolver(snapshot),
    panel: createPanelResolver(snapshot),
    dialog: createDialogResolver(snapshot),
    action: createActionResolver(snapshot),
  });
}
