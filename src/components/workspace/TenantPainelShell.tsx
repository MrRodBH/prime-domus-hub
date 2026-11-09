// Company panel shell imported from the owner-approved RM Prime /painel layout.
import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Building2, FileText, Home, LogOut, Megaphone, Menu, Newspaper, Percent, Rocket, ShieldCheck, Target, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { meuPerfilNoTenant } from "@/lib/api/tenant.functions";
import { workspaceTenantMark, type WorkspaceTenantIdentity } from "@/components/brand/TenantBrand";
import { cn } from "@/lib/utils";

const PAPEL: Record<string, string> = { owner: "Administrador", admin: "Administrador", manager: "Gerente", broker: "Corretor", captador: "Captador", secretaria: "Secretária", viewer: "Visualizador" };

// `sub` null = módulo ainda não importado (próximas partes).
const MENU: { rotulo: string; sub: string | null; icone: typeof Home }[] = [
  { rotulo: "Dashboard", sub: "", icone: Home },
  { rotulo: "CRM", sub: "/leads", icone: Users },
  { rotulo: "Imóveis", sub: "/imoveis", icone: Building2 },
  { rotulo: "Blog", sub: "/blog", icone: Newspaper },
  { rotulo: "Campanhas", sub: "/campanhas", icone: Target },
  { rotulo: "Landing pages", sub: null, icone: Rocket },
  { rotulo: "Conteúdo do site", sub: "/site", icone: FileText },
  { rotulo: "Simulação SFH", sub: null, icone: Percent },
  { rotulo: "Marketing", sub: "/marketing", icone: Megaphone },
  { rotulo: "Follow CRs", sub: null, icone: BarChart3 },
  { rotulo: "Usuários", sub: "/memberships", icone: ShieldCheck },
];

export function TenantPainelShell({ tenant, children }: { tenant: WorkspaceTenantIdentity; children: ReactNode }) {
  const caminho = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const perfilFn = useServerFn(meuPerfilNoTenant);
  const { data: perfil } = useQuery({ queryKey: ["painel-perfil", tenant.id], queryFn: () => perfilFn(), staleTime: 5 * 60_000 });
  const base = `/${tenant.slug}/admin`;
  const logo = workspaceTenantMark(tenant);
  const atual = MENU.find((i) => i.sub !== null && (i.sub === "" ? caminho === base || caminho === `${base}/` : caminho.startsWith(base + i.sub)));

  const marca = (
    <span className="inline-flex w-full items-center justify-center gap-3 rounded-md bg-card px-4 py-4 text-primary">
      {logo ? <img src={logo} alt={`Logomarca da ${tenant.name}`} className="h-16 w-auto object-contain" /> : null}
      <span className="font-heading text-sm font-semibold uppercase leading-tight tracking-wide">{tenant.name}</span>
    </span>
  );

  const nav = (
    <nav className="flex flex-col gap-1 p-4" aria-label="Navegação do painel">
      {MENU.map((item) =>
        item.sub === null ? (
          <span key={item.rotulo} title="Disponível nas próximas etapas" className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/40">
            <item.icone className="h-4 w-4" /> {item.rotulo}
          </span>
        ) : (
          <a
            key={item.rotulo}
            href={base + item.sub}
            onClick={(e) => { e.preventDefault(); setAberto(false); window.history.pushState({}, "", base + item.sub); window.dispatchEvent(new PopStateEvent("popstate")); }}
            aria-current={atual === item ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              atual === item ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icone className="h-4 w-4" /> {item.rotulo}
          </a>
        ),
      )}
    </nav>
  );

  const sair = (
    <Button variant="ghost" size="sm" onClick={() => void supabase.auth.signOut()} className="mt-3 w-full justify-start text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
      <LogOut className="mr-2 h-4 w-4" /> Sair
    </Button>
  );

  return (
    <div className="rm-painel flex h-dvh overflow-hidden bg-background text-foreground" data-workspace-shell="tenant-painel">
      <aside className="hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border p-4">{marca}</div>
        {nav}
        <div className="mt-auto border-t border-sidebar-border p-4">
          <p className="text-sm font-medium text-sidebar-primary">{perfil?.nome}</p>
          <p className="text-xs text-sidebar-foreground/60">{perfil?.papel ? PAPEL[perfil.papel] ?? perfil.papel : ""}</p>
          {sair}
        </div>
      </aside>

      {aberto ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setAberto(false)} />
          <aside className="relative flex w-64 flex-col overflow-y-auto bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border p-4">
              {marca}
              <Button variant="ghost" size="icon" onClick={() => setAberto(false)} aria-label="Fechar menu" className="text-sidebar-foreground"><X className="h-5 w-5" /></Button>
            </div>
            {nav}
            <div className="mt-auto border-t border-sidebar-border p-4">{sair}</div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-4 py-5 md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></Button>
            <div>
              <h1 className="font-heading text-xl font-semibold">{atual?.rotulo ?? tenant.name}</h1>
              {atual?.sub === "" && perfil?.nome ? (
                <p className="text-sm text-muted-foreground">Olá, {perfil.nome}. Visão geral da operação{perfil.papel && PAPEL[perfil.papel] ? ` como ${PAPEL[perfil.papel].toLowerCase()}` : ""}.</p>
              ) : null}
            </div>
          </div>
        </header>
        <main id="workspace-main" className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
