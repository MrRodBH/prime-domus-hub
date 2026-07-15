import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TIPOS = [
  "ligacao",
  "whatsapp",
  "email",
  "visita",
  "video_chamada",
  "reuniao_presencial",
  "outros",
  "descarte",
  "ia_analise",
] as const;
type TipoAtividade = (typeof TIPOS)[number];

const MOTIVOS = [
  "sem_contato",
  "nao_e_lead",
  "financeiro",
  "desistiu",
  "aluguel",
  "outros",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserSnapshot(context: any): Promise<{ nome: string; perfil: string }> {
  // Busca papéis
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const rolesList = (roles ?? []).map((r: { role: string }) => r.role);
  const perfil = rolesList.includes("admin")
    ? "admin"
    : rolesList.includes("corretor")
      ? "corretor"
      : rolesList.includes("secretaria")
        ? "secretaria"
        : "usuario";

  // Busca nome do corretor (se houver)
  const { data: corretor } = await context.supabase
    .from("corretores")
    .select("nome, sobrenome, email")
    .eq("user_id", context.userId)
    .maybeSingle();
  const c = corretor as { nome?: string; sobrenome?: string | null; email?: string } | null;
  const nome = c?.nome
    ? `${c.nome}${c.sobrenome ? " " + c.sobrenome : ""}`
    : (c?.email ?? context.claims?.email ?? "Usuário");
  return { nome, perfil };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function canAccessLead(context: any, leadId: string): Promise<{ isAdmin: boolean; isOwner: boolean }> {
  const { data: isAdminData } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  const isAdmin = !!isAdminData;
  const { data: lead } = await context.supabase
    .from("leads")
    .select("assigned_to")
    .eq("id", leadId)
    .maybeSingle();
  const isOwner = (lead as { assigned_to?: string } | null)?.assigned_to === context.userId;
  if (!isAdmin && !isOwner) {
    throw new Error("Acesso negado a este lead.");
  }
  return { isAdmin, isOwner };
}

// ===== LISTAR HISTÓRICO =====
export const listarHistorico = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lead_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await canAccessLead(context, data.lead_id);
    const { data: atividades, error } = await context.supabase
      .from("lead_atividades")
      .select("id, lead_id, user_id, user_nome, user_perfil, tipo, descricao, metadata, created_at, updated_at")
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: descarte } = await context.supabase
      .from("lead_descartes")
      .select("id, motivo, detalhes, user_nome, created_at")
      .eq("lead_id", data.lead_id)
      .maybeSingle();

    return {
      atividades: atividades ?? [],
      descarte: descarte ?? null,
    };
  });

