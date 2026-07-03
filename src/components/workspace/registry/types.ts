// Registry · Contratos de props (Fase 6 · Bloco 4 · Etapa 4.1.b + hardening 4.1.d).
//
// REGRA (Instrução Normativa 4.1.b §6.2): tipos são neutros — não conhecem
// domínio. Descriptor/Adapter/Record são o único vocabulário do runtime.
//
// REGRA (Instrução Normativa 4.1.d §4 / §8.2 — Registry Purity):
// o registry NÃO pode depender de `workspace`, `runtime` ou `bootstrap`.
// Por isso os tipos genéricos são importados diretamente do módulo
// canônico de contratos (`content/types` — que é o arquivo-fonte, e não
// o barrel do workspace). Import é `type-only`, portanto sem runtime edge.
import type { ComponentType } from "react";
import type {
  EntityDescriptor,
  ContentEntityRecord as EntityRecord,
  ContentEntityAdapter as EntityAdapter,
} from "@/components/content/types";
import type { ContentSearch as EntitySearch } from "@/components/content/search-schema";

// ---------------------------------------------------------------------------
// View — renderização do dataset da lista (list/kanban/gallery/table/...).
// ---------------------------------------------------------------------------
export type ViewProps = {
  descriptor: EntityDescriptor;
  items: EntityRecord[];
  selectedId: string | null;
  density: "compact" | "comfortable";
  search: EntitySearch;
};

// ---------------------------------------------------------------------------
// Panel — painel analítico opaco (ex.: Funil, Métricas). Recebe descriptor +
// adapter. O core não interpreta dados, apenas hospeda.
// ---------------------------------------------------------------------------
export type PanelProps = {
  descriptor: EntityDescriptor;
  adapter: EntityAdapter;
  panelId: string;
};

// ---------------------------------------------------------------------------
// Dialog — modal contextual acionado por ação. Não conhece semantics.
// ---------------------------------------------------------------------------
export type DialogRuntimeProps = {
  descriptor: EntityDescriptor;
  adapter: EntityAdapter;
  entityId: string | null;
  actionId: string;
  onClose: () => void;
  onConfirm: (payload?: unknown) => void | Promise<void>;
};

// ---------------------------------------------------------------------------
// Action — execução via adapter.runAction. Núcleo apenas roteia.
// ---------------------------------------------------------------------------
export type ActionContext = {
  descriptor: EntityDescriptor;
  adapter: EntityAdapter;
  entityId: string | null;
  payload?: unknown;
};

export type ViewComponent = ComponentType<ViewProps>;
export type PanelComponent = ComponentType<PanelProps>;
export type DialogComponent = ComponentType<DialogRuntimeProps>;
export type ActionHandler = (ctx: ActionContext) => Promise<void>;
