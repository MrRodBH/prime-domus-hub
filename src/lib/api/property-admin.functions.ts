import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
  type RbacAction,
} from "@/lib/api/tenant-access-control-authority.server";
import {
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

const PROPERTY_RECORD_MODULE = "cms.paginas" as const;
const PROPERTY_MEDIA_MODULE = "cms.midias" as const;

export const PROPERTY_ADMIN_OPERATIONS = [
  "list",
  "read",
  "create",
  "update",
  "delete",
  "media.manage",
  "publish",
] as const;
export type PropertyAdminOperation = (typeof PROPERTY_ADMIN_OPERATIONS)[number];

const propertyOperationContract: Record<
  PropertyAdminOperation,
  { module: typeof PROPERTY_RECORD_MODULE | typeof PROPERTY_MEDIA_MODULE; action: RbacAction }
> = {
  list: { module: PROPERTY_RECORD_MODULE, action: "visualizar" },
  read: { module: PROPERTY_RECORD_MODULE, action: "visualizar" },
  create: { module: PROPERTY_RECORD_MODULE, action: "criar" },
  update: { module: PROPERTY_RECORD_MODULE, action: "editar" },
  delete: { module: PROPERTY_RECORD_MODULE, action: "excluir" },
  "media.manage": { module: PROPERTY_MEDIA_MODULE, action: "editar" },
  publish: { module: PROPERTY_RECORD_MODULE, action: "publicar" },
};

const imovelSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(1),
  titulo: z.string().min(2),
  slug: z.string().min(2),
  descricao: z.string().optional().nullable(),
  finalidade: z.enum(["venda", "aluguel", "lancamento"]),
  tipo: z.string().min(1),
  status: z.enum(["ativo", "rascunho", "vendido", "reservado"]).default("ativo"),
  preco: z.number().nullable().optional(),
  preco_sob_consulta: z.boolean().default(false),
  condominio: z.number().nullable().optional(),
  iptu: z.number().nullable().optional(),
  area_total: z.number().nullable().optional(),
  area_util: z.number().nullable().optional(),
  quartos: z.number().int().nullable().optional(),
  suites: z.number().int().nullable().optional(),
  banheiros: z.number().int().nullable().optional(),
  vagas: z.number().int().nullable().optional(),
  endereco: z.string().nullable().optional(),
  rua: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  bairro_id: z.string().uuid().nullable().optional(),
  corretor_id: z.string().uuid().nullable().optional(),
  badge: z.string().nullable().optional(),
  destaque: z.boolean().default(false),
  exclusivo: z.boolean().default(false),
  caracteristicas: z.array(z.string().max(120)).max(100).optional().default([]),
  imagem_capa: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  video_url: z.string().url().nullable().optional().or(z.literal("")),
  tour_url: z.string().url().nullable().optional().or(z.literal("")),
  mostrar_rua: z.boolean().default(false),
  mostrar_endereco_completo: z.boolean().default(false),
}).strict();

