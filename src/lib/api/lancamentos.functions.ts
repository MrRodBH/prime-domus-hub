import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { normalizePublicDocumentUrl, normalizePublicMediaUrl } from "@/lib/public-content-security";
import { sanitizePublicHtml } from "@/lib/public-html-sanitizer.server";
import { toEmbedUrl } from "@/lib/embed-url";
import { authorizeTenantCmsOperation, safeTenantCmsError } from "@/lib/api/tenant-cms-authority.server";

type PublicLaunchRow = { tenant_id: string } & Record<string, any>;

function oneRelation(value: unknown): PublicLaunchRow | null {
  if (Array.isArray(value)) return (value[0] as PublicLaunchRow | undefined) ?? null;
  return value && typeof value === "object" ? value as PublicLaunchRow : null;
}
function stripRelation(tenantId: string, value: unknown, label: string): Record<string, any> | null {
  const row = oneRelation(value);
  if (!row) return null;
  if (row.tenant_id !== tenantId) throw new Error(`public_resource_foreign_tenant:${label}`);
  return withoutTenantId(row) as Record<string, any>;
}

async function authorizeLaunch(context: Parameters<typeof authorizeTenantCmsOperation>[0], operation: "list" | "read" | "create_draft" | "save_draft" | "publish" | "delete") {
  return authorizeTenantCmsOperation(context, "cms.paginas", operation);
}

async function requireProject(context: any, tenantId: string, projectId: string) {
  const { data, error } = await context.supabase.from("launch_projects").select("id")
    .eq("tenant_id", tenantId).eq("id", projectId).limit(2);
  if (error) throw safeTenantCmsError(error);
  if ((data ?? []).length !== 1) throw new Error("launch_project_cross_tenant_or_missing");
  return projectId;
}

async function requireReference(context: any, tenantId: string, table: string, id: string | null | undefined) {
  if (!id) return null;
  const { data, error } = await context.supabase.from(table as never).select("id")
    .eq("tenant_id", tenantId).eq("id", id).limit(2);
  if (error) throw safeTenantCmsError(error);
  if ((data ?? []).length !== 1) throw new Error("launch_reference_cross_tenant_or_missing");
  return id;
}

export const listarStatusLancamento = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("launch_statuses")
    .select("tenant_id,id,slug,nome,ordem,ativo").eq("tenant_id", tenant.id).eq("ativo", true).order("ordem");
  if (error) throw new Error(error.message);
  return assertTenantScopedRows(tenant.id, data as unknown as PublicLaunchRow[] | null).map(withoutTenantId);
});

export const listarAmenities = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("launch_amenities")
    .select("tenant_id,id,slug,nome,ordem,ativo").eq("tenant_id", tenant.id).eq("ativo", true).order("ordem");
  if (error) throw new Error(error.message);
  return assertTenantScopedRows(tenant.id, data as unknown as PublicLaunchRow[] | null).map(withoutTenantId);
});

export const adminListarLancamentos = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const authorization = await authorizeLaunch(context, "list");
    const { data, error } = await context.supabase.from("launch_projects")
      .select("id,slug,nome,construtora,entrega,publicado,destaque,imagem_capa,status:status_id(tenant_id,nome,slug),corretor:corretor_id(tenant_id,nome),updated_at")
      .eq("tenant_id", authorization.tenantId).order("updated_at", { ascending: false });
    if (error) throw safeTenantCmsError(error);
    return (data ?? []).map((row) => {
      const status = oneRelation(row.status);
      const corretor = oneRelation(row.corretor);
      if (status && status.tenant_id !== authorization.tenantId) throw new Error("launch_status_cross_tenant");
      if (corretor && corretor.tenant_id !== authorization.tenantId) throw new Error("launch_broker_cross_tenant");
      return { ...row, status: status ? withoutTenantId(status) : null, corretor: corretor ? withoutTenantId(corretor) : null };
    });
  });

