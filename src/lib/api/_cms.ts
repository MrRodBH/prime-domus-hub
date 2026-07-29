/**
 * Helpers compartilhados dos módulos CMS.
 *
 * A autoridade tenant-scoped canônica é Tenant Access Control, resolvida no
 * servidor. O helper sem TenantContext foi aposentado fail-closed para impedir
 * que `has_role`, `user_roles` ou `is_super_admin` voltem a funcionar como
 * autoridade paralela.
 */
import { getRequest, getRequestIP } from "@tanstack/react-start/server";
import type { TenantContext } from "@/integrations/supabase/tenant-middleware";
import {
  authorizeTenantCmsOperation,
  type TenantCmsModule,
  type TenantCmsOperation,
} from "@/lib/api/tenant-cms-authority.server";

export type CmsModule = TenantCmsModule;
export type CmsAction = "visualizar" | "criar" | "editar" | "excluir" | "publicar";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthedCtx = { supabase: any; userId: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthedTenantCtx = { supabase: any; userId: string; tenant: TenantContext };

const OPERATION_BY_ACTION: Record<CmsAction, TenantCmsOperation> = {
  visualizar: "read",
  criar: "create_draft",
  editar: "save_draft",
  excluir: "delete",
  publicar: "publish",
};

/**
 * Boundary legado sem TenantContext. Mantido apenas para tornar falhas antigas
 * explícitas e auditáveis; não executa autorização por role global.
 */
export async function assertCmsPermission(
  _ctx: AuthedCtx,
  _modulo: CmsModule,
  _action: CmsAction,
): Promise<void> {
  throw new Error("legacy_cms_permission_boundary_retired");
}

/**
 * Autoriza a operação CMS usando tenant e ator derivados pelo servidor,
 * permissão efetiva de Tenant Access Control e escopo global obrigatório.
 */
export async function assertCmsTenantPermission(
  ctx: AuthedTenantCtx,
  modulo: CmsModule,
  action: CmsAction,
): Promise<string> {
  const authorization = await authorizeTenantCmsOperation(
    { userId: ctx.userId, tenant: ctx.tenant },
    modulo,
    OPERATION_BY_ACTION[action],
  );
  return authorization.tenantId;
}

/** Registra evento CMS com tenant, ator e metadados de request. */
export async function logCmsAudit(
  ctx: { userId: string; tenant?: TenantContext },
  entity: string,
  action: string,
  entity_id: string | null,
  before: unknown,
  after: unknown,
) {
  try {
    const tenantId = ctx.tenant?.tenantId;
    if (!tenantId) throw new Error("cms_audit_tenant_unresolved");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let email: string | null = null;
    try {
      const user = await supabaseAdmin.auth.admin.getUserById(ctx.userId);
      email = user?.data?.user?.email ?? null;
    } catch {
      // A ausência do e-mail não altera tenant authority nem a transação chamadora.
    }

    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const request = getRequest();
      userAgent = request.headers.get("user-agent");
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      // Execução fora de request scope.
    }

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: tenantId,
      user_id: ctx.userId,
      user_email: email,
      action,
      entity,
      entity_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      before: (before ?? null) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      after: (after ?? null) as any,
      ip,
      user_agent: userAgent,
    });
  } catch (error) {
    // Compatibilidade histórica: mutations legadas não falham depois de já
    // persistirem por erro de telemetria. As novas primitives registram audit
    // atomicamente no banco e não dependem deste helper.
    console.error("[cms-audit] falhou", error);
  }
}
