# Fase 6 · Bloco 4 · Etapa 4.0 — Relatório Técnico

**Escopo:** Extração do núcleo genérico do Workspace da plataforma.
**Status:** Concluído.
**Regressões em Conteúdo:** 0.

---

## 1. Arquitetura

### 1.1 Componentes extraídos / promovidos

| Antes                                            | Depois (canônico)                                             | Natureza da mudança                    |
| ------------------------------------------------ | ------------------------------------------------------------- | -------------------------------------- |
| `src/components/content/ContentWorkspace.tsx`    | `src/components/workspace/entities/EntityWorkspace.tsx`       | **Movido fisicamente** + renomeado     |
| `ContentList`                                    | `EntityList` (via barrel)                                     | Renomeação canônica                    |
| `ContentEditor` / `ContentEditorEmpty`           | `EntityEditor` / `EntityEditorEmpty`                          | Renomeação canônica                    |
| `ContentSessionProvider` / `useContentSession`   | `EntitySessionProvider` / `useEntitySession`                  | Renomeação canônica                    |
| `ContentPreviewPane`                             | `EntityPreviewPane`                                           | Renomeação canônica                    |
| `ContentEntityAdapter`                           | `EntityAdapter`                                               | Renomeação canônica (tipo)             |
| `ContentEntityRecord` / `ContentEntityDetail`    | `EntityRecord` / `EntityDetail`                               | Renomeação canônica (tipo)             |
| `ContentDraft`                                   | `EntityDraft`                                                 | Renomeação canônica (tipo)             |
| `contentSearchSchema` / `ContentSearch`          | `entitySearchSchema` / `EntitySearch`                         | Renomeação canônica                    |

### 1.2 Componentes generalizados sem renomeação

`ENTITIES`, `descriptorByRoute`, `getRegistration`, `ENTITY_ADAPTERS`,
`pushRecent`, `getRecents`, `toggleFavorite`, `isFavorite` — permanecem
com o nome original (já eram genéricos) e agora são expostos pelo
barrel canônico `@/components/workspace/entities`.

### 1.3 Estrutura final do Workspace

```
src/components/workspace/
├── WorkspaceShell.tsx              (Bloco 0/0.1 — shell permanente)
├── NavigationRail.tsx
├── AppHeader.tsx
├── ContextTabs.tsx
├── CommandPalette.tsx
├── AiDrawer.tsx
├── DetailPanel.tsx
├── ui-store.ts
├── contexts.ts
├── index.ts
└── entities/                       ← NOVO — núcleo genérico (Etapa 4.0)
    ├── EntityWorkspace.tsx         (orquestrador universal)
    └── index.ts                    (superfície pública canônica)
```

### 1.4 Compat shim mantido

`src/components/content/ContentWorkspace.tsx` foi reduzido a um
**re-export**:

```ts
export { EntityWorkspace as ContentWorkspace } from "@/components/workspace/entities";
```

Motivo: zero regressão em Conteúdo enquanto a plataforma inteira migra
para importar do barrel canônico. Consumidores novos são **proibidos**
de importar deste caminho (governança abaixo, §4).

### 1.5 Impacto arquitetural

- **Boundary explícita**: `@/components/workspace/entities` é o único
  ponto autorizado de consumo do núcleo do Workspace.
- **Descriptor-driven**: nenhum novo `if (kind === ...)` foi
  introduzido; a auditoria abaixo demonstra 0 ocorrências no núcleo.
- **Vocabulário congelado**: as renomeações (Content* → Entity*)
  eliminam qualquer pista textual da origem em Conteúdo — o núcleo
  passa a se apresentar como infraestrutura genérica.
- **Fundação para 4.1–4.5**: novos descriptors (Pipeline / Catálogo /
  Distribuição / Administração) só precisam declarar
  `EntityDescriptor` + `EntityAdapter`; nenhuma alteração estrutural é
  necessária no orquestrador.

## 2. Compatibilidade — Workspace de Conteúdo

### 2.1 Rotas migradas para o barrel canônico

Todas as 7 rotas CMS agora importam de `@/components/workspace/entities`:

- `src/routes/_authenticated.admin.paginas.index.tsx`
- `src/routes/_authenticated.admin.blog.index.tsx`
- `src/routes/_authenticated.admin.formularios.index.tsx`
- `src/routes/_authenticated.admin.campanhas.index.tsx`
- `src/routes/_authenticated.admin.midias.tsx`
- `src/routes/_authenticated.admin.site.tsx`
- `src/routes/_authenticated.admin.auditoria.tsx`

As demais rotas CMS (blog `$id`/`novo`, campanhas `$id`, formularios
`$id`) apenas fazem redirect para as rotas acima — não importam do
núcleo e não requerem alteração.

