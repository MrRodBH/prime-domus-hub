import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertTenantScopedCollection,
  requirePublicWriterTenantFromRequest,
  selectExactlyOneTenantScopedRow,
  type PublicWriterTenantIdentity,
} from "@/lib/public-writers/public-writer-authority.server";
import { writePublicLead } from "@/lib/public-writers/public-lead-writer.server";

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
      map_nome: z.string().optional(),
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
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    const { supabase, userId } = context;
    const wantsPublish = data.status === "published";
    await assertCmsPermission(context, "cms.formularios", data.id ? "editar" : "criar");
    if (wantsPublish) await assertCmsPermission(context, "cms.formularios", "publicar");
    if (data.id) {
      const { data: before } = await supabase.from("cms_forms").select("*").eq("id", data.id).maybeSingle();
      const { data: row, error } = await supabase
        .from("cms_forms")
        .update({
          nome: data.nome,
          slug: data.slug,
          status: data.status,
          descricao: data.descricao ?? null,
          config: data.config,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await logCmsAudit(context, "cms_forms", wantsPublish ? "cms.formulario.publicar" : "cms.formulario.editar", data.id, before, row);
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
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_forms", "cms.formulario.criar", row.id as string, null, row);
    return { id: row.id as string };
  });

export const excluirFormulario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.formularios", "excluir");
    const { data: before } = await context.supabase.from("cms_forms").select("*").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("cms_forms").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "cms_forms", "cms.formulario.excluir", data.id, before, null);
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
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.formularios", "editar");
    const { supabase } = context;
    const { data: before } = await supabase.from("cms_form_fields").select("*").eq("form_id", data.form_id);
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
    await logCmsAudit(context, "cms_form_fields", "cms.formulario.campos.editar", data.form_id, before, data.fields);
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

type PublicFormConfig = {
  success_message?: string;
  redirect_url?: string;
  submit_button_label?: string;
  notify_emails?: string[];
  criar_lead?: boolean;
  lead_origem_slug?: string;
  webhook_url?: string;
  map_nome?: string;
  map_email?: string;
  map_telefone?: string;
  map_mensagem?: string;
};

type PublicFieldValidation = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
  mascara?: string;
};

type PublicFieldOption = { label: string; value: string };

type PublicFormRow = {
  id: string;
  tenant_id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  status?: string;
  config: PublicFormConfig;
};

type PublicFieldRow = {
  tenant_id: string;
  id?: string;
  ordem?: number;
  tipo: string;
  nome: string;
  label?: string;
  placeholder?: string | null;
  ajuda?: string | null;
  obrigatorio: boolean;
  opcoes?: PublicFieldOption[];
  validacao: PublicFieldValidation;
  valor_padrao?: string | null;
  largura?: string;
};

async function loadPublishedForm(input: {
  tenant: PublicWriterTenantIdentity;
  slug: string;
  allowZero: boolean;
}): Promise<PublicFormRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cms_forms")
    .select("id, tenant_id, nome, slug, descricao, status, config")
    .eq("tenant_id", input.tenant.id)
    .eq("slug", input.slug)
    .eq("status", "published")
    .limit(2);
  if (error) throw new Error(error.message);
  return selectExactlyOneTenantScopedRow(
    input.tenant,
    data as unknown as PublicFormRow[] | null,
    {
      allowZero: input.allowZero,
      zeroMessage: "Formulário não encontrado ou não publicado.",
      ambiguousMessage: "Formulário público ambíguo para o tenant aceito.",
    },
  );
}

async function loadPublicFields(input: {
  tenant: PublicWriterTenantIdentity;
  formId: string;
  projection: string;
}): Promise<PublicFieldRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cms_form_fields")
    .select(input.projection)
    .eq("tenant_id", input.tenant.id)
    .eq("form_id", input.formId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return assertTenantScopedCollection(
    input.tenant,
    data as unknown as PublicFieldRow[] | null,
  );
}

export const obterFormPublicoPorSlug = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1) }).strict().parse(raw))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    const form = await loadPublishedForm({ tenant, slug: data.slug, allowZero: true });
    if (!form) return null;
    const fields = await loadPublicFields({
      tenant,
      formId: form.id,
      projection: "tenant_id, id, ordem, tipo, nome, label, placeholder, ajuda, obrigatorio, opcoes, validacao, valor_padrao, largura",
    });
    return { form, fields };
  });