export const adminObterLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeLaunch(context, "read");
    const { data: rows, error } = await context.supabase.from("launch_projects").select("*")
      .eq("tenant_id", authorization.tenantId).eq("id", data.id).limit(2);
    if (error) throw safeTenantCmsError(error);
    if ((rows ?? []).length !== 1) throw new Error("launch_project_cross_tenant_or_missing");
    const { data: amenityRows, error: amenityError } = await context.supabase.from("launch_project_amenities")
      .select("amenity_id").eq("tenant_id", authorization.tenantId).eq("project_id", data.id);
    if (amenityError) throw safeTenantCmsError(amenityError);
    return { ...rows![0], amenity_ids: (amenityRows ?? []).map((row) => row.amenity_id) };
  });

const projectSchema = z.object({
  id: z.string().uuid().optional(), slug: z.string().trim().min(2).max(200), nome: z.string().trim().min(2).max(300),
  descricao: z.string().max(200000).nullable().optional(), status_id: z.string().uuid().nullable().optional(),
  quartos: z.number().int().nullable().optional(), suites: z.number().int().nullable().optional(), vagas: z.number().int().nullable().optional(),
  area_apartamentos: z.number().nullable().optional(), construtora: z.string().max(300).nullable().optional(), entrega: z.string().nullable().optional(),
  endereco: z.string().max(1000).nullable().optional(), cidade_id: z.string().uuid().nullable().optional(), bairro_id: z.string().uuid().nullable().optional(),
  arquitetura: z.string().max(300).nullable().optional(), numero_unidades: z.number().int().nullable().optional(), numero_torres: z.number().int().nullable().optional(),
  unidades_por_andar: z.number().int().nullable().optional(), numero_andares: z.number().int().nullable().optional(), elevadores: z.number().int().nullable().optional(),
  corretor_id: z.string().uuid().nullable().optional(), imagem_capa: z.string().max(512).nullable().optional(), video_url: z.string().max(1000).nullable().optional(),
  publicado: z.boolean().default(false), destaque: z.boolean().default(false), meta_title: z.string().max(60).nullable().optional(),
  meta_description: z.string().max(160).nullable().optional(), og_image: z.string().max(512).nullable().optional(),
  amenity_ids: z.array(z.string().uuid()).max(100).default([]),
}).strict();

export const adminSalvarLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => projectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const operation = data.publicado ? "publish" : data.id ? "save_draft" : "create_draft";
    const authorization = await authorizeLaunch(context, operation);
    await Promise.all([
      requireReference(context, authorization.tenantId, "launch_statuses", data.status_id),
      requireReference(context, authorization.tenantId, "cidades", data.cidade_id),
      requireReference(context, authorization.tenantId, "bairros", data.bairro_id),
      requireReference(context, authorization.tenantId, "corretores", data.corretor_id),
      ...data.amenity_ids.map((id) => requireReference(context, authorization.tenantId, "launch_amenities", id)),
    ]);
    const { amenity_ids, id, ...fields } = data;
    let projectId = id;
    if (id) {
      const { data: updated, error } = await context.supabase.from("launch_projects").update(fields as never)
        .eq("tenant_id", authorization.tenantId).eq("id", id).select("id").maybeSingle();
      if (error) throw safeTenantCmsError(error);
      if (!updated) throw new Error("launch_project_cross_tenant_or_missing");
    } else {
      const { data: created, error } = await context.supabase.from("launch_projects")
        .insert({ ...fields, tenant_id: authorization.tenantId } as never).select("id").single();
      if (error) throw safeTenantCmsError(error);
      projectId = created.id;
    }
    await context.supabase.from("launch_project_amenities").delete()
      .eq("tenant_id", authorization.tenantId).eq("project_id", projectId!);
    if (amenity_ids.length) {
      const rows = amenity_ids.map((amenityId) => ({ tenant_id: authorization.tenantId, project_id: projectId!, amenity_id: amenityId }));
      const { error } = await context.supabase.from("launch_project_amenities").insert(rows as never);
      if (error) throw safeTenantCmsError(error);
    }
    return { ok: true, id: projectId! };
  });

export const adminExcluirLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeLaunch(context, "delete");
    const { data: deleted, error } = await context.supabase.from("launch_projects").delete()
      .eq("tenant_id", authorization.tenantId).eq("id", data.id).select("id").maybeSingle();
    if (error) throw safeTenantCmsError(error);
    if (!deleted) throw new Error("launch_project_cross_tenant_or_missing");
    return { ok: true };
  });

