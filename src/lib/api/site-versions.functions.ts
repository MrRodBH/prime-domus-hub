import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KEY_ENUM = z.enum([
  "branding",
  "branding_v2",
  "empresa",
  "footer",
  "seo_global",
  "home_hero",
  "home_secoes",
  "contato",
  "pagina_lancamentos",
  "home_diferenciais",
  "home_depoimentos",
  "pagina_sobre",
  "pagina_contato",
  "pagina_anuncie",
]);

export interface SiteVersionRow {
  id: string;
  key: string;
  status: "draft" | "published" | "archived";
  value: unknown;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

/** Salva/atualiza um rascunho (upsert por (tenant, key) — só existe 1 draft por chave). */
export const salvarRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    key: KEY_ENUM,
    value: z.record(z.string(), z.unknown()),
    notes: z.string().optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // remove drafts existentes desta chave e insere o novo
    await supabase
      .from("site_settings_versions")
      .delete()
      .eq("key", data.key)
      .eq("status", "draft");
    const { data: row, error } = await supabase
      .from("site_settings_versions")
      .insert({
        key: data.key,
        value: data.value as never,
        status: "draft",
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

/** Descarta o rascunho pendente da chave. */
export const descartarRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("site_settings_versions")
      .delete()
      .eq("key", data.key)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Publica o rascunho pendente da chave → grava em site_settings + arquiva histórico. */
export const publicarRascunho = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: draft, error: eDraft } = await supabase
      .from("site_settings_versions")
      .select("id, value")
      .eq("key", data.key)
      .eq("status", "draft")
      .maybeSingle();
    if (eDraft) throw new Error(eDraft.message);
    if (!draft) throw new Error("Nenhum rascunho pendente para publicar.");
    // grava em site_settings (published)
    const { error: eUp } = await supabase
      .from("site_settings")
      .upsert({ key: data.key, value: draft.value as never, updated_by: userId });
    if (eUp) throw new Error(eUp.message);
    // marca o draft como published e apaga registro de draft
    await supabase
      .from("site_settings_versions")
      .insert({
        key: data.key,
        value: draft.value as never,
        status: "published",
        created_by: userId,
        published_at: new Date().toISOString(),
      });
    await supabase.from("site_settings_versions").delete().eq("id", draft.id);
    return { ok: true };
  });

/** Restaura uma versão antiga → cria um novo rascunho com o valor dela. */
export const restaurarVersao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ver, error } = await supabase
      .from("site_settings_versions")
      .select("key, value")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    // troca o draft atual da chave pelo valor restaurado
    await supabase
      .from("site_settings_versions")
      .delete()
      .eq("key", ver.key)
      .eq("status", "draft");
    const { error: eIns } = await supabase
      .from("site_settings_versions")
      .insert({
        key: ver.key,
        value: ver.value as never,
        status: "draft",
        notes: `Restaurado da versão ${data.id.slice(0, 8)}`,
        created_by: userId,
      });
    if (eIns) throw new Error(eIns.message);
    return { ok: true, key: ver.key };
  });

/** Lista o histórico de uma chave (mais recente primeiro) — limita 30. */
export const listarVersoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }): Promise<SiteVersionRow[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("site_settings_versions")
      .select("id, key, status, value, notes, created_by, created_at, published_at")
      .eq("key", data.key)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SiteVersionRow[];
  });

/** Lista rascunhos pendentes (todas as chaves) — para o badge global. */
export const listarRascunhosPendentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ key: string; created_at: string }[]> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("site_settings_versions")
      .select("key, created_at")
      .eq("status", "draft")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
