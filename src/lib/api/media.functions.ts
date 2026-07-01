import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SIGN_TTL = 60 * 60 * 24 * 365;

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
    // Assina URLs (medium/thumbnail preferidos)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const items = await Promise.all(
      (rows ?? []).map(async (r) => {
        const [orig, mid, thumb] = await Promise.all([
          supabaseAdmin.storage.from("site").createSignedUrl(r.arquivo, SIGN_TTL),
          r.arquivo_medium
            ? supabaseAdmin.storage.from("site").createSignedUrl(r.arquivo_medium, SIGN_TTL)
            : Promise.resolve({ data: null }),
          r.arquivo_thumbnail
            ? supabaseAdmin.storage.from("site").createSignedUrl(r.arquivo_thumbnail, SIGN_TTL)
            : Promise.resolve({ data: null }),
        ]);
        return {
          ...r,
          url: orig.data?.signedUrl ?? null,
          url_medium: (mid.data as { signedUrl?: string } | null)?.signedUrl ?? null,
          url_thumbnail: (thumb.data as { signedUrl?: string } | null)?.signedUrl ?? null,
        };
      }),
    );
    return { items, total: count ?? 0 };
  });

/** Registra uma mídia já enviada ao bucket (o cliente faz o upload direto). */
export const registrarMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({
        nome: z.string().min(1).max(300),
        arquivo: z.string().min(1),
        arquivo_medium: z.string().nullable().optional(),
        arquivo_thumbnail: z.string().nullable().optional(),
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
    const { data: row, error } = await supabase
      .from("media_library")
      .insert({
        nome: data.nome,
        arquivo: data.arquivo,
        arquivo_medium: data.arquivo_medium ?? null,
        arquivo_thumbnail: data.arquivo_thumbnail ?? null,
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
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("media_library").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirMidia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid(), force: z.boolean().optional().default(false) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Checa uso antes
    const { count: usos } = await supabase
      .from("media_usage")
      .select("id", { count: "exact", head: true })
      .eq("media_id", data.id);
    if ((usos ?? 0) > 0 && !data.force) {
      return { ok: false, usos: usos ?? 0, message: "Mídia em uso. Confirme para excluir mesmo assim." };
    }
    const { data: row, error: e1 } = await supabase
      .from("media_library")
      .select("arquivo, arquivo_medium, arquivo_thumbnail")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const paths = [row.arquivo, row.arquivo_medium, row.arquivo_thumbnail].filter(Boolean) as string[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (paths.length) await supabaseAdmin.storage.from("site").remove(paths);
    const { error: e2 } = await supabase.from("media_library").delete().eq("id", data.id);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

/** Retorna URL assinada de leitura para uma mídia específica. */
export const obterMidiaUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ id: z.string().uuid(), variant: z.enum(["original", "medium", "thumbnail"]).optional().default("medium") }).parse(raw))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("media_library")
      .select("arquivo, arquivo_medium, arquivo_thumbnail")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const path =
      data.variant === "original"
        ? row.arquivo
        : data.variant === "thumbnail"
        ? row.arquivo_thumbnail || row.arquivo
        : row.arquivo_medium || row.arquivo;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage.from("site").createSignedUrl(path, SIGN_TTL);
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