export const adminListarImagensLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeLaunch(context, "read");
    await requireProject(context, authorization.tenantId, data.project_id);
    const { data: rows, error } = await context.supabase.from("launch_project_imagens")
      .select("id, storage_path, legenda, ordem").eq("tenant_id", authorization.tenantId).eq("project_id", data.project_id).order("ordem");
    if (error) throw safeTenantCmsError(error); return rows ?? [];
  });

export const adminAdicionarImagemLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid(), uploadTargetId: z.string().uuid(), legenda: z.string().max(500).optional().nullable(), ordem: z.number().int().default(0) }).strict().parse(input))
  .handler(async ({ context }) => { await authorizeLaunch(context, "save_draft"); throw new Error("launch_image_target_consumer_not_materialized"); });

export const adminRemoverImagemLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeLaunch(context, "save_draft");
    const { data: rows, error } = await context.supabase.from("launch_project_imagens").select("id, project_id, storage_path")
      .eq("tenant_id", authorization.tenantId).eq("id", data.id).limit(2);
    if (error) throw safeTenantCmsError(error); if ((rows ?? []).length !== 1) throw new Error("launch_image_cross_tenant_or_missing");
    const image = rows![0]; await requireProject(context, authorization.tenantId, image.project_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: storageError } = await supabaseAdmin.storage.from("lancamentos").remove([image.storage_path]);
    if (storageError) throw new Error(storageError.message);
    const { error: deleteError } = await context.supabase.from("launch_project_imagens").delete()
      .eq("tenant_id", authorization.tenantId).eq("id", data.id).eq("project_id", image.project_id);
    if (deleteError) throw safeTenantCmsError(deleteError); return { ok: true };
  });

export const adminReordenarImagensLancamento = createServerFn({ method: "POST" })
  .middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid(), ordem: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int().positive() }).strict()).min(1).max(100) }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const authorization = await authorizeLaunch(context, "save_draft"); await requireProject(context, authorization.tenantId, data.project_id);
    const ids = data.ordem.map((row) => row.id); if (new Set(ids).size !== ids.length) throw new Error("launch_image_order_duplicate");
    const { data: rows, error } = await context.supabase.from("launch_project_imagens").select("id,storage_path")
      .eq("tenant_id", authorization.tenantId).eq("project_id", data.project_id).in("id", ids);
    if (error) throw safeTenantCmsError(error); if ((rows ?? []).length !== ids.length) throw new Error("launch_image_cross_tenant_or_missing");
    for (const row of data.ordem) {
      const { error: updateError } = await context.supabase.from("launch_project_imagens").update({ ordem: row.ordem } as never)
        .eq("tenant_id", authorization.tenantId).eq("project_id", data.project_id).eq("id", row.id);
      if (updateError) throw safeTenantCmsError(updateError);
    }
    const first = data.ordem.find((row) => row.ordem === 1); const cover = rows?.find((row) => row.id === first?.id)?.storage_path ?? null;
    if (cover) await context.supabase.from("launch_projects").update({ imagem_capa: cover } as never).eq("tenant_id", authorization.tenantId).eq("id", data.project_id);
    return { ok: true };
  });

const UNIT_TIPOS = ["1_quarto","2_quartos","3_quartos","4_quartos_mais","cobertura","garden"] as const;
const UNIT_STATUS = ["disponivel","reservada","vendida","indisponivel"] as const;
const unitSchema = z.object({ id: z.string().uuid().optional(), project_id: z.string().uuid(), unidade: z.number().int(), bloco: z.string().nullable().optional(), area: z.number().nullable().optional(), tipo: z.enum(UNIT_TIPOS).nullable().optional(), vagas: z.number().int().nullable().optional(), valor: z.number().nullable().optional(), status: z.enum(UNIT_STATUS).default("disponivel"), ativa: z.boolean().default(true) }).strict();

