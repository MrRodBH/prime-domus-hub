// LSH-01 — Lead Authorization Boundary (typed, server-only).
//
// Recovery Mode · Lote B — Canonical Impersonation Closure.
//
// Autoridade única e tipada de autorização TypeScript para as operações
// Lead cobertas pela LSH-01. Este módulo NÃO substitui a autoridade
// transacional da RPC `create_manual_lead`, nem as policies RLS: é a
// primeira camada. O tenant é derivado server-side através do contrato
// canônico (mesmo resolver consumido por `requireTenant`), NUNCA a partir
// do client. `impersonating` é evidência derivada: Super Admin com
// `origin = "impersonation"`.
//
// IMPORTANTE:
//  - O contexto público NÃO aceita `impersonating`, `isSuperAdmin`,
//    `tenantId` ou `tenantOrigin` vindos do client. Todos derivam do
//    Tenant Context canônico (middleware `requireTenant`).
//  - Super Admin é detectado exclusivamente via evidência canônica
//    (RPC `is_super_admin`, replicada por `requireTenant`).
//  - Super Admin sem impersonação canônica NUNCA alcança operações Lead
//    (`super_admin_requires_impersonation`).
//  - Super Admin com impersonação canônica IGNORA membership comum e
//    matriz por papel: scope = `tenant_wide` (exceto `workspace_action`).
//  - Usuário comum com `origin === "impersonation"` é rejeitado
//    (`operation_forbidden`).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  TenantContext,
  TenantContextOrigin,
} from "@/integrations/supabase/tenant-middleware";

export type LeadOperation =
  | "lead.list"
  | "lead.list_assignees"
  | "lead.list_properties"
  | "lead.create_manual"
  | "lead.update_fields"
  | "lead.workspace_action";

export type LeadAccessScope = "tenant_wide" | "own_assigned";

export type LeadAppRole =
  | "admin"
  | "corretor"
  | "secretaria"
  | "gerente"
  | "captador";

/**
 * Origem canônica do tenant conforme o contrato do middleware
 * `requireTenant`. `selection` e `single-membership` colapsam para
 * `membership` no domínio Lead, pois ambos representam autoridade
 * derivada de membership ativa.
 */
export type LeadTenantOrigin = "membership" | "impersonation";

export interface LeadTenantContext {
  tenantId: string;
  origin: LeadTenantOrigin;
  isSuperAdmin: boolean;
}

export interface LeadAuthorizationDecision {
  actorUserId: string;
  tenantId: string;
  /**
   * Chave de identificação da membership resolvida quando existe. Para
   * o caminho Super Admin com impersonação canônica, permanece `null`
   * (não há — e não pode haver — membership comum).
   */
  membershipKey: string | null;
  operation: LeadOperation;
  scope: LeadAccessScope;
  /** Evidence from canonical Super Admin detection. */
  isSuperAdmin: boolean;
  /**
   * Impersonação canônica: `isSuperAdmin === true` E
   * `tenant.origin === "impersonation"`. Nunca derivada de booleano
   * livre do caller nem apenas da presença do header `x-tenant-id`.
   */
  impersonating: boolean;
  /**
   * Papéis funcionais do ator. Para Super Admin impersonando, retorna
   * lista vazia — o caminho ignora a matriz por papel.
   */
  appRoles: ReadonlyArray<LeadAppRole>;
}

export type TypedSupabase = SupabaseClient<Database>;

/**
 * Contexto público consumido por callers server-side. Todos os campos
 * derivam do runtime autenticado + `requireTenant`; nenhum campo é
 * aceito diretamente do client.
 */
export interface LeadAuthorizationContext {
  supabase: TypedSupabase;
  userId: string;
  tenant: LeadTenantContext;
}

export class LeadAuthorizationError extends Error {
  readonly code:
    | "unauthenticated"
    | "tenant_not_resolved"
    | "membership_missing"
    | "membership_ambiguous"
    | "operation_forbidden"
    | "super_admin_requires_impersonation";
  constructor(code: LeadAuthorizationError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "LeadAuthorizationError";
  }
}

// -----------------------------------------------------------------------
// Mapeamento canônico do TenantContext (middleware) → LeadTenantContext.
// -----------------------------------------------------------------------

/** Colapso das origens do middleware para o domínio Lead. */
export function mapTenantOrigin(origin: TenantContextOrigin): LeadTenantOrigin {
  return origin === "impersonation" ? "impersonation" : "membership";
}

/**
 * Deriva o Tenant Context canônico consumido pelo boundary a partir do
 * `TenantContext` produzido por `requireTenant`. Este é o único
 * caminho autorizado para produzir `LeadTenantContext` no runtime.
 */
export function deriveLeadTenantContext(
  middlewareTenant: TenantContext,
): LeadTenantContext {
  return {
    tenantId: middlewareTenant.tenantId,
    origin: mapTenantOrigin(middlewareTenant.origin),
    isSuperAdmin: middlewareTenant.isSuperAdmin,
  };
}

// -----------------------------------------------------------------------
// Repository — abstração testável sobre Supabase (memberships + roles).
// Tenant/Super Admin ficam a cargo do TenantContext canônico.
// -----------------------------------------------------------------------

export interface LeadAuthorizationRepository {
  listActiveMemberships(
    userId: string,
    tenantId: string,
  ): Promise<Array<{ id: string; membership_status: string }>>;
  listAppRoles(userId: string): Promise<ReadonlyArray<LeadAppRole>>;
}

