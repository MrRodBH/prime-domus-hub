export const DASHBOARD_TIMEZONE = "America/Sao_Paulo" as const;

export const DASHBOARD_METRIC_KEYS = [
  "leads_received",
  "visits_reached",
  "proposals_reached",
  "sales_won",
  "sales_lost",
  "leads_discarded",
  "won_value",
  "active_properties",
  "published_properties",
  "marketing_ingestion_events",
  "portal_publications",
  "first_response_overdue",
  "follow_up_overdue",
  "visit_feedback_overdue",
  "proposal_review_overdue",
] as const;

export type DashboardMetricKey = (typeof DASHBOARD_METRIC_KEYS)[number];
export type DashboardMetricScope = "own" | "team" | "global";

export type DashboardMetricDefinition = {
  readonly metricKey: DashboardMetricKey;
  readonly label: string;
  readonly dataSource: string;
  readonly formula: string;
  readonly timezone: typeof DASHBOARD_TIMEZONE;
  readonly periodBoundary: "inclusive_start_inclusive_end" | "current_snapshot";
  readonly nullBehavior: "zero" | "not_applicable";
  readonly cardinality: "scalar" | "grouped_by_day" | "grouped_by_source";
  readonly permission: { readonly module: "crm"; readonly action: "visualizar" };
  readonly scopes: readonly DashboardMetricScope[];
  readonly drillDown: "lead_list" | "property_list" | "marketing_ledger" | "portal_jobs" | "none";
};

const common = {
  timezone: DASHBOARD_TIMEZONE,
  permission: { module: "crm", action: "visualizar" } as const,
  scopes: ["own", "team", "global"] as const,
} satisfies Partial<DashboardMetricDefinition>;

export const DASHBOARD_METRIC_REGISTRY: Record<DashboardMetricKey, DashboardMetricDefinition> = {
  leads_received: { ...common, metricKey: "leads_received", label: "Leads recebidos", dataSource: "leads.created_at", formula: "count(distinct lead.id)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  visits_reached: { ...common, metricKey: "visits_reached", label: "Visitas alcançadas", dataSource: "leads.status + crm_visits", formula: "count(leads at or beyond visit stage)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  proposals_reached: { ...common, metricKey: "proposals_reached", label: "Propostas alcançadas", dataSource: "leads.status + crm_proposals", formula: "count(leads at or beyond proposal stage)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  sales_won: { ...common, metricKey: "sales_won", label: "Vendas ganhas", dataSource: "leads.status", formula: "count(status = ganho)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  sales_lost: { ...common, metricKey: "sales_lost", label: "Vendas perdidas", dataSource: "leads.status", formula: "count(status = perdido)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  leads_discarded: { ...common, metricKey: "leads_discarded", label: "Leads descartados", dataSource: "leads.status", formula: "count(status = descartado)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  won_value: { ...common, metricKey: "won_value", label: "VGV ganho", dataSource: "leads.valor_estimado", formula: "sum(valor_estimado where status = ganho)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  active_properties: { ...common, metricKey: "active_properties", label: "Imóveis ativos", dataSource: "imoveis.status", formula: "count(status in ativo,reservado)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "property_list" },
  published_properties: { ...common, metricKey: "published_properties", label: "Imóveis publicados", dataSource: "imoveis.status + publicado_em", formula: "count(status = ativo and publicado_em is not null)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "property_list" },
  marketing_ingestion_events: { ...common, metricKey: "marketing_ingestion_events", label: "Eventos de marketing", dataSource: "tenant_marketing_ingestion_events.received_at", formula: "count(events in period)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "marketing_ledger" },
  portal_publications: { ...common, metricKey: "portal_publications", label: "Publicações em portais", dataSource: "tenant_portal_jobs.updated_at", formula: "count(current_state = published)", periodBoundary: "inclusive_start_inclusive_end", nullBehavior: "zero", cardinality: "scalar", drillDown: "portal_jobs" },
  first_response_overdue: { ...common, metricKey: "first_response_overdue", label: "Primeira resposta atrasada", dataSource: "crm_alerts", formula: "count(open first_response_overdue)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  follow_up_overdue: { ...common, metricKey: "follow_up_overdue", label: "Follow-up atrasado", dataSource: "crm_alerts", formula: "count(open follow_up_overdue)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  visit_feedback_overdue: { ...common, metricKey: "visit_feedback_overdue", label: "Feedback de visita atrasado", dataSource: "crm_alerts", formula: "count(open visit_feedback_overdue)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
  proposal_review_overdue: { ...common, metricKey: "proposal_review_overdue", label: "Revisão de proposta atrasada", dataSource: "crm_alerts", formula: "count(open proposal_review_overdue)", periodBoundary: "current_snapshot", nullBehavior: "zero", cardinality: "scalar", drillDown: "lead_list" },
};

export function listDashboardMetricDefinitions(): DashboardMetricDefinition[] {
  return DASHBOARD_METRIC_KEYS.map((key) => DASHBOARD_METRIC_REGISTRY[key]);
}
