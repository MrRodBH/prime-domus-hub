// ContextTabs — sub-navegação horizontal quando um contexto tem > 1 sub-área.
// Aparece logo abaixo do AppHeader, dentro do conteúdo.
import { Link, useRouterState } from "@tanstack/react-router";
import { contextFromPath } from "./contexts";

export function ContextTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ctx = contextFromPath(path);
  if (ctx.subs.length <= 1) return null;

  return (
    <div className="border-b border-border bg-card">
      <div className="flex items-center gap-1 px-3 sm:px-4 overflow-x-auto scrollbar-none">
        {ctx.subs.map((s) => {
          const isActive = path === s.to || path.startsWith(s.to + "/");
          return (
            <Link
              key={s.to}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={s.to as any}
              className={`shrink-0 h-10 inline-flex items-center px-3 text-sm border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
