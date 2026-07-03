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
    // Etapa 4.1.c — cross-domain evidence (Conteúdo).
    // Mesma forma declarativa `FilterSpec` usada por Lead (Operacional) e
    // Auditoria (Admin). Nenhum caminho novo no core; consumo é opcional
    // (o adapter pode ignorar os filtros que não conhecer).
    filters: [
      {
        id: "categoria",
        label: "Categoria",
        kind: "select",
        optionsFrom: "adapter",
      },
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
    // Etapa 4.1.c — cross-domain evidence (Admin/Sistema).
    // Filtro declarativo com opções estáticas — mesma superfície usada por
    // Blog (Conteúdo) e Lead (Operacional). Nenhum caminho especial no core.
    filters: [
      {
        id: "modulo",
        label: "Módulo",
        kind: "select",
        optionsFrom: {
          static: [
            { value: "cms.paginas", label: "Páginas" },
            { value: "cms.midias", label: "Mídias" },
            { value: "cms.formularios", label: "Formulários" },
            { value: "admin.leads", label: "Leads" },
          ],
        },
      },
    ],
    ready: true,
  },
  // Etapa 4.1.c — Descriptor operacional real (Instrução Normativa §5.1).
  // Usa 100% das capacidades da 4.1.a. Nenhum EntityKind adicional foi
  // criado além do previsto em AE-4.1-03; nenhum registry novo; nenhuma
  // exceção; nenhuma lógica no workspace. O adapter cumpre o contrato
  // pré-existente (fetchList/fetchDetail/save/remove/runAction/fetchFilterOptions).
  lead: {
    kind: "lead",
    singular: "Lead",
    plural: "Leads",
    route: "/admin/leads-workspace",
    publicPathPrefix: "",
    editorKind: "structured",
    tabs: ["detalhes"],
    supportedBlocks: [],
    layoutMode: "split",
    workflowStates: ["saved"],
    allowedTransitions: {},
    defaultStatus: "active",
    supportedActions: [],
    permissionsModule: "admin.leads",
    statusVocabulary: [
      { label: "Ativo", value: "active" },
      { label: "Descartado", value: "paused" },
    ],
    views: {
      default: "kanban",
      available: ["list", "kanban"],
      kanban: {
        groupBy: "leadStatus",
        columns: [
          { id: "novo",         label: "Novo" },
          { id: "conversando",  label: "Conversando" },
          { id: "visita",       label: "Visita" },
          { id: "proposta",     label: "Proposta" },
          { id: "ganho",        label: "Ganho" },
          { id: "perdido",      label: "Perdido" },
        ],
      },
    },
    scopeTabs: [
      { id: "ativos",      label: "Ativos",      scope: { archived: false } },
      { id: "descartados", label: "Descartados", scope: { archived: true } },
      { id: "analise",     label: "Análise",     panel: "lead.funil" },
    ],
    filters: [
      { id: "corretor", label: "Corretor", kind: "select", optionsFrom: "adapter" },
      { id: "origem",   label: "Origem",   kind: "select", optionsFrom: "adapter" },
    ],
    actions: [
      { id: "avancar",   label: "Avançar",   icon: "ArrowRight", intent: "primary",
        enabledWhen: { field: "leadStatus", op: "notIn", value: ["ganho","perdido","descartado"] } },
      { id: "descartar", label: "Descartar", icon: "Trash2", intent: "destructive",
        enabledWhen: { field: "leadStatus", op: "notIn", value: ["descartado"] } },
      { id: "restaurar", label: "Restaurar", icon: "Undo2",
        enabledWhen: { field: "leadStatus", op: "eq", value: "descartado" } },
    ],
    recordSections: [
      { id: "contato", label: "Contato", fields: [
        { id: "nome",     label: "Nome",     kind: "readonly" },
        { id: "email",    label: "Email",    kind: "email", linkTemplate: "mailto:{value}" },
        { id: "telefone", label: "Telefone", kind: "phone", linkTemplate: "tel:{value}" },
      ]},
      { id: "comercial", label: "Comercial", fields: [
        { id: "leadStatus",       label: "Status",         kind: "readonly" },
        { id: "origem",           label: "Origem",         kind: "readonly" },
        { id: "imovel",           label: "Imóvel",         kind: "readonly" },
        { id: "valor_estimado",   label: "Valor estimado", kind: "money" },
        { id: "mensagem",         label: "Mensagem",       kind: "textarea" },
      ]},
    ],
    panels: [
      { id: "lead.funil", label: "Funil de conversão" },
    ],
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
