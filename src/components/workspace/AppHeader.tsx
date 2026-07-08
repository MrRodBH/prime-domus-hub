// AppHeader — 56 px permanente (Doc 05 §2).
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Search, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "./ui-store";
import { supabase } from "@/integrations/supabase/client";
import { clearImpersonationTenantId } from "@/integrations/supabase/impersonation-state";
import { clearSelectedTenantId } from "@/integrations/supabase/tenant-selection-state";
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
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = contextFromPath(path);

  async function signOut() {
    // Patch 2.3.1 · Regra 1 — limpar estado local ANTES do signOut.
    // F3.4.1 — inclui limpeza da seleção comum de tenant (não é UI nova,
    // é lifecycle: seleção não pode sobreviver a logout ou troca de conta).
    clearImpersonationTenantId();
    clearSelectedTenantId();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card px-3 sm:px-4 flex items-center gap-3 sticky top-0 z-30">
      <button
        type="button"
        className="md:hidden -ml-1 p-2 rounded-md hover:bg-foreground/5"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegação"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <active.icon className="size-3.5 shrink-0" />
        <span className="truncate">{active.label}</span>
      </div>

      <div className="flex-1 flex justify-center">
        <button
          type="button"
          onClick={openPalette}
          className="w-full max-w-[520px] flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-background/60 hover:bg-background text-sm text-muted-foreground transition-colors"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left truncate">Buscar, navegar ou criar…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {impersonating ? (
          <span className="hidden lg:inline text-[10px] font-mono px-2 py-1 rounded bg-amber-500/15 text-amber-800 border border-amber-500/30">
            Impersonando {impersonating.slice(0, 8)}…
          </span>
        ) : !isSuper ? (
          // F3.5.1 — switcher comum apenas para usuário não-Super.
          // Super Admin sem impersonação usa fluxo próprio.
          <TenantSwitcher impersonating={impersonating} isSuper={isSuper} />
        ) : null}
        <Button size="icon" variant="ghost" onClick={openAi} aria-label="Assistente IA">
          <Sparkles className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Notificações">
          <Bell className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Conta">
              <User className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isSuper && (
              <>
                <DropdownMenuItem asChild>
                  <Link to={CONTEXTS.find((c) => c.id === "operacao")!.root as "/super"}>
                    Operação (Super)
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
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
