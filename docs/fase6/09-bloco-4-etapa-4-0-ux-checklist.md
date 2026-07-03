# Fase 6 · Bloco 4 · Etapa 4.0 — Product UX Compliance Checklist

**Etapa:** 4.0 — Extração do núcleo genérico.
**Natureza:** Refatoração estrutural sem mudança visual nem novos fluxos.
**Escopo de auditoria:** ausência de regressão de UX + aderência da
arquitetura recém-introduzida ao Product UX Contract.

Legenda: **PASS** · **FAIL** · **N/A** (não aplicável a esta etapa) ·
**AE** (coberto por Architectural Exception).

---

## 1. Product Vision (Contract §1)

| # | Item                                                                             | Status | Evidência                                                                                          |
| - | -------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| 1 | Usuário percebe um único produto — mesma shell antes/depois da etapa             | PASS   | `WorkspaceShell` intocado; rotas continuam renderizando dentro do mesmo `_authenticated` layout.   |
| 2 | Nenhuma nova terminologia visível ao usuário                                     | PASS   | Header/Rail/CommandPalette/Tabs sem alteração; `AdminPageHeader eyebrow` mantido como "Workspace". |
| 3 | Nenhuma percepção de módulo independente reintroduzida                           | PASS   | Nenhum novo shell/sidebar/header criado. `WorkspaceShell` continua único.                          |

## 2. Workspace Continuity (Contract §2)

| # | Item                                                                             | Status | Evidência                                                                                     |
| - | -------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| 1 | Shell permanece montado durante toda a sessão                                    | PASS   | `_authenticated.tsx` inalterado — `WorkspaceShell` é o `component` da rota layout.            |
| 2 | Nenhuma rota foi movida / rewrites de URL                                        | PASS   | 7 rotas CMS mantêm exatamente o mesmo path.                                                   |
| 3 | Trocar de entidade não reconstroi a shell                                        | PASS   | Nenhuma alteração no ciclo de mount/unmount do shell; apenas o `Outlet` re-renderiza.         |

## 3. Workspace Memory (Contract §3)

| # | Item                                                          | Status | Evidência                                                                                             |
| - | ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| 1 | Filtros preservados                                            | PASS   | `entitySearchSchema` = mesmo schema; params `q`/`status`/`group`/`density` intactos.                   |
| 2 | Pesquisa preservada                                            | PASS   | Idem — param `q` na URL.                                                                              |
| 3 | Scroll / seleção / abas preservados                            | PASS   | `item`, `tab` mantidos na URL; `replace: true, resetScroll: false` em toda navegação interna.         |
| 4 | Estado da IA e do usuário preservado                           | PASS   | `AiDrawer` e `ui-store` (localStorage `workspace.ui.v1`) intocados.                                    |
| 5 | Recents / favoritos preservados                                | PASS   | Chaves `workspace.recents.v1` / `workspace.favorites.v1` mantidas; `pushRecent` chamado no mesmo ponto. |

## 4. Zero Context Reset (Contract §4)

| # | Item                                                                       | Status | Evidência                                                                             |
| - | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 1 | Nenhum reload de página introduzido                                        | PASS   | Toda navegação continua via `useNavigate` sem `window.location`.                       |
| 2 | Nenhum unmount adicional do shell                                          | PASS   | Árvore de rotas inalterada.                                                            |
| 3 | Progresso do usuário não é descartado ao alternar entidades                | PASS   | Contexto continua em URL + `ui-store`; nenhum estado global foi removido.              |

## 5. Workspace Tokens (Contract §5)

| # | Item                                                              | Status | Evidência                                                                                                |
| - | ----------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| 1 | Nenhuma primitiva local nova                                       | PASS   | `EntityWorkspace` compõe apenas `Button`, `Badge`, `AdminPageHeader`, `Tabs` (todos já no DS).            |
| 2 | Layout Primary/Secondary via primitivas canônicas                  | PASS   | Split 32 % / 1fr mantido — mesma composição do original, agora sob o nome canônico do núcleo.            |
| 3 | Nenhum novo `*Panel` local                                         | PASS   | Nenhum arquivo `*Panel.tsx` criado nesta etapa.                                                          |

## 6. Progressive Workspace (Contract §6)

| # | Item                                                                | Status | Evidência                                                                          |
| - | ------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| 1 | Carregamento localizado (skeleton na lista)                          | PASS   | `<Loader2 />` continua dentro do painel de lista, sem bloquear a shell.            |
| 2 | Nenhum carregamento global adicional                                 | PASS   | Nenhum `Suspense` global novo; nenhum `await` no root.                             |
| 3 | Prefetch / cache preservado                                          | PASS   | `useQuery` com mesmas `queryKey`s (`["content-list", kind, …]`) — cache reutilizado. |

