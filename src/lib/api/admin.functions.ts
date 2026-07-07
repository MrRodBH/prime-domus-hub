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
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  base: string,
  ignoreId?: string,
): Promise<string> {
  const root = base || "usuario";
  let slug = root;
  let i = 2;
  while (true) {
    const { data } = await supabase.from("corretores").select("id").eq("slug", slug).maybeSingle();
    const row = data as { id?: string } | null;
    if (!row || row.id === ignoreId) return slug;
    slug = `${root}-${i++}`;
  }
}

const sobrenomeRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,40}$/;
const corretorSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  sobrenome: z
    .string()
    .regex(sobrenomeRegex, "Sobrenome inválido (apenas letras, um único sobrenome)")
    .optional()
    .nullable(),
  cpf: z.string().optional().nullable(),
  creci: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  foto_url: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
  status: z.enum(["ativo", "inativo", "bloqueado", "pendente"]).optional(),
  team_id: z.string().uuid().nullable().optional(),
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
    const base = slugify(`${data.nome} ${data.sobrenome ?? ""}`);
    const slug = await uniqueSlug(context.supabase, base, data.id);
    const payload = { ...data, slug };
    if (data.id) {
      const { error } = await context.supabase.from("corretores").update(payload as never).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("corretores").insert(payload as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminExcluirCorretor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    // Busca o user_id vinculado (se houver) antes de excluir o corretor
    const { data: row } = await context.supabase
      .from("corretores")
      .select("user_id")
      .eq("id", data.id)
      .maybeSingle();
    const userId = (row as { user_id?: string | null } | null)?.user_id ?? null;

    const { error } = await context.supabase.from("corretores").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    // Remove papéis e o próprio usuário do Auth para liberar o e-mail
    if (userId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (delAuthErr && !/not.?found/i.test(delAuthErr.message)) {
        // não falha a operação principal, mas avisa no log do servidor
        console.error("[adminExcluirCorretor] auth.deleteUser:", delAuthErr.message);
      }
    }
    return { ok: true };
  });

// ===== PAPÉIS / USUÁRIOS COM LOGIN =====
const roleEnum = z.enum(["admin", "corretor", "secretaria", "gerente", "captador"]);

// Retorna os papéis do usuário autenticado atual.
export const meusPapeis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => (r as { role: string }).role);
  });

// Verifica se o usuário atual tem acesso ao admin (possui pelo menos
// um papel de sistema OU um perfil RBAC vinculado).
export const meuAcessoAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: profs }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("user_profiles").select("profile_id").eq("user_id", context.userId),
    ]);
    return (roles?.length ?? 0) > 0 || (profs?.length ?? 0) > 0;
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


// Aplica o perfil principal de um usuário, sincronizando user_roles e user_profiles.
// - Se o perfil é de sistema (codigo == app_role), define user_roles=[codigo] e
//   o trigger sincroniza user_profiles automaticamente.
// - Se o perfil é custom, limpa user_roles e grava user_profiles=[profile_id].
async function aplicarPerfilUsuario(userId: string, profileId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prof, error: pErr } = await supabaseAdmin
    .from("rbac_profiles")
    .select("id, codigo, sistema")
    .eq("id", profileId)
    .single();
  if (pErr || !prof) throw new Error(pErr?.message ?? "Perfil não encontrado");

  const SYS_CODES = new Set(["admin", "corretor", "secretaria", "gerente", "captador"]);
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_profiles").delete().eq("user_id", userId);

  if (prof.sistema && prof.codigo && SYS_CODES.has(prof.codigo)) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: prof.codigo } as never);
    if (error) throw new Error(error.message);
    // Trigger tg_user_roles_sync_profiles preenche user_profiles.
    // Garante o vínculo direto também (idempotente).
    await supabaseAdmin
      .from("user_profiles")
      .upsert({ user_id: userId, profile_id: profileId } as never, {
        onConflict: "user_id,profile_id",
      });
  } else {
    const { error } = await supabaseAdmin
      .from("user_profiles")
      .insert({ user_id: userId, profile_id: profileId } as never);
    if (error) throw new Error(error.message);
  }
}

// Define o perfil principal de um usuário existente (Admin).
export const adminDefinirPerfilUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({ user_id: z.string().uuid(), profile_id: z.string().uuid() }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    await aplicarPerfilUsuario(data.user_id, data.profile_id);
    return { ok: true };
  });

