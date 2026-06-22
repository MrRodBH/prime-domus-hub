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
  rua: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  bairro_id: z.string().uuid().nullable().optional(),
  corretor_id: z.string().uuid().nullable().optional(),
  badge: z.string().nullable().optional(),
  destaque: z.boolean().default(false),
  exclusivo: z.boolean().default(false),
  caracteristicas: z.array(z.string()).optional().default([]),
  imagem_capa: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  video_url: z.string().url().nullable().optional().or(z.literal("")),
  tour_url: z.string().url().nullable().optional().or(z.literal("")),
  mostrar_rua: z.boolean().default(false),
  mostrar_endereco_completo: z.boolean().default(false),
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
    const basePayload = { ...data, publicado_em: data.status === "ativo" ? new Date().toISOString() : null };
    if (data.id) {
      const { error } = await context.supabase.from("imoveis").update(basePayload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const payload = { ...basePayload, created_by: context.userId };
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

export const adminReordenarImagens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      imovel_id: z.string().uuid(),
      ordem: z.array(z.object({ id: z.string().uuid(), ordem: z.number().int() })),
      imagem_capa: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    for (const item of data.ordem) {
      const { error } = await context.supabase
        .from("imovel_imagens")
        .update({ ordem: item.ordem } as never)
        .eq("id", item.id)
        .eq("imovel_id", data.imovel_id);
      if (error) throw new Error(error.message);
    }
    if (data.imagem_capa !== undefined) {
      const { error } = await context.supabase
        .from("imoveis")
        .update({ imagem_capa: data.imagem_capa } as never)
        .eq("id", data.imovel_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Define apenas a imagem de capa do imóvel, sem alterar ordem.
export const adminDefinirCapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ imovel_id: z.string().uuid(), imagem_id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: img, error: e1 } = await context.supabase
      .from("imovel_imagens")
      .select("url")
      .eq("id", data.imagem_id)
      .eq("imovel_id", data.imovel_id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    const url = (img as { url?: string } | null)?.url;
    if (!url) throw new Error("Imagem não encontrada.");
    const { error: e2 } = await context.supabase
      .from("imoveis")
      .update({ imagem_capa: url } as never)
      .eq("id", data.imovel_id);
    if (e2) throw new Error(e2.message);
    return { ok: true, imagem_capa: url };
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

// ===== PAPÉIS / USUÁRIOS COM LOGIN =====
const roleEnum = z.enum(["admin", "corretor", "secretaria"]);

// Retorna os papéis do usuário autenticado atual.
export const meusPapeis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) return [] as string[];
    return (data ?? []).map((r) => (r as { role: string }).role);
  });

// Lista papéis de cada corretor (para a tabela do admin).
export const adminListarPapeisPorUsuario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase.from("user_roles").select("user_id, role");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ user_id: string; role: string }>;
  });

