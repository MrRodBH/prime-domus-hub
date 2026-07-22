import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePublicWriterTenantFromRequest } from "@/lib/public-writers/public-writer-authority.server";
import { writePublicLead } from "@/lib/public-writers/public-lead-writer.server";
import { requirePublicTenantFromRequest } from "@/lib/tenant.server";
import { assertTenantScopedRows, withoutTenantId } from "@/lib/public-tenant-read-guards";
import { normalizePublicMediaUrl } from "@/lib/public-content-security";
import { toEmbedUrl } from "@/lib/embed-url";

type TenantRow = { tenant_id: string } & Record<string, any>;

function oneRelation(value: unknown): TenantRow | null {
  if (Array.isArray(value)) return (value[0] as TenantRow | undefined) ?? null;
  return value && typeof value === "object" ? (value as TenantRow) : null;
}

function stripNestedTenant(tenantId: string, value: unknown, label: string): Record<string, any> | null {
  const row = oneRelation(value);
  if (!row) return null;
  if (row.tenant_id !== tenantId) throw new Error(`public_resource_foreign_tenant:${label}`);
  return withoutTenantId(row) as Record<string, any>;
}

async function publicMediaUrl(
  admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  bucket: string,
  value: string | null | undefined,
  transform?: { width?: number; height?: number; quality?: number; resize?: "contain" | "cover" | "fill" },
): Promise<string | null> {
  if (!value) return null;
  const alreadyPublic = normalizePublicMediaUrl(value);
  if (alreadyPublic) return alreadyPublic;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(
    value,
    60 * 60 * 24,
    transform ? { transform } : undefined,
  );
  if (error) return null;
  return normalizePublicMediaUrl(data?.signedUrl);
}

const filtersSchema = z.object({
  finalidade: z.enum(["venda", "aluguel", "lancamento"]).optional(),
  tipo: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  quartos_min: z.number().int().optional(),
  suites_min: z.number().int().optional(),
  vagas_min: z.number().int().optional(),
  preco_min: z.number().optional(),
  preco_max: z.number().optional(),
  area_min: z.number().optional(),
  busca: z.string().optional(),
  apenas_destaque: z.boolean().optional(),
  ordenar: z.enum(["recentes", "preco_asc", "preco_desc", "area_desc"]).optional(),
  limite: z.number().int().min(1).max(60).optional(),
}).optional().default({});

export const listarImoveis = createServerFn({ method: "GET" })
  .inputValidator(filtersSchema)
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("imoveis")
      .select(
        "tenant_id, id, codigo, titulo, slug, finalidade, tipo, status, preco, preco_sob_consulta, area_util, quartos, suites, vagas, badge, destaque, exclusivo, imagem_capa, bairro:bairros(tenant_id,nome,slug,cidade:cidades(tenant_id,slug)), imagens:imovel_imagens(tenant_id,url,ordem)",
      )
      .eq("tenant_id", tenant.id)
      .eq("status", "ativo");

    if (data.finalidade) query = query.eq("finalidade", data.finalidade);
    if (data.tipo) query = query.eq("tipo", data.tipo as any);
    if (data.bairro) query = query.eq("bairro.slug", data.bairro);
    if (data.cidade && !data.bairro) {
      const cityResult = await supabaseAdmin
        .from("cidades")
        .select("tenant_id,id")
        .eq("tenant_id", tenant.id)
        .eq("slug", data.cidade)
        .limit(2);
      if (cityResult.error) throw new Error(cityResult.error.message);
      const cities = assertTenantScopedRows(tenant.id, cityResult.data as unknown as TenantRow[] | null);
      if (cities.length === 0) return [];
      if (cities.length > 1) throw new Error("public_resource_ambiguous");
      const neighborhoodResult = await supabaseAdmin
        .from("bairros")
        .select("tenant_id,id")
        .eq("tenant_id", tenant.id)
        .eq("cidade_id", cities[0].id);
      if (neighborhoodResult.error) throw new Error(neighborhoodResult.error.message);
      const neighborhoodIds = assertTenantScopedRows(
        tenant.id,
        neighborhoodResult.data as unknown as TenantRow[] | null,
      ).map((row) => String(row.id));
      if (neighborhoodIds.length === 0) return [];
      query = query.in("bairro_id", neighborhoodIds);
    }
    if (data.quartos_min) query = query.gte("quartos", data.quartos_min);
    if (data.suites_min) query = query.gte("suites", data.suites_min);
    if (data.vagas_min) query = query.gte("vagas", data.vagas_min);
    if (data.preco_min) query = query.gte("preco", data.preco_min);
    if (data.preco_max) query = query.lte("preco", data.preco_max);
    if (data.area_min) query = query.gte("area_util", data.area_min);
    if (data.busca) query = query.or(`titulo.ilike.%${data.busca}%,codigo.ilike.%${data.busca}%,endereco.ilike.%${data.busca}%`);
    if (data.apenas_destaque) query = query.eq("destaque", true);

    switch (data.ordenar) {
      case "preco_asc": query = query.order("preco", { ascending: true, nullsFirst: false }); break;
      case "preco_desc": query = query.order("preco", { ascending: false, nullsFirst: false }); break;
      case "area_desc": query = query.order("area_util", { ascending: false, nullsFirst: false }); break;
      default: query = query.order("destaque", { ascending: false }).order("publicado_em", { ascending: false });
    }
    if (data.limite) query = query.limit(data.limite);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const accepted = assertTenantScopedRows(tenant.id, rows as unknown as TenantRow[] | null);
    return Promise.all(accepted.map(async (row) => {
      const dto = withoutTenantId(row) as Record<string, any>;
      const neighborhood = stripNestedTenant(tenant.id, dto.bairro, "property_neighborhood");
      if (neighborhood?.cidade) {
        neighborhood.cidade = stripNestedTenant(tenant.id, neighborhood.cidade, "property_city");
      }
      dto.bairro = neighborhood;
      const images = assertTenantScopedRows(
        tenant.id,
        (Array.isArray(dto.imagens) ? dto.imagens : []) as TenantRow[],
      );
      const firstImage = [...images].sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))[0];
      dto.imagem_capa = await publicMediaUrl(
        supabaseAdmin,
        "imoveis",
        String(firstImage?.url ?? dto.imagem_capa ?? "") || null,
        { width: 1280, quality: 72, resize: "contain" },
      );
      delete dto.imagens;
      return dto;
    }));
  });

