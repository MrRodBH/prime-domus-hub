// Tela de Blog aprovada da RM Prime.
import { createFileRoute } from "@tanstack/react-router";
import { BlogPage } from "@/components/painel-rm/BlogPage";

export const Route = createFileRoute("/_authenticated/$tenantSlug/admin/blog/")({
  head: () => ({ meta: [{ title: "Blog — Painel da empresa" }, { name: "robots", content: "noindex" }] }),
  component: BlogPage,
});
