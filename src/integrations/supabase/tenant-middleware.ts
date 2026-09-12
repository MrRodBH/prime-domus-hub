// Tenant operations: Super Admin is always denied (owner decision Round57).
// Ordinary users still require an active membership, with explicit selection
// for multiple memberships. A client header transports a choice, never authority.

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
  // Super Admin nunca resolve tenant, nem por membership nem por header.
  // ============================================================
  if (isSuperAdmin) {
    throw new Error("Super Admin não pode acessar a operação de empresas.");
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

    const { data: isAdminData, error: roleError } = await context.supabase.rpc("is_super_admin");
    if (roleError) throw new Error('Não foi possível confirmar o tipo de acesso.');
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
