import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logCmsAudit } from "./_cms";

/**
 * Fase 4C — Exportação e Importação CMS.
 * - export: gera um bundle JSON com o conteúdo CMS do tenant atual.
 * - import: modo "merge" (padrão) faz upsert por chave natural (nunca apaga);
 *   modo "replace" apaga o escopo e reinsere a partir do bundle, criando
 *   automaticamente um snapshot para rollback.
 * - snapshots: listar e restaurar backups gerados por importações "replace".
 *
 * Escopo suportado: pages, forms (+fields), campaigns, menu, settings, media (metadados).
 * Arquivos binários não são copiados — apenas o registro em media_library.
 */

const BUNDLE_VERSION = "cms-bundle/1.0";

const ENTITIES = ["pages", "forms", "campaigns", "menu", "settings", "media"] as const;
type Entity = (typeof ENTITIES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (!data) {
    const { data: sup } = await ctx.supabase.rpc("is_super_admin");
    if (!sup) throw new Error("Acesso negado: requer administrador.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function currentTenantId(ctx: any): Promise<string> {
  const { data, error } = await ctx.supabase.rpc("get_current_tenant_id");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Tenant atual não pôde ser identificado.");
  return data as string;
}

const exportSchema = z.object({
  entities: z.array(z.enum(ENTITIES)).optional(),
}).optional();

export const exportarCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(exportSchema)
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const wanted = new Set<Entity>((data?.entities ?? ENTITIES) as Entity[]);
    const tenantId = await currentTenantId(context);

    const bundle: Record<string, unknown> = {
      version: BUNDLE_VERSION,
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      entities: {},
    };
    const entities = bundle.entities as Record<string, unknown[]>;

    if (wanted.has("pages")) {
      const { data: rows, error } = await (context.supabase as any).from("cms_pages").select("*");
      if (error) throw new Error(error.message);
      entities.pages = rows ?? [];
    }
    if (wanted.has("forms")) {
      const { data: rows, error } = await (context.supabase as any).from("cms_forms").select("*");
      if (error) throw new Error(error.message);
      const { data: fields, error: e2 } = await (context.supabase as any).from("cms_form_fields").select("*");
      if (e2) throw new Error(e2.message);
      entities.forms = rows ?? [];
      entities.form_fields = fields ?? [];
    }
    if (wanted.has("campaigns")) {
      const { data: rows, error } = await (context.supabase as any).from("cms_campaigns").select("*");
      if (error) throw new Error(error.message);
      entities.campaigns = rows ?? [];
    }
    if (wanted.has("menu")) {
      const { data: rows, error } = await (context.supabase as any).from("website_menu_items").select("*");
      if (error) throw new Error(error.message);
      entities.menu = rows ?? [];
    }
    if (wanted.has("settings")) {
      const { data: rows, error } = await (context.supabase as any).from("site_settings").select("*");
      if (error) throw new Error(error.message);
      entities.settings = rows ?? [];
    }
    if (wanted.has("media")) {
      const { data: rows, error } = await (context.supabase as any).from("media_library").select("*");
      if (error) throw new Error(error.message);
      entities.media = rows ?? [];
    }

    await logCmsAudit(
      context, "cms_bundle", "cms.export",
      tenantId, null,
      { entities: [...wanted], sizes: Object.fromEntries(Object.entries(entities).map(([k, v]) => [k, (v as unknown[]).length])) },
    );
    return bundle;
  });

// ============ IMPORT ============

const importSchema = z.object({
  bundle: z.record(z.string(), z.unknown()),
  mode: z.enum(["merge", "replace"]).default("merge"),
  entities: z.array(z.enum(ENTITIES)).optional(),
});

// Colunas que não devem ser importadas (herdadas do tenant/usuário/timestamps)
const STRIP = new Set(["tenant_id", "created_by", "updated_by", "created_at", "updated_at"]);

