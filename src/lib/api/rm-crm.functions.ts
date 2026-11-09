// Adaptador do CRM aprovado da RM Prime sobre o CRM canônico do SaaS.
// Toda chamada passa por requireTenant + authorizeTenantCrmOperation; leituras e escritas são
// sempre filtradas pelo tenant autorizado. Mudança de etapa/tarefas/cadastro usam as RPCs canônicas.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { authorizeTenantCrmOperation, trustedTenantCrmContext, safeTenantCrmError, type TenantCrmOperation } from "@/lib/api/tenant-crm-authority.server";
import { listTenantLeadsForContext, transitionTenantLeadForContext } from "@/lib/api/tenant-crm.functions";
import {
  ETAPAS_CRM, ETAPAS_SEM_PROXIMA_ACAO, ETAPA_PARA_STATUS, ROTULOS_ATIVIDADE, TIPOS_ATENDIMENTO, TIPOS_OBRIGATORIOS_DESCARTE,
  statusParaEtapa, type AtividadeCrm, type EtapaCrm, type LeadCrm, type OrigemLead, type ProximaAcao, type TipoAtividade,
} from "@/lib/rm-crm/types";

type Ctx = { userId: string; tenant: Parameters<typeof trustedTenantCrmContext>[0]["tenant"] };

async function autorizar(context: Ctx, op: TenantCrmOperation) {
  const decision = await authorizeTenantCrmOperation(trustedTenantCrmContext(context), op);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { tenantId: decision.tenantId, userId: decision.actorUserId, db: supabaseAdmin as any };
}
async function rpc(context: Ctx, op: TenantCrmOperation, nome: string, args: Record<string, unknown>) {
  const a = await autorizar(context, op);
  const { data, error } = await a.db.rpc(nome, { _actor_user_id: a.userId, _tenant_id: a.tenantId, _tenant_origin: context.tenant.origin, ...args });
  if (error) throw safeTenantCrmError(error);
  return data as Record<string, unknown>;
}
const chave = () => crypto.randomUUID();

const TIPO_TAREFA: Record<string, string> = { ligacao: "call", whatsapp: "follow_up", email: "follow_up", visita: "visit", reuniao: "meeting", outros: "other" };
const TIPO_ATIVIDADE_DB: Record<string, string> = { ligacao: "ligacao", whatsapp: "whatsapp", email: "email", visita: "visita", reuniao: "reuniao_presencial", outros: "outros" };
function tipoDaAtividade(linha: { tipo: string; metadata: any }): TipoAtividade {
  const original = linha.metadata?.tipo_original;
  if (typeof original === "string" && original in ROTULOS_ATIVIDADE) return original as TipoAtividade;
  if (linha.tipo === "reuniao_presencial" || linha.tipo === "video_chamada") return "reuniao";
  return (linha.tipo in ROTULOS_ATIVIDADE ? linha.tipo : "outros") as TipoAtividade;
}
function tipoDaTarefa(t: { title: string; task_type: string }): TipoAtividade {
  if (t.title in TIPO_TAREFA) return t.title as TipoAtividade;
  return ({ call: "ligacao", visit: "visita", meeting: "reuniao" } as Record<string, TipoAtividade>)[t.task_type] ?? "outros";
}

async function registrarAtividade(a: Awaited<ReturnType<typeof autorizar>>, leadId: string, tipo: TipoAtividade, descricao: string) {
  const { data: membro } = await a.db.from("tenant_members").select("display_name, tenant_role").eq("tenant_id", a.tenantId).eq("user_id", a.userId).maybeSingle();
  const { data: u } = await a.db.auth.admin.getUserById(a.userId);
  const { error } = await a.db.from("lead_atividades").insert({
    tenant_id: a.tenantId, lead_id: leadId, user_id: a.userId,
    user_nome: membro?.display_name || u?.user?.email || "Usuário", user_perfil: membro?.tenant_role || "membro",
    tipo: TIPO_ATIVIDADE_DB[tipo] ?? "outros", descricao, metadata: { tipo_original: tipo },
  });
  if (error) throw new Error("Não foi possível registrar a atividade.");
}