type PropertyImageRow = {
  id: string;
  tenant_id: string;
  imovel_id: string;
  url: string;
  alt: string | null;
  ordem: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorizePropertyOperation(context: any, operation: PropertyAdminOperation) {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Property Administration");
  const contract = propertyOperationContract[operation];
  const decision = await resolveEffectiveTenantPermission(
    trustedTenantAccessContext(context),
    contract.module,
    contract.action,
  );
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error(`property_admin_permission_denied:${operation}`);
  }
  return { tenantId, decision, operation, contract };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireProperty(context: any, tenantId: string, id: string) {
  const { data, error } = await context.supabase
    .from("imoveis")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== 1) {
    throw new Error("Imóvel não encontrado ou ambíguo no tenant atual.");
  }
  return id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireOptionalReference(
  context: any,
  tenantId: string,
  table: "bairros" | "corretores",
  id: string | null | undefined,
) {
  if (!id) return null;
  const { data, error } = await context.supabase
    .from(table)
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .limit(2);
  if (error) throw new Error(error.message);
  if ((data ?? []).length !== 1) {
    throw new Error(`${table === "bairros" ? "Bairro" : "Corretor"} não encontrado no tenant atual.`);
  }
  return id;
}

function validatePropertyImagePath(path: string, tenantId: string, propertyId: string) {
  const validated = validateTenantSignRequest({
    bucket: "imoveis",
    path,
    tenantId,
  });
  const prefix = `${tenantId}/${propertyId}/`;
  if (!validated.path.startsWith(prefix)) {
    throw new Error("Imagem fora do imóvel e tenant autorizados.");
  }
  const filename = validated.path.slice(prefix.length);
  if (!filename || filename.includes("/") || filename.startsWith(".")) {
    throw new Error("Path de imagem de imóvel inválido.");
  }
  return validated.path;
}

export const adminListarImoveis = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "list");
    const { data, error } = await context.supabase
      .from("imoveis")
      .select("id, codigo, titulo, slug, finalidade, tipo, status, preco, destaque, updated_at, bairro:bairros(tenant_id, nome)")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const relation = Array.isArray(row.bairro) ? row.bairro[0] ?? null : row.bairro;
      if (relation && relation.tenant_id !== tenantId) {
        throw new Error("Bairro relacionado cruzou o boundary do tenant.");
      }
      return { ...row, bairro: relation ? { nome: relation.nome } : null };
    });
  });

export const adminObterImovel = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "read");
    const { data: rows, error } = await context.supabase
      .from("imoveis")
      .select("*, imagens:imovel_imagens(id, tenant_id, imovel_id, url, alt, ordem)")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .limit(2);
    if (error) throw new Error(error.message);
    if ((rows ?? []).length !== 1) {
      throw new Error("Imóvel não encontrado ou ambíguo no tenant atual.");
    }
    const row = rows![0] as typeof rows[number] & { imagens: PropertyImageRow[] | null };
    const imagens = (row.imagens ?? []).map((image) => {
      if (image.tenant_id !== tenantId || image.imovel_id !== data.id) {
        throw new Error("Imagem relacionada cruzou o boundary do tenant ou imóvel.");
      }
      return { id: image.id, url: image.url, alt: image.alt, ordem: image.ordem };
    });
    return { ...row, imagens };
  });

export const adminSalvarImovel = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => imovelSchema.parse(input))
  .handler(async ({ data, context }) => {
    const baseOperation: PropertyAdminOperation = data.id ? "update" : "create";
    const { tenantId } = await authorizePropertyOperation(context, baseOperation);
    if (data.status === "ativo") await authorizePropertyOperation(context, "publish");
    await Promise.all([
      requireOptionalReference(context, tenantId, "bairros", data.bairro_id),
      requireOptionalReference(context, tenantId, "corretores", data.corretor_id),
    ]);

    const { id, imagem_capa: requestedCover, ...fields } = data;
    let imageCover: string | null = null;
    if (id && requestedCover) {
      const { data: images, error: imageError } = await context.supabase
        .from("imovel_imagens")
        .select("id, url")
        .eq("tenant_id", tenantId)
        .eq("imovel_id", id)
        .eq("url", requestedCover)
        .limit(2);
      if (imageError) throw new Error(imageError.message);
      if ((images ?? []).length !== 1) {
        throw new Error("Imagem de capa não pertence ao imóvel atual.");
      }
      imageCover = validatePropertyImagePath(images![0].url, tenantId, id);
    }

    const payload = {
      ...fields,
      imagem_capa: requestedCover ? imageCover : null,
      publicado_em: data.status === "ativo" ? new Date().toISOString() : null,
    };

    if (id) {
      await requireProperty(context, tenantId, id);
      const { data: row, error } = await context.supabase
        .from("imoveis")
        .update(payload as never)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Imóvel não encontrado.");
      return { ok: true, id };
    }

    const { data: inserted, error } = await context.supabase
      .from("imoveis")
      .insert({
        ...payload,
        tenant_id: tenantId,
        imagem_capa: null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id as string };
  });

export const adminExcluirImovel = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "delete");
    await requireProperty(context, tenantId, data.id);
    const { data: images, error: imageError } = await context.supabase
      .from("imovel_imagens")
      .select("id, tenant_id, imovel_id, url")
      .eq("tenant_id", tenantId)
      .eq("imovel_id", data.id);
    if (imageError) throw new Error(imageError.message);

    const paths: string[] = [];
    for (const image of images ?? []) {
      if (image.tenant_id !== tenantId || image.imovel_id !== data.id) {
        throw new Error("Imagem relacionada cruzou o boundary do tenant ou imóvel.");
      }
      if (!image.url.startsWith("http")) {
        paths.push(validatePropertyImagePath(image.url, tenantId, data.id));
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (paths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from("imoveis").remove(paths);
      if (storageError) throw new Error(storageError.message);
    }

    const { error: imageDeleteError } = await context.supabase
      .from("imovel_imagens")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("imovel_id", data.id);
    if (imageDeleteError) throw new Error(imageDeleteError.message);

    const { data: deleted, error } = await context.supabase
      .from("imoveis")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deleted) throw new Error("Imóvel não encontrado.");
    return { ok: true };
  });

