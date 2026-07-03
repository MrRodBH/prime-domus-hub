// PluginContext — Fase 6 · Bloco 4 · Etapa 4.3 §6 + §9.
//
// Sandbox obrigatória para plugins. O plugin NUNCA importa registry global
// nem toca em Map interno. Ele recebe um `PluginContext` derivado do
// `TenantContext` do host e opera exclusivamente pela API abaixo.
//
// Regras invariantes:
//   • snapshot read-only (§6.3)
//   • sem mutação de registry (§6.5)
//   • sem introspecção global (§6.5)
//   • sem cross-tenant sharing (§10)
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import type {
  ViewComponent,
  PanelComponent,
  DialogComponent,
  ActionContext,
} from "@/components/workspace/registry/types";
import { executeActionById } from "@/components/workspace/registry/ActionExecutor";
import type { TenantContextValue } from "@/components/workspace/tenant/TenantContext";

export type PluginContext = Readonly<{
  tenantId: string;
  resolveView: (id: string) => ViewComponent;
  resolvePanel: (id: string) => PanelComponent;
  resolveDialog: (id: string) => DialogComponent;
  /** Execução declarativa — plugin não recebe handler cru. */
  emitAction: (id: string, ctx: ActionContext) => Promise<void>;
  /** Feature flags read-only (reservado para 4.4). */
  featureFlags: Readonly<Record<string, boolean>>;
}>;

export function createPluginContext(tenant: TenantContextValue): PluginContext {
  const snapshot: RegistrySnapshot = tenant.snapshot;
  return Object.freeze({
    tenantId: tenant.tenantId,
    resolveView: (id) => snapshot.resolveView(id),
    resolvePanel: (id) => snapshot.resolvePanel(id),
    resolveDialog: (id) => snapshot.resolveDialog(id),
    emitAction: (id, ctx) => executeActionById(snapshot, id, ctx),
    featureFlags: tenant.featureFlags,
  });
}