async function leadDoTenant(a: Awaited<ReturnType<typeof autorizar>>, leadId: string) {
  const { data } = await a.db.from("leads").select("id, version, status, corretor_id").eq("tenant_id", a.tenantId).eq("id", leadId).maybeSingle();
  if (!data) throw new Error("Lead não encontrado.");
  return data as { id: string; version: number; status: string; corretor_id: string | null };
}

export const listarLeadsCrm = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<LeadCrm[]> => {
    const base = await listTenantLeadsForContext(context, { limit: 500 });
    if (base.length === 0) return [];
    const a = await autorizar(context, "lead.list");
    const ids = base.map((l) => l.id);
    const [{ data: extras }, { data: tarefas }, { data: atividades }, { data: descartes }, { data: perdas }] = await Promise.all([
      a.db.from("leads").select("id, corretor_id, consent_lgpd, discard_reason_id, lost_reason_id").eq("tenant_id", a.tenantId).in("id", ids),
      a.db.from("crm_lead_tasks").select("id, lead_id, task_type, title, description, due_at, completed_at").eq("tenant_id", a.tenantId).in("lead_id", ids).in("status", ["open", "in_progress"]).order("due_at", { ascending: true }),
      a.db.from("lead_atividades").select("lead_id, tipo, metadata, user_id").eq("tenant_id", a.tenantId).in("lead_id", ids),
      a.db.from("lead_discard_reasons").select("id, nome").eq("tenant_id", a.tenantId),
      a.db.from("deal_lost_reasons").select("id, nome").eq("tenant_id", a.tenantId),
    ]);
    const extra = new Map<string, any>((extras ?? []).map((e: any) => [e.id, e]));
    const corretorIds = [...new Set((extras ?? []).map((e: any) => e.corretor_id).filter(Boolean))];
    const { data: corretores } = corretorIds.length
      ? await a.db.from("corretores").select("id, nome").eq("tenant_id", a.tenantId).in("id", corretorIds)
      : { data: [] };
    const nomeCorretor = new Map<string, string>((corretores ?? []).map((c: any) => [c.id, c.nome]));
    const motivo = new Map<string, string>([...(descartes ?? []), ...(perdas ?? [])].map((m: any) => [m.id, m.nome]));
    const proximas = new Map<string, ProximaAcao>();
    for (const t of tarefas ?? []) {
      if (!proximas.has(t.lead_id) && t.due_at) proximas.set(t.lead_id, { id: t.id, lead_id: t.lead_id, tipo: tipoDaTarefa(t), descricao: t.description ?? "", data_hora: t.due_at, concluida_em: null });
    }
    const porLead = new Map<string, Set<TipoAtividade>>();
    const meus = new Set<string>();
    for (const at of atividades ?? []) {
      const tipo = tipoDaAtividade(at);
      if (!TIPOS_ATENDIMENTO.includes(tipo)) continue;
      const s = porLead.get(at.lead_id) ?? new Set<TipoAtividade>();
      s.add(tipo); porLead.set(at.lead_id, s);
      if (at.user_id === a.userId) meus.add(at.lead_id);
    }
    return base.map((l) => {
      const e = extra.get(l.id) ?? {};
      return {
        id: l.id, nome: l.nome, telefone: l.telefone ?? "", email: l.email, origem: (l.origem ?? "outros") as OrigemLead,
        etapa_crm: statusParaEtapa(l.status), motivo_descarte: motivo.get(e.discard_reason_id ?? e.lost_reason_id) ?? null,
        mensagem: l.mensagem, consentimento_lgpd: Boolean(e.consent_lgpd), criado_em: l.created_at, atualizado_em: l.updated_at,
        imovel: l.imovel?.titulo ? { titulo: l.imovel.titulo, slug: l.imovel.slug ?? "" } : null,
        corretor_nome: e.corretor_id ? nomeCorretor.get(e.corretor_id) ?? null : null,
        sem_atendimento: (porLead.get(l.id)?.size ?? 0) === 0, novo_para_mim: !meus.has(l.id),
        atendimentos: [...(porLead.get(l.id) ?? [])], proxima_acao: proximas.get(l.id) ?? null,
      };
    });
  });

