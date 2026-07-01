import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

function adminClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ============================================================================
// ADMIN — CRUD de formulários
// ============================================================================

export const listarFormulariosAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cms_forms")
      .select("id, nome, slug, status, descricao, config, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const obterFormularioAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: form, error } = await context.supabase
      .from("cms_forms")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: fields } = await context.supabase
      .from("cms_form_fields")
      .select("*")
      .eq("form_id", data.id)
      .order("ordem", { ascending: true });
    return { form, fields: fields ?? [] };
  });

const formPayloadSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  status: z.enum(["draft", "published", "archived"]),
  descricao: z.string().nullable().optional(),
  config: z
    .object({
      success_message: z.string().optional(),
      redirect_url: z.string().optional(),
      submit_button_label: z.string().optional(),
      notify_emails: z.array(z.string().email()).optional(),
      criar_lead: z.boolean().optional(),
      lead_origem_slug: z.string().optional(),
      webhook_url: z.string().url().optional().or(z.literal("")),
      map_nome: z.string().optional(),      // nome do campo do form -> nome do lead
      map_email: z.string().optional(),
      map_telefone: z.string().optional(),
      map_mensagem: z.string().optional(),
    })
    .default({}),
});

export const salvarFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => formPayloadSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.id) {
      const { error } = await supabase
        .from("cms_forms")
        .update({
          nome: data.nome,
          slug: data.slug,
          status: data.status,
          descricao: data.descricao ?? null,
          config: data.config,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("cms_forms")
      .insert({
        nome: data.nome,
        slug: data.slug,
        status: data.status,
        descricao: data.descricao ?? null,
        config: data.config,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const excluirFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("cms_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const fieldsPayloadSchema = z.object({
  form_id: z.string().uuid(),
  fields: z.array(
    z.object({
      id: z.string().uuid().optional(),
      ordem: z.number().int().min(0),
      tipo: z.enum(["text", "textarea", "email", "phone", "number", "date", "select", "radio", "checkbox", "file", "hidden"]),
      nome: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
      label: z.string().min(1).max(200),
      placeholder: z.string().max(200).optional().nullable(),
      ajuda: z.string().max(500).optional().nullable(),
      obrigatorio: z.boolean(),
      opcoes: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
      validacao: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          regex: z.string().optional(),
          mascara: z.string().optional(),
        })
        .default({}),
      valor_padrao: z.string().nullable().optional(),
      largura: z.enum(["full", "half", "third"]).default("full"),
    }),
  ),
});

export const salvarCampos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => fieldsPayloadSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // estratégia: apagar todos os campos do form e reinserir (simples e atômico o suficiente pro admin)
    const { error: e1 } = await supabase.from("cms_form_fields").delete().eq("form_id", data.form_id);
    if (e1) throw new Error(e1.message);
    if (data.fields.length) {
      const rows = data.fields.map((f) => ({
        form_id: data.form_id,
        ordem: f.ordem,
        tipo: f.tipo,
        nome: f.nome,
        label: f.label,
        placeholder: f.placeholder ?? null,
        ajuda: f.ajuda ?? null,
        obrigatorio: f.obrigatorio,
        opcoes: f.opcoes,
        validacao: f.validacao,
        valor_padrao: f.valor_padrao ?? null,
        largura: f.largura,
      }));
      const { error: e2 } = await supabase.from("cms_form_fields").insert(rows);
      if (e2) throw new Error(e2.message);
    }
    return { ok: true };
  });

// ============================================================================
// ADMIN — submissões
// ============================================================================

export const listarSubmissoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ form_id: z.string().uuid().optional(), page: z.number().int().min(0).default(0), pageSize: z.number().int().min(1).max(100).default(50) }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase.from("form_submissions").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (data.form_id) q = q.eq("form_id", data.form_id);
    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

// ============================================================================
// PUBLIC — leitura de form publicado + submissão anônima
// ============================================================================

export const obterFormPublicoPorSlug = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1) }).parse(raw))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: form, error } = await sb
      .from("cms_forms")
      .select("id, tenant_id, nome, slug, descricao, config")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!form) return null;
    const { data: fields } = await sb
      .from("cms_form_fields")
      .select("id, ordem, tipo, nome, label, placeholder, ajuda, obrigatorio, opcoes, validacao, valor_padrao, largura")
      .eq("form_id", form.id)
      .order("ordem", { ascending: true });
    return { form, fields: fields ?? [] };
  });

const submitSchema = z.object({
  form_slug: z.string().min(1),
  dados: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
  consent_lgpd: z.literal(true, { errorMap: () => ({ message: "Aceite a Política de Privacidade." }) }),
  // atribuição
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
  gclid: z.string().max(400).optional(),
  fbclid: z.string().max(400).optional(),
  referrer: z.string().max(500).optional(),
  landing_url: z.string().max(500).optional(),
  page_url: z.string().max(500).optional(),
});

