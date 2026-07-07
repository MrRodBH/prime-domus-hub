import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SIGNED_URL_TTL_DOWNLOAD_SECONDS,
  SIGNED_URL_TTL_PREVIEW_SECONDS,
  validateTenantSignRequest,
} from "@/lib/storage/signed-url";

/** Lista mídia do tenant atual com busca/filtro/paginação. */
export const listarMidias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { supabase } = context;
    const from = data.page * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabase.from("media_library").select("*", { count: "exact" }).order("created_at", { ascending: false });
    if (data.tipo !== "all") q = q.eq("tipo", data.tipo);
    if (data.search.trim()) q = q.ilike("nome", `%${data.search.trim()}%`);
    if (data.tag.trim()) q = q.contains("tags", [data.tag.trim()]);
    const { data: rows, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);

    // Tenant efetivo resolvido server-side (IA-001). Toda assinatura passa
    // por validação anti-cross-tenant + anti-traversal (M3.4).
    const { data: tenantRow, error: tenantErr } = await supabase.rpc("get_current_tenant_id");
    if (tenantErr) throw new Error(tenantErr.message);
    const tenantId = tenantRow as string | null;
    if (!tenantId) throw new Error("Tenant efetivo não resolvido — listagem de mídia negada.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function signIfSafe(rawPath: string | null | undefined, ttl: number) {
      if (!rawPath) return null;
      try {
        const { bucket, path } = validateTenantSignRequest({
          bucket: "site",
          path: rawPath,
          tenantId: tenantId!,
        });
        const { data: s } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, ttl);
        return s?.signedUrl ?? null;
      } catch {
        // Registros legados fora do prefixo tenant são silenciosamente
        // omitidos aqui — migração formal é escopo da M3.3.
        return null;
      }
    }

    const items = await Promise.all(
      (rows ?? []).map(async (r) => {
        const [url, url_medium, url_thumbnail] = await Promise.all([
          signIfSafe(r.arquivo, SIGNED_URL_TTL_DOWNLOAD_SECONDS),
          signIfSafe(r.arquivo_medium, SIGNED_URL_TTL_PREVIEW_SECONDS),
          signIfSafe(r.arquivo_thumbnail, SIGNED_URL_TTL_PREVIEW_SECONDS),
        ]);
        return { ...r, url, url_medium, url_thumbnail };
      }),
    );
    return { items, total: count ?? 0 };
  });


/**
 * Registra uma mídia já enviada ao bucket.
 *
 * PATCH M3.2.1: o client NÃO define mais o path físico. Deve passar
 * `uploadTarget` produzido por `createUploadTarget` (domain: "media") e,
 * opcionalmente, derivativas (medium/thumbnail) que também tenham sido
 * geradas server-side. Todos os paths são revalidados aqui contra o tenant
 * efetivo (IA-001) — qualquer path fora de `{tenantId}/media/…` ou bucket
 * diferente de `site` é rejeitado fail-fast.
 */
const uploadTargetSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1).max(512),
  storageFileName: z.string().min(1).max(200),
  domain: z.literal("media"),
});

const derivativeTargetSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1).max(512),
});

function assertMediaPathSafe(path: string, tenantId: string, bucket: string) {
  if (bucket !== "site") {
    throw new Error(`Bucket inválido para mídia: ${bucket}`);
  }
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    throw new Error("Path inválido (traversal ou absoluto).");
  }
  const expectedPrefix = `${tenantId}/media/`;
  if (!path.startsWith(expectedPrefix)) {
    throw new Error("Path fora do escopo do tenant/domínio permitido.");
  }
  // Nome do arquivo (último segmento) — sem barras extras, sem oculto.
  const filename = path.slice(expectedPrefix.length);
  if (!filename || filename.includes("/") || filename.startsWith(".")) {
    throw new Error("Filename inválido.");
  }
}