export const listarCorretoresAtribuiveis = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<{ id: string; nome: string }[]> => {
    const a = await autorizar(context, "lead.list");
    const { data } = await a.db.from("corretores").select("id, nome").eq("tenant_id", a.tenantId).eq("ativo", true).order("nome");
    return (data ?? []).map((c: any) => ({ id: c.id, nome: c.nome }));
  });

export const listarMotivosDescarte = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<string[]> => {
    const a = await autorizar(context, "lead.list");
    const { data } = await a.db.from("lead_discard_reasons").select("nome").eq("tenant_id", a.tenantId).eq("ativo", true).order("ordem");
    return (data ?? []).map((m: any) => m.nome);
  });

export const obterAtividades = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((e: { lead_id: string }) => z.object({ lead_id: z.string().uuid() }).parse(e))
  .handler(async ({ data, context }): Promise<AtividadeCrm[]> => {
    const a = await autorizar(context, "lead.read");
    await leadDoTenant(a, data.lead_id);
    const { data: linhas, error } = await a.db.from("lead_atividades").select("id, tipo, descricao, metadata, user_nome, created_at")
      .eq("tenant_id", a.tenantId).eq("lead_id", data.lead_id).order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error("Não foi possível carregar o histórico do lead.");
    return (linhas ?? []).map((l: any) => ({ id: l.id, tipo: tipoDaAtividade(l), descricao: l.descricao, data: l.created_at, autor_nome: l.user_nome === "Sistema" ? null : l.user_nome }));
  });

const tiposManuais = ["ligacao", "whatsapp", "email", "visita", "reuniao", "outros"] as const;

export const agendarProximaAcao = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { lead_id: string; tipo: (typeof tiposManuais)[number]; descricao?: string; data_hora: string }) =>
    z.object({ lead_id: z.string().uuid(), tipo: z.enum(tiposManuais), descricao: z.string().trim().max(500).optional(), data_hora: z.string().min(10) }).parse(e))
  .handler(async ({ data, context }) => {
    const quando = new Date(data.data_hora);
    if (Number.isNaN(quando.getTime())) throw new Error("Informe uma data e hora válidas.");
    if (quando.getTime() > Date.now() + 186 * 86_400_000) throw new Error("Agende a próxima ação dentro dos próximos 6 meses.");
    const a = await autorizar(context, "task.create");
    await leadDoTenant(a, data.lead_id);
    // Só existe uma próxima ação pendente por lead: cancela as anteriores.
    const { data: abertas } = await a.db.from("crm_lead_tasks").select("id, row_version").eq("tenant_id", a.tenantId).eq("lead_id", data.lead_id).in("status", ["open", "in_progress"]);
    for (const t of abertas ?? []) {
      await rpc(context, "task.transition", "transition_tenant_crm_task", { _task_id: t.id, _to_status: "cancelled", _expected_version: t.row_version, _reason: "Substituída por nova próxima ação", _idempotency_key: chave() });
    }
    await rpc(context, "task.create", "create_tenant_crm_task", {
      _lead_id: data.lead_id, _task_type: TIPO_TAREFA[data.tipo], _title: data.tipo, _description: data.descricao || null,
      _due_at: quando.toISOString(), _assignee_user_id: null, _idempotency_key: chave(),
    });
    return { ok: true as const };
  });