// ===== CRIAR ATIVIDADE =====
export const criarAtividade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      lead_id: z.string().uuid(),
      tipo: z.enum(TIPOS),
      descricao: z.string().trim().min(1, "Descrição obrigatória").max(4000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await canAccessLead(context, data.lead_id);
    const snap = await getUserSnapshot(context);

    // Admin pode inserir mesmo sem ser dono → usa admin client para contornar RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = context.supabase;
    if (isAdmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    }

    const { data: inserted, error } = await client
      .from("lead_atividades")
      .insert({
        lead_id: data.lead_id,
        user_id: context.userId,
        user_nome: snap.nome,
        user_perfil: snap.perfil,
        tipo: data.tipo,
        descricao: data.descricao.trim(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (inserted as { id: string }).id };
  });

// ===== EDITAR ATIVIDADE =====
export const editarAtividade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      descricao: z.string().trim().min(1).max(4000),
    }),
  )
  .handler(async ({ data, context }) => {
    // Carrega atividade + lead
    const { data: atv, error: e1 } = await context.supabase
      .from("lead_atividades")
      .select("id, lead_id, user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    const a = atv as { id: string; lead_id: string; user_id: string } | null;
    if (!a) throw new Error("Atividade não encontrada.");

    const { isAdmin } = await canAccessLead(context, a.lead_id);
    if (!isAdmin && a.user_id !== context.userId) {
      throw new Error("Apenas o autor ou um administrador pode editar este registro.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = context.supabase;
    if (isAdmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    }
    const { error } = await client
      .from("lead_atividades")
      .update({ descricao: data.descricao.trim() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== DESCARTAR LEAD =====
export const descartarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      lead_id: z.string().uuid(),
      motivo: z.enum(MOTIVOS),
      detalhes: z.string().trim().min(1).max(2000),
    }),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await canAccessLead(context, data.lead_id);
    const snap = await getUserSnapshot(context);

    // Carrega tipos de atividades existentes
    const { data: ativs, error: eAt } = await context.supabase
      .from("lead_atividades")
      .select("tipo")
      .eq("lead_id", data.lead_id);
    if (eAt) throw new Error(eAt.message);
    const tipos = new Set((ativs ?? []).map((r: { tipo: string }) => r.tipo));
    if (tipos.size === 0) {
      throw new Error("Registre ao menos uma atividade antes de descartar o lead.");
    }
    if (data.motivo === "sem_contato") {
      const obrig: TipoAtividade[] = ["ligacao", "whatsapp", "email"];
      const pendentes = obrig.filter((t) => !tipos.has(t));
      if (pendentes.length > 0) {
        const labels: Record<string, string> = {
          ligacao: "Ligação",
          whatsapp: "WhatsApp",
          email: "Email",
        };
        throw new Error(
          `Para descartar por falta de contato é obrigatório registrar tentativa de Ligação, WhatsApp e Email. Atividades pendentes: ${pendentes
            .map((p) => labels[p])
            .join(", ")}.`,
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = context.supabase;
    if (isAdmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    }

    const MOTIVO_LABEL: Record<string, string> = {
      sem_contato: "Não consigo contato",
      nao_e_lead: "Não é Lead",
      financeiro: "Condições Financeiras",
      desistiu: "Desistiu da Compra",
      aluguel: "Procurando Aluguel",
      outros: "Outros",
    };

    // Insere descarte
    const { error: eD } = await client.from("lead_descartes").insert({
      lead_id: data.lead_id,
      user_id: context.userId,
      user_nome: snap.nome,
      user_perfil: snap.perfil,
      motivo: data.motivo,
      detalhes: data.detalhes.trim(),
    });
    if (eD) {
      if (eD.message.toLowerCase().includes("duplicate") || eD.message.includes("unique")) {
        throw new Error("Este lead já foi descartado.");
      }
      throw new Error(eD.message);
    }

    // Registra atividade de descarte no histórico
    await client.from("lead_atividades").insert({
      lead_id: data.lead_id,
      user_id: context.userId,
      user_nome: snap.nome,
      user_perfil: snap.perfil,
      tipo: "descarte",
      descricao: `Motivo: ${MOTIVO_LABEL[data.motivo]}\n\n${data.detalhes.trim()}`,
      metadata: { motivo: data.motivo },
    });

    // PR-M1 — Direct `leads.status` writes are forbidden. Status transitions
    // (including "descartado" originated from the history panel) MUST flow
    // through `transicionarLead` in `@/lib/api/leads-crm.functions`, which
    // wraps the typed boundary and the SECURITY DEFINER RPC. This legacy
    // handler now only records the activity/descarte rows for audit trail.
    return { ok: true };
  });

// ===== ANÁLISE DE IA =====
export const analisarLeadIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ lead_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await canAccessLead(context, data.lead_id);
    const snap = await getUserSnapshot(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const { data: lead } = await context.supabase
      .from("leads")
      .select("nome, status, origem, mensagem, created_at, imovel:imoveis(titulo)")
      .eq("id", data.lead_id)
      .maybeSingle();
    const l = lead as {
      nome?: string;
      status?: string;
      origem?: string;
      mensagem?: string;
      created_at?: string;
      imovel?: { titulo?: string } | null;
    } | null;

    const { data: ativs } = await context.supabase
      .from("lead_atividades")
      .select("tipo, descricao, created_at, user_nome")
      .eq("lead_id", data.lead_id)
      .order("created_at", { ascending: true });

    const TIPO_LABEL: Record<string, string> = {
      ligacao: "Ligação",
      whatsapp: "WhatsApp",
      email: "Email",
      visita: "Visita",
      video_chamada: "Vídeo Chamada",
      reuniao_presencial: "Reunião Presencial",
      outros: "Outros",
      descarte: "Descarte",
      ia_analise: "Análise IA",
    };

    const historicoTxt = (ativs ?? [])
      .filter((a: { tipo: string }) => a.tipo !== "ia_analise")
      .map(
        (a: { tipo: string; descricao: string; created_at: string }) =>
          `[${new Date(a.created_at).toLocaleString("pt-BR")}] ${TIPO_LABEL[a.tipo] ?? a.tipo}: ${a.descricao}`,
      )
      .join("\n");

    const ficha = [
      `Lead: ${l?.nome ?? "—"}`,
      `Status (etapa do funil): ${l?.status ?? "—"}`,
      `Origem: ${l?.origem ?? "—"}`,
      `Imóvel de interesse: ${l?.imovel?.titulo ?? "—"}`,
      `Mensagem inicial: ${l?.mensagem ?? "—"}`,
      `Criado em: ${l?.created_at ? new Date(l.created_at).toLocaleString("pt-BR") : "—"}`,
      `Total de interações: ${(ativs ?? []).length}`,
    ].join("\n");

    const system =
      "Você é um consultor sênior de vendas imobiliárias de alto padrão. " +
      "Analisa o histórico de interações de um lead e devolve uma análise objetiva em JSON. " +
      "Não use emojis. Responda em português do Brasil.";

    const user = `Dados do lead:
${ficha}

Histórico de interações (ordem cronológica):
${historicoTxt || "(nenhuma interação registrada ainda)"}

Responda APENAS com um JSON válido (sem markdown, sem comentários) no seguinte formato:
{
  "diagnostico": "uma frase curta classificando o lead (ex: Lead engajado, Lead morno, Lead frio, Alto potencial, Baixa probabilidade)",
  "proximas_acoes": ["ação 1", "ação 2", "ação 3"],
  "recomendacoes": ["recomendação prática 1", "recomendação prática 2"]
}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (resp.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Falha na IA (${resp.status}): ${t.slice(0, 200)}`);
    }
    const json = await resp.json();
    const raw: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

    let parsed: { diagnostico?: string; proximas_acoes?: string[]; recomendacoes?: string[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { diagnostico: cleaned };
    }

    // Persiste como atividade ia_analise
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let client: any = context.supabase;
    if (isAdmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      client = supabaseAdmin;
    }
    const resumo =
      `Diagnóstico: ${parsed.diagnostico ?? "—"}\n` +
      `Próximas ações: ${(parsed.proximas_acoes ?? []).join("; ") || "—"}\n` +
      `Recomendações: ${(parsed.recomendacoes ?? []).join("; ") || "—"}`;
    await client.from("lead_atividades").insert({
      lead_id: data.lead_id,
      user_id: context.userId,
      user_nome: snap.nome,
      user_perfil: snap.perfil,
      tipo: "ia_analise",
      descricao: resumo,
      metadata: parsed,
    });

    return parsed;
  });

// ===== CONTAGEM DE DESCARTES (para o funil) =====
export const adminContarDescartes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado.");
    const { count, error } = await context.supabase
      .from("lead_descartes")
      .select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return { total: count ?? 0 };
  });
