// LSH-01 — Lote A · Lead runtime operations (server-only, testable).
//
// Extrai a lógica das cinco server functions Lead em funções tipadas com
// dependências injetáveis, permitindo testes determinísticos e mantendo o
// wrapper `createServerFn` fino. A autoridade única de autorização é
// `authorizeLeadOperation`; nenhum guard legado (ensureAdmin,
// ensureActiveTenantMembership) é chamado aqui.
//
// O runtime real usa exatamente estas funções — os wrappers em
// `admin.functions.ts` apenas resolvem o repositório canônico e as chamam.

import type {
  LeadAuthorizationContext,
  LeadAuthorizationRepository,
  TypedSupabase,
} from "@/lib/leads/lead-authorization.server";
import {
  authorizeLeadOperation,
  createSupabaseLeadAuthorizationRepository,
} from "@/lib/leads/lead-authorization.server";

// ---------- Data-access abstraction (injetável). ----------

export interface LeadListRow {
  id: string;
  [key: string]: unknown;
}

export interface CorretorLiteRow {
  id: string;
  user_id: string | null;
  nome: string | null;
  sobrenome: string | null;
  ativo: boolean | null;
  team_id: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  foto_url: string | null;
  status: string | null;
  creci: string | null;
  cpf: string | null;
  slug: string | null;
  bio: string | null;
}

export interface ImovelLiteRow {
  id: string;
  codigo: string;
  titulo: string;
  corretor_id: string | null;
}

export interface UpdateLeadInput {
  id: string;
  observacoes?: string;
  valor_estimado?: number | null;
}

export interface ManualLeadInput {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  imovel_id?: string | null;
  observacoes?: string | null;
  assigned_to?: string | null;
}

export interface ManualLeadRpcRow {
  id: string;
  tenantId: string;
  status: "novo";
  version: number;
  assignedTo: string | null;
  corretorId: string | null;
  imovelId: string | null;
  createdAt: string;
}

/**
 * Porta de acesso a dados. Testes injetam um double; o runtime real
 * fornece uma implementação Supabase.
 */
export interface LeadOperationsGateway {
  listLeadsTenantWide(tenantId: string): Promise<LeadListRow[]>;
  listLeadsOwnAssigned(
    tenantId: string,
    actorUserId: string,
  ): Promise<LeadListRow[]>;
  listCorretores(tenantId: string): Promise<CorretorLiteRow[]>;
  listImoveisLite(tenantId: string): Promise<ImovelLiteRow[]>;
  updateLeadTenantWide(
    tenantId: string,
    input: UpdateLeadInput,
  ): Promise<{ id: string } | null>;
  updateLeadOwnAssigned(
    tenantId: string,
    actorUserId: string,
    input: UpdateLeadInput,
  ): Promise<{ id: string } | null>;
  createManualLead(input: ManualLeadInput): Promise<unknown>;
}

// ---------- Implementação Supabase real. ----------

