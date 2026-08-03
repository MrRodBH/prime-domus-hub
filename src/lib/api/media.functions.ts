import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  SIGNED_URL_TTL_DOWNLOAD_SECONDS,
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

/** Lista mídia do tenant atual com busca/filtro/paginação. */
export const listarMidias = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z
      .object({
        search: z.string().optional().default(""),
        tipo: z.enum(["all", "image", "video", "pdf", "audio", "other"]).optional().default("all"),
        tag: z.string().optional().default(""),
        page: z.number().int().min(0).optional().default(0),
        pageSize: z.number().int().min(1).max(100).optional().default(48),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "visualizar",
    );
    const { supabase } = context;
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabase
      .from("media_library")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (data.tipo !== "all") q = q.eq("tipo", data.tipo);
    if (data.search.trim()) q = q.ilike("nome", `%${data.search.trim()}%`);
    if (data.tag.trim()) q = q.contains("tags", [data.tag.trim()]);
    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function signIfSafe(rawPath: string | null | undefined, ttl: number) {
      if (!rawPath) return null;
      try {
        const { bucket, path } = validateTenantSignRequest({
          bucket: "site",
          path: rawPath,
          tenantId,
        });
        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(path, ttl);
        if (signError) return null;
        return signed?.signedUrl ?? null;
      } catch {
        // Registros legados fora do prefixo tenant são omitidos, nunca assinados.
        return null;
      }
    }

    const items = await Promise.all(
      (rows ?? []).map(async (row) => {
        const [url, url_medium, url_thumbnail] = await Promise.all([
          signIfSafe(row.arquivo, SIGNED_URL_TTL_DOWNLOAD_SECONDS),
          signIfSafe(row.arquivo_medium, SIGNED_URL_TTL_PREVIEW_SECONDS),
          signIfSafe(row.arquivo_thumbnail, SIGNED_URL_TTL_PREVIEW_SECONDS),
        ]);
        return { ...row, url, url_medium, url_thumbnail };
      }),
    );
    return { items, total: count ?? 0 };
  });

/**
 * Registra mídia consumindo exclusivamente IDs de targets emitidos pelo servidor.
 * Bucket, path e filename não integram o input final de persistência.
 */
const mediaRegistrationResultSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  arquivo: z.string().min(1),
  arquivo_medium: z.string().nullable(),
  arquivo_thumbnail: z.string().nullable(),
  status: z.literal("consumed"),
}).strict();

export const registrarMidia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z
      .object({
        uploadTargetId: z.string().uuid(),
        derivativeTargetIds: z.array(z.string().uuid()).max(2).optional().default([]),
        nome: z.string().min(1).max(300),
        originalFileName: z.string().min(1).max(300).optional(),
        tipo: z.enum(["image", "video", "pdf", "audio", "other"]),
        mime_type: z.string().min(1).max(200),
        tamanho: z.number().int().min(0),
        width: z.number().int().min(0).nullable().optional(),
        height: z.number().int().min(0).nullable().optional(),
        tags: z.array(z.string()).max(100).optional().default([]),
        descricao: z.string().max(5000).optional().nullable(),
      })
      .strict()
      .superRefine((value, ctx) => {
        const ids = [value.uploadTargetId, ...value.derivativeTargetIds];
        if (new Set(ids).size !== ids.length) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Targets derivados duplicados." });
        }
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(context, "cms.midias", "criar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rawRow, error } = await supabaseAdmin.rpc(
      "consume_tenant_media_upload_target" as never,
      {
        _actor_user_id: context.userId,
        _tenant_id: tenantId,
        _tenant_origin: context.tenant.origin,
        _target_id: data.uploadTargetId,
        _derivative_target_ids: data.derivativeTargetIds,
        _name: data.nome,
        _type: data.tipo,
        _mime_type: data.mime_type,
        _size: data.tamanho,
        _width: data.width ?? null,
        _height: data.height ?? null,
        _tags: data.tags,
        _description: data.descricao ?? null,
      } as never,
    );
    if (error) throw new Error("Falha segura ao consumir o target de mídia.");
    return mediaRegistrationResultSchema.parse(rawRow);
  });

