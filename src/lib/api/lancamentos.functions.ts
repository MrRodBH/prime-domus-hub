import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado: requer permissão de administrador.");
}

// ===== Status (público) =====
export const listarStatusLancamento = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("launch_statuses")
    .select("id,slug,nome,ordem,ativo")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ===== Amenities (público) =====
export const listarAmenities = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await sb
    .from("launch_amenities")
    .select("id,slug,nome,ordem,ativo")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ===== Listar empreendimentos (admin) =====
export const adminListarLancamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("launch_projects")
      .select("id,slug,nome,construtora,entrega,publicado,destaque,imagem_capa,status:status_id(nome,slug),corretor:corretor_id(nome),updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ===== Obter empreendimento por id (admin) =====
export const adminObterLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: proj, error } = await context.supabase
      .from("launch_projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proj) throw new Error("Empreendimento não encontrado");
    const { data: amenIds } = await context.supabase
      .from("launch_project_amenities")
      .select("amenity_id")
      .eq("project_id", data.id);
    return { ...proj, amenity_ids: (amenIds ?? []).map((a: { amenity_id: string }) => a.amenity_id) };
  });

// ===== Salvar (criar/editar) =====
const projectSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2),
  nome: z.string().min(2),
  descricao: z.string().nullable().optional(),
  status_id: z.string().uuid().nullable().optional(),
  quartos: z.number().int().nullable().optional(),
  suites: z.number().int().nullable().optional(),
  vagas: z.number().int().nullable().optional(),
  area_apartamentos: z.number().nullable().optional(),
  construtora: z.string().nullable().optional(),
  entrega: z.string().nullable().optional(), // YYYY-MM-DD
  endereco: z.string().nullable().optional(),
  cidade_id: z.string().uuid().nullable().optional(),
  bairro_id: z.string().uuid().nullable().optional(),
  arquitetura: z.string().nullable().optional(),
  numero_unidades: z.number().int().nullable().optional(),
  numero_torres: z.number().int().nullable().optional(),
  unidades_por_andar: z.number().int().nullable().optional(),
  numero_andares: z.number().int().nullable().optional(),
  elevadores: z.number().int().nullable().optional(),
  corretor_id: z.string().uuid().nullable().optional(),
  imagem_capa: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  publicado: z.boolean().default(false),
  destaque: z.boolean().default(false),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  og_image: z.string().nullable().optional(),
  amenity_ids: z.array(z.string().uuid()).default([]),
});

export const adminSalvarLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(projectSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { amenity_ids, id, ...rest } = data;
    let projectId = id;
    if (id) {
      const { error } = await context.supabase
        .from("launch_projects")
        .update(rest as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: created, error } = await context.supabase
        .from("launch_projects")
        .insert(rest as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      projectId = (created as { id: string }).id;
    }
    if (!projectId) throw new Error("Falha ao obter id do empreendimento");
    // Replace amenities
    await context.supabase.from("launch_project_amenities").delete().eq("project_id", projectId);
    if (amenity_ids.length > 0) {
      const rows = amenity_ids.map((aid) => ({ project_id: projectId!, amenity_id: aid }));
      const { error: aErr } = await context.supabase.from("launch_project_amenities").insert(rows as never);
      if (aErr) throw new Error(aErr.message);
    }
    return { ok: true, id: projectId };
  });

export const adminExcluirLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("launch_projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== GALERIA =====
export const adminListarImagensLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: imgs, error } = await context.supabase
      .from("launch_project_imagens")
      .select("id, storage_path, legenda, ordem")
      .eq("project_id", data.project_id)
      .order("ordem");
    if (error) throw new Error(error.message);
    return imgs ?? [];
  });

export const adminAdicionarImagemLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    project_id: z.string().uuid(),
    storage_path: z.string().min(1),
    legenda: z.string().optional().nullable(),
    ordem: z.number().int().default(0),
  }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("launch_project_imagens").insert(data as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoverImagemLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), storage_path: z.string().optional() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.storage_path) {
      await context.supabase.storage.from("lancamentos").remove([data.storage_path]);
    }
    const { error } = await context.supabase.from("launch_project_imagens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminReordenarImagensLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    project_id: z.string().uuid(),
    ordem: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int() })),
    imagem_capa: z.string().optional().nullable(),
  }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    for (const it of data.ordem) {
      const { error } = await context.supabase
        .from("launch_project_imagens")
        .update({ ordem: it.ordem } as never)
        .eq("id", it.id)
        .eq("project_id", data.project_id);
      if (error) throw new Error(error.message);
    }
    if (data.imagem_capa !== undefined) {
      const { error } = await context.supabase
        .from("launch_projects")
        .update({ imagem_capa: data.imagem_capa } as never)
        .eq("id", data.project_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ===== UNIDADES =====
const UNIT_TIPOS = ["1_quarto","2_quartos","3_quartos","4_quartos_mais","cobertura","garden"] as const;
const UNIT_STATUS = ["disponivel","reservada","vendida","indisponivel"] as const;

const unitSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  unidade: z.number().int(),
  bloco: z.string().nullable().optional(),
  area: z.number().nullable().optional(),
  tipo: z.enum(UNIT_TIPOS).nullable().optional(),
  vagas: z.number().int().nullable().optional(),
  valor: z.number().nullable().optional(),
  status: z.enum(UNIT_STATUS).default("disponivel"),
  ativa: z.boolean().default(true),
});

