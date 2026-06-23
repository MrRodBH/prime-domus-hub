import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const filtersSchema = z
  .object({
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
  })
  .optional()
  .default({});

export const listarImoveis = createServerFn({ method: "GET" })
  .inputValidator(filtersSchema)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let q = supabase
      .from("imoveis")
      .select(
        "id, codigo, titulo, slug, finalidade, tipo, status, preco, preco_sob_consulta, area_util, quartos, suites, vagas, badge, destaque, exclusivo, imagem_capa, bairro:bairros(nome, slug, cidade:cidades(slug)), imagens:imovel_imagens(url, ordem)",
      )
      .eq("status", "ativo");

    if (data.finalidade) q = q.eq("finalidade", data.finalidade);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.bairro) q = q.eq("bairro.slug", data.bairro);
    if (data.cidade && !data.bairro) {
      // Restringe pelos bairros da cidade escolhida
      const { data: cid } = await supabase.from("cidades").select("id").eq("slug", data.cidade).maybeSingle();
      const cidadeId = (cid as { id?: string } | null)?.id;
      if (cidadeId) {
        const { data: bs } = await supabase.from("bairros").select("id").eq("cidade_id", cidadeId);
        const ids = (bs ?? []).map((b: { id: string }) => b.id);
        if (ids.length === 0) return [];
        q = q.in("bairro_id", ids);
      } else {
        return [];
      }
    }
    if (data.quartos_min) q = q.gte("quartos", data.quartos_min);
    if (data.suites_min) q = q.gte("suites", data.suites_min);
    if (data.vagas_min) q = q.gte("vagas", data.vagas_min);
    if (data.preco_min) q = q.gte("preco", data.preco_min);
    if (data.preco_max) q = q.lte("preco", data.preco_max);
    if (data.area_min) q = q.gte("area_util", data.area_min);
    if (data.busca) q = q.or(`titulo.ilike.%${data.busca}%,codigo.ilike.%${data.busca}%,endereco.ilike.%${data.busca}%`);
    if (data.apenas_destaque) q = q.eq("destaque", true);

    switch (data.ordenar) {
      case "preco_asc":
        q = q.order("preco", { ascending: true, nullsFirst: false });
        break;
      case "preco_desc":
        q = q.order("preco", { ascending: false, nullsFirst: false });
        break;
      case "area_desc":
        q = q.order("area_util", { ascending: false, nullsFirst: false });
        break;
      default:
        q = q.order("destaque", { ascending: false }).order("publicado_em", { ascending: false });
    }

    if (data.limite) q = q.limit(data.limite);


    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    let admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin | null = null;
    try {
      admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    } catch (e) {
      console.error("supabaseAdmin indisponível em listarImoveis:", e);
    }
    await Promise.all(
      list.map(async (r) => {
        const row = r as { imagem_capa?: string | null; imagens?: Array<{ url?: string | null; ordem?: number | null }> };
        const primeiraFoto = [...(row.imagens ?? [])]
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))[0]?.url;
        const capa = primeiraFoto || row.imagem_capa;
        delete row.imagens;
        if (!capa) { row.imagem_capa = null; return; }
        if (capa.startsWith("http")) { row.imagem_capa = capa; return; }
        if (!admin) { row.imagem_capa = null; return; }
        try {
          const { data: s } = await admin.storage
            .from("imoveis")
            .createSignedUrl(capa, 60 * 60 * 24 * 365, {
              transform: { width: 1280, quality: 72, resize: "contain" },
            });
          row.imagem_capa = s?.signedUrl ?? null;
        } catch {
          row.imagem_capa = null;
        }
      }),
    );


    return list;
  });

export const listarCidades = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("cidades")
      .select("id, nome, slug, estado")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listarBairros = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      limite: z.number().int().min(1).max(50).optional(),
      apenas_destaque: z.boolean().optional(),
      cidade: z.string().optional(),
    }).optional().default({}),
  )
  .handler(async ({ data }) => {
    const supabase = publicClient();
    let q = supabase
      .from("bairros")
      .select("id, nome, slug, descricao, imagem_url, destaque, cidade_id, cidade:cidades(id, nome, slug, estado)")
      .order("destaque", { ascending: false })
      .order("nome", { ascending: true });
    if (data.apenas_destaque) q = q.eq("destaque", true);
    if (data.cidade) {
      const { data: cid } = await supabase.from("cidades").select("id").eq("slug", data.cidade).maybeSingle();
      const cidadeId = (cid as { id?: string } | null)?.id;
      if (!cidadeId) return [];
      q = q.eq("cidade_id", cidadeId);
    }
    if (data.limite) q = q.limit(data.limite);
    const { data: bairros, error } = await q;
    if (error) throw new Error(error.message);
    const list = bairros ?? [];

    const { data: counts } = await supabase
      .from("imoveis")
      .select("bairro_id")
      .eq("status", "ativo");
    const countMap = new Map<string, number>();
    for (const c of counts ?? []) {
      const id = (c as { bairro_id: string | null }).bairro_id;
      if (id) countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }

    let admin: typeof import("@/integrations/supabase/client.server").supabaseAdmin | null = null;
    try {
      admin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    } catch (e) {
      console.error("supabaseAdmin indisponível em listarBairros:", e);
    }
    await Promise.all(
      list.map(async (b) => {
        const row = b as { id: string; imagem_url?: string | null; count?: number };
        row.count = countMap.get(row.id) ?? 0;
        if (row.imagem_url && !row.imagem_url.startsWith("http") && admin) {
          try {
            const { data: s } = await admin.storage
              .from("imoveis")
              .createSignedUrl(row.imagem_url, 60 * 60 * 24 * 365, {
                transform: { width: 800, quality: 72, resize: "contain" },
              });
            if (s) row.imagem_url = s.signedUrl;
          } catch { /* keep raw */ }
        }
      }),
    );
    return list;
  });

