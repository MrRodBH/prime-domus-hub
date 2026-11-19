// Tela "Usuários e permissões" aprovada da RM Prime.
import { createFileRoute } from "@tanstack/react-router";
import { UsuariosPage } from "@/components/painel-rm/UsuariosPage";
export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/memberships")({
  head: () => ({ meta: [{ title: "Usuários — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: UsuariosPage,
});
