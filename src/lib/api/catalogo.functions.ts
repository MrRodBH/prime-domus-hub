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
    bairro: z.string().optional(),
    quartos_min: z.number().int().optional(),
    preco_min: z.number().optional(),
    preco_max: z.number().optional(),
    busca: z.string().optional(),
    apenas_destaque: z.boolean().optional(),
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
        "id, codigo, titulo, slug, finalidade, tipo, status, preco, preco_sob_consulta, area_util, quartos, suites, vagas, badge, destaque, exclusivo, imagem_capa, bairro:bairros(nome, slug)",
      )
      .eq("status", "ativo")
      .order("destaque", { ascending: false })
      .order("publicado_em", { ascending: false });

    if (data.finalidade) q = q.eq("finalidade", data.finalidade);
    if (data.tipo) q = q.eq("tipo", data.tipo);
    if (data.bairro) q = q.eq("bairro.slug", data.bairro);
    if (data.quartos_min) q = q.gte("quartos", data.quartos_min);
    if (data.preco_min) q = q.gte("preco", data.preco_min);
    if (data.preco_max) q = q.lte("preco", data.preco_max);
    if (data.busca) q = q.ilike("titulo", `%${data.busca}%`);
    if (data.apenas_destaque) q = q.eq("destaque", true);
    if (data.limite) q = q.limit(data.limite);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listarBairros = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("bairros")
    .select("id, nome, slug, descricao, imagem_url, destaque, ordem")
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const obterImovel = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: imovel, error } = await supabase
      .from("imoveis")
      .select(
        `id, codigo, titulo, slug, descricao, finalidade, tipo, status, preco, preco_sob_consulta,
         condominio, iptu, area_total, area_util, quartos, suites, banheiros, vagas, endereco,
         badge, destaque, exclusivo, caracteristicas, imagem_capa, latitude, longitude, publicado_em,
         bairro:bairros(id, nome, slug, cidade, estado),
         corretor:corretores(id, nome, slug, creci, email, telefone, whatsapp, foto_url, bio),
         imagens:imovel_imagens(id, url, alt, ordem)`,
      )
      .eq("slug", data.slug)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!imovel) return null;
    if (imovel.imagens) {
      imovel.imagens.sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
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
    }),
  )
  .handler(async ({ data }) => {
    if (!data.email && !data.telefone) {
      throw new Error("Informe e-mail ou telefone para contato.");
    }
    const supabase = publicClient();
    const { error } = await supabase.from("leads").insert({
      nome: data.nome,
      email: data.email || null,
      telefone: data.telefone || null,
      mensagem: data.mensagem || null,
      origem: data.origem || "site",
      imovel_id: data.imovel_id || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
