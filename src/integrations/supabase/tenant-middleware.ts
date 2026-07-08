// Tenant Middleware — F3.2 (Server-Side Tenant Selection)
//
// Evolução da IA-001 §12.2: permite que usuário comum com múltiplas
// memberships ativas envie x-tenant-id como TRANSPORTE, sendo a seleção
// SEMPRE validada server-side contra membership_status = 'active'.
// O cliente nunca é autoridade; o header é apenas um veículo.
//
// Algoritmo:
//   1. Super Admin + header  → impersonação (origin = 'impersonation').
//   2. Super Admin sem header → erro (recurso tenant-scoped exige tenant).
//   3. Usuário comum + header:
//        - validar UUID
//        - validar membership ATIVA (user_id, tenant_id, status=active)
//        - se ok → origin = 'selection'
//        - se não → erro
//   4. Usuário comum sem header (cardinalidade sobre memberships ATIVAS):
//        A) 1 membership → resolve (origin = 'single-membership')
//        B) N memberships → erro "Tenant selection required."
//        C) 0 memberships → erro "Forbidden: no tenant membership"
//
// PROIBIDO: fallback implícito, tenant default, heurística, LIMIT 1 como
// regra, ORDER BY para escolher tenant, is_default / is_owner /
// tenant_role como critério de seleção, mistura de impersonação com
// seleção comum, aceitar `origin` vindo do client.

import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createSupabaseTenantRepository,
  type TenantRepository,
} from "@/integrations/supabase/tenant-repository";

export type TenantContextOrigin =
  | "impersonation"
  | "selection"
  | "single-membership";

export interface TenantContext {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
  impersonation: boolean;
  /** Sempre derivado no servidor. Nunca vem do client. */
  origin: TenantContextOrigin;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Algoritmo puro de resolução — testável sem HTTP. */
export async function resolveTenantContext(params: {
  userId: string;
  isSuperAdmin: boolean;
  impersonateHeader: string | null;
  repo: TenantRepository;
}): Promise<TenantContext> {
  const { userId, isSuperAdmin, impersonateHeader, repo } = params;

  // ============================================================
  // ETAPA 1 — Super Admin
  // Super Admin nunca resolve tenant via tenant_members: seu único
  // caminho para acessar recursos tenant-scoped é impersonação
  // explícita via x-tenant-id.
  // ============================================================
  if (isSuperAdmin) {
    if (impersonateHeader && impersonateHeader.length > 0) {
      if (!UUID_RE.test(impersonateHeader)) {
        throw new Error("Invalid tenant");
      }
      const exists = await repo.exists(impersonateHeader);
      if (!exists) {
        throw new Error("Invalid tenant");
      }
      return {
        tenantId: impersonateHeader,
        userId,
        isSuperAdmin,
        impersonation: true,
        origin: "impersonation",
      };
    }
    // Super Admin sem impersonação não acessa recursos tenant-scoped.
    throw new Error("Forbidden: no tenant membership");
  }

  // ============================================================
  // ETAPA 2 — Usuário comum COM header (seleção explícita)
  // Header é transporte; autoridade é a membership ativa validada
  // server-side.
  // ============================================================
  if (impersonateHeader && impersonateHeader.length > 0) {
    if (!UUID_RE.test(impersonateHeader)) {
      throw new Error("Invalid tenant selection.");
    }
    const ok = await repo.userHasActiveMembership(userId, impersonateHeader);
    if (!ok) {
      throw new Error("Tenant access denied.");
    }
    return {
      tenantId: impersonateHeader,
      userId,
      isSuperAdmin: false,
      impersonation: false,
      origin: "selection",
    };
  }

  // ============================================================
  // ETAPA 3 — Usuário comum SEM header
  // Cardinalidade explícita sobre memberships ATIVAS. Sem LIMIT,
  // sem ORDER BY, sem is_default / is_owner / tenant_role.
  // ============================================================
  const memberships = await repo.listByUser(userId);

  if (memberships.length === 1) {
    return {
      tenantId: memberships[0].tenantId,
      userId,
      isSuperAdmin: false,
      impersonation: false,
      origin: "single-membership",
    };
  }
  if (memberships.length > 1) {
    throw new Error("Multiple tenant memberships. Tenant selection required.");
  }
  throw new Error("Forbidden: no tenant membership");
}

/**
 * Middleware server-side. Compõe sobre `requireSupabaseAuth` e enriquece
 * o contexto com `tenant` (TenantContext).
 */
export const requireTenant = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const request = getRequest();
    const impersonateHeader =
      request?.headers?.get("x-tenant-id")?.trim() || null;

    const { data: isAdminData } = await context.supabase.rpc("is_super_admin");
    const isSuperAdmin = isAdminData === true;

    const repo = createSupabaseTenantRepository(context.supabase);

    const tenant = await resolveTenantContext({
      userId: context.userId,
      isSuperAdmin,
      impersonateHeader,
      repo,
    });

    return next({ context: { tenant } });
  });