## 7. UX Consistency Rules (Contract §7)

| # | Item                                                                | Status | Evidência                                                                                     |
| - | ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| 1 | Terminologia consistente com a existente                             | PASS   | Textos ("Nova …", "Denso", "Confortável") idênticos ao anterior.                              |
| 2 | Nenhum novo padrão de modal / lista / toolbar                        | PASS   | Estrutura visual byte-idêntica ao original — só o path/nome do módulo mudou.                  |
| 3 | Iconografia mantida                                                  | PASS   | Mesmos `lucide-react` icons (`Plus`, `Loader2`, `Rows3`, `Rows2`).                            |

## 8. Workspace Navigation Contract (Contract §8)

| # | Item                                                                   | Status | Evidência                                                                                    |
| - | ---------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------- |
| 1 | Deep-links continuam funcionando                                        | PASS   | Rotas + `entitySearchSchema` = originais; qualquer URL salva pelo usuário resolve igual.     |
| 2 | Redirects não são necessários nesta etapa                               | N/A    | Nenhuma URL foi consolidada / removida.                                                       |
| 3 | Command Palette continua indexando as entidades CMS                     | PASS   | `CommandPalette` intocado; consome `ENTITIES` que segue exposto por `entity-registry`.       |

## 9. Performance Contract (Contract §9)

| # | Item                                                              | Status | Evidência                                                                                                    |
| - | ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| 1 | Nenhum re-render adicional introduzido                             | PASS   | Assinatura de props e árvore de componentes idênticas.                                                       |
| 2 | Bundle não cresceu por duplicação de código                        | PASS   | `ContentWorkspace` = re-export puro (10 LOC); implementação vive apenas em `EntityWorkspace`.               |
| 3 | Typecheck sem regressão                                            | PASS   | `bunx tsgo --noEmit` → 0 erros.                                                                              |

## 10. Anti-Patterns (Contract §10)

| # | Item                                                                              | Status | Evidência                                                                                                          |
| - | --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| 1 | 0 Workspaces específicos por entidade                                              | PASS   | Único orquestrador: `EntityWorkspace`.                                                                             |
| 2 | 0 Headers / Sidebars customizados por área                                         | PASS   | Nenhum arquivo `*Header*` / `*Sidebar*` novo.                                                                       |
| 3 | 0 `if (kind === …)` / `switch (kind)` no núcleo genérico                           | PASS   | `rg "kind ===\|switch \(.*kind" src/components/workspace/entities` → 0 hits de código.                              |
| 4 | Imports diretos de `*.functions.ts` fora de `adapters/`                            | PASS   | `EntityWorkspace` só importa DS, tipos, session, list, editor, `getRegistration` e `pushRecent` — nenhum server fn. |
| 5 | Novas primitivas locais                                                            | PASS   | Nenhuma criada.                                                                                                    |

## 11. UX Regression Test (Contract §11)

Roteiro de 12 passos aplicado à rota `/admin/paginas` (representativa do
Workspace de Conteúdo, agora servida por `EntityWorkspace`):

| # | Passo                                              | Esperado                                          | Resultado |
| - | -------------------------------------------------- | ------------------------------------------------- | --------- |
| 1 | Abrir `/admin/paginas`                             | Lista carrega sem reload da shell                 | PASS      |
| 2 | Digitar termo em "Buscar páginas…"                  | URL ganha `?q=…`; lista filtra                    | PASS      |
| 3 | Escolher status no select                          | URL ganha `?status=…`                             | PASS      |
| 4 | Selecionar item da lista                          | URL ganha `?item=…`; editor abre à direita        | PASS      |
| 5 | Alternar aba SEO                                   | URL ganha `?tab=seo`                              | PASS      |
| 6 | Editar título                                      | Autosave dispara                                  | PASS      |
| 7 | Navegar para `/admin/blog` pelo NavigationRail     | Shell não pisca; filtros de páginas preservados na URL de origem | PASS      |
| 8 | Voltar para `/admin/paginas` (backspace)           | `?q=`, `?status=`, `?item=`, `?tab=` restaurados  | PASS      |
| 9 | Alternar densidade                                 | `?density=comfortable` na URL; grava `ui-store`   | PASS      |
| 10| Abrir Command Palette (⌘K)                         | Entidades CMS presentes                           | PASS      |
| 11| Clicar em recente                                  | Abre editor com `?item=…` correto                 | PASS      |
| 12| Recarregar a página (F5)                           | Estado inteiro restaurado a partir da URL         | PASS      |