export const concluirProximaAcao = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { tarefa_id: string; descricao?: string }) => z.object({ tarefa_id: z.string().uuid(), descricao: z.string().trim().max(2000).optional() }).parse(e))
  .handler(async ({ data, context }) => {
    const a = await autorizar(context, "task.transition");
    const { data: t } = await a.db.from("crm_lead_tasks").select("id, lead_id, task_type, title, description, row_version").eq("tenant_id", a.tenantId).eq("id", data.tarefa_id).maybeSingle();
    if (!t) throw new Error("Tarefa não encontrada.");
    await rpc(context, "task.transition", "transition_tenant_crm_task", { _task_id: t.id, _to_status: "completed", _expected_version: t.row_version, _reason: null, _idempotency_key: chave() });
    const tipo = tipoDaTarefa(t);
    await registrarAtividade(a, t.lead_id, tipo, data.descricao || t.description || `${ROTULOS_ATIVIDADE[tipo] ?? "Ação"} realizada.`);
    return { ok: true as const };
  });

export const criarAtividadeCrm = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { lead_id: string; tipo: (typeof tiposManuais)[number]; descricao: string }) =>
    z.object({ lead_id: z.string().uuid(), tipo: z.enum(tiposManuais), descricao: z.string().trim().min(2, "Descreva a interação").max(2000) }).parse(e))
  .handler(async ({ data, context }) => {
    const a = await autorizar(context, "lead.note");
    await leadDoTenant(a, data.lead_id);
    await registrarAtividade(a, data.lead_id, data.tipo, data.descricao);
    return { ok: true as const };
  });

export const atualizarEtapaLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { lead_id: string; etapa: EtapaCrm; motivo_descarte?: string }) =>
    z.object({ lead_id: z.string().uuid(), etapa: z.enum(ETAPAS_CRM as [EtapaCrm, ...EtapaCrm[]]), motivo_descarte: z.string().trim().max(300).optional() }).parse(e))
  .handler(async ({ data, context }) => {
    const a = await autorizar(context, "lead.transition");
    const lead = await leadDoTenant(a, data.lead_id);
    if (!ETAPAS_SEM_PROXIMA_ACAO.includes(data.etapa)) {
      const { count } = await a.db.from("crm_lead_tasks").select("id", { count: "exact", head: true }).eq("tenant_id", a.tenantId).eq("lead_id", data.lead_id).in("status", ["open", "in_progress"]);
      if ((count ?? 0) === 0) throw new Error("Agende a próxima ação com este lead antes de mudar a etapa.");
    }
    let reasonId: string | null = null;
    if (data.etapa === "Descartado" || data.etapa === "Perdido") {
      if (data.etapa === "Descartado" && !data.motivo_descarte) throw new Error("Escolha o motivo do descarte.");
      if (data.etapa === "Descartado") {
        const { data: m } = await a.db.from("tenant_members").select("tenant_role").eq("tenant_id", a.tenantId).eq("user_id", a.userId).maybeSingle();
        const equipe = ["owner", "admin", "manager"].includes(m?.tenant_role ?? "");
        if (!equipe) {
          const { data: feitas } = await a.db.from("lead_atividades").select("tipo, metadata").eq("tenant_id", a.tenantId).eq("lead_id", data.lead_id);
          const tipos = new Set((feitas ?? []).map((f: any) => tipoDaAtividade(f)));
          const faltando = TIPOS_OBRIGATORIOS_DESCARTE.filter((t) => !tipos.has(t));
          if (faltando.length) throw new Error(`Registre ligação, WhatsApp e e-mail antes de descartar este lead. Faltam: ${faltando.map((t) => ROTULOS_ATIVIDADE[t]).join(", ")}.`);
        }
      }
      const tabela = data.etapa === "Descartado" ? "lead_discard_reasons" : "deal_lost_reasons";
      const { data: motivos } = await a.db.from(tabela).select("id, nome, padrao").eq("tenant_id", a.tenantId).eq("ativo", true).order("ordem");
      const escolhido = (motivos ?? []).find((m: any) => m.nome === data.motivo_descarte) ?? (motivos ?? []).find((m: any) => m.padrao) ?? (motivos ?? []).at(-1);
      if (!escolhido) throw new Error("Cadastre motivos de descarte/perda antes de usar esta etapa.");
      reasonId = escolhido.id;
    }
    await transitionTenantLeadForContext(context, {
      leadId: data.lead_id, toStatus: ETAPA_PARA_STATUS[data.etapa], expectedVersion: lead.version,
      reasonId, note: data.motivo_descarte || null, idempotencyKey: chave(),
    });
    const descricao = reasonId && data.motivo_descarte
      ? `Etapa alterada para "${data.etapa}" — motivo: ${data.motivo_descarte}.`
      : `Etapa alterada para "${data.etapa}".`;
    await registrarAtividade(a, data.lead_id, "etapa", descricao);
    return { ok: true as const };
  });

