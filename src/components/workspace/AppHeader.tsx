// AppHeader — 56 px permanente (Doc 05 §2).
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Search, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "./ui-store";
import { supabase } from "@/integrations/supabase/client";
import { clearImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { clearSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
import { listMyTenantInvitations } from "@/lib/api/tenant-lifecycle.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contextFromPath, CONTEXTS } from "./contexts";
import { TenantSwitcher } from "./tenant/TenantSwitcher";

export function AppHeader({
  isSuper,
  impersonating,
  onOpenMobileNav,
}: {
  isSuper?: boolean;
  impersonating?: string | null;
  onOpenMobileNav?: () => void;
}) {
  const { openPalette, openAi } = useUI();
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const active = contextFromPath(path);
  const invitationsQuery = useQuery({
    queryKey: ["tenant-invitations", "mine"],
    queryFn: () => listMyTenantInvitations(),
    enabled: isSuper === false,
    staleTime: 60_000,
  });
  const pendingInvitations = invitationsQuery.data?.length ?? 0;

  async function signOut() {
    clearImpersonationTenantId();
    clearSelectedTenantId();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-workspace-elevated px-3 sm:gap-3 sm:px-4"
      aria-label="Cabeçalho do workspace"
    >
      <button
        type="button"
        className="-ml-1 rounded-md p-2 transition-colors hover:bg-foreground/5 md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegação"
        aria-haspopup="dialog"
      >
        <Menu className="size-5" />
      </button>

      <div
        className="hidden min-w-0 items-center gap-2 text-xs text-muted-foreground sm:flex"
        aria-live="polite"
        aria-atomic="true"
      >
        <active.icon className="size-3.5 shrink-0" />
        <span className="truncate">{active.label}</span>
      </div>

      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={openPalette}
          className="flex h-9 w-full max-w-[520px] items-center gap-2 rounded-md border border-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-background"
          aria-label="Abrir busca e paleta de comandos"
          aria-haspopup="dialog"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left truncate">Buscar, navegar ou criar…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1" aria-label="Ações da conta">
        {impersonating ? (
          <span className="hidden lg:inline text-[10px] font-mono px-2 py-1 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30">
            Impersonando {impersonating.slice(0, 8)}…
          </span>
        ) : !isSuper ? (
          <TenantSwitcher impersonating={impersonating} isSuper={isSuper} />
        ) : null}
        <Button size="icon" variant="ghost" onClick={openAi} aria-label="Assistente IA">
          <Sparkles className="size-4" />
        </Button>
        {!isSuper ? (
          <Button size="icon" variant="ghost" asChild aria-label="Convites de organizações">
            <Link to="/invitations" className="relative">
              <Bell className="size-4" />
              {pendingInvitations > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 rounded-full bg-destructive px-1 text-[9px] leading-4 text-destructive-foreground text-center">
                  {pendingInvitations > 9 ? "9+" : pendingInvitations}
                </span>
              ) : null}
            </Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Conta">
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isSuper ? (
              <DropdownMenuItem asChild>
                <Link to="/invitations">Convites de organizações</Link>
              </DropdownMenuItem>
            ) : null}
            {isSuper ? (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    to={CONTEXTS.find((context) => context.id === "operacao")!.root as "/super"}
                  >
                    Operação (Super)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem asChild>
              <Link to="/">Ver site público</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={signOut}>
              <LogOut className="size-4 mr-2" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
