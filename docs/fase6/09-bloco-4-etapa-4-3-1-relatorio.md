# Fase 6 · Bloco 4 · Etapa 4.3.1 — PATCH TÉCNICO

**Escopo:** Registry Stabilization · Execution Boundary Fix · Anti-Unilateral Architecture Lock
**Status:** ✅ Aplicado. Typecheck limpo (`bunx tsgo --noEmit` sem erros).

---

## 1. Correções estruturais aplicadas

### 1.1 Reversão da decisão incorreta da 4.3

| Item                                     | Antes (4.3)                            | Depois (4.3.1)                                   |
| ---------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| `RegistryIndex`                          | "debug-only tooling", fora do runtime  | **camada runtime obrigatória** (contract façade) |
| `Snapshot`                               | resolve + isola (dupla responsabilidade) | **container passivo** — apenas isola instâncias  |
| `ActionRegistry`                         | Map<id, handler> — perdeu papel estrutural | **source of definitions** — armazena `ActionDefinition` |
| Runtime resolution                       | via `snapshot.resolveX(id)`            | via `registryIndex.<kind>.resolve(id)`           |
| Plugin API                               | `resolveView/Panel/Dialog + emitAction` | `registryIndex + snapshot + executeAction + apiVersion` |

### 1.2 Camadas finais (4 papéis distintos)

| Camada          | Papel                                       | Executa? | Decide? | Runtime-safe? |
| --------------- | ------------------------------------------- | -------- | ------- | ------------- |
| Registry        | source of definitions (build-time)          | ❌       | ❌      | ✅            |
| RegistryIndex   | leitura estruturada (contract façade)       | ❌       | ❌      | ✅            |
| Snapshot        | isolamento de instâncias por tenant         | ❌       | ❌      | ✅ (passivo)  |
| ActionExecutor  | execução pura                               | ✅       | ❌      | ✅            |

---

## 2. Arquivos criados / reescritos

**Reescritos:**
- `src/components/workspace/registry/ViewRegistry.ts` — agora exporta `createViewRegistry()` (factory) + `ViewRegistry` (default singleton). Adicionados `__seed` / `__freeze` para snapshots por tenant.
- `src/components/workspace/registry/PanelRegistry.ts` — idem.
- `src/components/workspace/registry/DialogRegistry.ts` — idem.
- `src/components/workspace/registry/ActionRegistry.ts` — reintroduz `ActionDefinition { id, handler }`. `resolve/getStrict` retornam a definição. Registry volta a ser **source of definitions**.
- `src/components/workspace/registry/snapshot.ts` — **passivo**. `RegistrySnapshot = { tenantId, createdAt, viewRegistry, panelRegistry, dialogRegistry, actionRegistry }`. Zero resolve*, zero has*, zero lógica derivada.
- `src/components/workspace/registry/RegistryIndex.ts` — **restaurado** como classe runtime-safe com `view / panel / dialog / action` (cada um com `resolve / exists / list`). Sem lógica, sem fallback, sem cache.
- `src/components/workspace/registry/ActionExecutor.ts` — `executeActionById(snapshot, id, ctx)` agora resolve `snapshot.actionRegistry.getStrict(id).handler(ctx)`.
- `src/components/workspace/registry/index.ts` — reexporta `RegistryIndex`, `createRegistryIndex`, factories, `ActionDefinition`.
- `src/components/workspace/tenant/TenantContext.tsx` — expõe `snapshot`, `registryIndex`, `executeAction`, `featureFlags`. Constrói `RegistryIndex` uma vez por tenant (`useMemo`).
- `src/components/workspace/plugins/PluginContext.ts` — nova assinatura conforme §6.1: `{ tenantId, registryIndex, snapshot, executeAction, featureFlags, apiVersion: "4.3.1" }`.
- `src/components/workspace/runtime/EntityViewRenderer.tsx` — resolve via `registryIndex.view.resolve(viewId)`.
- `src/components/workspace/runtime/EntityPanelRenderer.tsx` — resolve via `registryIndex.panel.resolve(panelId)`.
- `src/components/workspace/runtime/EntityDialogRenderer.tsx` — resolve via `registryIndex.dialog.resolve(dialogId)`.