export const obterImovel = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Usamos admin client server-side porque o anon não tem mais SELECT em colunas
    // sensíveis (email/telefone/whatsapp) de corretores. Estes campos continuam
    // sendo exibidos na página pública do imóvel — apenas a leitura granel via
    // Data API foi bloqueada.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: imovel, error } = await supabaseAdmin
      .from("imoveis")
      .select(
        `id, codigo, titulo, slug, descricao, finalidade, tipo, status, preco, preco_sob_consulta,
         condominio, iptu, area_total, area_util, quartos, suites, banheiros, vagas, endereco,
         rua, numero, complemento, cidade, estado, cep,
         badge, destaque, exclusivo, caracteristicas, imagem_capa, video_url, tour_url,
         latitude, longitude, mostrar_rua, mostrar_endereco_completo, publicado_em,
         bairro:bairros(id, nome, slug, cidade:cidades(id, nome, slug, estado)),
         corretor:corretores(id, nome, sobrenome, slug, creci, email, telefone, whatsapp, foto_url, bio),
         imagens:imovel_imagens(id, url, alt, ordem)`,
      )
      .eq("slug", data.slug)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!imovel) return null;
    if (imovel.imagens) {
      imovel.imagens.sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await Promise.all(
        (imovel.imagens as Array<{ url: string; thumb?: string }>).map(async (img) => {
          if (!img.url || img.url.startsWith("http")) {
            img.thumb = img.url;
            return;
          }
          const [full, thumb] = await Promise.all([
            supabaseAdmin.storage
              .from("imoveis")
              .createSignedUrl(img.url, 60 * 60 * 24 * 365, {
                transform: { width: 1280, height: 800, quality: 70, resize: "contain" },
              }),
            supabaseAdmin.storage
              .from("imoveis")
              .createSignedUrl(img.url, 60 * 60 * 24 * 365, {
                transform: { width: 240, height: 160, quality: 58, resize: "contain" },
              }),
          ]);
          if (full.data) img.url = full.data.signedUrl;
          img.thumb = thumb.data?.signedUrl ?? img.url;
        }),
      );
    }
    const imRow = imovel as { imagem_capa?: string | null };
    if (imRow.imagem_capa && !imRow.imagem_capa.startsWith("http")) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: s } = await supabaseAdmin.storage
        .from("imoveis")
        .createSignedUrl(imRow.imagem_capa, 60 * 60 * 24 * 365, {
          transform: { width: 1280, height: 800, quality: 70, resize: "contain" },
        });
      if (s) imRow.imagem_capa = s.signedUrl;
    }


    return imovel;
  });


export const enviarLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      nome: z.string().min(2),
      email: z.string().email().optional().or(z.literal("")),
      telefone: z.string().optional(),
      mensagem: z.string().optional(),
      origem: z.string().optional(),
      imovel_id: z.string().uuid().optional(),
      consent_lgpd: z.literal(true, {
        errorMap: () => ({ message: "É necessário aceitar a Política de Privacidade." }),
      }),
    }),
  )
  .handler(async ({ data }) => {
    if (!data.email && !data.telefone) {
      throw new Error("Informe e-mail ou telefone para contato.");
    }
    const leadId = crypto.randomUUID();
    const supabase = publicClient();
    const { error } = await supabase
      .from("leads")
      .insert({
        id: leadId,
        nome: data.nome,
        email: data.email || null,
        telefone: data.telefone || null,
        mensagem: data.mensagem || null,
        origem: data.origem || "site",
        imovel_id: data.imovel_id || null,
        consent_lgpd: true,
        consent_at: new Date().toISOString(),
      });
    if (error) throw new Error(error.message);


    // Notificar corretor por e-mail (não bloqueia resposta do form)
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const admin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );

      // Destinatário: site_settings.contato.email
      const { data: settings } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "contato")
        .maybeSingle();
      const contato = (settings?.value as { email?: string } | null) ?? null;
      const destino = contato?.email;

      if (destino) {
        // Buscar dados do imóvel (se aplicável) para enriquecer e-mail
        let imovel_codigo: string | undefined;
        let imovel_titulo: string | undefined;
        if (data.imovel_id) {
          const { data: im } = await admin
            .from("imoveis")
            .select("codigo, titulo")
            .eq("id", data.imovel_id)
            .maybeSingle();
          imovel_codigo = im?.codigo ?? undefined;
          imovel_titulo = im?.titulo ?? undefined;
        }

        const { enqueueTransactional } = await import("@/lib/email/notify.server");
        await enqueueTransactional({
          templateName: "novo-lead",
          to: destino,
          idempotencyKey: `lead-${leadId}`,
          templateData: {
            nome: data.nome,
            email: data.email || undefined,
            telefone: data.telefone || undefined,
            mensagem: data.mensagem || undefined,
            origem: data.origem || "site",
            imovel_codigo,
            imovel_titulo,
            recebido_em: new Date().toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            }),
          },
        });
      }
    } catch (e) {
      console.error("Falha ao notificar lead por e-mail:", e);
    }

    return { ok: true };
  });
