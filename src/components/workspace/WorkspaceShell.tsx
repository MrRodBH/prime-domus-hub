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

  useEffect(() => {
    if (active.superOnly && isSuper === false) {
      navigate({ to: "/admin", replace: true });
    }
  }, [active.superOnly, isSuper, navigate]);

  return (
    <TenantContextProvider tenantId={(tenantId as string | null) ?? null}>
      <DetailPanelProvider>
        <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
          <NavigationRail isSuper={Boolean(isSuper)} />

          <div className="flex-1 min-w-0 flex flex-col">
            <AppHeader
              isSuper={Boolean(isSuper)}
              impersonating={impersonating}
              onOpenMobileNav={() => setMobileNavOpen(true)}
            />
            <ContextTabs />
            <main className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4 lg:p-6">
                {isInvitationRoute ? (
                  <Outlet />
                ) : (
                  <TenantSelectionGate isSuper={Boolean(isSuper)}>
                    <Outlet />
                  </TenantSelectionGate>
                )}
              </div>
            </main>
          </div>

          <CommandPalette isSuper={Boolean(isSuper)} />
          <AiDrawer />

          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetContent side="left" className="w-[260px] p-0">
              <VisuallyHidden><SheetTitle>Navegação</SheetTitle></VisuallyHidden>
              <div className="h-14 px-4 flex items-center border-b text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Workspace
              </div>
              <nav className="p-2 space-y-0.5">
                {visibleContexts.map((context) => {
                  const Icon = context.icon;
                  const isActive = context.id === active.id;
                  return (
                    <Link
                      key={context.id}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      to={context.root as any}
                      className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm ${
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
