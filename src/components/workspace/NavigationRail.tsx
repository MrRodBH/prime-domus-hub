// Navigation Rail — 7 contextos, colapsável (Doc 06 §2.1).
import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { CONTEXTS, contextFromPath } from "./contexts";
import { useUI } from "./ui-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "@/assets/logo-rm-prime.png";

export function NavigationRail({ isSuper }: { isSuper?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = contextFromPath(path);
  const { railCollapsed, toggleRail } = useUI();
  const visible = CONTEXTS.filter((c) => !c.superOnly || isSuper);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`shrink-0 hidden md:flex flex-col border-r border-border bg-card transition-[width] duration-150 ${
          railCollapsed ? "w-[64px]" : "w-[240px]"
        }`}
        aria-label="Navegação principal"
      >
        <div className="h-14 flex items-center gap-2 px-3 border-b border-border">
          <img src={logo} alt="RM Prime" className="h-6 w-auto shrink-0" />
          {!railCollapsed && (
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground truncate">
              Workspace
            </span>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visible.map((c) => {
            const Icon = c.icon;
            const isActive = c.id === active.id;
            const item = (
              <Link
                key={c.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={c.root as any}
                className={`flex items-center gap-3 px-2.5 h-9 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/75 hover:bg-foreground/5"
                } ${railCollapsed ? "justify-center" : ""}`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {!railCollapsed && <span className="truncate">{c.label}</span>}
              </Link>
            );
            return railCollapsed ? (
              <Tooltip key={c.id}>
                <TooltipTrigger asChild>{item}</TooltipTrigger>
                <TooltipContent side="right">{c.label}</TooltipContent>
              </Tooltip>
            ) : (
              item
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            type="button"
            onClick={toggleRail}
            className={`w-full flex items-center gap-3 px-2.5 h-9 rounded-md text-xs text-muted-foreground hover:bg-foreground/5 ${
              railCollapsed ? "justify-center" : ""
            }`}
            aria-label={railCollapsed ? "Expandir navegação" : "Colapsar navegação"}
          >
            {railCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!railCollapsed && <span>Colapsar</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
