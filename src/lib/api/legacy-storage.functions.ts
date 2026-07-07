// M3.3 — Legacy File Migration
//
// Ferramentas server-authoritative para inventariar e migrar (em lotes,
// dry-run por padrão) arquivos legados de Storage e referências legadas
// para o padrão consolidado em M3.2 (`{tenantId}/{domain}/{file}` no bucket
// permitido, com bucket/path/filename decididos pelo servidor).
//
// Restrições obrigatórias (Constitution, IA-004, M3.2, M3.4):
//   - Somente super_admin pode inventariar/migrar. RLS já aplica em
//     `storage_migration_log`, mas a fn também nega antes de qualquer I/O.
//   - Nenhum arquivo é apagado. O modelo é copy-then-update-then-log; a
//     limpeza física do path antigo fica para uma etapa futura autorizada.
//   - Toda operação é idempotente e escrita em `storage_migration_log`,
//     que é a única fonte de rollback.
//   - `dry_run = true` (default) apenas simula: nada é copiado, nenhuma
//     linha de negócio é atualizada, mas o inventário e o plano são
//     persistidos com `status='dry_run'` para revisão.
//   - Buckets, policies, Signed URLs, Media Picker e o pipeline de upload
//     (M3.2) permanecem intocados por esta camada.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertSuperAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super_admin only");
}

function classifyPath(bucket: string, tenantId: string, path: string) {
  if (!path) return { classification: "invalid" as const, reason: "empty path" };
  if (path.includes("..") || path.startsWith("/") || path.includes("\\"))
    return { classification: "invalid" as const, reason: "path traversal" };
  const first = path.split("/")[0] ?? "";
  if (first === tenantId) return { classification: "compliant" as const };
  if (TENANT_UUID_RE.test(first))
    return {
      classification: "cross_tenant" as const,
      reason: "path prefixado com outro tenant",
    };
  return {
    classification: "legacy_no_prefix" as const,
    reason: "path sem prefixo tenant",
  };
}

/**
 * Inventário completo do estado atual de Storage vs metadata. Analítico —
 * nunca move nem escreve nada em Storage. Persiste snapshot em
 * `storage_migration_log` com `status='dry_run'` e `action='orphan-classify'
 * | 'inconsistency' | 'noop'` para servir de baseline auditável.
 */