const origensManuais = ["manual", "google", "meta", "instagram", "indicacao", "portal", "site", "outros"] as const;

export const criarLeadManual = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { nome: string; telefone: string; email?: string; mensagem?: string; consentimento_lgpd: true; corretor_atribuido_id?: string; origem?: (typeof origensManuais)[number] }) =>
    z.object({
      nome: z.string().trim().min(2, "Informe o nome do lead").max(120),
      telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
      email: z.string().trim().email("E-mail inválido").max(160).optional().or(z.literal("")),
      mensagem: z.string().trim().max(2000).optional(),
      consentimento_lgpd: z.literal(true, { errorMap: () => ({ message: "Confirme que o contato autorizou ser contatado" }) }),
      corretor_atribuido_id: z.string().uuid().optional().or(z.literal("")),
      origem: z.enum(origensManuais).optional(),
    }).parse(e))
  .handler(async ({ data, context }) => {
    const criado = await rpc(context, "lead.create", "create_tenant_crm_lead", {
      _nome: data.nome, _email: data.email || null, _telefone: data.telefone, _imovel_id: null,
      _mensagem: data.mensagem || null, _assigned_to: null, _idempotency_key: chave(),
    });
    const id = String(criado.id);
    const a = await autorizar(context, "lead.update");
    let corretorId = data.corretor_atribuido_id || null;
    if (corretorId) {
      const { data: c } = await a.db.from("corretores").select("id").eq("tenant_id", a.tenantId).eq("id", corretorId).maybeSingle();
      if (!c) corretorId = null;
    } else {
      const { data: c } = await a.db.from("corretores").select("id").eq("tenant_id", a.tenantId).eq("user_id", a.userId).maybeSingle();
      corretorId = c?.id ?? null;
    }
    await a.db.from("leads").update({ origem: data.origem ?? "manual", consent_lgpd: true, consent_at: new Date().toISOString(), corretor_id: corretorId }).eq("tenant_id", a.tenantId).eq("id", id);
    await registrarAtividade(a, id, "cadastro", "Lead cadastrado manualmente pelo painel.");
    if (data.corretor_atribuido_id) await registrarAtividade(a, id, "atribuicao", "Lead atribuído a um corretor no cadastro.");
    return { id };
  });

export const reatribuirLead = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((e: { lead_id: string; corretor_id: string }) => z.object({ lead_id: z.string().uuid(), corretor_id: z.string().uuid() }).parse(e))
  .handler(async ({ data, context }) => {
    const a = await autorizar(context, "lead.assign");
    const { data: m } = await a.db.from("tenant_members").select("tenant_role").eq("tenant_id", a.tenantId).eq("user_id", a.userId).maybeSingle();
    if (!["owner", "admin", "manager"].includes(m?.tenant_role ?? "")) throw new Error("Somente admin ou gestor podem reatribuir leads.");
    await leadDoTenant(a, data.lead_id);
    const { data: c } = await a.db.from("corretores").select("id, nome").eq("tenant_id", a.tenantId).eq("id", data.corretor_id).eq("ativo", true).maybeSingle();
    if (!c) throw new Error("Corretor não encontrado ou inativo.");
    const { error } = await a.db.from("leads").update({ corretor_id: c.id }).eq("tenant_id", a.tenantId).eq("id", data.lead_id);
    if (error) throw new Error("Não foi possível reatribuir o lead.");
    await registrarAtividade(a, data.lead_id, "atribuicao", `Lead reatribuído para ${c.nome || "outro corretor"}.`);
    return { ok: true as const };
  });
