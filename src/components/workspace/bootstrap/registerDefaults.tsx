// Workspace Bootstrap — composição registry-side + snapshot source
// (Fase 6 · Bloco 4 · Etapa 4.1.b, atualizado na 4.3 §4/§11).
//
// Este arquivo é a COMPOSITION ROOT dos registries. Após 4.3 ele NÃO é mais
// consultado em runtime: apenas produz o "snapshot source" que o
// TenantContext materializa como `RegistrySnapshot` isolado por tenant.
import {
  registerView,
  registerPanel,
  registerAction,
  freezeRegistries,
  ViewRegistry,
  PanelRegistry,
  DialogRegistry,
  ActionRegistry,
  type ViewProps,
  type ActionContext,
} from "@/components/workspace/registry";
import type { RegistrySnapshotSource } from "@/components/workspace/registry/snapshot";
import { ContentList } from "@/components/content/ContentList";
import { KanbanView } from "@/components/workspace/views/KanbanView";
import { LeadFunilPanel } from "@/components/workspace/panels/LeadFunilPanel";

// View "list" — visualização default, 100% neutra.
function ListView(props: ViewProps) {
  return <ContentList {...props} />;
}

// Action "adapter.run" — fallback declarativo que delega ao adapter.
async function delegateToAdapter(ctx: ActionContext): Promise<void> {
  const { adapter, entityId, payload } = ctx;
  if (!adapter.runAction) {
    throw new Error(
      "[ActionRegistry] Adapter não implementa runAction — ação declarativa não pode ser despachada.",
    );
  }
  const actionId =
    (typeof payload === "object" && payload !== null && "actionId" in payload
      ? String((payload as { actionId: unknown }).actionId)
      : null) ?? "unknown";
  await adapter.runAction(actionId, entityId, payload);
}

let bootstrapped = false;

export function bootstrapWorkspaceRegistries(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  registerView("list", ListView);
  registerView("kanban", KanbanView);
  registerPanel("lead.funil", LeadFunilPanel);
  registerAction("adapter.run", delegateToAdapter);

  // Bootstrap Freeze Model (4.2 §5.3) — declarações imutáveis a partir daqui.
  freezeRegistries();
}

/**
 * Fonte imutável para o snapshot por tenant (§4.3).
 *
 * O TenantContext copia estas Maps para uma nova instância — assim mesmo id
 * em tenants diferentes NÃO compartilha container (§12.3), embora possa
 * referenciar o mesmo componente puro. Nunca chame diretamente em código
 * de produto: use `useTenantContext()`.
 */
export function getDefaultSnapshotSource(): RegistrySnapshotSource {
  if (!bootstrapped) bootstrapWorkspaceRegistries();
  return {
    views: ViewRegistry.__entries(),
    panels: PanelRegistry.__entries(),
    dialogs: DialogRegistry.__entries(),
    actions: ActionRegistry.__entries(),
  };
}
