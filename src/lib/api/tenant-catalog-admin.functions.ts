import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import {
  resolveEffectiveTenantPermission,
  trustedTenantAccessContext,
} from "@/lib/api/tenant-access-control-authority.server";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";

const slug = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const citySchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(160),
  slug,
  estado: z.string().trim().length(2).transform((value) => value.toUpperCase()),
}).strict();
const neighborhoodSchema = z.object({
  id: z.string().uuid().optional(),
  cidade_id: z.string().uuid(),
  nome: z.string().trim().min(2).max(160),
  slug,
  descricao: z.string().trim().max(2000).optional().nullable(),
  imagem_url: z.string().trim().max(512).optional().nullable(),
  destaque: z.boolean().default(false),
}).strict();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorizeCatalog(context: any, action: "visualizar" | "criar" | "editar" | "excluir") {
  const tenantId = requireTenantScopedAuthority(context.tenant, "Property Catalog Administration");
  const decision = await resolveEffectiveTenantPermission(
    trustedTenantAccessContext(context),
    "cms.paginas",
    action,
  );
  if (!decision.allowed || decision.scope !== "global") {
    throw new Error("property_catalog_permission_denied");
  }
  return tenantId;
}

export const adminListarCidades = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = await authorizeCatalog(context, "visualizar");
    const { data, error } = await context.supabase
      .from("cidades")
      .select("id, tenant_id, nome, slug, estado")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarCidade = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => citySchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await authorizeCatalog(context, data.id ? "editar" : "criar");
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("cidades")
        .update({ nome: data.nome, slug: data.slug, estado: data.estado })
        .eq("tenant_id", tenantId)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Cidade não encontrada neste tenant.");
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("cidades")
      .insert({ tenant_id: tenantId, nome: data.nome, slug: data.slug, estado: data.estado })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminExcluirCidade = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await authorizeCatalog(context, "excluir");
    const [{ count: neighborhoodCount, error: neighborhoodError }, { count: propertyCount, error: propertyError }] = await Promise.all([
      context.supabase
        .from("bairros")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("cidade_id", data.id),
      context.supabase
        .from("imoveis")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("cidade", data.id),
    ]);
    if (neighborhoodError) throw new Error(neighborhoodError.message);
    if (propertyError) throw new Error(propertyError.message);
    if ((neighborhoodCount ?? 0) > 0 || (propertyCount ?? 0) > 0) {
      throw new Error("Cidade possui bairros ou imóveis e não pode ser excluída.");
    }
    const { data: row, error } = await context.supabase
      .from("cidades")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Cidade não encontrada neste tenant.");
    return { ok: true };
  });

export const adminListarBairros = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }) => {
    const tenantId = await authorizeCatalog(context, "visualizar");
    const { data, error } = await context.supabase
      .from("bairros")
      .select("id, tenant_id, cidade_id, nome, slug, descricao, imagem_url, destaque")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarBairro = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => neighborhoodSchema.parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await authorizeCatalog(context, data.id ? "editar" : "criar");
    const { data: cityRows, error: cityError } = await context.supabase
      .from("cidades")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", data.cidade_id)
      .limit(2);
    if (cityError) throw new Error(cityError.message);
    if ((cityRows ?? []).length !== 1) throw new Error("Cidade ausente, ambígua ou fora do tenant.");

    const payload = {
      cidade_id: data.cidade_id,
      nome: data.nome,
      slug: data.slug,
      descricao: data.descricao ?? null,
      imagem_url: data.imagem_url ?? null,
      destaque: data.destaque,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("bairros")
        .update(payload)
        .eq("tenant_id", tenantId)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) throw new Error("Bairro não encontrado neste tenant.");
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("bairros")
      .insert({ tenant_id: tenantId, ...payload })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminExcluirBairro = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const tenantId = await authorizeCatalog(context, "excluir");
    const { count, error: referenceError } = await context.supabase
      .from("imoveis")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("bairro_id", data.id);
    if (referenceError) throw new Error(referenceError.message);
    if ((count ?? 0) > 0) throw new Error("Bairro possui imóveis e não pode ser excluído.");
    const { data: row, error } = await context.supabase
      .from("bairros")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Bairro não encontrado neste tenant.");
    return { ok: true };
  });
