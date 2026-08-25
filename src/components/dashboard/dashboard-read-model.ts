import type { DashboardPeriod } from "./search-schema";

export type DashboardMetricDefinitionSource = {
  metricKey: string;
  label: string;
  formula: string;
  periodBoundary: "inclusive_start_inclusive_end" | "current_snapshot";
  cardinality: "scalar" | "grouped_by_day" | "grouped_by_source";
};

export type DashboardStatsSource = {
  resumo: {
    leads: { atual: number; anterior: number; deltaPct: number };
    visitas: { atual: number; conversao: number };
    propostas: { atual: number; conversao: number };
    vendas: { atual: number; perdidas: number; descartadas: number; vgv: number };
  };
  funil: Array<{ etapa: string; quantidade: number; conversao: number; perda: number }>;
  alertas: {
    semAtendimento: number;
    semFollowup: number;
    visitasSemFeedback: number;
    propostasParadas: number;
  };
  serie: Array<{
    data: string;
    leads: number;
    visitas: number;
    propostas: number;
    vendas: number;
    vgv: number;
  }>;
  origens: Array<{ nome: string; quantidade: number; percentual: number; conversao: number }>;
  taxas: Array<{ label: string; atual: number; meta: number }>;
  desempenho: {
    leads: number;
    visitas: number;
    propostas: number;
    vendas: number;
    vgv: number;
  } | null;
  ranking: Array<{
    corretor_id: string;
    user_id: string | null;
    nome: string;
    leads: number;
    visitas: number;
    propostas: number;
    vendas: number;
    conversao: number;
    vgv: number;
  }>;
  insights: Array<{
    tipo: "performance" | "gargalo" | "oportunidade" | "alerta" | "previsao";
    mensagem: string;
  }>;
  isPrivileged: boolean;
  effectiveScope: string;
  actorKind: string;
  timezone: string;
  metricRegistry: DashboardMetricDefinitionSource[];
  operationalMetrics: {
    activeProperties: number;
    publishedProperties: number;
    marketingIngestionEvents: number;
    portalPublications: number;
    crmAlerts: Record<string, number>;
  };
  dataCompleteness: "complete";
};

export type DashboardMetricReadModel = {
  key: string;
  label: string;
  value: number;
  formattedValue: string;
  detail: string;
  tone: "info" | "success" | "warning" | "brand";
};

export type DashboardReadModel = {
  summary: DashboardMetricReadModel[];
  funnel: DashboardStatsSource["funil"];
  series: DashboardStatsSource["serie"];
  sources: DashboardStatsSource["origens"];
  rates: DashboardStatsSource["taxas"];
  ranking: Array<Omit<DashboardStatsSource["ranking"][number], "corretor_id" | "user_id">>;
  insights: DashboardStatsSource["insights"];
  alerts: Array<{ key: string; label: string; value: number }>;
  performance: DashboardStatsSource["desempenho"];
  registry: DashboardMetricDefinitionSource[];
  operations: Array<{ key: string; label: string; value: number }>;
  dataCompleteness: "complete";
  timezone: string;
  hasActivity: boolean;
};

export type DashboardReadErrorKind = "denied" | "unavailable" | "error";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatDashboardCurrency(value: number) {
  return currency.format(Number.isFinite(value) ? value : 0);
}

