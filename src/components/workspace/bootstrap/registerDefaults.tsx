// Workspace Bootstrap — composição registry-side (Fase 6 · Bloco 4 · Etapa 4.1.b).
//
// Este arquivo é a COMPOSITION ROOT dos registries: é o único local
// autorizado a conectar identificadores declarativos a componentes concretos.
//
// Regra arquitetural (Instrução Normativa §3.3):
//   EntityWorkspace  →  Registry  →  Component
//   ────────────────────────────────────────────────────────────
//   core             │  neutro   │  registrado aqui
//
// O core NUNCA importa esses componentes. Este bootstrap é o único ponto
// que conhece implementações concretas — e é executado uma vez, como side
// effect, no barrel `@/components/workspace/entities`.
//
// Exceção Arquitetural AE-4.1.b-01 (Transitional):
//   A implementação da view "list" reutiliza `ContentList` que ainda vive
//   em `src/components/content/`. A relocação física para
//   `src/components/workspace/ui/` é rastreada por AE-4.0-01 e será
//   executada quando o segundo domínio operacional consumir a view.
//   Justificativa: preservar zero regressão nas 7 entidades CMS ativas
//   enquanto a superfície de registry entra em vigor.
import {
  registerView,
  registerPanel,
  registerAction,
  type ViewProps,
  type ActionContext,
} from "@/components/workspace/registry";
import { ContentList } from "@/components/content/ContentList";
import { KanbanView } from "@/components/workspace/views/KanbanView";
import { LeadFunilPanel } from "@/components/workspace/panels/LeadFunilPanel";

// ---------------------------------------------------------------------------
// View: "list" — visualização default de qualquer descriptor.
// Componente 100% neutro (recebe descriptor + items + search).
// ---------------------------------------------------------------------------
function ListView(props: ViewProps) {
  return <ContentList {...props} />;
}

// ---------------------------------------------------------------------------
// Action: "adapter.run" — fallback declarativo que delega ao adapter.
// Qualquer ActionSpec sem handler dedicado usa este ID e o executor
// chama `adapter.runAction(actionId, entityId, payload)`.
// ---------------------------------------------------------------------------
async function delegateToAdapter(ctx: ActionContext): Promise<void> {
  const { adapter, entityId, payload } = ctx;
  if (!adapter.runAction) {
    throw new Error(
      "[ActionRegistry] Adapter não implementa runAction — ação declarativa não pode ser despachada.",
    );
  }
  // O actionId real é embutido em payload.actionId pelo call site quando
  // usa este handler genérico como default.
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

  // Views
  registerView("list", ListView);

  // Actions
  registerAction("adapter.run", delegateToAdapter);
}