// Cria login (auth.users) + papéis + vincula a um corretor existente OU cria novo.
export const adminCriarUsuarioComLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      corretor_id: z.string().uuid().optional(),
      nome: z.string().min(2),
      slug: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      telefone: z.string().optional().nullable(),
      whatsapp: z.string().optional().nullable(),
      creci: z.string().optional().nullable(),
      cargo: z.string().optional().nullable(),
      foto_url: z.string().optional().nullable(),
      bio: z.string().optional().nullable(),
      roles: z.array(roleEnum).min(1),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Cria ou recupera o usuário no Auth
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    let userId = existing?.users.find((u) => u.email === data.email)?.id;
    const isNewAuthUser = !userId;
    if (!userId) {
      const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (cErr || !created.user) throw new Error(cErr?.message ?? "Falha ao criar usuário");
      userId = created.user.id;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
    }

    // Resolve corretor alvo: id fornecido, ou existente por user_id, ou por email, ou cria novo
    let corretorId = data.corretor_id ?? null;
    if (!corretorId) {
      const { data: byUser } = await context.supabase
        .from("corretores")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      corretorId = (byUser as { id?: string } | null)?.id ?? null;
    }
    if (!corretorId && data.email) {
      const { data: byEmail } = await context.supabase
        .from("corretores")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();
      corretorId = (byEmail as { id?: string } | null)?.id ?? null;
    }

    const corretorPayload = {
      nome: data.nome,
      slug: data.slug,
      email: data.email,
      telefone: data.telefone ?? null,
      whatsapp: data.whatsapp ?? null,
      creci: data.creci ?? null,
      cargo: data.cargo ?? null,
      foto_url: data.foto_url ?? null,
      bio: data.bio ?? null,
      ativo: true,
      user_id: userId,
    };

    const friendlySlug = (msg: string) =>
      msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")
        ? `Já existe um usuário com o slug "${data.slug}". Use outro slug.`
        : msg;

    if (corretorId) {
      const { error } = await context.supabase
        .from("corretores")
        .update(corretorPayload as never)
        .eq("id", corretorId);
      if (error) throw new Error(friendlySlug(error.message));
    } else {
      const { error } = await context.supabase.from("corretores").insert(corretorPayload as never);
      if (error) throw new Error(friendlySlug(error.message));
    }

    // Sincroniza papéis: remove os existentes e insere os novos
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const rolesRows = data.roles.map((role) => ({ user_id: userId!, role }));
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert(rolesRows as never);
    if (rErr) throw new Error(rErr.message);

    // Envia e-mail para o usuário definir senha definitiva (best-effort)
    let emailSent = false;
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
      });
      const link =
        linkData?.properties?.action_link ??
        (linkData as { action_link?: string } | null)?.action_link ??
        "";
      if (link) {
        const { enqueueTransactional } = await import("@/lib/email/notify.server");
        const res = await enqueueTransactional({
          templateName: "definir-senha",
          to: data.email,
          templateData: { nome: data.nome, link },
          idempotencyKey: `definir-senha-${userId}-${Date.now()}`,
        });
        emailSent = !!res.ok;
      }
    } catch {
      // não derruba o cadastro caso o envio falhe
    }

    return { ok: true, user_id: userId, email_sent: emailSent, created_auth: isNewAuthUser };
  });

// Atualiza apenas os papéis de um usuário existente.
export const adminAtualizarPapeis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), roles: z.array(roleEnum).min(1) }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const rows = data.roles.map((role) => ({ user_id: data.user_id, role }));
    const { error } = await supabaseAdmin.from("user_roles").insert(rows as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== CIDADES =====
const cidadeSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  slug: z.string().min(2),
  estado: z.string().min(2).default("MG"),
});

export const adminListarCidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("cidades")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(cidadeSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const friendly = (msg: string) =>
      msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")
        ? `Já existe uma cidade com o slug "${data.slug}".`
        : msg;
    if (data.id) {
      const { error } = await context.supabase.from("cidades").update(data as never).eq("id", data.id);
      if (error) throw new Error(friendly(error.message));
    } else {
      const { error } = await context.supabase.from("cidades").insert(data as never);
      if (error) throw new Error(friendly(error.message));
    }
    return { ok: true };
  });

export const adminExcluirCidade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("cidades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== BAIRROS =====
const bairroSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  slug: z.string().min(2),
  cidade_id: z.string().uuid().nullable().optional(),
  descricao: z.string().optional().nullable(),
  imagem_url: z.string().optional().nullable(),
  destaque: z.boolean().default(false),
});

export const adminListarBairros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("bairros")
      .select("*, cidade:cidades(id, nome, slug, estado)")
      .order("nome", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSalvarBairro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(bairroSchema)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const friendly = (msg: string) =>
      msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")
        ? `Já existe um bairro com o slug "${data.slug}". Edite o existente ou use outro slug.`
        : msg;
    if (data.id) {
      const { error } = await context.supabase.from("bairros").update(data as never).eq("id", data.id);
      if (error) throw new Error(friendly(error.message));
    } else {
      const { data: existente } = await context.supabase
        .from("bairros")
        .select("id")
        .eq("slug", data.slug)
        .maybeSingle();
      if (existente?.id) {
        throw new Error(
          `Já existe um bairro com o slug "${data.slug}". Abra o bairro existente para editar.`,
        );
      }
      const { error } = await context.supabase.from("bairros").insert(data as never);
      if (error) throw new Error(friendly(error.message));
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
      status: z.enum(["novo", "conversando", "visita", "proposta", "ganho", "perdido"]).optional(),
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
  .inputValidator(
    z.object({
      bucket: z.string(),
      path: z.string(),
      width: z.number().int().positive().optional(),
      quality: z.number().int().min(20).max(100).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const opts = data.width
      ? { transform: { width: data.width, quality: data.quality ?? 70, resize: "contain" as const } }
      : undefined;
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 60 * 24 * 365, opts);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
