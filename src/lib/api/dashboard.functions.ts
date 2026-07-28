import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

const filtroSchema = z
  .object({
    inicio: z.string().datetime(),
    fim: z.string().datetime(),
    corretor_id: z.string().uuid().nullable().optional(),
    team_id: z.string().uuid().nullable().optional(),
    origem: z.string().trim().min(1).max(200).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.fim).getTime() < new Date(data.inicio).getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fim"],
        message: "O fim do período deve ser posterior ao início.",
      });
    }
  });

const leadsFiltradosSchema = z
  .object({
    inicio: z.string().datetime().optional(),
    fim: z.string().datetime().optional(),
    status: z.array(z.string().min(1).max(80)).max(20).optional(),
    alerta: z
      .enum([
        "sem_atendimento",
        "sem_followup",
        "visitas_sem_feedback",
        "propostas_paradas",
      ])
      .optional(),
    corretor_id: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.inicio &&
      data.fim &&
      new Date(data.fim).getTime() < new Date(data.inicio).getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fim"],
        message: "O fim do período deve ser posterior ao início.",
      });
    }
  });

const STATUS_FUNIL = [
  "novo",
  "conversando",
  "visita",
  "proposta",
  "ganho",
  "perdido",
] as const;
type StatusFunil = (typeof STATUS_FUNIL)[number];

const ETAPA_INDEX: Record<StatusFunil, number> = {
  novo: 0,
  conversando: 1,
  visita: 2,
  proposta: 3,
  ganho: 4,
  perdido: 5,
};

type Lead = {
  id: string;
  status: string;
  origem: string | null;
  corretor_id: string | null;
  valor_estimado: number | null;
  created_at: string;
  updated_at: string;
  nome: string;
  email: string | null;
  telefone: string | null;
};