export const adminListarUnidades = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "read"); await requireProject(context, auth.tenantId, data.project_id);
  const { data: rows, error } = await context.supabase.from("launch_units").select("*").eq("tenant_id", auth.tenantId).eq("project_id", data.project_id).order("bloco", { nullsFirst: true }).order("unidade");
  if (error) throw safeTenantCmsError(error); return rows ?? [];
});
export const adminSalvarUnidade = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => unitSchema.parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); await requireProject(context, auth.tenantId, data.project_id); const { id, ...rest } = data; const payload = { ...rest, tenant_id: auth.tenantId, bloco: rest.bloco?.toUpperCase() ?? null };
  if (id) { const { data: updated, error } = await context.supabase.from("launch_units").update(payload as never).eq("tenant_id", auth.tenantId).eq("project_id", data.project_id).eq("id", id).select("id").maybeSingle(); if (error) throw safeTenantCmsError(error); if (!updated) throw new Error("launch_unit_cross_tenant_or_missing"); return { ok: true, id }; }
  const { data: created, error } = await context.supabase.from("launch_units").insert(payload as never).select("id").single(); if (error) throw safeTenantCmsError(error); return { ok: true, id: created.id };
});
export const adminExcluirUnidade = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); const { data: deleted, error } = await context.supabase.from("launch_units").delete().eq("tenant_id", auth.tenantId).eq("id", data.id).select("id").maybeSingle(); if (error) throw safeTenantCmsError(error); if (!deleted) throw new Error("launch_unit_cross_tenant_or_missing"); return { ok: true };
});
export const adminAlternarUnidadeAtiva = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ id: z.string().uuid(), ativa: z.boolean() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); const { data: updated, error } = await context.supabase.from("launch_units").update({ ativa: data.ativa } as never).eq("tenant_id", auth.tenantId).eq("id", data.id).select("id").maybeSingle(); if (error) throw safeTenantCmsError(error); if (!updated) throw new Error("launch_unit_cross_tenant_or_missing"); return { ok: true };
});
export const adminImportarUnidades = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid(), rows: z.array(unitSchema.omit({ id: true, project_id: true })).max(5000) }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); await requireProject(context, auth.tenantId, data.project_id); if (!data.rows.length) return { ok: true, inserted: 0 };
  const payload = data.rows.map((row) => ({ ...row, tenant_id: auth.tenantId, project_id: data.project_id, bloco: row.bloco?.toUpperCase() ?? null })); const { error } = await context.supabase.from("launch_units").insert(payload as never); if (error) throw safeTenantCmsError(error); return { ok: true, inserted: payload.length };
});

const paymentSchema = z.object({ project_id: z.string().uuid(), entrada: z.number().nullable().optional(), sinal: z.number().positive(), parcela_30: z.number().nullable().optional(), parcela_60: z.number().nullable().optional(), parcela_90: z.number().nullable().optional(), num_parcelas: z.number().int().nonnegative(), valor_parcela: z.number().nonnegative(), qtd_anuais: z.number().int().nullable().optional(), valor_anual: z.number().nullable().optional(), qtd_semestrais: z.number().int().nullable().optional(), valor_semestral: z.number().nullable().optional(), observacoes: z.string().max(4000).nullable().optional() }).strict();
export const adminObterCondicoesPagamento = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "read"); await requireProject(context, auth.tenantId, data.project_id); const { data: rows, error } = await context.supabase.from("launch_payment_conditions").select("*").eq("tenant_id", auth.tenantId).eq("project_id", data.project_id).limit(2); if (error) throw safeTenantCmsError(error); if ((rows ?? []).length > 1) throw new Error("launch_payment_ambiguous"); return rows?.[0] ?? null;
});
export const adminSalvarCondicoesPagamento = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => paymentSchema.parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); await requireProject(context, auth.tenantId, data.project_id); const { error } = await context.supabase.from("launch_payment_conditions").upsert({ ...data, tenant_id: auth.tenantId } as never, { onConflict: "project_id" }); if (error) throw safeTenantCmsError(error); return { ok: true };
});

