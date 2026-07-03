// Content Workspace — tipos universais (Bloco 3.1).
// Workspace/Session/Editor operam APENAS sobre estes tipos.
// Nenhum componente conhece entidades específicas — tudo via EntityDescriptor + Adapter.

import type { CmsBlock } from "@/adapters/cms-legacy";

// -----------------------------------------------------------------------------
// Status universal — cada descriptor declara quais transições são válidas.
// -----------------------------------------------------------------------------
export type PublicationState =
  | "editing"           // usuário está alterando
  | "saved"             // autosave concluído (rascunho)
  | "ready_to_publish"  // rascunho válido, difere da versão publicada
  | "published"         // publicado sem alterações pendentes
  | "updated"           // publicado + rascunho pendente
  | "scheduled"         // agendado para publicação futura
  | "archived";         // arquivado

export type StatusValue = "draft" | "published" | "archived" | "scheduled" | "active" | "paused";

// -----------------------------------------------------------------------------
// Registro de item na lista + detalhe carregado para edição.
// -----------------------------------------------------------------------------
export type ContentEntityRecord = {
  id: string;
  titulo: string;
  slug: string | null;
  status: StatusValue;
  updated_at: string;
  published_at?: string | null;
  /** Campos extras livres para exibição na lista (ex.: tipo, categoria). */
  extra?: Record<string, unknown>;
};

export type ContentEntityDetail = ContentEntityRecord & {
  descricao: string | null;
  seo: Record<string, unknown>;
  blocks: CmsBlock[];
  /** Payload livre específico da entidade (ex.: campos de form, config de site). */
  data: Record<string, unknown>;
};

export type ContentDraft = {
  titulo: string;
  slug: string;
  descricao: string;
  status: StatusValue;
  seo: Record<string, unknown>;
  blocks: CmsBlock[];
  /** Payload livre — o Adapter interpreta. */
  data: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// Versionamento genérico (Bloco 3.1 §6: nunca conhece "page").
// -----------------------------------------------------------------------------
export type VersionRecord = {
  id: string;
  label: string;
  status: "draft" | "published" | "archived";
  createdAt: string;
  createdBy?: string | null;
  payload: unknown;
};

// -----------------------------------------------------------------------------
// Contrato do Adapter — TODO acesso a server fns passa por aqui.
// Session/Workspace importam APENAS este tipo, nunca server functions.
//
// Extensões da Etapa 4.1.a (todas opcionais — zero breaking change):
//   - `scope`: identificador da scopeTab ativa (declarada no descriptor).
//   - `filters`: mapa opaco de filtros declarativos (chave = filter.id).
//   - `runAction`: superfície uniforme para ações declaradas em `descriptor.actions`.
//   - `fetchFilterOptions`: fornece opções dinâmicas para filtros com `optionsFrom: "adapter"`.
//   Todas atendem o critério dos 3 domínios (Conteúdo · Operacional · Admin/Sistema).
// -----------------------------------------------------------------------------
export type ListParams = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  /** Etapa 4.1.a — scopeTab ativa (opcional; interpretada pelo adapter). */
  scope?: string;
  /** Etapa 4.1.a — filtros declarativos, chaveados por `filter.id`. */
  filters?: Record<string, unknown>;
};

export interface ContentEntityAdapter {
  /** Contexto/label opcional exposto pelo adapter (ex.: quantidade total). */
  fetchList(params: ListParams): Promise<ContentEntityRecord[]>;
  fetchDetail(id: string): Promise<ContentEntityDetail>;
  save(id: string | null, draft: ContentDraft, opts: { publish: boolean }): Promise<{ id: string }>;
  remove(id: string): Promise<void>;
  /** Retorna URL pública absoluta ou relativa. */
  publicUrl?(detail: ContentEntityDetail | null, draft: ContentDraft): string | null;
  listVersions?(id: string): Promise<VersionRecord[]>;
  restoreVersion?(id: string, versionId: string): Promise<void>;
  /** Etapa 4.1.a — executor genérico de ações declaradas em `descriptor.actions`. */
  runAction?(actionId: string, id: string | null, payload?: unknown): Promise<void>;
  /** Etapa 4.1.a — opções dinâmicas para filtros com `optionsFrom: "adapter"`. */
  fetchFilterOptions?(filterId: string): Promise<{ value: string; label: string }[]>;
}

