# Etapa 4.4 — Plugin Marketplace Foundation + Dynamic Module Loading + Feature Flags (Relatório)

**Bloco:** Fase 6 · Bloco 4
**Patch:** 4.4 — Governed Architecture
**Escopo:** infraestrutura de plugin (sem plugins de negócio).

---

## 1. Objetivo

Iniciar a infraestrutura para Plugin Marketplace, Dynamic Module Loading e
Feature Flags **sem modificar** nenhuma invariante arquitetural consolidada
na sequência 4.3.x.

---

## 2. Módulos entregues

Todos sob `src/components/workspace/plugins/` (namespace exclusivo):

| Módulo | Papel | Restrições |
|---|---|---|
| `PluginManifest.ts` | Contrato declarativo (`PluginManifest`, `PluginModule`, `PluginEntry`, capabilities, permissions) | Zero lógica, zero imports do runtime |
| `PluginValidator.ts` | `validateManifest`, `hasPermission`, `SUPPORTED_API_VERSIONS = ["4.3.4"]`, `PluginValidationError` | Fail-fast, sem side-effects |
| `PluginRegistry.ts` | `createPluginRegistry()` — mantém apenas `{manifest, module}` | Não é Registry de View/Panel/Dialog/Action |
| `PluginLoader.ts` | `createPluginLoader(source)` — valida manifest, apiVersion, dependências e chama `source.resolveModule` | Não executa lógica de plugin, não carrega remoto |
| `FeatureFlagService.ts` | `createFeatureFlagService(tenantId, flags)` — `isFlagEnabled`, `isPluginEnabled` | Não conhece Views/Panels/Resolution/Snapshot |
| `PluginContext.ts` (existente 4.3.4) | Sandbox somente-leitura para plugins | Preservado sem edição |
| `index.ts` | Barrel público de plugins | Não expõe internos de outros módulos |

---

## 3. Hard Gates — verificação

| Gate | Requisito | Status |
|---|---|---|
| 0 (Governance) | Nenhuma alteração unilateral de arquitetura | ✔ |
| 1 | Plugin nunca registra resolver/registry, nem cria ResolutionGraph | ✔ (PluginContext é read-only, Loader não expõe registries base) |
| 2 | Feature Flags não alteram Resolution/Registry/Snapshot/Executor | ✔ (`FeatureFlagService` só retorna booleanos) |
| 3 | Loader não modifica ResolutionGraph | ✔ (Loader só chama `PluginRegistry.register`) |
| 4 | `PluginRegistry` não conhece tenant/resolution/snapshot/workspace/renderers | ✔ (imports: apenas `PluginManifest`) |
| 5 | `PluginContext` permanece somente leitura | ✔ (não editado nesta etapa) |
| 6 | Nenhum arquivo modifica ResolutionGraph/Resolver/Snapshot/Executor/Registry | ✔ |
| 7 | Bootstrap inalterado | ✔ |

---

## 4. Anti-coupling scans

```
rg "ResolutionGraph|RegistrySnapshot|ActionExecutor|bootstrapWorkspaceRegistries" \
   src/components/workspace/plugins
```
Hits: apenas comentários informativos e o `PluginContext.ts` pré-existente
(4.3.4) — imports públicos autorizados por `TenantContext` para produzir a
sandbox. Nenhum novo módulo da etapa importa internos.

```
rg "PluginRegistry" src/components/workspace/runtime      → 0 hits
rg "PluginLoader"   src/components/workspace/runtime      → 0 hits
rg "featureFlags"   src/components/workspace/resolution   → 0 hits
```

Typecheck: `tsgo --noEmit` limpo após correção de tipagem explícita em
`PluginLoader.loadAll(registry: PluginRegistry)`.

---

## 5. Casos de teste cobertos pelo contrato

O `PluginValidator` + `PluginLoader` cobrem, por design fail-fast, os oito
casos exigidos pela especificação:

1. Plugin válido — `validateManifest` retorna manifest congelado.
2. Plugin inválido — `PluginValidationError` (campos ausentes/errados).
3. Manifest inválido — `PluginValidationError("<unknown>", "manifest não é objeto")`.
4. Versão incompatível — `PluginValidationError` / `PluginLoadError` (apiVersion fora de `SUPPORTED_API_VERSIONS`).
5. Feature desabilitada — `FeatureFlagService.isFlagEnabled(flag)` = `false`.
6. Plugin desabilitado — `FeatureFlagService.isPluginEnabled(manifest)` = `false` quando qualquer flag declarada não está ativa.
7. Permissão insuficiente — `hasPermission(manifest, perm)` = `false` (enforcement fica com o host).
8. Plugin inexistente — `PluginRegistry.get(id)` lança `PluginNotFoundError`.

---

## 6. Fora do escopo (confirmado)

Marketplace visual, download/instalação online, plugins remotos, atualizações
automáticas, catálogo/loja — nada implementado, conforme especificação.

---

## 7. Architectural Governance Compliance

**Componentes arquiteturais que permaneceram INALTERADOS:**
- `ResolutionGraph` e todos os resolvers (`View/Panel/Dialog/Action`)
- `RegistrySnapshot`
- `Registry` base (`ViewRegistry`, `PanelRegistry`, `DialogRegistry`, `ActionRegistry`)
- `ActionExecutor`
- `bootstrapWorkspaceRegistries` / `getDefaultSnapshotSource`
- `TenantContext` (contrato público, hooks, provider)
- `PluginContext` (4.3.4)
- Renderers (`EntityViewRenderer`, `EntityPanelRenderer`, `EntityDialogRenderer`)

**Contratos públicos preservados:**
- Superfície de `src/components/workspace/entities/index.ts` — nenhum
  símbolo removido, renomeado ou alterado.
- Hooks `useResolutionGraph`, `useViewResolver`, `usePanelResolver`,
  `useDialogResolver`, `useActionResolver` inalterados.
- `PluginContext { tenantId, resolutionGraph, executeAction, featureFlags, apiVersion: "4.3.4" }` inalterado.

**Hard Gates verificados:** 0, 1, 2, 3, 4, 5, 6, 7 — todos aprovados
(§3 acima).

**Scans arquiteturais executados:** os quatro scans obrigatórios da
especificação (§4 acima), todos com resultado conforme.

**Declaração explícita:** nenhuma decisão arquitetural unilateral foi
tomada durante a implementação da Etapa 4.4. A infraestrutura de plugins
foi adicionada como namespace isolado (`src/components/workspace/plugins/`),
sem tocar em nenhuma camada existente do runtime. Nenhum arquivo fora de
`plugins/` foi criado, editado ou removido nesta etapa.

---

## 8. Definition of Done

- [x] `PluginManifest` implementado
- [x] `PluginValidator` implementado
- [x] `PluginLoader` implementado (com contrato `PluginSource` para Dynamic Module Loading futuro)
- [x] `PluginRegistry` implementado (isolado — não confundir com registries do Workspace)
- [x] `FeatureFlagService` implementado
- [x] `PluginContext` preservado
- [x] Nenhuma alteração em `ResolutionGraph` / `Snapshot` / `Registry` / `ActionExecutor` / `Bootstrap`
- [x] Todos os Hard Gates aprovados
- [x] Typecheck limpo
- [x] Anti-coupling scans limpos
- [x] Relatório técnico completo (este documento)
- [x] Seção **Architectural Governance Compliance** presente (§7)
