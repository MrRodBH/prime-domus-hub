// Client middleware — anexa o header `x-tenant-id` às chamadas de
// server functions.
//
// F3.4 — Precedência obrigatória (Hard Gate §9):
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
import { createMiddleware } from "@tanstack/react-start";
import { getImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { getSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";

export const attachTenantHeader = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // §9 — impersonação Super Admin tem precedência absoluta.
    const impersonating = getImpersonationTenantId();
    if (impersonating) {
      return next({ headers: { "x-tenant-id": impersonating } });
    }
    // §9 — seleção comum de usuário (usada apenas quando não há
    // impersonação). Continua sendo transporte; server valida.
    const selected = getSelectedTenantId();
    if (selected) {
      return next({ headers: { "x-tenant-id": selected } });
    }
    return next({ headers: {} });
  },
);
