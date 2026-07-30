import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
  type RbacScope,
} from "@/lib/api/tenant-access-control-authority.server";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  DASHBOARD_TIMEZONE,
  listDashboardMetricDefinitions,
} from "@/lib/dashboard/dashboard-metric-registry";

const filterSchema = z.object({
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  timezone: z.literal(DASHBOARD_TIMEZONE).optional().default(DASHBOARD_TIMEZONE),
  corretor_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  origem: z.string().trim().min(1).max(200).nullable().optional(),
}).strict().superRefine((data, context) => {
  if (new Date(data.fim).getTime() < new Date(data.inicio).getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fim"], message: "O fim do período deve ser posterior ao início." });
  }
});

const drillDownSchema = z.object({
  inicio: z.string().datetime().optional(),
  fim: z.string().datetime().optional(),
  timezone: z.literal(DASHBOARD_TIMEZONE).optional().default(DASHBOARD_TIMEZONE),
  status: z.array(z.enum(["novo", "conversando", "visita", "proposta", "ganho", "perdido", "descartado"])).max(20).optional(),
  alerta: z.enum(["sem_atendimento", "sem_followup", "visitas_sem_feedback", "propostas_paradas"]).optional(),
  corretor_id: z.string().uuid().nullable().optional(),
}).strict().superRefine((data, context) => {
  if (data.inicio && data.fim && new Date(data.fim).getTime() < new Date(data.inicio).getTime()) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["fim"], message: "O fim do período deve ser posterior ao início." });
  }
});

const STATUS_ORDER = ["novo", "conversando", "visita", "proposta", "ganho"] as const;
type ActiveStatus = (typeof STATUS_ORDER)[number];
const STATUS_INDEX = new Map<string, number>(STATUS_ORDER.map((status, index) => [status, index]));

type DashboardScope = "own" | "team" | "global";
type LeadRow = {
  id: string;
  status: string;
  origem: string | null;
  corretor_id: string | null;
  assigned_to?: string | null;
  valor_estimado: number | null;
  created_at: string;
  updated_at: string;
  nome: string;
  email: string | null;
  telefone: string | null;
};

type DashboardAccess = {
  tenantId: string;
  scope: DashboardScope;
  actorBrokerId: string | null;
  allowedBrokerIds: string[] | null;
  actorKind: "owner" | "super_admin" | "delegated";
};