export function createSupabaseLeadAuthorizationRepository(
  supabase: TypedSupabase,
): LeadAuthorizationRepository {
  return {
    async listActiveMemberships(userId, tenantId) {
      const { data, error } = await supabase
        .from("tenant_members")
        .select("tenant_id, user_id, membership_status")
        .eq("user_id", userId)
        .eq("tenant_id", tenantId)
        .eq("membership_status", "active");
      if (error) throw new Error(error.message);
      const rows =
        (data ?? []) as Array<{
          tenant_id: string;
          user_id: string;
          membership_status: string;
        }>;
      return rows.map((r) => ({
        id: `${r.tenant_id}:${r.user_id}`,
        membership_status: r.membership_status,
      }));
    },
    async listAppRoles(userId) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{ role: LeadAppRole }>).map((r) => r.role);
    },
  };
}

// -----------------------------------------------------------------------
// Matriz de autorização — pura, sem I/O.
//
// operação                       | autorizados                     | tenant_wide
// -------------------------------+---------------------------------+---------------------
// lead.list                      | admin, gerente, corretor        | admin, gerente
// lead.list_assignees            | admin, gerente                  | admin, gerente
// lead.list_properties           | admin, gerente, corretor        | admin, gerente
// lead.create_manual             | admin, corretor                 | admin
// lead.update_fields             | admin, gerente, corretor        | admin, gerente
// lead.workspace_action          | (nenhum — sempre denied)        | —
//
// Super Admin impersonando ignora a matriz e recebe `tenant_wide`,
// exceto para `lead.workspace_action` que permanece sempre negada.
// -----------------------------------------------------------------------

interface OperationRule {
  requiredAnyRole: ReadonlyArray<LeadAppRole>;
  tenantWideRoles: ReadonlyArray<LeadAppRole>;
}

const OPERATION_MATRIX: Readonly<Record<LeadOperation, OperationRule>> = {
  "lead.list": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.list_assignees": {
    requiredAnyRole: ["admin", "gerente"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.list_properties": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.create_manual": {
    requiredAnyRole: ["admin", "corretor"],
    tenantWideRoles: ["admin"],
  },
  "lead.update_fields": {
    requiredAnyRole: ["admin", "gerente", "corretor"],
    tenantWideRoles: ["admin", "gerente"],
  },
  "lead.workspace_action": {
    requiredAnyRole: [],
    tenantWideRoles: [],
  },
};

export function decideOperationScope(
  operation: LeadOperation,
  appRoles: ReadonlyArray<LeadAppRole>,
): { authorized: boolean; scope: LeadAccessScope } {
  const rule = OPERATION_MATRIX[operation];
  const authorized = rule.requiredAnyRole.some((r) => appRoles.includes(r));
  const tenantWide = rule.tenantWideRoles.some((r) => appRoles.includes(r));
  return { authorized, scope: tenantWide ? "tenant_wide" : "own_assigned" };
}

// -----------------------------------------------------------------------
// Autorização — algoritmo puro sobre o Tenant Context canônico + repo.
// -----------------------------------------------------------------------

export async function authorizeLeadOperation(
  ctx: LeadAuthorizationContext,
  operation: LeadOperation,
  repo: LeadAuthorizationRepository = createSupabaseLeadAuthorizationRepository(
    ctx.supabase,
  ),
): Promise<LeadAuthorizationDecision> {
  if (!ctx.userId) {
    throw new LeadAuthorizationError("unauthenticated");
  }
  if (!ctx.tenant || !ctx.tenant.tenantId) {
    throw new LeadAuthorizationError("tenant_not_resolved");
  }

  const { tenantId, origin, isSuperAdmin } = ctx.tenant;

  // ------------------------------------------------------------------
  // Caminho Super Admin.
  // ------------------------------------------------------------------
  if (isSuperAdmin) {
    if (origin !== "impersonation") {
      throw new LeadAuthorizationError("super_admin_requires_impersonation");
    }
    if (operation === "lead.workspace_action") {
      throw new LeadAuthorizationError(
        "operation_forbidden",
        `forbidden: ${operation}`,
      );
    }
    return {
      actorUserId: ctx.userId,
      tenantId,
      membershipKey: null,
      operation,
      scope: "tenant_wide",
      isSuperAdmin: true,
      impersonating: true,
      appRoles: [],
    };
  }

  // ------------------------------------------------------------------
  // Caminho de usuário comum.
  // ------------------------------------------------------------------
  if (origin === "impersonation") {
    // Regular users never legitimately reach the boundary with an
    // impersonation origin — that state is reserved to Super Admin.
    throw new LeadAuthorizationError(
      "operation_forbidden",
      `forbidden: ${operation}`,
    );
  }

  const memberships = await repo.listActiveMemberships(ctx.userId, tenantId);
  if (memberships.length === 0) {
    throw new LeadAuthorizationError("membership_missing");
  }
  if (memberships.length > 1) {
    throw new LeadAuthorizationError("membership_ambiguous");
  }

  const appRoles = await repo.listAppRoles(ctx.userId);
  const { authorized, scope } = decideOperationScope(operation, appRoles);
  if (!authorized) {
    throw new LeadAuthorizationError(
      "operation_forbidden",
      `forbidden: ${operation}`,
    );
  }

  return {
    actorUserId: ctx.userId,
    tenantId,
    membershipKey: memberships[0].id,
    operation,
    scope,
    isSuperAdmin: false,
    impersonating: false,
    appRoles,
  };
}

// -----------------------------------------------------------------------
// Adaptador server-only — converte o contexto autenticado + tenant
// canônico no contexto público do boundary.
// -----------------------------------------------------------------------

export interface AuthenticatedTenantAwareRequest {
  supabase: TypedSupabase;
  userId: string;
  tenant: TenantContext;
}

export function buildLeadAuthorizationContext(
  authenticated: AuthenticatedTenantAwareRequest,
): LeadAuthorizationContext {
  return {
    supabase: authenticated.supabase,
    userId: authenticated.userId,
    tenant: deriveLeadTenantContext(authenticated.tenant),
  };
}