function clean<T extends Record<string, unknown>>(row: T, tenantId: string, userId: string) {
  const out: Record<string, unknown> = { tenant_id: tenantId, created_by: userId, updated_by: userId };
  for (const [k, v] of Object.entries(row)) {
    if (STRIP.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export const importarCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(importSchema)
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const tenantId = await currentTenantId(context);
    const bundle = data.bundle as Record<string, unknown>;
    if (bundle.version !== BUNDLE_VERSION) {
      throw new Error(`Bundle incompatível (versão ${String(bundle.version)}).`);
    }
    const src = (bundle.entities ?? {}) as Record<string, unknown[]>;
    const wanted = new Set<Entity>((data.entities ?? ENTITIES) as Entity[]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Snapshot ANTES em modo replace (rollback point)
    let snapshotId: string | null = null;
    if (data.mode === "replace") {
      // Captura o estado atual das entidades no escopo
      const snap: Record<string, unknown[]> = {};
      const capture = async (table: string, key: string) => {
        const { data: rows, error } = await (supabaseAdmin as any).from(table).select("*").eq("tenant_id", tenantId);
        if (error) throw new Error(`Snapshot ${table}: ${error.message}`);
        snap[key] = rows ?? [];
      };
      if (wanted.has("pages")) await capture("cms_pages", "pages");
      if (wanted.has("forms")) { await capture("cms_forms", "forms"); await capture("cms_form_fields", "form_fields"); }
      if (wanted.has("campaigns")) await capture("cms_campaigns", "campaigns");
      if (wanted.has("menu")) await capture("website_menu_items", "menu");
      if (wanted.has("settings")) await capture("site_settings", "settings");
      if (wanted.has("media")) await capture("media_library", "media");

      const snapPayload = { version: BUNDLE_VERSION, exported_at: new Date().toISOString(), tenant_id: tenantId, entities: snap };
      const { data: ins, error: se } = await (supabaseAdmin as any).from("cms_import_snapshots").insert({
        tenant_id: tenantId,
        motivo: "pre_replace_import",
        modo: "replace",
        escopo: [...wanted],
        payload: snapPayload,
        contagem: Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length])),
        created_by: context.userId,
      }).select("id").single();
      if (se) throw new Error(`Falha ao gravar snapshot: ${se.message}`);
      snapshotId = ins.id as string;
    }

    const counts: Record<string, { inserted: number; updated: number; deleted: number }> = {};
    const bump = (k: string, field: "inserted" | "updated" | "deleted", n = 1) => {
      counts[k] ??= { inserted: 0, updated: 0, deleted: 0 };
      counts[k][field] += n;
    };

    // ------ REPLACE: deletar escopo atual ------
    if (data.mode === "replace") {
      const delTable = async (table: string, key: string) => {
        const { count, error } = await (supabaseAdmin as any).from(table).delete({ count: "exact" }).eq("tenant_id", tenantId);
        if (error) throw new Error(`Delete ${table}: ${error.message}`);
        bump(key, "deleted", count ?? 0);
      };
      if (wanted.has("pages")) await delTable("cms_pages", "pages");
      if (wanted.has("forms")) await delTable("cms_forms", "forms"); // cascata em cms_form_fields
      if (wanted.has("campaigns")) await delTable("cms_campaigns", "campaigns");
      if (wanted.has("menu")) await delTable("website_menu_items", "menu");
      if (wanted.has("settings")) {
        const { count, error } = await (supabaseAdmin as any).from("site_settings").delete({ count: "exact" }).eq("tenant_id", tenantId);
        if (error) throw new Error(`Delete site_settings: ${error.message}`);
        bump("settings", "deleted", count ?? 0);
      }
      if (wanted.has("media")) await delTable("media_library", "media");
    }

    // ------ INSERIR / UPSERT ------
    // pages: upsert por (tenant_id, slug)
    if (wanted.has("pages") && Array.isArray(src.pages)) {
      for (const raw of src.pages as Record<string, unknown>[]) {
        const row = clean(raw, tenantId, context.userId);
        const { error, data: r } = await (supabaseAdmin as any).from("cms_pages")
          .upsert(row, { onConflict: "tenant_id,slug" }).select("id, xmax::text as x").single();
        if (error) throw new Error(`pages/${raw.slug}: ${error.message}`);
        // xmax = 0 quando é INSERT
        bump("pages", (r as { x?: string })?.x === "0" ? "inserted" : "updated");
      }
    }

    // forms + fields: upsert forms por (tenant_id, slug); mapear IDs; upsert fields por (form_id, nome)
    if (wanted.has("forms")) {
      const idMap = new Map<string, string>();
      if (Array.isArray(src.forms)) {
        for (const raw of src.forms as Record<string, unknown>[]) {
          const oldId = raw.id as string;
          const row = clean(raw, tenantId, context.userId);
          delete row.id;
          const { data: r, error } = await (supabaseAdmin as any).from("cms_forms")
            .upsert({ ...row }, { onConflict: "tenant_id,slug" })
            .select("id").single();
          if (error) throw new Error(`forms/${raw.slug}: ${error.message}`);
          idMap.set(oldId, r.id as string);
          bump("forms", "inserted");
        }
      }
      if (Array.isArray(src.form_fields)) {
        for (const raw of src.form_fields as Record<string, unknown>[]) {
          const newFormId = idMap.get(raw.form_id as string);
          if (!newFormId) continue; // form pai não veio no bundle
          const row = clean(raw, tenantId, context.userId);
          delete row.id;
          row.form_id = newFormId;
          const { error } = await (supabaseAdmin as any).from("cms_form_fields")
            .upsert({ ...row }, { onConflict: "form_id,nome" });
          if (error) throw new Error(`form_fields/${raw.nome}: ${error.message}`);
          bump("form_fields", "inserted");
        }
      }
    }

    // campaigns: upsert por id (não há unique de nome). No mode=replace já limpamos; no merge é preciso match por id novo.
    if (wanted.has("campaigns") && Array.isArray(src.campaigns)) {
      for (const raw of src.campaigns as Record<string, unknown>[]) {
        const row = clean(raw, tenantId, context.userId);
        const { error } = await (supabaseAdmin as any).from("cms_campaigns").upsert(row, { onConflict: "id" });
        if (error) throw new Error(`campaigns/${raw.nome}: ${error.message}`);
        bump("campaigns", "inserted");
      }
    }

    // menu: sem unique natural — no merge, apenas insere; no replace já foi limpo.
    if (wanted.has("menu") && Array.isArray(src.menu)) {
      // Reprocessa parent_id: mantém apenas se o pai também vier no bundle e for reinserido.
      const idMap = new Map<string, string>();
      const items = src.menu as Record<string, unknown>[];
      // 1ª passada: itens sem parent
      for (const raw of items.filter((i) => !i.parent_id)) {
        const row = clean(raw, tenantId, context.userId);
        const oldId = row.id as string; delete row.id;
        const { data: r, error } = await (supabaseAdmin as any).from("website_menu_items").insert(row).select("id").single();
        if (error) throw new Error(`menu/${raw.label}: ${error.message}`);
        idMap.set(oldId, r.id as string);
        bump("menu", "inserted");
      }
      // 2ª passada: filhos
      for (const raw of items.filter((i) => i.parent_id)) {
        const row = clean(raw, tenantId, context.userId);
        const oldId = row.id as string; delete row.id;
        row.parent_id = idMap.get(row.parent_id as string) ?? null;
        const { error } = await (supabaseAdmin as any).from("website_menu_items").insert(row);
        if (error) throw new Error(`menu/${raw.label}: ${error.message}`);
        bump("menu", "inserted");
      }
    }

    // settings: upsert por key (PK global)
    if (wanted.has("settings") && Array.isArray(src.settings)) {
      for (const raw of src.settings as Record<string, unknown>[]) {
        const row = { key: raw.key, value: raw.value, tenant_id: tenantId, updated_by: context.userId };
        const { error } = await (supabaseAdmin as any).from("site_settings").upsert(row, { onConflict: "key" });
        if (error) throw new Error(`settings/${String(raw.key)}: ${error.message}`);
        bump("settings", "inserted");
      }
    }

    // media: upsert por (tenant_id, arquivo)
    if (wanted.has("media") && Array.isArray(src.media)) {
      for (const raw of src.media as Record<string, unknown>[]) {
        const row = clean(raw, tenantId, context.userId);
        delete row.id;
        const { error } = await (supabaseAdmin as any).from("media_library")
          .upsert({ ...row }, { onConflict: "tenant_id,arquivo" }).single();
        // media_library não tem unique(tenant_id, arquivo) por padrão → fallback: insert simples
        if (error) {
          const { error: e2 } = await (supabaseAdmin as any).from("media_library").insert(row);
          if (e2) throw new Error(`media/${raw.nome}: ${e2.message}`);
        }
        bump("media", "inserted");
      }
    }

    await logCmsAudit(
      context, "cms_bundle", `cms.import.${data.mode}`,
      snapshotId ?? tenantId, null,
      { mode: data.mode, entities: [...wanted], counts, snapshot_id: snapshotId },
    );
    return { ok: true, counts, snapshot_id: snapshotId };
  });

// ============ SNAPSHOTS ============

export const listarSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await (context.supabase as any).from("cms_import_snapshots")
      .select("id, motivo, modo, escopo, contagem, created_by, created_at, restored_at, restored_by")
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const restaurarSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const tenantId = await currentTenantId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: snap, error } = await (supabaseAdmin as any).from("cms_import_snapshots")
      .select("*").eq("id", data.id).eq("tenant_id", tenantId).single();
    if (error || !snap) throw new Error("Snapshot não encontrado.");

    // Executa como um import em modo replace, usando o payload do snapshot.
    // Cria também um snapshot do estado atual antes de sobrescrever.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (importarCms as any)({
      data: {
        bundle: snap.payload,
        mode: "replace",
        entities: snap.escopo,
      },
    });

    await (supabaseAdmin as any).from("cms_import_snapshots")
      .update({ restored_at: new Date().toISOString(), restored_by: context.userId })
      .eq("id", data.id);

    await logCmsAudit(context, "cms_import_snapshots", "cms.snapshot.restaurar",
      data.id, null, { counts: result?.counts });

    return { ok: true, counts: result?.counts };
  });
