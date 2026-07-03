// Route: /admin/leads-workspace — primeira rota operacional consumindo o
// EntityWorkspace genérico via descriptor `lead` (Fase 6 · Bloco 4 · Etapa 4.1.c).
// A rota existente `/admin/pipeline` permanece inalterada durante a coexistência.
import { createFileRoute } from "@tanstack/react-router";
import {
  EntityWorkspace,
  entitySearchSchema,
  ENTITIES,
} from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/leads-workspace")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: LeadsWorkspaceRoute,
});

function LeadsWorkspaceRoute() {
  const search = Route.useSearch();
  return <EntityWorkspace descriptor={ENTITIES.lead} search={search} />;
}