export function toDashboardReadModel(source: DashboardStatsSource): DashboardReadModel {
  const alerts = [
    {
      key: "first-response",
      label: "Primeira resposta atrasada",
      value: source.alertas.semAtendimento,
    },
    { key: "follow-up", label: "Follow-up atrasado", value: source.alertas.semFollowup },
    {
      key: "visit-feedback",
      label: "Feedback de visita pendente",
      value: source.alertas.visitasSemFeedback,
    },
    {
      key: "proposal-review",
      label: "Proposta sem atualização",
      value: source.alertas.propostasParadas,
    },
  ];
  const crmAlerts = Object.values(source.operationalMetrics.crmAlerts).reduce(
    (total, value) => total + (Number.isFinite(value) ? value : 0),
    0,
  );
  const summary: DashboardMetricReadModel[] = [
    {
      key: "leads",
      label: "Leads recebidos",
      value: source.resumo.leads.atual,
      formattedValue: String(source.resumo.leads.atual),
      detail: `${source.resumo.leads.deltaPct >= 0 ? "+" : ""}${source.resumo.leads.deltaPct}% vs. período anterior`,
      tone: "info",
    },
    {
      key: "visits",
      label: "Visitas alcançadas",
      value: source.resumo.visitas.atual,
      formattedValue: String(source.resumo.visitas.atual),
      detail: `${source.resumo.visitas.conversao}% dos leads`,
      tone: "brand",
    },
    {
      key: "proposals",
      label: "Propostas alcançadas",
      value: source.resumo.propostas.atual,
      formattedValue: String(source.resumo.propostas.atual),
      detail: `${source.resumo.propostas.conversao}% das visitas`,
      tone: "warning",
    },
    {
      key: "sales",
      label: "Vendas ganhas",
      value: source.resumo.vendas.atual,
      formattedValue: String(source.resumo.vendas.atual),
      detail: formatDashboardCurrency(source.resumo.vendas.vgv),
      tone: "success",
    },
  ];
  const operations = [
    {
      key: "active-properties",
      label: "Imóveis ativos",
      value: source.operationalMetrics.activeProperties,
    },
    {
      key: "published-properties",
      label: "Imóveis publicados",
      value: source.operationalMetrics.publishedProperties,
    },
    {
      key: "marketing-events",
      label: "Eventos de marketing",
      value: source.operationalMetrics.marketingIngestionEvents,
    },
    {
      key: "portal-publications",
      label: "Publicações em portais",
      value: source.operationalMetrics.portalPublications,
    },
    { key: "crm-alerts", label: "Alertas CRM abertos", value: crmAlerts },
  ];
  const activityValues = [
    ...summary.map((metric) => metric.value),
    ...source.funil.map((item) => item.quantidade),
    ...source.origens.map((item) => item.quantidade),
    ...operations.map((metric) => metric.value),
  ];

  return {
    summary,
    funnel: source.funil.map((item) => ({ ...item })),
    series: source.serie.map((item) => ({ ...item })),
    sources: source.origens.map((item) => ({ ...item })),
    rates: source.taxas.map((item) => ({ ...item })),
    ranking: source.ranking.map(({ corretor_id: _brokerId, user_id: _userId, ...row }) => row),
    insights: source.insights.map((item) => ({ ...item })),
    alerts,
    performance: source.desempenho ? { ...source.desempenho } : null,
    registry: source.metricRegistry.map((definition) => ({
      metricKey: definition.metricKey,
      label: definition.label,
      formula: definition.formula,
      periodBoundary: definition.periodBoundary,
      cardinality: definition.cardinality,
    })),
    operations,
    dataCompleteness: source.dataCompleteness,
    timezone: source.timezone,
    hasActivity: activityValues.some((value) => value > 0),
  };
}

export function dashboardDateRange(
  period: DashboardPeriod,
  custom: { from?: string; to?: string },
  now = new Date(),
) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "7d") start.setDate(start.getDate() - 6);
  if (period === "30d") start.setDate(start.getDate() - 29);
  if (period === "month") start.setDate(1);
  if (period === "year") start.setMonth(0, 1);
  if (period === "custom" && custom.from && custom.to) {
    const customStart = new Date(`${custom.from}T00:00:00`);
    const customEnd = new Date(`${custom.to}T23:59:59.999`);
    return { inicio: customStart.toISOString(), fim: customEnd.toISOString() };
  }

  return { inicio: start.toISOString(), fim: end.toISOString() };
}

export function classifyDashboardReadError(error: unknown): DashboardReadErrorKind {
  const message = (error instanceof Error ? error.message : String(error ?? "")).toLocaleLowerCase(
    "pt-BR",
  );
  if (
    message.includes("permission_denied") ||
    message.includes("permission denied") ||
    message.includes("filter_denied") ||
    message.includes("forbidden") ||
    message.includes("acesso negado")
  ) {
    return "denied";
  }
  if (
    message.includes("tenant selection required") ||
    message.includes("invalid tenant") ||
    message.includes("broker binding required") ||
    message.includes("broker_binding_required") ||
    message.includes("workspace indisponível")
  ) {
    return "unavailable";
  }
  return "error";
}
