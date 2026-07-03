# Etapa 4.3.4 — Resolution Graph Lockdown (Relatório)

**Bloco:** Fase 6 · Bloco 4
**Patch:** 4.3.4 — Stable Architecture Fix
**Escopo:** corretivo/estabilizador (nenhuma nova funcionalidade)

---

## 1. Objetivo

Restaurar determinismo do sistema de resolução eliminando:
- mutação de resolução em runtime;
- registry de resolvers dinâmico;
- extensão de grafo por plugin;
- múltiplos caminhos de resolução concorrentes.

Novo hard constraint: **Resolution Graph Immutability Rule** — após o
bootstrap do tenant, o grafo é imutável e não aceita `register()`.

---

## 2. Arquitetura final (alvo)

```
Registry (build-time source)
   ↓
RegistrySnapshot (tenant isolation only)
   ↓
ResolutionGraph (IMMUTABLE, prebuilt)
   ↓
resolutionGraph.<kind>.resolve(id)   ← único dispatcher
   ↓
Renderers / Plugins / Actions
```

---

## 3. Mudanças aplicadas

### 3.1 Novo módulo
- **`src/components/workspace/resolution/ResolutionGraph.ts`**
  - `type ResolutionGraph = Readonly<{ view, panel, dialog, action }>`
  - `createResolutionGraph(snapshot)` — único construtor, `Object.freeze` no wrapper.
  - Reexporta a interface `Resolver<TKind, TResult>` (mínima, sem mutação).

### 3.2 Removidos (hard delete)
- `src/components/workspace/resolution/ResolverRegistry.ts`
- `src/components/workspace/resolution/UnifiedResolutionLayer.ts`

Símbolos eliminados: `ResolverRegistry`, `createResolverRegistry`,
`registerResolver`, `getResolver`, `hasResolver`, `listKinds`,
`createResolverRegistryForSnapshot`, `ResolverNotRegisteredError`.

### 3.3 TenantContext (`src/components/workspace/tenant/TenantContext.tsx`)
- Superfície nova: `{ tenantId, snapshot, resolutionGraph, executeAction, featureFlags }`.
- Hooks: `useResolutionGraph()`, `useViewResolver()`, `usePanelResolver()`,
  `useDialogResolver()`, `useActionResolver()` — todos leem nós do grafo (sem string dispatch).

### 3.4 PluginContext (`src/components/workspace/plugins/PluginContext.ts`)
```ts
Readonly<{
  tenantId,
  resolutionGraph,     // read-only
  executeAction,
  featureFlags,
  apiVersion: "4.3.4",
}>
```
Plugin **não** recebe registry base, **não** registra resolvers, **não** cria kinds.

### 3.5 Renderers (§4.4 — padrão único)
- `EntityViewRenderer`   → `resolutionGraph.view.resolve(id)`
- `EntityPanelRenderer`  → `resolutionGraph.panel.resolve(id)`
- `EntityDialogRenderer` → `resolutionGraph.dialog.resolve(id)`

### 3.6 Resolvers especializados
- `ViewResolver`, `PanelResolver`, `DialogResolver`, `ActionResolver` mantidos;
  importam `Resolver` de `../ResolutionGraph`. Cada instância é `Object.freeze(this)`.

### 3.7 Action system (mantido, isolado)
- `ActionRegistry` continua como definition source (bootstrap-only).
- `ActionExecutor` puro; execução não toca o grafo.

### 3.8 Bootstrap (fluxo único)
```
bootstrapWorkspaceRegistries()  → registra + freezeRegistries()
TenantContextProvider (por tenant):
  createRegistrySnapshot(tid, source)
  createResolutionGraph(snapshot)
  Object.freeze(contextValue)
```
Grafo é criado **uma vez por tenant** e nunca mais alterado.

### 3.9 Superfície pública (`src/components/workspace/entities/index.ts`)
- Removidos: `ResolverRegistry`, `createResolverRegistry`, `ResolverNotRegisteredError`,
  `createResolverRegistryForSnapshot`.
- Adicionados: `createResolutionGraph`, `type ResolutionGraph`, `useResolutionGraph`.
- Hooks e types de resolver especializados mantidos como reexport para consumidores.

---

## 4. Anti-regressão (§7)

Scan executado:
```
rg "registerResolver|ResolverRegistry|addResolver|switch\s*\(kind|resolve\(\"|registryIndex" src/ -g '*.ts' -g '*.tsx'
```
Resultado runtime: **0 hits**. Ocorrências remanescentes são comentários
descritivos em `snapshot.ts` / `registry/index.ts` (histórico de referência).

Typecheck: `tsgo --noEmit` limpo (validado pelo harness após cada edição —
sem novos erros TS após a última correção do resolver-freeze).

---

## 5. Regras de ouro reafirmadas

**Proibido em runtime:** mutação do grafo, plugin alterando arquitetura,
novos kinds dinâmicos, múltiplos caminhos de resolução, abstrações acima do grafo.

**Permitido:** leitura de `resolutionGraph`, execução de actions,
isolamento por tenant via snapshot, plugin sandboxado (apenas leitura).

---

## 6. Definition of Done

- [x] `ResolutionGraph` implementado e imutável
- [x] `ResolverRegistry` removido
- [x] `PluginContext` simplificado (apiVersion `4.3.4`)
- [x] Renderers migrados para `resolutionGraph.<kind>.resolve(id)`
- [x] `TenantContext` unificado com grafo único por tenant
- [x] `RegistrySnapshot` mantido apenas para isolamento
- [x] Zero runtime mutation de resolução
- [x] Typecheck limpo
- [x] `rg` scan runtime limpo

---

## 7. Resultado

Sistema em modelo **closed deterministic resolution core + extensibilidade
controlada fora do runtime graph**. Base estável para 4.4 (marketplace,
dynamic module loading, feature flags por tenant) sem risco de divergência
entre instâncias multi-tenant.
