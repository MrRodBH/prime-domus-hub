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
