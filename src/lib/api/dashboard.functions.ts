import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================
// DASHBOARD CRM IMOBILIÁRIO — backend de agregação
// ============================================================
// Retorna todas as métricas em uma única chamada para o painel.
// Filtros: período, corretor, equipe, origem.
// Escopo: admin/gerente vê tudo; corretor vê apenas seus leads.
// ============================================================

const filtroSchema = z.object({
  inicio: z.string(), // ISO
  fim: z.string(), // ISO
  corretor_id: z.string().uuid().nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  origem: z.string().nullable().optional(),
});

const STATUS_FUNIL = ["novo", "conversando", "visita", "proposta", "ganho", "perdido"] as const;
type StatusFunil = (typeof STATUS_FUNIL)[number];

// Mapeia status do CRM para etapas do funil
const ETAPA_INDEX: Record<StatusFunil, number> = {
  novo: 0, // Lead Captado
  conversando: 1, // Contato Realizado / Qualificado
  visita: 2, // Visita Agendada
  proposta: 3, // Proposta
  ganho: 4, // Venda
  perdido: 5, // Descartado
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

function diffPercent(atual: number, anterior: number): number {
  if (anterior === 0) return atual === 0 ? 0 : 100;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

function inRange(d: string, ini: Date, fim: Date) {
  const t = new Date(d).getTime();
  return t >= ini.getTime() && t <= fim.getTime();
}

export const dashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filtroSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const inicio = new Date(data.inicio);
    const fim = new Date(data.fim);
    const duracao = fim.getTime() - inicio.getTime();
    const inicioAnterior = new Date(inicio.getTime() - duracao);
    const fimAnterior = new Date(inicio.getTime() - 1);

    // ---- Detecta escopo do usuário ----
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const rolesArr = (roles ?? []).map((r) => (r as { role: string }).role);
    const isPrivileged = rolesArr.some((r) => ["admin", "gerente", "secretaria"].includes(r));

    let corretorIdSelf: string | null = null;
    if (!isPrivileged) {
      const { data: c } = await supabase.from("corretores").select("id").eq("user_id", userId).maybeSingle();
      corretorIdSelf = (c as { id: string } | null)?.id ?? null;
    }

    // ---- Filtros adicionais (equipe → resolve corretores) ----
    let teamCorretorIds: string[] | null = null;
    if (data.team_id && isPrivileged) {
      const { data: members } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", data.team_id);
      const userIds = (members ?? []).map((m) => (m as { user_id: string }).user_id);
      if (userIds.length > 0) {
        const { data: cs } = await supabase.from("corretores").select("id").in("user_id", userIds);
        teamCorretorIds = (cs ?? []).map((c) => (c as { id: string }).id);
      } else {
        teamCorretorIds = [];
      }
    }

    // ---- Query base: leads do período atual + período anterior ----
    let query = supabase
      .from("leads")
      .select("id, status, origem, corretor_id, valor_estimado, created_at, updated_at, nome, email, telefone")
      .gte("created_at", inicioAnterior.toISOString())
      .lte("created_at", fim.toISOString());

    if (!isPrivileged && corretorIdSelf) query = query.eq("corretor_id", corretorIdSelf);
    if (data.corretor_id && isPrivileged) query = query.eq("corretor_id", data.corretor_id);
    if (teamCorretorIds) {
      if (teamCorretorIds.length === 0) query = query.eq("corretor_id", "00000000-0000-0000-0000-000000000000");
      else query = query.in("corretor_id", teamCorretorIds);
    }
    if (data.origem) query = query.eq("origem", data.origem);

    const { data: leadsRaw, error } = await query;
    if (error) throw new Error(error.message);
    const leads = (leadsRaw ?? []) as Lead[];

    const atuais = leads.filter((l) => inRange(l.created_at, inicio, fim));
    const anteriores = leads.filter((l) => inRange(l.created_at, inicioAnterior, fimAnterior));

    // ---- BLOCO 1 — Resumo Executivo ----
    const countByStatus = (arr: Lead[], st: StatusFunil) => arr.filter((l) => l.status === st).length;
    const countAtLeast = (arr: Lead[], st: StatusFunil) =>
      arr.filter((l) => {
        const idx = ETAPA_INDEX[l.status as StatusFunil] ?? -1;
        const target = ETAPA_INDEX[st];
        return idx >= target && idx !== 5;
      }).length;

    const leadsTotal = atuais.length;
    const leadsAnterior = anteriores.length;
    const visitas = countAtLeast(atuais, "visita");
    const propostas = countAtLeast(atuais, "proposta");
    const vendas = countByStatus(atuais, "ganho");
    const vgv = atuais
      .filter((l) => l.status === "ganho")
      .reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

    const resumo = {
      leads: { atual: leadsTotal, anterior: leadsAnterior, deltaPct: diffPercent(leadsTotal, leadsAnterior) },
      visitas: {
        atual: visitas,
        conversao: leadsTotal > 0 ? Math.round((visitas / leadsTotal) * 1000) / 10 : 0,
      },
      propostas: {
        atual: propostas,
        conversao: visitas > 0 ? Math.round((propostas / visitas) * 1000) / 10 : 0,
      },
      vendas: { atual: vendas, vgv },
    };

    // ---- BLOCO 3 — Funil ----
    const captado = atuais.length;
    const contato = atuais.filter((l) => ETAPA_INDEX[l.status as StatusFunil] >= 1 && l.status !== "perdido").length;
    const qualificado = contato; // sem etapa separada — agregada ao contato
    const visitaCount = countAtLeast(atuais, "visita");
    const propostaCount = countAtLeast(atuais, "proposta");
    const vendaCount = countByStatus(atuais, "ganho");
    const descartadoCount = countByStatus(atuais, "perdido");

    const funil = [
      { etapa: "Lead Captado", quantidade: captado, conversao: 100, perda: 0 },
      {
        etapa: "Contato Realizado",
        quantidade: contato,
        conversao: captado ? Math.round((contato / captado) * 1000) / 10 : 0,
        perda: captado - contato,
      },
      {
        etapa: "Qualificado",
        quantidade: qualificado,
        conversao: contato ? Math.round((qualificado / contato) * 1000) / 10 : 0,
        perda: contato - qualificado,
      },
      {
        etapa: "Visita Agendada",
        quantidade: visitaCount,
        conversao: qualificado ? Math.round((visitaCount / qualificado) * 1000) / 10 : 0,
        perda: qualificado - visitaCount,
      },
      {
        etapa: "Proposta",
        quantidade: propostaCount,
        conversao: visitaCount ? Math.round((propostaCount / visitaCount) * 1000) / 10 : 0,
        perda: visitaCount - propostaCount,
      },
      {
        etapa: "Venda",
        quantidade: vendaCount,
        conversao: propostaCount ? Math.round((vendaCount / propostaCount) * 1000) / 10 : 0,
        perda: propostaCount - vendaCount,
      },
      { etapa: "Descartados", quantidade: descartadoCount, conversao: 0, perda: descartadoCount },
    ];

    // ---- BLOCO 4 — Alertas ----
    const agora = Date.now();
    const HORAS_48 = 48 * 3600 * 1000;
    const DIAS_7 = 7 * 24 * 3600 * 1000;

    // Para alertas usamos toda a base ativa (não só do período)
    let allQuery = supabase
      .from("leads")
      .select("id, status, corretor_id, created_at, updated_at, nome")
      .not("status", "in", '("ganho","perdido")');
    if (!isPrivileged && corretorIdSelf) allQuery = allQuery.eq("corretor_id", corretorIdSelf);
    if (data.corretor_id && isPrivileged) allQuery = allQuery.eq("corretor_id", data.corretor_id);
    const { data: ativosRaw } = await allQuery;
    const ativos = (ativosRaw ?? []) as Lead[];

    const semAtendimento = ativos.filter(
      (l) => l.status === "novo" && agora - new Date(l.created_at).getTime() > HORAS_48,
    ).length;
    const semFollowup = ativos.filter(
      (l) => l.status === "conversando" && agora - new Date(l.updated_at).getTime() > DIAS_7,
    ).length;
    const visitasSemFeedback = ativos.filter(
      (l) => l.status === "visita" && agora - new Date(l.updated_at).getTime() > DIAS_7,
    ).length;
    const propostasParadas = ativos.filter(
      (l) => l.status === "proposta" && agora - new Date(l.updated_at).getTime() > DIAS_7,
    ).length;

    const alertas = {
      semAtendimento,
      semFollowup,
      visitasSemFeedback,
      propostasParadas,
    };

    // ---- BLOCO 5 — Evolução comercial (série diária dentro do período) ----
    const dias = Math.max(1, Math.ceil(duracao / (24 * 3600 * 1000)));
    const serie: Array<{ data: string; leads: number; visitas: number; propostas: number; vendas: number; vgv: number }> = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio.getTime() + i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      serie.push({ data: key, leads: 0, visitas: 0, propostas: 0, vendas: 0, vgv: 0 });
    }
    const indexByDay = new Map(serie.map((s, i) => [s.data, i]));
    for (const l of atuais) {
      const key = l.created_at.slice(0, 10);
      const idx = indexByDay.get(key);
      if (idx === undefined) continue;
      serie[idx].leads += 1;
      const e = ETAPA_INDEX[l.status as StatusFunil] ?? -1;
      if (e >= 2 && e !== 5) serie[idx].visitas += 1;
      if (e >= 3 && e !== 5) serie[idx].propostas += 1;
      if (l.status === "ganho") {
        serie[idx].vendas += 1;
        serie[idx].vgv += Number(l.valor_estimado) || 0;
      }
    }

    // ---- BLOCO 6 — Origem dos leads ----
    const origensMap = new Map<string, { total: number; vendas: number }>();
    for (const l of atuais) {
      const k = (l.origem || "Outros").trim() || "Outros";
      const cur = origensMap.get(k) ?? { total: 0, vendas: 0 };
      cur.total += 1;
      if (l.status === "ganho") cur.vendas += 1;
      origensMap.set(k, cur);
    }
    const origens = Array.from(origensMap.entries())
      .map(([nome, v]) => ({
        nome,
        quantidade: v.total,
        percentual: leadsTotal ? Math.round((v.total / leadsTotal) * 1000) / 10 : 0,
        conversao: v.total ? Math.round((v.vendas / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    // ---- BLOCO 7 — Taxas de Conversão (metas hardcoded — configuráveis no futuro) ----
    const METAS = { leadContato: 80, contatoVisita: 50, visitaProposta: 50, propostaVenda: 40, leadVenda: 5 };
    const taxas = [
      { label: "Lead → Contato", atual: captado ? Math.round((contato / captado) * 1000) / 10 : 0, meta: METAS.leadContato },
      { label: "Contato → Visita", atual: contato ? Math.round((visitaCount / contato) * 1000) / 10 : 0, meta: METAS.contatoVisita },
      { label: "Visita → Proposta", atual: visitaCount ? Math.round((propostaCount / visitaCount) * 1000) / 10 : 0, meta: METAS.visitaProposta },
      { label: "Proposta → Venda", atual: propostaCount ? Math.round((vendaCount / propostaCount) * 1000) / 10 : 0, meta: METAS.propostaVenda },
      { label: "Lead → Venda", atual: captado ? Math.round((vendaCount / captado) * 1000) / 10 : 0, meta: METAS.leadVenda },
    ];

    // ---- BLOCO 8 — Desempenho individual (do corretor atual) ----
    let desempenho: { leads: number; visitas: number; propostas: number; vendas: number; vgv: number } | null = null;
    if (corretorIdSelf) {
      const meusAtuais = atuais.filter((l) => l.corretor_id === corretorIdSelf);
      desempenho = {
        leads: meusAtuais.length,
        visitas: countAtLeast(meusAtuais, "visita"),
        propostas: countAtLeast(meusAtuais, "proposta"),
        vendas: countByStatus(meusAtuais, "ganho"),
        vgv: meusAtuais.filter((l) => l.status === "ganho").reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0),
      };
    }

    // ---- BLOCO 9 — Ranking da equipe (apenas privilegiados) ----
    let ranking: Array<{
      corretor_id: string;
      nome: string;
      leads: number;
      visitas: number;
      propostas: number;
      vendas: number;
      conversao: number;
      vgv: number;
    }> = [];
    if (isPrivileged) {
      const { data: corretoresRaw } = await supabase.from("corretores").select("id, nome, sobrenome");
      const corretores = (corretoresRaw ?? []) as Array<{ id: string; nome: string; sobrenome: string | null }>;
      ranking = corretores
        .map((c) => {
          const seus = atuais.filter((l) => l.corretor_id === c.id);
          const v = countByStatus(seus, "ganho");
          return {
            corretor_id: c.id,
            nome: [c.nome, c.sobrenome].filter(Boolean).join(" "),
            leads: seus.length,
            visitas: countAtLeast(seus, "visita"),
            propostas: countAtLeast(seus, "proposta"),
            vendas: v,
            conversao: seus.length ? Math.round((v / seus.length) * 1000) / 10 : 0,
            vgv: seus.filter((l) => l.status === "ganho").reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0),
          };
        })
        .filter((r) => r.leads > 0 || r.vendas > 0)
        .sort((a, b) => b.vgv - a.vgv)
        .slice(0, 10);
    }

    // ---- BLOCO 2 — IA Comercial (motor de regras) ----
    const insights: Array<{ tipo: "performance" | "gargalo" | "oportunidade" | "alerta" | "previsao"; mensagem: string }> = [];

    if (leadsAnterior > 0) {
      const d = diffPercent(leadsTotal, leadsAnterior);
      insights.push({
        tipo: "performance",
        mensagem: d >= 0
          ? `Você recebeu ${d}% mais leads que no período anterior.`
          : `Volume de leads caiu ${Math.abs(d)}% em relação ao período anterior.`,
      });
    }
    if (vendas > 0 && vgv > 0) {
      insights.push({ tipo: "performance", mensagem: `VGV do período: ${vgv.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.` });
    }

    // Gargalo: menor taxa de conversão entre etapas consecutivas
    const transicoes = [
      { nome: "Lead → Contato", v: captado ? contato / captado : 1 },
      { nome: "Contato → Visita", v: contato ? visitaCount / contato : 1 },
      { nome: "Visita → Proposta", v: visitaCount ? propostaCount / visitaCount : 1 },
      { nome: "Proposta → Venda", v: propostaCount ? vendaCount / propostaCount : 1 },
    ];
    const piorTransicao = transicoes.reduce((a, b) => (b.v < a.v ? b : a), transicoes[0]);
    if (captado > 0) {
      insights.push({
        tipo: "gargalo",
        mensagem: `O principal gargalo está na etapa ${piorTransicao.nome} (${Math.round(piorTransicao.v * 100)}% de conversão).`,
      });
    }

    const propostasAbertas = ativos.filter((l) => l.status === "proposta").length;
    if (propostasAbertas > 0) {
      insights.push({
        tipo: "oportunidade",
        mensagem: `Existem ${propostasAbertas} proposta${propostasAbertas > 1 ? "s" : ""} aguardando retorno — alta chance de fechamento.`,
      });
    }

    if (semAtendimento > 0) {
      insights.push({
        tipo: "alerta",
        mensagem: `${semAtendimento} lead${semAtendimento > 1 ? "s" : ""} sem atendimento há mais de 48 horas.`,
      });
    }
    if (propostasParadas > 0) {
      insights.push({
        tipo: "alerta",
        mensagem: `${propostasParadas} proposta${propostasParadas > 1 ? "s" : ""} sem atualização há mais de 7 dias.`,
      });
    }

    if (vendas > 0 && dias > 0) {
      const ritmoDiario = vgv / dias;
      const previsao30 = Math.round(ritmoDiario * 30);
      insights.push({
        tipo: "previsao",
        mensagem: `Previsão de VGV nos próximos 30 dias: ${previsao30.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
      });
    }

    return { resumo, funil, alertas, serie, origens, taxas, desempenho, ranking, insights, isPrivileged };
  });

// ============================================================
// Lista de leads filtrada (drill-down ao clicar em uma etapa/alerta)
// ============================================================
export const dashboardLeadsFiltrados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        inicio: z.string().optional(),
        fim: z.string().optional(),
        status: z.array(z.string()).optional(),
        alerta: z.enum(["sem_atendimento", "sem_followup", "visitas_sem_feedback", "propostas_paradas"]).optional(),
        corretor_id: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let query = supabase.from("leads").select("id, nome, email, telefone, status, origem, valor_estimado, created_at, updated_at");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isPrivileged = (roles ?? []).some((r) => ["admin", "gerente", "secretaria"].includes((r as { role: string }).role));
    if (!isPrivileged) {
      const { data: c } = await supabase.from("corretores").select("id").eq("user_id", userId).maybeSingle();
      const cid = (c as { id: string } | null)?.id;
      if (cid) query = query.eq("corretor_id", cid);
      else return [];
    }
    if (data.corretor_id && isPrivileged) query = query.eq("corretor_id", data.corretor_id);
    if (data.inicio) query = query.gte("created_at", data.inicio);
    if (data.fim) query = query.lte("created_at", data.fim);
    if (data.status && data.status.length > 0) query = query.in("status", data.status);

    const agora = Date.now();
    const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    let result = (rows ?? []) as Array<{ status: string; created_at: string; updated_at: string }>;
    if (data.alerta) {
      const HORAS_48 = 48 * 3600 * 1000;
      const DIAS_7 = 7 * 24 * 3600 * 1000;
      if (data.alerta === "sem_atendimento") {
        result = result.filter((l) => l.status === "novo" && agora - new Date(l.created_at).getTime() > HORAS_48);
      } else if (data.alerta === "sem_followup") {
        result = result.filter((l) => l.status === "conversando" && agora - new Date(l.updated_at).getTime() > DIAS_7);
      } else if (data.alerta === "visitas_sem_feedback") {
        result = result.filter((l) => l.status === "visita" && agora - new Date(l.updated_at).getTime() > DIAS_7);
      } else if (data.alerta === "propostas_paradas") {
        result = result.filter((l) => l.status === "proposta" && agora - new Date(l.updated_at).getTime() > DIAS_7);
      }
    }
    return result;
  });
