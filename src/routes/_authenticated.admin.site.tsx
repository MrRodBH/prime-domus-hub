// Bloco 3.1 — migração: /admin/site agora é EntityWorkspace (descriptor: site).
import { createFileRoute, Link } from "@tanstack/react-router";
import { EntityWorkspace, entitySearchSchema, ENTITIES } from "@/components/workspace/entities";

export const Route = createFileRoute("/_authenticated/admin/site")({
  validateSearch: (s) => entitySearchSchema.parse(s),
  component: SiteWorkspaceRoute,
});

function SiteWorkspaceRoute() {
  const search = Route.useSearch();
  return <div className="flex h-full min-h-0 flex-col gap-4">
    {!search.item && <section className="rounded-xl border bg-card p-5" aria-labelledby="website-start">
      <h1 id="website-start" className="font-display text-2xl">Prepare o website da sua empresa</h1>
      <p className="mt-2 text-sm text-muted-foreground">Configure a marca, crie as páginas e conecte o domínio. Salvar um rascunho não publica o conteúdo; revise antes de usar Publicar no editor.</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li><Link className="block h-full rounded-lg border p-4 hover:bg-muted" to="/admin/site" search={{ item: "identity" }}><strong>1. Identidade e marca</strong><span className="mt-1 block text-sm text-muted-foreground">Dados públicos, logotipo, cores e contatos.</span></Link></li>
        <li><Link className="block h-full rounded-lg border p-4 hover:bg-muted" to="/admin/paginas" search={{ new: "1" }}><strong>2. Criar páginas</strong><span className="mt-1 block text-sm text-muted-foreground">Conteúdo, imagens, formulários e revisão.</span></Link></li>
        <li><Link className="block h-full rounded-lg border p-4 hover:bg-muted" to="/admin/site" search={{ item: "header_footer" }}><strong>3. Organizar a navegação</strong><span className="mt-1 block text-sm text-muted-foreground">Cabeçalho, rodapé e links do website.</span></Link></li>
        <li><Link className="block h-full rounded-lg border p-4 hover:bg-muted" to="/admin/domains"><strong>4. Conectar domínio</strong><span className="mt-1 block text-sm text-muted-foreground">Comprovar propriedade e acompanhar DNS e SSL.</span></Link></li>
      </ol>
    </section>}
    <div className="min-h-0 flex-1"><EntityWorkspace descriptor={ENTITIES.site} search={search} /></div>
  </div>;
}