const consumePropertyTargetResult = z.object({
  imageId: z.string().uuid(),
  uploadTargetId: z.string().uuid(),
  path: z.string().min(1),
  status: z.literal("consumed"),
}).strict();

export const adminAdicionarImagem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      imovel_id: z.string().uuid(),
      uploadTargetId: z.string().uuid(),
      alt: z.string().max(300).optional(),
      ordem: z.number().int().min(0).max(10000).default(0),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "media.manage");
    await requireProperty(context, tenantId, data.imovel_id);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin.rpc(
      "consume_tenant_property_upload_target" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_id: data.uploadTargetId,
        _property_id: data.imovel_id,
        _alt: data.alt ?? null,
        _order: data.ordem,
      } as never,
    );
    if (error) throw new Error("Falha segura ao consumir o target de upload.");
    const consumed = consumePropertyTargetResult.parse(raw);
    return {
      ok: true,
      image: {
        id: consumed.imageId,
        url: consumed.path,
        alt: data.alt ?? null,
        ordem: data.ordem,
      },
      uploadTargetId: consumed.uploadTargetId,
    };
  });

export const adminRemoverImagem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "media.manage");
    const { data: rows, error } = await context.supabase
      .from("imovel_imagens")
      .select("id, tenant_id, imovel_id, url")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .limit(2);
    if (error) throw new Error(error.message);
    if ((rows ?? []).length !== 1) {
      throw new Error("Imagem não encontrada ou ambígua no tenant atual.");
    }
    const image = rows![0];
    await requireProperty(context, tenantId, image.imovel_id);

    if (!image.url.startsWith("http")) {
      const path = validatePropertyImagePath(image.url, tenantId, image.imovel_id);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: storageError } = await supabaseAdmin.storage.from("imoveis").remove([path]);
      if (storageError) throw new Error(storageError.message);
    }

    const { data: deleted, error: deleteError } = await context.supabase
      .from("imovel_imagens")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .eq("imovel_id", image.imovel_id)
      .select("id")
      .maybeSingle();
    if (deleteError) throw new Error(deleteError.message);
    if (!deleted) throw new Error("Imagem não encontrada.");
    return { ok: true };
  });

