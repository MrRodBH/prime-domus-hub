# Fase 6 · Bloco 4 · Patch 4.3.2 — Unified Resolution Layer

**Status:** ✅ Entregue
**Escopo:** eliminação total do dual-path (`RegistryIndex` vs `Snapshot`) e instituição de uma única superfície de resolução runtime.

---

## 1. Diagnóstico do estado 4.3.1 (o que estava errado)

A entrega 4.3.1 restaurou o `RegistryIndex` como façade runtime obrigatória
e manteve o `RegistrySnapshot` como container passivo. O `TenantContext`
passou a expor **ambos** — o que criou, na prática, uma **camada híbrida
de verdade**:

- Renderers, plugins e helpers podiam alcançar o mesmo componente por dois
  caminhos (`index.view.resolve` vs `snapshot.viewRegistry.resolve`).
- Nenhum contrato impedia que a próxima etapa (marketplace) introduzisse
  um terceiro path.
- A responsabilidade de "resolver" estava distribuída entre 3 objetos
  (`snapshot`, `index`, `TenantContext.resolveWithinTenant`).

Consequência: dual ownership de resolução → risco de divergência,
ambiguidade cognitiva e regressão iminente em 4.4.

---

## 2. Objetivo do patch

Instituir uma **Unified Resolution Layer (URL)** como único ponto de
resolução de `view | panel | dialog | action` em todo o runtime.
Snapshot volta ao papel exclusivo de **isolamento por tenant**.

---

## 3. Arquitetura final (congelada para 4.4)

```
Registry (build-time source of definitions)
   ↓ __seed
RegistrySnapshot (tenant-isolated, passive container)
   ↓
UnifiedResolutionLayer  ← ÚNICA superfície de resolução runtime
   ↓
Renderers · Plugins · ActionExecutor
```

| Camada                   | Papel                                | Contém lógica? |
|--------------------------|--------------------------------------|----------------|
| Registry                 | Fonte de verdade (build-time)        | não            |
| RegistrySnapshot         | Container isolado por tenant         | não            |
| UnifiedResolutionLayer   | **Single runtime entrypoint**        | switch único   |
| ActionExecutor           | Execução pura de handlers            | não            |
| PluginContext            | Sandbox — recebe apenas o resolver   | não            |

---

## 4. Mudanças estruturais

### 4.1 Criado

- `src/components/workspace/resolution/UnifiedResolutionLayer.ts`
  - Classe `UnifiedResolutionLayer` com `resolve(kind, id)` e `exists(kind, id)`.
  - Contém o **único `switch(kind)` autorizado** em todo o runtime.
  - Consome exclusivamente o `RegistrySnapshot`. Não conhece tenant,
    plugin, cache ou fallback.
  - Tipagem discriminada: `ResolutionResult<K>` devolve o tipo correto
    por kind, eliminando casts nos call sites.

### 4.2 Removido

- `src/components/workspace/registry/RegistryIndex.ts` — **deletado do bundle**.
- Export de `RegistryIndex` / `createRegistryIndex` / `*Facade` removido
  de `registry/index.ts` e `entities/index.ts`.
- Snapshot **já não possuía** métodos `resolveX`; a garantia foi
  reafirmada e a documentação atualizada.

### 4.3 `TenantContext` (reescrito)

Antes:
```ts
{ tenantId, snapshot, registryIndex, executeAction, featureFlags }
```
Depois:
```ts
{ tenantId, snapshot, resolver, executeAction, featureFlags }
```
- `resolver` é a `UnifiedResolutionLayer` do snapshot do tenant.
- `resolveWithinTenant()` passou a delegar ao `resolver` (mantido apenas
  como conveniência tipada — não introduz caminho paralelo).

### 4.4 Renderers (migrados)

- `EntityViewRenderer`  → `resolver.resolve("view",  viewId)`
- `EntityPanelRenderer` → `resolver.resolve("panel", panelId)`
- `EntityDialogRenderer`→ `resolver.resolve("dialog", dialogId)`

Nenhum renderer conhece snapshot ou registries diretamente.

### 4.5 `PluginContext` (reescrito)

```ts
{
  tenantId,
  resolve,          // tipada, delega ao UnifiedResolutionLayer
  executeAction,
  featureFlags,
  apiVersion: "4.3.2"
}
```
Plugin não recebe mais `snapshot` nem `registryIndex`.

### 4.6 `ActionExecutor` (inalterado, papel reforçado)

`executeActionById(snapshot, id, ctx)` continua sendo o único executor.
Ele lê a `ActionDefinition` do `actionRegistry` do snapshot — a resolução
externa (via renderer/plugin) usa o `resolver`, mantendo simetria.

---

## 5. Anti-regressão

Comando executado:
```
rg "RegistryIndex|registryIndex|snapshot\.resolve|\.resolveView|\.resolvePanel|\.resolveDialog|\.resolveAction" src
```

Resultado em código executável: **0 hits**.
Ocorrências restantes são exclusivamente **comentários históricos** em:
- `resolution/UnifiedResolutionLayer.ts` (contexto do patch)
- `tenant/TenantContext.tsx` (nota de migração)

Nenhum runtime, plugin ou renderer referencia `RegistryIndex` ou
`snapshot.resolve*`.

---

## 6. Validação

| Verificação                                     | Resultado |
|-------------------------------------------------|-----------|
| `tsgo --noEmit`                                 | ✅ limpo  |
| `RegistryIndex` presente no bundle              | ❌ removido |
| Snapshot com métodos de resolução               | ❌ ausentes |
| `switch(kind)` fora da URL                      | ❌ nenhum |
| Renderers usam única fonte                      | ✅        |
| Plugins recebem apenas `resolve`+`executeAction`| ✅        |
| Tenant expõe única superfície runtime           | ✅        |

---

## 7. Definition of Done

- [x] `UnifiedResolutionLayer` implementada e única com `switch(kind)`.
- [x] `RegistryIndex` removido do runtime e do bundle.
- [x] `Snapshot` restrito a `{ tenantId, createdAt, *Registry }`.
- [x] Renderers migrados para `resolver.resolve(...)`.
- [x] Plugins migrados; `apiVersion: "4.3.2"`.
- [x] TenantContext atualizado (`snapshot + resolver + executeAction`).
- [x] Action flow unificado via `resolver` + `ActionExecutor`.
- [x] Zero dual-path.
- [x] Typecheck limpo.
- [x] rg scan limpo.

---

## 8. Garantias congeladas para 4.4

1. **Determinismo** — mesmo `(kind, id)` produz sempre o mesmo binding
   dentro de um tenant.
2. **Single Path Resolution** — todo consumo passa pela URL; impossível
   introduzir um segundo caminho sem violar contrato de tipos.
3. **Tenant Isolation** — realizado no snapshot, **antes** da resolução;
   a URL é agnóstica ao tenant.

---

## 9. Próxima etapa habilitada

**Etapa 4.4 — Plugin marketplace + dynamic module loading + tenant-level
feature flags.** A superfície agora é estável para:

- registrar plugins que só enxergam `PluginContext` sandbox;
- carregar módulos dinâmicos que hidratam registries antes do
  `createRegistrySnapshot`;
- ativar/desativar capacidades por tenant via `featureFlags` sem
  duplicação de lógica de resolução.