export const atualizarMidia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z
      .object({
        id: z.string().uuid(),
        nome: z.string().min(1).max(300).optional(),
        tags: z.array(z.string()).optional(),
        descricao: z.string().nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "editar",
    );
    const { id, ...patch } = data;
    const { data: before, error: beforeError } = await context.supabase
      .from("media_library")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (beforeError) throw new Error(beforeError.message);
    if (!before) throw new Error("Mídia não encontrada");

    const { data: row, error } = await context.supabase
      .from("media_library")
      .update(patch)
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Mídia não encontrada");
    await logCmsAudit(context, "media_library", "cms.midia.editar", id, before, row);
    return { ok: true };
  });

export const excluirMidia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z.object({ id: z.string().uuid(), force: z.boolean().optional().default(false) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "excluir",
    );
    const { supabase } = context;

    const { data: row, error: rowError } = await supabase
      .from("media_library")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (rowError) throw new Error(rowError.message);
    if (!row) throw new Error("Mídia não encontrada");

    const { count: usos, error: usageError } = await supabase
      .from("media_usage")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("media_id", data.id);
    if (usageError) throw new Error(usageError.message);
    if ((usos ?? 0) > 0 && !data.force) {
      return { ok: false, usos: usos ?? 0, message: "Mídia em uso. Confirme para excluir mesmo assim." };
    }

    const paths = [row.arquivo, row.arquivo_medium, row.arquivo_thumbnail]
      .filter(Boolean)
      .map((rawPath) =>
        validateTenantSignRequest({
          bucket: "site",
          path: rawPath as string,
          tenantId,
        }).path,
      );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (paths.length) {
      const { error: storageError } = await supabaseAdmin.storage.from("site").remove(paths);
      if (storageError) throw new Error(storageError.message);
    }

    const { error: deleteUsageError } = await supabase
      .from("media_usage")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("media_id", data.id);
    if (deleteUsageError) throw new Error(deleteUsageError.message);

    const { error: deleteError } = await supabase
      .from("media_library")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id);
    if (deleteError) throw new Error(deleteError.message);
    await logCmsAudit(context, "media_library", "cms.midia.excluir", data.id, row, null);
    return { ok: true };
  });

/** Retorna URL assinada de leitura para mídia do tenant atual. */
export const obterMidiaUrl = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z.object({
      id: z.string().uuid(),
      variant: z.enum(["original", "medium", "thumbnail"]).optional().default("medium"),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "visualizar",
    );

    const { data: row, error } = await context.supabase
      .from("media_library")
      .select("arquivo, arquivo_medium, arquivo_thumbnail")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Mídia não encontrada");

    const rawPath =
      data.variant === "original"
        ? row.arquivo
        : data.variant === "thumbnail"
          ? row.arquivo_thumbnail || row.arquivo
          : row.arquivo_medium || row.arquivo;

    const { bucket, path } = validateTenantSignRequest({
      bucket: "site",
      path: rawPath,
      tenantId,
    });
    const ttl =
      data.variant === "original"
        ? SIGNED_URL_TTL_DOWNLOAD_SECONDS
        : SIGNED_URL_TTL_PREVIEW_SECONDS;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, ttl);
    if (signError) throw new Error(signError.message);
    return { url: signed?.signedUrl ?? null };
  });

/** Registra uso de uma mídia depois de provar ownership tenant-scoped. */
export const registrarUsoMidia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) =>
    z
      .object({
        media_id: z.string().uuid(),
        entidade: z.string().min(1),
        entidade_id: z.string().optional().nullable(),
        campo: z.string().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "visualizar",
    );
    const { data: media, error: mediaError } = await context.supabase
      .from("media_library")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", data.media_id)
      .maybeSingle();
    if (mediaError) throw new Error(mediaError.message);
    if (!media) throw new Error("Mídia não encontrada");

    const { error } = await context.supabase.from("media_usage").upsert(
      {
        tenant_id: tenantId,
        media_id: data.media_id,
        entidade: data.entidade,
        entidade_id: data.entidade_id ?? null,
        campo: data.campo ?? null,
      },
      { onConflict: "media_id,entidade,entidade_id,campo" },
    );
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

/** Lista onde uma mídia do tenant atual é usada. */
export const listarUsosMidia = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) => z.object({ media_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.midias",
      "visualizar",
    );
    const { data: media, error: mediaError } = await context.supabase
      .from("media_library")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", data.media_id)
      .maybeSingle();
    if (mediaError) throw new Error(mediaError.message);
    if (!media) throw new Error("Mídia não encontrada");

    const { data: rows, error } = await context.supabase
      .from("media_usage")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("media_id", data.media_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
