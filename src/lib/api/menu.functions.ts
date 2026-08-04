import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { normalizePublicLinkPresentation, normalizePublicNavigationUrl } from "@/lib/public-content-security";
import {
  authorizeTenantConfigurationOperation,
  loadPublishedConfigurationForTenant,
  loadTenantConfigurationState,
} from "@/lib/api/tenant-configuration-authority.server";

export interface MenuItem {
  id: string;
  location: "header" | "footer";
  label: string;
  url: string;
  ordem: number;
  visivel: boolean;
  target: "_self" | "_blank";
  tipo: "internal" | "external";
}

function normalizeMenuItems(value: unknown, publicOnly: boolean): MenuItem[] {
  if (!Array.isArray(value)) throw new Error("configuration_menu_items_invalid");
  const seen = new Set<string>();
  const rows = value.map((entry, index): MenuItem => {
    if (typeof entry !== "object" || entry === null) throw new Error("configuration_menu_item_invalid");
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : `configuration-menu-${index}`;
    if (seen.has(id)) throw new Error("configuration_menu_item_duplicate");
    seen.add(id);
    const location = item.location === "footer" ? "footer" : item.location === "header" ? "header" : null;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const rawUrl = typeof item.url === "string" ? item.url : "";
    const ordem = Number.isInteger(item.order) ? Number(item.order) : Number.isInteger(item.ordem) ? Number(item.ordem) : index * 10;
    const visivel = typeof item.visible === "boolean" ? item.visible : typeof item.visivel === "boolean" ? item.visivel : true;
    const target = item.target === "_blank" ? "_blank" : "_self";
    const tipo = item.type === "external" || item.tipo === "external" ? "external" : "internal";
    if (!location || !label || label.length > 120 || !Number.isSafeInteger(ordem)) {
      throw new Error("configuration_menu_item_invalid");
    }
    const url = normalizePublicNavigationUrl(rawUrl, "contact");
    if (!url) throw new Error("unsafe_navigation_destination");
    const presentation = normalizePublicLinkPresentation(url, target);
    return { id, location, label, url, ordem, visivel, target: presentation.target, tipo };
  });
  return rows
    .filter((row) => !publicOnly || row.visivel)
    .sort((a, b) => a.location.localeCompare(b.location) || a.ordem - b.ordem || a.id.localeCompare(b.id));
}

export const listarMenuPublico = createServerFn({ method: "GET" }).handler(async (): Promise<MenuItem[]> => {
  const tenant = await requirePublicTenantFromRequest();
  const published = await loadPublishedConfigurationForTenant(tenant.id);
  return normalizeMenuItems(published.publicSnapshot.menu_items, true);
});

export const listarMenuAdmin = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<MenuItem[]> => {
    const state = await loadTenantConfigurationState({ userId: context.userId, tenant: context.tenant }, "visualizar");
    return normalizeMenuItems(state.effectiveSnapshot.menu_items, false);
  });

const itemSchema = z.object({
  id: z.string().optional(),
  location: z.enum(["header", "footer"]),
  label: z.string().min(1),
  url: z.string().min(1),
  ordem: z.number().int().default(0),
  visivel: z.boolean().default(true),
  target: z.enum(["_self", "_blank"]).default("_self"),
  tipo: z.enum(["internal", "external"]).default("internal"),
}).strict();

function retiredMenuMutation(): never {
  throw new Error("legacy_menu_mutation_retired_use_configuration_center");
}

/** @deprecated Menu mutations are part of the whole configuration draft. */
export const salvarMenuItem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) => itemSchema.parse(raw))
  .handler(async ({ context }) => {
    await authorizeTenantConfigurationOperation({ userId: context.userId, tenant: context.tenant }, "editar");
    return retiredMenuMutation();
  });

/** @deprecated Menu mutations are part of the whole configuration draft. */
export const excluirMenuItem = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) => z.object({ id: z.string().min(1) }).strict().parse(raw))
  .handler(async ({ context }) => {
    await authorizeTenantConfigurationOperation({ userId: context.userId, tenant: context.tenant }, "editar");
    return retiredMenuMutation();
  });

/** @deprecated Menu mutations are part of the whole configuration draft. */
export const reordenarMenu = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((raw) => z.object({ items: z.array(z.object({ id: z.string().min(1), ordem: z.number().int() }).strict()) }).strict().parse(raw))
  .handler(async ({ context }) => {
    await authorizeTenantConfigurationOperation({ userId: context.userId, tenant: context.tenant }, "editar");
    return retiredMenuMutation();
  });