// Cria login (auth.users) + perfil + vincula a um corretor existente OU cria novo.
export const adminCriarUsuarioComLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      corretor_id: z.string().uuid().optional(),
      nome: z.string().min(2),
      sobrenome: z
        .string()
        .regex(sobrenomeRegex, "Sobrenome inválido (apenas letras, um único sobrenome)")
        .optional()
        .nullable(),
      email: z.string().email(),
      password: z.string().min(6),
      telefone: z.string().optional().nullable(),
      whatsapp: z.string().optional().nullable(),
      creci: z.string().optional().nullable(),
      cargo: z.string().optional().nullable(),
      foto_url: z.string().optional().nullable(),
      bio: z.string().optional().nullable(),
      profile_id: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verifica se já existe usuário com esse e-mail (no Auth ou em corretores)
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existing?.users.find((u) => u.email === data.email);

    const { data: corretorByEmail } = await context.supabase
      .from("corretores")
      .select("id, user_id")
      .eq("email", data.email)
      .maybeSingle();

    if (!data.corretor_id && (existingUser || corretorByEmail)) {
      throw new Error(
        `Já existe um usuário cadastrado com o e-mail ${data.email}. Edite o usuário existente em vez de criar um novo.`,
      );
    }

    let userId = existingUser?.id;
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

    let corretorId = data.corretor_id ?? null;
    if (!corretorId) {
      const { data: byUser } = await context.supabase
        .from("corretores")
        .select("id")
        .eq("user_id", userId!)
        .maybeSingle();
      corretorId = (byUser as { id?: string } | null)?.id ?? null;
    }
    if (!corretorId) {
      corretorId = (corretorByEmail as { id?: string } | null)?.id ?? null;
    }

    const baseSlug = slugify(`${data.nome} ${data.sobrenome ?? ""}`);
    const slug = await uniqueSlug(context.supabase, baseSlug, corretorId ?? undefined);

    const corretorPayload = {
      nome: data.nome,
      sobrenome: data.sobrenome ?? null,
      slug,
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

    if (corretorId) {
      const { error } = await context.supabase
        .from("corretores")
        .update(corretorPayload as never)
        .eq("id", corretorId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("corretores").insert(corretorPayload as never);
      if (error) throw new Error(error.message);
    }

    // Aplica perfil principal (sincroniza user_roles + user_profiles)
    await aplicarPerfilUsuario(userId!, data.profile_id);

    // Envia e-mail para o usuário definir senha definitiva (best-effort)
    let emailSent = false;
    try {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: data.email,
        options: {
          redirectTo: "https://rmprimeimoveis.com.br/reset-password",
        },
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

// Atualiza apenas os papéis de um usuário existente (compat — não usado pela UI nova).
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


// Admin: altera a senha de qualquer usuário (não exige e-mail de validação).
// Envia notificação informativa ao usuário avisando da alteração.
export const adminAlterarSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      user_id: z.string().uuid(),
      new_password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
      data.user_id,
    );
    if (getErr || !userRes?.user) throw new Error(getErr?.message ?? "Usuário não encontrado");
    const targetEmail = userRes.user.email;

    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (upErr) throw new Error(upErr.message);

    // Busca nome do corretor para personalizar e-mail
    let nome = "";
    if (targetEmail) {
      const { data: cor } = await supabaseAdmin
        .from("corretores")
        .select("nome")
        .eq("user_id", data.user_id)
        .maybeSingle();
      nome = (cor as { nome?: string } | null)?.nome ?? "";
    }

    let emailSent = false;
    if (targetEmail) {
      try {
        const { enqueueTransactional } = await import("@/lib/email/notify.server");
        const res = await enqueueTransactional({
          templateName: "senha-alterada",
          to: targetEmail,
          templateData: {
            nome,
            alterado_por: "um administrador",
            quando: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          },
          idempotencyKey: `senha-alterada-${data.user_id}-${Date.now()}`,
        });
        emailSent = !!res.ok;
      } catch {
        // não falha o fluxo se o e-mail não puder ser enviado
      }
    }

    return { ok: true, email_sent: emailSent };
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
      .select("*, imovel:imoveis(titulo, slug, preco, preco_sob_consulta)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminAtualizarLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["novo", "conversando", "visita", "proposta", "ganho", "perdido", "descartado"]).optional(),
      observacoes: z.string().optional(),
      valor_estimado: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("leads").update(rest as never).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== LEAD MANUAL (admin ou corretor) =====
export const adminListarImoveisLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // qualquer usuário autenticado pode listar imóveis para vincular ao lead
    const { data, error } = await context.supabase
      .from("imoveis")
      .select("id, codigo, titulo, corretor_id")
      .eq("status", "ativo")
      .order("titulo", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; codigo: string; titulo: string; corretor_id: string | null }>;
  });

export const criarLeadManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      nome: z.string().min(2),
      email: z.string().email().optional().nullable(),
      telefone: z.string().optional().nullable(),
      imovel_id: z.string().uuid().optional().nullable(),
      observacoes: z.string().optional().nullable(),
      assigned_to: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: isCorretor } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "corretor",
    });
    if (!isAdmin && !isCorretor) {
      throw new Error("Acesso negado.");
    }
    // Corretor sempre força para si mesmo; admin pode escolher.
    const assigned = isAdmin ? (data.assigned_to ?? context.userId) : context.userId;

    // Resolve corretor_id da tabela corretores pelo user_id atribuído
    const { data: corretorRow } = await context.supabase
      .from("corretores")
      .select("id")
      .eq("user_id", assigned)
      .maybeSingle();
    const corretor_id = (corretorRow as { id?: string } | null)?.id ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      nome: data.nome,
      email: data.email ?? null,
      telefone: data.telefone ?? null,
      imovel_id: data.imovel_id ?? null,
      mensagem: data.observacoes ?? null,
      origem: "Cadastro Manual",
      status: "novo",
      assigned_to: assigned,
      corretor_id,
      consent_lgpd: true,
      consent_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("leads").insert(payload as never);
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

    // M3.4 — Signed URL Hardening:
    //  1) Tenant efetivo server-side (IA-001).
    //  2) Bucket precisa estar na allowlist tenant-scoped.
    //  3) Path precisa começar com `${tenantId}/` e passar por anti-traversal.
    //  4) TTL curto (preview admin = 15 min).
    const { validateTenantSignRequest, SIGNED_URL_TTL_PREVIEW_SECONDS } =
      await import("@/lib/storage/signed-url");
    const { data: tenantRow, error: tenantErr } = await context.supabase.rpc(
      "get_current_tenant_id",
    );
    if (tenantErr) throw new Error(tenantErr.message);
    const tenantId = tenantRow as string | null;
    if (!tenantId) throw new Error("Tenant efetivo não resolvido — assinatura negada.");

    const { bucket, path } = validateTenantSignRequest({
      bucket: data.bucket,
      path: data.path,
      tenantId,
    });

    const opts = data.width
      ? { transform: { width: data.width, quality: data.quality ?? 70, resize: "contain" as const } }
      : undefined;
    const { data: signed, error } = await context.supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_PREVIEW_SECONDS, opts);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

