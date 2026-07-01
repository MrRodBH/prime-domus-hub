import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { LayoutDashboard, Building2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super")({
  loader: async () => {
    const ok = await meuAcessoSuperAdmin();
    if (!ok) throw redirect({ to: "/admin" });
    return { ok };
  },
  component: SuperShell,
});

function SuperShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => path === to || path.startsWith(to + "/");
  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="w-64 h-screen sticky top-0 bg-card border-r flex flex-col">
        <div className="h-20 flex items-center px-6 border-b">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Plataforma</div>
            <div className="text-lg font-semibold">Super Admin</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/super"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${isActive("/super") && path === "/super" ? "bg-petroleum text-linen" : "hover:bg-foreground/5"}`}
          >
            <LayoutDashboard className="size-4" /> Tenants
          </Link>
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm hover:bg-foreground/5 text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> Voltar ao Admin
          </Link>
        </nav>
        <div className="p-4 border-t text-[10px] text-muted-foreground flex items-center gap-2">
          <Building2 className="size-3" /> Multi-tenant Foundation
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  );
}
