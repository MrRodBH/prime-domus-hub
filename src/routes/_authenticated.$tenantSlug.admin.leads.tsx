// CRM aprovado da RM Prime (funil Kanban, ficha do lead, histórico e próxima ação).
import { createFileRoute } from "@tanstack/react-router";
import { CrmPage } from "@/components/painel-rm/CrmPage";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/leads")({
  head: () => ({ meta: [{ title: "CRM — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: CrmPage,
});