export const listarCidades = createServerFn({ method: "GET" }).handler(async () => {
  const tenant = await requirePublicTenantFromRequest();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("cidades")
    .select("tenant_id,id,nome,slug,estado")
    .eq("tenant_id", tenant.id)
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);
  return assertTenantScopedRows(tenant.id, data as unknown as TenantRow[] | null).map(withoutTenantId);
});

export const listarBairros = createServerFn({ method: "GET" })
  .inputValidator(z.object({
    limite: z.number().int().min(1).max(50).optional(),
    apenas_destaque: z.boolean().optional(),
    cidade: z.string().optional(),
  }).optional().default({}))
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let cityId: string | null = null;
    if (data.cidade) {
      const cityResult = await supabaseAdmin
        .from("cidades")
        .select("tenant_id,id")
        .eq("tenant_id", tenant.id)
        .eq("slug", data.cidade)
        .limit(2);
      if (cityResult.error) throw new Error(cityResult.error.message);
      const cities = assertTenantScopedRows(tenant.id, cityResult.data as unknown as TenantRow[] | null);
      if (cities.length === 0) return [];
      if (cities.length > 1) throw new Error("public_resource_ambiguous");
      cityId = String(cities[0].id);
    }

    let query = supabaseAdmin
      .from("bairros")
      .select("tenant_id,id,nome,slug,descricao,imagem_url,destaque,cidade_id,cidade:cidades(tenant_id,id,nome,slug,estado)")
      .eq("tenant_id", tenant.id)
      .order("destaque", { ascending: false })
      .order("nome", { ascending: true });
    if (data.apenas_destaque) query = query.eq("destaque", true);
    if (cityId) query = query.eq("cidade_id", cityId);
    if (data.limite) query = query.limit(data.limite);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const neighborhoods = assertTenantScopedRows(tenant.id, rows as unknown as TenantRow[] | null);

    const countsResult = await supabaseAdmin
      .from("imoveis")
      .select("tenant_id,bairro_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "ativo");
    if (countsResult.error) throw new Error(countsResult.error.message);
    const countRows = assertTenantScopedRows(tenant.id, countsResult.data as unknown as TenantRow[] | null);
    const countMap = new Map<string, number>();
    for (const row of countRows) {
      if (row.bairro_id) countMap.set(String(row.bairro_id), (countMap.get(String(row.bairro_id)) ?? 0) + 1);
    }

    return Promise.all(neighborhoods.map(async (row) => {
      const dto = withoutTenantId(row) as Record<string, any>;
      dto.cidade = stripNestedTenant(tenant.id, dto.cidade, "neighborhood_city");
      dto.count = countMap.get(String(dto.id)) ?? 0;
      dto.imagem_url = await publicMediaUrl(
        supabaseAdmin,
        "imoveis",
        typeof dto.imagem_url === "string" ? dto.imagem_url : null,
        { width: 800, quality: 72, resize: "contain" },
      );
      return dto;
    }));
  });