export const adminListarPdfsLancamento = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "read"); await requireProject(context, auth.tenantId, data.project_id); const { data: rows, error } = await context.supabase.from("launch_pdfs").select("id,kind,titulo,storage_path,tamanho_bytes,created_at").eq("tenant_id", auth.tenantId).eq("project_id", data.project_id).order("created_at", { ascending: false }); if (error) throw safeTenantCmsError(error); return rows ?? [];
});
export const adminAdicionarPdfLancamento = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ project_id: z.string().uuid(), kind: z.enum(["tabela_precos","manual"]), titulo: z.string().max(300).nullable().optional(), uploadTargetId: z.string().uuid(), tamanho_bytes: z.number().int().nonnegative().optional() }).strict().parse(input)).handler(async ({ context }) => { await authorizeLaunch(context, "save_draft"); throw new Error("launch_pdf_target_consumer_not_materialized"); });
export const adminRemoverPdfLancamento = createServerFn({ method: "POST" }).middleware([requireTenant]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input)).handler(async ({ data, context }) => {
  const auth = await authorizeLaunch(context, "save_draft"); const { data: rows, error } = await context.supabase.from("launch_pdfs").select("id,project_id,storage_path").eq("tenant_id", auth.tenantId).eq("id", data.id).limit(2); if (error) throw safeTenantCmsError(error); if ((rows ?? []).length !== 1) throw new Error("launch_pdf_cross_tenant_or_missing"); const pdf = rows![0]; await requireProject(context, auth.tenantId, pdf.project_id); const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { error: storageError } = await supabaseAdmin.storage.from("lancamentos").remove([pdf.storage_path]); if (storageError) throw new Error(storageError.message); const { error: deleteError } = await context.supabase.from("launch_pdfs").delete().eq("tenant_id", auth.tenantId).eq("id", data.id).eq("project_id", pdf.project_id); if (deleteError) throw safeTenantCmsError(deleteError); return { ok: true };
});

async function signLaunchDestination(admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin, value: string | null | undefined, width?: number): Promise<string | null> {
  if (!value) return null; const existing = normalizePublicMediaUrl(value); if (existing) return existing; const options = width ? { transform: { width, quality: 75, resize: "contain" as const } } : undefined; const { data, error } = await admin.storage.from("lancamentos").createSignedUrl(value, 86400, options); if (error) return null; return normalizePublicMediaUrl(data?.signedUrl);
}

export const listarLancamentosPublico = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest(); const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data, error } = await supabaseAdmin.from("launch_projects").select("tenant_id,id,slug,nome,construtora,entrega,destaque,imagem_capa,endereco,status:status_id(tenant_id,nome,slug)").eq("tenant_id", tenant.id).eq("publicado", true).order("destaque", { ascending: false }).order("entrega", { ascending: true }); if (error) throw new Error(error.message); const rows = assertTenantScopedRows(tenant.id, data as unknown as PublicLaunchRow[] | null); return Promise.all(rows.map(async (row) => { const dto = withoutTenantId(row) as Record<string, any>; dto.status = stripRelation(tenant.id, dto.status, "launch_status"); dto.capa_url = await signLaunchDestination(supabaseAdmin, dto.imagem_capa, 800); delete dto.imagem_capa; return dto; }));
});

