import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { normalizePublicLinkPresentation, normalizePublicNavigationUrl } from "@/lib/public-content-security";

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

type PublicMenuRow = MenuItem & { tenant_id: string };

export const listarMenuPublico = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("website_menu_items")
    .select("tenant_id, id, location, label, url, ordem, visivel, target, tipo")
    .eq("tenant_id", tenant.id)
    .eq("visivel", true)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return assertTenantScopedRows(tenant.id, data as unknown as PublicMenuRow[] | null)
    .map((row): MenuItem => {
      const dto = withoutTenantId(row);
      const url = normalizePublicNavigationUrl(dto.url, "contact");
      if (!url) throw new Error("unsafe_navigation_destination");
      const presentation = normalizePublicLinkPresentation(url, dto.target);
      return { ...dto, url, target: presentation.target };
    });
});

export const listarMenuAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("website_menu_items")
      .select("id, location, label, url, ordem, visivel, target, tipo")
      .order("location", { ascending: true })
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as MenuItem[];
  });

const itemSchema = z.object({
  id: z.string().uuid().optional(),
  location: z.enum(["header", "footer"]),
  label: z.string().min(1),
  url: z.string().min(1),
  ordem: z.number().int().default(0),
  visivel: z.boolean().default(true),
  target: z.enum(["_self", "_blank"]).default("_self"),
  tipo: z.enum(["internal", "external"]).default("internal"),
});

export const salvarMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => itemSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    const { id, ...rest } = data;
    await assertCmsPermission(context, "cms.menu", id ? "editar" : "criar");
    if (id) {
      const { data: before } = await context.supabase.from("website_menu_items").select("*").eq("id", id).maybeSingle();
      const { data: row, error } = await context.supabase.from("website_menu_items").update(rest).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      await logCmsAudit(context, "website_menu_items", "cms.menu.editar", id, before, row);
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("website_menu_items")
      .insert(rest)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "website_menu_items", "cms.menu.criar", inserted!.id as string, null, inserted);
    return { id: inserted!.id as string };
  });

export const excluirMenuItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.menu", "excluir");
    const { data: before } = await context.supabase.from("website_menu_items").select("*").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("website_menu_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logCmsAudit(context, "website_menu_items", "cms.menu.excluir", data.id, before, null);
    return { ok: true };
  });

export const reordenarMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ items: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int() })) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertCmsPermission, logCmsAudit } = await import("./_cms");
    await assertCmsPermission(context, "cms.menu", "editar");
    for (const it of data.items) {
      const { error } = await context.supabase
        .from("website_menu_items")
        .update({ ordem: it.ordem })
        .eq("id", it.id);
      if (error) throw new Error(error.message);
    }
    await logCmsAudit(context, "website_menu_items", "cms.menu.reordenar", "bulk", null, data.items);
    return { ok: true };
  });
