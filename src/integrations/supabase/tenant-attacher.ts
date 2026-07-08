// Client middleware — anexa o header `x-tenant-id` às chamadas de
// server functions.
//
// F3.4 / F3.4.1 — Precedência obrigatória (Hard Gate §9):
//   1. Impersonação Super Admin explícita (impersonation-state)
//   2. Seleção comum de tenant (tenant-selection-state)
//   3. Sem header
//
// Regras:
//   • Nunca combinar as duas fontes na mesma requisição;
//   • se houver impersonação ativa, ela vence — seleção comum é
//     silenciosamente ignorada nessa requisição;
//   • o header é apenas TRANSPORTE — a autoridade é sempre server-side
//     (F3.2/F3.3);
//   • estado "selection_required" (nenhuma seleção persistida) NÃO
//     anexa header — o server rejeita com "Tenant selection required".
//
// F3.4.1 — a resolução foi extraída para a função pura
// `resolveTenantTransportHeader` para permitir testes unitários
// determinísticos sem depender do runtime do middleware.
import { createMiddleware } from "@tanstack/react-start";
import { getImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { getSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";

/**
 * Função pura — resolve o header `x-tenant-id` a partir das duas
 * fontes possíveis. NÃO valida tenant, NÃO consulta banco, NÃO tem
 * autoridade. Apenas transporte.
 *
 * Precedência (mutuamente exclusiva):
 *   1. impersonationTenantId (Super Admin)
 *   2. selectedTenantId       (usuário comum)
 *   3. sem header
 */
export function resolveTenantTransportHeader(input: {
  impersonationTenantId: string | null;
  selectedTenantId: string | null;
}): Record<string, string> {
  if (input.impersonationTenantId) {
    return { "x-tenant-id": input.impersonationTenantId };
  }
  if (input.selectedTenantId) {
    return { "x-tenant-id": input.selectedTenantId };
  }
  return {};
}

export const attachTenantHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // §9 — impersonação Super Admin tem precedência absoluta;
    // seleção comum só é lida quando não há impersonação.
    const impersonationTenantId = getImpersonationTenantId();
    const selectedTenantId = impersonationTenantId
      ? null
      : getSelectedTenantId();
    const headers = resolveTenantTransportHeader({
      impersonationTenantId,
      selectedTenantId,
    });
    return next({ headers });
  },
);