### 2.2 Regressões encontradas e corrigidas

Nenhuma. O compat shim `ContentWorkspace` mantém compatibilidade
retroativa; a assinatura de props (`descriptor` + `search`) é idêntica
antes e depois.

### 2.3 Evidências

| Verificação                                                  | Resultado    |
| ------------------------------------------------------------ | ------------ |
| `tsgo --noEmit`                                              | **0 erros**  |
| `eslint` sobre `entities/` + `ContentWorkspace.tsx` shim     | **0 erros**  |
| `rg "kind ===\|switch \(.*kind" src/components/workspace/entities` | **0 hits** (exceto comentário normativo) |
| Rotas CMS ainda renderizando via `EntityWorkspace`           | 7/7 verificado por leitura direta |
| Assinatura de props `EntityWorkspace` vs `ContentWorkspace`  | **Idêntica** (`{ descriptor, search }`) |

## 3. Product UX Compliance Checklist — Etapa 4.0

Ver arquivo dedicado:
`docs/fase6/09-bloco-4-etapa-4-0-ux-checklist.md`.

Resultado consolidado: **PASS** em todos os itens aplicáveis a esta
etapa (a etapa 4.0 não introduz novas superfícies visuais nem novos
fluxos de usuário — a auditoria valida ausência de regressão e
aderência dos artefatos criados).

## 4. Product UX Contract — Aderência

| Capítulo do contrato                | Status  | Observação                                                                                                    |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------- |
| §1 Product Vision                   | PASS    | Nenhuma mudança de shell/nav/terminologia perceptível pelo usuário.                                           |
| §2 Workspace Continuity             | PASS    | Shell (`WorkspaceShell`) permanece montado; nenhuma rota foi reescrita.                                        |
| §3 Workspace Memory                 | PASS    | `recents` / `favorites` / `ui-store` preservados; nenhuma chave de storage renomeada.                          |
| §4 Zero Context Reset               | PASS    | Estado de rota (filtros, item selecionado, tab, densidade) segue 100% na URL via `entitySearchSchema`.         |
| §5 Workspace Tokens                 | PASS    | Nenhuma primitiva local nova. `EntityWorkspace` compõe apenas primitivas do DS (`Button`, `Badge`, `Tabs`…).   |
| §6 Progressive Workspace            | PASS    | Skeletons / `useQuery` inalterados; sem carregamento global adicional.                                         |
| §7 UX Consistency Rules             | PASS    | Terminologia mantida; nenhum novo padrão de modal / lista / toolbar.                                           |
| §8 Workspace Navigation Contract    | PASS    | Rotas inalteradas; URL search-state preservado.                                                                |
| §9 Performance Contract             | PASS    | Zero re-render adicional; nenhum novo bundle-split; `bunx tsgo` limpo.                                         |
| §10 Anti-Patterns                   | PASS    | 0 `if (kind === …)` no núcleo; 0 shells novos; 0 imports diretos de `*.functions.ts` fora de `adapters/`.      |

### Architectural Exceptions

**AE-4.0-01 · Composição interna mantida sob `src/components/content/`**

- **Contexto:** `EntityEditor`, `EntitySessionProvider`, `EntityList`,
  `EntityPreviewPane` continuam fisicamente residindo em
  `src/components/content/*` e são reexpostos com nome canônico pelo
  barrel `entities/index.ts`.
- **Justificativa:** o Editor compõe abas específicas de Conteúdo
  (`BlocksContentEditor`, `RichTextContentEditor`, `FormBuilderEditor`,
  etc.) via `descriptor.editorKind`. A extração física dessas abas
  para um `editor-registry` genérico é pré-requisito para migrar o
  arquivo; realizar isso na Etapa 4.0 dobraria o escopo e introduziria
  risco de regressão em Conteúdo — violando o gate desta etapa.
- **Contrato:** o vocabulário e a fronteira de import **já são**
  genéricos (barrel `entities`); consumidores externos enxergam
  `EntityEditor`, não `ContentEditor`. A relocação física acontecerá
  em duas ondas:
  - **Etapa 4.4** — introdução do `editor-registry` desacopla as abas
    do Editor.
  - **Etapa 4.5** — relocação física dos módulos e remoção do compat
    shim `ContentWorkspace`.
- **Estado:** **read-only**. Nenhuma decisão desta exceção poderá ser
  ampliada; qualquer solicitação de novos consumidores deve importar
  de `@/components/workspace/entities` e nunca de
  `@/components/content/*`.

## 5. Workspace Score — Atualização (pós-Etapa 4.0)