export const inventariarLegacyStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z
      .object({ persistSnapshot: z.boolean().optional().default(false) })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tenantRow, error: tenantErr } = await context.supabase.rpc(
      "get_current_tenant_id",
    );
    if (tenantErr) throw new Error(tenantErr.message);
    const tenantId = tenantRow as string | null;
    if (!tenantId)
      throw new Error(
        "Tenant efetivo não resolvido — inventário requer impersonation via x-tenant-id.",
      );

    // 1. Storage objects reais por bucket.
    const buckets = ["site", "imoveis", "lancamentos"] as const;
    const storageIndex: Record<string, Set<string>> = {};
    for (const b of buckets) {
      storageIndex[b] = new Set<string>();
      // Paginate defensively (Storage list caps at 100/req).
      let offset = 0;
      // Only inspect this tenant's prefix — RLS-equivalent posture.
      for (;;) {
        const { data: page, error } = await supabaseAdmin.storage
          .from(b)
          .list(tenantId, { limit: 1000, offset });
        if (error) break;
        if (!page || page.length === 0) break;
        for (const o of page) storageIndex[b].add(`${tenantId}/${o.name}`);
        if (page.length < 1000) break;
        offset += page.length;
      }
      // Best-effort recursion for known sub-prefixes.
      for (const sub of ["blog", "blog/inline", "corretores", "media"]) {
        let o2 = 0;
        for (;;) {
          const { data: page, error } = await supabaseAdmin.storage
            .from(b)
            .list(`${tenantId}/${sub}`, { limit: 1000, offset: o2 });
          if (error) break;
          if (!page || page.length === 0) break;
          for (const o of page)
            storageIndex[b].add(`${tenantId}/${sub}/${o.name}`);
          if (page.length < 1000) break;
          o2 += page.length;
        }
      }
    }

    // 2. Referências vindas do banco.
    type Ref = {
      entity: string;
      entity_id: string;
      bucket: string;
      path: string | null;
      raw_value: string | null;
    };
    const refs: Ref[] = [];

    const pushIfPath = (r: Ref) => refs.push(r);

    const { data: blogs } = await supabaseAdmin
      .from("blog_posts")
      .select("id, imagem_capa, tenant_id")
      .eq("tenant_id", tenantId);
    for (const b of blogs ?? [])
      pushIfPath({
        entity: "blog_posts.imagem_capa",
        entity_id: b.id,
        bucket: "site",
        path: b.imagem_capa,
        raw_value: b.imagem_capa,
      });

    const { data: corretores } = await supabaseAdmin
      .from("corretores")
      .select("id, foto_url, tenant_id")
      .eq("tenant_id", tenantId);
    for (const c of corretores ?? [])
      pushIfPath({
        entity: "corretores.foto_url",
        entity_id: c.id,
        bucket: "site",
        path: c.foto_url,
        raw_value: c.foto_url,
      });

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("key, value, tenant_id")
      .eq("tenant_id", tenantId);
    for (const s of settings ?? []) {
      const v = s.value as Record<string, unknown> | null;
      const image = v && typeof v["image_path"] === "string" ? (v["image_path"] as string) : null;
      if (image)
        pushIfPath({
          entity: `site_settings.${s.key}.image_path`,
          entity_id: s.key,
          bucket: "site",
          path: image,
          raw_value: image,
        });
      const logo = v && typeof v["logo_path"] === "string" ? (v["logo_path"] as string) : null;
      if (logo)
        pushIfPath({
          entity: `site_settings.${s.key}.logo_path`,
          entity_id: s.key,
          bucket: "site",
          path: logo,
          raw_value: logo,
        });
    }

    const { data: imgs } = await supabaseAdmin
      .from("imovel_imagens")
      .select("id, url, imovel_id");
    for (const i of imgs ?? [])
      pushIfPath({
        entity: "imovel_imagens.url",
        entity_id: i.id,
        bucket: "imoveis",
        path: i.url,
        raw_value: i.url,
      });

    const { data: lps } = await supabaseAdmin
      .from("launch_project_imagens")
      .select("id, storage_path");
    for (const i of lps ?? [])
      pushIfPath({
        entity: "launch_project_imagens.storage_path",
        entity_id: i.id,
        bucket: "lancamentos",
        path: i.storage_path,
        raw_value: i.storage_path,
      });

    const { data: lpj } = await supabaseAdmin
      .from("launch_projects")
      .select("id, imagem_capa, tenant_id")
      .eq("tenant_id", tenantId);
    for (const i of lpj ?? [])
      pushIfPath({
        entity: "launch_projects.imagem_capa",
        entity_id: i.id,
        bucket: "lancamentos",
        path: i.imagem_capa,
        raw_value: i.imagem_capa,
      });

    const { data: pdfs } = await supabaseAdmin
      .from("launch_pdfs")
      .select("id, storage_path");
    for (const i of pdfs ?? [])
      pushIfPath({
        entity: "launch_pdfs.storage_path",
        entity_id: i.id,
        bucket: "lancamentos",
        path: i.storage_path,
        raw_value: i.storage_path,
      });

    // 3. Classificar cada referência.
    type Row = {
      entity: string;
      entity_id: string;
      bucket: string;
      raw_value: string | null;
      classification: string;
      reason?: string;
      exists_in_storage?: boolean;
    };
    const classified: Row[] = [];
    for (const r of refs) {
      if (!r.path) continue;
      const isAbsoluteUrl = /^https?:\/\//i.test(r.path);
      if (isAbsoluteUrl) {
        classified.push({
          entity: r.entity,
          entity_id: r.entity_id,
          bucket: r.bucket,
          raw_value: r.raw_value,
          classification: "legacy_absolute_url",
          reason: "coluna guarda URL absoluta com token; padrão M3.2 exige path relativo",
        });
        continue;
      }
      const c = classifyPath(r.bucket, tenantId, r.path);
      const exists = storageIndex[r.bucket]?.has(r.path) ?? false;
      classified.push({
        entity: r.entity,
        entity_id: r.entity_id,
        bucket: r.bucket,
        raw_value: r.raw_value,
        classification: c.classification,
        reason: c.classification === "compliant" ? undefined : c.reason,
        exists_in_storage: exists,
      });
    }

    // 4. Órfãos — objetos físicos sem referência em banco.
    const referencedPaths = new Set(
      classified
        .filter((c) => c.classification === "compliant" && c.raw_value)
        .map((c) => `${c.bucket}::${c.raw_value}`),
    );
    const orphans: { bucket: string; path: string }[] = [];
    for (const b of buckets) {
      for (const p of storageIndex[b] ?? []) {
        if (!referencedPaths.has(`${b}::${p}`)) orphans.push({ bucket: b, path: p });
      }
    }

    // 5. Métricas.
    const metrics = {
      tenantId,
      total_storage_objects: buckets.reduce(
        (acc, b) => acc + (storageIndex[b]?.size ?? 0),
        0,
      ),
      total_db_references: classified.length,
      by_classification: classified.reduce<Record<string, number>>((acc, r) => {
        acc[r.classification] = (acc[r.classification] ?? 0) + 1;
        return acc;
      }, {}),
      orphans_count: orphans.length,
    };

    // 6. Persistência opcional do snapshot (audit trail).
    if (data.persistSnapshot) {
      const batchId = crypto.randomUUID();
      const rows = [
        ...classified.map((r) => ({
          batch_id: batchId,
          tenant_id: tenantId,
          entity: r.entity,
          entity_id: r.entity_id,
          bucket: r.bucket,
          old_path: r.raw_value,
          new_path: r.raw_value ?? "",
          action:
            r.classification === "compliant"
              ? "noop"
              : "inconsistency",
          status: "dry_run",
          dry_run: true,
          operator_id: context.userId,
          metadata: {
            classification: r.classification,
            reason: r.reason ?? null,
            exists_in_storage: r.exists_in_storage ?? null,
          },
        })),
        ...orphans.map((o) => ({
          batch_id: batchId,
          tenant_id: tenantId,
          entity: "storage.orphan",
          entity_id: o.path,
          bucket: o.bucket,
          old_path: o.path,
          new_path: o.path,
          action: "orphan-classify",
          status: "dry_run",
          dry_run: true,
          operator_id: context.userId,
          metadata: { classification: "orphan" },
        })),
      ];
      if (rows.length > 0) {
        const { error: insErr } = await context.supabase
          .from("storage_migration_log")
          .insert(rows);
        if (insErr) throw new Error(insErr.message);
      }
      return { metrics, classified, orphans, batchId };
    }

    return { metrics, classified, orphans, batchId: null };
  });

/**
 * Rollback documental — marca linhas de um batch como `rolled_back`.
 * Não tenta reverter cópia física; a M3.3 nunca apaga a origem, portanto
 * o rollback consiste em restaurar a referência da coluna alvo ao
 * `old_path` (feito pelo operador em migração corretiva dedicada).
 */
export const marcarRollbackLote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) =>
    z.object({ batchId: z.string().uuid(), reason: z.string().min(1) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("storage_migration_log")
      .update({ status: "rolled_back", error_message: data.reason })
      .eq("batch_id", data.batchId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
