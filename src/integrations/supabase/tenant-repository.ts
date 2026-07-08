// Tenant Repository — abstração de acesso a memberships.
// Isola o algoritmo de resolução de tenant da fonte de dados concreta
// (banco, cache, serviço interno, federação de identidade).
//
// Conforme IA-001 §12 e ROADMAP §4.1 (Anti-SQL Leakage Rule):
// o algoritmo de resolução NÃO deve depender de SQL diretamente.
//
// STABILIZATION CONTRACT (Governance Hardening Layer — ROADMAP):
//   1. Stateless      — proibido armazenar estado interno / cache.
//   2. Deterministic  — mesmo input → mesmo output.
//   3. No ORM leakage — proibido expor SQL, query builders, filtros.
//   4. Single Purpose — EXCLUSIVO para tenant membership resolution.
//
// PROIBIDO evoluir este módulo para:
//   • caching layer global
//   • ORM abstraction genérica
//   • repositório multi-entidade
// Novas entidades exigem seus próprios repositórios isolados.
//
// F3.2 — Server-Side Tenant Selection:
//   • listByUser retorna EXCLUSIVAMENTE memberships com
//     membership_status = 'active'. invited/suspended/revoked são
//     ignoradas para todos os fins de resolução.
//   • userHasActiveMembership valida seleção explícita de tenant
//     enviada via header x-tenant-id por usuário comum. É a única
//     forma autorizada de aceitar a seleção — o header é transporte,
//     nunca autoridade.
//   • PROIBIDO nesta camada: is_default, is_owner, tenant_role,
//     ORDER BY para resolução, LIMIT 1 para resolução, getDefault,
//     getFirst, fallback ou heurística.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface TenantMembership {
  tenantId: string;
}

export interface TenantRepository {
  /**
   * Retorna TODAS as memberships ATIVAS do usuário
   * (membership_status = 'active'). Sem LIMIT, sem ORDER BY, sem
   * critério de is_default / is_owner / tenant_role.
   */
  listByUser(userId: string): Promise<TenantMembership[]>;
  /** Verifica se o tenantId informado existe. */
  exists(tenantId: string): Promise<boolean>;
  /**
   * Valida se o usuário possui uma membership ATIVA para o tenant
   * informado. Único ponto autorizado a validar seleção explícita de
   * tenant enviada via x-tenant-id por usuário comum (F3.2).
   */
  userHasActiveMembership(userId: string, tenantId: string): Promise<boolean>;
}

export function createSupabaseTenantRepository(
  supabase: SupabaseClient<Database>,
): TenantRepository {
  return {
    async listByUser(userId: string): Promise<TenantMembership[]> {
      const { data, error } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", userId)
        .eq("membership_status", "active");
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
    async userHasActiveMembership(userId: string, tenantId: string): Promise<boolean> {
      const { data, error } = await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("membership_status", "active")
        .maybeSingle();
      if (error) {
        throw new Error(`tenantRepository.userHasActiveMembership failed: ${error.message}`);
      }
      return !!data;
    },
  };
}