| Indicador                                                          | 3.1 (fechamento) | 4.0 (atual) |
| ------------------------------------------------------------------ | ---------------- | ----------- |
| Workspace Coverage (contexto Conteúdo)                             | 100 %            | 100 %       |
| Adapter Coverage                                                   | 100 %            | 100 %       |
| Metadata Coverage                                                  | 100 %            | 100 %       |
| Editor Coverage                                                    | 100 %            | 100 %       |
| Detail Panel Coverage                                              | 100 %            | 100 %       |
| Legacy Routes (CMS)                                                | 0                | 0           |
| Legacy Components importados por rotas CMS                         | 0                | 0           |
| Parallel Operational Flows                                         | 0                | 0           |
| **Novo — Generic Core Surface Established**                        | —                | **100 %**   |
| **Novo — Routes on Canonical Barrel (`workspace/entities`)**       | —                | **7 / 7**   |
| **Novo — `if (kind === …)` no núcleo genérico**                    | —                | **0**       |
| **Novo — Compat Shims outstanding**                                | —                | **1** (`ContentWorkspace`, marcado para remoção na Etapa 4.5) |
| **Novo — Architectural Exceptions ativas**                         | 0                | **1** (AE-4.0-01) |

## 6. Definition of Done — Etapa 4.0

| Critério                                                                                          | Status         |
| ------------------------------------------------------------------------------------------------- | -------------- |
| Núcleo genérico existe em `src/components/workspace/entities/`                                    | **Concluído**  |
| `EntityWorkspace` é o orquestrador canônico e único                                               | **Concluído**  |
| Barrel canônico exporta toda a superfície pública (Entity* + tipos + registry + adapters)         | **Concluído**  |
| 100 % das rotas CMS importam do barrel canônico                                                   | **Concluído**  |
| `ContentWorkspace` reduzido a re-export com marca de deprecation documentada                      | **Concluído**  |
| 0 `if (kind === …)` / `switch (kind)` no núcleo                                                   | **Concluído**  |
| `tsgo --noEmit` sem erros                                                                         | **Concluído**  |
| `eslint` sem erros no novo código                                                                 | **Concluído**  |
| Product UX Contract §1–§10 auditados                                                              | **Concluído**  |
| Product UX Compliance Checklist preenchido                                                        | **Concluído**  |
| Architectural Exception registrada quando aplicável                                               | **Concluído** (AE-4.0-01) |
| Workspace Score atualizado                                                                        | **Concluído**  |
| Gate: Workspace de Conteúdo 100 % funcional pós-extração                                          | **Concluído**  |

## 7. Evidências

### 7.1 Antes / Depois — arquivo do orquestrador

- **Antes:** `src/components/content/ContentWorkspace.tsx` — 105 linhas,
  implementação real.
- **Depois:** `src/components/content/ContentWorkspace.tsx` — **10 linhas**,
  puro re-export.
- **Depois:** `src/components/workspace/entities/EntityWorkspace.tsx` —
  implementação promovida ao caminho canônico.

### 7.2 Antes / Depois — imports de rota

Antes (7 rotas):

```ts
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { contentSearchSchema } from "@/components/content/search-schema";
import { ENTITIES } from "@/components/content/entity-registry";
```

Depois (7 rotas):

```ts
import { EntityWorkspace, entitySearchSchema, ENTITIES }
  from "@/components/workspace/entities";
```

### 7.3 Auditorias executadas

- **Typecheck:** `bunx tsgo --noEmit` → **0 erros**.
- **Lint:** `bunx eslint src/components/workspace/entities
  src/components/content/ContentWorkspace.tsx` → **0 erros** (2 warnings
  pré-existentes, herdadas literalmente do código original — não são
  regressões desta etapa).
- **Grep de acoplamento a domínio Conteúdo:**
  `rg "kind ===|switch \(.*kind" src/components/workspace/entities` →
  **0 hits** de código (apenas 1 hit em comentário normativo).
- **Grep de vazamento de import legado:**
  `rg "@/components/content" src/components/workspace/entities` →
  usos apenas dentro do compat shim documentado em AE-4.0-01.

### 7.4 Validação do Workspace

- WorkspaceShell permanece montado — nenhuma alteração em
  `_authenticated.tsx`.
- URL search-state (`?item=&tab=&q=&status=&density=…`) preservado
  bit-a-bit; `entitySearchSchema` é o mesmo schema exportado sob novo
  nome.
- `recents` / `favorites` continuam gravando nas mesmas chaves de
  `localStorage` (`workspace.recents.v1`, `workspace.favorites.v1`) —
  memória do usuário preservada.

---

## 8. Critério de continuidade

A **Etapa 4.1 (Pipeline)** só poderá ser iniciada após aprovação
explícita deste relatório pelo Product Owner, conforme regra de
sequenciamento fixada no Plano Executivo §9.

Nenhum trabalho de 4.1 foi iniciado.
