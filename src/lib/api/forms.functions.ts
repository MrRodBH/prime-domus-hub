import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  assertTenantScopedCollection,
  requirePublicWriterTenantFromRequest,
  selectExactlyOneTenantScopedRow,
  type PublicWriterTenantIdentity,
} from "@/lib/public-writers/public-writer-authority.server";
import { writePublicLead } from "@/lib/public-writers/public-lead-writer.server";
import {
  getTenantForm,
  listTenantForms,
} from "@/lib/api/tenant-cms.functions";
import { authorizeTenantFormOperation } from "@/lib/api/tenant-cms-authority.server";

/**
 * Admin compatibility exports. Reads delegate to the canonical workflow;
 * independent form/field mutations are retired fail-closed because the form
 * definition is one atomic versioned snapshot.
 */
export const listarFormulariosAdmin = listTenantForms;
export const obterFormularioAdmin = getTenantForm;

export const salvarFormulario = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.record(z.string(), z.unknown()))
  .handler(async () => {
    throw new Error("legacy_cms_form_mutation_retired");
  });

export const salvarCampos = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.record(z.string(), z.unknown()))
  .handler(async () => {
    throw new Error("legacy_cms_form_fields_mutation_retired");
  });

export const excluirFormulario = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async () => {
    throw new Error("legacy_cms_form_delete_retired");
  });

export const listarSubmissoes = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z.object({
      form_id: z.string().uuid().optional(),
      page: z.number().int().min(0).default(0),
      pageSize: z.number().int().min(1).max(100).default(50),
    }).strict().parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const auth = await authorizeTenantFormOperation(
      { userId: context.userId, tenant: context.tenant },
      "read",
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.form_id) {
      const { data: form, error } = await (supabaseAdmin as any)
        .from("cms_forms")
        .select("id")
        .eq("tenant_id", auth.tenantId)
        .eq("id", data.form_id)
        .limit(2);
      if (error) throw new Error(error.message);
      if (!Array.isArray(form) || form.length !== 1) throw new Error("cms_form_not_found");
    }
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let query = (supabaseAdmin as any)
      .from("form_submissions")
      .select("*", { count: "exact" })
      .eq("tenant_id", auth.tenantId)
      .order("created_at", { ascending: false });
    if (data.form_id) query = query.eq("form_id", data.form_id);
    const { data: rows, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);
    return { items: rows ?? [], total: count ?? 0 };
  });

// ---------------------------------------------------------------------------
// Public form reader and writer — preserved Host-derived authority.
// ---------------------------------------------------------------------------

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
  consent_required?: boolean;
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
  published_version_id?: string | null;
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
  const { data, error } = await (supabaseAdmin as any)
    .from("cms_forms")
    .select("id, tenant_id, nome, slug, descricao, status, config, published_version_id")
    .eq("tenant_id", input.tenant.id)
    .eq("slug", input.slug)
    .eq("status", "published")
    .not("published_version_id", "is", null)
    .limit(2);
  if (error) throw new Error(error.message);
  return selectExactlyOneTenantScopedRow(
    input.tenant,
    data as PublicFormRow[] | null,
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
  const { data, error } = await (supabaseAdmin as any)
    .from("cms_form_fields")
    .select(input.projection)
    .eq("tenant_id", input.tenant.id)
    .eq("form_id", input.formId)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return assertTenantScopedCollection(input.tenant, data as PublicFieldRow[] | null);
}

export const obterFormPublicoPorSlug = createServerFn({ method: "POST" })
  .inputValidator((raw) => z.object({ slug: z.string().min(1).max(120) }).strict().parse(raw))
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
    form_slug: z.string().min(1).max(120),
    dados: z.record(
      z.string(),
      z.union([z.string().max(20_000), z.number(), z.boolean(), z.array(z.string().max(2_000)).max(100), z.null()]),
    ).refine((value) => JSON.stringify(value).length <= 200_000, "Payload de formulário excede o limite."),
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
    if (form.config.consent_required && data.consent_lgpd !== true) {
      throw new Error("Consentimento obrigatório não informado.");
    }
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
        if (typeof validation.minLength === "number" && value.length < validation.minLength) {
          throw new Error(`${field.nome}: mínimo ${validation.minLength} caracteres`);
        }
        if (typeof validation.maxLength === "number" && value.length > validation.maxLength) {
          throw new Error(`${field.nome}: máximo ${validation.maxLength} caracteres`);
        }
        if (typeof validation.regex === "string" && validation.regex) {
          let regex: RegExp;
          try {
            regex = new RegExp(validation.regex);
          } catch {
            throw new Error(`${field.nome}: configuração de validação inválida`);
          }
          if (!regex.test(value)) throw new Error(`${field.nome}: formato inválido`);
        }
        if (field.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error(`${field.nome}: e-mail inválido`);
        }
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

    // Webhook legado permanece explicitamente desativado no novo contrato: a
    // futura integração deve ser job/credential-reference auditável, nunca URL
    // arbitrária executada no request público.
    return { ok: true, message: config.success_message || "Mensagem enviada! Retornaremos em breve." };
  });
