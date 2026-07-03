// Rota legada — mantém links antigos funcionando.
// Bloco 2: Leads virou Pipeline (workspace-first).
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: ({ search }) => {
    // Preserva filtros migrando corretor_id → corretor
    const s = (search ?? {}) as Record<string, unknown>;
    const migrated: Record<string, unknown> = { ...s };
    if (s.corretor_id) { migrated.corretor = s.corretor_id; delete migrated.corretor_id; }
    if (s.tab === "kanban") { migrated.view = "kanban"; migrated.tab = "ativos"; }
    else if (s.tab === "descartados") { migrated.tab = "descartados"; }
    throw redirect({ to: "/admin/pipeline", search: migrated });
  },
  component: () => null,
});
