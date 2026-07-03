// Entity Registry — todas as entidades do Workspace de Conteúdo (Bloco 3.1 §2/§9).
// Regras:
//   - Toda entidade tem descriptor completo + workflow + tabs + editorKind.
//   - Nenhuma entidade é "ready: false" — coexistência CMS antigo x novo encerrada.
//   - Workspace/Session/Editor consultam apenas descriptors — nunca `if (kind === ...)`.

import type { EntityDescriptor, EntityKind } from "./types";

const STATUS_STANDARD = [
  { label: "Rascunho", value: "draft" as const },
  { label: "Publicado", value: "published" as const },
  { label: "Arquivado", value: "archived" as const },
];

const STATUS_CAMPAIGN = [
  { label: "Rascunho", value: "draft" as const },
  { label: "Ativa", value: "active" as const },
  { label: "Pausada", value: "paused" as const },
  { label: "Arquivada", value: "archived" as const },
];

// Workflow universal — cada descriptor escolhe o subset relevante.
const WORKFLOW_FULL = [
  "editing", "saved", "ready_to_publish", "published", "updated", "archived",
] as const;

const TRANSITIONS_STANDARD: EntityDescriptor["allowedTransitions"] = {
  editing: ["saved"],
  saved: ["editing", "ready_to_publish"],
  ready_to_publish: ["editing", "published"],
  published: ["editing", "updated", "archived"],
  updated: ["editing", "published"],
  archived: ["saved"],
};

export const ENTITIES: Record<EntityKind, EntityDescriptor> = {
  pagina: {
    kind: "pagina",
    singular: "Página",
    plural: "Páginas",
    route: "/admin/paginas",
    publicPathPrefix: "/p/",
    editorKind: "blocks",
    tabs: ["conteudo", "seo", "preview", "versoes", "publicacao"],
    supportedBlocks: ["hero","richtext","image","gallery","video","cta","form","features","faq","spacer"],
    layoutMode: "split",
    workflowStates: [...WORKFLOW_FULL],
    allowedTransitions: TRANSITIONS_STANDARD,
    defaultStatus: "draft",
    supportedActions: ["criar","publicar","despublicar","arquivar","restaurar","duplicar","excluir","preview","versionar"],
    permissionsModule: "cms.paginas",
    statusVocabulary: STATUS_STANDARD,
    ready: true,
  },
  post: {
    kind: "post",
    singular: "Post",
    plural: "Blog",
    route: "/admin/blog",
    publicPathPrefix: "/blog/",
    editorKind: "richtext",
    tabs: ["conteudo", "seo", "preview", "versoes", "publicacao"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: [...WORKFLOW_FULL],
    allowedTransitions: TRANSITIONS_STANDARD,
    defaultStatus: "draft",
    supportedActions: ["criar","publicar","despublicar","arquivar","excluir","preview","versionar"],
    permissionsModule: "cms.paginas",
    statusVocabulary: [
      { label: "Rascunho", value: "draft" },
      { label: "Publicado", value: "published" },
    ],
    ready: true,
  },
  form: {
    kind: "form",
    singular: "Formulário",
    plural: "Formulários",
    route: "/admin/formularios",
    publicPathPrefix: "/f/",
    editorKind: "form-builder",
    tabs: ["conteudo", "campos", "submissoes", "publicacao"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: ["editing", "saved", "ready_to_publish", "published", "updated", "archived"],
    allowedTransitions: TRANSITIONS_STANDARD,
    defaultStatus: "draft",
    supportedActions: ["criar","publicar","despublicar","arquivar","excluir"],
    permissionsModule: "cms.formularios",
    statusVocabulary: STATUS_STANDARD,
    ready: true,
  },
  campanha: {
    kind: "campanha",
    singular: "Campanha",
    plural: "Campanhas",
    route: "/admin/campanhas",
    publicPathPrefix: "",
    editorKind: "campaign",
    tabs: ["conteudo", "segmentacao", "metrica", "publicacao"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: ["editing", "saved", "ready_to_publish", "published", "updated", "archived"],
    allowedTransitions: {
      editing: ["saved"],
      saved: ["editing", "ready_to_publish"],
      ready_to_publish: ["editing", "published"],
      published: ["editing", "updated", "archived"],
      updated: ["editing", "published"],
      archived: ["saved"],
    },
    defaultStatus: "draft",
    supportedActions: ["criar","publicar","despublicar","arquivar","excluir"],
    permissionsModule: "cms.campanhas",
    statusVocabulary: STATUS_CAMPAIGN,
    ready: true,
  },
  midia: {
    kind: "midia",
    singular: "Mídia",
    plural: "Biblioteca de Mídias",
    route: "/admin/midias",
    publicPathPrefix: "",
    editorKind: "media",
    tabs: ["detalhes", "uso"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: ["editing", "saved"],
    allowedTransitions: { editing: ["saved"], saved: ["editing"] },
    defaultStatus: "published",
    supportedActions: ["criar","excluir","duplicar"],
    permissionsModule: "cms.midias",
    statusVocabulary: [{ label: "Ativo", value: "published" }],
    ready: true,
  },
  site: {
    kind: "site",
    singular: "Seção do site",
    plural: "Site & Configurações",
    route: "/admin/site",
    publicPathPrefix: "",
    editorKind: "settings",
    tabs: ["conteudo", "versoes", "publicacao"],
    supportedBlocks: [],
    layoutMode: "split",
    // Site opera com draft ↔ published (via site_settings_versions).
    workflowStates: ["editing", "saved", "ready_to_publish", "published", "updated"],
    allowedTransitions: {
      editing: ["saved"],
      saved: ["editing", "ready_to_publish"],
      ready_to_publish: ["editing", "published"],
      published: ["editing", "updated"],
      updated: ["editing", "published"],
    },
    defaultStatus: "published",
    supportedActions: ["publicar", "restaurar", "versionar", "preview"],
    permissionsModule: "cms.configuracoes",
    statusVocabulary: [
      { label: "Publicado", value: "published" },
      { label: "Rascunho", value: "draft" },
    ],
    ready: true,
  },
  auditoria: {
    kind: "auditoria",
    singular: "Evento",
    plural: "Auditoria",
    route: "/admin/auditoria",
    publicPathPrefix: "",
    editorKind: "audit",
    tabs: ["detalhes"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: ["saved"],
    allowedTransitions: {},
    defaultStatus: "published",
    supportedActions: [],
    permissionsModule: "cms.versoes",
    statusVocabulary: [{ label: "Registrado", value: "published" }],
    ready: true,
  },
};

export function descriptorByRoute(pathname: string): EntityDescriptor | null {
  for (const d of Object.values(ENTITIES)) {
    if (pathname === d.route || pathname.startsWith(d.route + "/") || pathname.startsWith(d.route + "?")) {
      return d;
    }
  }
  return null;
}

// Re-exports para compat com imports pré-3.1.
export type { EntityDescriptor, EntityKind, ContentEntityRecord, ContentEntityDetail, BlockKind } from "./types";