type DashboardAccess = {
  tenantId: string;
  isPrivileged: boolean;
  brokerId: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveDashboardAccess(context: any): Promise<DashboardAccess> {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Dashboard");

  if (context.tenant.isSuperAdmin) {
    return { tenantId, isPrivileged: true, brokerId: null };
  }

  const [admin, manager, secretary] = await Promise.all([
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    }),
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "gerente",
    }),
    context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "secretaria",
    }),
  ]);

  for (const result of [admin, manager, secretary]) {
    if (result.error) throw new Error("Falha ao validar autorização do dashboard.");
  }

  const isPrivileged =
    admin.data === true || manager.data === true || secretary.data === true;
  if (isPrivileged) return { tenantId, isPrivileged: true, brokerId: null };

  const { data: brokers, error } = await context.supabase
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", context.userId)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((brokers ?? []).length !== 1) {
    throw new Error("Dashboard broker authority is unresolved or ambiguous.");
  }

  return {
    tenantId,
    isPrivileged: false,
    brokerId: (brokers as Array<{ id: string }>)[0].id,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireTenantBroker(context: any, tenantId: string, brokerId: string) {
  const { data, error } = await context.supabase
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", brokerId)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== 1) {
    throw new Error("Corretor não encontrado no tenant atual.");
  }
  return brokerId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveTeamBrokerIds(
  context: any,
  tenantId: string,
  teamId: string,
): Promise<string[]> {
  const { data: teams, error: teamError } = await context.supabase
    .from("teams")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", teamId)
    .limit(2);
  if (teamError) throw new Error(teamError.message);
  if ((teams ?? []).length !== 1) {
    throw new Error("Equipe não encontrada no tenant atual.");
  }

  const { data: members, error: memberError } = await context.supabase
    .from("team_members")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("team_id", teamId);
  if (memberError) throw new Error(memberError.message);

  const memberRows = (members ?? []) as Array<{ user_id: string }>;
  const userIds: string[] = Array.from(
    new Set(memberRows.map((member) => member.user_id).filter(Boolean)),
  );
  if (userIds.length === 0) return [];

  const { data: brokers, error: brokerError } = await context.supabase
    .from("corretores")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("user_id", userIds);
  if (brokerError) throw new Error(brokerError.message);
  const brokerRows = (brokers ?? []) as Array<{ id: string }>;
  return Array.from(new Set(brokerRows.map((broker) => broker.id)));
}

function diffPercent(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function inRange(date: string, start: Date, end: Date) {
  const timestamp = new Date(date).getTime();
  return timestamp >= start.getTime() && timestamp <= end.getTime();
}

export const dashboardStats = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => filtroSchema.parse(data))
  .handler(async ({ data, context }) => {
    const access = await resolveDashboardAccess(context);
    const { tenantId, isPrivileged } = access;
    const { supabase } = context;

    if (!isPrivileged && data.team_id) {
      throw new Error("Filtro de equipe não autorizado.");
    }
    if (
      !isPrivileged &&
      data.corretor_id &&
      data.corretor_id !== access.brokerId
    ) {
      throw new Error("Filtro de corretor não autorizado.");
    }

    const selectedBrokerId = isPrivileged && data.corretor_id
      ? await requireTenantBroker(context, tenantId, data.corretor_id)
      : access.brokerId;
    const teamBrokerIds = isPrivileged && data.team_id
      ? await resolveTeamBrokerIds(context, tenantId, data.team_id)
      : null;

    const inicio = new Date(data.inicio);
    const fim = new Date(data.fim);
    const duracao = fim.getTime() - inicio.getTime();
    const inicioAnterior = new Date(inicio.getTime() - duracao);
    const fimAnterior = new Date(inicio.getTime() - 1);

    let query = supabase
      .from("leads")
      .select(
        "id, status, origem, corretor_id, valor_estimado, created_at, updated_at, nome, email, telefone",
      )
      .eq("tenant_id", tenantId)
      .gte("created_at", inicioAnterior.toISOString())
      .lte("created_at", fim.toISOString());

    if (selectedBrokerId) query = query.eq("corretor_id", selectedBrokerId);
    if (teamBrokerIds) {
      query = teamBrokerIds.length === 0
        ? query.eq("corretor_id", "00000000-0000-0000-0000-000000000000")
        : query.in("corretor_id", teamBrokerIds);
    }
    if (data.origem) query = query.eq("origem", data.origem);

    const { data: leadsRaw, error } = await query;
    if (error) throw new Error(error.message);
    const leads = (leadsRaw ?? []) as Lead[];
    const atuais = leads.filter((lead) => inRange(lead.created_at, inicio, fim));
    const anteriores = leads.filter((lead) =>
      inRange(lead.created_at, inicioAnterior, fimAnterior),
    );

    const countByStatus = (items: Lead[], status: StatusFunil) =>
      items.filter((lead) => lead.status === status).length;
    const countAtLeast = (items: Lead[], status: StatusFunil) =>
      items.filter((lead) => {
        const index = ETAPA_INDEX[lead.status as StatusFunil] ?? -1;
        const target = ETAPA_INDEX[status];
        return index >= target && index !== ETAPA_INDEX.perdido;
      }).length;

    const leadsTotal = atuais.length;
    const leadsAnterior = anteriores.length;
    const visitas = countAtLeast(atuais, "visita");
    const propostas = countAtLeast(atuais, "proposta");
    const vendas = countByStatus(atuais, "ganho");
    const vgv = atuais
      .filter((lead) => lead.status === "ganho")
      .reduce((sum, lead) => sum + (Number(lead.valor_estimado) || 0), 0);

    const resumo = {
      leads: {
        atual: leadsTotal,
        anterior: leadsAnterior,
        deltaPct: diffPercent(leadsTotal, leadsAnterior),
      },
      visitas: {
        atual: visitas,
        conversao: leadsTotal > 0
          ? Math.round((visitas / leadsTotal) * 1000) / 10
          : 0,
      },
      propostas: {
        atual: propostas,
        conversao: visitas > 0
          ? Math.round((propostas / visitas) * 1000) / 10
          : 0,
      },
      vendas: { atual: vendas, vgv },
    };

    const captado = atuais.length;
    const contato = atuais.filter((lead) => {
      const index = ETAPA_INDEX[lead.status as StatusFunil] ?? -1;
      return index >= 1 && lead.status !== "perdido";
    }).length;
    const qualificado = contato;
    const visitaCount = countAtLeast(atuais, "visita");
    const propostaCount = countAtLeast(atuais, "proposta");
    const vendaCount = countByStatus(atuais, "ganho");
    const descartadoCount = countByStatus(atuais, "perdido");

    const funil = [
      { etapa: "Novo", quantidade: captado, conversao: 100, perda: 0 },
      {
        etapa: "Contato Realizado",
        quantidade: contato,
        conversao: captado ? Math.round((contato / captado) * 1000) / 10 : 0,
        perda: captado - contato,
      },
      {
        etapa: "Qualificado",
        quantidade: qualificado,
        conversao: contato
          ? Math.round((qualificado / contato) * 1000) / 10
          : 0,
        perda: contato - qualificado,
      },
      {
        etapa: "Visita Agendada",
        quantidade: visitaCount,
        conversao: qualificado
          ? Math.round((visitaCount / qualificado) * 1000) / 10
          : 0,
        perda: qualificado - visitaCount,
      },
      {
        etapa: "Proposta",
        quantidade: propostaCount,
        conversao: visitaCount
          ? Math.round((propostaCount / visitaCount) * 1000) / 10
          : 0,
        perda: visitaCount - propostaCount,
      },
      {
        etapa: "Venda",
        quantidade: vendaCount,
        conversao: propostaCount
          ? Math.round((vendaCount / propostaCount) * 1000) / 10
          : 0,
        perda: propostaCount - vendaCount,
      },
      {
        etapa: "Descartados",
        quantidade: descartadoCount,
        conversao: 0,
        perda: descartadoCount,
      },
    ];

    let activeQuery = supabase
      .from("leads")
      .select("id, status, corretor_id, created_at, updated_at, nome")
      .eq("tenant_id", tenantId)
      .not("status", "in", '("ganho","perdido")');
    if (selectedBrokerId) activeQuery = activeQuery.eq("corretor_id", selectedBrokerId);
    if (teamBrokerIds) {
      activeQuery = teamBrokerIds.length === 0
        ? activeQuery.eq("corretor_id", "00000000-0000-0000-0000-000000000000")
        : activeQuery.in("corretor_id", teamBrokerIds);
    }
    const { data: activeRows, error: activeError } = await activeQuery;
    if (activeError) throw new Error(activeError.message);
    const ativos = (activeRows ?? []) as Lead[];

    const agora = Date.now();
    const HORAS_48 = 48 * 60 * 60 * 1000;
    const DIAS_7 = 7 * 24 * 60 * 60 * 1000;
    const semAtendimento = ativos.filter(
      (lead) =>
        lead.status === "novo" &&
        agora - new Date(lead.created_at).getTime() > HORAS_48,
    ).length;
    const semFollowup = ativos.filter(
      (lead) =>
        lead.status === "conversando" &&
        agora - new Date(lead.updated_at).getTime() > DIAS_7,
    ).length;
    const visitasSemFeedback = ativos.filter(
      (lead) =>
        lead.status === "visita" &&
        agora - new Date(lead.updated_at).getTime() > DIAS_7,
    ).length;
    const propostasParadas = ativos.filter(
      (lead) =>
        lead.status === "proposta" &&
        agora - new Date(lead.updated_at).getTime() > DIAS_7,
    ).length;
    const alertas = {
      semAtendimento,
      semFollowup,
      visitasSemFeedback,
      propostasParadas,
    };

    const dias = Math.max(1, Math.ceil(duracao / (24 * 60 * 60 * 1000)));
    const serie: Array<{
      data: string;
      leads: number;
      visitas: number;
      propostas: number;
      vendas: number;
      vgv: number;
    }> = [];
    for (let index = 0; index < dias; index += 1) {
      const date = new Date(inicio.getTime() + index * 24 * 60 * 60 * 1000);
      serie.push({
        data: date.toISOString().slice(0, 10),
        leads: 0,
        visitas: 0,
        propostas: 0,
        vendas: 0,
        vgv: 0,
      });
    }
    const indexByDay = new Map(serie.map((item, index) => [item.data, index]));
    for (const lead of atuais) {
      const index = indexByDay.get(lead.created_at.slice(0, 10));
      if (index === undefined) continue;
      serie[index].leads += 1;
      const stageIndex = ETAPA_INDEX[lead.status as StatusFunil] ?? -1;
      if (stageIndex >= 2 && stageIndex !== ETAPA_INDEX.perdido) {
        serie[index].visitas += 1;
      }
      if (stageIndex >= 3 && stageIndex !== ETAPA_INDEX.perdido) {
        serie[index].propostas += 1;
      }
      if (lead.status === "ganho") {
        serie[index].vendas += 1;
        serie[index].vgv += Number(lead.valor_estimado) || 0;
      }
    }

    const origensMap = new Map<string, { total: number; vendas: number }>();
    for (const lead of atuais) {
      const key = (lead.origem || "Outros").trim() || "Outros";
      const current = origensMap.get(key) ?? { total: 0, vendas: 0 };
      current.total += 1;
      if (lead.status === "ganho") current.vendas += 1;
      origensMap.set(key, current);
    }
    const origens = Array.from(origensMap.entries())
      .map(([nome, values]) => ({
        nome,
        quantidade: values.total,
        percentual: leadsTotal
          ? Math.round((values.total / leadsTotal) * 1000) / 10
          : 0,
        conversao: values.total
          ? Math.round((values.vendas / values.total) * 1000) / 10
          : 0,
      }))
      .sort((left, right) => right.quantidade - left.quantidade);

    const metas = {
      leadContato: 80,
      contatoVisita: 50,
      visitaProposta: 50,
      propostaVenda: 40,
      leadVenda: 5,
    };
    const taxas = [
      {
        label: "Lead → Contato",
        atual: captado ? Math.round((contato / captado) * 1000) / 10 : 0,
        meta: metas.leadContato,
      },
      {
        label: "Contato → Visita",
        atual: contato ? Math.round((visitaCount / contato) * 1000) / 10 : 0,
        meta: metas.contatoVisita,
      },
      {
        label: "Visita → Proposta",
        atual: visitaCount
          ? Math.round((propostaCount / visitaCount) * 1000) / 10
          : 0,
        meta: metas.visitaProposta,
      },
      {
        label: "Proposta → Venda",
        atual: propostaCount
          ? Math.round((vendaCount / propostaCount) * 1000) / 10
          : 0,
        meta: metas.propostaVenda,
      },
      {
        label: "Lead → Venda",
        atual: captado ? Math.round((vendaCount / captado) * 1000) / 10 : 0,
        meta: metas.leadVenda,
      },
    ];

    const desempenho = access.brokerId
      ? (() => {
          const own = atuais.filter((lead) => lead.corretor_id === access.brokerId);
          return {
            leads: own.length,
            visitas: countAtLeast(own, "visita"),
            propostas: countAtLeast(own, "proposta"),
            vendas: countByStatus(own, "ganho"),
            vgv: own
              .filter((lead) => lead.status === "ganho")
              .reduce((sum, lead) => sum + (Number(lead.valor_estimado) || 0), 0),
          };
        })()
      : null;

    let ranking: Array<{
      corretor_id: string;
      user_id: string | null;
      nome: string;
      leads: number;
      visitas: number;
      propostas: number;
      vendas: number;
      conversao: number;
      vgv: number;
    }> = [];
    if (isPrivileged) {
      const { data: brokerRows, error: brokerError } = await supabase
        .from("corretores")
        .select("id, user_id, nome, sobrenome")
        .eq("tenant_id", tenantId);
      if (brokerError) throw new Error(brokerError.message);
      ranking = (brokerRows ?? [])
        .map((broker) => {
          const own = atuais.filter((lead) => lead.corretor_id === broker.id);
          const won = countByStatus(own, "ganho");
          return {
            corretor_id: broker.id,
            user_id: broker.user_id,
            nome: [broker.nome, broker.sobrenome].filter(Boolean).join(" "),
            leads: own.length,
            visitas: countAtLeast(own, "visita"),
            propostas: countAtLeast(own, "proposta"),
            vendas: won,
            conversao: own.length
              ? Math.round((won / own.length) * 1000) / 10
              : 0,
            vgv: own
              .filter((lead) => lead.status === "ganho")
              .reduce((sum, lead) => sum + (Number(lead.valor_estimado) || 0), 0),
          };
        })
        .filter((item) => item.leads > 0 || item.vendas > 0)
        .sort((left, right) => right.vgv - left.vgv)
        .slice(0, 10);
    }

    const insights: Array<{
      tipo: "performance" | "gargalo" | "oportunidade" | "alerta" | "previsao";
      mensagem: string;
    }> = [];
    if (leadsAnterior > 0) {
      const delta = diffPercent(leadsTotal, leadsAnterior);
      insights.push({
        tipo: "performance",
        mensagem: delta >= 0
          ? `Você recebeu ${delta}% mais leads que no período anterior.`
          : `Volume de leads caiu ${Math.abs(delta)}% em relação ao período anterior.`,
      });
    }
    if (vendas > 0 && vgv > 0) {
      insights.push({
        tipo: "performance",
        mensagem: `VGV do período: ${vgv.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}.`,
      });
    }

    const transitions = [
      { nome: "Lead → Contato", value: captado ? contato / captado : 1 },
      { nome: "Contato → Visita", value: contato ? visitaCount / contato : 1 },
      {
        nome: "Visita → Proposta",
        value: visitaCount ? propostaCount / visitaCount : 1,
      },
      {
        nome: "Proposta → Venda",
        value: propostaCount ? vendaCount / propostaCount : 1,
      },
    ];
    const worstTransition = transitions.reduce((left, right) =>
      right.value < left.value ? right : left,
    );
    if (captado > 0) {
      insights.push({
        tipo: "gargalo",
        mensagem: `O principal gargalo está na etapa ${worstTransition.nome} (${Math.round(worstTransition.value * 100)}% de conversão).`,
      });
    }

    const propostasAbertas = ativos.filter((lead) => lead.status === "proposta").length;
    if (propostasAbertas > 0) {
      insights.push({
        tipo: "oportunidade",
        mensagem: `Existem ${propostasAbertas} proposta${
          propostasAbertas > 1 ? "s" : ""
        } aguardando retorno — alta chance de fechamento.`,
      });
    }
    if (semAtendimento > 0) {
      insights.push({
        tipo: "alerta",
        mensagem: `${semAtendimento} lead${
          semAtendimento > 1 ? "s" : ""
        } sem atendimento há mais de 48 horas.`,
      });
    }
    if (propostasParadas > 0) {
      insights.push({
        tipo: "alerta",
        mensagem: `${propostasParadas} proposta${
          propostasParadas > 1 ? "s" : ""
        } sem atualização há mais de 7 dias.`,
      });
    }
    if (vendas > 0 && dias > 0) {
      const previsao30 = Math.round((vgv / dias) * 30);
      insights.push({
        tipo: "previsao",
        mensagem: `Previsão de VGV nos próximos 30 dias: ${previsao30.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL" },
        )}.`,
      });
    }

    return {
      resumo,
      funil,
      alertas,
      serie,
      origens,
      taxas,
      desempenho,
      ranking,
      insights,
      isPrivileged,
    };
  });

export const dashboardLeadsFiltrados = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((data: unknown) => leadsFiltradosSchema.parse(data))
  .handler(async ({ data, context }) => {
    const access = await resolveDashboardAccess(context);
    const { tenantId, isPrivileged } = access;

    if (
      !isPrivileged &&
      data.corretor_id &&
      data.corretor_id !== access.brokerId
    ) {
      throw new Error("Filtro de corretor não autorizado.");
    }
    const selectedBrokerId = isPrivileged && data.corretor_id
      ? await requireTenantBroker(context, tenantId, data.corretor_id)
      : access.brokerId;

    let query = context.supabase
      .from("leads")
      .select(
        "id, nome, email, telefone, status, origem, valor_estimado, created_at, updated_at",
      )
      .eq("tenant_id", tenantId);
    if (selectedBrokerId) query = query.eq("corretor_id", selectedBrokerId);
    if (data.inicio) query = query.gte("created_at", data.inicio);
    if (data.fim) query = query.lte("created_at", data.fim);
    if (data.status && data.status.length > 0) {
      query = query.in("status", data.status);
    }

    const { data: rows, error } = await query
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    let result = (rows ?? []) as Array<{
      id: string;
      nome: string;
      email: string | null;
      telefone: string | null;
      status: string;
      origem: string | null;
      valor_estimado: number | null;
      created_at: string;
      updated_at: string;
    }>;
    if (!data.alerta) return result;

    const agora = Date.now();
    const HORAS_48 = 48 * 60 * 60 * 1000;
    const DIAS_7 = 7 * 24 * 60 * 60 * 1000;
    if (data.alerta === "sem_atendimento") {
      result = result.filter(
        (lead) =>
          lead.status === "novo" &&
          agora - new Date(lead.created_at).getTime() > HORAS_48,
      );
    } else if (data.alerta === "sem_followup") {
      result = result.filter(
        (lead) =>
          lead.status === "conversando" &&
          agora - new Date(lead.updated_at).getTime() > DIAS_7,
      );
    } else if (data.alerta === "visitas_sem_feedback") {
      result = result.filter(
        (lead) =>
          lead.status === "visita" &&
          agora - new Date(lead.updated_at).getTime() > DIAS_7,
      );
    } else if (data.alerta === "propostas_paradas") {
      result = result.filter(
        (lead) =>
          lead.status === "proposta" &&
          agora - new Date(lead.updated_at).getTime() > DIAS_7,
      );
    }
    return result;
  });