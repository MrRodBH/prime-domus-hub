import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireTenant } from "@/integrations/supabase/tenant-middleware";
import { requireTenantScopedAuthority } from "@/lib/api/tenant-scoped-authority";
import {
  authorizeTenantAccessControlOperation,
  trustedTenantAccessContext,
} from "@/lib/api/tenant-access-control-authority.server";

export type BrokerDirectoryView = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  nome: string;
  sobrenome: string | null;
  ativo: boolean;
  team_id: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  foto_url: string | null;
  status: "ativo" | "inativo" | "bloqueado" | "pendente";
  creci: string | null;
  cpf: string | null;
  slug: string;
  bio: string | null;
};

function slugify(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueTenantSlug(admin: any, tenantId: string, base: string, ignoreId?: string) {
  const root = base || "corretor";
  const { data, error } = await admin
    .from("corretores")
    .select("id, slug")
    .eq("tenant_id", tenantId)
    .like("slug", `${root}%`);
  if (error) throw new Error("Falha ao validar slug do corretor.");
  const rows = (data ?? []) as Array<{ id: string; slug: string }>;
  const used = new Set(rows.filter((row) => row.id !== ignoreId).map((row) => row.slug));
  if (!used.has(root)) return root;
  let suffix = 2;
  while (used.has(`${root}-${suffix}`)) suffix += 1;
  return `${root}-${suffix}`;
}

const brokerSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(2).max(120),
  sobrenome: z.string().trim().max(80).optional().nullable(),
  cpf: z.string().trim().max(20).optional().nullable(),
  creci: z.string().trim().max(60).optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  telefone: z.string().trim().max(40).optional().nullable(),
  whatsapp: z.string().trim().max(40).optional().nullable(),
  cargo: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(5000).optional().nullable(),
  foto_url: z.string().trim().max(2000).optional().nullable(),
  ativo: z.boolean().optional().default(true),
  status: z.enum(["ativo", "inativo", "bloqueado", "pendente"]).optional().default("ativo"),
  team_id: z.string().uuid().optional().nullable(),
}).strict();

export const adminListarCorretores = createServerFn({ method: "GET" })
  .middleware([requireTenant])
  .handler(async ({ context }): Promise<BrokerDirectoryView[]> => {
    const { tenantId } = await authorizeTenantAccessControlOperation(trustedTenantAccessContext(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("corretores")
      .select("id, tenant_id, user_id, nome, sobrenome, ativo, team_id, cargo, email, telefone, whatsapp, foto_url, status, creci, cpf, slug, bio")
      .eq("tenant_id", tenantId)
      .order("nome", { ascending: true });
    if (error) throw new Error("Falha ao listar o diretório de corretores.");
    return (data ?? []) as BrokerDirectoryView[];
  });

export const adminSalvarCorretor = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(brokerSchema)
  .handler(async ({ context, data }): Promise<{ ok: true; id: string; accessLifecycleChanged: false }> => {
    const tenantId = requireTenantScopedAuthority(context.tenant, "Broker Directory");
    await authorizeTenantAccessControlOperation(trustedTenantAccessContext(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    let existing: { id: string; tenant_id: string; user_id: string | null } | null = null;
    if (data.id) {
      const result = await admin.from("corretores").select("id, tenant_id, user_id").eq("tenant_id", tenantId).eq("id", data.id).maybeSingle();
      if (result.error || !result.data) throw new Error("Corretor não encontrado neste tenant.");
      existing = result.data as { id: string; tenant_id: string; user_id: string | null };
    }

    if (data.team_id) {
      const { data: team, error: teamError } = await admin.from("teams").select("id").eq("tenant_id", tenantId).eq("id", data.team_id).maybeSingle();
      if (teamError || !team) throw new Error("Equipe não encontrada neste tenant.");
    }

    const slug = await uniqueTenantSlug(admin, tenantId, slugify(`${data.nome} ${data.sobrenome ?? ""}`), data.id);
    const payload = {
      tenant_id: tenantId,
      nome: data.nome,
      sobrenome: data.sobrenome ?? null,
      cpf: data.cpf ?? null,
      creci: data.creci ?? null,
      email: data.email ?? null,
      telefone: data.telefone ?? null,
      whatsapp: data.whatsapp ?? null,
      cargo: data.cargo ?? null,
      bio: data.bio ?? null,
      foto_url: data.foto_url ?? null,
      ativo: data.ativo,
      status: data.status,
      team_id: data.team_id ?? null,
      slug,
      user_id: existing?.user_id ?? null,
    };

    if (data.id) {
      const { error } = await admin.from("corretores").update(payload).eq("tenant_id", tenantId).eq("id", data.id);
      if (error) throw new Error("Falha ao atualizar o corretor.");
      return { ok: true, id: data.id, accessLifecycleChanged: false };
    }

    const { data: inserted, error } = await admin.from("corretores").insert(payload).select("id").single();
    if (error || !inserted) throw new Error("Falha ao criar o registro do corretor.");
    return { ok: true, id: inserted.id as string, accessLifecycleChanged: false };
  });

export const adminExcluirCorretor = createServerFn({ method: "POST" })
  .middleware([requireTenant])
  .inputValidator(z.object({ id: z.string().uuid() }).strict())
  .handler(async ({ context, data }): Promise<{ ok: true; archived: true; authUserDeleted: false; membershipChanged: false }> => {
    const tenantId = requireTenantScopedAuthority(context.tenant, "Broker Directory");
    await authorizeTenantAccessControlOperation(trustedTenantAccessContext(context));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readError } = await (supabaseAdmin as any)
      .from("corretores")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("id", data.id)
      .maybeSingle();
    if (readError || !existing) throw new Error("Corretor não encontrado neste tenant.");
    const { error } = await (supabaseAdmin as any)
      .from("corretores")
      .update({ ativo: false, status: "inativo" })
      .eq("tenant_id", tenantId)
      .eq("id", data.id);
    if (error) throw new Error("Falha ao arquivar o corretor.");
    return { ok: true, archived: true, authUserDeleted: false, membershipChanged: false };
  });
