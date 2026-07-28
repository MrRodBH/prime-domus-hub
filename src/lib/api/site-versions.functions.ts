import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { hydrateSiteSettings, type SiteSettings } from "./site.functions";

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
  /** JSON serializado — parse no cliente com JSON.parse(row.value_json). */
  value_json: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

function moduleForKey(key: z.infer<typeof KEY_ENUM>) {
  return key === "branding" || key === "branding_v2"
    ? "cms.branding" as const
    : "cms.configuracoes" as const;
}

/** Salva/atualiza um rascunho por (tenant, key). */
export const salvarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    key: KEY_ENUM,
    value: z.record(z.string(), z.unknown()),
    notes: z.string().optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      moduleForKey(data.key),
      "editar",
    );
    const { supabase, userId } = context;
    const { error: deleteError } = await supabase
      .from("site_settings_versions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("key", data.key)
      .eq("status", "draft");
    if (deleteError) throw new Error(deleteError.message);

    const { data: row, error } = await supabase
      .from("site_settings_versions")
      .insert({
        tenant_id: tenantId,
        key: data.key,
        value: data.value as never,
        status: "draft",
        notes: data.notes ?? null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "site_settings_versions", `cms.rascunho.salvar:${data.key}`, row.id as string, null, data.value);
    return { ok: true, id: row.id };
  });

export const descartarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "editar",
    );
    const { error } = await context.supabase
      .from("site_settings_versions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("key", data.key)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "site_settings_versions", `cms.rascunho.descartar:${data.key}`, data.key, null, null);
    return { ok: true };
  });

/** Publica o rascunho pendente da chave no mesmo tenant. */
export const publicarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "publicar",
    );
    const { supabase, userId } = context;
    const { data: draft, error: eDraft } = await supabase
      .from("site_settings_versions")
      .select("id, value")
      .eq("tenant_id", tenantId)
      .eq("key", data.key)
      .eq("status", "draft")
      .maybeSingle();
    if (eDraft) throw new Error(eDraft.message);
    if (!draft) throw new Error("Nenhum rascunho pendente para publicar.");

    const { error: eUp } = await supabase
      .from("site_settings")
      .upsert({
        tenant_id: tenantId,
        key: data.key,
        value: draft.value as never,
        updated_by: userId,
      });
    if (eUp) throw new Error(eUp.message);

    const { error: historyError } = await supabase
      .from("site_settings_versions")
      .insert({
        tenant_id: tenantId,
        key: data.key,
        value: draft.value as never,
        status: "published",
        created_by: userId,
        published_at: new Date().toISOString(),
      });
    if (historyError) throw new Error(historyError.message);

    const { error: deleteError } = await supabase
      .from("site_settings_versions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", draft.id);
    if (deleteError) throw new Error(deleteError.message);

    await logCmsAudit(context, "site_settings_versions", `cms.rascunho.publicar:${data.key}`, draft.id as string, null, draft.value);
    return { ok: true };
  });

/** Restaura uma versão antiga do mesmo tenant para um novo rascunho. */
export const restaurarVersao = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "publicar",
    );
    const { supabase, userId } = context;
    const { data: ver, error } = await supabase
      .from("site_settings_versions")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ver) throw new Error("Versão não encontrada");

    const { error: deleteError } = await supabase
      .from("site_settings_versions")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("key", ver.key)
      .eq("status", "draft");
    if (deleteError) throw new Error(deleteError.message);

    const { error: eIns } = await supabase
      .from("site_settings_versions")
      .insert({
        tenant_id: tenantId,
        key: ver.key,
        value: ver.value as never,
        status: "draft",
        notes: `Restaurado da versão ${data.id.slice(0, 8)}`,
        created_by: userId,
      });
    if (eIns) throw new Error(eIns.message);
    await logCmsAudit(context, "site_settings_versions", `cms.versao.restaurar:${ver.key}`, data.id, null, ver.value);
    return { ok: true, key: ver.key };
  });

/** Lista o histórico da chave no tenant atual. */
export const listarVersoes = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: KEY_ENUM }))
  .handler(async ({ data, context }): Promise<SiteVersionRow[]> => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "visualizar",
    );
    const { data: rows, error } = await context.supabase
      .from("site_settings_versions")
      .select("id, key, status, value, notes, created_by, created_at, published_at")
      .eq("tenant_id", tenantId)
      .eq("key", data.key)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      key: r.key,
      status: r.status as SiteVersionRow["status"],
      value_json: JSON.stringify(r.value ?? {}),
      notes: r.notes,
      created_by: r.created_by,
      created_at: r.created_at,
      published_at: r.published_at,
    }));
  });

/** Lista rascunhos pendentes do tenant atual. */
export const listarRascunhosPendentes = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<{ key: string; created_at: string }[]> => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "visualizar",
    );
    const { data, error } = await context.supabase
      .from("site_settings_versions")
      .select("key, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "draft")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Preview tenant-scoped com rascunhos sobrepostos ao conteúdo publicado. */
export const obterSiteSettingsPreview = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<SiteSettings> => {
    const { assertCmsTenantPermission } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "visualizar",
    );
    const { supabase } = context;
    const [pub, drafts] = await Promise.all([
      supabase
        .from("site_settings")
        .select("key, value")
        .eq("tenant_id", tenantId),
      supabase
        .from("site_settings_versions")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .eq("status", "draft"),
    ]);
    if (pub.error) throw new Error(pub.error.message);
    if (drafts.error) throw new Error(drafts.error.message);
    const map = new Map<string, unknown>();
    for (const r of pub.data ?? []) map.set(r.key, r.value);
    for (const r of drafts.data ?? []) map.set(r.key, r.value);
    const merged = Array.from(map, ([key, value]) => ({ key, value }));
    return hydrateSiteSettings(merged);
  });

/** Publica todos os rascunhos pendentes do tenant atual. */
export const publicarTodosRascunhos = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const { assertCmsTenantPermission, logCmsAudit } = await import("./_cms");
    const tenantId = await assertCmsTenantPermission(
      context,
      "cms.versoes",
      "publicar",
    );
    const { supabase, userId } = context;
    const { data: drafts, error } = await supabase
      .from("site_settings_versions")
      .select("id, key, value")
      .eq("tenant_id", tenantId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    const list = drafts ?? [];

    for (const d of list) {
      const { error: eUp } = await supabase
        .from("site_settings")
        .upsert({
          tenant_id: tenantId,
          key: d.key,
          value: d.value as never,
          updated_by: userId,
        });
      if (eUp) throw new Error(eUp.message);

      const { error: historyError } = await supabase
        .from("site_settings_versions")
        .insert({
          tenant_id: tenantId,
          key: d.key,
          value: d.value as never,
          status: "published",
          created_by: userId,
          published_at: new Date().toISOString(),
        });
      if (historyError) throw new Error(historyError.message);

      const { error: deleteError } = await supabase
        .from("site_settings_versions")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", d.id);
      if (deleteError) throw new Error(deleteError.message);
    }

    await logCmsAudit(
      context,
      "site_settings_versions",
      "cms.rascunho.publicar-todos",
      "bulk",
      null,
      { count: list.length, keys: list.map((d) => d.key) },
    );
    return { ok: true, count: list.length };
  });