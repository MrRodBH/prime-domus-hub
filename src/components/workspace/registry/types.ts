// Registry · Contratos de props (Fase 6 · Bloco 4 · Etapa 4.1.b).
//
// REGRA (Instrução Normativa §6.2): tipos são neutros — não conhecem
// domínio. Descriptor/Adapter/Record são o único vocabulário do runtime.
import type { ComponentType } from "react";
import type {
  EntityDescriptor,
  EntityRecord,
  EntityAdapter,
  EntitySearch,
} from "@/components/workspace/entities";

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
