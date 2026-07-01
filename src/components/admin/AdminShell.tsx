import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Building2, Users, MapPin, Inbox, Settings, LogOut, LayoutDashboard, Menu, X, Newspaper, ShieldCheck, UsersRound, History, Crown, Image as ImageIcon, FileText, FileCode, Megaphone, FileClock } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { meusPapeis } from "@/lib/api/admin.functions";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { meuTenantId } from "@/lib/api/tenant.functions";
import { setCurrentTenantId } from "@/lib/tenant-cache";
import logo from "@/assets/logo-rm-prime.png";
import { Button } from "@/components/ui/button";

type Role = "admin" | "corretor" | "secretaria" | "gerente" | "captador";

import { useCmsPermissions, type CmsModuleCode } from "@/hooks/use-cms-permissions";

type CmsGate = CmsModuleCode;
const nav: Array<{ to: string; label: string; icon: typeof Building2; exact?: boolean; hideFor?: Role[]; cms?: CmsGate }> = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/leads", label: "Leads", icon: Inbox, hideFor: ["secretaria"] },
  { to: "/admin/imoveis", label: "Imóveis", icon: Building2 },
  { to: "/admin/corretores", label: "Usuários", icon: Users },
  { to: "/admin/equipes", label: "Equipes", icon: UsersRound, hideFor: ["secretaria", "corretor", "captador"] },
  { to: "/admin/perfis", label: "Perfis & Permissões", icon: ShieldCheck, hideFor: ["secretaria", "corretor", "captador", "gerente"] },
  { to: "/admin/blog", label: "Blog", icon: Newspaper },
  { to: "/admin/cidades", label: "Cidades", icon: MapPin },
  { to: "/admin/bairros", label: "Bairros", icon: MapPin },
  { to: "/admin/origens", label: "Origens de Leads", icon: Inbox, hideFor: ["secretaria", "corretor", "captador", "gerente"] },
  { to: "/admin/auditoria", label: "Auditoria", icon: History, hideFor: ["secretaria", "corretor", "captador", "gerente"] },
  { to: "/admin/midias", label: "Mídias", icon: ImageIcon, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.midias" },
  { to: "/admin/formularios", label: "Formulários", icon: FileText, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.formularios" },
  { to: "/admin/paginas", label: "Páginas", icon: FileCode, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.paginas" },
  { to: "/admin/campanhas", label: "Banners & Popups", icon: Megaphone, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.campanhas" },
  { to: "/admin/site", label: "Site & Branding", icon: Settings, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.configuracoes" },
  { to: "/admin/cms-auditoria", label: "Auditoria CMS", icon: FileClock, hideFor: ["secretaria", "corretor", "captador"], cms: "cms.versoes" },
];

export function AdminShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: papeis } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const { data: isSuper } = useQuery({ queryKey: ["is-super-admin"], queryFn: () => meuAcessoSuperAdmin(), staleTime: 60_000 });
  const { data: tenantId } = useQuery({ queryKey: ["meu-tenant-id"], queryFn: () => meuTenantId(), staleTime: 5 * 60_000 });
  useEffect(() => { setCurrentTenantId((tenantId as string | null) ?? null); }, [tenantId]);
  const impersonating = typeof window !== "undefined" ? localStorage.getItem("impersonate_tenant_id") : null;
  const rolesLoaded = Array.isArray(papeis) && papeis.length > 0;
  const roles = (rolesLoaded ? papeis : ["admin"]) as Role[];
  const cms = useCmsPermissions();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string, exact?: boolean) => (exact ? path === to : path === to || path.startsWith(to + "/"));
  const visibleNav = nav.filter((n) => {
    if (n.hideFor && !roles.some((r) => !n.hideFor!.includes(r))) return false;
    if (n.cms && !cms.can(n.cms, "visualizar")) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:sticky top-0 left-0 z-40 w-64 h-screen bg-card border-r border-foreground/5 flex flex-col transition-transform`}>
        <div className="h-20 flex items-center px-6 border-b border-foreground/5">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="" className="h-9 w-auto" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Admin</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {isSuper ? (
            <Link
              to="/super"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm bg-amber-500/10 text-amber-800 hover:bg-amber-500/20 mb-2"
            >
              <Crown className="size-4" strokeWidth={1.5} /> Super Admin
            </Link>
          ) : null}
          {impersonating ? (
            <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800">
              Impersonando tenant<br /><span className="font-mono">{impersonating.slice(0, 8)}…</span>
            </div>
          ) : null}
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active ? "bg-petroleum text-linen" : "text-foreground/70 hover:bg-foreground/5"
                }`}
              >
                <Icon className="size-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-foreground/5">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card border-b border-foreground/5 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20">
          <button className="lg:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground ml-auto">
            ↗ Ver site
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
