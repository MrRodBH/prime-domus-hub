// UnifiedResolutionLayer — Fase 6 · Bloco 4 · Etapa 4.3.3 §4.3.
//
// DEPRECADO como resolver central (removido `switch(kind)` e método
// `resolve(kind, id)`). O papel agora é ORQUESTRAÇÃO: monta o
// `ResolverRegistry` de um snapshot registrando os resolvers built-in
// (view/panel/dialog/action). Plugins podem registrar resolvers adicionais
// via `registry.register(...)` sem tocar neste módulo.
import type { RegistrySnapshot } from "@/components/workspace/registry/snapshot";
import {
  ResolverRegistry,
  createResolverRegistry,
} from "./ResolverRegistry";
import { createViewResolver } from "./resolvers/ViewResolver";
import { createPanelResolver } from "./resolvers/PanelResolver";
import { createDialogResolver } from "./resolvers/DialogResolver";
import { createActionResolver } from "./resolvers/ActionResolver";

/**
 * Facilitador — monta um `ResolverRegistry` populado com os resolvers
 * built-in para o snapshot fornecido. Não contém switch, não resolve
 * nada por conta própria.
 */
export function createResolverRegistryForSnapshot(
  snapshot: RegistrySnapshot,
  opts?: { freeze?: boolean },
): ResolverRegistry {
  const registry = createResolverRegistry();
  registry.register("view", createViewResolver(snapshot));
  registry.register("panel", createPanelResolver(snapshot));
  registry.register("dialog", createDialogResolver(snapshot));
  registry.register("action", createActionResolver(snapshot));
  if (opts?.freeze !== false) registry.freeze();
  return registry;
}