// -----------------------------------------------------------------------------
// EntityDescriptor — 100% dos comportamentos específicos vivem AQUI.
// Adicionar entidade nova = registrar novo descriptor + adapter. Sem tocar em
// Workspace/Session/Editor.
// -----------------------------------------------------------------------------
// Etapa 4.1.c — continua AE-4.1-03 (Transitional). "lead" é o primeiro
// descriptor operacional real, exigido pela Instrução Normativa §2.1/§5.1
// como prova do runtime registry-driven. A migração da união para
// registry-based IDs permanece pactuada para Bloco 5.
export type EntityKind =
  | "pagina" | "post" | "form" | "campanha"
  | "midia" | "site" | "auditoria"
  | "lead";

export type BlockKind = CmsBlock["type"];

export type EditorKind =
  | "blocks"        // BlocksEditor (BlockEditor atual)
  | "richtext"      // Editor de conteúdo longo (blog)
  | "form-builder"  // Construtor de campos de formulário
  | "campaign"      // Formulário estruturado de campanha
  | "media"         // Metadados + preview do arquivo
  | "settings"      // Section-based config (site)
  | "audit"         // Read-only viewer
  | "structured";   // Etapa 4.1.a — editor genérico de registro operacional
                    // (guiado por `descriptor.recordSections`). Uso previsto:
                    // Conteúdo (metadados avançados de Formulários) · Operacional
                    // (Leads, Contratos, Comissões) · Administração (Perfis,
                    // Integrações, Chaves API, Billing).

export type ContentTab =
  | "conteudo" | "seo" | "preview" | "versoes" | "publicacao"
  | "detalhes" | "uso" | "campos" | "submissoes" | "segmentacao" | "metrica";

export type WorkspaceAction =
  | "criar" | "publicar" | "despublicar" | "arquivar" | "restaurar" | "duplicar"
  | "excluir" | "preview" | "versionar";

// -----------------------------------------------------------------------------
// Etapa 4.1.a — Capacidades Genéricas do Workspace
//
// Todas as capacidades abaixo são OPCIONAIS no descriptor. Nenhuma delas
// carrega nomes ou semântica de domínio. Cada uma passou pelo Multi-Domain
// Validation Test (Product UX Contract §12 · regra dos 3 domínios):
//
//   Capacidade        │ Conteúdo             │ Operacional         │ Admin/Sistema
//   ──────────────────┼──────────────────────┼─────────────────────┼──────────────────
//   views             │ Mídias (gallery)     │ Pipeline (kanban)   │ Auditoria (table)
//   scopeTabs         │ Blog (drafts/pub)    │ Leads (ativos/desc) │ Perfis (ativos/rev)
//   filters           │ Blog (autor)         │ Leads (corretor)    │ Auditoria (módulo)
//   actions           │ Página (publicar)    │ Lead (avancar)      │ Perfil (revogar)
//   recordSections    │ Formulário (config)  │ Lead (contato)      │ Chave API (metadados)
//   panels            │ Blog (leituras)      │ Pipeline (funil)    │ Sistema (uso/quota)
// -----------------------------------------------------------------------------

/** Modos de visualização declarativos. Identificadores reservados para
 *  crescimento futuro sem breaking change: "calendar", "timeline", "map". */
export type EntityViewMode = "list" | "kanban" | "gallery" | "table";

export type KanbanViewSpec = {
  /** Campo do EntityRecord (ou de `extra`) usado para agrupar cards. */
  groupBy: string;
  columns: { id: string; label: string; accent?: string }[];
  /** Reservado para 4.1.b+ — swimlanes horizontais. */
  swimlanes?: unknown;
  /** Reservado — agregações por coluna (soma, média, contagem). */
  aggregation?: unknown;
};

export type GalleryViewSpec = { thumbField: string };
export type TableViewSpec = { columns: { field: string; label: string }[] };

export type EntityViewsSpec = {
  default: EntityViewMode;
  available: EntityViewMode[];
  kanban?: KanbanViewSpec;
  gallery?: GalleryViewSpec;
  table?: TableViewSpec;
};

/** Abas de escopo da lista (recortes do dataset). Distintas das `tabs` do
 *  editor (que são do painel de detalhe). Se `panel` estiver presente, o
 *  Workspace renderiza esse painel analítico no lugar da lista. */
export type ScopeTabSpec = {
  id: string;
  label: string;
  /** Filtro opaco interpretado pelo adapter em `fetchList({ scope })`. */
  scope?: Record<string, unknown>;
  /** Identificador de `descriptor.panels[*].id` a renderizar. */
  panel?: string;
};