export const adminListarUnidades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("launch_units")
      .select("*")
      .eq("project_id", data.project_id)
      .order("bloco", { nullsFirst: true })
      .order("unidade");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminSalvarUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(unitSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const payload = { ...rest, bloco: rest.bloco ? rest.bloco.toUpperCase() : null };
    if (id) {
      const { error } = await context.supabase.from("launch_units").update(payload as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: created, error } = await context.supabase
      .from("launch_units").insert(payload as never).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (created as { id: string }).id };
  });

export const adminExcluirUnidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("launch_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAlternarUnidadeAtiva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), ativa: z.boolean() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("launch_units").update({ ativa: data.ativa } as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminImportarUnidades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    project_id: z.string().uuid(),
    rows: z.array(unitSchema.omit({ id: true, project_id: true })),
  }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.rows.length === 0) return { ok: true, inserted: 0 };
    const payload = data.rows.map((r) => ({
      ...r,
      project_id: data.project_id,
      bloco: r.bloco ? r.bloco.toUpperCase() : null,
    }));
    const { error, count } = await context.supabase
      .from("launch_units")
      .insert(payload as never, { count: "exact" });
    if (error) throw new Error(error.message);
    return { ok: true, inserted: count ?? data.rows.length };
  });

// ===== CONDIÇÕES DE PAGAMENTO =====
const pcSchema = z.object({
  project_id: z.string().uuid(),
  entrada: z.number().nullable().optional(),
  sinal: z.number().positive("Sinal deve ser maior que zero"),
  parcela_30: z.number().nullable().optional(),
  parcela_60: z.number().nullable().optional(),
  parcela_90: z.number().nullable().optional(),
  num_parcelas: z.number().int().nonnegative(),
  valor_parcela: z.number().nonnegative(),
  qtd_anuais: z.number().int().nullable().optional(),
  valor_anual: z.number().nullable().optional(),
  qtd_semestrais: z.number().int().nullable().optional(),
  valor_semestral: z.number().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

export const adminObterCondicoesPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("launch_payment_conditions")
      .select("*")
      .eq("project_id", data.project_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminSalvarCondicoesPagamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(pcSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("launch_payment_conditions")
      .upsert(data as never, { onConflict: "project_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== PDFs =====
const PDF_KIND = ["tabela_precos","manual"] as const;

export const adminListarPdfsLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ project_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("launch_pdfs")
      .select("id, kind, titulo, storage_path, tamanho_bytes, created_at")
      .eq("project_id", data.project_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminAdicionarPdfLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    project_id: z.string().uuid(),
    kind: z.enum(PDF_KIND),
    titulo: z.string().nullable().optional(),
    storage_path: z.string().min(1),
    tamanho_bytes: z.number().int().optional(),
  }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("launch_pdfs").insert({ ...data, uploaded_by: context.userId } as never);
    if (error) throw new Error(error.message);

    // Rotação: tabela_precos manter no máx. 3; manual sem limite
    if (data.kind === "tabela_precos") {
      const { data: lista } = await context.supabase
        .from("launch_pdfs")
        .select("id, storage_path, created_at")
        .eq("project_id", data.project_id)
        .eq("kind", "tabela_precos")
        .order("created_at", { ascending: false });
      const extras = (lista ?? []).slice(3);
      if (extras.length > 0) {
        await context.supabase.storage.from("lancamentos")
          .remove(extras.map((e: { storage_path: string }) => e.storage_path));
        await context.supabase.from("launch_pdfs")
          .delete().in("id", extras.map((e: { id: string }) => e.id));
      }
    }
    return { ok: true };
  });

export const adminRemoverPdfLancamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), storage_path: z.string() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await context.supabase.storage.from("lancamentos").remove([data.storage_path]);
    const { error } = await context.supabase.from("launch_pdfs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });



// ===== PÚBLICO =====
import { createClient as createPublicClient } from "@supabase/supabase-js";
function sbPublic() {
  return createPublicClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const listarLancamentosPublico = createServerFn({ method: "GET" }).handler(async () => {
  const sb = sbPublic();
  const { data, error } = await sb
    .from("launch_projects")
    .select("id, slug, nome, construtora, entrega, destaque, imagem_capa, endereco, status:status_id(nome,slug)")
    .eq("publicado", true)
    .order("destaque", { ascending: false })
    .order("entrega", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  // Assina capas (800px) no servidor para evitar exposição do admin signer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await Promise.all(rows.map(async (r: any) => {
    let capa_url: string | null = null;
    if (r.imagem_capa) {
      if (r.imagem_capa.startsWith("http")) capa_url = r.imagem_capa;
      else {
        const { data: s } = await sb.storage.from("lancamentos")
          .createSignedUrl(r.imagem_capa, 60 * 60 * 24, { transform: { width: 800, quality: 70, resize: "contain" as const } });
        capa_url = s?.signedUrl ?? null;
      }
    }
    return { ...r, capa_url };
  }));
});


export const obterLancamentoPublico = createServerFn({ method: "POST" })
  .inputValidator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const sb = sbPublic();
    const { data: proj, error } = await sb
      .from("launch_projects")
      .select(`
        id, slug, nome, descricao, quartos, suites, vagas, area_apartamentos,
        construtora, entrega, endereco, arquitetura,
        numero_unidades, numero_torres, unidades_por_andar, numero_andares, elevadores,
        imagem_capa, video_url, meta_title, meta_description, og_image,
        status:status_id(nome,slug),
        corretor:corretor_id(id,nome,telefone,whatsapp,foto_url,creci),
        cidade:cidade_id(nome,uf),
        bairro:bairro_id(nome)
      `)
      .eq("slug", data.slug)
      .eq("publicado", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!proj) return null;

    const [{ data: amenRows }, { data: imagens }, { data: pdfs }, { data: pc }, { data: units }] = await Promise.all([
      sb.from("launch_project_amenities").select("amenity:amenity_id(slug,nome)").eq("project_id", proj.id),
      sb.from("launch_project_imagens").select("id,storage_path,legenda,ordem").eq("project_id", proj.id).order("ordem"),
      sb.from("launch_pdfs").select("id,kind,titulo,storage_path,created_at").eq("project_id", proj.id).order("created_at", { ascending: false }),
      sb.from("launch_payment_conditions").select("*").eq("project_id", proj.id).maybeSingle(),
      sb.from("launch_units").select("id,unidade,bloco,area,tipo,vagas,valor,status").eq("project_id", proj.id).eq("ativa", true).order("bloco").order("unidade"),
    ]);

    // gerar URLs assinadas (24h) para imagens e PDFs
    async function signOne(path: string, width?: number) {
      const opts = width ? { transform: { width, quality: 75, resize: "contain" as const } } : undefined;
      const { data: s } = await sb.storage.from("lancamentos").createSignedUrl(path, 60 * 60 * 24, opts);
      return s?.signedUrl ?? null;
    }

    const imagensSigned = await Promise.all(
      (imagens ?? []).map(async (i: { id: string; storage_path: string; legenda: string | null; ordem: number }) => ({
        ...i,
        url: await signOne(i.storage_path, 1600),
        thumb: await signOne(i.storage_path, 400),
      })),
    );
    const pdfsSigned = await Promise.all(
      (pdfs ?? []).map(async (p: { id: string; kind: string; titulo: string | null; storage_path: string; created_at: string }) => ({
        ...p, url: await signOne(p.storage_path),
      })),
    );
    const capaUrl = proj.imagem_capa ? await signOne(proj.imagem_capa, 1920) : null;
    const ogImageUrl = proj.og_image ? await signOne(proj.og_image, 1200) : capaUrl;

    // estatística rápida de preços
    const precos = (units ?? []).map((u: { valor: number | null }) => u.valor).filter((v: number | null): v is number => typeof v === "number" && v > 0);
    const precoMin = precos.length ? Math.min(...precos) : null;
    const precoMax = precos.length ? Math.max(...precos) : null;

    return {
      ...proj,
      imagem_capa_url: capaUrl,
      og_image_url: ogImageUrl,
      amenities: (amenRows ?? []).map((a: { amenity: { slug: string; nome: string } | null }) => a.amenity).filter(Boolean),
      imagens: imagensSigned,
      pdfs: pdfsSigned,
      tabela_precos_atual: pdfsSigned.find((p) => p.kind === "tabela_precos") ?? null,
      condicoes: pc ?? null,
      unidades: units ?? [],
      preco_min: precoMin,
      preco_max: precoMax,
    };
  });

