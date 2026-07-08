// F3.4 — Tenant Selection Transport / Client State
//
// Server function autoritativa que lista os tenants selecionáveis do
// usuário autenticado (`active-only`). É a ÚNICA fonte autorizada para
// popular o Tenant Selector do client. O client NÃO deve consultar
// `tenant_members` diretamente para construir tenants selecionáveis.
//
// Contrato (Hard Gate §3.1):
//   • Executa server-side;
//   • usa `auth.uid()` server-side via `requireSupabaseAuth` (userId do
//     token validado — nunca aceita `user_id` do client);
//   • filtro obrigatório `membership_status = 'active'`;
//   • payload mínimo (id, nome, slug) — sem billing/plano/trial/role;
//   • Super Admin não usa esta função como fluxo de impersonação
//     (a listagem para SA continua sendo o Super Panel existente).
//
// PROIBIÇÕES: is_default, is_owner, tenant_role, ORDER BY sobre
// prioridade, LIMIT 1, fallback, tenant default, `membership_status`
// vindo do client, `user_id` vindo do client.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SelectableTenant {
  tenantId: string;
  name: string;
  slug: string | null;
}

export const listSelectableTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SelectableTenant[]> => {
    // userId vem SEMPRE do token validado no server (requireSupabaseAuth).
    // Nenhum parâmetro do client é aceito.
    const { data, error } = await context.supabase
      .from("tenant_members")
      .select("tenant_id, tenants:tenant_id(id, nome, slug)")
      .eq("user_id", context.userId)
      .eq("membership_status", "active");

    if (error) {
      throw new Error(`listSelectableTenants failed: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      tenant_id: string;
      tenants: { id: string; nome: string; slug: string | null } | null;
    }>;

    return rows
      .filter((r) => r.tenants !== null)
      .map((r) => ({
        tenantId: r.tenants!.id,
        name: r.tenants!.nome,
        slug: r.tenants!.slug ?? null,
      }));
  });
