import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCmsOperation,
  safeTenantCmsError,
} from "@/lib/api/tenant-cms-authority.server";

const BUNDLE_VERSION = "cms-bundle/2.0" as const;
const ENTITIES = ["pages", "forms", "campaigns", "menu", "settings", "media"] as const;
type Entity = (typeof ENTITIES)[number];

type CmsExportBundle = {
  version: typeof BUNDLE_VERSION;
  exported_at: string;
  tenant_id: string;
  tenant_authority: "server_context_only";
  entities: Record<string, Json[]>;
};

const entityTable: Record<Entity, string[]> = {
  pages: ["cms_pages"],
  forms: ["cms_forms", "cms_form_fields"],
  campaigns: ["cms_campaigns"],
  menu: ["website_menu_items"],
  settings: ["site_settings"],
  media: ["media_library"],
};

async function authorizeTransfer(
  context: Parameters<typeof authorizeTenantCmsOperation>[0],
  operation: "read" | "write",
) {
  return authorizeTenantCmsOperation(
    context,
    "cms.configuracoes",
    operation === "read" ? "diagnostics" : "save_draft",
  );
}

const exportSchema = z.object({
  entities: z.array(z.enum(ENTITIES)).max(ENTITIES.length).optional(),
}).strict().optional();

/**
 * Read-only deterministic export. Every table read is tenant-filtered and the
 * bundle tenant id is documentary metadata, never an import authority.
 */
export const exportarCms = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => exportSchema.parse(input))
  .handler(async ({ context, data }): Promise<CmsExportBundle> => {
    const authorization = await authorizeTransfer(context, "read");
    const wanted = new Set<Entity>((data?.entities ?? ENTITIES) as Entity[]);
    const entities: Record<string, Json[]> = {};

    for (const entity of wanted) {
      for (const table of entityTable[entity]) {
        const key = table === "cms_form_fields" ? "form_fields" : entity;
        const { data: rows, error } = await (context.supabase as any)
          .from(table)
          .select("*")
          .eq("tenant_id", authorization.tenantId);
        if (error) throw safeTenantCmsError(error);
        const serialized = JSON.stringify(rows ?? []);
        entities[key] = JSON.parse(serialized) as Json[];
      }
    }

    return {
      version: BUNDLE_VERSION,
      exported_at: new Date().toISOString(),
      tenant_id: authorization.tenantId,
      tenant_authority: "server_context_only",
      entities,
    };
  });

const importSchema = z.object({
  bundle: z.record(z.string(), z.unknown()),
  mode: z.enum(["merge", "replace"]).default("merge"),
  entities: z.array(z.enum(ENTITIES)).max(ENTITIES.length).optional(),
}).strict();

/**
 * The historical application-layer importer performed partial multi-table
 * mutation and destructive replacement loops. It is retired fail-closed until
 * a single transactional SQL primitive with closed validation is materialized.
 */
export const importarCms = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => importSchema.parse(input))
  .handler(async ({ context }): Promise<{ ok: true }> => {
    await authorizeTransfer(context, "write");
    throw new Error("cms_transfer_import_retired_transactional_primitive_required");
  });

export const listarSnapshots = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<Json[]> => {
    const authorization = await authorizeTransfer(context, "read");
    const { data, error } = await (context.supabase as any)
      .from("cms_import_snapshots")
      .select("id, motivo, modo, escopo, contagem, created_by, created_at, restored_at, restored_by")
      .eq("tenant_id", authorization.tenantId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw safeTenantCmsError(error);
    return JSON.parse(JSON.stringify(data ?? [])) as Json[];
  });

export const restaurarSnapshot = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ context }): Promise<{ ok: true }> => {
    await authorizeTransfer(context, "write");
    throw new Error("cms_snapshot_restore_retired_transactional_primitive_required");
  });
