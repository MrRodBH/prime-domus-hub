// Tenant Repository — abstração de acesso a memberships.
// Isola o algoritmo de resolução de tenant da fonte de dados concreta
// (banco, cache, serviço interno, federação de identidade).
//
// Conforme IA-001 §12 e ROADMAP §4.1 (Anti-SQL Leakage Rule):
// o algoritmo de resolução NÃO deve depender de SQL diretamente.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface TenantMembership {
  tenantId: string;
}

export interface TenantRepository {
  /** Retorna TODAS as memberships válidas do usuário. Sem LIMIT, sem ordenação implícita. */
  listByUser(userId: string): Promise<TenantMembership[]>;
  /** Verifica se o tenantId informado existe. */
  exists(tenantId: string): Promise<boolean>;
}

export function createSupabaseTenantRepository(
  supabase: SupabaseClient<Database>,
): TenantRepository {
  return {
    async listByUser(userId: string): Promise<TenantMembership[]> {
      const { data, error } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", userId);
      if (error) throw new Error(`tenantRepository.listByUser failed: ${error.message}`);
      return (data ?? []).map((r) => ({ tenantId: r.tenant_id as string }));
    },
    async exists(tenantId: string): Promise<boolean> {
      const { data, error } = await supabase
        .from("tenants")
        .select("id")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw new Error(`tenantRepository.exists failed: ${error.message}`);
      return !!data;
    },
  };
}
