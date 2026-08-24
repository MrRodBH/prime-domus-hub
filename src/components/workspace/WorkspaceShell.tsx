// WorkspaceShell — o AppShell permanente da Fase 6 (Doc 00 §1, Doc 05 §2).
// Monta uma única vez para toda a sessão autenticada.
// Estrutura: Header (56) + Rail (240/64) + Content (com ContextTabs opcional).
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { TenantContextProvider } from "@/components/workspace/tenant/TenantContext";
import { useImpersonation } from "@/integrations/supabase/use-impersonation";
import { clearImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { clearSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
import { TenantSelectionGate } from "@/components/workspace/tenant/TenantSelectionRequired";

export function WorkspaceShell() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { data: isSuper } = useQuery({
    queryKey: ["is-super-admin"],
    queryFn: () => meuAcessoSuperAdmin(),
    staleTime: 60_000,
  });
  const { data: tenantId } = useQuery({
    queryKey: ["meu-tenant-id"],
    queryFn: () => meuTenantId(),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setCurrentTenantId((tenantId as string | null) ?? null);
  }, [tenantId]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [path]);

  const impersonating = useImpersonation();

  useEffect(() => {
    if (isSuper === false && impersonating) {
      clearImpersonationTenantId();
    }
  }, [isSuper, impersonating]);

  useEffect(() => {
    let lastUserId: string | null = null;
    void supabase.auth
      .getUser()
      .then(({ data }) => {
        lastUserId = data.user?.id ?? null;
      })
      .catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearImpersonationTenantId();
        clearSelectedTenantId();
        lastUserId = null;
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        const uid = session?.user?.id ?? null;
        if (lastUserId && uid && uid !== lastUserId) {
          clearImpersonationTenantId();
          clearSelectedTenantId();
        }
        lastUserId = uid;
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const active = contextFromPath(path);
  const visibleContexts = CONTEXTS.filter((context) => !context.superOnly || isSuper);
  const isInvitationRoute = path === "/invitations";
  const routedContent = <Outlet />;

  useEffect(() => {
    if (active.superOnly && isSuper === false) {
      navigate({ to: "/admin", replace: true });
    }
  }, [active.superOnly, isSuper, navigate]);

  return (
    <TenantContextProvider tenantId={(tenantId as string | null) ?? null}>
      <DetailPanelProvider>
        <div
          className="min-h-dvh w-full flex overflow-hidden bg-workspace-surface text-foreground"
          data-workspace-shell="single-authenticated-shell"
        >
          <a
            href="#workspace-main"
            className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Ir para o conteúdo principal
          </a>
          <NavigationRail isSuper={Boolean(isSuper)} />

          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader
              isSuper={Boolean(isSuper)}
              impersonating={impersonating}
              onOpenMobileNav={() => setMobileNavOpen(true)}
            />
            <ContextTabs />
            <main
              id="workspace-main"
              className="min-h-0 flex-1 overflow-y-auto bg-workspace-surface"
              aria-label="Conteúdo principal"
              tabIndex={-1}
            >
              <div className="mx-auto w-full max-w-[var(--workspace-content-max)] p-4 sm:p-5 lg:p-6">
                {isInvitationRoute ? (
                  routedContent
                ) : (
                  <TenantSelectionGate isSuper={Boolean(isSuper)}>
                    {routedContent}
                  </TenantSelectionGate>
                )}
              </div>
            </main>
          </div>

          <CommandPalette isSuper={Boolean(isSuper)} />
          <AiDrawer />

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-[min(86vw,280px)] bg-workspace-navigation p-0">
              <VisuallyHidden>
                <SheetTitle>Navegação do workspace</SheetTitle>
              </VisuallyHidden>
              <div className="h-14 px-4 flex items-center border-b text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Workspace
              </div>
              <nav className="space-y-0.5 p-2" aria-label="Navegação principal móvel">
                {visibleContexts.map((context) => {
                  const Icon = context.icon;
                  const isActive = context.id === active.id;
                  return (
                    <Link
                      key={context.id}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      to={context.root as any}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/75 hover:bg-foreground/5"
                      }`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Icon className="size-4" /> {context.label}
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