export function createSupabaseLeadOperationsGateway(
  supabase: TypedSupabase,
): LeadOperationsGateway {
  const leadSelect =
    "*, imovel:imoveis(titulo, slug, preco, preco_sob_consulta)";

  return {
    async listLeadsTenantWide(tenantId) {
      const { data, error } = await supabase
        .from("leads")
        .select(leadSelect)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeadListRow[];
    },
    async listLeadsOwnAssigned(tenantId, actorUserId) {
      const { data, error } = await supabase
        .from("leads")
        .select(leadSelect)
        .eq("tenant_id", tenantId)
        .eq("assigned_to", actorUserId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LeadListRow[];
    },
    async listCorretores(tenantId) {
      const { data, error } = await supabase
        .from("corretores")
        .select(
          "id, user_id, nome, sobrenome, ativo, team_id, cargo, email, telefone, whatsapp, foto_url, status, creci, cpf, slug, bio",
        )
        .eq("tenant_id", tenantId)
        .eq("ativo", true)
        .order("nome", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as CorretorLiteRow[];
    },
    async listImoveisLite(tenantId) {
      const { data, error } = await supabase
        .from("imoveis")
        .select("id, codigo, titulo, corretor_id")
        .eq("tenant_id", tenantId)
        .eq("status", "ativo")
        .order("titulo", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ImovelLiteRow[];
    },
    async updateLeadTenantWide(tenantId, input) {
      const payload: { mensagem?: string; valor_estimado?: number | null } = {};
      if (input.observacoes !== undefined) payload.mensagem = input.observacoes;
      if (input.valor_estimado !== undefined)
        payload.valor_estimado = input.valor_estimado;
      const { data, error } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", input.id)
        .eq("tenant_id", tenantId)
        .select("id");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ id: string }>;
      return rows[0] ?? null;
    },
    async updateLeadOwnAssigned(tenantId, actorUserId, input) {
      const payload: { mensagem?: string; valor_estimado?: number | null } = {};
      if (input.observacoes !== undefined) payload.mensagem = input.observacoes;
      if (input.valor_estimado !== undefined)
        payload.valor_estimado = input.valor_estimado;
      const { data, error } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", input.id)
        .eq("tenant_id", tenantId)
        .eq("assigned_to", actorUserId)
        .select("id");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ id: string }>;
      return rows[0] ?? null;
    },
    async createManualLead(input) {
      const { data, error } = await supabase.rpc("create_manual_lead", {
        p_nome: input.nome,
        p_email: input.email ?? undefined,
        p_telefone: input.telefone ?? undefined,
        p_imovel_id: input.imovel_id ?? undefined,
        p_observacoes: input.observacoes ?? undefined,
        p_assigned_to: input.assigned_to ?? undefined,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  };
}

// ---------- Operational functions (testáveis). ----------

export interface LeadOperationsDeps {
  authCtx: LeadAuthorizationContext;
  authRepo: LeadAuthorizationRepository;
  gateway: LeadOperationsGateway;
}

/** Constrói deps a partir de um contexto autenticado real. */
export function createRuntimeLeadOperationsDeps(authenticated: {
  supabase: TypedSupabase;
  userId: string;
}): LeadOperationsDeps {
  return {
    authCtx: { supabase: authenticated.supabase, userId: authenticated.userId },
    authRepo: createSupabaseLeadAuthorizationRepository(authenticated.supabase),
    gateway: createSupabaseLeadOperationsGateway(authenticated.supabase),
  };
}

export async function listLeadsAuthorized(
  deps: LeadOperationsDeps,
): Promise<LeadListRow[]> {
  const decision = await authorizeLeadOperation(
    deps.authCtx,
    "lead.list",
    deps.authRepo,
  );
  if (decision.scope === "tenant_wide") {
    return deps.gateway.listLeadsTenantWide(decision.tenantId);
  }
  return deps.gateway.listLeadsOwnAssigned(
    decision.tenantId,
    decision.actorUserId,
  );
}

export async function listLeadAssigneesAuthorized(
  deps: LeadOperationsDeps,
): Promise<CorretorLiteRow[]> {
  const decision = await authorizeLeadOperation(
    deps.authCtx,
    "lead.list_assignees",
    deps.authRepo,
  );
  return deps.gateway.listCorretores(decision.tenantId);
}

export async function listLeadPropertiesAuthorized(
  deps: LeadOperationsDeps,
): Promise<ImovelLiteRow[]> {
  const decision = await authorizeLeadOperation(
    deps.authCtx,
    "lead.list_properties",
    deps.authRepo,
  );
  return deps.gateway.listImoveisLite(decision.tenantId);
}

export async function updateLeadFieldsAuthorized(
  deps: LeadOperationsDeps,
  input: UpdateLeadInput,
): Promise<{ ok: true; id: string }> {
  const decision = await authorizeLeadOperation(
    deps.authCtx,
    "lead.update_fields",
    deps.authRepo,
  );
  const row =
    decision.scope === "tenant_wide"
      ? await deps.gateway.updateLeadTenantWide(decision.tenantId, input)
      : await deps.gateway.updateLeadOwnAssigned(
          decision.tenantId,
          decision.actorUserId,
          input,
        );
  if (!row) throw new Error("Lead não encontrado ou acesso negado.");
  return { ok: true, id: row.id };
}

export async function createManualLeadAuthorized(
  deps: LeadOperationsDeps,
  input: ManualLeadInput,
  parseReturn: (raw: unknown) => ManualLeadRpcRow,
): Promise<ManualLeadRpcRow> {
  await authorizeLeadOperation(
    deps.authCtx,
    "lead.create_manual",
    deps.authRepo,
  );
  const raw = await deps.gateway.createManualLead(input);
  return parseReturn(raw);
}