/** Filtros declarativos. UI gerada pelo núcleo; interpretação pelo adapter. */
export type FilterSpec = {
  id: string;
  label: string;
  kind: "select" | "text" | "date-range" | "enum-select";
  optionsFrom?:
    | "adapter"
    | { static: { value: string; label: string }[] };
};

/** Predicado declarativo para ativação condicional de ações.
 *  Etapa 4.1.a mantém apenas dois formatos declarativos — sem escape hatch
 *  funcional no core (`*Fn` proibido por §13 do Plano Executivo). */
export type ActionPredicate =
  | { always: true }
  | { statusIn: string[] }
  | { statusNotIn: string[] }
  | { field: string; op: "eq" | "neq" | "in" | "notIn"; value: unknown };

/** Especificação declarativa de ação. Substitui o enum fechado
 *  `WorkspaceAction` quando presente; o enum permanece para retrocompat. */
export type ActionSpec = {
  id: string;
  label: string;
  /** Nome no lucide-icons (interpretado pelo renderer). */
  icon?: string;
  intent?: "primary" | "default" | "destructive";
  /** Ativação condicional; ausente = sempre habilitada. */
  enabledWhen?: ActionPredicate;
  /** Identificador de dialog no Dialog Registry (Etapa 4.1.b). */
  dialog?: string;
};

/** Seção declarativa do editor `structured` (registro operacional). */
export type RecordFieldKind =
  | "text" | "email" | "phone" | "money" | "link" | "readonly" | "textarea";

export type RecordFieldSpec = {
  id: string;                  // path dentro de detail.data
  label: string;
  kind: RecordFieldKind;
  /** Predicado declarativo (não função) para links: adapter resolve o href. */
  linkTemplate?: string;       // ex.: "mailto:{value}", "tel:{value}"
};

export type RecordSectionSpec = {
  id: string;
  label: string;
  fields: RecordFieldSpec[];
};

/** Painel analítico opaco. O core apenas hospeda; o descriptor/adapter fornece
 *  o componente. Identificado por `id` em Panel Registry (Etapa 4.1.b). */
export type PanelSpec = {
  id: string;
  label?: string;
};

export type EntityDescriptor = {
  kind: EntityKind;
  singular: string;
  plural: string;
  route: string;
  publicPathPrefix: string;

  // ------ metadados de UI ------
  editorKind: EditorKind;
  tabs: ContentTab[];
  supportedBlocks: BlockKind[];
  layoutMode: "split" | "single";

  // ------ workflow (§7 do prompt) ------
  workflowStates: PublicationState[];
  allowedTransitions: Partial<Record<PublicationState, PublicationState[]>>;
  defaultStatus: StatusValue;

  // ------ ações + permissões (§9) ------
  supportedActions: WorkspaceAction[];
  permissionsModule: string;   // ex: "cms.paginas"
  featureFlags?: string[];

  // ------ status vocabulary (algumas entidades usam active/paused em vez de published/draft) ------
  statusVocabulary: { label: string; value: StatusValue }[];

  // ------ Etapa 4.1.a — capacidades genéricas (todas opcionais, retrocompat total) ------
  /** Visualizações declarativas (list/kanban/gallery/table). */
  views?: EntityViewsSpec;
  /** Abas de escopo da lista (Ativos/Arquivados/Análise/etc). */
  scopeTabs?: ScopeTabSpec[];
  /** Filtros declarativos exibidos na toolbar da lista. */
  filters?: FilterSpec[];
  /** Catálogo declarativo de ações (substitui `supportedActions` quando presente). */
  actions?: ActionSpec[];
  /** Seções do editor `structured`. Ignoradas para outros `editorKind`. */
  recordSections?: RecordSectionSpec[];
  /** Painéis analíticos anexos, referenciados por `scopeTabs[*].panel`. */
  panels?: PanelSpec[];

  ready: true;  // §2 do prompt — nada mais pode ser "false"
};

// -----------------------------------------------------------------------------
// Registro completo (§9): descriptor + adapter + permissions + flags.
// -----------------------------------------------------------------------------
export type EntityRegistration = {
  descriptor: EntityDescriptor;
  /** Factory chamada dentro de componente React (usa hooks internos). */
  useAdapter: () => ContentEntityAdapter;
};
