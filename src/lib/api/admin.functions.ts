import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> }; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado: requer permissão de administrador.");
}

// ===== Bootstrap: cria o primeiro admin se ainda não existir nenhum =====
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Se já existe pelo menos um admin, não faz nada (idempotente / seguro)
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) {
      return { ok: true, alreadyInitialized: true };
    }

    // Procura usuário existente
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    let userId = existing?.users.find((u) => u.email === data.email)?.id;

    if (!userId) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (createErr || !created.user) throw new Error(createErr?.message ?? "Falha ao criar usuário");
      userId = created.user.id;
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

    return { ok: true, alreadyInitialized: false };
  });

// ===== Verifica se o usuário atual é admin =====
export const sourMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { userId: context.userId, isAdmin: !!data };
  });

// ===== IMÓVEIS =====
const imovelSchema = z.object({
  id: z.string().uuid().optional(),
  codigo: z.string().min(1),
  titulo: z.string().min(2),
  slug: z.string().min(2),
  descricao: z.string().optional().nullable(),
  finalidade: z.enum(["venda", "aluguel", "lancamento"]),
  tipo: z.string().min(1),
  status: z.enum(["ativo", "rascunho", "vendido", "reservado"]).default("ativo"),
  preco: z.number().nullable().optional(),
  preco_sob_consulta: z.boolean().default(false),
  condominio: z.number().nullable().optional(),
  iptu: z.number().nullable().optional(),
  area_total: z.number().nullable().optional(),
  area_util: z.number().nullable().optional(),
  quartos: z.number().int().nullable().optional(),
  suites: z.number().int().nullable().optional(),
  banheiros: z.number().int().nullable().optional(),
  vagas: z.number().int().nullable().optional(),
  endereco: z.string().nullable().optional(),
  bairro_id: z.string().uuid().nullable().optional(),
  corretor_id: z.string().uuid().nullable().optional(),
  badge: z.string().nullable().optional(),
  destaque: z.boolean().default(false),
  exclusivo: z.boolean().default(false),
  caracteristicas: z.array(z.string()).optional().default([]),
  imagem_capa: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

export const adminListarImoveis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("imoveis")
      .select("id, codigo, titulo, slug, finalidade, tipo, status, preco, destaque, bairro:bairros(nome), updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminObterImovel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: imovel, error } = await context.supabase
      .from("imoveis")
      .select("*, imagens:imovel_imagens(id, url, alt, ordem)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return imovel;
  });

export const adminSalvarImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(imovelSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload = { ...data, publicado_em: data.status === "ativo" ? new Date().toISOString() : null };
    if (data.id) {
      const { error } = await context.supabase.from("imoveis").update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const { data: inserted, error } = await context.supabase
        .from("imoveis")
        .insert(payload as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, id: (inserted as { id: string }).id };
    }
  });

export const adminExcluirImovel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("imoveis").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== IMAGENS =====
export const adminAdicionarImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      imovel_id: z.string().uuid(),
      url: z.string().min(1), // path no bucket "imoveis"
      alt: z.string().optional(),
      ordem: z.number().int().default(0),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("imovel_imagens").insert(data as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoverImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), path: z.string().optional() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.path && !data.path.startsWith("http")) {
      await context.supabase.storage.from("imoveis").remove([data.path]);
    }
    const { error } = await context.supabase.from("imovel_imagens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== CORRETORES =====
const corretorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  slug: z.string().min(2),
  creci: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  foto_url: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export const adminListarCorretores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("corretores")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarCorretor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(corretorSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("corretores").update(data as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("corretores").insert(data as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminExcluirCorretor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("corretores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== BAIRROS =====
const bairroSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  slug: z.string().min(2),
  cidade: z.string().default("Belo Horizonte"),
  estado: z.string().default("MG"),
  descricao: z.string().optional().nullable(),
  imagem_url: z.string().optional().nullable(),
  destaque: z.boolean().default(false),
  ordem: z.number().int().default(0),
});

export const adminListarBairros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase.from("bairros").select("*").order("ordem");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarBairro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(bairroSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("bairros").update(data as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("bairros").insert(data as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminExcluirBairro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("bairros").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== LEADS =====
export const adminListarLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("leads")
      .select("*, imovel:imoveis(titulo, slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminAtualizarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["novo", "em_atendimento", "qualificado", "ganho", "perdido"]).optional(),
      observacoes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("leads").update(rest as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== STORAGE =====
export const adminAssinarUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ bucket: z.string(), path: z.string() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
