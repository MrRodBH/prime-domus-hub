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
// -----------------------------------------------------------------------------
export type ListParams = {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
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
}

// -----------------------------------------------------------------------------
// EntityDescriptor — 100% dos comportamentos específicos vivem AQUI.
// Adicionar entidade nova = registrar novo descriptor + adapter. Sem tocar em
// Workspace/Session/Editor.
// -----------------------------------------------------------------------------
export type EntityKind =
  | "pagina" | "post" | "form" | "campanha"
  | "midia" | "site" | "auditoria";

export type BlockKind = CmsBlock["type"];

export type EditorKind =
  | "blocks"        // BlocksEditor (BlockEditor atual)
  | "richtext"      // Editor de conteúdo longo (blog)
  | "form-builder"  // Construtor de campos de formulário
  | "campaign"      // Formulário estruturado de campanha
  | "media"         // Metadados + preview do arquivo
  | "settings"      // Section-based config (site)
  | "audit";        // Read-only viewer

export type ContentTab =
  | "conteudo" | "seo" | "preview" | "versoes" | "publicacao"
  | "detalhes" | "uso" | "campos" | "submissoes" | "segmentacao" | "metrica";

export type WorkspaceAction =
  | "criar" | "publicar" | "despublicar" | "arquivar" | "restaurar" | "duplicar"
  | "excluir" | "preview" | "versionar";

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
