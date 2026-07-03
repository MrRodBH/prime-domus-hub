// Workspace · Entities — superfície pública genérica do núcleo (Fase 6 · Bloco 4 · Etapa 4.0).
//
// Este barrel é o ÚNICO ponto de importação autorizado para consumidores
// do Workspace (rotas, futuros descriptors de Pipeline/Catálogo/etc).
// Nenhuma rota nova pode importar de "@/components/content/*" diretamente.
//
// Renomeações canônicas (Content* → Entity*) — congelam o vocabulário do
// núcleo genérico definido no Product UX Contract:
//
//   ContentWorkspace         → EntityWorkspace
//   ContentList              → EntityList
//   ContentEditor            → EntityEditor
//   ContentEditorEmpty       → EntityEditorEmpty
//   ContentSessionProvider   → EntitySessionProvider
//   useContentSession        → useEntitySession
//   ContentPreviewPane       → EntityPreviewPane
//   ContentEntityAdapter     → EntityAdapter
//   ContentEntityRecord      → EntityRecord
//   ContentEntityDetail      → EntityDetail
//   ContentDraft             → EntityDraft
//   ContentSearch            → EntitySearch
//   contentSearchSchema      → entitySearchSchema
//
// A relocação física dos módulos internos (List/Editor/Session/…) para
// dentro de `src/components/workspace/entities/` está documentada como
// Architectural Exception AE-4.0-01 e será executada nas etapas 4.1–4.5,
// à medida que novos descriptors forem introduzidos. Nesta etapa, o
// contrato de import é canonizado — o layout físico segue a evolução.

export { EntityWorkspace } from "./EntityWorkspace";

// Composição interna do Workspace — exposta apenas por nome canônico.
export { ContentList as EntityList } from "@/components/content/ContentList";
export {
  ContentEditor as EntityEditor,
  ContentEditorEmpty as EntityEditorEmpty,
} from "@/components/content/ContentEditor";
export {
  ContentSessionProvider as EntitySessionProvider,
  useContentSession as useEntitySession,
  type ContentSessionValue as EntitySessionValue,
} from "@/components/content/session";
export { ContentPreviewPane as EntityPreviewPane } from "@/components/content/ContentPreviewPane";

// Registry e adapters — descoberta de descriptors + factories de adapter.
export { ENTITIES, descriptorByRoute } from "@/components/content/entity-registry";
export { getRegistration, ENTITY_ADAPTERS, ENTITY_REGISTRY } from "@/components/content/adapters";

// Memória do Workspace (Product UX Contract §3) — recents + favorites.
export {
  pushRecent,
  getRecents,
  getFavorites,
  toggleFavorite,
  isFavorite,
  type RecentEntry,
} from "@/components/content/recents";

// URL search-state canônico.
export { contentSearchSchema as entitySearchSchema } from "@/components/content/search-schema";
export type { ContentSearch as EntitySearch } from "@/components/content/search-schema";

// Tipos universais do núcleo.
export type {
  EntityDescriptor,
  EntityKind,
  EntityRegistration,
  ContentEntityAdapter as EntityAdapter,
  ContentEntityRecord as EntityRecord,
  ContentEntityDetail as EntityDetail,
  ContentDraft as EntityDraft,
  PublicationState,
  StatusValue,
  VersionRecord,
  ContentTab as EntityTab,
  EditorKind,
  WorkspaceAction,
  BlockKind,
  ListParams,
  // Etapa 4.1.a — capacidades genéricas do Workspace.
  EntityViewMode,
  EntityViewsSpec,
  KanbanViewSpec,
  GalleryViewSpec,
  TableViewSpec,
  ScopeTabSpec,
  FilterSpec,
  ActionSpec,
  ActionPredicate,
  RecordSectionSpec,
  RecordFieldSpec,
  RecordFieldKind,
  PanelSpec,
} from "@/components/content/types";
