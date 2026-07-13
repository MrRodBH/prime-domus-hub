# Fase 6 · Bloco 4 · Patch 4.3.3 — Resolution Decomposition Layer

**Status:** ✅ Entregue
**Escopo:** decomposição do resolver central único em resolvers especializados por capability, com `ResolverRegistry` puro por delegação.

---

## 1. Diagnóstico do estado 4.3.2

`UnifiedResolutionLayer` funcionava, mas concentrava toda a resolução em
um único `switch(kind)`. Consequências:

- Adicionar um novo kind (marketplace/plugins em 4.4) exigiria editar o core.
- Plugins consumiam string-dispatch (`resolve("view", id)`), sem contrato
  explícito por capability.
- Crescimento linear do resolver central ⇒ ponto único de centralização
  estrutural remanescente.

## 2. Objetivo

Substituir o resolver central por resolvers **por capability**, orquestrados
por um `ResolverRegistry` puro que apenas delega — sem `switch`, sem
conhecimento de snapshot ou tenant.

## 3. Arquitetura final

```
Registry (build-time)
   ↓ __seed
RegistrySnapshot (passivo, por tenant)
   ↓
ResolverRegistry  ← delega, sem switch(kind)
   ├── ViewResolver     → snapshot.viewRegistry
   ├── PanelResolver    → snapshot.panelRegistry
   ├── DialogResolver   → snapshot.dialogRegistry
   ├── ActionResolver   → snapshot.actionRegistry (+ ActionExecutor)
   └── (plugins podem registrar novos resolvers aqui)
   ↓
Renderers · Plugins (via métodos ESPECIALIZADOS)
```

## 4. Mudanças

### 4.1 Criado

- `resolution/ResolverRegistry.ts`
  - `interface Resolver<TKind, TResult>` com `resolve(id, ctx?)` e `exists(id)`.
  - Classe `ResolverRegistry` com `register/getResolver/has/listKinds/freeze`.
  - **Sem `switch`**, sem conhecimento de snapshot/tenant.
  - `ResolverNotRegisteredError` para diagnósticos precisos.
- `resolution/resolvers/ViewResolver.ts`
- `resolution/resolvers/PanelResolver.ts`
- `resolution/resolvers/DialogResolver.ts`
- `resolution/resolvers/ActionResolver.ts` (expõe também `.execute(id, ctx)` como conveniência tipada sobre `ActionExecutor`).

### 4.2 `UnifiedResolutionLayer.ts` (reescrito, deprecado como resolver)

Removidos: `class UnifiedResolutionLayer`, `resolve(kind, id)`, `exists(kind, id)`,
`switch(kind)`, tipos `ResolutionKind`/`ResolutionResult`.

Novo papel — **orquestração apenas**: exporta
`createResolverRegistryForSnapshot(snapshot)` que instancia um
`ResolverRegistry`, registra os 4 resolvers built-in e devolve
congelado. O arquivo foi mantido com o nome histórico para preservar o
ponto de composição; ele não contém mais lógica de resolução.

### 4.3 `TenantContext.tsx`

Antes: `{ snapshot, resolver, executeAction }`.
Depois: `{ snapshot, resolverRegistry, executeAction }`.

Adicionados hooks especializados (sem string dispatch):
`useViewResolver()`, `usePanelResolver()`, `useDialogResolver()`,
`useActionResolver()`.

### 4.4 Renderers

- `EntityViewRenderer`  → `useViewResolver().resolve(viewId)`
- `EntityPanelRenderer` → `usePanelResolver().resolve(panelId)`
- `EntityDialogRenderer`→ `useDialogResolver().resolve(dialogId)`

Zero `resolve(kind, id)` genérico nos renderers.

### 4.5 `PluginContext.ts` (crítico — §4.6)

Antes:
```ts
{ resolve: <K>(kind: K, id: string) => ..., executeAction, ... }
```
Depois:
```ts
{
  resolveView(id),
  resolvePanel(id),
  resolveDialog(id),
  resolveAction(id),
  executeAction,
  featureFlags,
  apiVersion: "4.3.3"
}
```
Plugins agora consomem interfaces específicas — impossível fazer
string-dispatch por engano.

### 4.6 Barrel `entities/index.ts`

Exporta: `ResolverRegistry`, `createResolverRegistry`, `Resolver`,
`ResolverNotRegisteredError`, `createResolverRegistryForSnapshot`, os 4
resolvers especializados + factories, e hooks
`useViewResolver/usePanelResolver/useDialogResolver/useActionResolver`.

Removidos: `UnifiedResolutionLayer`, `createUnifiedResolutionLayer`,
`ResolutionKind`, `ResolutionResult`, `resolveWithinTenant`.

## 5. Anti-regressão (§8)

```
rg "switch\s*\(kind|resolve\(\"view\"|resolve\(\"panel\"|resolve\(\"dialog\"|resolve\(\"action\""
   → 0 hits em código executável.
```

`UnifiedResolutionLayer` restante refere-se apenas ao nome do arquivo
orquestrador (§4.2) e a comentários históricos em `snapshot.ts` /
`registry/index.ts`. Não há classe, não há switch, não há resolve
genérico.

## 6. Validação

| Verificação                                                | Resultado |
|------------------------------------------------------------|-----------|
| `tsgo --noEmit`                                            | ✅ limpo  |
| `switch(kind)` em runtime                                  | ❌ removido |
| `resolve(kind, id)` genérico em runtime                    | ❌ removido |
| Renderers usam resolvers especializados                    | ✅        |
| Plugin recebe métodos por capability (`resolveView`, ...)  | ✅        |
| Tenant expõe `resolverRegistry` (não mais resolver único)  | ✅        |
| Novo kind = registrar resolver externo, sem editar core    | ✅        |

## 7. Definition of Done

- [x] `ResolverRegistry` puro (delegador, sem switch).
- [x] 4 resolvers especializados (`View/Panel/Dialog/Action`).
- [x] `UnifiedResolutionLayer` deprecado como resolver (mantido como orquestrador).
- [x] `TenantContext` migrado para `resolverRegistry`.
- [x] Renderers migrados para hooks especializados.
- [x] `PluginContext` com interface por capability + `apiVersion: "4.3.3"`.
- [x] Barrel `entities/index.ts` atualizado.
- [x] Typecheck limpo.
- [x] rg scan limpo.

## 8. Extensibilidade habilitada (§6)

Plugin de 4.4 pode:

```ts
tenant.resolverRegistry.register("widget", new MyWidgetResolver(snapshot));
```

sem tocar em qualquer arquivo do core. O `ResolverRegistry` cresce por
composição, não por edição.

## 9. Próxima etapa

**Etapa 4.4 — Plugin marketplace + dynamic module loading + tenant-level
feature flags.** A arquitetura agora é plugin-safe: novos kinds entram
via `ResolverRegistry.register(...)`, sem centralização, sem string
dispatch, sem regressão para o modelo 4.3.2.