export const submeterFormulario = createServerFn({ method: "POST" })
  .inputValidator((raw) => submitSchema.parse(raw))
  .handler(async ({ data }) => {
    const admin = adminClient();

    // 1) carrega form + campos (usa admin para validar mesmo se anônimo)
    const { data: form, error: eForm } = await admin
      .from("cms_forms")
      .select("id, tenant_id, nome, slug, status, config")
      .eq("slug", data.form_slug)
      .eq("status", "published")
      .maybeSingle();
    if (eForm) throw new Error(eForm.message);
    if (!form) throw new Error("Formulário não encontrado ou não publicado.");

    const { data: fields } = await admin
      .from("cms_form_fields")
      .select("nome, tipo, obrigatorio, validacao")
      .eq("form_id", (form as { id: string }).id);

    // 2) valida obrigatoriedade e validações básicas
    for (const f of (fields ?? []) as Array<{ nome: string; tipo: string; obrigatorio: boolean; validacao: Record<string, unknown> }>) {
      const v = data.dados[f.nome];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      if (f.obrigatorio && empty) throw new Error(`Campo obrigatório: ${f.nome}`);
      if (!empty && typeof v === "string") {
        const val = f.validacao || {};
        if (typeof val.minLength === "number" && v.length < val.minLength) throw new Error(`${f.nome}: mínimo ${val.minLength} caracteres`);
        if (typeof val.maxLength === "number" && v.length > val.maxLength) throw new Error(`${f.nome}: máximo ${val.maxLength} caracteres`);
        if (typeof val.regex === "string" && val.regex) {
          try {
            if (!new RegExp(val.regex).test(v)) throw new Error(`${f.nome}: formato inválido`);
          } catch { /* regex inválida ignorada */ }
        }
        if (f.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`${f.nome}: e-mail inválido`);
      }
    }

    const tenant_id = (form as { tenant_id: string }).tenant_id;
    const form_id = (form as { id: string }).id;
    const config = ((form as { config: Record<string, unknown> }).config ?? {}) as {
      criar_lead?: boolean;
      lead_origem_slug?: string;
      notify_emails?: string[];
      webhook_url?: string;
      map_nome?: string;
      map_email?: string;
      map_telefone?: string;
      map_mensagem?: string;
      success_message?: string;
    };

    // 3) opcionalmente cria Lead no CRM (usando mapeamento de campos)
    let lead_id: string | null = null;
    if (config.criar_lead) {
      const nome = (config.map_nome && (data.dados[config.map_nome] as string)) || (data.dados.nome as string) || "Sem nome";
      const email = (config.map_email && (data.dados[config.map_email] as string)) || (data.dados.email as string) || null;
      const telefone = (config.map_telefone && (data.dados[config.map_telefone] as string)) || (data.dados.telefone as string) || null;
      const mensagem = (config.map_mensagem && (data.dados[config.map_mensagem] as string)) || (data.dados.mensagem as string) || null;
      const origem = config.lead_origem_slug || `form-${(form as { slug: string }).slug}`;

      const newLeadId = crypto.randomUUID();
      const { error: eLead } = await admin.from("leads").insert({
        id: newLeadId,
        tenant_id,
        nome: String(nome).slice(0, 200),
        email: email ? String(email).slice(0, 200) : null,
        telefone: telefone ? String(telefone).slice(0, 40) : null,
        mensagem: mensagem ? String(mensagem).slice(0, 2000) : null,
        origem,
        status: "novo",
        consent_lgpd: true,
        consent_at: new Date().toISOString(),
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_term: data.utm_term || null,
        utm_content: data.utm_content || null,
        gclid: data.gclid || null,
        fbclid: data.fbclid || null,
        referrer: data.referrer || null,
        landing_url: data.landing_url || null,
      } as never);
      if (!eLead) lead_id = newLeadId;
    }

    // 4) grava submissão sempre (fonte da verdade dos dados brutos)
    const { error: eSub } = await admin.from("form_submissions").insert({
      tenant_id,
      form_id,
      form_slug: (form as { slug: string }).slug,
      dados: data.dados,
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
      gclid: data.gclid || null,
      fbclid: data.fbclid || null,
      referrer: data.referrer || null,
      page_url: data.page_url || null,
      lead_id,
    });
    if (eSub) throw new Error(eSub.message);

    // 5) e-mails de notificação (não bloqueia)
    if (config.notify_emails && config.notify_emails.length) {
      try {
        const { enqueueTransactional } = await import("@/lib/email/notify.server");
        const summary = Object.entries(data.dados)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v ?? "")}`)
          .join("\n");
        for (const to of config.notify_emails) {
          await enqueueTransactional({
            templateName: "novo-lead",
            to,
            idempotencyKey: `formsub-${form_id}-${to}-${Date.now()}`,
            templateData: {
              nome: (data.dados.nome as string) || "Sem nome",
              email: (data.dados.email as string) || undefined,
              telefone: (data.dados.telefone as string) || undefined,
              mensagem: summary,
              origem: `Formulário: ${(form as { nome: string }).nome}`,
              recebido_em: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            },
          });
        }
      } catch (e) {
        console.error("Falha ao notificar submissão:", e);
      }
    }

    // 6) webhook externo (fire-and-forget)
    if (config.webhook_url) {
      try {
        void fetch(config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: (form as { slug: string }).slug, dados: data.dados, tenant_id, lead_id }),
        }).catch(() => undefined);
      } catch { /* ignore */ }
    }

    return { ok: true, message: config.success_message || "Mensagem enviada! Retornaremos em breve." };
  });