export const obterImovel = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }).strict())
  .handler(async ({ data }) => {
    const tenant = await requirePublicTenantFromRequest();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin
      .from("imoveis")
      .select(
        `tenant_id,id,codigo,titulo,slug,descricao,finalidade,tipo,status,preco,preco_sob_consulta,
         condominio,iptu,area_total,area_util,quartos,suites,banheiros,vagas,endereco,
         rua,numero,complemento,cidade,estado,cep,badge,destaque,exclusivo,caracteristicas,
         imagem_capa,video_url,tour_url,latitude,longitude,mostrar_rua,mostrar_endereco_completo,publicado_em,
         bairro:bairros(tenant_id,id,nome,slug,cidade:cidades(tenant_id,id,nome,slug,estado)),
         corretor:corretores(tenant_id,id,nome,sobrenome,slug,creci,email,telefone,whatsapp,foto_url,bio),
         imagens:imovel_imagens(tenant_id,id,url,alt,ordem)`,
      )
      .eq("tenant_id", tenant.id)
      .eq("slug", data.slug)
      .eq("status", "ativo")
      .limit(2);
    if (result.error) throw new Error(result.error.message);
    const rows = assertTenantScopedRows(tenant.id, result.data as unknown as TenantRow[] | null);
    if (rows.length === 0) return null;
    if (rows.length > 1) throw new Error("public_resource_ambiguous");

    const dto = withoutTenantId(rows[0]) as Record<string, any>;
    const neighborhood = stripNestedTenant(tenant.id, dto.bairro, "property_neighborhood");
    if (neighborhood?.cidade) neighborhood.cidade = stripNestedTenant(tenant.id, neighborhood.cidade, "property_city");
    dto.bairro = neighborhood;
    const broker = stripNestedTenant(tenant.id, dto.corretor, "property_broker");
    if (broker && typeof broker.foto_url === "string") broker.foto_url = normalizePublicMediaUrl(broker.foto_url);
    dto.corretor = broker;

    const images = assertTenantScopedRows(
      tenant.id,
      (Array.isArray(dto.imagens) ? dto.imagens : []) as TenantRow[],
    ).sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0));
    dto.imagens = await Promise.all(images.map(async (image) => {
      const clean = withoutTenantId(image) as Record<string, any>;
      clean.url = await publicMediaUrl(supabaseAdmin, "imoveis", String(clean.url), {
        width: 1280, height: 800, quality: 70, resize: "contain",
      });
      clean.thumb = await publicMediaUrl(supabaseAdmin, "imoveis", String(image.url), {
        width: 240, height: 160, quality: 58, resize: "contain",
      });
      return clean;
    }));
    dto.imagem_capa = await publicMediaUrl(supabaseAdmin, "imoveis", dto.imagem_capa, {
      width: 1280, height: 800, quality: 70, resize: "contain",
    });
    dto.video_url = toEmbedUrl(typeof dto.video_url === "string" ? dto.video_url : null);
    dto.tour_url = toEmbedUrl(typeof dto.tour_url === "string" ? dto.tour_url : null);
    return dto;
  });

const publicLeadSchema = z
  .object({
    nome: z.string().min(2).max(200),
    email: z.string().email().optional().or(z.literal("")),
    telefone: z.string().max(40).optional(),
    mensagem: z.string().max(2000).optional(),
    origem: z.string().min(1).max(120).optional(),
    imovel_id: z.string().uuid().optional(),
    launch_project_id: z.string().uuid().optional(),
    consent_lgpd: z.literal(true, {
      errorMap: () => ({ message: "É necessário aceitar a Política de Privacidade." }),
    }),
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_term: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
    gclid: z.string().max(400).optional(),
    fbclid: z.string().max(400).optional(),
    referrer: z.string().max(500).optional(),
    landing_url: z.string().max(500).optional(),
  })
  .strict();

export const enviarLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => publicLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const tenant = await requirePublicWriterTenantFromRequest();
    await writePublicLead({
      tenant,
      command: {
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        mensagem: data.mensagem || null,
        origem: data.origem || "Site",
        imovelId: data.imovel_id || null,
        launchProjectId: data.launch_project_id || null,
        attribution: {
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          utm_term: data.utm_term,
          utm_content: data.utm_content,
          gclid: data.gclid,
          fbclid: data.fbclid,
          referrer: data.referrer,
          landing_url: data.landing_url,
        },
        notificationMode: "direct_site",
      },
    });
    return { ok: true };
  });
