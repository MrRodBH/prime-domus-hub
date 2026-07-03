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
  matches: string[]; // pathname prefixes that map to this context
  subs: SubTab[]; // horizontal tabs shown in header when > 1
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
    matches: ["/admin/pipeline", "/admin/leads"],
    subs: [],
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
    ],
    subs: [
      { label: "Site", to: "/admin/site" },
      { label: "Páginas", to: "/admin/paginas" },
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
    matches: ["/admin/portais"],
    subs: [{ label: "Portais", to: "/admin/portais" }],
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
      { label: "Observabilidade", to: "/super/observabilidade" },
      { label: "DLQ", to: "/super/dlq" },
    ],
  },
];

export function contextFromPath(path: string): WorkspaceContext {
  // Longest-match wins so /admin/leads doesn't fall into "inicio" (/admin).
  let best: WorkspaceContext = CONTEXTS[0];
  let bestLen = -1;
  for (const c of CONTEXTS) {
    for (const m of c.matches) {
      if ((path === m || path.startsWith(m + "/")) && m.length > bestLen) {
        best = c;
        bestLen = m.length;
      }
    }
  }
  return best;
}
