// Workspace contexts — the 7 áreas de trabalho (Doc 04 §1.1).
// NUNCA aumentar além de 7 (regra doc 04 §6).
import {
  Home,
  Inbox,
  Building2,
  FileText,
  Radio,
  Users,
  Crown,
  type LucideIcon,
} from "lucide-react";

export type ContextId =
  | "inicio"
  | "pipeline"
  | "catalogo"
  | "conteudo"
  | "distribuicao"
  | "administracao"
  | "operacao";

export type SubTab = { label: string; to: string };

export type WorkspaceContext = {
  id: ContextId;
  label: string;
  icon: LucideIcon;
  root: string;
  matches: string[];
  subs: SubTab[];
  superOnly?: boolean;
};

export const CONTEXTS: WorkspaceContext[] = [
  {
    id: "inicio",
    label: "Início",
    icon: Home,
    root: "/admin",
    matches: ["/admin"],
    subs: [],
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: Inbox,
    root: "/admin/pipeline",
    matches: ["/admin/pipeline", "/admin/leads", "/admin/crm-operacoes"],
    subs: [
      { label: "Kanban", to: "/admin/pipeline" },
      { label: "CRM Operacional", to: "/admin/crm-operacoes" },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    icon: Building2,
    root: "/admin/imoveis",
    matches: ["/admin/imoveis", "/admin/lancamentos"],
    subs: [
      { label: "Imóveis", to: "/admin/imoveis" },
      { label: "Lançamentos", to: "/admin/lancamentos" },
    ],
  },
  {
    id: "conteudo",
    label: "Conteúdo",
    icon: FileText,
    root: "/admin/paginas",
    matches: [
      "/admin/site",
      "/admin/paginas",
      "/admin/blog",
      "/admin/formularios",
      "/admin/campanhas",
      "/admin/midias",
      "/admin/cms-auditoria",
      "/admin/cms-transferencia",
      "/admin/cms-inventario",
    ],
    subs: [
      { label: "Site", to: "/admin/site" },
      { label: "Páginas", to: "/admin/paginas" },
      { label: "Inventário", to: "/admin/cms-inventario" },
      { label: "Blog", to: "/admin/blog" },
      { label: "Formulários", to: "/admin/formularios" },
      { label: "Campanhas", to: "/admin/campanhas" },
      { label: "Mídias", to: "/admin/midias" },
      { label: "Versões", to: "/admin/cms-auditoria" },
    ],
  },
  {
    id: "distribuicao",
    label: "Distribuição",
    icon: Radio,
    root: "/admin/portais",
    // Predecessor evidence retained verbatim: matches: ["/admin/portais", "/admin/marketing"]
    matches: ["/admin/portais", "/admin/marketing", "/admin/tracking"],
    subs: [
      { label: "Portais", to: "/admin/portais" },
      { label: "Marketing", to: "/admin/marketing" },
      { label: "Tracking", to: "/admin/tracking" },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: Users,
    root: "/admin/corretores",
    matches: [
      "/admin/corretores",
      "/admin/equipes",
      "/admin/perfis",
      "/admin/cidades",
      "/admin/bairros",
      "/admin/origens",
      "/admin/motivos",
      "/admin/auditoria",
    ],
    subs: [
      { label: "Pessoas", to: "/admin/corretores" },
      { label: "Equipes", to: "/admin/equipes" },
      { label: "Perfis", to: "/admin/perfis" },
      { label: "Cidades", to: "/admin/cidades" },
      { label: "Bairros", to: "/admin/bairros" },
      { label: "Origens", to: "/admin/origens" },
      { label: "Motivos", to: "/admin/motivos" },
      { label: "Auditoria", to: "/admin/auditoria" },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    icon: Crown,
    root: "/super",
    matches: ["/super"],
    superOnly: true,
    subs: [
      { label: "Tenants", to: "/super" },
      { label: "Control Plane", to: "/super/control-plane" },
      { label: "Observabilidade", to: "/super/observabilidade" },
      { label: "DLQ", to: "/super/dlq" },
    ],
  },
];

export function contextFromPath(path: string): WorkspaceContext {
  let best: WorkspaceContext = CONTEXTS[0];
  let bestLen = -1;
  for (const context of CONTEXTS) {
    for (const match of context.matches) {
      if ((path === match || path.startsWith(match + "/")) && match.length > bestLen) {
        best = context;
        bestLen = match.length;
      }
    }
  }
  return best;
}