export const obterLancamentoPublico = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).strict().parse(input)).handler(async ({ data }) => {
  const tenant = await requirePublicTenantFromRequest(); const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const result = await supabaseAdmin.from("launch_projects").select("tenant_id,id,slug,nome,descricao,quartos,suites,vagas,area_apartamentos,construtora,entrega,endereco,arquitetura,numero_unidades,numero_torres,unidades_por_andar,numero_andares,elevadores,imagem_capa,video_url,meta_title,meta_description,og_image,status:status_id(tenant_id,nome,slug),corretor:corretor_id(tenant_id,id,nome,telefone,whatsapp,foto_url,creci),cidade:cidade_id(tenant_id,nome,estado),bairro:bairro_id(tenant_id,nome)").eq("tenant_id", tenant.id).eq("slug", data.slug).eq("publicado", true).limit(2); if (result.error) throw new Error(result.error.message); const projects = assertTenantScopedRows(tenant.id, result.data as unknown as PublicLaunchRow[] | null); if (!projects.length) return null; if (projects.length !== 1) throw new Error("public_resource_ambiguous"); const project = projects[0]; const projectId = String(project.id);
  const [amenities, images, pdfs, payments, units] = await Promise.all([
    supabaseAdmin.from("launch_project_amenities").select("tenant_id,amenity:amenity_id(tenant_id,slug,nome)").eq("tenant_id", tenant.id).eq("project_id", projectId),
    supabaseAdmin.from("launch_project_imagens").select("tenant_id,id,storage_path,legenda,ordem").eq("tenant_id", tenant.id).eq("project_id", projectId).order("ordem"),
    supabaseAdmin.from("launch_pdfs").select("tenant_id,id,kind,titulo,storage_path,created_at").eq("tenant_id", tenant.id).eq("project_id", projectId).order("created_at", { ascending: false }),
    supabaseAdmin.from("launch_payment_conditions").select("*").eq("tenant_id", tenant.id).eq("project_id", projectId).limit(2),
    supabaseAdmin.from("launch_units").select("tenant_id,id,unidade,bloco,area,tipo,vagas,valor,status").eq("tenant_id", tenant.id).eq("project_id", projectId).eq("ativa", true).order("bloco").order("unidade"),
  ]); for (const child of [amenities, images, pdfs, payments, units]) if (child.error) throw new Error(child.error.message);
  const imageRows = assertTenantScopedRows(tenant.id, images.data as unknown as PublicLaunchRow[] | null); const pdfRows = assertTenantScopedRows(tenant.id, pdfs.data as unknown as PublicLaunchRow[] | null); const paymentRows = assertTenantScopedRows(tenant.id, payments.data as unknown as PublicLaunchRow[] | null); if (paymentRows.length > 1) throw new Error("public_resource_ambiguous"); const unitRows = assertTenantScopedRows(tenant.id, units.data as unknown as PublicLaunchRow[] | null); const amenityRows = assertTenantScopedRows(tenant.id, amenities.data as unknown as PublicLaunchRow[] | null);
  const dto = withoutTenantId(project) as Record<string, any>; dto.status = stripRelation(tenant.id, dto.status, "launch_status"); dto.corretor = stripRelation(tenant.id, dto.corretor, "launch_broker"); if (dto.corretor?.foto_url) dto.corretor.foto_url = normalizePublicMediaUrl(dto.corretor.foto_url); dto.cidade = stripRelation(tenant.id, dto.cidade, "launch_city"); if (dto.cidade?.estado) dto.cidade.uf = dto.cidade.estado; dto.bairro = stripRelation(tenant.id, dto.bairro, "launch_neighborhood"); dto.descricao = sanitizePublicHtml(typeof dto.descricao === "string" ? dto.descricao : ""); dto.video_url = toEmbedUrl(typeof dto.video_url === "string" ? dto.video_url : null); dto.imagem_capa_url = await signLaunchDestination(supabaseAdmin, dto.imagem_capa, 1920); dto.og_image_url = await signLaunchDestination(supabaseAdmin, dto.og_image, 1200) ?? dto.imagem_capa_url; delete dto.imagem_capa; delete dto.og_image; dto.amenities = amenityRows.flatMap((row) => { const amenity = stripRelation(tenant.id, row.amenity, "launch_amenity"); return amenity ? [amenity] : []; }); dto.imagens = await Promise.all(imageRows.map(async (row) => { const { storage_path, ...image } = withoutTenantId(row) as Record<string, any>; return { ...image, url: await signLaunchDestination(supabaseAdmin, String(storage_path), 1600), thumb: await signLaunchDestination(supabaseAdmin, String(storage_path), 400) }; })); dto.pdfs = await Promise.all(pdfRows.map(async (row) => { const { storage_path, ...pdf } = withoutTenantId(row) as Record<string, any>; return { ...pdf, url: normalizePublicDocumentUrl(await signLaunchDestination(supabaseAdmin, String(storage_path))) }; })); dto.tabela_precos_atual = dto.pdfs.find((pdf: Record<string, any>) => pdf.kind === "tabela_precos") ?? null; dto.condicoes = paymentRows[0] ? withoutTenantId(paymentRows[0]) : null; dto.unidades = unitRows.map(withoutTenantId); const prices = dto.unidades.map((unit: Record<string, any>) => unit.valor).filter((value: unknown): value is number => typeof value === "number" && value > 0); dto.preco_min = prices.length ? Math.min(...prices) : null; dto.preco_max = prices.length ? Math.max(...prices) : null; return dto;
});