Base de comparação: comportamento idêntico ao registrado no fechamento
do Bloco 3.1 (`docs/fase6/08-bloco-3-1-auditoria-final.md` §UX Regression).

---

## Evidências Consolidadas (por seção do Product UX Contract)

Complemento normativo: cada seção do checklist é acompanhada de uma
evidência objetiva agregada, para que a auditoria não dependa apenas do
rótulo PASS por linha.

| Seção do Contrato               | Evidência objetiva agregada                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 Product Vision               | `WorkspaceShell`, `AppHeader`, `NavigationRail`, `CommandPalette` e terminologia visível byte-idênticos ao fechamento do Bloco 3.1 — diff visual = 0.                |
| §2 Workspace Continuity         | `_authenticated.tsx` inalterado; shell não desmonta ao trocar de rota (`Outlet` re-renderiza sob o mesmo shell).                                                     |
| §3 Workspace Memory             | Filtros, `q`, `status`, `item`, `tab`, `density`, scroll, seleção e larguras dos painéis preservados via `entitySearchSchema` (URL) + `ui-store` (localStorage).      |
| §4 Zero Context Reset           | `WorkspaceShell` permaneceu montado durante toda navegação Páginas → Blog → Formulários → Páginas; nenhum reload, nenhum FOUC, nenhum spinner central.               |
| §5 Workspace Tokens             | Nenhuma primitiva adicional criada — `EntityWorkspace` compõe apenas `Button`, `Badge`, `AdminPageHeader`, `Tabs`; `rg "Panel.tsx" workspace/entities` = 0 hits.     |
| §6 Progressive Workspace        | `useQuery` mantém `queryKey` original (`["content-list", kind, …]`); lazy loading do editor e skeleton por painel preservados; zero `Suspense fallback` global novo. |
| §7 UX Consistency Rules         | Design System único mantido — 0 componentes ad-hoc; textos, ícones (`lucide-react`), curvas de animação e hierarquia visual idênticos ao original.                   |
| §8 Workspace Navigation         | Rotas inalteradas; Command Palette segue indexando `ENTITIES`; deep-links testados nos 12 passos do UX Regression Test.                                              |
| §9 Performance Contract         | `bunx tsgo --noEmit` = 0 erros; bundle sem duplicação (`ContentWorkspace` = re-export de 10 LOC); assinatura de props idêntica → zero re-render adicional.           |
| §10 Anti-Patterns               | `rg "kind ===\|switch \(.*kind" src/components/workspace/entities` = 0 hits de código; 0 shells novos; 0 imports de `*.functions.ts` fora de `adapters/`.            |

---

## Consolidação — Workspace Score da Etapa 4.0

### Dimensões clássicas do checklist

| Dimensão                     | Score | Notas                                                                                     |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| Vision + Continuity          | PASS  | Percepção de produto único preservada.                                                    |
| Memory + Zero Context Reset  | PASS  | Nenhuma perda de contexto; storage keys inalteradas.                                       |
| Tokens + Progressive         | PASS  | Somente primitivas do DS; carregamento localizado mantido.                                 |
| Consistency + Navigation     | PASS  | Terminologia, deep-links, Palette — todos preservados.                                     |
| Performance                  | PASS  | Zero regressão de tipo/bundle/render.                                                      |
| Anti-Patterns                | PASS  | 0 violações no núcleo genérico.                                                            |
| **Etapa 4.0 Overall**        | **PASS** | Coberto por 1 Architectural Exception (AE-4.0-01) devidamente registrada e limitada.       |

### Indicadores de governança arquitetural (Fase 6)

Padrão obrigatório instituído nesta etapa e replicado nas etapas 4.1 → 4.5.

| Indicador                     | Valor 4.0 | Justificativa                                                                                                                       |
| ----------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Product UX Compliance**     | **100 %** | §1–§11 do checklist PASS; UX Regression Test de 12 passos aprovado; evidências objetivas por seção registradas acima.               |
| **Architectural Stability**   | **100 %** | Nenhum contrato público quebrado; 0 rotas alteradas; 0 storage keys renomeadas; única AE (AE-4.0-01) classificada como Transitional read-only. |
| **Workspace Canonicality**    | **100 %** | 7/7 rotas CMS importam do barrel canônico; nenhum consumidor novo autorizado fora de `@/components/workspace/entities`.             |
| **Descriptor Independence**   | **100 %** | 0 `if (kind === …)` / `switch (kind)` no núcleo; núcleo depende apenas de `EntityDescriptor` + `EntityAdapter`.                     |
| **Infrastructure Coupling**   | **0 %**   | Núcleo genérico não importa `*.functions.ts`, `supabase/*` nem `client.server.ts` — 100 % desacoplado da infraestrutura.            |
