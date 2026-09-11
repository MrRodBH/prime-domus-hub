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
  CircleDollarSign, Activity, LifeBuoy, CreditCard,
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
  search?: Record<string, string>;
};

export const CONTEXTS: WorkspaceContext[] = [
  {
    id: "inicio",
    label: "Dashboard",
    icon: Home,
    root: "/admin",
    matches: ["/admin"],
    subs: [],
  },
  {
    id: "pipeline",
    label: "Funil de vendas",
    icon: Inbox,
    root: "/admin/pipeline",
    matches: ["/admin/pipeline", "/admin/leads", "/admin/crm-operacoes"],
    subs: [
      { label: "Quadro de oportunidades", to: "/admin/pipeline" },
      { label: "Operação comercial", to: "/admin/crm-operacoes" },
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
    root: "/admin/site",
    matches: [
      "/admin/site", "/admin/domains",
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
      { label: "Website", to: "/admin/site" },
      { label: "Domínios", to: "/admin/domains" },
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
      { label: "Rastreamento", to: "/admin/tracking" },
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    icon: Users,
    root: "/admin/corretores",
    matches: [
      "/admin/memberships",
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
      { label: "Acessos da equipe", to: "/admin/memberships" },
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
    label: "Super Admin",
    icon: Crown,
    root: "/super",
    matches: ["/super"],
    superOnly: true,
    subs: [
      { label: "Dashboard e cadastros", to: "/super" },
      { label: "Controle da plataforma", to: "/super/control-plane" },
      { label: "Observabilidade", to: "/super/observabilidade" },
      { label: "Falhas pendentes", to: "/super/dlq" },
    ],
  },
];

export function contextFromPath(path: string): WorkspaceContext {
  path = tenantRelativeAdminPath(path);
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

export function tenantRelativeAdminPath(path: string): string {
  const match = path.match(/^\/[^/]+(\/admin(?:\/.*)?$)/);
  return match?.[1] ?? path;
}

// Owner-approved global navigation: direct lateral entries, never tenant shortcuts.
export const SUPER_NAVIGATION: WorkspaceContext[] = [
  { label: "Dashboard", root: "/super", icon: Home, search: { view: "dashboard" } },
  { label: "Tenants", root: "/super", icon: Building2, search: { view: "tenants" } },
  { label: "Planos", root: "/super", icon: CreditCard, search: { view: "plans" } },
  { label: "Financeiro", root: "/super/control-plane", icon: CircleDollarSign, search: { section: "financeiro" } },
  { label: "Consumo", root: "/super/control-plane", icon: Activity, search: { section: "consumo" } },
  { label: "Observabilidade", root: "/super/observabilidade", icon: Radio },
  { label: "DLQ", root: "/super/dlq", icon: Inbox },
  { label: "Atendimento aos clientes", root: "/super/control-plane", icon: LifeBuoy, search: { section: "suporte" } },
].map(item => ({ ...item, search: item.search as WorkspaceContext["search"], id: "operacao", matches: [item.root], subs: [], superOnly: true }));

export function workspaceItemActive(item: WorkspaceContext, path: string, search: Record<string, unknown>) {
  path = tenantRelativeAdminPath(path);
  if (item.superOnly && item.subs.length === 0) {
    if (path.replace(/\/$/, "") !== item.root) return false;
    return Object.entries(item.search ?? {}).every(([key, value]) => (search[key] ?? (key === "view" ? "dashboard" : "")) === value);
  }
  return item.id === contextFromPath(path).id;
}
export function workspaceContexts(isSuper: boolean | undefined, impersonating: string | null) {
  if (isSuper === undefined) return [];
  if (isSuper) return SUPER_NAVIGATION;
  return CONTEXTS.filter(c => !c.superOnly || isSuper);
}