**Editados (barrel):**
- `src/components/workspace/entities/index.ts` — expõe `RegistryIndex`, `createRegistryIndex`, `ActionDefinition`.

**Inalterados (mas semânticos):**
- `src/components/workspace/runtime/EntityActionRunner.ts` — assinatura `(snapshot, id, ctx)` compatível; executor pega definition via snapshot.
- `src/components/workspace/bootstrap/registerDefaults.tsx` — `getDefaultSnapshotSource()` continua entregando os 4 Maps. `ActionRegistry.__entries()` agora retorna `ReadonlyMap<string, ActionDefinition>`; `RegistrySnapshotSource.actions` aceita a união `ActionHandler | ActionDefinition` para compatibilidade.

---

## 3. Fluxo runtime (patch 4.3.1)

```
WorkspaceShell
  → TenantContextProvider(tenantId)
    → createRegistrySnapshot(tenantId, source)     // container passivo
    → createRegistryIndex(snapshot)                // façade ativa
  → useTenantContext() = { snapshot, registryIndex, executeAction, ... }

Renderers        → registryIndex.<view|panel|dialog>.resolve(id) → Component
Actions          → executeActionById(snapshot, id, ctx)         → def.handler(ctx)
Plugins          → PluginContext { registryIndex, executeAction }
```

Nenhum consumidor de produto chama `snapshot.resolveX` (a API deixou de existir).

---

## 4. Checklist do §8 — restauração obrigatória

- [x] `RegistryIndex` restaurado como runtime-safe layer
- [x] Snapshot reduzido a estrutura passiva
- [x] `ActionExecutor` isolado corretamente
- [x] `ActionRegistry` volta a ser source of definitions (`ActionDefinition`)
- [x] `PluginContext` usa `RegistryIndex`
- [x] Renderers não acessam snapshot como resolver
- [x] Zero "debug-only runtime components"
- [x] Zero camada removida sem substituto funcional equivalente

## 5. Teste de consistência §9

| Regra                              | Status |
| ---------------------------------- | ------ |
| snapshot não executa               | ✅ (não há APIs de execução no snapshot) |
| snapshot não resolve               | ✅ (removidos `resolveView/Panel/Dialog/Action`) |
| index não decide                   | ✅ (façade puramente delegante)          |
| registry não executa               | ✅ (nenhum `execute` em nenhum registry) |
| executor não conhece tenant        | ✅ (`executeActionById(snapshot, ...)`)  |
| plugin não acessa registry direto  | ✅ (`PluginContext.registryIndex` apenas)|

## 6. ANTI-UNILATERAL ARCHITECTURE RULE (§7 — NOVO HARD GATE)

Registrado como invariante do sistema. Aplicável a qualquer mudança estrutural futura:

> Nenhuma decisão pode remover ou degradar uma camada sem responder ao impacto
> em **runtime rendering · tenant isolation · plugin execution · action system ·
> registry resolution**. Resposta "não analisado" invalida a mudança.

**Decisões proibidas sem review (§7.2):**
- remover camada global (ex.: `RegistryIndex`)
- degradar camada para "debug-only"
- fundir snapshot com execução
- mover responsabilidade de execução para registry
- criar "dual API runtime vs debug"

---

## 7. Validação

- `bunx tsgo --noEmit` → **0 erros**
- Superfície pública mantida (renderers + `useTenantContext` + `runEntityAction` + `PluginContext`).
- Nenhum call site de produto quebrado (`snapshot.resolveX` só existia no runtime interno, todos migrados).

---

## 8. Próxima etapa

Após aprovação da 4.3.1, a base fica pronta para retomar a 4.4
(marketplace de plugins + dynamic module loading + feature flags por tenant)
sobre uma arquitetura de 4 camadas corretamente separadas.
