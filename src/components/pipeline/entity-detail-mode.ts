// Detail contract — resolve modo inline vs drawer por contexto (Bloco 2 §1).
// Pipeline: inline only. Outros contextos (Início, ⌘K global): drawer.
// Proibido duplicar estado de entidade — mesma fonte (?item=).
import { useRouterState } from "@tanstack/react-router";

export type EntityDetailMode = "inline" | "drawer";

export function resolveEntityDetailMode(pathname: string): EntityDetailMode {
  if (pathname.startsWith("/admin/pipeline")) return "inline";
  return "drawer";
}

export function useEntityDetailMode(): EntityDetailMode {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return resolveEntityDetailMode(path);
}
