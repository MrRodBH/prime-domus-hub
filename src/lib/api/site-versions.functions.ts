import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantConfigurationOperation,
  loadTenantConfigurationState,
} from "@/lib/api/tenant-configuration-authority.server";
import { projectConfigurationToSiteSettings, type SiteSettings } from "./site.functions";

const legacyKeySchema = z.string().min(1).max(120);
const trusted = (context: any) => ({ userId: context.userId as string, tenant: context.tenant });

export interface SiteVersionRow {
  id: string;
  key: string;
  status: "draft" | "published" | "archived";
  value_json: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  published_at: string | null;
}

function retiredMutation<T>(): T {
  throw new Error("legacy_per_key_configuration_mutation_retired");
}

export const salvarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({
    key: legacyKeySchema,
    value: z.record(z.string(), z.unknown()),
    notes: z.string().optional().nullable(),
  }).strict())
  .handler(async (): Promise<{ id: string; key: string; status: "draft" }> => retiredMutation());

export const descartarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: legacyKeySchema }).strict())
  .handler(async (): Promise<{ ok: true }> => retiredMutation());

export const publicarRascunho = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: legacyKeySchema }).strict())
  .handler(async (): Promise<{ ok: true; key: string }> => retiredMutation());

export const restaurarVersao = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async (): Promise<{ ok: true; key: string }> => retiredMutation());

export const listarVersoes = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .inputValidator(z.object({ key: legacyKeySchema }).strict())
  .handler(async ({ context }): Promise<SiteVersionRow[]> => {
    const { tenantId } = await authorizeTenantConfigurationOperation(trusted(context), "visualizar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("site_settings_versions")
      .select("id, status, value, notes, created_by, created_at, published_at, revision")
      .eq("tenant_id", tenantId)
      .eq("key", "configuration")
      .order("revision", { ascending: false });
    if (error) throw new Error("tenant_configuration_history_read_failed");
    return (data ?? []).map((row: any) => ({
      id: row.id as string,
      key: "configuration",
      status: row.status as SiteVersionRow["status"],
      value_json: JSON.stringify(row.value ?? {}),
      notes: row.notes ?? `Revisão ${row.revision}`,
      created_by: row.created_by ?? null,
      created_at: row.created_at as string,
      published_at: row.published_at ?? null,
    }));
  });

export const listarRascunhosPendentes = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<{ key: string; created_at: string }[]> => {
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    return state.draft ? [{ key: "configuration", created_at: state.draft.createdAt }] : [];
  });

export const obterSiteSettingsPreview = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<SiteSettings> => {
    const state = await loadTenantConfigurationState(trusted(context), "visualizar");
    return projectConfigurationToSiteSettings(state.tenantId, state.effectiveSnapshot);
  });

export const publicarTodosRascunhos = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .handler(async (): Promise<{ count: number }> => retiredMutation());