const submitSchema = z
  .object({
    form_slug: z.string().min(1),
    dados: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()])),
    consent_lgpd: z.literal(true, { errorMap: () => ({ message: "Aceite a Política de Privacidade." }) }),
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
  })
  .strict();

export const submeterFormulario = createServerFn({ method: "POST" })
  .inputValidator((raw) => submitSchema.parse(raw))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    const form = await loadPublishedForm({ tenant, slug: data.form_slug, allowZero: false });
    if (!form) throw new Error("Formulário não encontrado ou não publicado.");
    const fields = await loadPublicFields({
      tenant,
      formId: form.id,
      projection: "tenant_id, nome, tipo, obrigatorio, validacao, ordem",
    });

    for (const field of fields) {
      const value = data.dados[field.nome];
      const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      if (field.obrigatorio && empty) throw new Error(`Campo obrigatório: ${field.nome}`);
      if (!empty && typeof value === "string") {
        const validation = field.validacao || {};
        if (typeof validation.minLength === "number" && value.length < validation.minLength) throw new Error(`${field.nome}: mínimo ${validation.minLength} caracteres`);
        if (typeof validation.maxLength === "number" && value.length > validation.maxLength) throw new Error(`${field.nome}: máximo ${validation.maxLength} caracteres`);
        if (typeof validation.regex === "string" && validation.regex) {
          let regex: RegExp;
          try {
            regex = new RegExp(validation.regex);
          } catch {
            throw new Error(`${field.nome}: configuração de validação inválida`);
          }
          if (!regex.test(value)) throw new Error(`${field.nome}: formato inválido`);
        }
        if (field.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`${field.nome}: e-mail inválido`);
      }
    }

    const config = form.config;
    let leadId: string | null = null;
    if (config.criar_lead) {
      const nome = (config.map_nome && (data.dados[config.map_nome] as string)) || (data.dados.nome as string) || "Sem nome";
      const email = (config.map_email && (data.dados[config.map_email] as string)) || (data.dados.email as string) || null;
      const telefone = (config.map_telefone && (data.dados[config.map_telefone] as string)) || (data.dados.telefone as string) || null;
      const mensagem = (config.map_mensagem && (data.dados[config.map_mensagem] as string)) || (data.dados.mensagem as string) || null;
      const result = await writePublicLead({
        tenant,
        command: {
          nome: String(nome).slice(0, 200),
          email: email ? String(email).slice(0, 200) : null,
          telefone: telefone ? String(telefone).slice(0, 40) : null,
          mensagem: mensagem ? String(mensagem).slice(0, 2000) : null,
          origem: config.lead_origem_slug || `form-${form.slug}`,
          attribution: {
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            utm_term: data.utm_term,
            utm_content: data.utm_content,
            gclid: data.gclid,
            fbclid: data.fbclid,
            referrer: data.referrer,
            landing_url: data.landing_url,
          },
          notificationMode: "none",
        },
      });
      leadId = result.id;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: submissionError } = await supabaseAdmin.from("form_submissions").insert({
      tenant_id: tenant.id,
      form_id: form.id,
      form_slug: form.slug,
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
      lead_id: leadId,
    });
    if (submissionError) throw new Error(submissionError.message);

    if (config.notify_emails?.length) {
      try {
        const { enqueueTransactional } = await import("@/lib/email/notify.server");
        const summary = Object.entries(data.dados)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`)
          .join("\n");
        for (const to of config.notify_emails) {
          await enqueueTransactional({
            templateName: "novo-lead",
            to,
            idempotencyKey: `formsub-${form.id}-${to}-${Date.now()}`,
            templateData: {
              nome: (data.dados.nome as string) || "Sem nome",
              email: (data.dados.email as string) || undefined,
              telefone: (data.dados.telefone as string) || undefined,
              mensagem: summary,
              origem: `Formulário: ${form.nome}`,
              recebido_em: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
            },
          });
        }
      } catch (error) {
        console.error("Falha ao notificar submissão:", { tenantId: tenant.id, formId: form.id, error });
      }
    }

    if (config.webhook_url) {
      try {
        void fetch(config.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form: form.slug, dados: data.dados, tenant_id: tenant.id, lead_id: leadId }),
        }).catch(() => undefined);
      } catch {
        // Webhook transport is non-blocking after authority and persistence succeed.
      }
    }

    return { ok: true, message: config.success_message || "Mensagem enviada! Retornaremos em breve." };
  });
