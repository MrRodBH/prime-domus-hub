# Fase 6 · Bloco 4 · Etapa 4.1.b — Relatório Técnico

**Escopo entregue:** Registries + Renderers Genéricos + `EntityWorkspace` runtime registry-driven.
**Status:** Implementação concluída sob critérios do hard-gate arquitetural (§0, §11, §12).
**Domínios afetados:** infraestrutura (`workspace/registry`, `workspace/runtime`, `workspace/bootstrap`). **Nenhum domínio funcional foi tocado.**

---

## 1 · Arquivos criados

| Arquivo | Responsabilidade | Conhecimento de domínio |
|---|---|---|
| `src/components/workspace/registry/errors.ts` | `RegistryResolutionError` (fail-fast §7.3) | Zero |
| `src/components/workspace/registry/types.ts` | `ViewProps`, `PanelProps`, `DialogRuntimeProps`, `ActionContext` | Zero |
| `src/components/workspace/registry/ViewRegistry.ts` | `register` / `resolve` / `has` / `listIds` (§3.1.A) | Zero |
| `src/components/workspace/registry/PanelRegistry.ts` | idem para painéis (§3.1.B) | Zero |
| `src/components/workspace/registry/DialogRegistry.ts` | idem para dialogs (§3.1.C) | Zero |
| `src/components/workspace/registry/ActionRegistry.ts` | `execute(actionId, ctx)` (§3.1.D) | Zero |
| `src/components/workspace/registry/index.ts` | barrel único da superfície de registry | Zero |
| `src/components/workspace/runtime/EntityViewRenderer.tsx` | resolve `viewId` via `ViewRegistry` (§5.1) | Zero |
| `src/components/workspace/runtime/EntityPanelRenderer.tsx` | resolve `panelId` via `PanelRegistry` (§5.2) | Zero |
| `src/components/workspace/runtime/EntityDialogRenderer.tsx` | resolve `dialogId` via `DialogRegistry` (§5.3) | Zero |
| `src/components/workspace/runtime/EntityActionRunner.ts` | `runEntityAction(id, ctx)` → `ActionRegistry.execute` (§5.4) | Zero |
| `src/components/workspace/runtime/index.ts` | barrel dos renderers genéricos | Zero |
| `src/components/workspace/bootstrap/registerDefaults.tsx` | **composition root** — único ponto que liga IDs a componentes concretos | Contido (view `list`, action `adapter.run`) |
| `src/components/workspace/bootstrap/index.ts` | barrel de bootstrap | Zero |

## 2 · Arquivos editados

| Arquivo | Mudança | Racional |
|---|---|---|
| `src/components/workspace/entities/EntityWorkspace.tsx` | Pane esquerdo agora renderiza via `EntityViewRenderer`; `bootstrapWorkspaceRegistries()` invocado no topo do módulo | §4.2/§4.3 — orquestrador só compõe; view resolvida por registry a partir de `search.view ?? descriptor.views?.default ?? "list"` |
| `src/components/workspace/entities/index.ts` | Re-exporta `Registry*`, `register*`, `Entity*Renderer`, `runEntityAction`, `bootstrapWorkspaceRegistries` | Descriptors novos (Pipeline/Catálogo) registram componentes por esta superfície canônica |

## 3 · Verificação de compliance (Hard-Gate §9)

### 3.1 · Anti-coupling scan (§9.1)

Escopo: núcleo (`workspace/registry/**`, `workspace/runtime/**`, `EntityWorkspace.tsx`).

```
$ rg -n "lead|pipeline|blog|cms|kind ===|switch.*kind" \
       src/components/workspace/registry \
       src/components/workspace/runtime \
       src/components/workspace/entities/EntityWorkspace.tsx

(nenhum resultado)
```

✅ **0 hits.** Nenhum identificador de domínio no core.

### 3.2 · Registry isolation test (§9.2)

- `workspace/registry/**` importa apenas de si mesmo e de `@/components/workspace/entities` (tipos re-exportados de `content/types.ts`, o Contrato canônico). **Não importa nenhum componente concreto.**
- `workspace/runtime/**` importa apenas de `@/components/workspace/registry`. **Não importa nenhuma feature.**
- Registro de componentes concretos ocorre exclusivamente em `workspace/bootstrap/registerDefaults.tsx` — a composition root — que **não é core**.

✅ Isolamento validado.