export const registrarMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        uploadTarget: uploadTargetSchema,
        arquivo_medium: derivativeTargetSchema.nullable().optional(),
        arquivo_thumbnail: derivativeTargetSchema.nullable().optional(),
        nome: z.string().min(1).max(300),
        originalFileName: z.string().min(1).max(300).optional(),
        tipo: z.enum(["image", "video", "pdf", "audio", "other"]),
        mime_type: z.string().min(1).max(200),
        tamanho: z.number().int().min(0),
        width: z.number().int().min(0).nullable().optional(),
        height: z.number().int().min(0).nullable().optional(),
        tags: z.array(z.string()).optional().default([]),
        descricao: z.string().optional().nullable(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.midias", "criar");
    const { supabase, userId } = context;

    // Resolver tenant efetivo server-side (IA-001) — não confiar em nada
    // que veio do client.
    const { data: tenantRow, error: tenantErr } = await supabase.rpc(
      "get_current_tenant_id",
    );
    if (tenantErr) throw new Error(tenantErr.message);
    const tenantId = tenantRow as string | null;
    if (!tenantId) {
      throw new Error("Tenant efetivo não resolvido — impossível registrar mídia.");
    }

    // Validação dura de todos os paths recebidos.
    assertMediaPathSafe(data.uploadTarget.path, tenantId, data.uploadTarget.bucket);
    if (data.arquivo_medium) {
      assertMediaPathSafe(data.arquivo_medium.path, tenantId, data.arquivo_medium.bucket);
    }
    if (data.arquivo_thumbnail) {
      assertMediaPathSafe(data.arquivo_thumbnail.path, tenantId, data.arquivo_thumbnail.bucket);
    }

    const { data: row, error } = await supabase
      .from("media_library")
      .insert({
        nome: data.nome,
        arquivo: data.uploadTarget.path,
        arquivo_medium: data.arquivo_medium?.path ?? null,
        arquivo_thumbnail: data.arquivo_thumbnail?.path ?? null,
        tipo: data.tipo,
        mime_type: data.mime_type,
        tamanho: data.tamanho,
        width: data.width ?? null,
        height: data.height ?? null,
        tags: data.tags,
        descricao: data.descricao ?? null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "media_library", "cms.midia.upload", row.id, null, row);
    return row;
  });

export const atualizarMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.midias", "editar");
    const { id, ...patch } = data;
    const { data: before } = await context.supabase.from("media_library").select("*").eq("id", id).maybeSingle();
    const { data: row, error } = await context.supabase.from("media_library").update(patch).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "media_library", "cms.midia.editar", id, before, row);
    return { ok: true };
  });

export const excluirMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid(), force: z.boolean().optional().default(false) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.midias", "excluir");
    const { supabase } = context;
    const { count: usos } = await supabase
      .from("media_usage")
      .select("id", { count: "exact", head: true })
      .eq("media_id", data.id);
    if ((usos ?? 0) > 0 && !data.force) {
      return { ok: false, usos: usos ?? 0, message: "Mídia em uso. Confirme para excluir mesmo assim." };
    }
    const { data: row, error: e1 } = await supabase
      .from("media_library")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const paths = [row.arquivo, row.arquivo_medium, row.arquivo_thumbnail].filter(Boolean) as string[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (paths.length) await supabaseAdmin.storage.from("site").remove(paths);
    const { error: e2 } = await supabase.from("media_library").delete().eq("id", data.id);
    if (e2) throw new Error(e2.message);
    await logCmsAudit(context, "media_library", "cms.midia.excluir", data.id, row, null);
    return { ok: true };
  });

/** Retorna URL assinada de leitura para uma mídia específica. */
export const obterMidiaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid(), variant: z.enum(["original", "medium", "thumbnail"]).optional().default("medium") }).parse(raw))
  .handler(async ({ data, context }) => {
    // Tenant efetivo server-side (IA-001). O client não escolhe path/bucket.
    const { data: tenantRow, error: tenantErr } = await context.supabase.rpc("get_current_tenant_id");
    if (tenantErr) throw new Error(tenantErr.message);
    const tenantId = tenantRow as string | null;
    if (!tenantId) throw new Error("Tenant efetivo não resolvido — assinatura negada.");

    // RLS + tenant garantem que só carregamos mídia deste tenant.
    const { data: row, error } = await context.supabase
      .from("media_library")
      .select("arquivo, arquivo_medium, arquivo_thumbnail")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    const rawPath =
      data.variant === "original"
        ? row.arquivo
        : data.variant === "thumbnail"
        ? row.arquivo_thumbnail || row.arquivo
        : row.arquivo_medium || row.arquivo;

    // Fail-fast: bucket allowlist + prefix tenant + anti-traversal (M3.4).
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
    const { data: signed } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, ttl);
    return { url: signed?.signedUrl ?? null };
  });


/** Registra um uso da mídia (chamado por editores de conteúdo). */
export const registrarUsoMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
    const { error } = await context.supabase.from("media_usage").upsert(
      {
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

/** Lista onde uma mídia é usada. */
export const listarUsosMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ media_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("media_usage")
      .select("*")
      .eq("media_id", data.media_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