function normalizeScope(scope: RbacScope | null): DashboardScope {
  if (scope === "global") return "global";
  if (scope === "equipe") return "team";
  if (scope === "proprio") return "own";
  throw new Error("dashboard_permission_scope_missing");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function exactlyOneBroker(admin: any, tenantId: string, userId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("ativo", true)
    .limit(2);
  if (error) throw new Error("Falha ao resolver o corretor do dashboard.");
  if ((data ?? []).length === 0) return null;
  if ((data ?? []).length !== 1) throw new Error("Dashboard broker authority is ambiguous.");
  return String(data[0].id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveTeamBrokerIds(admin: any, tenantId: string, actorUserId: string): Promise<string[]> {
  const { data: memberships, error: membershipError } = await admin
    .from("team_members")
    .select("team_id")
    .eq("tenant_id", tenantId)
    .eq("user_id", actorUserId);
  if (membershipError) throw new Error("Falha ao resolver equipes do dashboard.");
  const teamIds = [...new Set((memberships ?? []).map((row: { team_id: string }) => row.team_id))];
  if (teamIds.length === 0) return [];

  const { data: memberRows, error: memberError } = await admin
    .from("team_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .in("team_id", teamIds);
  if (memberError) throw new Error("Falha ao resolver membros das equipes.");
  const userIds = [...new Set((memberRows ?? []).map((row: { user_id: string }) => row.user_id))];
  if (userIds.length === 0) return [];

  const { data: brokers, error: brokerError } = await admin
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .in("user_id", userIds);
  if (brokerError) throw new Error("Falha ao resolver corretores das equipes.");
  return [...new Set((brokers ?? []).map((row: { id: string }) => row.id))];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveDashboardAccess(context: any): Promise<DashboardAccess> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Dashboard Functional Authority");
  const decision = await resolveEffectiveTenantPermission(
    trustedTenantAccessContext(context),
    "crm",
    "visualizar",
  );
  if (!decision.allowed) throw new Error("dashboard_permission_denied");
  const scope = normalizeScope(decision.scope);
  const actorKind = decision.source === "super_admin_impersonation"
    ? "super_admin"
    : decision.source === "tenant_owner"
      ? "owner"
      : "delegated";
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;
  if (scope === "global") {
    return { tenantId, scope, actorBrokerId: null, allowedBrokerIds: null, actorKind };
  }
  const actorBrokerId = await exactlyOneBroker(admin, tenantId, context.userId);
  if (!actorBrokerId) throw new Error("dashboard_broker_binding_required");
  if (scope === "own") {
    return { tenantId, scope, actorBrokerId, allowedBrokerIds: [actorBrokerId], actorKind };
  }
  const teamBrokerIds = await resolveTeamBrokerIds(admin, tenantId, context.userId);
  const allowedBrokerIds = [...new Set([actorBrokerId, ...teamBrokerIds])];
  return { tenantId, scope, actorBrokerId, allowedBrokerIds, actorKind };
}

function assertBrokerFilter(access: DashboardAccess, requested: string | null | undefined): string | null {
  if (!requested) return access.scope === "own" ? access.actorBrokerId : null;
  if (access.scope === "global") return requested;
  if (!access.allowedBrokerIds?.includes(requested)) throw new Error("dashboard_broker_filter_denied");
  return requested;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertTenantBroker(admin: any, tenantId: string, brokerId: string): Promise<string> {
  const { data, error } = await admin
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", brokerId)
    .eq("ativo", true)
    .limit(2);
  if (error) throw new Error("Falha ao validar corretor.");
  if ((data ?? []).length !== 1) throw new Error("Corretor inexistente ou ambíguo no tenant.");
  return brokerId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertTeamFilter(admin: any, access: DashboardAccess, teamId: string | null | undefined): Promise<string[] | null> {
  if (!teamId) return access.scope === "team" ? access.allowedBrokerIds : null;
  const { data: teamRows, error: teamError } = await admin
    .from("teams")
    .select("id")
    .eq("tenant_id", access.tenantId)
    .eq("id", teamId)
    .eq("ativo", true)
    .limit(2);
  if (teamError) throw new Error("Falha ao validar equipe.");
  if ((teamRows ?? []).length !== 1) throw new Error("Equipe inexistente ou ambígua no tenant.");
  if (access.scope === "own") throw new Error("dashboard_team_filter_denied");
  const { data: memberRows, error: memberError } = await admin
    .from("team_members")
    .select("user_id")
    .eq("tenant_id", access.tenantId)
    .eq("team_id", teamId);
  if (memberError) throw new Error("Falha ao carregar membros da equipe.");
  const userIds = [...new Set((memberRows ?? []).map((row: { user_id: string }) => row.user_id))];
  if (userIds.length === 0) return [];
  const { data: brokerRows, error: brokerError } = await admin
    .from("corretores")
    .select("id")
    .eq("tenant_id", access.tenantId)
    .eq("ativo", true)
    .in("user_id", userIds);
  if (brokerError) throw new Error("Falha ao carregar corretores da equipe.");
  const ids = [...new Set((brokerRows ?? []).map((row: { id: string }) => row.id))];
  if (access.scope === "team" && ids.some((id) => !access.allowedBrokerIds?.includes(id))) {
    throw new Error("dashboard_team_filter_denied");
  }
  return ids;
}

function inRange(value: string, start: Date, end: Date) {
  const timestamp = new Date(value).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

function percent(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function countStatus(rows: LeadRow[], status: string) {
  return rows.filter((row) => row.status === status).length;
}

function countAtLeast(rows: LeadRow[], status: ActiveStatus) {
  const target = STATUS_INDEX.get(status) ?? 0;
  return rows.filter((row) => {
    const current = STATUS_INDEX.get(row.status);
    return current !== undefined && current >= target;
  }).length;
}

function applyBrokerScope(query: any, access: DashboardAccess, selectedBrokerId: string | null, teamBrokerIds: string[] | null) {
  if (selectedBrokerId) return query.eq("corretor_id", selectedBrokerId);
  const allowed = teamBrokerIds ?? access.allowedBrokerIds;
  if (allowed === null) return query;
  if (allowed.length === 0) return query.eq("corretor_id", "00000000-0000-0000-0000-000000000000");
  return query.in("corretor_id", allowed);
}

export const dashboardStats = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => filterSchema.parse(input))
  .handler(async ({ data, context }) => {
    const access = await resolveDashboardAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    let selectedBrokerId = assertBrokerFilter(access, data.corretor_id);
    if (selectedBrokerId) selectedBrokerId = await assertTenantBroker(admin, access.tenantId, selectedBrokerId);
    const teamBrokerIds = await assertTeamFilter(admin, access, data.team_id);

    const start = new Date(data.inicio);
    const end = new Date(data.fim);
    const duration = Math.max(1, end.getTime() - start.getTime());
    const previousStart = new Date(start.getTime() - duration - 1);
    const previousEnd = new Date(start.getTime() - 1);

    let leadQuery = admin
      .from("leads")
      .select("id, status, origem, corretor_id, assigned_to, valor_estimado, created_at, updated_at, nome, email, telefone")
      .eq("tenant_id", access.tenantId)
      .gte("created_at", previousStart.toISOString())
      .lte("created_at", end.toISOString());
    leadQuery = applyBrokerScope(leadQuery, access, selectedBrokerId, teamBrokerIds);
    if (data.origem) leadQuery = leadQuery.eq("origem", data.origem);
    const { data: leadRows, error: leadError } = await leadQuery;
    if (leadError) throw new Error("Falha ao carregar dados completos do dashboard.");
    const allLeads = (leadRows ?? []) as LeadRow[];
    const current = allLeads.filter((row) => inRange(row.created_at, start, end));
    const previous = allLeads.filter((row) => inRange(row.created_at, previousStart, previousEnd));

    const leadCount = current.length;
    const previousLeadCount = previous.length;
    const visits = countAtLeast(current, "visita");
    const proposals = countAtLeast(current, "proposta");
    const won = countStatus(current, "ganho");
    const lost = countStatus(current, "perdido");
    const discarded = countStatus(current, "descartado");
    const wonValue = current
      .filter((row) => row.status === "ganho")
      .reduce((sum, row) => sum + (Number(row.valor_estimado) || 0), 0);

    const summary = {
      leads: { atual: leadCount, anterior: previousLeadCount, deltaPct: percent(leadCount, previousLeadCount) },
      visitas: { atual: visits, conversao: leadCount ? Math.round((visits / leadCount) * 1000) / 10 : 0 },
      propostas: { atual: proposals, conversao: visits ? Math.round((proposals / visits) * 1000) / 10 : 0 },
      vendas: { atual: won, perdidas: lost, descartadas: discarded, vgv: wonValue },
    };

    const contacted = countAtLeast(current, "conversando");
    const funnel = [
      { etapa: "Novo", quantidade: leadCount, conversao: 100, perda: 0 },
      { etapa: "Contato Realizado", quantidade: contacted, conversao: leadCount ? Math.round((contacted / leadCount) * 1000) / 10 : 0, perda: Math.max(0, leadCount - contacted) },
      { etapa: "Qualificado", quantidade: contacted, conversao: contacted ? 100 : 0, perda: 0 },
      { etapa: "Visita Agendada", quantidade: visits, conversao: contacted ? Math.round((visits / contacted) * 1000) / 10 : 0, perda: Math.max(0, contacted - visits) },
      { etapa: "Proposta", quantidade: proposals, conversao: visits ? Math.round((proposals / visits) * 1000) / 10 : 0, perda: Math.max(0, visits - proposals) },
      { etapa: "Venda", quantidade: won, conversao: proposals ? Math.round((won / proposals) * 1000) / 10 : 0, perda: Math.max(0, proposals - won) },
      { etapa: "Perdidos", quantidade: lost, conversao: 0, perda: lost },
      { etapa: "Descartados", quantidade: discarded, conversao: 0, perda: discarded },
    ];

    let activeQuery = admin
      .from("leads")
      .select("id, status, corretor_id, created_at, updated_at, nome")
      .eq("tenant_id", access.tenantId)
      .not("status", "in", '("ganho","perdido","descartado")');
    activeQuery = applyBrokerScope(activeQuery, access, selectedBrokerId, teamBrokerIds);
    const { data: activeRows, error: activeError } = await activeQuery;
    if (activeError) throw new Error("Falha ao carregar alertas do dashboard.");
    const active = (activeRows ?? []) as LeadRow[];
    const now = Date.now();
    const hours48 = 48 * 60 * 60 * 1000;
    const days7 = 7 * 24 * 60 * 60 * 1000;
    const alerts = {
      semAtendimento: active.filter((row) => row.status === "novo" && now - new Date(row.created_at).getTime() > hours48).length,
      semFollowup: active.filter((row) => row.status === "conversando" && now - new Date(row.updated_at).getTime() > days7).length,
      visitasSemFeedback: active.filter((row) => row.status === "visita" && now - new Date(row.updated_at).getTime() > days7).length,
      propostasParadas: active.filter((row) => row.status === "proposta" && now - new Date(row.updated_at).getTime() > days7).length,
    };

    const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime() + 1) / 86_400_000));
    const series = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10);
      return { data: date, leads: 0, visitas: 0, propostas: 0, vendas: 0, vgv: 0 };
    });
    const dayIndex = new Map(series.map((row, index) => [row.data, index]));
    for (const lead of current) {
      const index = dayIndex.get(lead.created_at.slice(0, 10));
      if (index === undefined) continue;
      series[index].leads += 1;
      if ((STATUS_INDEX.get(lead.status) ?? -1) >= 2) series[index].visitas += 1;
      if ((STATUS_INDEX.get(lead.status) ?? -1) >= 3) series[index].propostas += 1;
      if (lead.status === "ganho") {
        series[index].vendas += 1;
        series[index].vgv += Number(lead.valor_estimado) || 0;
      }
    }

    const sourceMap = new Map<string, { total: number; won: number }>();
    for (const lead of current) {
      const source = lead.origem?.trim() || "Outros";
      const value = sourceMap.get(source) ?? { total: 0, won: 0 };
      value.total += 1;
      if (lead.status === "ganho") value.won += 1;
      sourceMap.set(source, value);
    }
    const sources = [...sourceMap.entries()].map(([nome, value]) => ({
      nome,
      quantidade: value.total,
      percentual: leadCount ? Math.round((value.total / leadCount) * 1000) / 10 : 0,
      conversao: value.total ? Math.round((value.won / value.total) * 1000) / 10 : 0,
    })).sort((left, right) => right.quantidade - left.quantidade);

    const rates = [
      { label: "Lead → Contato", atual: leadCount ? Math.round((contacted / leadCount) * 1000) / 10 : 0, meta: 80 },
      { label: "Contato → Visita", atual: contacted ? Math.round((visits / contacted) * 1000) / 10 : 0, meta: 50 },
      { label: "Visita → Proposta", atual: visits ? Math.round((proposals / visits) * 1000) / 10 : 0, meta: 50 },
      { label: "Proposta → Venda", atual: proposals ? Math.round((won / proposals) * 1000) / 10 : 0, meta: 40 },
      { label: "Lead → Venda", atual: leadCount ? Math.round((won / leadCount) * 1000) / 10 : 0, meta: 5 },
    ];

    const { data: brokerRows, error: brokerError } = access.scope === "global"
      ? await admin.from("corretores").select("id, user_id, nome, sobrenome").eq("tenant_id", access.tenantId).eq("ativo", true)
      : { data: [], error: null };
    if (brokerError) throw new Error("Falha ao carregar ranking.");
    const ranking = ((brokerRows ?? []) as Array<{ id: string; user_id: string | null; nome: string; sobrenome: string | null }>).map((broker) => {
      const own = current.filter((lead) => lead.corretor_id === broker.id);
      const ownWon = countStatus(own, "ganho");
      return {
        corretor_id: broker.id,
        user_id: broker.user_id,
        nome: [broker.nome, broker.sobrenome].filter(Boolean).join(" "),
        leads: own.length,
        visitas: countAtLeast(own, "visita"),
        propostas: countAtLeast(own, "proposta"),
        vendas: ownWon,
        conversao: own.length ? Math.round((ownWon / own.length) * 1000) / 10 : 0,
        vgv: own.filter((lead) => lead.status === "ganho").reduce((sum, lead) => sum + (Number(lead.valor_estimado) || 0), 0),
      };
    }).filter((row) => row.leads > 0 || row.vendas > 0).sort((left, right) => right.vgv - left.vgv).slice(0, 10);

    const ownRows = access.actorBrokerId ? current.filter((row) => row.corretor_id === access.actorBrokerId) : [];
    const performance = access.actorBrokerId ? {
      leads: ownRows.length,
      visitas: countAtLeast(ownRows, "visita"),
      propostas: countAtLeast(ownRows, "proposta"),
      vendas: countStatus(ownRows, "ganho"),
      vgv: ownRows.filter((row) => row.status === "ganho").reduce((sum, row) => sum + (Number(row.valor_estimado) || 0), 0),
    } : null;

    const [propertyResult, marketingResult, portalResult, alertResult] = await Promise.all([
      admin.from("imoveis").select("id, status, publicado_em").eq("tenant_id", access.tenantId),
      admin.from("tenant_marketing_ingestion_events").select("id", { count: "exact", head: true }).eq("tenant_id", access.tenantId).gte("received_at", start.toISOString()).lte("received_at", end.toISOString()),
      admin.from("tenant_portal_jobs").select("id", { count: "exact", head: true }).eq("tenant_id", access.tenantId).eq("current_state", "published").gte("updated_at", start.toISOString()).lte("updated_at", end.toISOString()),
      admin.from("crm_alerts").select("alert_key, state").eq("tenant_id", access.tenantId).eq("state", "open"),
    ]);
    if (propertyResult.error || marketingResult.error || portalResult.error || alertResult.error) {
      throw new Error("Dashboard partial-data error: uma fonte obrigatória falhou.");
    }
    const properties = (propertyResult.data ?? []) as Array<{ id: string; status: string; publicado_em: string | null }>;
    const openAlertCounts = new Map<string, number>();
    for (const row of (alertResult.data ?? []) as Array<{ alert_key: string }>) {
      openAlertCounts.set(row.alert_key, (openAlertCounts.get(row.alert_key) ?? 0) + 1);
    }
    const operationalMetrics = {
      activeProperties: properties.filter((row) => row.status === "ativo" || row.status === "reservado").length,
      publishedProperties: properties.filter((row) => row.status === "ativo" && row.publicado_em).length,
      marketingIngestionEvents: marketingResult.count ?? 0,
      portalPublications: portalResult.count ?? 0,
      crmAlerts: Object.fromEntries(openAlertCounts),
    };

    const insights: Array<{ tipo: "performance" | "gargalo" | "oportunidade" | "alerta" | "previsao"; mensagem: string }> = [];
    if (previousLeadCount > 0) {
      const delta = percent(leadCount, previousLeadCount);
      insights.push({ tipo: "performance", mensagem: delta >= 0 ? `Você recebeu ${delta}% mais leads que no período anterior.` : `Volume de leads caiu ${Math.abs(delta)}% em relação ao período anterior.` });
    }
    if (wonValue > 0) insights.push({ tipo: "performance", mensagem: `VGV do período: ${wonValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` });
    if (alerts.semAtendimento > 0) insights.push({ tipo: "alerta", mensagem: `${alerts.semAtendimento} lead(s) sem atendimento há mais de 48 horas.` });
    if (alerts.propostasParadas > 0) insights.push({ tipo: "alerta", mensagem: `${alerts.propostasParadas} proposta(s) sem atualização há mais de 7 dias.` });
    if (proposals > 0) insights.push({ tipo: "oportunidade", mensagem: `${proposals} lead(s) alcançaram proposta no período.` });
    if (won > 0 && dayCount > 0) insights.push({ tipo: "previsao", mensagem: `Projeção linear de VGV para 30 dias: ${Math.round((wonValue / dayCount) * 30).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` });

    return {
      resumo: summary,
      funil: funnel,
      alertas: alerts,
      serie: series,
      origens: sources,
      taxas: rates,
      desempenho: performance,
      ranking,
      insights,
      isPrivileged: access.scope === "global",
      effectiveScope: access.scope,
      actorKind: access.actorKind,
      timezone: data.timezone,
      metricRegistry: listDashboardMetricDefinitions(),
      operationalMetrics,
      dataCompleteness: "complete" as const,
    };
  });

export const dashboardLeadsFiltrados = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => drillDownSchema.parse(input))
  .handler(async ({ data, context }) => {
    const access = await resolveDashboardAccess(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    let selectedBrokerId = assertBrokerFilter(access, data.corretor_id);
    if (selectedBrokerId) selectedBrokerId = await assertTenantBroker(admin, access.tenantId, selectedBrokerId);

    let query = admin
      .from("leads")
      .select("id, nome, email, telefone, status, origem, corretor_id, assigned_to, created_at, updated_at, valor_estimado")
      .eq("tenant_id", access.tenantId)
      .order("created_at", { ascending: false })
      .limit(500);
    query = applyBrokerScope(query, access, selectedBrokerId, null);
    if (data.inicio) query = query.gte("created_at", data.inicio);
    if (data.fim) query = query.lte("created_at", data.fim);
    if (data.status?.length) query = query.in("status", data.status);
    if (data.alerta === "sem_atendimento") {
      query = query.eq("status", "novo").lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    } else if (data.alerta === "sem_followup") {
      query = query.eq("status", "conversando").lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    } else if (data.alerta === "visitas_sem_feedback") {
      query = query.eq("status", "visita").lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    } else if (data.alerta === "propostas_paradas") {
      query = query.eq("status", "proposta").lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    }
    const { data: rows, error } = await query;
    if (error) throw new Error("Falha ao carregar o drill-down tenant-scoped.");
    return { rows: rows ?? [], effectiveScope: access.scope, timezone: data.timezone };
  });