export const adminReordenarImagens = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      imovel_id: z.string().uuid(),
      ordem: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int().positive() }).strict()).min(1).max(100),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "media.manage");
    await requireProperty(context, tenantId, data.imovel_id);

    const ids = data.ordem.map((item) => item.id);
    const positions = data.ordem.map((item) => item.ordem);
    if (new Set(ids).size !== ids.length || new Set(positions).size !== positions.length) {
      throw new Error("IDs e posições de imagens devem ser únicos.");
    }
    const expected = Array.from({ length: positions.length }, (_, index) => index + 1);
    const sorted = [...positions].sort((left, right) => left - right);
    if (!sorted.every((value, index) => value === expected[index])) {
      throw new Error("A ordenação deve ser uma sequência contínua iniciada em 1.");
    }

    const { data: rows, error } = await context.supabase
      .from("imovel_imagens")
      .select("id, tenant_id, imovel_id, url")
      .eq("tenant_id", tenantId)
      .eq("imovel_id", data.imovel_id)
      .in("id", ids);
    if (error) throw new Error(error.message);
    if ((rows ?? []).length !== ids.length) {
      throw new Error("Uma ou mais imagens não pertencem ao imóvel atual.");
    }
    const byId = new Map((rows ?? []).map((row) => [row.id, row]));
    for (const row of rows ?? []) {
      if (row.tenant_id !== tenantId || row.imovel_id !== data.imovel_id) {
        throw new Error("Imagem cruzou o boundary do tenant ou imóvel.");
      }
    }
    const coverInput = data.ordem.find((item) => item.ordem === 1)!;
    const coverRow = byId.get(coverInput.id);
    if (!coverRow) throw new Error("Imagem de capa não encontrada.");
    const coverPath = validatePropertyImagePath(coverRow.url, tenantId, data.imovel_id);

    for (const item of data.ordem) {
      const { data: updated, error: updateError } = await context.supabase
        .from("imovel_imagens")
        .update({ ordem: item.ordem })
        .eq("tenant_id", tenantId)
        .eq("imovel_id", data.imovel_id)
        .eq("id", item.id)
        .select("id")
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);
      if (!updated) throw new Error("Imagem não encontrada durante ordenação.");
    }

    const { data: property, error: propertyError } = await context.supabase
      .from("imoveis")
      .update({ imagem_capa: coverPath })
      .eq("tenant_id", tenantId)
      .eq("id", data.imovel_id)
      .select("id")
      .maybeSingle();
    if (propertyError) throw new Error(propertyError.message);
    if (!property) throw new Error("Imóvel não encontrado.");
    return { ok: true, imagem_capa: coverPath };
  });

export const adminDefinirCapa = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ imovel_id: z.string().uuid(), imagem_id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "media.manage");
    await requireProperty(context, tenantId, data.imovel_id);
    const { data: rows, error } = await context.supabase
      .from("imovel_imagens")
      .select("id, url")
      .eq("tenant_id", tenantId)
      .eq("imovel_id", data.imovel_id)
      .eq("id", data.imagem_id)
      .limit(2);
    if (error) throw new Error(error.message);
    if ((rows ?? []).length !== 1) throw new Error("Imagem não encontrada.");
    const coverPath = validatePropertyImagePath(rows![0].url, tenantId, data.imovel_id);
    const { data: updated, error: updateError } = await context.supabase
      .from("imoveis")
      .update({ imagem_capa: coverPath })
      .eq("tenant_id", tenantId)
      .eq("id", data.imovel_id)
      .select("id")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error("Imóvel não encontrado.");
    return { ok: true, imagem_capa: coverPath };
  });

export const adminAssinarUrl = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) =>
    z.object({
      bucket: z.literal("imoveis"),
      path: z.string().min(1).max(512),
      width: z.number().int().positive().max(4000).optional(),
      quality: z.number().int().min(20).max(100).optional(),
    }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { tenantId } = await authorizePropertyOperation(context, "read");
    const { data: rows, error } = await context.supabase
      .from("imovel_imagens")
      .select("id, tenant_id, imovel_id, url")
      .eq("tenant_id", tenantId)
      .eq("url", data.path)
      .limit(2);
    if (error) throw new Error(error.message);
    if ((rows ?? []).length !== 1) {
      throw new Error("Imagem não encontrada ou ambígua no tenant atual.");
    }
    const image = rows![0];
    await requireProperty(context, tenantId, image.imovel_id);
    const path = validatePropertyImagePath(image.url, tenantId, image.imovel_id);
    const options = data.width
      ? { transform: { width: data.width, quality: data.quality ?? 70, resize: "contain" as const } }
      : undefined;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from("imoveis")
      .createSignedUrl(path, SIGNED_URL_TTL_PREVIEW_SECONDS, options);
    if (signError) throw new Error(signError.message);
    return { url: signed.signedUrl };
  });
