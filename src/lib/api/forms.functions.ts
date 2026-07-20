/**
 * CMS Forms — CRUD admin + API pública de submissão.
 * Bloco universal `form` usa slug para renderizar.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";

function adminClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

// ============================================================================
// ADMIN
// ============================================================================

export const listarForms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cms_forms")
      .select("id,nome,slug,status,descricao,config,created_at,updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const obterForm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: form, error } = await context.supabase
      .from("cms_forms")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!form) throw new Error("Formulário não encontrado");
    const { data: fields, error: e2 } = await context.supabase
      .from("cms_form_fields")
      .select("*")
      .eq("form_id", data.id)
      .order("ordem", { ascending: true });
    if (e2) throw new Error(e2.message);
    return { form, fields: fields ?? [] };
  });

const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  ordem: z.number().int().min(0),
  tipo: z.enum(["text", "email", "tel", "textarea", "select", "radio", "checkbox", "date", "number", "hidden"]),
  nome: z.string().min(1).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Nome técnico inválido"),
  label: z.string().min(1),
  placeholder: z.string().nullable().optional(),
  ajuda: z.string().nullable().optional(),
  obrigatorio: z.boolean().default(false),
  opcoes: z.array(z.string()).nullable().optional(),
  validacao: z.record(z.string(), z.unknown()).default({}),
  valor_padrao: z.string().nullable().optional(),
  largura: z.enum(["full", "half", "third"]).default("full"),
});

const formSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  descricao: z.string().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  config: z.record(z.string(), z.unknown()).default({}),
  fields: z.array(fieldSchema).default([]),
});

export const salvarForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => formSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.formularios", data.id ? "editar" : "criar");
    if (data.status === "published") await assertCmsPermission(context, "cms.formularios", "publicar");
    const { supabase, userId } = context;
    let formId = data.id;
    let before: unknown = null;
    if (formId) {
      const { data: b } = await supabase.from("cms_forms").select("*").eq("id", formId).maybeSingle();
      before = b;
      const { error } = await supabase.from("cms_forms").update({
        nome: data.nome, slug: data.slug, descricao: data.descricao ?? null,
        status: data.status, config: data.config, updated_by: userId,
        published_at: data.status === "published" ? new Date().toISOString() : null,
      }).eq("id", formId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await supabase.from("cms_forms").insert({
        nome: data.nome, slug: data.slug, descricao: data.descricao ?? null,
        status: data.status, config: data.config, created_by: userId, updated_by: userId,
        published_at: data.status === "published" ? new Date().toISOString() : null,
      }).select("id").single();
      if (error) throw new Error(error.message);
      formId = row.id;
    }

    const { data: existing } = await supabase
      .from("cms_form_fields").select("id").eq("form_id", formId);
    const keepIds = data.fields.filter((f) => f.id).map((f) => f.id!);
    const removeIds = (existing ?? []).map((e) => e.id).filter((id) => !keepIds.includes(id));
    if (removeIds.length) {
      const { error } = await supabase.from("cms_form_fields").delete().in("id", removeIds);
      if (error) throw new Error(error.message);
    }
    for (const f of data.fields) {
      const payload = {
        form_id: formId, ordem: f.ordem, tipo: f.tipo, nome: f.nome, label: f.label,
        placeholder: f.placeholder ?? null, ajuda: f.ajuda ?? null, obrigatorio: f.obrigatorio,
        opcoes: f.opcoes ?? null, validacao: f.validacao, valor_padrao: f.valor_padrao ?? null,
        largura: f.largura,
      };
      if (f.id) {
        const { error } = await supabase.from("cms_form_fields").update(payload).eq("id", f.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("cms_form_fields").insert(payload);
        if (error) throw new Error(error.message);
      }
    }

    await logCmsAudit(context, "cms_forms", data.status === "published" ? "cms.form.publicar" : (data.id ? "cms.form.editar" : "cms.form.criar"), formId, before, { nome: data.nome, slug: data.slug, status: data.status, config: data.config, fields_count: data.fields.length });
    return { id: formId };
  });

export const excluirForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.formularios", "excluir");
    const { data: before } = await context.supabase.from("cms_forms").select("*").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("cms_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_forms", "cms.form.excluir", data.id, before, null);
    return { ok: true };
  });

export const listarSubmissoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ form_id: z.string().uuid().optional(), limite: z.number().int().min(1).max(500).default(100) }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    let q = context.supabase
      .from("form_submissions")
      .select("id,form_id,form_slug,dados,created_at,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid,fbclid,referrer,page_url,lead_id")
      .order("created_at", { ascending: false })
      .limit(data.limite);
    if (data.form_id) q = q.eq("form_id", data.form_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============================================================================
// PÚBLICO — leitura do formulário e submissão no tenant resolvido por Host.
// ============================================================================

export const obterFormPublicoPorSlug = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1) }).strict().parse(raw))
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const admin = adminClient();
    const { data: form, error } = await admin
      .from("cms_forms")
      .select("id, tenant_id, nome, slug, descricao, config")
      .eq("tenant_id", tenant.id)
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!form) return null;
    const { data: fields, error: e2 } = await admin
      .from("cms_form_fields")
      .select("id, ordem, tipo, nome, label, placeholder, ajuda, obrigatorio, opcoes, validacao, valor_padrao, largura")
      .eq("tenant_id", tenant.id)
      .eq("form_id", form.id)
      .order("ordem", { ascending: true });
    if (e2) throw new Error(e2.message);
    return { form, fields: fields ?? [] };
  });

const submitSchema = z.object({
  form_slug: z.string().min(1),
  dados: z.record(z.string(), z.unknown()),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_content: z.string().optional(),
  utm_term: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  referrer: z.string().optional(),
  page_url: z.string().optional(),
}).strict();

export const submeterFormPublico = createServerFn({ method: "POST" })
  .inputValidator((raw) => submitSchema.parse(raw))
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const admin = adminClient();

    const { data: form, error: eForm } = await admin
      .from("cms_forms")
      .select("id, tenant_id, nome, slug, status, config")
      .eq("tenant_id", tenant.id)
      .eq("slug", data.form_slug)
      .eq("status", "published")
      .maybeSingle();
    if (eForm) throw new Error(eForm.message);
    if (!form) throw new Error("Formulário não encontrado ou não publicado.");

    const { data: fields, error: fieldsError } = await admin
      .from("cms_form_fields")
      .select("nome, tipo, obrigatorio, validacao")
      .eq("tenant_id", tenant.id)
      .eq("form_id", (form as { id: string }).id);
    if (fieldsError) throw new Error(fieldsError.message);

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

    const tenant_id = tenant.id;
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