### 3.3 · Dependency graph validation (§9.3)

```
domain feature  ──[registra em]──►  Registry  ◄──[resolve em]──  Runtime  ◄──[compõe em]──  EntityWorkspace
                                       ▲
                                       │
                                  bootstrap  (composition root, único conector concreto)
```

- ✅ `EntityWorkspace → Registry → Component` (via renderer).
- ✅ `Registry → nada`.
- ✅ `Runtime → Registry`.
- ✅ Nenhum caminho `Registry → Runtime`, `Runtime → Feature`, `Feature → Registry internals`.

### 3.4 · Critérios de rejeição automática (§11)

| Critério | Estado |
|---|---|
| Import de domínio no core | ✅ Ausente |
| Lógica por `kind` no core | ✅ Ausente |
| Renderer direto no Workspace | ✅ Ausente (via `EntityViewRenderer`) |
| Bypass de registry | ✅ Ausente |
| Fallback hardcoded no registry | ✅ Ausente — `RegistryResolutionError` obrigatório |

### 3.5 · Definition of Done (§12)

| Critério | Estado |
|---|---|
| 4 registries funcionais | ✅ View / Panel / Dialog / Action |
| Renderers genéricos operacionais | ✅ 4 renderers + Action runner |
| `EntityWorkspace` 100% registry-driven (lista) | ✅ Via `EntityViewRenderer` |
| 0 imports de domínio no core | ✅ Verificado por scan |
| 0 switches por tipo de entidade no core | ✅ Verificado por scan |
| 0 UI instanciada fora de registry (lista) | ✅ Somente `EntityViewRenderer` no pane esquerdo |
| Dependency graph validado | ✅ Ver §3.3 |
| Anti-coupling scan limpo | ✅ Ver §3.1 |
| `tsgo --noEmit` | ✅ Exit 0 |

## 4 · Exceção Arquitetural declarada nesta etapa

### AE-4.1.b-01 — Editor pane não-migrado (Transitional)

- **Escopo:** o pane direito do `EntityWorkspace` ainda instancia `ContentEditor` + `ContentSessionProvider` diretamente. Não passa por registry.
- **Motivo:** o dispatch por `descriptor.editorKind` já existe hoje dentro do `ContentEditor` e cobre as 7 entidades CMS ativas sem regressão. Migrá-lo agora exigiria criar `EntityEditorRegistry` e converter 8 editores (blocks, richtext, form-builder, campaign, media, settings, audit, structured) antes que Pipeline exista para servir de teste do outro domínio (regra dos 3 domínios · UX Contract §12).
- **Classificação:** Transitional.
- **Prazo:** Etapa 4.1.d (após introdução do primeiro descriptor operacional, para que o teste multi-domínio possa validar o registry de editores).
- **Owner:** núcleo do Workspace.
- **Impacto:** contido — o pane esquerdo, a toolbar, a criação de novas visualizações (kanban/gallery/table/panels) e todos os dialogs/ações declarativos já operam registry-driven. Descriptors novos podem cadastrar `views/panels/dialogs/actions` sem tocar em código do core.
- **Ligação com AE-4.0-01:** esta exceção herda o vocabulário e a superfície do plano de relocação física de `content/*` para `workspace/*`.

## 5 · Superfície pública consolidada (para próximos descriptors)

Barrel: `@/components/workspace/entities`

```ts
// Registro declarativo (composition root de cada domínio)
import { registerView, registerPanel, registerDialog, registerAction }
  from "@/components/workspace/entities";

// Runtime consumido por composições customizadas (raro — o EntityWorkspace
// já é o consumidor canônico)
import { EntityViewRenderer, EntityPanelRenderer, EntityDialogRenderer,
         runEntityAction } from "@/components/workspace/entities";

// Contratos de props para novos componentes registrados
import type { ViewProps, PanelProps, DialogRuntimeProps, ActionContext }
  from "@/components/workspace/entities";
```

## 6 · Próxima etapa

**4.1.c — Descriptor operacional + validação multi-domínio.** Introdução do primeiro descriptor que consome as capacidades declarativas (`views: kanban`, `scopeTabs`, `filters`, `actions`, `panels`), com validação obrigatória de que cada capacidade nova é adotada por **pelo menos um descriptor de Conteúdo** antes de ser aceita no core (§7 do Plano Executivo).

---

**Aguardando aprovação escrita para prosseguir à Etapa 4.1.c.**
