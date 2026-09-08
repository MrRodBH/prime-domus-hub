// Navigation Rail — 7 contextos, colapsável (Doc 06 §2.1).
import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { workspaceContexts, workspaceItemActive, contextFromPath } from "./contexts";
import { useImpersonation } from "@/integrations/supabase/use-impersonation";
import { useUI } from "./ui-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo-rm-prime.png";

export function NavigationRail({ isSuper }: { isSuper?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigationSearch = useRouterState({ select: s => s.location.search as Record<string, unknown> });
  const active = contextFromPath(path);
  const { railCollapsed, toggleRail } = useUI();
  const impersonating = useImpersonation();
  const globalNavigation = isSuper === true && (!impersonating || path.startsWith("/super"));
  const navigationCollapsed = railCollapsed && !globalNavigation;
  const visible = workspaceContexts(isSuper, path.startsWith("/super") ? null : impersonating);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`hidden min-h-0 shrink-0 flex-col border-r border-border bg-workspace-navigation transition-[width] duration-150 md:flex ${
          navigationCollapsed ? "w-[64px]" : "w-[272px]"
        }`}
        aria-label="Navegação principal"
        data-workspace-navigation="desktop"
      >
        <div className="h-14 flex items-center gap-2 px-3 border-b border-border">
          <img src={logo} alt="RM Prime" className="h-6 w-auto shrink-0" />
          {!navigationCollapsed && (
            <span className="text-[10px] uppercase tracking-[0.22em] text-white/70 truncate">
              RM Prime
            </span>
          )}
        </div>

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="Contextos do workspace">
          {visible.map((c) => {
            const Icon = c.icon;
            const isActive = workspaceItemActive(c, path, navigationSearch);
            const item = (
              <Link
                key={c.label}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={c.root as any}
                search={c.search as any}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                } ${navigationCollapsed ? "justify-center" : ""}`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {!navigationCollapsed && <span className="truncate">{c.label}</span>}
              </Link>
            );
            return navigationCollapsed ? (
              <Tooltip key={c.label}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{c.label}</TooltipContent>
              </Tooltip>
            ) : (
              item
            );
          })}
        </nav>

        <div className={globalNavigation ? "hidden" : "p-2 border-t border-border"}>
          <button
            type="button"
            onClick={toggleRail}
            className={`flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-xs text-white/70 transition-colors hover:bg-white/10 ${
              navigationCollapsed ? "justify-center" : ""
            }`}
            aria-label={navigationCollapsed ? "Expandir navegação" : "Colapsar navegação"}
          >
            {navigationCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            {!navigationCollapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
