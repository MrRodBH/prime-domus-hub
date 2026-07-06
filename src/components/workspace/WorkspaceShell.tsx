// WorkspaceShell — o AppShell permanente da Fase 6 (Doc 00 §1, Doc 05 §2).
// Monta uma única vez para toda a sessão autenticada.
// Estrutura: Header (56) + Rail (240/64) + Content (com ContextTabs opcional).
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { meusPapeis } from "@/lib/api/admin.functions";
import { meuAcessoSuperAdmin } from "@/lib/api/super.functions";
import { meuTenantId } from "@/lib/api/tenant.functions";
import { setCurrentTenantId } from "@/lib/tenant-cache";
import { supabase } from "@/integrations/supabase/client";
import { NavigationRail } from "./NavigationRail";
import { AppHeader } from "./AppHeader";
import { CommandPalette } from "./CommandPalette";
import { AiDrawer } from "./AiDrawer";
import { ContextTabs } from "./ContextTabs";
import { DetailPanelProvider } from "./DetailPanel";
import { CONTEXTS, contextFromPath } from "./contexts";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { TenantContextProvider } from "@/components/workspace/tenant/TenantContext";
import { useImpersonation } from "@/integrations/supabase/use-impersonation";
import { clearImpersonationTenantId } from "@/integrations/supabase/impersonation-state";

export function WorkspaceShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: papeis } = useQuery({ queryKey: ["meus-papeis"], queryFn: () => meusPapeis(), staleTime: 60_000 });
  const { data: isSuper } = useQuery({ queryKey: ["is-super-admin"], queryFn: () => meuAcessoSuperAdmin(), staleTime: 60_000 });
  const { data: tenantId } = useQuery({ queryKey: ["meu-tenant-id"], queryFn: () => meuTenantId(), staleTime: 5 * 60_000 });

  useEffect(() => {
    setCurrentTenantId((tenantId as string | null) ?? null);
  }, [tenantId]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [path]);

  // Patch 2.3.1 — fonte única (reativa) do estado local de impersonação.
  const impersonating = useImpersonation();

  // Patch 2.3.1 · Regra 5 — usuário não-Super nunca deve carregar estado residual.
  useEffect(() => {
    if (isSuper === false && impersonating) {
      clearImpersonationTenantId();
    }
  }, [isSuper, impersonating]);

  // Patch 2.3.1 · Regra 2 — SIGNED_OUT limpa determinística e automaticamente.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearImpersonationTenantId();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  void papeis; // reserved for role-based rail gating in Bloco 2+

  const active = contextFromPath(path);
  const visibleContexts = CONTEXTS.filter((c) => !c.superOnly || isSuper);

  // super-only guard: if user is on /super but not super, redirect
  useEffect(() => {
    if (active.superOnly && isSuper === false) {
      navigate({ to: "/admin", replace: true });
    }
  }, [active.superOnly, isSuper, navigate]);

  return (
    <TenantContextProvider tenantId={(tenantId as string | null) ?? null}>
    <DetailPanelProvider>
      <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
        <NavigationRail isSuper={!!isSuper} />

        <div className="flex-1 min-w-0 flex flex-col">
          <AppHeader
            isSuper={!!isSuper}
            impersonating={impersonating}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <ContextTabs />
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-4 lg:p-6">
              <Outlet />
            </div>
          </main>
        </div>

        <CommandPalette isSuper={!!isSuper} />
        <AiDrawer />

        {/* Mobile navigation drawer */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[260px] p-0">
            <VisuallyHidden>
              <SheetTitle>Navegação</SheetTitle>
            </VisuallyHidden>
            <div className="h-14 px-4 flex items-center border-b text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </div>
            <nav className="p-2 space-y-0.5">
              {visibleContexts.map((c) => {
                const Icon = c.icon;
                const isActive = c.id === active.id;
                return (
                  <Link
                    key={c.id}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={c.root as any}
                    className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/75 hover:bg-foreground/5"
                    }`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <Icon className="size-4" /> {c.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </DetailPanelProvider>
    </TenantContextProvider>
  );
}
